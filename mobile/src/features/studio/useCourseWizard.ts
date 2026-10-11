import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useAiDraftStore } from './aiDraftStore';
import { useCourseEditor } from './useCourseEditor';
import {
  nextStep,
  previousStep,
  STEP_FIELDS,
  stepIndex,
  WIZARD_STEPS,
  type WizardStep,
} from './wizardSteps';

/** Saves the curriculum draft of a revision when the teacher leaves the Lessons step. */
export type FlushCurriculum = () => Promise<boolean>;

function leaveWizard(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/studio');
}

/**
 * Navigation of the 5-step course wizard (SC-24) on top of `useCourseEditor`. Leaving a step
 * autosaves it: going forward needs the save to succeed (errors stay on the step), going back
 * never blocks. A new course exists only after step 1 (title + category) created the draft.
 */
export function useCourseWizard(routeCourseId: string, initialStep: WizardStep) {
  const editor = useCourseEditor(routeCourseId);
  const [step, setStep] = useState<WizardStep>(initialStep);
  const [isMoving, setIsMoving] = useState(false);
  const flushRef = useRef<FlushCurriculum | null>(null);
  const registerFlush = useCallback((flush: FlushCurriculum | null) => {
    flushRef.current = flush;
  }, []);

  // The AI outline queues "planned" lessons: show them as soon as they appear.
  const plannedCount = useAiDraftStore((state) => Object.keys(state.plannedLessons).length);
  const [seenPlanned, setSeenPlanned] = useState(plannedCount);
  if (plannedCount !== seenPlanned) {
    setSeenPlanned(plannedCount);
    if (seenPlanned === 0 && !editor.isCreate) setStep('lessons');
  }

  const saveStep = async (from: WizardStep): Promise<boolean> => {
    if (from === 'lessons') return flushRef.current ? flushRef.current() : true;
    return editor.saveFields(STEP_FIELDS[from]);
  };

  /** Autosaves the current step, then shows `target`. */
  const goTo = async (target: WizardStep) => {
    if (target === step || isMoving) return;
    setIsMoving(true);
    try {
      const isSaved = await saveStep(step);
      if (isSaved || stepIndex(target) < stepIndex(step)) setStep(target);
    } finally {
      setIsMoving(false);
    }
  };

  /** Saves everything the form holds (the Review step does this before submitting). */
  const saveAll = () =>
    editor.saveFields(WIZARD_STEPS.flatMap((wizardStep) => [...STEP_FIELDS[wizardStep]]));

  const next = async () => {
    const target = nextStep(step);
    if (target) await goTo(target);
  };

  const back = async () => {
    const target = previousStep(step);
    if (target) await goTo(target);
    else leaveWizard();
  };

  return {
    ...editor,
    step,
    isBusy: isMoving || editor.isSaving,
    /** Jumping through the progress bar needs an existing course. */
    canJump: !editor.isCreate,
    registerFlush,
    goTo,
    next,
    back,
    saveAll,
  };
}
