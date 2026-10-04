/**
 * Nội dung "AI giả" cho MockProvider (khi chưa có GEMINI_API_KEY và trong test): hàm thuần, deterministic,
 * dựng từ dữ liệu khóa học thật nên app chạy đủ tính năng với đúng cấu trúc mà Gemini sẽ trả về.
 * Hỗ trợ cả `vi` và `en`.
 */
import type { AiLang } from '@/lib/ai/types';

import {
  COURSE_SUMMARY_MAX_SECTIONS,
  type CourseSummaryOutput,
  type LessonSummaryOutput,
  QUIZ_OPTION_COUNT,
  QUIZ_QUESTION_COUNT,
  type QuizOutput,
  type RecommendationsOutput,
} from './ai.schema';
import type {
  CourseMaterial,
  LearnerProfile,
  LessonFocus,
  RecommendationCandidate,
} from './ai.types';

/** Tiền tố đánh dấu câu trả lời chat đến từ chế độ demo. */
export const MOCK_CHAT_PREFIX = '[Demo AI]';

const pick = <T>(lang: AiLang, en: T, vi: T): T => (lang === 'vi' ? vi : en);

/** FNV-1a 32 bit: băm ổn định để chọn vị trí đáp án "ngẫu nhiên nhưng cố định". */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const LABEL_PREFIX =
  /^(?:overview|key ideas?|example|common mistake|try it yourself|takeaway)\s*:\s*/i;

/**
 * Tách ghi chú bài học thành các câu sạch (bỏ tiêu đề mục, gạch đầu dòng, nhãn "Example:"...).
 * Câu quá ngắn (< 20 ký tự) bị bỏ; câu quá dài bị cắt ở 200 ký tự.
 */
export function extractSentences(content: string | null | undefined, max = 12): string[] {
  if (!content) return [];
  const sentences: string[] = [];
  for (const rawLine of content.split('\n')) {
    const line = rawLine
      .replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '')
      .replace(LABEL_PREFIX, '')
      .trim();
    if (!line || line.endsWith(':')) continue;
    for (const part of line.split(/(?<=[.!?])\s+/)) {
      const sentence = part.trim();
      if (sentence.length < 20) continue;
      sentences.push(sentence.length > 200 ? `${sentence.slice(0, 197).trimEnd()}...` : sentence);
      if (sentences.length >= max) return sentences;
    }
  }
  return sentences;
}

function evenlySpaced<T>(items: readonly T[], count: number): T[] {
  if (items.length <= count) return [...items];
  const step = items.length / count;
  return Array.from({ length: count }, (_, i) => items[Math.floor(i * step)] as T);
}

// ---------------------------------------------------------------- Course summary

