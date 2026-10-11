import { i18n } from '@/i18n';

import { describeMissing, getMissingFromError, getMissingStep } from './missingItems';

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

describe('getMissingStep', () => {
  it('sends every requirement to the wizard step that fixes it', () => {
    expect(getMissingStep('TITLE_LENGTH')).toBe('idea');
    expect(getMissingStep('NO_CATEGORY')).toBe('idea');
    expect(getMissingStep('NO_THUMBNAIL')).toBe('intro');
    expect(getMissingStep('DESCRIPTION_TOO_SHORT')).toBe('intro');
    expect(getMissingStep('PRICE_INVALID')).toBe('price');
    expect(getMissingStep('ORIGINAL_PRICE_INVALID')).toBe('price');
    expect(getMissingStep('NOT_ENOUGH_LESSONS')).toBe('lessons');
    expect(getMissingStep('PREVIEW_COUNT')).toBe('lessons');
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
