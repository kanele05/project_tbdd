import { env, isProduction } from '@/config/env';
import { ApiError } from '@/lib/ApiError';
import { logger } from '@/lib/logger';

export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

const VERIFY_TIMEOUT_MS = 5000;
const MAX_CHALLENGE_AGE_MS = 120_000;
const MAX_FUTURE_SKEW_MS = 60_000;
const RECAPTCHA_TEST_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
const RECAPTCHA_TEST_SECRET_KEY = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

type VerifyOutcome = 'ok' | 'rejected' | 'unavailable';

function captchaRequiredError(): ApiError {
  return ApiError.of('CAPTCHA_REQUIRED', 'Complete the CAPTCHA to continue', {
    captchaRequired: true,
  });
}

function captchaFailedError(): ApiError {
  return ApiError.of('CAPTCHA_FAILED', 'CAPTCHA verification failed, please try again', {
    captchaRequired: true,
  });
}

function captchaUnavailableError(): ApiError {
  return ApiError.of('CAPTCHA_UNAVAILABLE', 'CAPTCHA verification is unavailable, try again later');
}

function unavailableConfiguration(provider: string): ApiError {
  logger.error({ provider }, 'CAPTCHA provider secret is not configured');
  return captchaUnavailableError();
}

async function postSiteverify(
  url: string,
  secret: string,
  token: string,
  ip: string | null,
): Promise<{ outcome: VerifyOutcome; result?: unknown }> {
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);
  try {
    const response = await fetch(url, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (!response.ok) {
      logger.warn({ status: response.status }, 'CAPTCHA siteverify returned an error status');
      return { outcome: 'unavailable' };
    }
    return { outcome: 'ok', result: (await response.json()) as unknown };
  } catch {
    logger.warn('CAPTCHA siteverify request failed');
    return { outcome: 'unavailable' };
  }
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, '');
}

function allowedHostnames(): Set<string> {
  const configured = env.CAPTCHA_ALLOWED_HOSTNAMES;
  const hostnames = new Set((configured ?? '').split(',').map(normalizeHostname).filter(Boolean));
  if (
    !isProduction &&
    env.RECAPTCHA_SITE_KEY === RECAPTCHA_TEST_SITE_KEY &&
    env.RECAPTCHA_SECRET_KEY === RECAPTCHA_TEST_SECRET_KEY
  ) {
    hostnames.add('testkey.google.com');
  }
  return hostnames;
}

function isRecaptchaSuccess(result: unknown): boolean {
  if (typeof result !== 'object' || result === null || Array.isArray(result)) return false;
  const response = result as Record<string, unknown>;
  if (response.success !== true || 'score' in response || 'action' in response) return false;
  if (typeof response.hostname !== 'string' || typeof response.challenge_ts !== 'string')
    return false;
  if (!ISO_TIMESTAMP_PATTERN.test(response.challenge_ts)) return false;

  const challengeTime = Date.parse(response.challenge_ts);
  const now = Date.now();
  if (!Number.isFinite(challengeTime)) return false;
  if (challengeTime > now + MAX_FUTURE_SKEW_MS || now - challengeTime > MAX_CHALLENGE_AGE_MS) {
    return false;
  }
  return allowedHostnames().has(normalizeHostname(response.hostname));
}

async function verifyTurnstile(token: string, ip: string | null): Promise<VerifyOutcome> {
  const result = await postSiteverify(
    TURNSTILE_VERIFY_URL,
    env.TURNSTILE_SECRET_KEY ?? '',
    token,
    ip,
  );
  if (result.outcome !== 'ok') return result.outcome;
  if (typeof result.result !== 'object' || result.result === null || Array.isArray(result.result)) {
    return 'unavailable';
  }
  const success = (result.result as Record<string, unknown>).success;
  return success === true ? 'ok' : 'rejected';
}

async function verifyRecaptcha(token: string, ip: string | null): Promise<VerifyOutcome> {
  if (allowedHostnames().size === 0) {
    logger.error('CAPTCHA_ALLOWED_HOSTNAMES is not configured for reCAPTCHA v2');
    return 'unavailable';
  }
  const result = await postSiteverify(
    RECAPTCHA_VERIFY_URL,
    env.RECAPTCHA_SECRET_KEY ?? '',
    token,
    ip,
  );
  if (result.outcome !== 'ok') return result.outcome;
  if (typeof result.result !== 'object' || result.result === null || Array.isArray(result.result)) {
    return 'unavailable';
  }
  const response = result.result as Record<string, unknown>;
  if (typeof response.success !== 'boolean') return 'unavailable';
  if (response.success !== true) return 'rejected';
  return isRecaptchaSuccess(response) ? 'ok' : 'rejected';
}

async function verifyConfiguredProvider(token: string, ip: string | null): Promise<VerifyOutcome> {
  const provider = env.CAPTCHA_PROVIDER ?? 'turnstile';
  return provider === 'recaptcha_v2' ? verifyRecaptcha(token, ip) : verifyTurnstile(token, ip);
}

export async function assertCaptcha(token: string | undefined, ip: string | null): Promise<void> {
  const provider = env.CAPTCHA_PROVIDER ?? 'turnstile';
  const secret = provider === 'recaptcha_v2' ? env.RECAPTCHA_SECRET_KEY : env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (isProduction) throw unavailableConfiguration(provider);
    return;
  }
  if (!token) throw captchaRequiredError();

  const outcome = await verifyConfiguredProvider(token, ip);
  if (outcome === 'rejected') throw captchaFailedError();
  if (outcome === 'unavailable') throw captchaUnavailableError();
}
