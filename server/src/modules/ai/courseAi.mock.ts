/**
 * Nội dung "AI giả" cho AI soạn khóa và AI kiểm duyệt (MockProvider: chưa có GEMINI_API_KEY và trong test).
 * Hàm thuần, deterministic, song ngữ vi/en; cùng cấu trúc với output của Gemini nên mobile và demo chạy đủ tính năng.
 * Bản kiểm duyệt giả là một bộ quy tắc đơn giản đọc nội dung thật (không phải đoán ngẫu nhiên).
 */
import type { AiLang } from '@/lib/ai/types';
import { COURSE_LIMITS } from '@/lib/courseChecklist';

import type { CourseDraftModelOutput, CourseReviewModelOutput } from './courseAi.schema';
import type { ReviewMaterial } from './courseAi.types';

const pick = <T>(lang: AiLang, en: T, vi: T): T => (lang === 'vi' ? vi : en);

type Level = 'beginner' | 'intermediate' | 'advanced';

// ---------------------------------------------------------------- Course draft

type SectionPlan = { title: string; lessons: { title: string; summary: string }[] };

function beginnerPlan(topic: string, lang: AiLang): SectionPlan[] {
  return [
    {
      title: pick(lang, `Getting started with ${topic}`, `Bắt đầu với ${topic}`),
      lessons: [
        {
          title: pick(
            lang,
            `What is ${topic} and why learn it`,
            `${topic} là gì và vì sao nên học`,
          ),
          summary: pick(
            lang,
            `A friendly overview of ${topic}, where it is used and what you will build in this course.`,
            `Tổng quan dễ hiểu về ${topic}, nơi được ứng dụng và những gì bạn sẽ làm trong khóa học.`,
          ),
        },
        {
          title: pick(lang, 'Setting up your workspace', 'Chuẩn bị môi trường học'),
          summary: pick(
            lang,
            'Install the tools you need and check that everything works before moving on.',
            'Cài đặt công cụ cần thiết và kiểm tra mọi thứ hoạt động trước khi học tiếp.',
          ),
        },
        {
          title: pick(lang, 'Key terms in plain language', 'Các thuật ngữ cốt lõi'),
          summary: pick(
            lang,
            'The vocabulary used throughout the course, explained with simple examples.',
            'Những thuật ngữ sẽ dùng xuyên suốt khóa học, giải thích bằng ví dụ đơn giản.',
          ),
        },
      ],
    },
    {
      title: pick(lang, 'Core concepts', 'Khái niệm nền tảng'),
      lessons: [
        {
          title: pick(lang, 'The building blocks', 'Các thành phần cơ bản'),
          summary: pick(
            lang,
            'Learn the small pieces that everything else is built from.',
            'Tìm hiểu những mảnh ghép nhỏ mà mọi thứ khác được xây dựng từ đó.',
          ),
        },
        {
          title: pick(lang, 'How the pieces fit together', 'Cách các thành phần kết hợp'),
          summary: pick(
            lang,
            'Combine the building blocks in a first small example.',
            'Kết hợp các thành phần cơ bản trong một ví dụ nhỏ đầu tiên.',
          ),
        },
        {
          title: pick(lang, 'Common beginner mistakes', 'Những lỗi người mới hay gặp'),
          summary: pick(
            lang,
            'Spot and fix the mistakes that most beginners make.',
            'Nhận ra và sửa các lỗi mà hầu hết người mới đều mắc.',
          ),
        },
      ],
    },
    {
      title: pick(lang, 'Hands-on practice', 'Thực hành từng bước'),
      lessons: [
        {
          title: pick(lang, 'Your first guided exercise', 'Bài tập có hướng dẫn đầu tiên'),
          summary: pick(
            lang,
            'Follow along step by step to complete a small task.',
            'Làm theo từng bước để hoàn thành một tác vụ nhỏ.',
          ),
        },
        {
          title: pick(lang, 'Practise on your own', 'Tự luyện tập'),
          summary: pick(
            lang,
            'A short challenge with a worked solution to compare against.',
            'Một thử thách ngắn kèm lời giải mẫu để đối chiếu.',
          ),
        },
      ],
    },
    {
      title: pick(lang, 'Final project and next steps', 'Dự án cuối khóa và bước tiếp theo'),
      lessons: [
        {
          title: pick(lang, 'Plan your mini project', 'Lên kế hoạch cho dự án nhỏ'),
          summary: pick(
            lang,
            `Choose a small ${topic} project and break it into steps.`,
            `Chọn một dự án ${topic} nhỏ và chia thành các bước thực hiện.`,
          ),
        },
        {
          title: pick(lang, 'Where to go from here', 'Học gì tiếp theo'),
          summary: pick(
            lang,
            'Recap what you learned and suggest the next topics to explore.',
            'Ôn lại kiến thức đã học và gợi ý các chủ đề nên học tiếp.',
          ),
        },
      ],
    },
  ];
}

