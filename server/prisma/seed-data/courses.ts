/**
 * 30 khóa học (PLAN §11): tiêu đề theo design + khóa bổ sung để mỗi danh mục đều có dữ liệu.
 * - Giá lưu bằng cent. `originalPriceCents` có giá trị -> nhãn giảm giá tính theo BR-10 (không ghi cứng %).
 * - 3 khóa miễn phí, 5 khóa Best-seller, 6 khóa "Course that inspires" (isFeatured).
 * - `benefits` KHÔNG ghi chứng chỉ (Certificate là "Won't" trong PLAN §2.2).
 */
import { type CategorySlug } from './categories';
import { PHOTO } from './media';

export type Popularity = 'high' | 'mid' | 'low';

export type CourseSeed = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: CategorySlug;
  /** Khóa của giảng viên trong teachers.ts. */
  teacher: string;
  /** Id ảnh Unsplash (PHOTO trong media.ts). */
  photo: string;
  priceCents: number;
  originalPriceCents?: number;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  tags: string[];
  benefits: string[];
  projectDescription: string;
  /** Khóa học được tạo cách đây bao nhiêu ngày (phục vụ sắp xếp "Newest"). */
  ageDays: number;
  popularity: Popularity;
};

export const courseId = (slug: string): string => `crs_${slug.replace(/-/g, '_')}`;

const BENEFITS_COMMON = ['Lifetime access to all lessons', 'Learn at your own pace on any device'];

