import fs from 'node:fs';
import path from 'node:path';

import { paths } from '@/config/env';
import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import {
  createCourse,
  createEnrollment,
  createResource,
  createSubmission,
  createUser,
} from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';

const api = createTestApi();
const createdFiles: string[] = [];
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

beforeEach(async () => {
  await resetDb();
});

afterAll(() => {
  for (const file of createdFiles) fs.rmSync(file, { force: true });
});

function uploadedFile(url: string): string {
  const file = path.join(paths.uploads, path.basename(new URL(url).pathname));
  createdFiles.push(file);
  return file;
}

function uploadCount(): number {
  return fs.existsSync(paths.uploads) ? fs.readdirSync(paths.uploads).length : 0;
}

async function enrolledUser() {
  const user = await createUser();
  const course = await createCourse();
  await createEnrollment(user.id, course.id);
  return { user, course };
}

describe('GET /courses/:id/project', () => {
  it('returns the description, resources and submission count', async () => {
    const { user, course } = await enrolledUser();
    await prisma.course.update({
      where: { id: course.id },
      data: { projectDescription: 'Redesign one key flow.' },
    });
    await createResource(course.id, { name: 'B.pdf' });
    await createResource(course.id, { name: 'A.txt' });
    await createSubmission(user.id, course.id);

    const res = await api.get(`${API}/courses/${course.id}/project`).set(authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      description: 'Redesign one key flow.',
      resources: [
        expect.objectContaining({
          name: 'A.txt',
          sizeBytes: 329,
          mimeType: 'text/plain',
          fileUrl: expect.stringMatching(/^https?:\/\/.+\/static\/resources\/Document%201\.txt$/),
        }),
        expect.objectContaining({ name: 'B.pdf' }),
      ],
      submissionCount: 1,
    });
  });

  it('returns an empty description when the course has no project text', async () => {
    const { user, course } = await enrolledUser();
    const res = await api.get(`${API}/courses/${course.id}/project`).set(authHeader(user));
    expect(res.body.data).toEqual({ description: '', resources: [], submissionCount: 0 });
  });

  it('returns 403 NOT_ENROLLED, 404 COURSE_NOT_FOUND and 401', async () => {
    const user = await createUser();
    const course = await createCourse();

    const forbidden = await api.get(`${API}/courses/${course.id}/project`).set(authHeader(user));
    const missing = await api.get(`${API}/courses/nope/project`).set(authHeader(user));
    const anonymous = await api.get(`${API}/courses/${course.id}/project`);

    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('NOT_ENROLLED');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('COURSE_NOT_FOUND');
    expect(anonymous.status).toBe(401);
  });
});

describe('GET /courses/:id/submissions', () => {
  it('lists submissions of the course newest first with the author', async () => {
    const { user, course } = await enrolledUser();
    const other = await createCourse();
    await createSubmission(user.id, course.id, {
      title: 'Older',
      createdAt: new Date('2026-09-01T00:00:00Z'),
    });
    await createSubmission(user.id, course.id, {
      title: 'Newer',
      createdAt: new Date('2026-09-02T00:00:00Z'),
    });
    await createSubmission(user.id, other.id, { title: 'Other course' });

    const res = await api
      .get(`${API}/courses/${course.id}/submissions`)
      .query({ limit: 1 })
      .set(authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, limit: 1, total: 2, totalPages: 2 });
    expect(res.body.data).toEqual([
      expect.objectContaining({
        title: 'Newer',
        description: null,
        fileUrl: expect.stringMatching(/\/uploads\/test-file\.txt$/),
        imageUrl: expect.stringMatching(/\/uploads\/test-image\.png$/),
        user: { id: user.id, fullName: user.fullName, avatarUrl: null },
      }),
    ]);
  });

  it('returns 403 NOT_ENROLLED for a user who has not enrolled', async () => {
    const user = await createUser();
    const course = await createCourse();
    const res = await api.get(`${API}/courses/${course.id}/submissions`).set(authHeader(user));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_ENROLLED');
  });
});