function intermediatePlan(topic: string, lang: AiLang): SectionPlan[] {
  return [
    {
      title: pick(lang, 'Quick recap and setup', 'Ôn nhanh và chuẩn bị'),
      lessons: [
        {
          title: pick(
            lang,
            `${topic} fundamentals in 15 minutes`,
            `Nền tảng ${topic} trong 15 phút`,
          ),
          summary: pick(
            lang,
            'A fast refresher so everyone starts from the same point.',
            'Phần ôn nhanh để mọi người bắt đầu từ cùng một điểm.',
          ),
        },
        {
          title: pick(lang, 'A project structure that scales', 'Cấu trúc dự án dễ mở rộng'),
          summary: pick(
            lang,
            'Organise your work so it stays maintainable as it grows.',
            'Tổ chức công việc để vẫn dễ bảo trì khi dự án lớn dần.',
          ),
        },
      ],
    },
    {
      title: pick(lang, 'Deeper techniques', 'Kỹ thuật chuyên sâu'),
      lessons: [
        {
          title: pick(lang, 'Techniques the pros use', 'Kỹ thuật người làm nghề hay dùng'),
          summary: pick(
            lang,
            'Go beyond the basics with techniques that save time.',
            'Vượt ra ngoài kiến thức cơ bản với các kỹ thuật giúp tiết kiệm thời gian.',
          ),
        },
        {
          title: pick(lang, 'Trade-offs and decisions', 'Đánh đổi và cách ra quyết định'),
          summary: pick(
            lang,
            'Compare approaches and choose the right one for the situation.',
            'So sánh các cách tiếp cận và chọn cách phù hợp với từng tình huống.',
          ),
        },
        {
          title: pick(lang, 'Debugging and troubleshooting', 'Tìm và sửa lỗi'),
          summary: pick(
            lang,
            'A systematic way to find the cause of problems quickly.',
            'Cách làm có hệ thống để nhanh chóng tìm ra nguyên nhân sự cố.',
          ),
        },
      ],
    },
    {
      title: pick(lang, 'Real-world patterns', 'Mẫu thực tế'),
      lessons: [
        {
          title: pick(lang, 'Patterns from real projects', 'Các mẫu thiết kế từ dự án thực tế'),
          summary: pick(
            lang,
            `Reusable solutions to problems that often appear in ${topic} work.`,
            `Những giải pháp tái sử dụng cho các vấn đề thường gặp khi làm ${topic}.`,
          ),
        },
        {
          title: pick(
            lang,
            'Reviewing and improving existing work',
            'Rà soát và cải thiện sản phẩm có sẵn',
          ),
          summary: pick(
            lang,
            'Critique a realistic example and improve it step by step.',
            'Phân tích một ví dụ thực tế và cải thiện nó từng bước.',
          ),
        },
      ],
    },
    {
      title: pick(lang, 'Capstone project', 'Dự án tổng kết'),
      lessons: [
        {
          title: pick(lang, 'Build the capstone', 'Thực hiện dự án tổng kết'),
          summary: pick(
            lang,
            'Apply everything in one complete project with a clear brief.',
            'Áp dụng toàn bộ kiến thức vào một dự án hoàn chỉnh có yêu cầu rõ ràng.',
          ),
        },
        {
          title: pick(lang, 'Review and presentation tips', 'Đánh giá và mẹo trình bày'),
          summary: pick(
            lang,
            'Present your result and collect useful feedback.',
            'Trình bày kết quả và thu thập phản hồi hữu ích.',
          ),
        },
      ],
    },
  ];
}

