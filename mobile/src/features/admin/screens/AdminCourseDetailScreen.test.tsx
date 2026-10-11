import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';

import { showToast } from '@/components/ui/Toast';
import { renderWithClient } from '@/features/search/testUtils';
import { AppError } from '@/lib/appError';
import { confirmAction } from '@/utils/confirmAction';

import { adminApi } from '../api';
import { makeAiReview, makeDetail, makeDiff } from '../testFixtures';
import { AdminCourseDetailScreen } from './AdminCourseDetailScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
}));
jest.mock('../api', () => ({
  adminApi: {
    course: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    archive: jest.fn(),
    restore: jest.fn(),
    aiReview: jest.fn(),
  },
}));
jest.mock('@/components/ui/Toast', () => ({
  ...jest.requireActual('@/components/ui/Toast'),
  showToast: jest.fn(),
}));
jest.mock('@/utils/confirmAction', () => ({ confirmAction: jest.fn() }));

const api = jest.mocked(adminApi);
const mockConfirm = jest.mocked(confirmAction);

const REVISION = {
  id: 'r1',
  status: 'PENDING_REVIEW' as const,
  createdAt: '',
  updatedAt: '',
  submittedAt: '',
  missing: [],
  rejectionReason: null,
  payload: {
    title: 'New title',
    priceCents: 5900,
    originalPriceCents: null,
    categoryId: 'cat1',
    tagIds: [],
    sections: [
      {
        id: 's1',
        title: 'Basics',
        lessons: [
          {
            id: 'l1',
            title: 'Proposed lesson',
            videoUrl: 'https://www.youtube.com/watch?v=abc',
            durationSec: 300,
            isPreview: true,
            content: '',
          },
        ],
      },
    ],
  },
};

function renderScreen() {
  return renderWithClient(<AdminCourseDetailScreen courseId="c1" />);
}

