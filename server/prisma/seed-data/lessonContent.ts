/**
 * Ghi chú chữ (Lesson.content) cho mọi bài học - nguồn dữ liệu cho tính năng AI vì video mẫu không có
 * transcript. KHÔNG gọi AI lúc seed: nội dung được ráp từ template theo chủ đề danh mục, bám tên khóa +
 * tên chương + tên bài, chọn câu theo băm của id bài nên cố định giữa các lần seed (idempotent).
 * Mỗi bài ~150-210 từ tiếng Anh: tổng quan, ý chính, ví dụ, lỗi hay gặp, bài tập, tóm tắt.
 */
import type { CategorySlug } from './categories';

type Pool = {
  intros: readonly string[];
  ideas: readonly string[];
  examples: readonly string[];
  mistakes: readonly string[];
  practices: readonly string[];
  takeaways: readonly string[];
};

const BUSINESS: Pool = {
  intros: [
    'Good business decisions start with clear goals, honest data and a shared understanding of who the work is for.',
    'Teams that agree on the outcome before they start spend far less time fixing misunderstandings later.',
    'Whether you lead a team or work alone, a simple repeatable routine beats improvising every time.',
    'The ideas here apply to start-ups and large companies alike, so you can reuse them in almost any role.',
  ],
  ideas: [
    'Define the goal in one sentence and write down how you will know it has been reached.',
    'List the people affected by the work and ask what each of them needs from the result.',
    'Break big efforts into small steps with an owner and a date, so progress is visible every week.',
    'Use numbers to support your story, but explain what the numbers mean in plain words.',
    'Compare at least two options and note the trade-offs in cost, time and risk before choosing.',
    'Communicate early and often, because short written updates prevent long meetings.',
    'Review what happened after each milestone and feed the lessons back into the plan.',
    'Protect your time by saying what is out of scope instead of silently adding more work.',
  ],
  examples: [
    'A small online shop wants more repeat customers, so it sets one target, tests two email offers and keeps the one that brings people back.',
    'A product team lists three risks for its launch, assigns an owner to each and checks them in a ten-minute weekly meeting.',
    'A freelancer sends a one-page plan with scope, price and timeline, and the client approves it the same day.',
    "A marketing lead compares last month's campaign results with the goal and decides which channel deserves more budget.",
    'A manager turns a vague request into three measurable tasks and shares them on a simple board everyone can see.',
  ],
  mistakes: [
    'Starting work before the goal is written down, which leads to arguments about what "done" means.',
    'Tracking too many metrics, so nobody knows which number actually matters.',
    'Hiding bad news until it is too late to react.',
    'Copying a competitor without checking whether your customers have the same needs.',
    'Treating the plan as fixed even when new information clearly contradicts it.',
  ],
  practices: [
    'Pick a task you are doing this week, write its goal in one sentence and list three steps with owners.',
    'Choose one project you know and list its top three risks and what you would do about each.',
    'Write a five-line update for a stakeholder covering progress, next step, risk, request and date.',
    "Take last month's results and write two things to keep doing and one thing to change.",
    "Explain this lesson's main idea to a colleague in under two minutes and note their questions.",
  ],
  takeaways: [
    'Clear goals, simple routines and honest communication make most business work easier.',
    'Decide what success looks like first, then choose the tools.',
    'Small, regular reviews keep a plan useful and a team aligned.',
    'Numbers tell you what happened, while people tell you why.',
    'Start small, measure honestly and improve step by step.',
  ],
};