export function mockCourseSummary(course: CourseMaterial, lang: AiLang): CourseSummaryOutput {
  const lessons = course.sections.flatMap((s) => s.lessons);
  const first = lessons[0]?.title ?? course.title;
  const last = lessons[lessons.length - 1]?.title ?? course.title;
  const category = course.category.toLowerCase();

  const overview = pick(
    lang,
    `${course.title} is a hands-on ${category} course taught by ${course.teacher}. ` +
      `Across ${course.sections.length} sections and ${lessons.length} lessons it takes you from "${first}" to "${last}".`,
    `${course.title} là khóa học ${category} thực hành do ${course.teacher} giảng dạy. ` +
      `Qua ${course.sections.length} chương và ${lessons.length} bài học, bạn đi từ "${first}" đến "${last}".`,
  );

  const lessonObjectives = evenlySpaced(lessons, 4).map((l) =>
    pick(lang, `Learn: ${l.title}`, `Nắm vững: ${l.title}`),
  );
  const objectives = [...course.benefits.slice(0, 3), ...lessonObjectives].slice(0, 6);
  while (objectives.length < 3) {
    objectives.push(pick(lang, `Build confidence in ${category}`, `Tự tin hơn với ${category}`));
  }

  const sections =
    course.sections.length > 0
      ? course.sections.slice(0, COURSE_SUMMARY_MAX_SECTIONS).map((section) => {
          const titles = section.lessons.slice(0, 2).map((l) => `"${l.title}"`);
          return {
            title: section.title,
            summary: pick(
              lang,
              `${section.lessons.length} lessons including ${titles.join(' and ') || 'core topics'}.`,
              `${section.lessons.length} bài học, trong đó có ${titles.join(' và ') || 'các chủ đề cốt lõi'}.`,
            ),
          };
        })
      : [
          {
            title: pick(lang, 'Course overview', 'Tổng quan khóa học'),
            summary: pick(lang, 'Lessons will be added soon.', 'Bài học sẽ sớm được bổ sung.'),
          },
        ];

  const targetAudience = [
    pick(
      lang,
      `Beginners who want a practical start in ${category}`,
      `Người mới muốn bắt đầu thực tế với ${category}`,
    ),
    pick(
      lang,
      'Self-taught learners who want a clear, structured path',
      'Người tự học muốn có lộ trình rõ ràng',
    ),
    pick(lang, 'Professionals refreshing their skills', 'Người đi làm muốn ôn lại kỹ năng'),
  ];

  const outcomes = [
    ...lessons
      .slice(-2)
      .map((l) => pick(lang, `Be able to apply: ${l.title}`, `Có thể áp dụng: ${l.title}`)),
    pick(
      lang,
      `Apply ${category} techniques to a real project`,
      `Áp dụng kỹ thuật ${category} vào dự án thực tế`,
    ),
    pick(
      lang,
      'Talk about your work with the right vocabulary',
      'Trình bày công việc với thuật ngữ chuẩn',
    ),
    pick(lang, 'Know what to learn next', 'Biết mình nên học gì tiếp theo'),
  ].slice(0, 6);

  return { overview, objectives, sections, targetAudience, outcomes };
}

// ---------------------------------------------------------------- Lesson summary

export function mockLessonSummary(lesson: LessonFocus, lang: AiLang): LessonSummaryOutput {
  const sentences = extractSentences(lesson.content, 8);
  if (sentences.length === 0) {
    return {
      summary: pick(
        lang,
        `This lesson, "${lesson.title}", is part of "${lesson.sectionTitle}" in "${lesson.courseTitle}". Written notes are not available yet.`,
        `Bài học "${lesson.title}" thuộc chương "${lesson.sectionTitle}" của khóa "${lesson.courseTitle}". Hiện chưa có ghi chú chữ cho bài này.`,
      ),
      keyPoints: [
        pick(
          lang,
          `Watch the lesson "${lesson.title}" in full.`,
          `Xem trọn vẹn bài "${lesson.title}".`,
        ),
        pick(lang, 'Take your own notes while watching.', 'Tự ghi chú trong khi xem.'),
        pick(
          lang,
          'Practise the idea with a small example.',
          'Luyện tập ý chính bằng một ví dụ nhỏ.',
        ),
      ],
    };
  }
  const keyPoints = sentences.slice(2, 7);
  const fillers = [
    pick(
      lang,
      `Revisit "${lesson.title}" after trying an example.`,
      `Xem lại "${lesson.title}" sau khi thử một ví dụ.`,
    ),
    pick(
      lang,
      'Note one question to ask in the course Q&A.',
      'Ghi lại một câu hỏi để hỏi ở mục Q&A.',
    ),
    pick(lang, 'Connect the idea to your own project.', 'Gắn ý chính với dự án của bạn.'),
  ];
  for (const filler of fillers) {
    if (keyPoints.length >= 3) break;
    keyPoints.push(filler);
  }
  return { summary: sentences.slice(0, 2).join(' '), keyPoints };
}

// ---------------------------------------------------------------- Quiz

export type QuizPool = {
  /** Tiêu đề các bài khác trong khóa (làm đáp án nhiễu). */
  titles: string[];
  /** Câu trong ghi chú các bài khác trong khóa (làm đáp án nhiễu). */
  sentences: string[];
};

function distinctOptions(
  correct: string,
  candidates: readonly string[],
  filler: (n: number) => string,
): string[] {
  const seen = new Set<string>([correct]);
  const distractors: string[] = [];
  for (const candidate of candidates) {
    if (distractors.length >= QUIZ_OPTION_COUNT - 1) break;
    if (!seen.has(candidate)) {
      seen.add(candidate);
      distractors.push(candidate);
    }
  }
  for (let n = 1; distractors.length < QUIZ_OPTION_COUNT - 1; n += 1) {
    const extra = filler(n);
    if (!seen.has(extra)) {
      seen.add(extra);
      distractors.push(extra);
    }
  }
  return distractors;
}

