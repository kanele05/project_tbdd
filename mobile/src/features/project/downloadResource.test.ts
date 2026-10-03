import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { ResourceDto } from '@/types/api';

import { downloadResource, openDownloadedFile } from './downloadResource';

jest.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = `file:///cache/${String(parts[parts.length - 1])}`;
    }
    static downloadFileAsync = jest.fn();
  }
  return { File: MockFile, Paths: { cache: 'cache' } };
});
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

const download = File.downloadFileAsync as jest.Mock;
const sharing = Sharing as jest.Mocked<typeof Sharing>;

const RESOURCE: ResourceDto = {
  id: 'r1',
  name: 'starter kit.zip',
  fileUrl: 'https://example.com/files/kit.zip',
  sizeBytes: 1000,
  mimeType: 'application/zip',
};

describe('downloadResource', () => {
  beforeEach(() => jest.clearAllMocks());

  it('downloads into the cache directory and returns the local uri', async () => {
    download.mockResolvedValue({ uri: 'file:///cache/starter_kit.zip' });

    await expect(downloadResource(RESOURCE)).resolves.toBe('file:///cache/starter_kit.zip');

    const [url, destination, options] = download.mock.calls[0] ?? [];
    expect(url).toBe(RESOURCE.fileUrl);
    expect(destination).toBeInstanceOf(File);
    expect(options).toMatchObject({ idempotent: true });
  });

  it('reports download progress as a rounded percentage when the size is known', async () => {
    download.mockImplementation(async (_url, _dest, options) => {
      options.onProgress({ bytesWritten: 1, totalBytes: 3 });
      options.onProgress({ bytesWritten: 5, totalBytes: 0 });
      return { uri: 'file:///x' };
    });
    const onProgress = jest.fn();

    await downloadResource(RESOURCE, onProgress);

    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(33);
  });

  it('does not require a progress callback', async () => {
    download.mockImplementation(async (_url, _dest, options) => {
      options.onProgress({ bytesWritten: 1, totalBytes: 2 });
      return { uri: 'file:///x' };
    });
    await expect(downloadResource(RESOURCE)).resolves.toBe('file:///x');
  });
});

describe('openDownloadedFile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens the system share sheet with the mime type', async () => {
    sharing.isAvailableAsync.mockResolvedValue(true);
    await openDownloadedFile('file:///x.pdf', 'application/pdf');
    expect(sharing.shareAsync).toHaveBeenCalledWith('file:///x.pdf', {
      mimeType: 'application/pdf',
      dialogTitle: 'Open resource',
    });
  });

  it('throws a readable error when sharing is not supported', async () => {
    sharing.isAvailableAsync.mockResolvedValue(false);
    await expect(openDownloadedFile('file:///x.pdf', 'application/pdf')).rejects.toThrow(
      'not supported',
    );
    expect(sharing.shareAsync).not.toHaveBeenCalled();
  });
});