const DESIGN: Pool = {
  intros: [
    'Good design is not decoration; it is a series of deliberate choices that help people understand and use something quickly.',
    'Before opening any tool, designers ask who the work is for and what that person needs to do.',
    'Strong layouts, readable type and a limited colour palette often matter more than clever effects.',
    'Design improves through iteration: make something simple, look at it critically and refine it.',
  ],
  ideas: [
    'Start with the audience and the task, then decide on layout, colour and type to support them.',
    'Use contrast and scale to show what is most important so the eye knows where to begin.',
    'Keep spacing consistent, because an even rhythm makes a design feel calm and professional.',
    'Limit yourself to a small palette and two typefaces, and use them the same way everywhere.',
    'Collect references, but analyse why they work instead of copying how they look.',
    'Sketch several rough versions quickly before committing to one polished direction.',
    'Ask for feedback early and listen for patterns rather than isolated opinions.',
    'Check your work at small sizes and in black and white to see whether the structure still holds.',
  ],
  examples: [
    'A designer replaces three similar button styles with one clear style, and users finish the sign-up form faster.',
    'A poster uses one large headline, a short line of supporting text and plenty of empty space, so it can be read from across the room.',
    'A mobile app screen groups related information into cards with equal spacing, which makes scanning the list effortless.',
    'An illustrator blocks in big shapes first and adds detail only after the overall composition feels balanced.',
    'A brand kit lists exact colours, fonts and logo rules so every new page looks like it belongs to the same family.',
  ],
  mistakes: [
    'Using too many fonts or colours, which makes everything compete for attention.',
    'Polishing details before the overall layout has been tested with real content.',
    'Ignoring accessibility, such as low-contrast text that many people cannot read.',
    'Relying on trends instead of the needs of the people who will use the design.',
    'Changing a design after every comment without checking what problem it is meant to solve.',
  ],
  practices: [
    'Redesign one screen or poster you use daily, changing only spacing and hierarchy, and compare the before and after.',
    'Make three quick thumbnails of the same idea, pick the strongest and write down why.',
    'Collect five examples you admire and write one sentence about what each does well.',
    'Export your work at a small size and ask a friend what they notice first.',
    'Create a mini style guide with two colours, two fonts and one spacing rule, then apply it to a new layout.',
  ],
  takeaways: [
    'Clear hierarchy, consistent spacing and a small palette solve most design problems.',
    'Design for the person using it, then refine through feedback.',
    'Simple, tested ideas beat complicated effects.',
    'Look critically at your own work, because every revision should have a reason.',
    'Good design feels invisible: people simply find it easy to use.',
  ],
};

const CODE: Pool = {
  intros: [
    'Programming is mostly about breaking a problem into small, clear steps that a computer can follow exactly.',
    'Readable code is easier to fix, extend and share, so clarity is as important as getting the right answer.',
    'You will learn faster by writing and running small programs than by only reading about them.',
    'Every tool in this course is a way to turn an idea into something repeatable and testable.',
  ],
  ideas: [
    'Write down the input, the expected output and the rules between them before writing any code.',
    'Choose clear names for variables and functions so the code explains itself.',
    'Solve the problem in small steps and run the program after each one to catch mistakes early.',
    'Reuse code with functions instead of copying and pasting, so a fix only has to be made once.',
    'Read error messages carefully, because they usually point to the exact line and the likely cause.',
    'Test with ordinary values, empty values and unusual values to see where the logic breaks.',
    'Keep data and presentation separate so each part can change without breaking the other.',
    'Commit your work often with short messages that describe what changed and why.',
  ],
  examples: [
    'A short script reads a list of orders, adds up the totals and prints a summary, which replaces ten minutes of manual spreadsheet work.',
    'A developer wraps repeated validation rules in one function and the sign-up form becomes shorter and easier to read.',
    'A query selects only the columns and rows a report needs, which makes the page load noticeably faster.',
    'A beginner fixes a failing program by printing intermediate values and discovers that an input was never converted to a number.',
    'A small web page fetches data from an API and shows a friendly message when the request fails.',
  ],
  mistakes: [
    'Writing a long program in one go and then struggling to find which part is broken.',
    'Copying code from the internet without understanding what each line does.',
    'Ignoring edge cases such as empty input, duplicate values or very large numbers.',
    'Using vague names like data2 or temp, which confuse you a week later.',
    'Skipping version control and losing working code after an experiment goes wrong.',
  ],
  practices: [
    "Write a tiny program that applies this lesson's idea, run it, then change one thing and predict the result before running again.",
    'Take code you wrote earlier and rename three variables so that each name explains its purpose.',
    'Break a problem you know into five numbered steps, then turn each step into one line of code or a function.',
    'Deliberately cause an error, read the message aloud and fix it using only what the message tells you.',
    'Add two test cases, one normal and one unusual, for a function you wrote and check that both pass.',
  ],
  takeaways: [
    'Small steps, clear names and frequent testing make programming manageable.',
    'Understand the problem first, because the code is just a way to express the solution.',
    'Read errors patiently, since they are the fastest teacher you have.',
    'Readable code saves time for everyone, including your future self.',
    'Practise with tiny programs and grow them gradually.',
  ],
};