export const COURSES: readonly CourseSeed[] = [
  // ------------------------------------------------------------------ Design
  {
    slug: 'ux-foundation',
    title: 'UX Foundation',
    subtitle: 'Learn the core principles of user experience design',
    description:
      'Start your UX journey with the ideas every designer uses: users, tasks, flows and feedback. You will learn how to research a problem, sketch solutions and test them with real people.',
    category: 'design',
    teacher: 'sara',
    photo: PHOTO.tabletWireframe,
    priceCents: 4900,
    tags: ['UX Research', 'Figma'],
    benefits: [
      'Understand how users think and decide',
      'Sketch and test simple user flows',
      'Build a first UX case study',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Pick an everyday app you dislike, list its usability problems and redesign one key flow as low-fidelity wireframes.',
    ageDays: 150,
    popularity: 'high',
  },
  {
    slug: 'website-design',
    title: 'Website Design',
    subtitle: 'Design clean, modern websites from scratch',
    description:
      'Plan, design and polish a complete website. You will work with layout grids, colour, typography and images, then hand your design over in a form developers love.',
    category: 'design',
    teacher: 'ramono',
    photo: PHOTO.monitorDesign,
    priceCents: 5900,
    isBestSeller: true,
    tags: ['Figma', 'Photoshop'],
    benefits: [
      'Design responsive page layouts',
      'Choose colours and fonts with confidence',
      'Prepare assets for developers',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Design a landing page for a fictional local business, including desktop and mobile versions.',
    ageDays: 170,
    popularity: 'high',
  },
  {
    slug: 'ux-research-for-beginners',
    title: 'UX Research For Beginners',
    subtitle: 'Find out what users really need before you design',
    description:
      'Learn the simplest research methods that give the biggest insights: interviews, surveys and usability tests. Turn what you learn into personas, journeys and clear design decisions.',
    category: 'design',
    teacher: 'olivia',
    photo: PHOTO.laptopDesign,
    priceCents: 2900,
    originalPriceCents: 3625,
    tags: ['UX Research'],
    benefits: [
      'Plan and run user interviews',
      'Analyse feedback and find patterns',
      'Present insights to your team',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Interview three people about how they book travel online and summarise your findings in a one-page insight report.',
    ageDays: 120,
    popularity: 'high',
  },
  {
    slug: 'digital-portrait',
    title: 'Digital Portrait',
    subtitle: 'Paint expressive portraits on your tablet',
    description:
      'Build a portrait step by step: proportions, light, skin tones and finishing touches. Every lesson ends with a short exercise so your skills grow with each session.',
    category: 'design',
    teacher: 'ramono',
    photo: PHOTO.portraitWoman,
    priceCents: 6700,
    isFeatured: true,
    tags: ['Photoshop', 'Illustration'],
    benefits: [
      'Draw faces with correct proportions',
      'Paint light and shadow digitally',
      'Create your own brush set',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Create a finished digital portrait of a friend or a public-domain photograph and share your work-in-progress steps.',
    ageDays: 60,
    popularity: 'high',
  },
  {
    slug: 'workspace-decor',
    title: 'Workspace Decor',
    subtitle: 'Turn any desk into a space you love working in',
    description:
      'Learn the basics of colour, light and layout to create a calm, productive workspace. Includes budget-friendly ideas for small rooms and shared spaces.',
    category: 'design',
    teacher: 'ruth',
    photo: PHOTO.interiorChair,
    priceCents: 1900,
    isFeatured: true,
    tags: ['Illustration'],
    benefits: [
      'Plan a workspace layout',
      'Pick a colour palette that fits you',
      'Improve light and ergonomics on a budget',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Create a mood board and a floor plan for your own workspace, then share before and after photos.',
    ageDays: 45,
    popularity: 'mid',
  },
  {
    slug: 'packaging-design',
    title: 'Packaging Design',
    subtitle: 'Create packaging that people want to keep',
    description:
      'From dielines to unboxing: design packaging that protects the product and tells the brand story. You will mock up your design in 3D and prepare files for print.',
    category: 'design',
    teacher: 'hui',
    photo: PHOTO.ribbons,
    priceCents: 8900,
    isFeatured: true,
    tags: ['Branding', 'Illustration'],
    benefits: [
      'Understand materials and print basics',
      'Design a box or bag from a dieline',
      'Present packaging with realistic mock-ups',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Design the packaging for a small candle or tea brand: one box, one label and a simple shipping sleeve.',
    ageDays: 95,
    popularity: 'mid',
  },
  {
    slug: 'design-basics',
    title: 'Design Basics',
    subtitle: 'A free introduction to design thinking',
    description:
      'A friendly introduction to balance, contrast, hierarchy and repetition. No software needed - just paper, pencils and curiosity.',
    category: 'design',
    teacher: 'sara',
    photo: PHOTO.pencils,
    priceCents: 0,
    tags: ['Illustration', 'Typography'],
    benefits: [
      'Learn the seven basic design principles',
      'Analyse good and bad designs',
      'Complete exercises with only pencil and paper',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Redesign a poster you see every day using only two colours and one typeface.',
    ageDays: 200,
    popularity: 'high',
  },
  {
    slug: 'digital-sketching',
    title: 'Digital Sketching',
    subtitle: 'Sketch ideas quickly on a tablet or with a mouse',
    description:
      'Get comfortable sketching digitally with fast, loose lines. You will learn shortcuts, layers and simple perspective to bring ideas to life in minutes.',
    category: 'design',
    teacher: 'kelly',
    photo: PHOTO.sketchWireframe,
    priceCents: 3900,
    tags: ['Photoshop', 'Illustration'],
    benefits: [
      'Set up a fast sketching workflow',
      'Use layers and reference images',
      'Draw simple objects in perspective',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Fill one page with 20 quick sketches of objects on your desk, then refine your three favourites.',
    ageDays: 75,
    popularity: 'mid',
  },
  {
    slug: 'web-design',
    title: 'Web Design',
    subtitle: 'From idea to responsive web page',
    description:
      'Learn how layouts adapt to different screens. This course connects design tools with real HTML and CSS so you can build what you design.',
    category: 'design',
    teacher: 'christian',
    photo: PHOTO.wireframePaper,
    priceCents: 7900,
    originalPriceCents: 9900,
    tags: ['Figma', 'Javascript'],
    benefits: [
      'Design mobile-first layouts',
      'Translate designs into simple HTML and CSS',
      'Test your page on different screen sizes',
      ...BENEFITS_COMMON,
    ],
    projectDescription: 'Turn a wireframe of a personal portfolio page into a responsive web page.',
    ageDays: 110,
    popularity: 'mid',
  },
  {
    slug: 'product-design',
    title: 'Product Design',
    subtitle: 'Design products people love to use',
    description:
      'Explore the whole product design process: research, ideation, prototyping and testing. Case studies show how great teams make trade-offs and ship.',
    category: 'design',
    teacher: 'dennis',
    photo: PHOTO.toteBag,
    priceCents: 19000,
    tags: ['UX Research', 'Branding'],
    benefits: [
      'Frame problems worth solving',
      'Prototype quickly with paper and digital tools',
      'Run design reviews and critiques',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Design a reusable shopping bag: define the user, sketch three concepts and build a simple prototype.',
    ageDays: 130,
    popularity: 'mid',
  },
  {
    slug: 'palettes-for-your-app',
    title: 'Palettes for Your App',
    subtitle: 'Build accessible colour palettes for mobile apps',
    description:
      'Choose colours that look great and stay readable. You will learn colour theory, contrast rules and how to build a palette that works in light and dark themes.',
    category: 'design',
    teacher: 'olivia',
    photo: PHOTO.swatches,
    priceCents: 4900,
    originalPriceCents: 6125,
    tags: ['Figma', 'UX Research'],
    benefits: [
      'Understand colour theory in practice',
      'Check contrast for accessibility',
      'Create a reusable palette',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Create a primary and secondary colour palette for a habit-tracking app and test it for contrast.',
    ageDays: 85,
    popularity: 'mid',
  },
  {
    slug: 'mobile-ui-design',
    title: 'Mobile UI Design',
    subtitle: 'Design beautiful and usable mobile interfaces',
    description:
      'Learn the patterns behind great mobile apps: navigation, lists, forms and feedback. Practise with real screen designs and platform guidelines for iOS and Android.',
    category: 'design',
    teacher: 'ramono',
    photo: PHOTO.phoneUi,
    priceCents: 32000,
    isBestSeller: true,
    tags: ['Figma'],
    benefits: [
      'Design thumb-friendly navigation',
      'Build consistent component libraries',
      'Prepare a design hand-off',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Design five key screens of a mobile learning app, including a home screen and a course detail screen.',
    ageDays: 140,
    popularity: 'high',
  },
  {
    slug: 'creative-art-design',
    title: 'Creative Art Design',
    subtitle: 'Explore colour, shape and imagination',
    description:
      'A hands-on course about making art that feels personal. Experiment with textures, watercolour and collage, then bring your best ideas together in a finished piece.',
    category: 'design',
    teacher: 'kelly',
    photo: PHOTO.abstractPainting,
    priceCents: 5900,
    isFeatured: true,
    tags: ['Watercolor', 'Illustration'],
    benefits: [
      'Experiment with different art techniques',
      'Develop your own visual style',
      'Plan and finish an artwork',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Create a series of three small artworks that share one colour palette and one theme.',
    ageDays: 55,
    popularity: 'mid',
  },
  {
    slug: 'typography-in-ui-design',
    title: 'Typography in UI Design',
    subtitle: 'Make interfaces easier to read and more beautiful',
    description:
      'Typography is most of what people see in an interface. Learn how to choose typefaces, set a type scale, and create hierarchy that guides the eye.',
    category: 'design',
    teacher: 'sara',
    photo: PHOTO.loveToLearn,
    priceCents: 4900,
    tags: ['Typography', 'Figma'],
    benefits: [
      'Pair fonts with confidence',
      'Build a consistent type scale',
      'Improve readability on small screens',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Take a text-heavy screen and improve it using only typography - no new colours or images.',
    ageDays: 100,
    popularity: 'mid',
  },
  {
    slug: 'mobile-app-design',
    title: 'Mobile App Design',
    subtitle: 'Plan, design and test a complete mobile app',
    description:
      'Follow one app idea from a written brief to a clickable prototype. You will make key decisions about flows, features and visual style along the way.',
    category: 'design',
    teacher: 'dennis',
    photo: PHOTO.phoneApps,
    priceCents: 12900,
    originalPriceCents: 16900,
    tags: ['Figma', 'UX Research'],
    benefits: [
      'Define an app idea and its core flow',
      'Create a clickable prototype',
      'Test your prototype with real users',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Design and prototype a mobile app that solves a small problem in your daily life.',
    ageDays: 35,
    popularity: 'mid',
  },
  {
    slug: 'digital-poster',
    title: 'Digital Poster',
    subtitle: 'Design eye-catching posters for print and screen',
    description:
      'Learn layout, image editing and type to design posters that get noticed. Prepare your files for print or share them online at the right size.',
    category: 'design',
    teacher: 'hui',
    photo: PHOTO.posters,
    priceCents: 3400,
    tags: ['Photoshop', 'Typography'],
    benefits: [
      'Create strong visual hierarchy',
      'Edit and combine images',
      'Export files for print and web',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Design a poster for an imaginary film festival in A3 size, plus a smaller social media version.',
    ageDays: 25,
    popularity: 'low',
  },
  {
    slug: 'patterns-design',
    title: 'Patterns Design',
    subtitle: 'Create seamless patterns for products and screens',
    description:
      'Discover how repeating shapes and colours make patterns that feel alive. Build seamless tiles and apply them to fabric, packaging and app backgrounds.',
    category: 'design',
    teacher: 'ruth',
    photo: PHOTO.patternCorridor,
    priceCents: 3900,
    tags: ['Illustration', 'Branding'],
    benefits: [
      'Build seamless repeating tiles',
      'Combine motifs and colour',
      'Apply patterns to real products',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Create one seamless pattern and show it on three mock-ups such as a tote bag, a phone case and a website header.',
    ageDays: 15,
    popularity: 'low',
  },

  // ------------------------------------------------------------------ Code
  {
    slug: 'php-in-one-click',
    title: 'PHP in One Click',
    subtitle: 'Learn server-side programming with PHP',
    description:
      'Start with "Hello, World!" and build up to a small dynamic website with forms and a database. Every concept is shown in short, runnable examples.',
    category: 'code',
    teacher: 'ramono',
    photo: PHOTO.codePhp,
    priceCents: 5900,
    tags: ['PHP', 'SQL'],
    benefits: [
      'Write PHP scripts and functions',
      'Process forms and sessions',
      'Connect a website to a database',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Build a simple guestbook where visitors can leave messages that are stored in a database.',
    ageDays: 180,
    popularity: 'high',
  },
  {
    slug: 'python-introduction',
    title: 'Python Introduction',
    subtitle: 'Your first steps in programming with Python',
    description:
      'Learn programming fundamentals with Python: variables, loops, functions and files. You will finish with small programs that automate everyday tasks.',
    category: 'code',
    teacher: 'ramono',
    photo: PHOTO.codePython,
    priceCents: 3900,
    originalPriceCents: 4900,
    isBestSeller: true,
    tags: ['Python'],
    benefits: [
      'Understand programming basics',
      'Write and debug Python programs',
      'Read and write files',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Write a command-line program that renames and sorts the files in a folder.',
    ageDays: 190,
    popularity: 'high',
  },
  {
    slug: 'javascript-for-beginners',
    title: 'JavaScript for Beginners',
    subtitle: 'Make web pages interactive',
    description:
      'Learn the language of the web from the ground up. Practise with the DOM, events and simple animations, then build a small interactive app.',
    category: 'code',
    teacher: 'christian',
    photo: PHOTO.codeJs,
    priceCents: 4500,
    isBestSeller: true,
    tags: ['Javascript'],
    benefits: [
      'Master variables, functions and objects',
      'Update web pages with the DOM',
      'Fetch data from an API',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Build a to-do list app that saves items in the browser and lets you filter them.',
    ageDays: 165,
    popularity: 'high',
  },
  {
    slug: 'sql-essentials',
    title: 'SQL Essentials',
    subtitle: 'Query and understand data with SQL',
    description:
      'Learn to ask questions of a database. Practise SELECT, JOIN, GROUP BY and subqueries on realistic data sets from shops, schools and streaming services.',
    category: 'code',
    teacher: 'christian',
    photo: PHOTO.dataDashboard,
    priceCents: 3500,
    tags: ['SQL'],
    benefits: [
      'Write queries with filters and sorting',
      'Combine tables with JOINs',
      'Summarise data with aggregates',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Analyse a sample online-shop database and answer five business questions using SQL.',
    ageDays: 105,
    popularity: 'mid',
  },
  {
    slug: 'java-fundamentals',
    title: 'Java Fundamentals',
    subtitle: 'A free course on object-oriented programming in Java',
    description:
      'Learn Java syntax, classes and objects step by step. The course is free and perfect if you want to prepare for university programming classes.',
    category: 'code',
    teacher: 'christian',
    photo: PHOTO.codeJava,
    priceCents: 0,
    tags: ['Java'],
    benefits: [
      'Write your first Java programs',
      'Use classes, objects and inheritance',
      'Handle errors with exceptions',
      ...BENEFITS_COMMON,
    ],
    projectDescription: 'Model a small library system with classes for books, members and loans.',
    ageDays: 210,
    popularity: 'high',
  },

  // ------------------------------------------------------------------ Business
  {
    slug: 'project-management-essentials',
    title: 'Project Management Essentials',
    subtitle: 'Plan and deliver projects on time',
    description:
      'Learn how to define scope, plan work, manage risks and keep stakeholders informed. Templates and real examples help you apply each idea immediately.',
    category: 'business',
    teacher: 'ryan',
    photo: PHOTO.teamWhiteboard,
    priceCents: 6900,
    originalPriceCents: 8625,
    tags: ['Project management'],
    benefits: [
      'Write a clear project plan',
      'Estimate and track tasks',
      'Run effective meetings and retrospectives',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Plan a two-week project of your choice with goals, tasks, risks and a timeline.',
    ageDays: 90,
    popularity: 'high',
  },
  {
    slug: 'digital-marketing-101',
    title: 'Digital Marketing 101',
    subtitle: 'Reach the right audience online',
    description:
      'Understand the main digital channels - search, social, email and content - and how to measure what works. Includes a simple framework for building your first campaign.',
    category: 'business',
    teacher: 'ryan',
    photo: PHOTO.analytics,
    priceCents: 4900,
    originalPriceCents: 6999,
    isBestSeller: true,
    tags: ['Digital marketing'],
    benefits: [
      'Define your audience and message',
      'Plan a multi-channel campaign',
      'Measure results with key metrics',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Create a one-page marketing plan for a local shop, with goals, channels and a weekly content calendar.',
    ageDays: 70,
    popularity: 'high',
  },

  // ------------------------------------------------------------------ Writing
  {
    slug: 'creative-writing-workshop',
    title: 'Creative Writing Workshop',
    subtitle: 'Find your voice and finish your stories',
    description:
      'Weekly prompts, feedback techniques and editing tools help you write with more confidence. Learn how to build characters, scenes and a plot that keeps readers turning pages.',
    category: 'writing',
    teacher: 'ruth',
    photo: PHOTO.fountainPen,
    priceCents: 3900,
    tags: ['Illustration'],
    benefits: [
      'Build a daily writing habit',
      'Create believable characters',
      'Edit and polish your own work',
      ...BENEFITS_COMMON,
    ],
    projectDescription: 'Write a short story of 1,000 words and revise it after peer feedback.',
    ageDays: 80,
    popularity: 'mid',
  },
  {
    slug: 'copywriting-that-sells',
    title: 'Copywriting That Sells',
    subtitle: 'Write words that make people act',
    description:
      'Learn proven formulas for headlines, product pages and emails. See before-and-after examples and practise rewriting weak copy into strong copy.',
    category: 'writing',
    teacher: 'kelly',
    photo: PHOTO.deskCoffee,
    priceCents: 2900,
    tags: ['Digital marketing', 'English'],
    benefits: [
      'Write headlines that get clicks',
      'Structure persuasive pages',
      'Edit your copy to be shorter and clearer',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Rewrite the landing page copy of a product you know and explain your changes.',
    ageDays: 40,
    popularity: 'low',
  },

  // ------------------------------------------------------------------ Movie
  {
    slug: 'filmmaking-basics',
    title: 'Filmmaking Basics',
    subtitle: 'Shoot your first short film',
    description:
      'Everything you need to plan and shoot a short film with a phone or a basic camera: story, framing, light and sound. Learn how professional crews organise a shoot.',
    category: 'movie',
    teacher: 'kelly',
    photo: PHOTO.clapperboard,
    priceCents: 5400,
    tags: ['Video editing'],
    benefits: [
      'Write a simple shooting script',
      'Frame and light a scene',
      'Record clean audio',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Shoot a one-minute film with three scenes and share the storyboard and final cut.',
    ageDays: 65,
    popularity: 'mid',
  },
  {
    slug: 'video-editing-essentials',
    title: 'Video Editing Essentials',
    subtitle: 'Cut, colour and export professional videos',
    description:
      'Learn the editing workflow used by professionals: organising footage, cutting to rhythm, adding music and grading colour. Works with any editing software.',
    category: 'movie',
    teacher: 'hui',
    photo: PHOTO.videoEditing,
    priceCents: 5900,
    originalPriceCents: 8900,
    tags: ['Video editing'],
    benefits: [
      'Organise and cut footage quickly',
      'Add music, titles and transitions',
      'Export for web and social media',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Edit a 60-second highlight video from your own footage or the practice clips provided.',
    ageDays: 20,
    popularity: 'low',
  },

  // ------------------------------------------------------------------ Language
  {
    slug: 'english-conversation',
    title: 'English Conversation',
    subtitle: 'A free course to speak English with confidence',
    description:
      'Practise real conversations for work, travel and everyday life. Short videos teach useful phrases and pronunciation, followed by speaking exercises.',
    category: 'language',
    teacher: 'sara',
    photo: PHOTO.friendsTalking,
    priceCents: 0,
    tags: ['English'],
    benefits: [
      'Learn phrases you can use immediately',
      'Improve pronunciation and listening',
      'Practise with speaking challenges',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Record a two-minute introduction about yourself and share it with the community.',
    ageDays: 220,
    popularity: 'high',
  },
  {
    slug: 'spanish-for-travelers',
    title: 'Spanish for Travelers',
    subtitle: 'Speak enough Spanish to enjoy your trip',
    description:
      'Learn the words and phrases you need at airports, hotels, restaurants and markets. Native-speaker examples and role plays prepare you for real situations.',
    category: 'language',
    teacher: 'ruth',
    photo: PHOTO.travelMap,
    priceCents: 2900,
    tags: ['English'],
    benefits: [
      'Order food and ask for directions',
      'Understand common signs and menus',
      'Build confidence with role plays',
      ...BENEFITS_COMMON,
    ],
    projectDescription:
      'Plan a three-day trip to a Spanish-speaking city and write the dialogues you would need.',
    ageDays: 30,
    popularity: 'low',
  },
];
