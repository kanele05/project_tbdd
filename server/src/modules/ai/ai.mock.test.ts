import {
  extractSentences,
  FALLBACK_ENCOURAGEMENT,
  fallbackReason,
  hashString,
  MOCK_CHAT_PREFIX,
  mockCourseSummary,
  mockLessonSummary,
  mockQuiz,
  mockRecommendations,
  mockTutorReply,
} from './ai.mock';
import {
  COURSE_SUMMARY_MAX_SECTIONS,
  courseSummaryOutput,
  lessonSummaryOutput,
  QUIZ_OPTION_COUNT,
  QUIZ_QUESTION_COUNT,
  quizOutput,
  recommendationsOutput,
} from './ai.schema';
import type {
  CourseMaterial,
  LearnerProfile,
  LessonFocus,
  RecommendationCandidate,
} from './ai.types';

const NOTES = [
  'Overview:',
  'Wireframes show the structure of a screen before any visual design is added.',
  'Key ideas:',
  '- Start with the user goal and the main task the screen must support.',
  '1. Keep the layout simple so people can scan it quickly.',
  'Example: A checkout wireframe puts the total and the pay button in the same place on every step.',
  'Short.',
  'Common mistake: Adding colour and decoration before the structure has been tested with real users.',
  'Try it yourself: Sketch three versions of one screen and pick the clearest one for your project.',
  'Takeaway: Test the structure early, because it is cheap to change on paper.',
].join('\n');

function makeCourse(overrides: Partial<CourseMaterial> = {}): CourseMaterial {
  return {
    id: 'course-1',
    title: 'UX Foundations',
    subtitle: 'Learn the basics',
    description: 'A practical introduction to user experience design.',
    category: 'Design',
    teacher: 'Ada Lovelace',
    benefits: ['Understand users', 'Plan a research study'],
    sections: [
      {
        title: 'Getting started',
        lessons: [
          { id: 'l1', title: 'What is user experience?', durationSec: 60, content: NOTES },
          { id: 'l2', title: 'The design process', durationSec: 60, content: null },
        ],
      },
      {
        title: 'Wireframes',
        lessons: [
          { id: 'l3', title: 'Wireframing key flows', durationSec: 60, content: NOTES },
          { id: 'l4', title: 'Prototyping', durationSec: 60, content: null },
          { id: 'l5', title: 'Usability testing', durationSec: 60, content: null },
        ],
      },
    ],
    ...overrides,
  };
}

function makeLesson(overrides: Partial<LessonFocus> = {}): LessonFocus {
  return {
    id: 'l3',
    title: 'Wireframing key flows',
    content: NOTES,
    sectionTitle: 'Wireframes',
    courseTitle: 'UX Foundations',
    ...overrides,
  };
}

function candidate(id: string, category = 'Design'): RecommendationCandidate {
  return {
    id,
    title: `Course ${id}`,
    subtitle: null,
    category,
    teacher: 'Teacher',
    ratingAvg: 4.5,
    ratingCount: 120,
    lessonCount: 10,
    priceCents: 4900,
    tags: [],
  };
}

describe('hashString', () => {
  it('is deterministic and spreads different inputs', () => {
    expect(hashString('lesson-1:0')).toBe(hashString('lesson-1:0'));
    expect(hashString('lesson-1:0')).not.toBe(hashString('lesson-1:1'));
    expect(hashString('')).toBeGreaterThanOrEqual(0);
  });
});

describe('extractSentences', () => {
  it('returns [] for empty content', () => {
    expect(extractSentences(null)).toEqual([]);
    expect(extractSentences(undefined)).toEqual([]);
    expect(extractSentences('')).toEqual([]);
  });

  it('strips headings, bullets and labels and skips short lines', () => {
    const sentences = extractSentences(NOTES);
    expect(sentences[0]).toBe(
      'Wireframes show the structure of a screen before any visual design is added.',
    );
    expect(sentences).toContain(
      'Start with the user goal and the main task the screen must support.',
    );
    expect(sentences).toContain('Keep the layout simple so people can scan it quickly.');
    expect(sentences.some((s) => s.startsWith('Example:'))).toBe(false);
    expect(sentences).not.toContain('Short.');
    expect(sentences).not.toContain('Key ideas:');
  });

  it('splits a line into sentences and respects the max', () => {
    const line = 'The first sentence is long enough. The second sentence is long enough too.';
    expect(extractSentences(line)).toHaveLength(2);
    expect(extractSentences(line, 1)).toEqual(['The first sentence is long enough.']);
  });

  it('truncates a very long sentence to 200 characters', () => {
    const [sentence] = extractSentences(`${'word '.repeat(80)}end.`);
    expect(sentence).toBeDefined();
    expect(sentence?.length).toBe(200);
    expect(sentence?.endsWith('...')).toBe(true);
  });
});

