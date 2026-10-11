import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing } from '@/theme';

import { stepIndex, WIZARD_STEPS, type WizardStep } from '../../wizardSteps';

export type WizardProgressProps = {
  current: WizardStep;
  onSelect: (step: WizardStep) => void;
  /** Segments other than the current one can be tapped (needs an existing course). */
  canJump: boolean;
  /** A save is running: taps are ignored. */
  isBusy?: boolean;
};

/**
 * Progress bar of the course wizard: five segments with the step names under them. Segments up
 * to the current step are filled; a tap jumps to that step (the current step is saved first).
 */
export function WizardProgress({
  current,
  onSelect,
  canJump,
  isBusy = false,
}: WizardProgressProps) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const currentIndex = stepIndex(current);
  return (
    <View style={styles.row} accessibilityLabel={t('wizard.stepsLabel')} testID="wizard-progress">
      {WIZARD_STEPS.map((step, index) => {
        const isCurrent = step === current;
        const name = t(`wizard.steps.${step}`);
        const isDisabled = isCurrent || !canJump || isBusy;
        return (
          <Pressable
            key={step}
            onPress={() => onSelect(step)}
            disabled={isDisabled}
            accessibilityRole="button"
            accessibilityLabel={t('wizard.stepLabel', {
              current: index + 1,
              total: WIZARD_STEPS.length,
              name,
            })}
            accessibilityState={{ selected: isCurrent, disabled: isDisabled && !isCurrent }}
            style={styles.segment}
            testID={`wizard-step-${step}`}
          >
            <View style={[styles.bar, index <= currentIndex ? styles.barDone : null]} />
            <AppText
              variant="micro"
              align="center"
              numberOfLines={2}
              color={isCurrent ? 'text' : 'textMuted'}
              family={isCurrent ? 'bodyBold' : 'bodySemiBold'}
            >
              {name}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const BAR_HEIGHT = 4;

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.xs,
  },
  segment: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    gap: spacing.xs,
    justifyContent: 'flex-start',
    paddingTop: spacing.xs,
  },
  bar: { height: BAR_HEIGHT, borderRadius: radius.pill, backgroundColor: t.colors.border },
  barDone: { backgroundColor: t.colors.primary },
}));
