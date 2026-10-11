import type { UseFormReturn } from 'react-hook-form';

import type { CourseFormValues } from '../../courseForm';
import type { CourseEditMode } from '../../editMode';

/** What every form step of the wizard (Idea, Intro, Price) receives. */
export type StepProps = {
  form: UseFormReturn<CourseFormValues>;
  mode: CourseEditMode;
  /** A save is running: inputs are disabled. */
  isBusy: boolean;
};
