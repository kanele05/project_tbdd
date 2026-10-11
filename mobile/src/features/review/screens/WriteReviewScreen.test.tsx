import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';
import type { ReviewDto } from '@/types/api';

import { WriteReviewScreen } from './WriteReviewScreen';

const mockBack = jest.fn();
const mockMutateAsync = jest.fn();
const mockRefetch = jest.fn();
let mockMyReview: Record<string, unknown> = {};

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    replace: jest.fn(),
    canGoBack: () => true,
  },
}));

jest.mock('../hooks', () => ({
  useMyReview: () => mockMyReview,
  useSaveReview: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

const EXISTING: ReviewDto = {
  id: 'review-1',
  rating: 4,
  content: 'Great course, I learned a lot from it.',
  createdAt: new Date().toISOString(),
  user: { id: 'user-1', fullName: 'Rosie', avatarUrl: null },
  teacherReply: null,
  teacherRepliedAt: null,
};

function setMyReview(overrides: Record<string, unknown>) {
  mockMyReview = {
    data: null,
    isPending: false,
    isError: false,
    error: null,
    fetchStatus: 'idle',
    refetch: mockRefetch,
    ...overrides,
  };
}

async function renderScreen() {
  return render(
    <ToastProvider>
      <WriteReviewScreen courseId="course-1" />
    </ToastProvider>,
  );
}

describe('WriteReviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMyReview({});
  });

  it('asks for a rating and at least 10 characters before submitting', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Select a rating from 1 to 5 stars')).toBeOnTheScreen();
    expect(screen.getByText('Write at least 10 characters')).toBeOnTheScreen();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('rejects a review shorter than 10 characters', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('radio', { name: '5 stars' }));
    await fireEvent.changeText(screen.getByLabelText('Your review'), 'too short');
    await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Write at least 10 characters')).toBeOnTheScreen();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('counts the characters while typing', async () => {
    await renderScreen();
    expect(screen.getByText('0/1000')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Your review'), 'Really helpful!');

    expect(screen.getByText('15/1000')).toBeOnTheScreen();
  });

  it('limits the text to 1000 characters', async () => {
    await renderScreen();

    expect(screen.getByLabelText('Your review').props.maxLength).toBe(1000);
  });

  it('submits the rating and the trimmed text, then closes with a toast', async () => {
    mockMutateAsync.mockResolvedValue(EXISTING);
    await renderScreen();

    await fireEvent.press(screen.getByRole('radio', { name: '5 stars' }));
    await fireEvent.changeText(screen.getByLabelText('Your review'), '  Clear and practical.  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({ rating: 5, content: 'Clear and practical.' }),
    );
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(await screen.findByText('Thanks! Your review was saved.')).toBeOnTheScreen();
  });

  it('opens pre-filled when the user already reviewed the course', async () => {
    setMyReview({ data: EXISTING });
    await renderScreen();

    expect(screen.getByLabelText('Your review').props.value).toBe(EXISTING.content);
    expect(screen.getByRole('radio', { name: '4 stars' })).toBeSelected();
  });

  it('edits the existing review', async () => {
    setMyReview({ data: EXISTING });
    mockMutateAsync.mockResolvedValue(EXISTING);
    await renderScreen();

    await fireEvent.press(screen.getByRole('radio', { name: '2 stars' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({ rating: 2, content: EXISTING.content }),
    );
  });

  it('shows the "You\'re offline" toast when the save is blocked', async () => {
    mockMutateAsync.mockRejectedValue(
      new AppError({ status: 0, code: 'OFFLINE', message: "You're offline" }),
    );
    await renderScreen();

    await fireEvent.press(screen.getByRole('radio', { name: '3 stars' }));
    await fireEvent.changeText(screen.getByLabelText('Your review'), 'Okay but a bit slow.');
    await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText("You're offline")).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('puts server validation errors under the field', async () => {
    mockMutateAsync.mockRejectedValue(
      new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid',
        details: { content: 'Review contains forbidden words' },
      }),
    );
    await renderScreen();

    await fireEvent.press(screen.getByRole('radio', { name: '3 stars' }));
    await fireEvent.changeText(screen.getByLabelText('Your review'), 'Some long enough text.');
    await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Review contains forbidden words')).toBeOnTheScreen();
  });

  it('goes back with a message when the user is not enrolled (403)', async () => {
    mockMutateAsync.mockRejectedValue(
      new AppError({ status: 403, code: 'NOT_ENROLLED', message: 'Not enrolled' }),
    );
    await renderScreen();

    await fireEvent.press(screen.getByRole('radio', { name: '3 stars' }));
    await fireEvent.changeText(screen.getByLabelText('Your review'), 'Some long enough text.');
    await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('closes the modal with the X button', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('shows an error with Retry when the existing review cannot be loaded', async () => {
    setMyReview({
      data: undefined,
      isError: true,
      error: new AppError({ status: 500, code: 'INTERNAL_ERROR', message: 'boom' }),
    });
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeOnTheScreen();
  });

  it('does not show the form while offline without cached data', async () => {
    setMyReview({ data: undefined, isPending: true, fetchStatus: 'paused' });
    await renderScreen();

    expect(screen.getByText(/No internet connection/)).toBeOnTheScreen();
  });
});
