/**
 * Mẫu email + nội dung thông báo bảo mật song ngữ vi/en (AUTH-07). Mỗi mẫu trả `{ subject, text, html }`;
 * HTML đơn giản (inline style, một cột) để hiển thị tốt trên mọi ứng dụng mail. Mọi dữ liệu do người dùng
 * nhập (tên, tên thiết bị) đều được escape trước khi chèn vào HTML.
 */
import type { Lang } from '@/lib/lang';

export const APP_NAME = 'E-Learning';

export type RenderedMail = { subject: string; text: string; html: string };

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type Layout = {
  subject: string;
  greeting: string;
  paragraphs: string[];
  code?: string;
  footer: string;
};

function render(layout: Layout): RenderedMail {
  const text = [
    layout.greeting,
    '',
    ...layout.paragraphs.flatMap((p) => [p, '']),
    ...(layout.code ? [layout.code, ''] : []),
    layout.footer,
    `— ${APP_NAME}`,
  ].join('\n');

  const paragraphs = layout.paragraphs
    .map((p) => `<p style="margin:0 0 16px;line-height:1.5">${escapeHtml(p)}</p>`)
    .join('');
  const code = layout.code
    ? `<p style="margin:0 0 24px;font-size:32px;font-weight:700;letter-spacing:8px;font-family:Consolas,Menlo,monospace">${escapeHtml(layout.code)}</p>`
    : '';
  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#171a1f;max-width:480px;margin:0 auto;padding:24px">' +
    `<h2 style="margin:0 0 24px;font-size:20px">${APP_NAME}</h2>` +
    `<p style="margin:0 0 16px">${escapeHtml(layout.greeting)}</p>` +
    paragraphs +
    code +
    `<p style="margin:0;font-size:13px;color:#565e6c;line-height:1.5">${escapeHtml(layout.footer)}</p>` +
    '</div>';
  return { subject: layout.subject, text, html };
}

const COPY = {
  en: {
    greeting: (name: string) => `Hi ${name},`,
    verify: {
      subject: `Verify your email for ${APP_NAME}`,
      intro: 'Use this code to verify your email address:',
      expires: (minutes: number) => `The code expires in ${minutes} minutes.`,
      footer: "If you didn't create an account, you can safely ignore this email.",
    },
    reset: {
      subject: `Reset your ${APP_NAME} password`,
      intro: 'Use this code to reset your password:',
      expires: (minutes: number) => `The code expires in ${minutes} minutes.`,
      footer: "If you didn't request this, ignore this email - your password stays the same.",
    },
    newDevice: {
      subject: `New sign-in to your ${APP_NAME} account`,
      intro: 'We noticed a sign-in to your account from a new device:',
      details: (device: string, ip: string, when: string) =>
        `Device: ${device} | IP: ${ip} | Time: ${when}`,
      footer:
        'If this was you, no action is needed. If not, change your password right away and sign out other devices in Settings > Security.',
      notificationTitle: 'New device sign-in',
      notificationBody: (device: string) =>
        `Your account was signed in from a new device: ${device}. If this wasn't you, change your password.`,
    },
    passwordChanged: {
      subject: `Your ${APP_NAME} password was changed`,
      intro: 'The password for your account was just changed. All other devices were signed out.',
      footer:
        'If you didn\'t do this, reset your password immediately using "Forgot password" and contact support.',
    },
  },
  vi: {
    greeting: (name: string) => `Xin chào ${name},`,
    verify: {
      subject: `Xác minh email ${APP_NAME} của bạn`,
      intro: 'Dùng mã sau để xác minh địa chỉ email của bạn:',
      expires: (minutes: number) => `Mã có hiệu lực trong ${minutes} phút.`,
      footer: 'Nếu bạn không tạo tài khoản, hãy bỏ qua email này.',
    },
    reset: {
      subject: `Đặt lại mật khẩu ${APP_NAME}`,
      intro: 'Dùng mã sau để đặt lại mật khẩu của bạn:',
      expires: (minutes: number) => `Mã có hiệu lực trong ${minutes} phút.`,
      footer: 'Nếu bạn không yêu cầu, hãy bỏ qua email này - mật khẩu của bạn vẫn giữ nguyên.',
    },
    newDevice: {
      subject: `Đăng nhập mới vào tài khoản ${APP_NAME}`,
      intro: 'Chúng tôi thấy tài khoản của bạn vừa được đăng nhập từ một thiết bị mới:',
      details: (device: string, ip: string, when: string) =>
        `Thiết bị: ${device} | IP: ${ip} | Thời gian: ${when}`,
      footer:
        'Nếu là bạn thì không cần làm gì. Nếu không phải, hãy đổi mật khẩu ngay và đăng xuất các thiết bị khác trong Cài đặt > Bảo mật.',
      notificationTitle: 'Đăng nhập từ thiết bị mới',
      notificationBody: (device: string) =>
        `Tài khoản của bạn vừa được đăng nhập từ thiết bị mới: ${device}. Nếu không phải bạn, hãy đổi mật khẩu.`,
    },
    passwordChanged: {
      subject: `Mật khẩu ${APP_NAME} của bạn đã được thay đổi`,
      intro: 'Mật khẩu tài khoản của bạn vừa được thay đổi. Mọi thiết bị khác đã bị đăng xuất.',
      footer:
        'Nếu không phải bạn, hãy đặt lại mật khẩu ngay bằng "Quên mật khẩu" và liên hệ hỗ trợ.',
    },
  },
} as const;

export function verifyEmailMail(
  lang: Lang,
  params: { fullName: string; code: string; ttlMinutes: number },
): RenderedMail {
  const t = COPY[lang];
  return render({
    subject: t.verify.subject,
    greeting: t.greeting(params.fullName),
    paragraphs: [t.verify.intro],
    code: params.code,
    footer: `${t.verify.expires(params.ttlMinutes)} ${t.verify.footer}`,
  });
}

export function resetPasswordMail(
  lang: Lang,
  params: { fullName: string; code: string; ttlMinutes: number },
): RenderedMail {
  const t = COPY[lang];
  return render({
    subject: t.reset.subject,
    greeting: t.greeting(params.fullName),
    paragraphs: [t.reset.intro],
    code: params.code,
    footer: `${t.reset.expires(params.ttlMinutes)} ${t.reset.footer}`,
  });
}

/** "2026-10-04 08:30 UTC" - không phụ thuộc múi giờ máy chủ. */
function formatUtc(date: Date): string {
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

export function newDeviceMail(
  lang: Lang,
  params: { fullName: string; deviceName: string; ip: string | null; when: Date },
): RenderedMail {
  const t = COPY[lang].newDevice;
  return render({
    subject: t.subject,
    greeting: COPY[lang].greeting(params.fullName),
    paragraphs: [t.intro, t.details(params.deviceName, params.ip ?? '?', formatUtc(params.when))],
    footer: t.footer,
  });
}

export function passwordChangedMail(lang: Lang, params: { fullName: string }): RenderedMail {
  const t = COPY[lang].passwordChanged;
  return render({
    subject: t.subject,
    greeting: COPY[lang].greeting(params.fullName),
    paragraphs: [t.intro],
    footer: t.footer,
  });
}

/** Nội dung thông báo trong app khi đăng nhập từ thiết bị mới (lưu ở bảng Notification). */
export function newDeviceNotification(
  lang: Lang,
  deviceName: string,
): { title: string; body: string } {
  const t = COPY[lang].newDevice;
  return { title: t.notificationTitle, body: t.notificationBody(deviceName) };
}
