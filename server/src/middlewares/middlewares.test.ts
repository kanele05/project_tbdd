import express, { type Express, Router } from 'express';
import request from 'supertest';
import { z } from 'zod';

import { Prisma } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import { signAccessToken } from '@/lib/jwt';
import { errorHandler } from '@/middlewares/errorHandler';
import { notFound } from '@/middlewares/notFound';
import { createRateLimiter } from '@/middlewares/rateLimit';
import { getAuthUser, optionalAuth, requireAuth } from '@/middlewares/requireAuth';
import { createUpload } from '@/middlewares/upload';
import { validate } from '@/middlewares/validate';

const mockIsSessionActive = jest.fn();
jest.mock('@/lib/sessionGuard', () => ({
  isSessionActive: (...args: unknown[]) => mockIsSessionActive(...args),
}));

function buildApp(setup: (router: Router) => void): Express {
  const app = express();
  const router = Router();
  setup(router);
  app.use(express.json({ limit: '1kb' }));
  app.use(router);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('formats ApiError as { error: { code, message, details } }', async () => {
    const app = buildApp((r) =>
      r.get('/boom', () => {
        throw new ApiError(422, 'CART_EMPTY', 'Your cart is empty', { a: 1 });
      }),
    );
    const res = await request(app).get('/boom');
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      error: { code: 'CART_EMPTY', message: 'Your cart is empty', details: { a: 1 } },
    });
  });

  it('sets the Retry-After header when details.retryAfterSec is present', async () => {
    const app = buildApp((r) =>
      r.get('/locked', () => {
        throw new ApiError(423, 'ACCOUNT_LOCKED', 'Locked', { retryAfterSec: 42 });
      }),
    );
    const res = await request(app).get('/locked');
    expect(res.status).toBe(423);
    expect(res.headers['retry-after']).toBe('42');
  });

  it('turns unknown errors into 500 INTERNAL_ERROR without leaking the stack', async () => {
    const app = buildApp((r) =>
      r.get('/boom', () => {
        throw new Error('database exploded');
      }),
    );
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('at ');
    expect(res.body.error).not.toHaveProperty('stack');
  });

  it('handles rejected promises from async handlers (Express 5)', async () => {
    const app = buildApp((r) =>
      r.get('/async', async () => {
        throw ApiError.notFound('COURSE_NOT_FOUND', 'Course not found');
      }),
    );
    const res = await request(app).get('/async');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('COURSE_NOT_FOUND');
  });

  it('maps ZodError thrown by a service to 400 VALIDATION_ERROR', async () => {
    const app = buildApp((r) =>
      r.get('/zod', () => {
        z.object({ n: z.number() }).parse({ n: 'x' });
      }),
    );
    const res = await request(app).get('/zod');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].field).toBe('n');
  });

  it('maps a Prisma unique violation (P2002) to 409 CONFLICT', async () => {
    const app = buildApp((r) =>
      r.get('/dup', () => {
        throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        });
      }),
    );
    const res = await request(app).get('/dup');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns 400 for malformed JSON and 413 for oversized bodies', async () => {
    const app = buildApp((r) => r.post('/echo', (req, res) => void res.json(req.body)));
    const bad = await request(app)
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{oops');
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');

    const big = await request(app)
      .post('/echo')
      .send({ text: 'x'.repeat(5000) });
    expect(big.status).toBe(413);
    expect(big.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('returns 404 NOT_FOUND for unknown routes', async () => {
    const res = await request(buildApp(() => undefined)).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('validate', () => {
  const app = buildApp((r) =>
    r.post(
      '/items/:id',
      validate({
        params: z.object({ id: z.string().min(1) }),
        query: z.object({ page: z.coerce.number().int().min(1).default(1) }),
        body: z.object({ name: z.string().trim().min(2, 'Name is too short') }),
      }),
      (req, res) => {
        res.json({ body: req.body, query: req.query, params: req.params });
      },
    ),
  );

  it('passes parsed (trimmed / coerced / defaulted) data to the handler', async () => {
    const res = await request(app).post('/items/abc?page=3').send({ name: '  Ann  ' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ body: { name: 'Ann' }, query: { page: 3 }, params: { id: 'abc' } });
    const defaulted = await request(app).post('/items/abc').send({ name: 'Bob' });
    expect(defaulted.body.query).toEqual({ page: 1 });
  });

  it('returns 400 with per-field details for every invalid source', async () => {
    const res = await request(app).post('/items/abc?page=0').send({ name: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'query', field: 'page' }),
        { source: 'body', field: 'name', message: 'Name is too short' },
      ]),
    );
  });
});

describe('requireAuth / optionalAuth', () => {
  const app = buildApp((r) => {
    r.get(
      '/private',
      requireAuth,
      (req, res) => void res.json({ id: getAuthUser(req).id, sid: getAuthUser(req).sessionId }),
    );
    r.get('/public', optionalAuth, (req, res) => void res.json({ id: req.user?.id ?? null }));
  });
  const token = signAccessToken({ id: 'user-1', role: 'STUDENT', sessionId: 'sess-1' });

  beforeEach(() => {
    mockIsSessionActive.mockReset();
    mockIsSessionActive.mockResolvedValue(true);
  });

  it('requireAuth accepts a valid Bearer token and exposes the session id', async () => {
    const res = await request(app).get('/private').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'user-1', sid: 'sess-1' });
    expect(mockIsSessionActive).toHaveBeenCalledWith('sess-1');
  });

  it('requireAuth returns 401 when the session of a valid token was revoked', async () => {
    mockIsSessionActive.mockResolvedValue(false);
    const res = await request(app).get('/private').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('optionalAuth also rejects a token whose session was revoked', async () => {
    mockIsSessionActive.mockResolvedValue(false);
    const res = await request(app).get('/public').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('requireAuth returns 401 UNAUTHORIZED for missing, malformed or wrong tokens', async () => {
    for (const header of [undefined, 'Bearer', 'Basic abc', 'Bearer not.a.jwt', `Token ${token}`]) {
      const req = request(app).get('/private');
      const res = header ? await req.set('Authorization', header) : await req;
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('optionalAuth treats a missing header as guest but rejects a bad token', async () => {
    const guest = await request(app).get('/public');
    expect(guest.body).toEqual({ id: null });
    const authed = await request(app).get('/public').set('Authorization', `Bearer ${token}`);
    expect(authed.body).toEqual({ id: 'user-1' });
    const bad = await request(app).get('/public').set('Authorization', 'Bearer garbage');
    expect(bad.status).toBe(401);
  });
});

describe('rate limiter', () => {
  it('returns 429 RATE_LIMITED after the limit is exceeded', async () => {
    const limiter = createRateLimiter({ limit: 2, skip: false });
    const app = buildApp((r) =>
      r.get('/limited', limiter, (_req, res) => void res.json({ ok: true })),
    );
    expect((await request(app).get('/limited')).status).toBe(200);
    expect((await request(app).get('/limited')).status).toBe(200);
    const blocked = await request(app).get('/limited');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('upload', () => {
  const upload = createUpload({ maxSizeBytes: 10, allowedMimeTypes: ['text/plain'] });
  const app = buildApp((r) =>
    r.post(
      '/upload',
      upload.single('file'),
      (req, res) => void res.json({ name: req.file?.originalname }),
    ),
  );

  it('rejects files that are not whitelisted with 415 UNSUPPORTED_FILE_TYPE', async () => {
    const res = await request(app).post('/upload').attach('file', Buffer.from('MZ'), {
      filename: 'virus.exe',
      contentType: 'application/x-msdownload',
    });
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('rejects files above the size limit with 413 FILE_TOO_LARGE', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', Buffer.alloc(100, 'a'), { filename: 'big.txt', contentType: 'text/plain' });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });
});
