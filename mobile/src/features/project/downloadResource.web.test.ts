import type { ResourceDto } from '@/types/api';

import { downloadResource, openDownloadedFile } from './downloadResource.web';

const RESOURCE: ResourceDto = {
  id: 'r1',
  name: 'Document 1.txt',
  fileUrl: 'http://localhost:4000/static/resources/Document%201.txt',
  sizeBytes: 100,
  mimeType: 'text/plain',
};

type FakeAnchor = {
  href: string;
  rel: string;
  target: string;
  download: string;
  style: { display: string };
  click: jest.Mock;
};

const globals = globalThis as unknown as Record<string, unknown>;
const original = {
  document: globals.document,
  fetch: globals.fetch,
  createObjectURL: URL.createObjectURL,
  revokeObjectURL: URL.revokeObjectURL,
};

let anchors: FakeAnchor[];
let fetchMock: jest.Mock;

beforeEach(() => {
  anchors = [];
  globals.document = {
    createElement: jest.fn(() => {
      const anchor: FakeAnchor = {
        href: '',
        rel: '',
        target: '',
        download: '',
        style: { display: '' },
        click: jest.fn(),
      };
      anchors.push(anchor);
      return anchor;
    }),
    body: { appendChild: jest.fn(), removeChild: jest.fn() },
  };
  fetchMock = jest.fn();
  globals.fetch = fetchMock;
  URL.createObjectURL = jest.fn(() => 'blob:local-1');
  URL.revokeObjectURL = jest.fn();
});

afterEach(() => {
  globals.document = original.document;
  globals.fetch = original.fetch;
  URL.createObjectURL = original.createObjectURL;
  URL.revokeObjectURL = original.revokeObjectURL;
});

describe('downloadResource (web)', () => {
  it('fetches the file and saves it through a download anchor with a safe name', async () => {
    fetchMock.mockResolvedValue({ ok: true, blob: async () => ({ size: 3 }) });
    const onProgress = jest.fn();

    await expect(downloadResource(RESOURCE, onProgress)).resolves.toBe('blob:local-1');

    expect(fetchMock).toHaveBeenCalledWith(RESOURCE.fileUrl);
    expect(anchors).toHaveLength(1);
    expect(anchors[0]).toMatchObject({ href: 'blob:local-1', download: 'Document 1.txt' });
    expect(anchors[0]?.target).toBe('');
    expect(anchors[0]?.click).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(100);
  });

  it('falls back to opening the url in a new tab when the fetch is blocked', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(downloadResource(RESOURCE)).resolves.toBe(RESOURCE.fileUrl);

    expect(anchors[0]).toMatchObject({ href: RESOURCE.fileUrl, target: '_blank', rel: 'noopener' });
    expect(anchors[0]?.download).toBe('');
    expect(anchors[0]?.click).toHaveBeenCalledTimes(1);
  });

  it('falls back to a new tab when the server answers with an error status', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    await expect(downloadResource(RESOURCE)).resolves.toBe(RESOURCE.fileUrl);

    expect(anchors[0]?.target).toBe('_blank');
  });
});

describe('openDownloadedFile (web)', () => {
  it('does nothing because the browser already saved the file', async () => {
    await expect(openDownloadedFile('blob:local-1', 'text/plain')).resolves.toBeUndefined();
    expect(anchors).toHaveLength(0);
  });
});
