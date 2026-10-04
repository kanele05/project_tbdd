import QRCode from 'qrcode';
import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

/** Quiet zone around the symbol, in modules (the QR spec asks for 4; scanners need it). */
const QUIET_ZONE = 4;

/** Dark and light are fixed on purpose: scanners need black on white, even in dark mode. */
const DARK = '#000000';
const LIGHT = '#FFFFFF';

export type QrMatrix = { size: number; path: string };

/**
 * Encode `text` and describe the dark modules as one SVG path (horizontal runs merged, so a typical
 * 33 x 33 symbol is a few hundred short segments).
 */
export function buildQrMatrix(text: string): QrMatrix {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const { size } = modules;
  let path = '';
  for (let row = 0; row < size; row += 1) {
    let runStart = -1;
    for (let column = 0; column <= size; column += 1) {
      const isDark = column < size && modules.get(row, column) !== 0;
      if (isDark && runStart < 0) runStart = column;
      if (!isDark && runStart >= 0) {
        path += `M${runStart} ${row}h${column - runStart}v1h-${column - runStart}z`;
        runStart = -1;
      }
    }
  }
  return { size, path };
}

type QrCodeProps = {
  /** Text to encode (the `otpauth://` URL). */
  value: string;
  /** Edge length in dp. */
  size?: number;
  accessibilityLabel: string;
};

/** QR code drawn with react-native-svg (works on Android, iOS and web). */
export function QrCode({ value, size = 200, accessibilityLabel }: QrCodeProps) {
  const matrix = useMemo(() => buildQrMatrix(value), [value]);
  const total = matrix.size + QUIET_ZONE * 2;
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${total} ${total}`}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID="qr-code"
    >
      <Rect x={-QUIET_ZONE} y={-QUIET_ZONE} width={total} height={total} fill={LIGHT} />
      <Path d={matrix.path} fill={DARK} />
    </Svg>
  );
}
