import { AI_REQUEST_TIMEOUT_MS } from '@/constants/config';
import { api } from '@/lib/apiClient';

import { STUDIO_PAGE_SIZE, studioApi } from './api';

jest.mock('@/lib/apiClient', () => ({
  api: {
    get: jest.fn(),
    getPage: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    postForm: jest.fn(),
  },
}));

const mocked = api as jest.Mocked<typeof api>;

describe('studioApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists and reads the teacher courses', async () => {
    await studioApi.list({ page: 2, status: 'DRAFT' });
    await studioApi.detail('c1');
    expect(mocked.getPage).toHaveBeenCalledWith('/teacher/courses', {
      limit: STUDIO_PAGE_SIZE,
      page: 2,
      status: 'DRAFT',
    });
    expect(mocked.get).toHaveBeenCalledWith('/teacher/courses/c1');
  });

  it('creates, updates and deletes a course', async () => {
    await studioApi.create({ title: 'Hello world', categoryId: 'cat' });
    await studioApi.update('c1', { subtitle: null });
    await studioApi.remove('c1');
    expect(mocked.post).toHaveBeenCalledWith('/teacher/courses', {
      title: 'Hello world',
      categoryId: 'cat',
    });
    expect(mocked.patch).toHaveBeenCalledWith('/teacher/courses/c1', { subtitle: null });
    expect(mocked.delete).toHaveBeenCalledWith('/teacher/courses/c1');
  });

  it('edits sections and lessons and reorders them', async () => {
    await studioApi.addSection('c1', { title: 'S' });
    await studioApi.renameSection('s1', { title: 'T' });
    await studioApi.deleteSection('s1');
    const lesson = { title: 'L', videoUrl: 'u', durationSec: 5, isPreview: false };
    await studioApi.addLesson('s1', lesson);
    await studioApi.updateLesson('l1', { title: 'M' });
    await studioApi.deleteLesson('l1');
    await studioApi.reorder('c1', { target: 'sections', ids: ['b', 'a'] });
    expect(mocked.post).toHaveBeenCalledWith('/teacher/courses/c1/sections', { title: 'S' });
    expect(mocked.patch).toHaveBeenCalledWith('/teacher/sections/s1', { title: 'T' });
    expect(mocked.delete).toHaveBeenCalledWith('/teacher/sections/s1');
    expect(mocked.post).toHaveBeenCalledWith('/teacher/sections/s1/lessons', lesson);
    expect(mocked.patch).toHaveBeenCalledWith('/teacher/lessons/l1', { title: 'M' });
    expect(mocked.delete).toHaveBeenCalledWith('/teacher/lessons/l1');
    expect(mocked.post).toHaveBeenCalledWith('/teacher/courses/c1/reorder', {
      target: 'sections',
      ids: ['b', 'a'],
    });
  });

  it('calls the review workflow and revision endpoints', async () => {
    await studioApi.submit('c1');
    await studioApi.withdraw('c1');
    await studioApi.archive('c1');
    await studioApi.restore('c1');
    await studioApi.createRevision('c1');
    await studioApi.submitRevision('c1');
    await studioApi.discardRevision('c1');
    expect(mocked.post.mock.calls.map(([url]) => url)).toEqual([
      '/teacher/courses/c1/submit',
      '/teacher/courses/c1/withdraw',
      '/teacher/courses/c1/archive',
      '/teacher/courses/c1/restore',
      '/teacher/courses/c1/revision',
      '/teacher/courses/c1/revision/submit',
    ]);
    expect(mocked.delete).toHaveBeenCalledWith('/teacher/courses/c1/revision');
  });

  it('saves a revision with PUT', async () => {
    const body = {
      title: 'T',
      priceCents: 0,
      originalPriceCents: null,
      categoryId: 'c',
      tagIds: [],
      sections: [],
    };
    await studioApi.saveRevision('c1', body);
    expect(mocked.put).toHaveBeenCalledWith('/teacher/courses/c1/revision', body);
  });

  it('uploads the cover as multipart "file" and forwards the progress callback', async () => {
    const onProgress = jest.fn();
    await studioApi.uploadImage(
      { uri: 'file:///c.png', name: 'c.png', type: 'image/png' },
      onProgress,
    );
    const [url, form, callback] = mocked.postForm.mock.calls[0] ?? [];
    expect(url).toBe('/teacher/uploads/image');
    expect(form).toBeInstanceOf(FormData);
    expect(callback).toBe(onProgress);
  });

  it('asks the AI for a draft with the long AI timeout', async () => {
    const body = { topic: 'React Native', level: 'beginner', lang: 'en' } as const;
    await studioApi.aiCourseDraft(body);
    expect(mocked.post).toHaveBeenCalledWith('/teacher/ai/course-draft', body, {
      timeout: AI_REQUEST_TIMEOUT_MS,
    });
  });
});
