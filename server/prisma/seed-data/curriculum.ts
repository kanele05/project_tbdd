/**
 * Chương trình học của từng khóa: 3-4 chương, 8-15 bài (PLAN §11).
 * 4 khóa của tài khoản demo có đúng 10 bài để tiến độ 30 % / 70 % / 100 % / 50 % chia hết.
 * 2 bài đầu tiên của mỗi khóa là bài xem thử (isPreview) - việc gán được xử lý trong seed.ts.
 */
export type SectionSeed = { title: string; lessons: string[] };

export const CURRICULUM: Record<string, SectionSeed[]> = {
  'ux-foundation': [
    {
      title: 'Getting started with UX',
      lessons: ['What is user experience?', 'The UX design process', 'Meet your users'],
    },
    {
      title: 'Research and ideas',
      lessons: ['Interviews and observation', 'Personas and journeys', 'Sketching solutions'],
    },
    {
      title: 'Design and test',
      lessons: [
        'Wireframing key flows',
        'Building a clickable prototype',
        'Usability testing',
        'Presenting your case study',
      ],
    },
  ],
  'website-design': [
    {
      title: 'Foundations',
      lessons: ['How websites are structured', 'Grids and layout', 'Choosing colour and type'],
    },
    {
      title: 'Designing pages',
      lessons: ['Navigation and headers', 'Hero sections that work', 'Cards, lists and forms'],
    },
    {
      title: 'Finishing touches',
      lessons: ['Designing for mobile', 'Imagery and icons', 'Handing off to developers'],
    },
  ],
  'ux-research-for-beginners': [
    {
      title: 'Why research?',
      lessons: ['Research vs. opinions', 'Choosing the right method', 'Writing research questions'],
    },
    {
      title: 'Talking to users',
      lessons: ['Recruiting participants', 'Running interviews', 'Taking useful notes'],
    },
    {
      title: 'Making sense of it',
      lessons: [
        'Finding patterns',
        'Personas and journey maps',
        'Usability testing basics',
        'Sharing your findings',
      ],
    },
  ],
  'digital-portrait': [
    {
      title: 'Setting up',
      lessons: ['Tools and canvas setup', 'Reference photos', 'Face proportions'],
    },
    {
      title: 'Painting the face',
      lessons: ['Blocking in shapes', 'Light and shadow', 'Skin tones', 'Eyes, nose and mouth'],
    },
    {
      title: 'Finishing',
      lessons: ['Hair and clothing', 'Background and mood', 'Final touches and export'],
    },
  ],
  'workspace-decor': [
    {
      title: 'Plan your space',
      lessons: [
        'What makes a good workspace?',
        'Measuring and layout',
        'Choosing a colour palette',
      ],
    },
    {
      title: 'Light and comfort',
      lessons: ['Natural and artificial light', 'Ergonomics for your desk', 'Storage and cables'],
    },
    {
      title: 'Make it yours',
      lessons: [
        'Plants and textures',
        'Art and personal items',
        'Small budget makeovers',
        'Keeping it tidy',
      ],
    },
  ],
  'packaging-design': [
    {
      title: 'Packaging basics',
      lessons: ['Why packaging matters', 'Materials and printing', 'Reading a dieline'],
    },
    {
      title: 'Designing the box',
      lessons: [
        'Brand and audience',
        'Layout and hierarchy',
        'Illustration and pattern',
        'Typography for labels',
      ],
    },
    {
      title: 'Presenting your work',
      lessons: [
        '3D mock-ups',
        'Preparing print files',
        'Unboxing experience',
        'Portfolio presentation',
      ],
    },
  ],
  'design-basics': [
    {
      title: 'Seeing design',
      lessons: ['What is design?', 'Balance and alignment', 'Contrast and emphasis'],
    },
    {
      title: 'Building blocks',
      lessons: ['Repetition and rhythm', 'Colour basics', 'Shapes and space'],
    },
    {
      title: 'Practice',
      lessons: ['Critiquing everyday objects', 'Your first poster', 'Next steps'],
    },
  ],
  'digital-sketching': [
    {
      title: 'Getting comfortable',
      lessons: ['Your sketching setup', 'Lines and shapes', 'Layers and undo'],
    },
    {
      title: 'Sketching ideas',
      lessons: ['Quick thumbnails', 'Objects in perspective', 'Adding shading'],
    },
    {
      title: 'Bringing it together',
      lessons: ['Sketching from photos', 'Clean-up and colour', 'Building a sketchbook'],
    },
  ],
  'web-design': [
    {
      title: 'Web design essentials',
      lessons: ['Design for the web', 'HTML and CSS in five minutes', 'Responsive thinking'],
    },
    {
      title: 'Layouts',
      lessons: ['Flexbox and grid basics', 'Mobile-first layouts', 'Images and media'],
    },
    {
      title: 'Build and test',
      lessons: [
        'From design to code',
        'Testing on devices',
        'Performance and accessibility',
        'Publishing your page',
      ],
    },
  ],
  'product-design': [
    {
      title: 'Framing the problem',
      lessons: ['What is product design?', 'Understanding users', 'Defining the problem'],
    },
    {
      title: 'Ideas and prototypes',
      lessons: ['Brainstorming methods', 'Sketching concepts', 'Paper and digital prototypes'],
    },
    {
      title: 'Testing and delivery',
      lessons: [
        'Testing with users',
        'Design reviews',
        'Working with engineers',
        'Launching and learning',
      ],
    },
  ],
  'palettes-for-your-app': [
    {
      title: 'Colour fundamentals',
      lessons: ['How colour works', 'Hue, saturation and value', 'Colour and emotion'],
    },
    {
      title: 'Building a palette',
      lessons: ['Primary and secondary colours', 'Neutrals and greys', 'Semantic colours'],
    },
    {
      title: 'Accessibility and themes',
      lessons: [
        'Contrast ratios',
        'Colour blindness',
        'Dark mode palettes',
        'Documenting your palette',
      ],
    },
  ],
  'mobile-ui-design': [
    {
      title: 'Mobile foundations',
      lessons: [
        'Mobile design principles',
        'iOS and Android guidelines',
        'Touch targets and spacing',
      ],
    },
    {
      title: 'Core patterns',
      lessons: [
        'Navigation patterns',
        'Lists and cards',
        'Forms and inputs',
        'Empty and error states',
      ],
    },
    {
      title: 'Polish',
      lessons: ['Icons and imagery', 'Micro-interactions', 'Design systems', 'Handing off screens'],
    },
  ],
  'creative-art-design': [
    {
      title: 'Warm up',
      lessons: ['Finding inspiration', 'Materials and tools', 'Colour experiments'],
    },
    {
      title: 'Techniques',
      lessons: ['Watercolour washes', 'Texture and collage', 'Line and shape', 'Mixed media'],
    },
    {
      title: 'Your artwork',
      lessons: ['Planning a piece', 'Composition', 'Finishing and framing'],
    },
  ],
  'typography-in-ui-design': [
    {
      title: 'Type basics',
      lessons: ['Anatomy of type', 'Serif, sans and beyond', 'Choosing typefaces'],
    },
    {
      title: 'Hierarchy',
      lessons: ['Type scale', 'Line height and spacing', 'Alignment and grids', 'Pairing fonts'],
    },
    {
      title: 'Typography in practice',
      lessons: ['Readability on mobile', 'Accessibility and dynamic type', 'A typography audit'],
    },
  ],
  'mobile-app-design': [
    {
      title: 'From idea to plan',
      lessons: ['Finding an app idea', 'Writing the brief', 'User stories and flows'],
    },
    {
      title: 'Designing screens',
      lessons: ['Wireframes', 'Visual style', 'Key screens', 'Onboarding and empty states'],
    },
    {
      title: 'Prototype and test',
      lessons: ['Clickable prototype', 'Testing with users', 'Iterating on feedback'],
    },
  ],
  'digital-poster': [
    {
      title: 'Poster basics',
      lessons: ['What makes a poster work?', 'Sizes and formats', 'Layout and hierarchy'],
    },
    {
      title: 'Creating the poster',
      lessons: ['Working with images', 'Type on posters', 'Colour and contrast', 'Adding effects'],
    },
    { title: 'Export', lessons: ['Print-ready files', 'Social media versions'] },
  ],
  'patterns-design': [
    {
      title: 'Pattern basics',
      lessons: ['What is a pattern?', 'Motifs and repeats', 'Colour in patterns'],
    },
    {
      title: 'Making patterns',
      lessons: ['Half-drop and brick repeats', 'Seamless tiles', 'Organic patterns'],
    },
    {
      title: 'Using patterns',
      lessons: ['Patterns on products', 'Patterns in UI', 'Building a pattern collection'],
    },
  ],
  'php-in-one-click': [
    {
      title: 'PHP basics',
      lessons: ['Hello, World!', 'Variables and types', 'Conditions and loops', 'Functions'],
    },
    {
      title: 'Web programming',
      lessons: ['Forms and requests', 'Sessions and cookies', 'Working with files'],
    },
    {
      title: 'Databases',
      lessons: ['Connecting to MySQL', 'Reading and writing data', 'Security basics'],
    },
    { title: 'Project', lessons: ['Planning the guestbook', 'Building and testing'] },
  ],
  'python-introduction': [
    {
      title: 'Getting started',
      lessons: ['Installing Python', 'Variables and types', 'Input and output'],
    },
    { title: 'Control flow', lessons: ['Conditions', 'Loops', 'Functions'] },
    {
      title: 'Working with data',
      lessons: ['Lists and dictionaries', 'Reading and writing files', 'Handling errors'],
    },
    { title: 'Project', lessons: ['File organiser project'] },
  ],
  'javascript-for-beginners': [
    {
      title: 'Language basics',
      lessons: ['Variables and data types', 'Functions', 'Arrays and objects'],
    },
    { title: 'The browser', lessons: ['The DOM', 'Events', 'Forms and validation'] },
    {
      title: 'Asynchronous JavaScript',
      lessons: ['Timers and promises', 'Fetching data', 'Async and await'],
    },
    { title: 'Project', lessons: ['Building the to-do app', 'Saving to local storage'] },
  ],
  'sql-essentials': [
    {
      title: 'Getting started',
      lessons: ['What is a database?', 'Your first SELECT', 'Filtering and sorting'],
    },
    { title: 'Working with tables', lessons: ['Joins', 'Grouping and aggregates', 'Subqueries'] },
    { title: 'Changing data', lessons: ['INSERT, UPDATE and DELETE', 'Designing tables'] },
  ],
  'java-fundamentals': [
    {
      title: 'Java basics',
      lessons: ['Setting up Java', 'Types and variables', 'Control flow', 'Methods'],
    },
    {
      title: 'Object-oriented Java',
      lessons: ['Classes and objects', 'Inheritance', 'Interfaces', 'Collections'],
    },
    { title: 'Robust code', lessons: ['Exceptions', 'Reading files', 'Library project'] },
  ],
  'project-management-essentials': [
    {
      title: 'Starting a project',
      lessons: ['What is a project?', 'Defining scope and goals', 'Stakeholders'],
    },
    {
      title: 'Planning',
      lessons: ['Breaking down work', 'Estimating time and cost', 'Scheduling', 'Managing risks'],
    },
    {
      title: 'Delivering',
      lessons: ['Tracking progress', 'Communication and meetings', 'Closing and lessons learned'],
    },
  ],
  'digital-marketing-101': [
    {
      title: 'Marketing foundations',
      lessons: ['Marketing in the digital age', 'Know your audience', 'Positioning and message'],
    },
    { title: 'Channels', lessons: ['Search and content', 'Social media', 'Email marketing'] },
    {
      title: 'Campaigns and results',
      lessons: ['Planning a campaign', 'Key metrics and analytics', 'Testing and improving'],
    },
  ],
  'creative-writing-workshop': [
    {
      title: 'Starting to write',
      lessons: ['Finding ideas', 'Building a writing habit', 'Point of view'],
    },
    { title: 'Story craft', lessons: ['Characters', 'Scenes and dialogue', 'Plot and structure'] },
    {
      title: 'Editing',
      lessons: ['Revising your draft', 'Giving and receiving feedback', 'Sharing your work'],
    },
  ],
  'copywriting-that-sells': [
    {
      title: 'Copy basics',
      lessons: ['What is copywriting?', 'Know your reader', 'Voice and tone'],
    },
    {
      title: 'Writing to sell',
      lessons: ['Headlines that work', 'Product pages', 'Emails and calls to action'],
    },
    { title: 'Improve your copy', lessons: ['Editing and shortening', 'Testing headlines'] },
  ],
  'filmmaking-basics': [
    {
      title: 'Before the shoot',
      lessons: ['Story and idea', 'Scripts and storyboards', 'Planning the shoot'],
    },
    {
      title: 'On set',
      lessons: ['Framing and camera moves', 'Lighting basics', 'Recording sound'],
    },
    {
      title: 'After the shoot',
      lessons: ['Reviewing footage', 'Editing basics', 'Sharing your film'],
    },
  ],
  'video-editing-essentials': [
    {
      title: 'Getting started',
      lessons: ['Editing workflow', 'Organising footage', 'The timeline'],
    },
    {
      title: 'Editing',
      lessons: ['Cutting and rhythm', 'Music and sound', 'Titles and transitions'],
    },
    { title: 'Finishing', lessons: ['Colour correction', 'Exporting your video'] },
  ],
  'english-conversation': [
    {
      title: 'Everyday English',
      lessons: ['Greetings and introductions', 'Talking about yourself', 'Asking questions'],
    },
    {
      title: 'At work and travel',
      lessons: ['Small talk at work', 'Meetings and calls', 'Travel and directions'],
    },
    {
      title: 'Sounding natural',
      lessons: ['Pronunciation tips', 'Common idioms', 'Listening practice'],
    },
  ],
  'spanish-for-travelers': [
    {
      title: 'First words',
      lessons: ['Greetings and politeness', 'Numbers and money', 'Pronunciation'],
    },
    {
      title: 'On the road',
      lessons: ['At the airport and hotel', 'Ordering food', 'Getting around'],
    },
    {
      title: 'In the city',
      lessons: ['Shopping and markets', 'Emergencies and health', 'Making friends'],
    },
  ],
};
