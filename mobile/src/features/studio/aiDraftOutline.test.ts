import {
  cleanOutline,
  removeLesson,
  removeSection,
  setLessonTitle,
  setSectionTitle,
  type AiOutline,
} from './aiDraftOutline';

const OUTLINE: AiOutline = [
  { title: 'Intro', lessons: [{ title: 'Welcome', summary: 'Hi' }] },
  {
    title: 'Core',
    lessons: [
      { title: 'A', summary: 'a' },
      { title: 'B', summary: 'b' },
    ],
  },
];

describe('aiDraftOutline', () => {
  it('renames a section and a lesson without touching the others', () => {
    const renamed = setLessonTitle(setSectionTitle(OUTLINE, 1, 'Core ideas'), 1, 0, 'First');
    expect(renamed[1]?.title).toBe('Core ideas');
    expect(renamed[1]?.lessons[0]).toEqual({ title: 'First', summary: 'a' });
    expect(renamed[0]).toEqual(OUTLINE[0]);
  });

  it('removes a section or a lesson', () => {
    expect(removeSection(OUTLINE, 0)).toHaveLength(1);
    expect(removeLesson(OUTLINE, 1, 0)[1]?.lessons.map((lesson) => lesson.title)).toEqual(['B']);
  });

  it('drops sections and lessons whose title was emptied', () => {
    const edited = setLessonTitle(setSectionTitle(OUTLINE, 0, '   '), 1, 1, '');
    expect(cleanOutline(edited)).toEqual([
      { title: 'Core', lessons: [{ title: 'A', summary: 'a' }] },
    ]);
  });
});
