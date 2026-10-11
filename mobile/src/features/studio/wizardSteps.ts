import type { CourseFormValues } from './courseForm';

/** The five steps of the course wizard (SC-24), in order. */
export const WIZARD_STEPS = ['idea', 'intro', 'price', 'lessons', 'review'] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export const FIRST_STEP: WizardStep = 'idea';
export const LAST_STEP: WizardStep = 'review';

/** Form fields each step edits; leaving a step validates and saves exactly these. */
export const STEP_FIELDS: Record<WizardStep, readonly (keyof CourseFormValues)[]> = {
  idea: ['title', 'categoryId'],
  intro: ['subtitle', 'description', 'benefits', 'projectDescription', 'thumbnailUrl'],
  price: ['price', 'originalPrice', 'tagIds'],
  lessons: [],
  review: [],
};

export function isWizardStep(value: unknown): value is WizardStep {
  return typeof value === 'string' && (WIZARD_STEPS as readonly string[]).includes(value);
}

/** `?step=` of the edit route: unknown or missing values open the first step. */
export function parseStep(value: string | string[] | undefined): WizardStep {
  const raw = Array.isArray(value) ? value[0] : value;
  return isWizardStep(raw) ? raw : FIRST_STEP;
}

export function stepIndex(step: WizardStep): number {
  return WIZARD_STEPS.indexOf(step);
}

export function nextStep(step: WizardStep): WizardStep | null {
  return WIZARD_STEPS[stepIndex(step) + 1] ?? null;
}

export function previousStep(step: WizardStep): WizardStep | null {
  return WIZARD_STEPS[stepIndex(step) - 1] ?? null;
}
