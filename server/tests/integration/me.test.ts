import fs from 'node:fs';
import path from 'node:path';

import { paths } from '@/config/env';
import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import {
  createBookmark,
  createCourse,
  createCourseWithLessons,
  createEnrollment,
  createLessonProgress,
  createUser,
} from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';

const api = createTestApi();
const createdFiles: string[] = [];

// PNG tối thiểu (chỉ cần đúng MIME khi upload).
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

beforeEach(async () => {
  await resetDb();
});

afterAll(() => {
  for (const file of createdFiles) fs.rmSync(file, { force: true });
});

function trackUpload(avatarUrl: string): string {
  const file = path.join(paths.uploads, path.basename(new URL(avatarUrl).pathname));
  createdFiles.push(file);
  return file;
}

describe('GET /me/stats (BR-15)', () => {
  it('counts saved, ongoing and completed courses', async () => {
    const user = await createUser();
    const [a, b, c, d] = await Promise.all([
      createCourse(),
      createCourse(),
      createCourse(),
      createCourse(),
    ]);
    await createBookmark(user.id, a.id);
    await createBookmark(user.id, b.id);
    await createEnrollment(user.id, a.id, { progressPercent: 30 });
    await createEnrollment(user.id, b.id, { progressPercent: 0 });
    await createEnrollment(user.id, c.id, { progressPercent: 100 });
    await createEnrollment((await createUser()).id, d.id, { progressPercent: 100 });

    const res = await api.get(`${API}/me/stats`).set(authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      savedCount: 2,
      ongoingCount: 2,
      completedCount: 1,
      learningSec: 0,
    });
  });

  it('returns zeros for a new user and 401 without a token', async () => {
    const user = await createUser();
    const res = await api.get(`${API}/me/stats`).set(authHeader(user));
    const anonymous = await api.get(`${API}/me/stats`);

    expect(res.body.data).toEqual({
      savedCount: 0,
      ongoingCount: 0,
      completedCount: 0,
      learningSec: 0,
    });
    expect(anonymous.status).toBe(401);
  });
});

describe('GET /me/stats learningSec', () => {
  it('sums full duration for completed lessons and capped position for partial ones', async () => {
    const user = await createUser();
    const other = await createUser();
    const { lessons } = await createCourseWithLessons({ lessonDurationSec: 100 });
    // Hoàn thành: đủ 100 s (kể cả khi positionSec nhỏ); dở dang 40 s; vượt thời lượng -> chặn ở 100 s.
    await createLessonProgress(user.id, lessons[0].id, { isCompleted: true, positionSec: 10 });
    await createLessonProgress(user.id, lessons[1].id, { positionSec: 40 });
    await createLessonProgress(user.id, lessons[2].id, { positionSec: 999 });
    await createLessonProgress(user.id, lessons[3].id, { positionSec: 0 });
    await createLessonProgress(other.id, lessons[4].id, { isCompleted: true });

    const res = await api.get(`${API}/me/stats`).set(authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.data.learningSec).toBe(240);
    expect(Number.isInteger(res.body.data.learningSec)).toBe(true);
  });
});

describe('PATCH /me', () => {
  it('updates fullName and headline and returns the user', async () => {
    const user = await createUser({ fullName: 'Old Name' });

    const res = await api
      .patch(`${API}/me`)
      .set(authHeader(user))
      .send({ fullName: '  New Name ', headline: 'UX/UI Designer' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: user.id,
      fullName: 'New Name',
      headline: 'UX/UI Designer',
      email: user.email,
    });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('changes only the sent field and clears the headline with an empty string', async () => {
    const user = await createUser({ fullName: 'Keep Me', headline: 'Something' });

    const res = await api.patch(`${API}/me`).set(authHeader(user)).send({ headline: '' });

    expect(res.body.data).toMatchObject({ fullName: 'Keep Me', headline: null });
  });

  it('returns 400 VALIDATION_ERROR for an empty body or invalid values', async () => {
    const user = await createUser();
    const empty = await api.patch(`${API}/me`).set(authHeader(user)).send({});
    const tooShort = await api.patch(`${API}/me`).set(authHeader(user)).send({ fullName: 'A' });

    for (const res of [empty, tooShort]) {
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns 401 without a token', async () => {
    const res = await api.patch(`${API}/me`).send({ fullName: 'Someone' });
    expect(res.status).toBe(401);
  });
});

describe('POST /me/avatar', () => {
  it('stores a png avatar and returns its absolute URL', async () => {
    const user = await createUser();

    const res = await api
      .post(`${API}/me/avatar`)
      .set(authHeader(user))
      .attach('file', PNG, { filename: 'me.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.data.avatarUrl).toMatch(/^https?:\/\/.+\/uploads\/.+\.png$/);
    const file = trackUpload(res.body.data.avatarUrl);
    expect(fs.existsSync(file)).toBe(true);
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.avatarUrl).toMatch(/^\/uploads\/.+\.png$/);

    const me = await api.get(`${API}/auth/me`).set(authHeader(user));
    expect(me.body.data.avatarUrl).toBe(res.body.data.avatarUrl);
  });

  it('returns 415 UNSUPPORTED_FILE_TYPE for a non-image file', async () => {
    const user = await createUser();
    const res = await api
      .post(`${API}/me/avatar`)
      .set(authHeader(user))
      .attach('file', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('returns 413 FILE_TOO_LARGE above 5 MB', async () => {
    const user = await createUser();
    const res = await api
      .post(`${API}/me/avatar`)
      .set(authHeader(user))
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'big.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('returns 400 when no file is sent and 401 without a token', async () => {
    const user = await createUser();
    const none = await api.post(`${API}/me/avatar`).set(authHeader(user));
    const anonymous = await api
      .post(`${API}/me/avatar`)
      .attach('file', PNG, { filename: 'me.png', contentType: 'image/png' });

    expect(none.status).toBe(400);
    expect(none.body.error.code).toBe('VALIDATION_ERROR');
    expect(anonymous.status).toBe(401);
  });
});
