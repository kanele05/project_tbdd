import {
  nextStep,
  parseStep,
  previousStep,
  STEP_FIELDS,
  stepIndex,
  WIZARD_STEPS,
} from './wizardSteps';

describe('parseStep', () => {
  it('accepts the five step names and falls back to the first step', () => {
    expect(parseStep('price')).toBe('price');
    expect(parseStep(['lessons', 'x'])).toBe('lessons');
    expect(parseStep('nope')).toBe('idea');
    expect(parseStep(undefined)).toBe('idea');
  });
});

describe('step order', () => {
  it('walks forward and backward and stops at both ends', () => {
    expect(nextStep('idea')).toBe('intro');
    expect(nextStep('lessons')).toBe('review');
    expect(nextStep('review')).toBeNull();
    expect(previousStep('intro')).toBe('idea');
    expect(previousStep('idea')).toBeNull();
    expect(stepIndex('review')).toBe(WIZARD_STEPS.length - 1);
  });

  it('gives every form field to exactly one step', () => {
    const all = WIZARD_STEPS.flatMap((step) => STEP_FIELDS[step]);
    expect(new Set(all).size).toBe(all.length);
    expect(all).toHaveLength(10);
  });
});
