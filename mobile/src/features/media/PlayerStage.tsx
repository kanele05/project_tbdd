import type { ReactNode } from 'react';
import { View } from 'react-native';

import { makeStyles } from '@/theme';

export type PlayerStageProps = {
  children: ReactNode;
  /** Cap for the height, so a wide screen does not push the content down (see `getPlayerMaxHeight`). */
  maxHeight?: number;
  /** Floor for the height (the YouTube embed needs at least 200 dp). */
  minHeight?: number;
  testID?: string;
};

/**
 * The 16:9 dark box of every video state (player, loading, error). The loading and error states are
 * drawn inside it, so the slot never grows taller than the video frame. Always dark, like a cinema
 * screen, also in light mode.
 */
export function PlayerStage({ children, maxHeight, minHeight, testID }: PlayerStageProps) {
  const styles = useStyles();
  return (
    <View
      style={[
        styles.stage,
        { minHeight, maxHeight },
        // When the height is capped (PC: 70% of the window) keep the box 16:9 and centered, so the
        // video is not left-aligned inside a wider dark box.
        maxHeight === undefined ? null : { maxWidth: (maxHeight * 16) / 9, alignSelf: 'center' },
      ]}
      testID={testID}
    >
      {children}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  stage: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    backgroundColor: t.colors.scrim,
  },
}));
