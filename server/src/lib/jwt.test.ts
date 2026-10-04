import jwt from 'jsonwebtoken';

import { env } from '@/config/env';

import {
  ACCESS_TOKEN_TTL_SEC,
  CHALLENGE_TOKEN_TTL_SEC,
  signAccessToken,
  signChallengeToken,
  verifyChallengeToken,
  verifyToken,
} from './jwt';

const user = { id: 'user-1', role: 'TEACHER' as const, sessionId: 'sess-1' };

describe('access token', () => {
  it('round-trips id, role and session id, and lives ACCESS_TOKEN_TTL (15 minutes by default)', () => {
    const token = signAccessToken(user);
    expect(verifyToken(token)).toEqual(user);
    const payload = jwt.decode(token) as { exp: number; iat: number; sid: string; typ: string };
    expect(payload.exp - payload.iat).toBe(ACCESS_TOKEN_TTL_SEC);
    expect(ACCESS_TOKEN_TTL_SEC).toBe(900);
    expect(payload.sid).toBe('sess-1');
    expect(payload.typ).toBe('access');
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign({ role: 'STUDENT', sid: 's', typ: 'access' }, env.JWT_SECRET, {
      subject: 'u',
      expiresIn: -10,
    });
    expect(verifyToken(expired)).toBeNull();
  });

  it('rejects a token signed with another secret or algorithm', () => {
    const forged = jwt.sign(
      { role: 'STUDENT', sid: 's', typ: 'access' },
      'another-secret-'.repeat(3),
      {
        subject: 'u',
      },
    );
    expect(verifyToken(forged)).toBeNull();
    const none = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(
      '{"sub":"u","role":"STUDENT","sid":"s","typ":"access"}',
    ).toString('base64url')}.`;
    expect(verifyToken(none)).toBeNull();
  });

  it('rejects tokens without a session id, with the wrong type, a bad role or no subject', () => {
    const sign = (claims: object, subject?: string) =>
      jwt.sign(claims, env.JWT_SECRET, subject ? { subject } : {});
    expect(verifyToken(sign({ role: 'STUDENT', typ: 'access' }, 'u'))).toBeNull(); // thiếu sid (token cũ 7 ngày)
    expect(verifyToken(sign({ role: 'STUDENT', sid: 's' }, 'u'))).toBeNull(); // thiếu typ
    expect(verifyToken(sign({ role: 'STUDENT', sid: 's', typ: '2fa-challenge' }, 'u'))).toBeNull();
    expect(verifyToken(sign({ role: 'HACKER', sid: 's', typ: 'access' }, 'u'))).toBeNull();
    expect(verifyToken(sign({ role: 'STUDENT', sid: 's', typ: 'access' }))).toBeNull();
    expect(verifyToken(jwt.sign('plain string', env.JWT_SECRET))).toBeNull();
    expect(verifyToken('garbage')).toBeNull();
  });
});

describe('challenge token', () => {
  it('round-trips the user id and lives 5 minutes', () => {
    const token = signChallengeToken('user-9');
    expect(verifyChallengeToken(token)).toBe('user-9');
    const payload = jwt.decode(token) as { exp: number; iat: number };
    expect(payload.exp - payload.iat).toBe(CHALLENGE_TOKEN_TTL_SEC);
    expect(CHALLENGE_TOKEN_TTL_SEC).toBe(300);
  });

  it('cannot be used as an access token, and an access token is not a challenge token', () => {
    expect(verifyToken(signChallengeToken('user-9'))).toBeNull();
    expect(verifyChallengeToken(signAccessToken(user))).toBeNull();
  });

  it('rejects expired, forged and malformed tokens', () => {
    const expired = jwt.sign({ typ: '2fa-challenge' }, env.JWT_SECRET, {
      subject: 'u',
      expiresIn: -1,
    });
    expect(verifyChallengeToken(expired)).toBeNull();
    const forged = jwt.sign({ typ: '2fa-challenge' }, 'another-secret-'.repeat(3), {
      subject: 'u',
    });
    expect(verifyChallengeToken(forged)).toBeNull();
    expect(verifyChallengeToken(jwt.sign({ typ: '2fa-challenge' }, env.JWT_SECRET))).toBeNull();
    expect(verifyChallengeToken(jwt.sign('x', env.JWT_SECRET))).toBeNull();
    expect(verifyChallengeToken('garbage')).toBeNull();
  });
});
