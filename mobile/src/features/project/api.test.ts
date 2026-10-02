import { AppError } from '@/lib/appError';

import { buildSubmissionForm, projectApi, type PickedFile } from './api';
import { getSubmitErrorMessage } from './submitErrors';

const mockPostForm = jest.fn();
const mockGetPage = jest.fn();
const mockGet = jest.fn();

jest.mock('@/lib/apiClient', () => ({
  api: {
    postForm: (...args: unknown[]) => mockPostForm(...args),
    getPage: (...args: unknown[]) => mockGetPage(...args),
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

const FILE: PickedFile = {
  uri: 'file:///cache/work.zip',
  name: 'work.zip',
  mimeType: 'application/x-zip-compressed',
  size: 2048,
};

type Appended = [name: string, value: unknown];

const appended: Appended[] = [];
const OriginalFormData = global.FormData;

/** The jest environment's FormData stringifies file objects, so record the raw appends instead. */
class RecordingFormData {
  append(name: string, value: unknown): void {
    appended.push([name, value]);
  }
}

beforeAll(() => {
  global.FormData = RecordingFormData as unknown as typeof FormData;
});

afterAll(() => {
  global.FormData = OriginalFormData;
});

describe('buildSubmissionForm', () => {
  beforeEach(() => {
    appended.length = 0;
  });

  it('sends title, description and the file with a canonical MIME type', () => {
    buildSubmissionForm({ title: 'My app', description: 'Notes', file: FILE });
    const byName = Object.fromEntries(appended);

    expect(byName.title).toBe('My app');
    expect(byName.description).toBe('Notes');
    expect(byName.file).toEqual({
      uri: 'file:///cache/work.zip',
      name: 'work.zip',
      type: 'application/zip',
    });
    expect(byName.image).toBeUndefined();
  });

  it('omits an empty description and attaches the cover image when present', () => {
    const image: PickedFile = { uri: 'file:///cache/c.png', name: 'c.png', mimeType: 'image/png' };
    buildSubmissionForm({ title: 'T', file: FILE, image });

    expect(appended.map(([name]) => name)).toEqual(['title', 'file', 'image']);
    expect(appended[2]?.[1]).toEqual({
      uri: 'file:///cache/c.png',
      name: 'c.png',
      type: 'image/png',
    });
  });
});

describe('projectApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uploads to /courses/:id/submissions with the progress callback', () => {
    const onProgress = jest.fn();
    void projectApi.submit('c1', { title: 'T', file: FILE }, onProgress);

    expect(mockPostForm).toHaveBeenCalledWith(
      '/courses/c1/submissions',
      expect.anything(),
      onProgress,
    );
  });

  it('lists submissions with page and limit', () => {
    void projectApi.submissions('c1', 1, 10);
    expect(mockGetPage).toHaveBeenCalledWith('/courses/c1/submissions', { page: 1, limit: 10 });
  });

  it('loads the project from /courses/:id/project', () => {
    void projectApi.detail('c1');
    expect(mockGet).toHaveBeenCalledWith('/courses/c1/project');
  });
});

describe('getSubmitErrorMessage', () => {
  const error = (status: number, code: string) =>
    new AppError({ status, code, message: 'server message' });

  it('maps 413, 415 and 403 to specific sentences', () => {
    expect(getSubmitErrorMessage(error(413, 'FILE_TOO_LARGE'))).toBe(
      'This file is too large (max 10 MB).',
    );
    expect(getSubmitErrorMessage(error(415, 'WHATEVER'))).toBe('This file type is not supported.');
    expect(getSubmitErrorMessage(error(403, 'NOT_ENROLLED'))).toMatch(/enroll/i);
  });

  it('falls back to the generic friendly message', () => {
    expect(getSubmitErrorMessage(error(500, 'INTERNAL_ERROR'))).toBe(
      'Something went wrong. Please try again.',
    );
  });
});
