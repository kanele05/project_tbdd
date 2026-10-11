import { fireEvent, render, screen } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';

import { ToastProvider } from '@/components/ui/Toast';

import { WriteReviewScreen } from './WriteReviewScreen';

const mockBack = jest.fn();

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1280, height: 900, scale: 1, fontScale: 1 })),
}));
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), replace: jest.fn(), canGoBack: () => true },
}));
jest.mock('../hooks', () => ({
  useMyReview: () => ({
    data: null,
    isPending: false,
    isError: false,
    error: null,
    fetchStatus: 'idle',
    refetch: jest.fn(),
  }),
  useSaveReview: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;
const setWidth = (width: number) =>
  mockUseWindowDimensions.mockReturnValue({ width, height: 900, scale: 1, fontScale: 1 });

async function renderScreen() {
  return render(
    <ToastProvider>
      <WriteReviewScreen courseId="course-1" />
    </ToastProvider>,
  );
}

describe('WriteReviewScreen on a PC window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWidth(1280);
  });

  it('is a dialog card with the review form', async () => {
    await renderScreen();

    expect(screen.getByTestId('write-review-dialog-card')).toBeOnTheScreen();
    expect(screen.getByText('Your rating')).toBeOnTheScreen();
  });

  it('closes with the close button and with a click on the backdrop', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    await fireEvent.press(screen.getByTestId('write-review-dialog-backdrop', { hidden: true }));

    expect(mockBack).toHaveBeenCalledTimes(2);
  });

  it('keeps the phone layout under 768 dp', async () => {
    setWidth(390);
    await renderScreen();

    expect(screen.queryByTestId('write-review-dialog')).not.toBeOnTheScreen();
    expect(screen.getByText('Your rating')).toBeOnTheScreen();
  });
});