/** Đặt đáp án đúng vào vị trí (ổn định theo `seed`) giữa các đáp án nhiễu. */
function placeCorrect(correct: string, distractors: string[], seed: string) {
  const correctIndex = hashString(seed) % QUIZ_OPTION_COUNT;
  const options = [...distractors];
  options.splice(correctIndex, 0, correct);
  return { options, correctIndex };
}

export function mockQuiz(lesson: LessonFocus, pool: QuizPool, lang: AiLang): QuizOutput {
  const ownSentences = extractSentences(lesson.content, QUIZ_QUESTION_COUNT);
  const fallbackFacts = [
    pick(
      lang,
      'Reviewing the lesson and practising with an example helps the idea stick.',
      'Xem lại bài và luyện tập với ví dụ giúp ghi nhớ ý chính.',
    ),
    pick(
      lang,
      'Applying the idea to a small project is a good way to learn it.',
      'Áp dụng ý chính vào một dự án nhỏ là cách học hiệu quả.',
    ),
    pick(
      lang,
      'Taking notes while watching helps you remember the key points.',
      'Ghi chú khi xem giúp bạn nhớ các ý chính.',
    ),
    pick(
      lang,
      'Asking questions in the course Q&A is encouraged.',
      'Bạn nên đặt câu hỏi ở mục Q&A của khóa học.',
    ),
  ];

  const questions: QuizOutput['questions'] = [];

  const titleFiller = (n: number) =>
    pick(
      lang,
      `A topic that is not part of this course (${n})`,
      `Một chủ đề không thuộc khóa học này (${n})`,
    );
  const topicDistractors = distinctOptions(lesson.title, pool.titles, titleFiller);
  const topic = placeCorrect(lesson.title, topicDistractors, `${lesson.id}:0`);
  questions.push({
    question: pick(
      lang,
      'What is the main topic of this lesson?',
      'Chủ đề chính của bài học này là gì?',
    ),
    ...topic,
    explanation: pick(
      lang,
      `The lesson is titled "${lesson.title}" and is part of "${lesson.sectionTitle}".`,
      `Bài học có tên "${lesson.title}" và thuộc chương "${lesson.sectionTitle}".`,
    ),
  });

  const sentenceFiller = (n: number) =>
    pick(
      lang,
      `This statement is not covered anywhere in the course (${n}).`,
      `Nhận định này không được đề cập trong khóa học (${n}).`,
    );
  for (let q = 1; q < QUIZ_QUESTION_COUNT; q += 1) {
    const correct = ownSentences[q - 1] ?? fallbackFacts[q - 1] ?? fallbackFacts[0] ?? '';
    const rotated =
      pool.sentences.length > 0 ? [...pool.sentences.slice(q), ...pool.sentences.slice(0, q)] : [];
    const distractors = distinctOptions(correct, rotated, sentenceFiller);
    questions.push({
      question: pick(
        lang,
        `Which statement matches the lesson "${lesson.title}"?`,
        `Nhận định nào đúng với bài học "${lesson.title}"?`,
      ),
      ...placeCorrect(correct, distractors, `${lesson.id}:${q}`),
      explanation: pick(lang, `The lesson says: "${correct}"`, `Bài học nêu: "${correct}"`),
    });
  }
  return { questions };
}

// ---------------------------------------------------------------- AI Tutor

const STOP_WORDS = new Set([
  'what',
  'when',
  'where',
  'which',
  'who',
  'whom',
  'whose',
  'why',
  'how',
  'does',
  'this',
  'that',
  'these',
  'those',
  'with',
  'from',
  'about',
  'there',
  'their',
  'have',
  'would',
  'could',
  'should',
  'explain',
  'tell',
  'please',
  'course',
  'lesson',
]);

function keywords(question: string): string[] {
  const words = question.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [];
  return [...new Set(words.filter((w) => !STOP_WORDS.has(w)))];
}

type NumberedLesson = { number: number; title: string; content: string | null };