describe('mockCourseSummary', () => {
  it.each(['en', 'vi'] as const)('matches the output schema (%s)', (lang) => {
    const summary = mockCourseSummary(makeCourse(), lang);
    expect(courseSummaryOutput.safeParse(summary).success).toBe(true);
    expect(summary.sections.map((s) => s.title)).toEqual(['Getting started', 'Wireframes']);
    expect(summary.overview).toContain('UX Foundations');
    expect(summary.objectives.slice(0, 2)).toEqual(['Understand users', 'Plan a research study']);
  });

  it('writes Vietnamese text for lang=vi', () => {
    const summary = mockCourseSummary(makeCourse(), 'vi');
    expect(summary.overview).toContain('khóa học');
    expect(summary.sections[0]?.summary).toContain('bài học');
  });

  it('still returns a valid summary for a course without sections or benefits', () => {
    const course = makeCourse({ sections: [], benefits: [] });
    for (const lang of ['en', 'vi'] as const) {
      const summary = mockCourseSummary(course, lang);
      expect(courseSummaryOutput.safeParse(summary).success).toBe(true);
      expect(summary.sections).toHaveLength(1);
      expect(summary.overview).toContain('UX Foundations');
    }
  });

  it('handles sections without lessons', () => {
    const course = makeCourse({ sections: [{ title: 'Empty', lessons: [] }] });
    const summary = mockCourseSummary(course, 'en');
    expect(courseSummaryOutput.safeParse(summary).success).toBe(true);
    expect(summary.sections[0]?.summary).toContain('core topics');
    expect(mockCourseSummary(course, 'vi').sections[0]?.summary).toContain('chủ đề cốt lõi');
  });

  it('caps the number of summarised sections', () => {
    const sections = Array.from({ length: COURSE_SUMMARY_MAX_SECTIONS + 5 }, (_, i) => ({
      title: `Section ${i + 1}`,
      lessons: [{ id: `l${i}`, title: `Lesson ${i}`, durationSec: 10, content: null }],
    }));
    const summary = mockCourseSummary(makeCourse({ sections }), 'en');
    expect(summary.sections).toHaveLength(COURSE_SUMMARY_MAX_SECTIONS);
    expect(courseSummaryOutput.safeParse(summary).success).toBe(true);
  });
});

describe('mockLessonSummary', () => {
  it.each(['en', 'vi'] as const)('summarises the written notes (%s)', (lang) => {
    const summary = mockLessonSummary(makeLesson(), lang);
    expect(lessonSummaryOutput.safeParse(summary).success).toBe(true);
    expect(summary.summary).toContain('Wireframes show the structure');
    expect(summary.keyPoints.length).toBeGreaterThanOrEqual(3);
  });

  it.each(['en', 'vi'] as const)('falls back to generic text without notes (%s)', (lang) => {
    const summary = mockLessonSummary(makeLesson({ content: null }), lang);
    expect(lessonSummaryOutput.safeParse(summary).success).toBe(true);
    expect(summary.summary).toContain('Wireframing key flows');
    expect(summary.keyPoints).toHaveLength(3);
  });

  it('pads key points with study tips when the notes are very short', () => {
    const content = 'This lesson has exactly one useful sentence in it.';
    for (const lang of ['en', 'vi'] as const) {
      const summary = mockLessonSummary(makeLesson({ content }), lang);
      expect(lessonSummaryOutput.safeParse(summary).success).toBe(true);
      expect(summary.keyPoints).toHaveLength(3);
    }
  });
});

