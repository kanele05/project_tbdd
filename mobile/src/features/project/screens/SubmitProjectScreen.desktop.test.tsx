import { fireEvent, render, screen } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';

import { ToastProvider } from '@/components/ui/Toast';

import { SubmitProjectScreen } from './SubmitProjectScreen';

const mockBack = jest.fn();

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1280, height: 900, scale: 1, fontScale: 1 })),
}));
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), canGoBack: () => true, replace: jest.fn() },
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('../hooks', () => ({
  useSubmitProject: () => ({ submit: jest.fn(), isPending: false, progress: 0 }),
}));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;
const setWidth = (width: number) =>
  mockUseWindowDimensions.mockReturnValue({ width, height: 900, scale: 1, fontScale: 1 });

async function renderScreen() {
  return render(
    <ToastProvider>
      <SubmitProjectScreen courseId="c1" />
    </ToastProvider>,
  );
}

describe('SubmitProjectScreen on a PC window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWidth(1280);
  });

  it('is a dialog card with the form and the submit button pinned in its footer', async () => {
    await renderScreen();

    expect(screen.getByTestId('submit-project-dialog-card')).toBeOnTheScreen();
    expect(screen.getByTestId('project-file-field')).toBeOnTheScreen();
    expect(screen.getByTestId('submit-project-button')).toBeOnTheScreen();
  });

  it('closes with the close button and with a click on the backdrop', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    await fireEvent.press(screen.getByTestId('submit-project-dialog-backdrop', { hidden: true }));

    expect(mockBack).toHaveBeenCalledTimes(2);
  });

  it('keeps the phone layout under 768 dp', async () => {
    setWidth(390);
    await renderScreen();

    expect(screen.queryByTestId('submit-project-dialog')).not.toBeOnTheScreen();
    expect(screen.getByTestId('submit-project-button')).toBeOnTheScreen();
  });
});
