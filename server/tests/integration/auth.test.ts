import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import { createUser, DEFAULT_TEST_PASSWORD } from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';

const api = createTestApi();

beforeEach(async () => {
  await resetDb();
});

const validRegister = {
  fullName: 'Martha Rosie',
  email: 'Martha.Rosie@Example.com',
  password: 'Learn2026',
};

describe('POST /auth/register', () => {
  it('creates a student and returns { token, user } with 201', async () => {
    const res = await api.post(`${API}/auth/register`).send(validRegister);

    expect(res.status).toBe(201);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toEqual({
      id: expect.any(String),
      email: 'martha.rosie@example.com', // lưu chữ thường
      fullName: 'Martha Rosie',
      headline: null,
      avatarUrl: null,
      coverUrl: null,
      role: 'STUDENT',
    });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: 'martha.rosie@example.com' },
    });
    expect(stored.passwordHash).not.toBe(validRegister.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$10\$/);
  });

  it('returns 409 EMAIL_TAKEN when the email is already registered', async () => {
    await api.post(`${API}/auth/register`).send(validRegister).expect(201);
    const res = await api
      .post(`${API}/auth/register`)
      .send({ ...validRegister, email: 'martha.rosie@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('returns 400 VALIDATION_ERROR with per-field details for invalid input', async () => {
    const res = await api
      .post(`${API}/auth/register`)
      .send({ fullName: 'A', email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = (res.body.error.details as { source: string; field: string }[]).map(
      (d) => `${d.source}.${d.field}`,
    );
    expect(fields).toEqual(
      expect.arrayContaining(['body.fullName', 'body.email', 'body.password']),
    );
  });

  it.each([
    ['no digit', 'OnlyLetters'],
    ['no letter', '12345678'],
    ['too short', 'Ab1'],
  ])('rejects a password with %s', async (_label, password) => {
    const res = await api.post(`${API}/auth/register`).send({ ...validRegister, password });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('never creates a user when validation fails', async () => {
    await api.post(`${API}/auth/register`).send({ email: 'x@example.com' }).expect(400);
    expect(await prisma.user.count()).toBe(0);
  });
});

describe('POST /auth/login', () => {
  it('returns { token, user } for correct credentials (email is case-insensitive)', async () => {
    const user = await createUser({ email: 'martha@example.com', fullName: 'Martha Rosie' });
    const res = await api
      .post(`${API}/auth/login`)
      .send({ email: ' MARTHA@example.com ', password: DEFAULT_TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({ id: user.id, email: 'martha@example.com' });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('returns 401 INVALID_CREDENTIALS for a wrong password', async () => {
    await createUser({ email: 'martha@example.com' });
    const res = await api
      .post(`${API}/auth/login`)
      .send({ email: 'martha@example.com', password: 'WrongPass1' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns the same 401 for an unknown email', async () => {
    const res = await api
      .post(`${API}/auth/login`)
      .send({ email: 'nobody@example.com', password: DEFAULT_TEST_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 400 VALIDATION_ERROR when the body is incomplete', async () => {
    const res = await api.post(`${API}/auth/login`).send({ email: 'martha@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /auth/me', () => {
  it('returns the current user for a valid token from /auth/login', async () => {
    await createUser({ email: 'martha@example.com', fullName: 'Martha Rosie' });
    const login = await api
      .post(`${API}/auth/login`)
      .send({ email: 'martha@example.com', password: DEFAULT_TEST_PASSWORD });

    const res = await api
      .get(`${API}/auth/me`)
      .set('Authorization', `Bearer ${login.body.data.token as string}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(login.body.data.user);
  });

  it('returns 401 UNAUTHORIZED without a token', async () => {
    const res = await api.get(`${API}/auth/me`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 UNAUTHORIZED for a malformed or wrongly signed token', async () => {
    const malformed = await api.get(`${API}/auth/me`).set('Authorization', 'Bearer not-a-jwt');
    expect(malformed.status).toBe(401);
    expect(malformed.body.error.code).toBe('UNAUTHORIZED');

    // Token đúng định dạng nhưng ký bằng secret khác.
    const forged =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEiLCJyb2xlIjoiU1RVREVOVCJ9.' +
      'aW52YWxpZC1zaWduYXR1cmU';
    const res = await api.get(`${API}/auth/me`).set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when the token is valid but the user no longer exists', async () => {
    const res = await api.get(`${API}/auth/me`).set(authHeader({ id: 'deleted-user-id' }));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