describe('mockQuiz', () => {
  const pool = {
    titles: ['What is user experience?', 'Prototyping', 'Usability testing', 'Research methods'],
    sentences: [
      'Interviews help you learn what people really need.',
      'Personas summarise the goals of a group of users.',
      'A journey map shows the steps a user takes over time.',
      'Card sorting reveals how people group information.',
      'Usability tests show where people get stuck.',
    ],
  };

  it.each(['en', 'vi'] as const)('builds a valid quiz (%s)', (lang) => {
    const quiz = mockQuiz(makeLesson(), pool, lang);
    expect(quizOutput.safeParse(quiz).success).toBe(true);
    expect(quiz.questions).toHaveLength(QUIZ_QUESTION_COUNT);
    for (const question of quiz.questions) {
      expect(question.options).toHaveLength(QUIZ_OPTION_COUNT);
      expect(new Set(question.options).size).toBe(QUIZ_OPTION_COUNT);
    }
  });

  it('puts the lesson title as the correct answer of the topic question', () => {
    const quiz = mockQuiz(makeLesson(), pool, 'en');
    const first = quiz.questions[0];
    expect(first?.options[first.correctIndex]).toBe('Wireframing key flows');
  });

  it('is deterministic', () => {
    expect(mockQuiz(makeLesson(), pool, 'en')).toEqual(mockQuiz(makeLesson(), pool, 'en'));
  });

  it('still works with an empty pool and a lesson without notes', () => {
    const quiz = mockQuiz(makeLesson({ content: null }), { titles: [], sentences: [] }, 'vi');
    expect(quizOutput.safeParse(quiz).success).toBe(true);
    for (const question of quiz.questions) {
      expect(question.options[question.correctIndex]).toBeTruthy();
    }
  });

  it('skips pool entries equal to the correct answer', () => {
    const own = 'Wireframes show the structure of a screen before any visual design is added.';
    const quiz = mockQuiz(
      makeLesson(),
      { titles: ['Wireframing key flows'], sentences: [own] },
      'en',
    );
    expect(quizOutput.safeParse(quiz).success).toBe(true);
  });
});

describe('mockTutorReply', () => {
  it('points to the lesson that best matches the question', () => {
    const reply = mockTutorReply('How do I start wireframing?', makeCourse(), 'en');
    expect(reply.startsWith(MOCK_CHAT_PREFIX)).toBe(true);
    expect(reply).toContain('Lesson 3');
    expect(reply).toContain('Wireframing key flows');
    expect(reply).not.toMatch(/\s{2,}/);
  });

  it('answers in Vietnamese when asked to', () => {
    const reply = mockTutorReply('wireframing là gì?', makeCourse(), 'vi');
    expect(reply).toContain('Bài 3');
  });

  it('lists the course topics when nothing matches', () => {
    const en = mockTutorReply('What is the weather today?', makeCourse(), 'en');
    expect(en).toContain('I could not find that');
    expect(en).toContain('Getting started, Wireframes');
    const vi = mockTutorReply('Thời tiết hôm nay?', makeCourse(), 'vi');
    expect(vi).toContain('Mình không tìm thấy');
  });

  it('ignores stop words and keeps the first best match on ties', () => {
    const reply = mockTutorReply('explain this course please', makeCourse(), 'en');
    expect(reply).toContain('I could not find that');
  });
});

describe('mockRecommendations', () => {
  const profile: LearnerProfile = {
    enrolled: [{ title: 'UX Foundations', category: 'Design', progressPercent: 30 }],
    saved: [{ title: 'Intro to Python', category: 'Code' }],
  };

  it.each(['en', 'vi'] as const)('returns valid recommendations (%s)', (lang) => {
    const candidates = [candidate('a'), candidate('b', 'Business'), candidate('c', 'Code')];
    const result = mockRecommendations(candidates, profile, lang, 5);
    expect(recommendationsOutput.safeParse(result).success).toBe(true);
    expect(result.items.map((i) => i.courseId)).toEqual(['a', 'b', 'c']);
    expect(result.items[0]?.reason).toBe(
      lang === 'en'
        ? 'Builds on your interest in Design; rated 4.5/5 by 120 learners.'
        : 'Nối tiếp mối quan tâm của bạn với Design; được 120 học viên đánh giá 4.5/5.',
    );
    expect(result.items[1]?.reason).toContain('Business');
  });

  it('limits the list to maxItems and four items', () => {
    const candidates = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => candidate(id));
    expect(mockRecommendations(candidates, profile, 'en', 2).items).toHaveLength(2);
    expect(mockRecommendations(candidates, profile, 'en', 5).items).toHaveLength(4);
  });
});

describe('fallbackReason / FALLBACK_ENCOURAGEMENT', () => {
  it('has text for both languages', () => {
    expect(fallbackReason(candidate('a'), 'en')).toContain('Design');
    expect(fallbackReason(candidate('a'), 'vi')).toContain('Design');
    expect(FALLBACK_ENCOURAGEMENT.en).toBeTruthy();
    expect(FALLBACK_ENCOURAGEMENT.vi).toBeTruthy();
  });
});
