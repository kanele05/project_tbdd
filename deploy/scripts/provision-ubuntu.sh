#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  printf 'Run this script with sudo.\n' >&2
  exit 1
fi

. /etc/os-release
if [ "${ID}" != ubuntu ] || [ "${VERSION_ID}" != 24.04 ]; then
  printf 'This script requires Ubuntu 24.04 LTS.\n' >&2
  exit 1
fi

deploy_user="${DEPLOY_USER:-ubuntu}"
id "${deploy_user}" >/dev/null
test -s "$(getent passwd "${deploy_user}" | cut -d: -f6)/.ssh/authorized_keys"

export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a
apt-get update
apt-get install -y ca-certificates curl rsync ufw fail2ban unattended-upgrades

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
cat >/etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-${VERSION_CODENAME}}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
usermod -aG docker "${deploy_user}"
systemctl enable --now docker

if [ ! -e /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
fi
if ! swapon --show=NAME --noheadings | grep -Fxq /swapfile; then
  swapon /swapfile
fi
if ! grep -Eq '^/swapfile[[:space:]]' /etc/fstab; then
  printf '/swapfile none swap sw 0 0\n' >>/etc/fstab
fi
printf 'vm.swappiness=10\n' >/etc/sysctl.d/99-elearning-swappiness.conf
sysctl -p /etc/sysctl.d/99-elearning-swappiness.conf
timedatectl set-timezone Asia/Ho_Chi_Minh

cat >/etc/ssh/sshd_config.d/01-elearning-hardening.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
EOF
sshd -t
systemctl reload ssh

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw allow from 172.30.0.0/24 to 172.17.0.1 port 9100 proto tcp
ufw --force enable

cat >/etc/fail2ban/jail.d/elearning.local <<'EOF'
[DEFAULT]
backend = systemd
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban
printf 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' >/etc/apt/apt.conf.d/20auto-upgrades

docker version --format '{{.Server.Version}}'
docker compose version
free -h
ufw status verbose
sshd -T | grep -E '^(passwordauthentication|kbdinteractiveauthentication|permitrootlogin|pubkeyauthentication)'
printf 'Provisioning complete. Reconnect SSH to activate Docker group membership.\n'