describe('POST /courses/:id/submissions (BR-09)', () => {
  it('stores the file and the cover image and returns 201', async () => {
    const { user, course } = await enrolledUser();

    const res = await api
      .post(`${API}/courses/${course.id}/submissions`)
      .set(authHeader(user))
      .field('title', '  My wireframes ')
      .field('description', 'Three screens')
      .attach('file', Buffer.from('zip-ish content'), {
        filename: 'p.zip',
        contentType: 'application/zip',
      })
      .attach('image', PNG, { filename: 'cover.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: 'My wireframes',
      description: 'Three screens',
      user: { id: user.id },
    });
    const file = uploadedFile(res.body.data.fileUrl);
    const image = uploadedFile(res.body.data.imageUrl);
    expect(fs.existsSync(file)).toBe(true);
    expect(fs.existsSync(image)).toBe(true);
    expect(await prisma.projectSubmission.count({ where: { courseId: course.id } })).toBe(1);
  });

  it('accepts a submission without description and cover image', async () => {
    const { user, course } = await enrolledUser();

    const res = await api
      .post(`${API}/courses/${course.id}/submissions`)
      .set(authHeader(user))
      .field('title', 'Just a file')
      .attach('file', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ description: null, imageUrl: null });
    uploadedFile(res.body.data.fileUrl);
  });

  it('returns 403 NOT_ENROLLED and does not write the file to disk', async () => {
    const user = await createUser();
    const course = await createCourse();
    const before = uploadCount();

    const res = await api
      .post(`${API}/courses/${course.id}/submissions`)
      .set(authHeader(user))
      .field('title', 'x')
      .attach('file', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_ENROLLED');
    expect(uploadCount()).toBe(before);
  });

  it('returns 400 for a missing title and removes the orphan upload', async () => {
    const { user, course } = await enrolledUser();
    const before = uploadCount();

    const res = await api
      .post(`${API}/courses/${course.id}/submissions`)
      .set(authHeader(user))
      .attach('file', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0]).toMatchObject({ source: 'body', field: 'title' });
    expect(uploadCount()).toBe(before);
    expect(await prisma.projectSubmission.count()).toBe(0);
  });

  it('returns 400 when the project file is missing', async () => {
    const { user, course } = await enrolledUser();
    const res = await api
      .post(`${API}/courses/${course.id}/submissions`)
      .set(authHeader(user))
      .field('title', 'No file');

    expect(res.status).toBe(400);
    expect(res.body.error.details[0]).toMatchObject({ field: 'file' });
  });

  it('returns 415 for an unsupported type and removes files already stored', async () => {
    const { user, course } = await enrolledUser();
    const before = uploadCount();

    const badFile = await api
      .post(`${API}/courses/${course.id}/submissions`)
      .set(authHeader(user))
      .field('title', 'x')
      .attach('file', Buffer.from('MZ'), {
        filename: 'a.exe',
        contentType: 'application/x-msdownload',
      });
    // Ảnh bìa phải là png/jpg: pdf hợp lệ làm `file` nhưng không hợp lệ làm `image`.
    const badImage = await api
      .post(`${API}/courses/${course.id}/submissions`)
      .set(authHeader(user))
      .field('title', 'x')
      .attach('file', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' })
      .attach('image', Buffer.from('%PDF'), { filename: 'c.pdf', contentType: 'application/pdf' });

    expect(badFile.status).toBe(415);
    expect(badFile.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
    expect(badImage.status).toBe(415);
    expect(uploadCount()).toBe(before);
    expect(await prisma.projectSubmission.count()).toBe(0);
  });

  it('returns 413 FILE_TOO_LARGE above 10 MB', async () => {
    const { user, course } = await enrolledUser();
    const res = await api
      .post(`${API}/courses/${course.id}/submissions`)
      .set(authHeader(user))
      .field('title', 'big')
      .attach('file', Buffer.alloc(10 * 1024 * 1024 + 1), {
        filename: 'big.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('returns 401 without a token', async () => {
    const course = await createCourse();
    const res = await api
      .post(`${API}/courses/${course.id}/submissions`)
      .field('title', 'x')
      .attach('file', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(res.status).toBe(401);
  });
});
