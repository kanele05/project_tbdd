import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { showToast } from '@/components/ui/Toast';
import { renderWithClient } from '@/features/search/testUtils';
import { AppError } from '@/lib/appError';
import type { TeacherSubmissionDto, TeacherSubmissionsPage } from '@/types/api';

import { teachingApi } from '../api';
import { TeacherSubmissionsScreen } from './TeacherSubmissionsScreen';

jest.mock('@shopify/flash-list', () => jest.requireActual('@/features/search/flashListMock'));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));
jest.mock('@/components/ui/Toast', () => ({
  ...jest.requireActual('@/components/ui/Toast'),
  showToast: jest.fn(),
}));
jest.mock('../api', () => ({ teachingApi: { submissions: jest.fn(), grade: jest.fn() } }));

const mockSubmissions = teachingApi.submissions as jest.Mock;
const mockGrade = teachingApi.grade as jest.Mock;
const mockShowToast = showToast as jest.Mock;

function makeSubmission(
  id: string,
  overrides: Partial<TeacherSubmissionDto> = {},
): TeacherSubmissionDto {
  return {
    id,
    courseId: 'c1',
    title: `Project ${id}`,
    description: null,
    imageUrl: null,
    fileUrl: `https://files/${id}.zip`,
    createdAt: new Date().toISOString(),
    user: { id: `u-${id}`, fullName: `Student ${id}`, avatarUrl: null },
    grade: null,
    feedback: null,
    gradedAt: null,
    ...overrides,
  };
}

function page(
  items: TeacherSubmissionDto[],
  summary = { gradedCount: 1, ungradedCount: items.length },
): TeacherSubmissionsPage {
  return {
    data: items,
    meta: { page: 1, limit: 20, total: items.length, totalPages: 1, summary },
  };
}

describe('TeacherSubmissionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmissions.mockResolvedValue(
      page([
        makeSubmission('s1'),
        makeSubmission('s2', {
          grade: 90,
          feedback: 'Well done',
          gradedAt: new Date().toISOString(),
        }),
      ]),
    );
  });

  it('lists the submissions with their grade status and the summary', async () => {
    await renderWithClient(<TeacherSubmissionsScreen courseId="c1" />);

    expect(await screen.findByText('Project s1')).toBeOnTheScreen();
    expect(screen.getByText('Student s1')).toBeOnTheScreen();
    expect(screen.getByText('Not graded')).toBeOnTheScreen();
    expect(screen.getByText('90/100')).toBeOnTheScreen();
    expect(screen.getByText('Well done')).toBeOnTheScreen();
    expect(screen.getByText('1 graded, 2 waiting')).toBeOnTheScreen();
    expect(mockSubmissions).toHaveBeenCalledWith('c1', { status: 'all', page: 1 });
  });

  it('filters by status', async () => {
    await renderWithClient(<TeacherSubmissionsScreen courseId="c1" />);
    await screen.findByText('Project s1');

    await fireEvent.press(screen.getByTestId('submission-filter-ungraded'));

    await waitFor(() =>
      expect(mockSubmissions).toHaveBeenLastCalledWith('c1', { status: 'ungraded', page: 1 }),
    );
  });

  it('grades a submission: validates, saves 0-100 + feedback and closes the sheet', async () => {
    mockGrade.mockResolvedValue(makeSubmission('s1', { grade: 75, feedback: 'Good start' }));
    await renderWithClient(<TeacherSubmissionsScreen courseId="c1" />);
    await screen.findByText('Project s1');

    await fireEvent.press(screen.getByTestId('grade-s1'));
    expect(screen.getByTestId('grade-sheet')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('grade-save'));
    expect(await screen.findByText('Enter a grade from 0 to 100')).toBeOnTheScreen();
    expect(mockGrade).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('grade-input'), '101');
    await fireEvent.changeText(screen.getByTestId('feedback-input'), 'Good start');
    await fireEvent.press(screen.getByTestId('grade-save'));
    expect(
      await screen.findByText('The grade must be a whole number from 0 to 100'),
    ).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByTestId('grade-input'), '75');
    await fireEvent.press(screen.getByTestId('grade-save'));

    await waitFor(() =>
      expect(mockGrade).toHaveBeenCalledWith('s1', { grade: 75, feedback: 'Good start' }),
    );
    await waitFor(() => expect(screen.queryByTestId('grade-sheet')).not.toBeOnTheScreen());
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Grade saved'), {
      type: 'success',
    });
  });

  it('pre-fills the sheet when grading again', async () => {
    await renderWithClient(<TeacherSubmissionsScreen courseId="c1" />);
    await screen.findByText('Project s2');

    await fireEvent.press(screen.getByTestId('grade-s2'));

    expect(screen.getByTestId('grade-input').props.value).toBe('90');
    expect(screen.getByTestId('feedback-input').props.value).toBe('Well done');
  });

  it('keeps the sheet open and explains when the server refuses (403)', async () => {
    mockGrade.mockRejectedValue(
      new AppError({ status: 403, code: 'NOT_COURSE_TEACHER', message: 'no' }),
    );
    await renderWithClient(<TeacherSubmissionsScreen courseId="c1" />);
    await screen.findByText('Project s1');

    await fireEvent.press(screen.getByTestId('grade-s1'));
    await fireEvent.changeText(screen.getByTestId('grade-input'), '50');
    await fireEvent.changeText(screen.getByTestId('feedback-input'), 'Ok');
    await fireEvent.press(screen.getByTestId('grade-save'));

    expect(
      await screen.findByText('Only the teacher of this course can do that.'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('grade-sheet')).toBeOnTheScreen();
  });

  it('opens the submitted file', async () => {
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await renderWithClient(<TeacherSubmissionsScreen courseId="c1" />);
    await screen.findByText('Project s1');

    await fireEvent.press(screen.getAllByRole('button', { name: 'Open file' })[0]!);

    expect(openUrl).toHaveBeenCalledWith('https://files/s1.zip');
    openUrl.mockRestore();
  });

  it('shows an empty state', async () => {
    mockSubmissions.mockResolvedValue(page([], { gradedCount: 0, ungradedCount: 0 }));
    await renderWithClient(<TeacherSubmissionsScreen courseId="c1" />);

    expect(await screen.findByText('No submissions yet')).toBeOnTheScreen();
  });

  it('shows an error with Retry', async () => {
    mockSubmissions.mockRejectedValueOnce(
      new AppError({ status: 500, code: 'INTERNAL_ERROR', message: 'boom' }),
    );
    await renderWithClient(<TeacherSubmissionsScreen courseId="c1" />);

    expect(await screen.findByText("Couldn't load the submissions")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Project s1')).toBeOnTheScreen();
  });

  it('shows skeletons while loading', async () => {
    mockSubmissions.mockReturnValue(new Promise(() => undefined));
    await renderWithClient(<TeacherSubmissionsScreen courseId="c1" />);

    expect(screen.getAllByTestId('submission-skeleton').length).toBeGreaterThan(0);
  });
});