const WRITING: Pool = {
  intros: [
    'Clear writing begins with knowing exactly who will read your words and what you want them to understand or do.',
    'Strong writers draft quickly, then spend their effort on cutting, clarifying and reading aloud.',
    'A good sentence is usually short, concrete and specific; style comes from choices, not from long words.',
    'Every piece of writing has a purpose, and that purpose should be easy to find in the first few lines.',
  ],
  ideas: [
    'State your main point in a single sentence before you write anything else.',
    'Prefer concrete details and examples to abstract statements, because readers remember pictures.',
    'Use active verbs and cut filler words so each sentence carries real weight.',
    'Organise ideas with a clear beginning, middle and end, and make transitions obvious.',
    'Match your tone to the reader: friendly for a blog, precise for a report, brief for a message.',
    'Read your draft aloud, because awkward rhythm and repeated words become easy to hear.',
    'Revise in passes: structure first, then paragraphs, then sentences, then spelling.',
    'Ask a reader to summarise your text; if their summary differs from your intent, revise.',
  ],
  examples: [
    'A writer replaces "a large number of users reported problems" with "forty users reported the same login error", and the point becomes instantly clear.',
    'A newsletter opens with one surprising fact, explains why it matters in two lines and ends with a single action for the reader.',
    'An author outlines a short story in five sentences, one per scene, before writing a single paragraph.',
    'A student shortens a long email from twelve lines to five by keeping only the request, the reason and the deadline.',
    'A blogger turns a list of tips into a story about one real mistake, and readers finally remember the advice.',
  ],
  mistakes: [
    'Starting to write before deciding what you want the reader to take away.',
    'Packing several ideas into one long paragraph so none of them stand out.',
    'Using jargon the reader may not know without explaining it.',
    'Editing while drafting, which slows you down and kills momentum.',
    'Treating the first draft as finished instead of planning at least one full revision.',
  ],
  practices: [
    "Write a paragraph on this lesson's topic, then cut it by one third without losing the main point.",
    'Rewrite three of your own sentences with active verbs and concrete nouns.',
    'Summarise something you read today in exactly two sentences and share it with a friend.',
    'Outline a short piece in five bullet points, then write only the first and last paragraph.',
    'Read your last email aloud and mark every word that you can remove.',
  ],
  takeaways: [
    'Know your reader, state your point and cut everything that does not help.',
    'Specific beats general, and short beats long.',
    'Drafting and editing are different jobs, so do them separately.',
    'Reading aloud is the quickest quality check you have.',
    'Good writing is rewriting.',
  ],
};

const MOVIE: Pool = {
  intros: [
    'Film is a visual language: every shot, cut and sound is a choice that tells the audience how to feel.',
    'Before a camera rolls, filmmakers plan the story, the look and the schedule so the shoot stays focused.',
    'Great movies often rely on simple ideas told clearly, supported by careful attention to detail.',
    'Whether you use a cinema camera or a phone, the same principles of framing, light and sound apply.',
  ],
  ideas: [
    'Start with a clear story question that the audience wants answered by the end.',
    'Choose shot size and camera position to show what a character feels, not only what they do.',
    'Use light to shape mood: soft and warm feels gentle, while hard and cool feels tense.',
    'Record clean sound, because audiences forgive a soft image faster than muffled dialogue.',
    'Plan coverage so you have a wide, a medium and a close shot of every important moment.',
    'Cut on action and keep a consistent screen direction so scenes flow naturally.',
    'Let music and silence work together to guide the pacing of a scene.',
    'Watch your edit with fresh eyes and remove anything that does not move the story forward.',
  ],
  examples: [
    "A director films a quiet kitchen scene with a slow push-in on the actor's face, and the audience senses the tension without a single line of dialogue.",
    'A student crew uses a window and a white sheet as a soft key light and gets a professional-looking interview.',
    'An editor trims two seconds from every shot in a chase scene, and the whole sequence feels twice as fast.',
    'A producer builds a one-page shot list so the team films everything needed in half a day.',
    'A sound recordist places the microphone close to the speaker and the final film needs almost no dialogue repair.',
  ],
  mistakes: [
    'Shooting without a plan and discovering in the edit that important shots are missing.',
    'Ignoring audio until the end, when problems are expensive to fix.',
    'Moving the camera constantly without a reason.',
    'Holding every shot too long out of love for the footage.',
    'Using music to cover weak scenes instead of improving them.',
  ],
  practices: [
    'Film a thirty-second scene of an everyday action from three different angles, then edit it into one smooth sequence.',
    'Write a one-sentence story, list the five shots you need and shoot them with your phone.',
    'Watch a favourite scene twice with the sound off, then once with the sound on, and note what changes.',
    'Record the same sentence in a quiet room and in a noisy room and compare the results.',
    'Cut a short clip twice, once slowly and once fast, and describe how the mood differs.',
  ],
  takeaways: [
    'Story first, then shots, light and sound that serve it.',
    'Every choice in a film should have a reason the audience can feel.',
    'Plan before you shoot and improve while you edit.',
    'Good sound and clear light lift even a simple film.',
    'Keep it simple: show, do not tell.',
  ],
};

