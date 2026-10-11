import {
  EMPTY_LESSON_FORM,
  formValuesToLesson,
  lessonFormSchema,
  lessonToFormValues,
} from './lessonForm';

const VALID = {
  ...EMPTY_LESSON_FORM,
  title: 'Intro',
  videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
  duration: '12:34',
};

describe('lessonFormSchema', () => {
  it('accepts a title, a YouTube link and mm:ss', () => {
    expect(lessonFormSchema.safeParse(VALID).success).toBe(true);
  });

  it('rejects an empty title, a non-YouTube link and a bad length', () => {
    const result = lessonFormSchema.safeParse({
      ...VALID,
      title: '  ',
      videoUrl: 'https://vimeo.com/1',
      duration: '99',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0])).toEqual(
      expect.arrayContaining(['title', 'videoUrl', 'duration']),
    );
  });
});

describe('lesson value mapping', () => {
  it('saves the normalized link and the length in seconds', () => {
    expect(formValuesToLesson(VALID)).toEqual({
      title: 'Intro',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      durationSec: 754,
      isPreview: false,
      content: '',
    });
  });

  it('shows the length as mm:ss when editing', () => {
    expect(
      lessonToFormValues({
        title: 'a',
        videoUrl: 'u',
        durationSec: 3725,
        isPreview: true,
        content: 'n',
      }).duration,
    ).toBe('1:02:05');
  });
});