function advancedPlan(topic: string, lang: AiLang): SectionPlan[] {
  return [
    {
      title: pick(lang, 'Advanced foundations', 'Nền tảng nâng cao'),
      lessons: [
        {
          title: pick(
            lang,
            `How ${topic} works under the hood`,
            `${topic} hoạt động bên trong như thế nào`,
          ),
          summary: pick(
            lang,
            'The internal model that explains most surprising behaviour.',
            'Mô hình bên trong giúp giải thích hầu hết các hành vi bất ngờ.',
          ),
        },
        {
          title: pick(lang, 'Mental models for experts', 'Tư duy của chuyên gia'),
          summary: pick(
            lang,
            'Frameworks experienced practitioners use to reason about problems.',
            'Các khung tư duy mà người có kinh nghiệm dùng để phân tích vấn đề.',
          ),
        },
      ],
    },
    {
      title: pick(lang, 'Architecture and performance', 'Kiến trúc và hiệu năng'),
      lessons: [
        {
          title: pick(lang, 'Designing for scale', 'Thiết kế để mở rộng'),
          summary: pick(
            lang,
            'Make design decisions that still hold when the project grows.',
            'Đưa ra quyết định thiết kế vẫn đúng khi dự án lớn lên.',
          ),
        },
        {
          title: pick(lang, 'Measuring and optimising', 'Đo lường và tối ưu'),
          summary: pick(
            lang,
            'Find real bottlenecks with measurements instead of guesses.',
            'Tìm điểm nghẽn thật bằng số liệu đo được thay vì phỏng đoán.',
          ),
        },
        {
          title: pick(lang, 'Testing strategy', 'Chiến lược kiểm thử'),
          summary: pick(
            lang,
            'Decide what to test, at which level and how much.',
            'Quyết định nên kiểm thử gì, ở mức nào và bao nhiêu là đủ.',
          ),
        },
      ],
    },
    {
      title: pick(lang, 'Edge cases and pitfalls', 'Trường hợp biên và cạm bẫy'),
      lessons: [
        {
          title: pick(lang, 'Failure modes', 'Các kiểu thất bại thường gặp'),
          summary: pick(
            lang,
            'Recognise how things fail in production and how to prevent it.',
            'Nhận biết cách hệ thống hỏng trong thực tế và cách phòng tránh.',
          ),
        },
        {
          title: pick(lang, 'Case studies of hard problems', 'Phân tích các bài toán khó'),
          summary: pick(
            lang,
            'Walk through difficult real situations and the reasoning behind each fix.',
            'Đi qua các tình huống khó thực tế và lập luận đằng sau từng cách xử lý.',
          ),
        },
      ],
    },
    {
      title: pick(lang, 'Mastery project', 'Dự án làm chủ'),
      lessons: [
        {
          title: pick(lang, 'Design the solution', 'Thiết kế giải pháp'),
          summary: pick(
            lang,
            `Plan an ambitious ${topic} project and justify the key decisions.`,
            `Lập kế hoạch một dự án ${topic} nhiều thử thách và giải thích các quyết định chính.`,
          ),
        },
        {
          title: pick(lang, 'Deliver and review', 'Hoàn thiện và đánh giá'),
          summary: pick(
            lang,
            'Finish the project and review it against professional standards.',
            'Hoàn thành dự án và đánh giá theo chuẩn nghề nghiệp.',
          ),
        },
      ],
    },
  ];
}

const LEVEL_LABEL: Record<Level, { en: string; vi: string }> = {
  beginner: { en: 'beginners', vi: 'người mới bắt đầu' },
  intermediate: { en: 'learners who know the basics', vi: 'người đã nắm kiến thức cơ bản' },
  advanced: { en: 'experienced learners', vi: 'người đã có kinh nghiệm' },
};

