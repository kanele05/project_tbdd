import { Pressable, type PressableProps } from 'react-native';

import { useHover } from '@/components/layout/useHover';
import { AppText } from '@/components/ui/AppText';
import { makeStyles } from '@/theme';

export type AuthLinkProps = Pick<PressableProps, 'onPress' | 'hitSlop' | 'testID'> & {
  label: string;
  /** Screen-reader label; defaults to `label`. */
  accessibilityLabel?: string;
};

/** Inline text link of the auth screens: underlined on hover (web), neon-safe `primaryText` color. */
export function AuthLink({ label, accessibilityLabel, onPress, hitSlop, testID }: AuthLinkProps) {
  const styles = useStyles();
  const { isHovered, hoverProps } = useHover();
  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={styles.link}
    >
      <AppText variant="label" color="primaryText" style={isHovered ? styles.hovered : undefined}>
        {label}
      </AppText>
    </Pressable>
  );
}

const useStyles = makeStyles(() => ({
  link: { cursor: 'pointer' },
  hovered: { textDecorationLine: 'underline' },
}));