function numberLessons(course: CourseMaterial): NumberedLesson[] {
  let number = 0;
  return course.sections.flatMap((section) =>
    section.lessons.map((lesson) => {
      number += 1;
      return { number, title: lesson.title, content: lesson.content };
    }),
  );
}

/** Mô phỏng "grounding": chọn bài khớp từ khóa nhất với câu hỏi và trả lời bằng nội dung bài đó. */
export function mockTutorReply(question: string, course: CourseMaterial, lang: AiLang): string {
  const words = keywords(question);
  let best: { lesson: NumberedLesson; score: number } | undefined;
  for (const lesson of numberLessons(course)) {
    const title = lesson.title.toLowerCase();
    const body = (lesson.content ?? '').toLowerCase();
    const score = words.reduce(
      (sum, w) => sum + (title.includes(w) ? 3 : 0) + (body.includes(w) ? 1 : 0),
      0,
    );
    if (score > 0 && (!best || score > best.score)) best = { lesson, score };
  }

  if (best) {
    const excerpt = extractSentences(best.lesson.content, 3).join(' ');
    return pick(
      lang,
      `${MOCK_CHAT_PREFIX} This is covered in Lesson ${best.lesson.number}: "${best.lesson.title}". ${excerpt} Open that lesson to see it explained in detail.`,
      `${MOCK_CHAT_PREFIX} Nội dung này nằm ở Bài ${best.lesson.number}: "${best.lesson.title}". ${excerpt} Hãy mở bài học đó để xem giải thích chi tiết.`,
    ).replace(/\s+/g, ' ');
  }
  const topics = course.sections.map((s) => s.title).join(', ');
  return pick(
    lang,
    `${MOCK_CHAT_PREFIX} I could not find that in the materials of "${course.title}". This course covers: ${topics}. Try asking about one of these topics.`,
    `${MOCK_CHAT_PREFIX} Mình không tìm thấy nội dung đó trong khóa "${course.title}". Khóa học gồm các chương: ${topics}. Bạn hãy thử hỏi về một trong các chủ đề này nhé.`,
  );
}

// ---------------------------------------------------------------- Recommendations

export function mockRecommendations(
  candidates: readonly RecommendationCandidate[],
  profile: LearnerProfile,
  lang: AiLang,
  maxItems: number,
): RecommendationsOutput {
  const interests = new Set([...profile.enrolled, ...profile.saved].map((p) => p.category));
  const items = candidates.slice(0, Math.min(4, maxItems)).map((c) => ({
    courseId: c.id,
    reason: interests.has(c.category)
      ? pick(
          lang,
          `Builds on your interest in ${c.category}; rated ${c.ratingAvg.toFixed(1)}/5 by ${c.ratingCount} learners.`,
          `Nối tiếp mối quan tâm của bạn với ${c.category}; được ${c.ratingCount} học viên đánh giá ${c.ratingAvg.toFixed(1)}/5.`,
        )
      : pick(
          lang,
          `A popular pick in ${c.category}, rated ${c.ratingAvg.toFixed(1)}/5, to broaden your skills.`,
          `Khóa ${c.category} được ưa chuộng (${c.ratingAvg.toFixed(1)}/5) để mở rộng kỹ năng của bạn.`,
        ),
  }));
  return {
    encouragement: pick(
      lang,
      'Small steps every day add up - your next course is just one lesson away!',
      'Mỗi ngày tiến một bước nhỏ sẽ tạo nên khác biệt - khóa học tiếp theo của bạn chỉ cách một bài học!',
    ),
    items,
  };
}

/** Lý do dự phòng khi AI trả thiếu khóa và server phải bổ sung từ thứ hạng BR-12. */
export function fallbackReason(candidate: RecommendationCandidate, lang: AiLang): string {
  return pick(
    lang,
    `A highly rated ${candidate.category} course to keep you learning.`,
    `Khóa ${candidate.category} được đánh giá cao để bạn tiếp tục học.`,
  );
}

export const FALLBACK_ENCOURAGEMENT: Record<AiLang, string> = {
  en: 'Keep going - every lesson you finish moves you closer to your goal!',
  vi: 'Cố lên - mỗi bài học hoàn thành đưa bạn đến gần mục tiêu hơn!',
};
