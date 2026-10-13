import { Platform } from 'react-native';

import { appendFilePart, type FilePart } from './formData';

const FILE: FilePart = { uri: 'blob:http://localhost/abc', name: 'cover.png', type: 'image/png' };

type Appended = { field: string; value: unknown; fileName?: string };

function recordingForm(appended: Appended[]): FormData {
  return {
    append: (field: string, value: unknown, fileName?: string) => {
      appended.push({ field, value, fileName });
    },
  } as unknown as FormData;
}

describe('appendFilePart', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('passes the { uri, name, type } object to React Native FormData on native', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const appended: Appended[] = [];
    await appendFilePart(recordingForm(appended), 'file', FILE);
    expect(appended).toEqual([{ field: 'file', value: FILE, fileName: undefined }]);
  });

  it('reads the picked URI into a Blob with its name on the web', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const blob = new Blob(['png-bytes'], { type: '' });
    const fetchMock = jest.fn().mockResolvedValue({ blob: () => Promise.resolve(blob) });
    global.fetch = fetchMock as unknown as typeof fetch;
    const appended: Appended[] = [];

    await appendFilePart(recordingForm(appended), 'file', FILE);

    expect(fetchMock).toHaveBeenCalledWith(FILE.uri);
    const [part] = appended;
    expect(part?.field).toBe('file');
    expect(part?.fileName).toBe('cover.png');
    expect(part?.value).toBeInstanceOf(Blob);
    expect((part?.value as Blob).type).toBe('image/png');
  });
});
