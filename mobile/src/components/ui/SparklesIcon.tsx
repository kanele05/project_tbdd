import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export type SparklesIconProps = {
  /** Glyph size in dp. Default 22. */
  size?: number;
  color: string;
  /** Stroke width in the 24-unit viewBox. Default 2.2. */
  strokeWidth?: number;
};

/** The "sparkles" mark of every AI entry point (Feather has no such glyph). Single shared drawing. */
function SparklesIconBase({ size = 22, color, strokeWidth = 2.2 }: SparklesIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M20 3v4M22 5h-4M4 17v2M5 18H3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export const SparklesIcon = memo(SparklesIconBase);
