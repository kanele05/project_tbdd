import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ToastProvider } from '@/components/ui/Toast';
import { queryKeys } from '@/lib/queryKeys';
import { createTestQueryClient } from '@/test/queryWrapper';
import type { ProjectSubmissionDto, ResourceDto } from '@/types/api';

import { useLatestSubmissions, useResourceDownload, useSubmitProject } from './hooks';

const mockSubmissions = jest.fn();
const mockSubmit = jest.fn();
const mockDownloadResource = jest.fn();
const mockOpenFile = jest.fn();

jest.mock('./api', () => ({
  projectApi: {
    detail: jest.fn(),
    submissions: (...args: unknown[]) => mockSubmissions(...args),
    submit: (...args: unknown[]) => mockSubmit(...args),
  },
}));

jest.mock('./downloadResource', () => ({
  downloadResource: (...args: unknown[]) => mockDownloadResource(...args),
  openDownloadedFile: (...args: unknown[]) => mockOpenFile(...args),
}));

const RESOURCE: ResourceDto = {
  id: 'r1',
  name: 'Document 1.txt',
  fileUrl: 'https://x/d1.txt',
  sizeBytes: 100,
  mimeType: 'text/plain',
};

function setup() {
  const queryClient = createTestQueryClient();
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
  return { invalidate, wrapper };
}

function makeSubmission(id: string): ProjectSubmissionDto {
  return {
    id,
    title: id,
    description: null,
    imageUrl: null,
    fileUrl: 'https://x/f',
    createdAt: '2026-10-01T00:00:00Z',
    user: { id: 'u', fullName: 'U', avatarUrl: null },
  };
}

describe('useLatestSubmissions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches only the first page (10 newest) and returns a flat list', async () => {
    mockSubmissions.mockResolvedValue({
      data: [makeSubmission('s1'), makeSubmission('s2')],
      meta: { page: 1, limit: 10, total: 25, totalPages: 3 },
    });
    const { wrapper } = setup();

    const { result } = await renderHook(() => useLatestSubmissions('c1'), { wrapper });

    await waitFor(() => expect(result.current.data?.map((s) => s.id)).toEqual(['s1', 's2']));
    expect(mockSubmissions).toHaveBeenCalledWith('c1', 1, 10);
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe('useSubmitProject', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uploads with progress and refreshes submissions + project on success', async () => {
    mockSubmit.mockImplementation(
      async (_id: string, _input: unknown, onProgress: (p: number) => void) => {
        onProgress(60);
        return makeSubmission('new');
      },
    );
    const { invalidate, wrapper } = setup();
    const { result } = await renderHook(() => useSubmitProject('c1'), { wrapper });

    await act(async () => {
      await result.current.submit({
        title: 'T',
        file: { uri: 'file:///a.zip', name: 'a.zip', mimeType: 'application/zip' },
      });
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.progress).toBe(60);
    const keys = invalidate.mock.calls.map(([f]) => (f as { queryKey: unknown[] }).queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([queryKeys.courseSubmissions('c1'), queryKeys.courseProject('c1')]),
    );
  });

  it('does not refresh anything when the upload fails', async () => {
    mockSubmit.mockRejectedValue(new Error('413'));
    const { invalidate, wrapper } = setup();
    const { result } = await renderHook(() => useSubmitProject('c1'), { wrapper });

    await act(async () => {
      await result.current
        .submit({
          title: 'T',
          file: { uri: 'file:///a.zip', name: 'a.zip', mimeType: 'application/zip' },
        })
        .catch(() => undefined);
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('useResourceDownload', () => {
  beforeEach(() => jest.clearAllMocks());

  it('downloads then opens the file, reporting progress and clearing the busy state', async () => {
    mockDownloadResource.mockImplementation(
      async (_r: ResourceDto, onProgress: (p: number) => void) => {
        onProgress(50);
        return 'file:///cache/Document 1.txt';
      },
    );
    mockOpenFile.mockResolvedValue(undefined);
    const { wrapper } = setup();
    const { result } = await renderHook(() => useResourceDownload(), { wrapper });

    await act(async () => {
      await result.current.download(RESOURCE);
    });

    expect(mockOpenFile).toHaveBeenCalledWith('file:///cache/Document 1.txt', 'text/plain');
    expect(result.current.downloading).toBeNull();
  });

  it('marks the resource as downloading while the request is in flight', async () => {
    let finish: (uri: string) => void = () => undefined;
    mockDownloadResource.mockReturnValue(new Promise<string>((resolve) => (finish = resolve)));
    mockOpenFile.mockResolvedValue(undefined);
    const { wrapper } = setup();
    const { result } = await renderHook(() => useResourceDownload(), { wrapper });

    let pending: Promise<void> = Promise.resolve();
    await act(async () => {
      pending = result.current.download(RESOURCE);
    });
    expect(result.current.downloading).toEqual({ resourceId: 'r1', percent: null });

    await act(async () => {
      finish('file:///x');
      await pending;
    });
    expect(result.current.downloading).toBeNull();
  });

  it('ignores a second download while one is running', async () => {
    let finish: (uri: string) => void = () => undefined;
    mockDownloadResource.mockReturnValue(new Promise<string>((resolve) => (finish = resolve)));
    mockOpenFile.mockResolvedValue(undefined);
    const { wrapper } = setup();
    const { result } = await renderHook(() => useResourceDownload(), { wrapper });

    let first: Promise<void> = Promise.resolve();
    await act(async () => {
      first = result.current.download(RESOURCE);
      await result.current.download({ ...RESOURCE, id: 'r2' });
    });

    expect(mockDownloadResource).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish('file:///x');
      await first;
    });
  });

  it('shows a toast and recovers when the download fails', async () => {
    mockDownloadResource.mockRejectedValue(new Error('network'));
    const { wrapper } = setup();
    const { result } = await renderHook(() => useResourceDownload(), { wrapper });

    await act(async () => {
      await result.current.download(RESOURCE);
    });

    expect(mockOpenFile).not.toHaveBeenCalled();
    expect(result.current.downloading).toBeNull();
  });
});
