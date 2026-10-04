import { MAX_UPLOAD_BYTES } from '@/constants/config';

import {
  getCoverUnsupportedMessage,
  getFileTooLargeMessage,
  getFileUnsupportedMessage,
  formatFileSize,
  getFileExtension,
  getFileKind,
  getUploadMimeType,
  sanitizeFileName,
  validateCoverImage,
  validateSubmissionFile,
} from './fileUtils';

describe('getFileExtension', () => {
  it('returns the lower-case extension', () => {
    expect(getFileExtension('Report.PDF')).toBe('pdf');
    expect(getFileExtension('archive.tar.zip')).toBe('zip');
  });

  it('returns an empty string when there is no extension', () => {
    expect(getFileExtension('README')).toBe('');
    expect(getFileExtension('.hidden')).toBe('');
    expect(getFileExtension('trailing.')).toBe('');
  });
});

describe('formatFileSize', () => {
  it.each([
    [512, '512 B'],
    [626688, '612 KB'],
    [35 * 1024 * 1024, '35 MB'],
    [1.5 * 1024 * 1024, '1.5 MB'],
    [0, '0 B'],
  ])('formats %d bytes as %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});

describe('validateSubmissionFile', () => {
  it.each(['a.png', 'a.JPG', 'a.jpeg', 'a.pdf', 'a.zip'])('accepts %s', (name) => {
    expect(validateSubmissionFile({ name, size: 1000 })).toBeNull();
  });

  it('rejects unsupported types', () => {
    expect(validateSubmissionFile({ name: 'virus.exe', size: 1000 })).toBe(
      getFileUnsupportedMessage(),
    );
    expect(validateSubmissionFile({ name: 'noextension', size: 1000 })).toBe(
      getFileUnsupportedMessage(),
    );
  });

  it('rejects files larger than 10 MB but accepts exactly 10 MB', () => {
    expect(validateSubmissionFile({ name: 'a.zip', size: MAX_UPLOAD_BYTES })).toBeNull();
    expect(validateSubmissionFile({ name: 'a.zip', size: MAX_UPLOAD_BYTES + 1 })).toBe(
      getFileTooLargeMessage(),
    );
  });

  it('lets the server decide when the size is unknown', () => {
    expect(validateSubmissionFile({ name: 'a.zip' })).toBeNull();
    expect(validateSubmissionFile({ name: 'a.zip', size: null })).toBeNull();
  });
});

describe('validateCoverImage', () => {
  it('accepts png / jpg and rejects other formats', () => {
    expect(validateCoverImage({ name: 'cover.png', size: 10 })).toBeNull();
    expect(validateCoverImage({ name: 'cover.jpeg', size: 10 })).toBeNull();
    expect(validateCoverImage({ name: 'cover.heic', size: 10 })).toBe(getCoverUnsupportedMessage());
    expect(validateCoverImage({ name: 'cover.pdf', size: 10 })).toBe(getCoverUnsupportedMessage());
  });

  it('rejects an oversized image', () => {
    expect(validateCoverImage({ name: 'cover.png', size: MAX_UPLOAD_BYTES + 1 })).toBe(
      getFileTooLargeMessage(),
    );
  });
});

describe('getUploadMimeType', () => {
  it('derives the MIME type from the extension, ignoring odd picker values', () => {
    expect(getUploadMimeType('a.zip', 'application/x-zip-compressed')).toBe('application/zip');
    expect(getUploadMimeType('a.jpg', 'application/octet-stream')).toBe('image/jpeg');
    expect(getUploadMimeType('a.pdf')).toBe('application/pdf');
  });

  it('falls back to the picker value, then to octet-stream', () => {
    expect(getUploadMimeType('a.bin', 'application/x-custom')).toBe('application/x-custom');
    expect(getUploadMimeType('a.bin')).toBe('application/octet-stream');
  });
});

describe('getFileKind', () => {
  it('labels common resource types', () => {
    expect(getFileKind('Document 1.txt')).toEqual({ label: '.txt', tone: 'danger' });
    expect(getFileKind('Document 2.pdf')).toEqual({ label: '.pdf', tone: 'primary' });
    expect(getFileKind('code.zip').label).toBe('.zip');
    expect(getFileKind('mystery').label).toBe('');
  });
});

describe('sanitizeFileName', () => {
  it('replaces characters that are unsafe in a path', () => {
    expect(sanitizeFileName('Document 1.txt')).toBe('Document 1.txt');
    expect(sanitizeFileName('a/b\\c:d?.pdf')).toBe('a_b_c_d_.pdf');
    expect(sanitizeFileName('   ')).toBe('download');
  });
});
