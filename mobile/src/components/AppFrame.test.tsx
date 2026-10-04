import { screen } from '@testing-library/react-native';
import { Text, useWindowDimensions } from 'react-native';

import { MAX_CONTENT_WIDTH } from '@/constants/config';
import { renderWithProviders } from '@/test/renderWithProviders';

import { AppFrame } from './AppFrame';

jest.mock('@/features/learning/progressSync', () => ({ startPendingProgressSync: jest.fn() }));
jest.mock('@/hooks/useIsOnline', () => ({ useIsOnline: () => true }));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 390, height: 844, scale: 1, fontScale: 1 })),
}));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;

describe('AppFrame', () => {
  it('renders its children', async () => {
    await renderWithProviders(
      <AppFrame>
        <Text>content</Text>
      </AppFrame>,
    );
    expect(screen.getByText('content')).toBeOnTheScreen();
  });

  it('caps the content column at the max width and centers it', async () => {
    await renderWithProviders(
      <AppFrame>
        <Text>content</Text>
      </AppFrame>,
    );
    expect(screen.getByTestId('app-frame-column')).toHaveStyle({ maxWidth: MAX_CONTENT_WIDTH });
    expect(screen.getByTestId('app-frame')).toHaveStyle({ alignItems: 'center' });
  });

  it('draws the column edges on wide windows', async () => {
    mockUseWindowDimensions.mockReturnValue({ width: 1440, height: 900, scale: 1, fontScale: 1 });
    await renderWithProviders(
      <AppFrame>
        <Text>content</Text>
      </AppFrame>,
    );
    expect(screen.getByTestId('app-frame-column')).toHaveStyle({ borderLeftWidth: 1 });
  });

  it('draws no edges on a phone-sized window', async () => {
    mockUseWindowDimensions.mockReturnValue({ width: 390, height: 844, scale: 1, fontScale: 1 });
    await renderWithProviders(
      <AppFrame>
        <Text>content</Text>
      </AppFrame>,
    );
    expect(screen.getByTestId('app-frame-column')).not.toHaveStyle({ borderLeftWidth: 1 });
  });
});