describe('AdminCourseDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.course.mockResolvedValue(makeDetail());
  });

  it('shows a skeleton while loading', async () => {
    api.course.mockReturnValue(new Promise(() => undefined));
    await renderScreen();
    expect(screen.getByTestId('admin-course-skeleton')).toBeOnTheScreen();
  });

  it('previews the course content, curriculum and history', async () => {
    await renderScreen();

    expect((await screen.findAllByText('Learn TypeScript')).length).toBeGreaterThan(0);
    expect(screen.getByText('A long description of the course.')).toBeOnTheScreen();
    expect(screen.getByText('sara@example.com')).toBeOnTheScreen();
    expect(screen.getByText('Section 1: Basics')).toBeOnTheScreen();
    expect(screen.getByText('Intro lesson')).toBeOnTheScreen();
    expect(screen.getByText('Free preview')).toBeOnTheScreen();
    expect(screen.getByText('No valid video link')).toBeOnTheScreen();
    expect(screen.getByTestId('moderation-history')).toBeOnTheScreen();
    expect(screen.queryByTestId('revision-diff')).toBeNull();
  });

  it('opens the YouTube link and expands the lesson notes', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await renderScreen();

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Open the video of Intro lesson' }),
    );
    expect(open).toHaveBeenCalledWith('https://www.youtube.com/watch?v=abc');

    expect(screen.queryByText('Lesson notes here')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Show lesson notes' }));
    expect(screen.getByText('Lesson notes here')).toBeOnTheScreen();
    open.mockRestore();
  });

  it('shows the revision diff with before / after, additions and removals', async () => {
    api.course.mockResolvedValue(
      makeDetail({
        status: 'PUBLISHED',
        reviewTarget: 'REVISION',
        revision: REVISION,
        diff: makeDiff(),
      }),
    );
    await renderScreen();

    expect(await screen.findByTestId('revision-diff')).toBeOnTheScreen();
    expect(screen.getByText('Proposed curriculum')).toBeOnTheScreen();
    expect(screen.getByText('Proposed lesson')).toBeOnTheScreen();
    expect(screen.getByText('Old title')).toBeOnTheScreen();
    expect(screen.getByText('New title')).toBeOnTheScreen();
    const diff = within(screen.getByTestId('revision-diff'));
    expect(diff.getByText('$49')).toBeOnTheScreen();
    expect(diff.getByText('$59')).toBeOnTheScreen();
    expect(screen.getByText('Lesson added')).toBeOnTheScreen();
    expect(screen.getByText('Section added')).toBeOnTheScreen();
    expect(screen.getByText('Lesson removed')).toBeOnTheScreen();
    expect(screen.getByText('4 learner progress records will be lost')).toBeOnTheScreen();
    expect(screen.getByText('Lesson changed')).toBeOnTheScreen();
    expect(screen.getByText('Video link')).toBeOnTheScreen();
  });

  it('warns when the submission no longer meets the requirements', async () => {
    api.course.mockResolvedValue(makeDetail({ missing: [{ code: 'NO_THUMBNAIL' }] }));
    await renderScreen();

    expect(await screen.findByTestId('missing-notice')).toBeOnTheScreen();
    expect(screen.getByText(/There is no cover image/)).toBeOnTheScreen();
  });

  describe('AI pre-review', () => {
    it('runs on demand and lists the issues as advisory only', async () => {
      api.aiReview.mockResolvedValue(makeAiReview());
      await renderScreen();

      expect(api.aiReview).not.toHaveBeenCalled();
      await fireEvent.press(await screen.findByTestId('ai-review-run'));

      expect(await screen.findByTestId('ai-review-result')).toBeOnTheScreen();
      expect(api.aiReview).toHaveBeenCalledWith('c1', 'en');
      expect(screen.getByText('Needs attention')).toBeOnTheScreen();
      expect(screen.getByText('Price looks too high for the scope.')).toBeOnTheScreen();
      expect(screen.getByText('High')).toBeOnTheScreen();
      expect(screen.getByText(/Advisory only/)).toBeOnTheScreen();
    });

    it('asks in Vietnamese when the app is in Vietnamese', async () => {
      api.aiReview.mockResolvedValue(makeAiReview({ lang: 'vi' }));
      await renderWithClient(<AdminCourseDetailScreen courseId="c1" />, { language: 'vi' });

      await fireEvent.press(await screen.findByTestId('ai-review-run'));
      await screen.findByTestId('ai-review-result');
      expect(api.aiReview).toHaveBeenCalledWith('c1', 'vi');
    });

    it('shows a friendly message when the AI is rate limited and does not block approving', async () => {
      api.aiReview.mockRejectedValue(
        new AppError({
          status: 429,
          code: 'AI_RATE_LIMITED',
          message: 'x',
          details: { retryAfterSec: 30 },
        }),
      );
      await renderScreen();

      await fireEvent.press(await screen.findByTestId('ai-review-run'));
      expect(await screen.findByText(/AI assistant is busy/)).toBeOnTheScreen();
      expect(screen.getByText('You can try again in about 30 s.')).toBeOnTheScreen();
      expect(screen.getByTestId('action-approve')).toBeOnTheScreen();
    });
  });

  describe('decisions', () => {
    it('approves after a confirmation, toasts and leaves the screen', async () => {
      mockConfirm.mockResolvedValue(true);
      api.approve.mockResolvedValue(makeDetail({ status: 'PUBLISHED', reviewTarget: null }));
      await renderScreen();

      await fireEvent.press(await screen.findByTestId('action-approve'));
      await waitFor(() => expect(api.approve).toHaveBeenCalledWith('c1'));
      await waitFor(() => expect(router.back).toHaveBeenCalled());
      expect(showToast).toHaveBeenCalledWith('Course approved', { type: 'success' });
    });

    it('does nothing when the confirmation is cancelled', async () => {
      mockConfirm.mockResolvedValue(false);
      await renderScreen();

      await fireEvent.press(await screen.findByTestId('action-approve'));
      expect(api.approve).not.toHaveBeenCalled();
    });

    it('toasts the server error when approving fails', async () => {
      mockConfirm.mockResolvedValue(true);
      api.approve.mockRejectedValue(
        new AppError({ status: 422, code: 'COURSE_INCOMPLETE', message: 'x' }),
      );
      await renderScreen();

      await fireEvent.press(await screen.findByTestId('action-approve'));
      await waitFor(() =>
        expect(showToast).toHaveBeenCalledWith(expect.stringContaining('publishing requirements'), {
          type: 'error',
        }),
      );
      expect(router.back).not.toHaveBeenCalled();
    });

    it('requires a reason of 5-500 characters to reject', async () => {
      api.reject.mockResolvedValue(makeDetail({ status: 'REJECTED', reviewTarget: null }));
      await renderScreen();

      await fireEvent.press(await screen.findByTestId('action-reject'));
      await fireEvent.press(screen.getByTestId('reason-submit'));
      expect(await screen.findByText('Enter at least 5 characters.')).toBeOnTheScreen();
      expect(api.reject).not.toHaveBeenCalled();

      await fireEvent.changeText(screen.getByTestId('reason-input'), 'x'.repeat(501));
      await fireEvent.press(screen.getByTestId('reason-submit'));
      expect(await screen.findByText('Use at most 500 characters.')).toBeOnTheScreen();

      await fireEvent.changeText(screen.getByTestId('reason-input'), 'The cover image is missing');
      await fireEvent.press(screen.getByTestId('reason-submit'));
      await waitFor(() =>
        expect(api.reject).toHaveBeenCalledWith('c1', { reason: 'The cover image is missing' }),
      );
      await waitFor(() => expect(router.back).toHaveBeenCalled());
      expect(showToast).toHaveBeenCalledWith('Course rejected', { type: 'success' });
    });

    it('shows the server error inside the reject dialog', async () => {
      api.reject.mockRejectedValue(
        new AppError({ status: 422, code: 'INVALID_COURSE_STATE', message: 'x' }),
      );
      await renderScreen();

      await fireEvent.press(await screen.findByTestId('action-reject'));
      await fireEvent.changeText(screen.getByTestId('reason-input'), 'The cover image is missing');
      await fireEvent.press(screen.getByTestId('reason-submit'));

      expect(await screen.findByText(/not in a state that allows this action/)).toBeOnTheScreen();
      expect(router.back).not.toHaveBeenCalled();
    });

    it('archives a published course with an optional reason and stays on the screen', async () => {
      api.course.mockResolvedValue(makeDetail({ status: 'PUBLISHED', reviewTarget: null }));
      api.archive.mockResolvedValue(makeDetail({ status: 'ARCHIVED', reviewTarget: null }));
      await renderScreen();

      expect(screen.queryByTestId('action-approve')).toBeNull();
      await fireEvent.press(await screen.findByTestId('action-archive'));
      await fireEvent.press(screen.getByTestId('reason-submit'));
      await waitFor(() => expect(api.archive).toHaveBeenCalledWith('c1', {}));
      await waitFor(() =>
        expect(showToast).toHaveBeenCalledWith('Course archived', { type: 'success' }),
      );
      expect(router.back).not.toHaveBeenCalled();
      // The returned detail replaces the cache, so the screen now offers Restore.
      expect(await screen.findByTestId('action-restore')).toBeOnTheScreen();
    });

    it('restores an archived course after a confirmation', async () => {
      mockConfirm.mockResolvedValue(true);
      api.course.mockResolvedValue(makeDetail({ status: 'ARCHIVED', reviewTarget: null }));
      api.restore.mockResolvedValue(makeDetail({ status: 'PUBLISHED', reviewTarget: null }));
      await renderScreen();

      await fireEvent.press(await screen.findByTestId('action-restore'));
      await waitFor(() => expect(api.restore).toHaveBeenCalledWith('c1', {}));
      expect(showToast).toHaveBeenCalledWith('Course restored', { type: 'success' });
    });

    it('offers no decision for a draft', async () => {
      api.course.mockResolvedValue(makeDetail({ status: 'DRAFT', reviewTarget: null }));
      await renderScreen();

      await screen.findByTestId('course-info');
      expect(screen.queryByTestId('action-bar')).toBeNull();
    });
  });

  it('shows an error with Retry, and a plain message for a 403', async () => {
    api.course.mockRejectedValueOnce(
      new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'x' }),
    );
    await renderScreen();
    await fireEvent.press(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByTestId('course-info')).toBeOnTheScreen();
  });

  it('explains a 403 without Retry', async () => {
    api.course.mockRejectedValue(new AppError({ status: 403, code: 'FORBIDDEN', message: 'x' }));
    await renderScreen();

    expect(await screen.findByText('No access')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });
});