const LANGUAGE: Pool = {
  intros: [
    'Learning a language is easiest when you meet small amounts of it every day and use it in real situations.',
    'Confidence grows from practice, so aim to speak and listen a little each day rather than study for hours once a week.',
    'Words and grammar become natural when you connect them to people, places and moments you care about.',
    'Mistakes are a normal and useful part of learning, because each one shows you exactly what to improve.',
  ],
  ideas: [
    'Learn new words in short phrases or sentences, not as isolated items on a list.',
    'Listen to the language daily, even for ten minutes, to train your ear for rhythm and sound.',
    'Review vocabulary at increasing intervals, for example tomorrow, in three days and in a week.',
    'Speak out loud from the first lesson, because it builds muscle memory that silent reading cannot.',
    'Notice patterns in grammar and test them by making your own sentences.',
    'Use the language for a real goal, such as ordering food, introducing yourself or writing a short message.',
    'Record yourself and compare your pronunciation with a native speaker.',
    'Keep a small notebook of useful expressions and mistakes you want to avoid.',
  ],
  examples: [
    'A learner introduces herself to a language partner using five sentences she practised in the morning and gets a friendly reply.',
    'A traveller memorises phrases for a café, then orders coffee and asks for the bill without switching to English.',
    'A student watches a short video with subtitles, repeats each line out loud and writes down three new expressions.',
    'A beginner turns a grammar rule into a small song and remembers it for weeks.',
    'A pair of friends text each other one sentence a day in the language they are learning and correct each other kindly.',
  ],
  mistakes: [
    'Waiting until you feel perfect before you speak.',
    'Memorising long word lists without using the words in sentences.',
    'Translating every sentence word by word instead of learning whole phrases.',
    'Studying only on weekends instead of a little every day.',
    'Comparing yourself with fluent speakers instead of with your own progress last month.',
  ],
  practices: [
    "Say five sentences about your day out loud using today's vocabulary, then record and replay them.",
    'Write three questions you might ask a new friend, and answer them in the language you are learning.',
    'Listen to a short audio clip, pause after each sentence and repeat it as closely as you can.',
    'Create flashcards with a full sentence on one side and a picture or translation on the other.',
    'Find one conversation partner this week and plan a ten-minute chat on a simple topic.',
  ],
  takeaways: [
    'Little and often beats a lot and rarely.',
    'Use phrases, speak early and welcome mistakes.',
    'Connect every new word to a real situation.',
    'Listening trains your ear, while speaking trains your confidence.',
    'Progress comes from consistency, not from perfection.',
  ],
};

const POOLS: Record<CategorySlug, Pool> = {
  business: BUSINESS,
  design: DESIGN,
  code: CODE,
  writing: WRITING,
  movie: MOVIE,
  language: LANGUAGE,
};

/** FNV-1a 32 bit: băm ổn định (không dùng Math.random để seed idempotent). */
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Lấy `count` phần tử khác nhau từ `pool`, bắt đầu và bước nhảy cố định theo `seed`. */
function pickMany(pool: readonly string[], seed: string, count: number): string[] {
  const h = hash(seed);
  const stride = h % 2 === 0 ? 1 : 3; // 1 và 3 nguyên tố cùng nhau với độ dài pool (4, 5, 8)
  const start = (h >>> 1) % pool.length;
  return Array.from(
    { length: count },
    (_, i) => pool[(start + i * stride) % pool.length] ?? pool[0] ?? '',
  );
}

export type LessonContentInput = {
  lessonId: string;
  category: CategorySlug;
  courseTitle: string;
  sectionTitle: string;
  lessonTitle: string;
};

export function buildLessonContent(input: LessonContentInput): string {
  const pool = POOLS[input.category];
  const key = input.lessonId;
  const [intro] = pickMany(pool.intros, `${key}:intro`, 1);
  const ideas = pickMany(pool.ideas, `${key}:ideas`, 3);
  const [example] = pickMany(pool.examples, `${key}:example`, 1);
  const [mistake] = pickMany(pool.mistakes, `${key}:mistake`, 1);
  const [practice] = pickMany(pool.practices, `${key}:practice`, 1);
  const [takeaway] = pickMany(pool.takeaways, `${key}:takeaway`, 1);

  return [
    `Lesson notes - "${input.lessonTitle}" (section "${input.sectionTitle}", course "${input.courseTitle}"):`,
    '',
    `Overview: ${intro}`,
    '',
    'Key ideas:',
    ...ideas.map((idea) => `- ${idea}`),
    '',
    `Example: ${example}`,
    '',
    `Common mistake: ${mistake}`,
    '',
    `Try it yourself: ${practice}`,
    '',
    `Takeaway: ${takeaway}`,
  ].join('\n');
}
