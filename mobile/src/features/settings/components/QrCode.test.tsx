import { render, screen } from '@testing-library/react-native';

import { buildQrMatrix, QrCode } from './QrCode';

const URL_A = 'otpauth://totp/E-Learning:a%40b.co?secret=JBSWY3DPEHPK3PXP&issuer=E-Learning';

describe('buildQrMatrix', () => {
  it('encodes the text into a square symbol with dark modules', () => {
    const { size, path } = buildQrMatrix(URL_A);

    // Version 1 is 21 modules wide; each version adds 4.
    expect(size).toBeGreaterThanOrEqual(21);
    expect((size - 21) % 4).toBe(0);
    expect(path).toMatch(/^M\d+ \d+h\d+v1h-\d+z/);
  });

  it('draws the three finder squares (a dark module in each corner area)', () => {
    const { size, path } = buildQrMatrix(URL_A);
    // Row 0 starts with a 7-module dark run at the top-left and top-right finders.
    expect(path).toContain('M0 0h7v1h-7z');
    expect(path).toContain(`M${size - 7} 0h7v1h-7z`);
  });

  it('gives different symbols for different text', () => {
    expect(buildQrMatrix(URL_A).path).not.toBe(buildQrMatrix(`${URL_A}2`).path);
  });
});

describe('QrCode', () => {
  it('renders an image with the accessible label', async () => {
    await render(<QrCode value={URL_A} accessibilityLabel="QR code to scan" />);
    expect(screen.getByLabelText('QR code to scan')).toBeOnTheScreen();
  });
});
