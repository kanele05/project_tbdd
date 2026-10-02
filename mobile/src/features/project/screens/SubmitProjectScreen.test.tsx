import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui/Toast';
import { MAX_UPLOAD_BYTES } from '@/constants/config';
import { AppError } from '@/lib/appError';

import { SubmitProjectScreen } from './SubmitProjectScreen';

const mockBack = jest.fn();
const mockSubmit = jest.fn();
const mockGetDocument = jest.fn();
const mockLaunchImageLibrary = jest.fn();
let mockPending = false;

jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), canGoBack: () => true, replace: jest.fn() },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocument(...args),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibrary(...args),
}));

jest.mock('../hooks', () => ({
  useSubmitProject: () => ({ submit: mockSubmit, isPending: mockPending, progress: 42 }),
}));

function pickedDocument(name: string, size = 2048, mimeType = 'application/zip') {
  mockGetDocument.mockResolvedValue({
    canceled: false,
    assets: [{ uri: `file:///cache/${name}`, name, size, mimeType, lastModified: 0 }],
  });
}

async function renderScreen() {
  return render(
    <ToastProvider>
      <SubmitProjectScreen courseId="c1" />
    </ToastProvider>,
  );
}

async function chooseFile() {
  await fireEvent.press(screen.getByRole('button', { name: 'Choose project file' }));
}

describe('SubmitProjectScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPending = false;
  });

  it('requires a title', async () => {
    await renderScreen();
    pickedDocument('work.zip');
    await chooseFile();

    await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Title is required')).toBeOnTheScreen();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('requires a project file', async () => {
    await renderScreen();
    await fireEvent.changeText(screen.getByLabelText('Title'), 'My project');

    await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Choose a file to upload')).toBeOnTheScreen();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('rejects a file larger than 10 MB before uploading', async () => {
    await renderScreen();
    pickedDocument('big.zip', MAX_UPLOAD_BYTES + 1);

    await chooseFile();

    expect(await screen.findByText(/too large/i)).toBeOnTheScreen();
    expect(screen.queryByText('big.zip')).not.toBeOnTheScreen();
  });

  it('rejects an unsupported file type', async () => {
    await renderScreen();
    pickedDocument('virus.exe', 100, 'application/octet-stream');

    await chooseFile();

    expect(await screen.findByText(/Unsupported file type/)).toBeOnTheScreen();
  });

  it('shows the picked file with its size and lets the user remove it', async () => {
    await renderScreen();
    pickedDocument('work.zip', 2048);

    await chooseFile();

    expect(await screen.findByText('work.zip')).toBeOnTheScreen();
    expect(screen.getByText('2 KB')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove work.zip' }));
    expect(screen.queryByText('work.zip')).not.toBeOnTheScreen();
  });

  it('keeps the form untouched when the picker is cancelled', async () => {
    await renderScreen();
    mockGetDocument.mockResolvedValue({ canceled: true, assets: null });

    await chooseFile();

    expect(screen.getByRole('button', { name: 'Choose project file' })).toBeOnTheScreen();
  });

  it('submits title, description, file and cover then closes the modal', async () => {
    mockSubmit.mockResolvedValue({});
    await renderScreen();
    pickedDocument('work.zip');
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///cache/cover.png',
          fileName: 'cover.png',
          mimeType: 'image/png',
          fileSize: 1000,
          width: 10,
          height: 10,
        },
      ],
    });

    await fireEvent.changeText(screen.getByLabelText('Title'), '  My project  ');
    await fireEvent.changeText(screen.getByLabelText('Description (optional)'), 'Some notes');
    await chooseFile();
    await fireEvent.press(screen.getByRole('button', { name: 'Choose cover image' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    expect(mockSubmit).toHaveBeenCalledWith({
      title: 'My project',
      description: 'Some notes',
      file: expect.objectContaining({ name: 'work.zip', mimeType: 'application/zip' }),
      image: expect.objectContaining({ name: 'cover.png', mimeType: 'image/png' }),
    });
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('submits without a cover image or description when they are left empty', async () => {
    mockSubmit.mockResolvedValue({});
    await renderScreen();
    pickedDocument('work.zip');
    await fireEvent.changeText(screen.getByLabelText('Title'), 'Only title');
    await chooseFile();

    await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ description: undefined, image: null }),
    );
  });

  it.each([
    [413, 'FILE_TOO_LARGE', 'This file is too large (max 10 MB).'],
    [415, 'UNSUPPORTED_FILE_TYPE', 'This file type is not supported.'],
    [403, 'NOT_ENROLLED', 'You need to enroll in this course before submitting a project.'],
  ])('shows the %d error from the server and stays open', async (status, code, message) => {
    mockSubmit.mockRejectedValue(new AppError({ status, code, message: 'server' }));
    await renderScreen();
    pickedDocument('work.zip');
    await fireEvent.changeText(screen.getByLabelText('Title'), 'Title');
    await chooseFile();

    await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('shows the upload progress while submitting', async () => {
    mockPending = true;
    await renderScreen();

    expect(screen.getByText('Uploading... 42%')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar')).toBeOnTheScreen();
  });

  it('closes with the X button', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(mockBack).toHaveBeenCalled();
  });
});