export function mockCourseDraft(topic: string, level: Level, lang: AiLang): CourseDraftModelOutput {
  const plans = {
    beginner: beginnerPlan,
    intermediate: intermediatePlan,
    advanced: advancedPlan,
  } satisfies Record<Level, (topic: string, lang: AiLang) => SectionPlan[]>;
  const audience = pick(lang, LEVEL_LABEL[level].en, LEVEL_LABEL[level].vi);
  return {
    subtitle: pick(
      lang,
      `A practical, step-by-step course on ${topic} for ${audience}`,
      `Khóa học ${topic} thực hành, từng bước, dành cho ${audience}`,
    ),
    description: pick(
      lang,
      `This course teaches ${topic} for ${audience}. You will learn the key ideas in short video lessons, ` +
        'see each one applied in a worked example and practise with small exercises. ' +
        'By the end you will be able to apply what you learned to a project of your own. ' +
        'No special equipment is needed, only curiosity and a little time each week.',
      `Khóa học này dạy ${topic} dành cho ${audience}. Bạn sẽ học các ý chính qua những bài video ngắn, ` +
        'xem từng ý được áp dụng trong ví dụ cụ thể và luyện tập với các bài tập nhỏ. ' +
        'Kết thúc khóa, bạn có thể áp dụng những gì đã học vào dự án của riêng mình. ' +
        'Bạn không cần thiết bị đặc biệt, chỉ cần sự tò mò và một chút thời gian mỗi tuần.',
    ),
    benefits: [
      pick(
        lang,
        `Understand the core ideas behind ${topic}`,
        `Hiểu các ý tưởng cốt lõi của ${topic}`,
      ),
      pick(
        lang,
        `Apply ${topic} to small real-world tasks`,
        `Áp dụng ${topic} vào các tác vụ thực tế nhỏ`,
      ),
      pick(lang, 'Avoid the most common mistakes', 'Tránh được những lỗi phổ biến nhất'),
      pick(
        lang,
        'Finish a project you can show to others',
        'Hoàn thành một dự án có thể giới thiệu với người khác',
      ),
    ],
    sections: plans[level](topic, lang),
  };
}

// ---------------------------------------------------------------- Course review

type Issue = CourseReviewModelOutput['issues'][number];

/** Cụm từ thường gặp ở khóa vi phạm chính sách / cố điều khiển AI (tiếng Anh và tiếng Việt). */
const POLICY_PATTERNS: readonly RegExp[] = [
  /guaranteed\s+(?:income|job|jobs|results?|profit)/i,
  /get\s+rich/i,
  /earn\s+\$?\d[\d,]*\s*(?:per|a|\/)\s*(?:day|week|hour)/i,
  /\b(?:cracked|keygen|pirated|warez)\b/i,
  /ignore\s+(?:all\s+|the\s+)?(?:previous|above|prior)\s+(?:instructions|rules)/i,
  /approve\s+this\s+course/i,
  /(?:bảo\s*đảm|cam\s*kết)\s+(?:thu\s*nhập|việc\s*làm|lợi\s*nhuận)/i,
  /làm\s*giàu\s*nhanh/i,
  /bẻ\s*khóa/i,
];

function allText(material: ReviewMaterial): string {
  return [
    material.title,
    material.subtitle,
    material.description,
    material.projectDescription,
    ...material.benefits,
    ...material.sections.flatMap((s) => [s.title, ...s.lessons.flatMap((l) => [l.title, l.notes])]),
  ].join('\n');
}

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

