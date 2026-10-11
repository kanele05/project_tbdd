import { i18n } from '@/i18n';

import { describeMissing, getMissingFromError, getMissingTarget } from './missingItems';

describe('describeMissing', () => {
  it('writes a readable sentence, in the current language, with the lesson number', async () => {
    expect(describeMissing({ code: 'NO_THUMBNAIL' })).toBe('Upload a cover image.');
    expect(describeMissing({ code: 'LESSON_VIDEO_INVALID', lessonNumber: 3 })).toBe(
      'Lesson 3 needs a valid YouTube link.',
    );
    await i18n.changeLanguage('vi');
    expect(describeMissing({ code: 'NO_THUMBNAIL' })).toBe('Hãy tải lên ảnh bìa.');
  });
});

describe('getMissingTarget', () => {
  it('sends curriculum problems to the curriculum and the rest to the info form', () => {
    expect(getMissingTarget('NOT_ENOUGH_LESSONS')).toBe('curriculum');
    expect(getMissingTarget('PREVIEW_COUNT')).toBe('curriculum');
    expect(getMissingTarget('TITLE_LENGTH')).toBe('edit');
    expect(getMissingTarget('PRICE_INVALID')).toBe('edit');
  });
});

describe('getMissingFromError', () => {
  it('reads details.missing and tolerates anything else', () => {
    expect(getMissingFromError({ missing: [{ code: 'NO_SECTION' }, { nope: 1 }] })).toEqual([
      { code: 'NO_SECTION' },
    ]);
    expect(getMissingFromError(undefined)).toEqual([]);
    expect(getMissingFromError({ missing: 'x' })).toEqual([]);
  });
});
