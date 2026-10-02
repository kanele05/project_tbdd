/** 9 giảng viên - tên theo design (PLAN §11). Mỗi giảng viên = 1 User (role TEACHER) + 1 TeacherProfile. */
import { PHOTO, portrait, unsplash } from './media';

export type TeacherSeed = {
  key: string;
  userId: string;
  profileId: string;
  email: string;
  fullName: string;
  jobTitle: string;
  organization: string;
  location: string;
  /** Múi giờ IANA - dùng tính giờ địa phương (BR-16). */
  timezone: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
};

type TeacherInput = Omit<TeacherSeed, 'userId' | 'profileId' | 'email'>;

function teacher(input: TeacherInput): TeacherSeed {
  const slug = input.fullName.toLowerCase().replace(/\s+/g, '_');
  return {
    ...input,
    userId: `usr_${slug}`,
    profileId: `tch_${input.key}`,
    email: `${input.fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
  };
}

export const TEACHERS: readonly TeacherSeed[] = [
  teacher({
    key: 'ramono',
    fullName: 'Ramono Wultschner',
    jobTitle: 'Full-stack Designer & Developer',
    organization: 'Studio Wultschner',
    location: 'Vienna, Austria',
    timezone: 'Europe/Vienna',
    bio: 'Ramono has spent 12 years building websites and mobile products for start-ups across Europe. He teaches design and code together so students can take an idea from a sketch to a working product.',
    avatarUrl: portrait('men', 32),
    coverUrl: unsplash(PHOTO.deskFlatLay, 900),
  }),
  teacher({
    key: 'sara',
    fullName: 'Sara Weise',
    jobTitle: 'UX Design Lead',
    organization: 'Berlin Design Academy',
    location: 'Berlin, Germany',
    timezone: 'Europe/Berlin',
    bio: 'Sara leads a team of product designers and mentors newcomers to the UX field. Her classes focus on clear thinking, simple interfaces and practical portfolio work.',
    avatarUrl: portrait('women', 44),
    coverUrl: unsplash(PHOTO.tabletWireframe, 900),
  }),
  teacher({
    key: 'olivia',
    fullName: 'Olivia Wang',
    jobTitle: 'UX Researcher',
    organization: 'University of Toronto',
    location: 'Toronto, Canada',
    timezone: 'America/Toronto',
    bio: 'Olivia studies how people use technology and turns research findings into design decisions. She has run more than 200 usability studies for education and health products.',
    avatarUrl: portrait('women', 68),
    coverUrl: unsplash(PHOTO.wireframePaper, 900),
  }),
  teacher({
    key: 'ruth',
    fullName: 'Ruth Dominguez',
    jobTitle: 'Interior & Graphic Designer',
    organization: 'Madrid School of Arts',
    location: 'Madrid, Spain',
    timezone: 'Europe/Madrid',
    bio: 'Ruth designs calm, functional spaces and the graphics that go with them. She also writes and teaches Spanish, and loves helping people find their own creative voice.',
    avatarUrl: portrait('women', 12),
    coverUrl: unsplash(PHOTO.interiorChair, 900),
  }),
  teacher({
    key: 'hui',
    fullName: 'Hui Anderson',
    jobTitle: 'Brand & Packaging Designer',
    organization: 'Anderson Studio',
    location: 'Singapore',
    timezone: 'Asia/Singapore',
    bio: 'Hui creates brand identities and packaging for lifestyle companies in Asia and Europe. Her lessons are project based: you design something real from the first lesson.',
    avatarUrl: portrait('men', 46),
    coverUrl: unsplash(PHOTO.ribbons, 900),
  }),
  teacher({
    key: 'christian',
    fullName: 'Christian Hayes',
    jobTitle: 'Professor of Computer Science',
    organization: 'University of Oxford',
    location: 'Oxford, United Kingdom',
    timezone: 'Europe/London',
    bio: 'Christian teaches programming and databases to first-year students and online learners. He is known for explaining hard ideas with small, runnable examples.',
    avatarUrl: portrait('men', 85),
    coverUrl: unsplash(PHOTO.codeLaptop, 900),
  }),
  teacher({
    key: 'dennis',
    fullName: 'Dennis Sweeney',
    jobTitle: 'Product Designer & Lecturer',
    organization: 'University of Oxford',
    location: 'Boston, United States',
    timezone: 'America/New_York',
    bio: 'Dennis designs physical and digital products and lectures on the design process. He believes good products start with good questions and a lot of prototypes.',
    avatarUrl: portrait('women', 79),
    coverUrl: unsplash(PHOTO.phonesFlatLay, 900),
  }),
  teacher({
    key: 'kelly',
    fullName: 'Kelly Hamilton',
    jobTitle: 'Illustrator & Creative Director',
    organization: 'Hamilton Creative',
    location: 'Sydney, Australia',
    timezone: 'Australia/Sydney',
    bio: 'Kelly is an illustrator and film maker whose work has appeared in magazines and short films. She teaches drawing, colour, writing and storytelling with the same playful approach.',
    avatarUrl: portrait('women', 33),
    coverUrl: unsplash(PHOTO.paintBrushes, 900),
  }),
  teacher({
    key: 'ryan',
    fullName: 'Ryan Meyers',
    jobTitle: 'Business Consultant & Project Manager',
    organization: 'Meyers & Co.',
    location: 'Chicago, United States',
    timezone: 'America/Chicago',
    bio: 'Ryan has led projects from 3 to 300 people in software and consulting. He teaches practical planning, marketing and team skills you can use on Monday morning.',
    avatarUrl: portrait('men', 22),
    coverUrl: unsplash(PHOTO.teamWhiteboard, 900),
  }),
];

export const teacherByKey = (key: string): TeacherSeed => {
  const found = TEACHERS.find((t) => t.key === key);
  if (!found) throw new Error(`Unknown teacher "${key}" in seed data`);
  return found;
};