export function mockCourseReview(material: ReviewMaterial, lang: AiLang): CourseReviewModelOutput {
  const L = COURSE_LIMITS;
  const issues: Issue[] = [];
  const add = (severity: Issue['severity'], area: Issue['area'], en: string, vi: string): void => {
    issues.push({ severity, area, message: pick(lang, en, vi) });
  };

  const lessons = material.sections.flatMap((s) => s.lessons);

  if (POLICY_PATTERNS.some((pattern) => pattern.test(allText(material)))) {
    add(
      'high',
      'policy',
      'The content contains wording that looks like an exaggerated income or job promise, pirated material, or an attempt to instruct the reviewer. Check it carefully before approving.',
      'Nội dung có cách diễn đạt giống lời hứa thu nhập/việc làm quá mức, tài liệu lậu hoặc cố điều khiển người duyệt. Hãy kiểm tra kỹ trước khi duyệt.',
    );
  }
  if (lessons.length < L.minLessons) {
    add(
      'high',
      'curriculum',
      `The curriculum has only ${lessons.length} lesson(s); at least ${L.minLessons} are expected.`,
      `Chương trình học mới có ${lessons.length} bài; cần tối thiểu ${L.minLessons} bài.`,
    );
  }
  if (material.description.length < L.descriptionMin) {
    add(
      'medium',
      'description',
      `The description is very short (${material.description.length} characters), so students cannot tell what they will learn.`,
      `Mô tả quá ngắn (${material.description.length} ký tự), học viên khó biết mình sẽ học gì.`,
    );
  }
  const title = material.title;
  if (
    /[!?]{2,}/.test(title) ||
    (title.length >= 8 && title === title.toUpperCase() && /[A-Z]/.test(title))
  ) {
    add(
      'medium',
      'title',
      'The title uses all capitals or repeated punctuation, which looks like spam.',
      'Tiêu đề viết hoa toàn bộ hoặc lặp dấu câu, trông giống quảng cáo rác.',
    );
  }
  const emptyIndex = material.sections.findIndex((s) => s.lessons.length === 0);
  if (emptyIndex >= 0) {
    add(
      'medium',
      'curriculum',
      `Section ${emptyIndex + 1} has no lessons.`,
      `Chương ${emptyIndex + 1} chưa có bài học nào.`,
    );
  }
  if (lessons.length > 0 && !lessons.some((l) => l.isPreview)) {
    add(
      'medium',
      'curriculum',
      'There is no free preview lesson, so prospective students cannot sample the course.',
      'Chưa có bài xem thử miễn phí nên học viên tiềm năng không thể xem thử khóa học.',
    );
  }
  const invalidVideo = lessons.findIndex((l) => !l.hasValidVideo);
  if (invalidVideo >= 0) {
    add(
      'high',
      'media',
      `Lesson ${invalidVideo + 1} does not have a valid YouTube link.`,
      `Bài ${invalidVideo + 1} không có liên kết YouTube hợp lệ.`,
    );
  }
  const { priceCents, originalPriceCents } = material;
  if (priceCents > 0 && priceCents < L.priceMinCents) {
    add(
      'medium',
      'pricing',
      'The price is below the minimum for paid courses.',
      'Giá thấp hơn mức tối thiểu của khóa học có phí.',
    );
  }
  if (originalPriceCents !== null && originalPriceCents <= priceCents) {
    add(
      'medium',
      'pricing',
      'The original price is not higher than the selling price, so the discount is meaningless.',
      'Giá gốc không cao hơn giá bán nên mức giảm giá không có ý nghĩa.',
    );
  }
  if (priceCents >= 50_000) {
    add(
      'low',
      'pricing',
      'The price is high compared with typical courses; make sure the content justifies it.',
      'Giá khá cao so với khóa học thông thường; hãy bảo đảm nội dung xứng đáng.',
    );
  }
  const noNotes = lessons.filter((l) => l.notes === '').length;
  if (lessons.length > 0 && noNotes * 2 > lessons.length) {
    add(
      'low',
      'curriculum',
      `${noNotes} of ${lessons.length} lessons have no written notes, which limits the AI features for students.`,
      `${noNotes}/${lessons.length} bài chưa có ghi chú chữ, làm hạn chế các tính năng AI cho học viên.`,
    );
  }
  const seen = new Set<string>();
  const duplicate = lessons.find((l) => {
    const key = l.title.toLowerCase();
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
  if (duplicate) {
    add(
      'low',
      'curriculum',
      `The lesson title "${duplicate.title}" appears more than once.`,
      `Tên bài "${duplicate.title}" bị lặp nhiều lần.`,
    );
  }
  if (material.benefits.length < 3) {
    add(
      'low',
      'description',
      'Fewer than 3 learning outcomes are listed.',
      'Chưa liệt kê đủ 3 kết quả học tập.',
    );
  }

  issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const top = issues.slice(0, 10);
  const serious = top.filter((i) => i.severity !== 'low').length;
  const what = pick(
    lang,
    material.target === 'REVISION' ? 'the proposed revision' : 'the course',
    material.target === 'REVISION' ? 'bản sửa đổi đề xuất' : 'khóa học',
  );
  const stats = pick(
    lang,
    `${material.sections.length} sections and ${lessons.length} lessons`,
    `${material.sections.length} chương và ${lessons.length} bài học`,
  );
  const summary =
    serious > 0
      ? pick(
          lang,
          `Automatic check of ${what} (${stats}): ${serious} issue(s) need attention before approval. This is a demo review; the final decision is yours.`,
          `Kiểm tra tự động ${what} (${stats}): có ${serious} vấn đề cần xử lý trước khi duyệt. Đây là bản đánh giá demo; quyết định cuối cùng thuộc về bạn.`,
        )
      : pick(
          lang,
          `Automatic check of ${what} (${stats}): no blocking problems found${top.length > 0 ? `, ${top.length} minor suggestion(s)` : ''}. This is a demo review; the final decision is yours.`,
          `Kiểm tra tự động ${what} (${stats}): không thấy vấn đề nghiêm trọng${top.length > 0 ? `, có ${top.length} gợi ý nhỏ` : ''}. Đây là bản đánh giá demo; quyết định cuối cùng thuộc về bạn.`,
        );
  return { verdict: serious > 0 ? 'NEEDS_ATTENTION' : 'LOOKS_OK', summary, issues: top };
}
