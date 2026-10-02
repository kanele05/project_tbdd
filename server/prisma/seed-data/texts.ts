/**
 * Nội dung văn bản mẫu (tiếng Anh, khớp UI): đánh giá, câu hỏi, trả lời, bài nộp, thông báo.
 * `{title}` được thay bằng tên khóa học khi sinh dữ liệu.
 */
import { type CategorySlug } from './categories';

export const REVIEW_TEXTS: Record<1 | 2 | 3 | 4 | 5, string[]> = {
  5: [
    'Excellent course! The lessons are clear, well paced and the examples are easy to follow.',
    'One of the best courses I have taken. I learned more in a week than I expected.',
    'Loved every lesson. The instructor explains complex ideas in a simple way.',
    'Great value. The project at the end helped me apply everything I learned.',
    'Highly recommended for beginners - practical, friendly and well organised.',
    'I finished the course in a few days and already use these skills at work.',
    'The videos are short and focused, which makes it easy to study a little every day.',
    'Amazing content and a very supportive community in the Q&A section.',
    'Exactly what I was looking for. Clear explanations and useful downloadable files.',
    'Fantastic! I went from knowing nothing about {title} to building my own project.',
  ],
  4: [
    'Very good course overall. A few lessons could go a bit deeper, but I learned a lot.',
    'Clear explanations and good examples. I would love a few more exercises.',
    'Good pace and useful project. Some sections felt a little short.',
    'Solid introduction to the topic. The instructor is knowledgeable and easy to follow.',
    'Well structured and practical. Video quality could be a bit higher.',
    'I enjoyed the course and finished the project. Would like more advanced material.',
    'Helpful lessons with real examples. The resources were a nice bonus.',
  ],
  3: [
    'Decent course but I expected more depth in the middle sections.',
    'Some lessons were great, others felt rushed. Still useful for beginners.',
    'Okay for the price. The project instructions could be clearer.',
    'Good ideas, but I had to look up extra material to understand a few topics.',
  ],
  2: [
    'The topic is interesting but the lessons were too short for me to learn much.',
    'Expected more practical examples. Some explanations were hard to follow.',
  ],
  1: ['Not what I expected. The content was too basic for my level.'],
};

const GENERIC_QUESTIONS = [
  'Where can I find the files used in the lessons?',
  'How much time should I spend on the project each day?',
  'Is it okay to use different software from the one shown in the videos?',
  'Can you recommend a good next course after {title}?',
  'I am stuck on the second lesson. Any tips to get started?',
  'Do you have feedback on how to improve my final project?',
];

const QUESTIONS_BY_CATEGORY: Record<CategorySlug, string[]> = {
  design: [
    'How do I choose colours that work well together?',
    'What is the best way to get feedback on my design?',
    'Which tool would you recommend for a beginner on a budget?',
    'How many fonts should I use in one project?',
    'Can I use my own photos instead of the ones in the examples?',
  ],
  code: [
    'I get an error when I run the example from the lesson. What could be wrong?',
    'Which code editor do you recommend for this course?',
    'How do I structure my files as the project grows?',
    'Can you explain the difference between the two approaches in lesson 5?',
    'Where can I practise more exercises like these?',
  ],
  business: [
    'Can these templates be used for a real project at work?',
    'How do I convince my team to follow this process?',
    'What is a realistic timeline for a small project like this?',
    'Do you have an example of a finished plan I can look at?',
  ],
  writing: [
    "How do I overcome writer's block when I sit down to write?",
    'How long should my first draft be?',
    'Can I share my writing exercises here for feedback?',
    'What is the best way to edit my own work?',
  ],
  movie: [
    'Can I shoot the project with just my phone?',
    'What free music can I use in my video?',
    'How long should my first short film be?',
    'Which editing software works best for beginners?',
  ],
  language: [
    'How can I practise speaking when I have no one to talk to?',
    'Is it better to learn words or whole phrases?',
    'How long does it take to become comfortable in conversations?',
    'Can you repeat the pronunciation of the phrases from lesson 3?',
  ],
};

export function questionPool(category: CategorySlug): string[] {
  return [...QUESTIONS_BY_CATEGORY[category], ...GENERIC_QUESTIONS];
}

export const ANSWER_TEXTS = [
  'Good question! You can find the files in the Projects tab under Resources.',
  'I had the same problem. Re-watching the previous lesson and following along slowly fixed it for me.',
  'Yes, that works well. Just keep the same structure as in the video.',
  'I would spend about 30 minutes a day - consistency matters more than long sessions.',
  'Try it and share your result in the Projects tab. The community is happy to give feedback.',
  'Thanks for asking! The instructor mentions this in the final lesson as well.',
  'It depends on your goal, but for beginners I would start with the simplest option first.',
  'Great point. I would also add one more example to make it clearer for beginners.',
  'You are not alone - this part is tricky at first. It gets easier after a couple of tries.',
  'Take a look at the notes in lesson 4, they explain exactly this.',
];

export const SUBMISSION_TITLES = [
  'My final project',
  'First draft of my project',
  'Project for {title}',
  'Weekend project',
  'Before and after version',
  'Version 2 with your feedback applied',
];

export const SUBMISSION_DESCRIPTIONS = [
  'This is my take on the project brief. Feedback is very welcome!',
  'I followed the steps from the lessons and added my own twist at the end.',
  'It took me a weekend. The hardest part was getting the details right.',
  'I tried a different approach from the video - let me know what you think.',
  'Submitted for review. Thanks to everyone in the Q&A for the help!',
];
