/**
 * Publishes an over-the-air update (EAS Update) for the Android builds of one channel.
 *
 *   npm run update:preview -- "Fix the AI course draft"      # APKs built with --profile preview
 *   npm run update:production -- "..."                        # builds of --profile production
 *
 * `eas update` does not read the `env` of a build profile: it would bundle `mobile/.env` (LAN API
 * URL). This script copies the `env` of the profile with the same name from `eas.json` and turns
 * off `.env` loading, so an update talks to the same API as the APK it lands on.
 * Only JS/asset changes can ship this way; a new native module or SDK needs a new build (bump
 * `version` in app.json: the runtime version follows it).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [channel, ...messageParts] = process.argv.slice(2);
const message = messageParts.join(' ').trim();
const easConfig = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
const profile = easConfig.build?.[channel ?? ''];

if (!profile || profile.channel !== channel || !message) {
  console.error('Usage: node scripts/eas-update.mjs <preview|production> "<message>"');
  process.exit(1);
}

// Windows needs a shell to run `npx.cmd`; the shell then splits arguments on spaces, so quote them.
const isWindows = process.platform === 'win32';
const quote = (value) => (isWindows ? `"${value.replace(/"/g, '\\"')}"` : value);
// --clear-cache: Metro's transform cache can keep EXPO_PUBLIC_* values from an earlier bundle.
// --environment: required by eas-cli in non-interactive runs; same EAS environment as the build.
const args = [
  'eas-cli',
  'update',
  '--channel',
  channel,
  '--environment',
  profile.environment ?? channel,
  '--platform',
  'android',
  '--clear-cache',
];
const result = spawnSync('npx', [...args, '--message', quote(message)], {
  stdio: 'inherit',
  shell: isWindows,
  env: { ...process.env, ...profile.env, EXPO_NO_DOTENV: '1' },
});
process.exit(result.status ?? 1);
