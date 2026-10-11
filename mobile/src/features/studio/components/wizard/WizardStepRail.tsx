import Feather from '@expo/vector-icons/Feather';
import { Pressable, View } from 'react-native';

import { DESKTOP_NAV_HEIGHT } from '@/components/layout/desktopLayout';
import { useHover } from '@/components/layout/useHover';
import { pointerStyle, stickyTopStyle } from '@/components/layout/work';
import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

import type { WizardProgressProps } from './WizardProgress';
import { stepIndex, WIZARD_STEPS, type WizardStep } from '../../wizardSteps';

export type WizardStepRailProps = WizardProgressProps;

type StepItemProps = {
  step: WizardStep;
  index: number;
  isLast: boolean;
} & WizardStepRailProps;

function StepItem({
  step,
  index,
  isLast,
  current,
  onSelect,
  canJump,
  isBusy = false,
}: StepItemProps) {
  const { t } = useTranslation('studio');
  const { colors } = useTheme();
  const styles = useStyles();
  const { isHovered, hoverProps } = useHover();
  const currentIndex = stepIndex(current);
  const isCurrent = step === current;
  const isDone = index < currentIndex;
  const isDisabled = isCurrent || !canJump || isBusy;
  const name = t(`wizard.steps.${step}`);
  return (
    <View>
      <Pressable
        {...hoverProps}
        onPress={() => onSelect(step)}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={t('wizard.stepLabel', {
          current: index + 1,
          total: WIZARD_STEPS.length,
          name,
        })}
        accessibilityState={{ selected: isCurrent, disabled: isDisabled && !isCurrent }}
        style={[
          styles.item,
          isCurrent ? styles.itemCurrent : null,
          isHovered && !isDisabled ? styles.itemHover : null,
          isDisabled ? null : pointerStyle,
        ]}
        testID={`wizard-step-${step}`}
      >
        <View style={[styles.marker, isCurrent || isDone ? styles.markerOn : null]}>
          {isDone ? (
            <Feather name="check" size={14} color={colors.onPrimary} />
          ) : (
            <AppText
              variant="micro"
              family="bodyBold"
              style={{ color: isCurrent ? colors.onPrimary : colors.textSecondary }}
            >
              {index + 1}
            </AppText>
          )}
        </View>
        <AppText
          variant="label"
          family={isCurrent ? 'bodyBold' : 'bodySemiBold'}
          color={isCurrent ? 'text' : 'textSecondary'}
          style={styles.name}
        >
          {name}
        </AppText>
      </Pressable>
      {isLast ? null : <View style={[styles.line, isDone ? styles.lineOn : null]} />}
    </View>
  );
}

/**
 * Vertical step list of the course wizard on a desktop window (replaces the progress bar): numbered
 * markers joined by a line, done steps ticked, the current one highlighted. It clicks like the
 * progress bar (jump to a step after saving the current one) and stays in view while the form scrolls.
 */
export function WizardStepRail(props: WizardStepRailProps) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  return (
    <View
      style={[styles.rail, stickyTopStyle(DESKTOP_NAV_HEIGHT + spacing.lg)]}
      accessibilityLabel={t('wizard.stepsLabel')}
      testID="wizard-progress"
    >
      <AppText variant="micro" family="bodySemiBold" color="textSecondary" uppercase>
        {t('desktop.stepsLabel')}
      </AppText>
      <View>
        {WIZARD_STEPS.map((step, index) => (
          <StepItem
            key={step}
            step={step}
            index={index}
            isLast={index === WIZARD_STEPS.length - 1}
            {...props}
          />
        ))}
      </View>
    </View>
  );
}

const MARKER = 28;

const useStyles = makeStyles((t) => ({
  // `alignSelf: flex-start` keeps the rail as tall as its content, which `position: sticky` needs.
  rail: { alignSelf: 'flex-start', width: 240, flexShrink: 0, gap: spacing.md },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.button,
  },
  itemCurrent: { backgroundColor: t.colors.primarySoft },
  itemHover: { backgroundColor: t.colors.surfaceAlt },
  marker: {
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  markerOn: { borderColor: t.colors.primary, backgroundColor: t.colors.primary },
  name: { flex: 1 },
  line: {
    width: 2,
    height: spacing.md,
    marginLeft: spacing.sm + MARKER / 2 - 1,
    backgroundColor: t.colors.border,
  },
  lineOn: { backgroundColor: t.colors.primary },
}));
