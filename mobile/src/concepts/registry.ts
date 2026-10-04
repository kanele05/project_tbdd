import type { ComponentType } from 'react';

import { CourseScreenA } from './a/CourseScreen';
import { HomeScreenA } from './a/HomeScreen';
import { CourseScreenB } from './b/CourseScreen';
import { HomeScreenB } from './b/HomeScreen';
import { CourseScreenC } from './c/CourseScreen';
import { HomeScreenC } from './c/HomeScreen';
import { conceptFontAssets } from './shared/fonts';
import type { ConceptId, ConceptScreen } from './shared/types';

type ConceptEntry = {
  name: string;
  tagline: string;
  screens: Record<ConceptScreen, ComponentType>;
  fonts: (typeof conceptFontAssets)[ConceptId];
};

export const CONCEPTS: Record<ConceptId, ConceptEntry> = {
  a: {
    name: 'A · Spark',
    tagline: 'Năng động + gamification',
    screens: { home: HomeScreenA, course: CourseScreenA },
    fonts: conceptFontAssets.a,
  },
  b: {
    name: 'B · Noir',
    tagline: 'Premium, dark-first',
    screens: { home: HomeScreenB, course: CourseScreenB },
    fonts: conceptFontAssets.b,
  },
  c: {
    name: 'C · Aurora',
    tagline: 'Glassmorphism hiện đại',
    screens: { home: HomeScreenC, course: CourseScreenC },
    fonts: conceptFontAssets.c,
  },
};
