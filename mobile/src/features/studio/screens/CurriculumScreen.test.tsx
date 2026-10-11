import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AppError } from '@/lib/appError';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { StudioCourseDetailDto } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

import { useAiDraftStore } from '../aiDraftStore';
import { makeDetail, makeLesson, makeRevision, makeSection } from '../studioFixtures';
import { CurriculumScreen } from './CurriculumScreen';

const mockRefetch = jest.fn();
const mockWorkflow = jest.fn();
const mockSaveRevision = jest.fn();
const mockMutations = {
  addSection: jest.fn(),
  renameSection: jest.fn(),
  deleteSection: jest.fn(),
  addLesson: jest.fn(),
  updateLesson: jest.fn(),
  deleteLesson: jest.fn(),
  reorder: jest.fn(),
};
let mockQuery: Record<string, unknown> = {};

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useNavigation: () => ({ addListener: () => jest.fn(), dispatch: jest.fn() }),
}));

jest.mock('@/utils/confirmAction', () => ({ confirmAction: jest.fn() }));

jest.mock('../hooks', () => ({
  useStudioCourse: () => mockQuery,
  useCourseWorkflow: () => ({ mutateAsync: mockWorkflow, isPending: false }),
  useSaveRevision: () => ({ mutateAsync: mockSaveRevision, isPending: false }),
  useCurriculumMutations: () =>
    Object.fromEntries(
      Object.entries(mockMutations).map(([key, fn]) => [
        key,
        { mutateAsync: fn, isPending: false },
      ]),
    ),
}));

const confirm = jest.mocked(confirmAction);
const URL = 'https://youtu.be/dQw4w9WgXcQ';

function setDetail(detail: StudioCourseDetailDto) {
  mockQuery = {
    data: detail,
    isPending: false,
    isError: false,
    error: null,
    fetchStatus: 'idle',
    refetch: mockRefetch,
  };
}

const TWO_SECTIONS = [
  makeSection({
    id: 's1',
    title: 'Basics',
    lessons: [
      makeLesson({ id: 'l1', title: 'First lesson', isPreview: true }),
      makeLesson({ id: 'l2', title: 'Second lesson' }),
    ],
  }),
  makeSection({ id: 's2', title: 'Advanced', lessons: [] }),
];

describe('CurriculumScreen - draft course', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    confirm.mockResolvedValue(true);
    for (const fn of Object.values(mockMutations)) fn.mockResolvedValue({ id: 'x' });
    setDetail(makeDetail({ sections: TWO_SECTIONS }));
  });

  it('lists sections and lessons with a summary line', async () => {
    await renderWithProviders(<CurriculumScreen courseId="course-1" />);

    expect(screen.getByText('Section 1: Basics')).toBeOnTheScreen();
    expect(screen.getByText('1. First lesson')).toBeOnTheScreen();
    expect(screen.getByText('Preview')).toBeOnTheScreen();
    expect(screen.getByTestId('curriculum-summary')).toHaveTextContent(
      '2 sections - 2 lessons - 25 mins - previews 1/3',
    );
  });

  it('adds a section from the sheet', async () => {
    await renderWithProviders(<CurriculumScreen courseId="course-1" />);

    await fireEvent.press(screen.getByTestId('add-section'));
    await fireEvent.changeText(screen.getByLabelText('Section title'), 'Deep dive');
    await fireEvent.press(screen.getByTestId('section-save'));

    await waitFor(() =>
      expect(mockMutations.addSection).toHaveBeenCalledWith({ title: 'Deep dive' }),
    );
  });

  it('refuses an empty section title', async () => {
    await renderWithProviders(<CurriculumScreen courseId="course-1" />);
    await fireEvent.press(screen.getByTestId('add-section'));
    await fireEvent.press(screen.getByTestId('section-save'));

    expect(await screen.findByText('Give the section a title.')).toBeOnTheScreen();
    expect(mockMutations.addSection).not.toHaveBeenCalled();
  });

  it('renames and deletes a section (after confirming)', async () => {
    await renderWithProviders(<CurriculumScreen courseId="course-1" />);

    await fireEvent.press(screen.getByTestId('section-rename-s2'));
    await fireEvent.changeText(screen.getByLabelText('Section title'), 'Expert');
    await fireEvent.press(screen.getByTestId('section-save'));
    await waitFor(() =>
      expect(mockMutations.renameSection).toHaveBeenCalledWith({
        sectionId: 's2',
        body: { title: 'Expert' },
      }),
    );

    await fireEvent.press(screen.getByTestId('section-delete-s2'));
    await waitFor(() => expect(mockMutations.deleteSection).toHaveBeenCalledWith('s2'));
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ isDestructive: true }));
  });

  it('moves sections and lessons with the up / down buttons', async () => {
    await renderWithProviders(<CurriculumScreen courseId="course-1" />);

    await fireEvent.press(screen.getByLabelText('Move section Basics down'));
    await waitFor(() =>
      expect(mockMutations.reorder).toHaveBeenCalledWith({ target: 'sections', ids: ['s2', 's1'] }),
    );
    await fireEvent.press(screen.getByLabelText('Move lesson First lesson down'));
    await waitFor(() =>
      expect(mockMutations.reorder).toHaveBeenLastCalledWith({
        target: 'lessons',
        sectionId: 's1',
        ids: ['l2', 'l1'],
      }),
    );
    expect(screen.getByLabelText('Move section Basics up')).toBeDisabled();
  });

  it('adds a lesson with a normalized link and the length in seconds', async () => {
    await renderWithProviders(<CurriculumScreen courseId="course-1" />);

    await fireEvent.press(screen.getByTestId('add-lesson-s2'));
    await fireEvent.changeText(screen.getByLabelText('Lesson title'), 'Hooks');
    await fireEvent.changeText(screen.getByLabelText('YouTube link'), URL);
    expect(screen.getByTestId('lesson-normalized')).toHaveTextContent(
      'Saved as: https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );
    await fireEvent.changeText(screen.getByLabelText('Length (mm:ss)'), '12:34');
    await fireEvent.press(screen.getByTestId('lesson-save'));

    await waitFor(() =>
      expect(mockMutations.addLesson).toHaveBeenCalledWith({
        sectionId: 's2',
        body: {
          title: 'Hooks',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationSec: 754,
          isPreview: false,
          content: '',
        },
      }),
    );
  });

  it('validates the link and the length before saving a lesson', async () => {
    await renderWithProviders(<CurriculumScreen courseId="course-1" />);

    await fireEvent.press(screen.getByTestId('add-lesson-s2'));
    await fireEvent.changeText(screen.getByLabelText('Lesson title'), 'Hooks');
    await fireEvent.changeText(screen.getByLabelText('YouTube link'), 'https://vimeo.com/1');
    await fireEvent.changeText(screen.getByLabelText('Length (mm:ss)'), '90');
    await fireEvent.press(screen.getByTestId('lesson-save'));

    expect(await screen.findByText('Enter a valid YouTube link.')).toBeOnTheScreen();
    expect(screen.getByText('Use mm:ss between 0:01 and 6:00:00.')).toBeOnTheScreen();
    expect(mockMutations.addLesson).not.toHaveBeenCalled();
  });

  it('edits an existing lesson and shows a save error inside the sheet', async () => {
    mockMutations.updateLesson.mockRejectedValue(
      new AppError({ status: 422, code: 'INVALID_COURSE_STATE', message: 'x' }),
    );
    await renderWithProviders(<CurriculumScreen courseId="course-1" />);

    await fireEvent.press(screen.getByTestId('lesson-edit-l2'));
    await fireEvent.changeText(screen.getByLabelText('Lesson title'), 'Second, renamed');
    await fireEvent.press(screen.getByTestId('lesson-save'));

    await waitFor(() =>
      expect(mockMutations.updateLesson).toHaveBeenCalledWith(
        expect.objectContaining({
          lessonId: 'l2',
          body: expect.objectContaining({ title: 'Second, renamed' }),
        }),
      ),
    );
    expect(await screen.findByTestId('form-error')).toHaveTextContent(/Refresh and try again/);
  });

  it('stops turning on a 4th free preview', async () => {
    const lessons = ['a', 'b', 'c'].map((id) => makeLesson({ id, title: id, isPreview: true }));
    setDetail(makeDetail({ sections: [makeSection({ id: 's1', lessons })] }));
    await renderWithProviders(<CurriculumScreen courseId="course-1" />);

    await fireEvent.press(screen.getByTestId('add-lesson-s1'));
    expect(screen.getByTestId('lesson-preview-switch')).toHaveProp('disabled', true);
    expect(screen.getByText('A course can have at most 3 free previews.')).toBeOnTheScreen();
  });

  it('turns an AI planned lesson into a pre-filled lesson form', async () => {
    await renderWithProviders(<CurriculumScreen courseId="course-1" />);
    await act(async () => {
      useAiDraftStore
        .getState()
        .setPlannedLessons({ s2: [{ title: 'Planned topic', summary: 'What it covers' }] });
    });

    await fireEvent.press(screen.getByTestId('planned-add-s2-0'));
    expect(screen.getByLabelText('Lesson title').props.value).toBe('Planned topic');
    expect(screen.getByLabelText('Lesson notes').props.value).toBe('What it covers');
    await fireEvent.changeText(screen.getByLabelText('YouTube link'), URL);
    await fireEvent.changeText(screen.getByLabelText('Length (mm:ss)'), '5:00');
    await fireEvent.press(screen.getByTestId('lesson-save'));

    await waitFor(() => expect(mockMutations.addLesson).toHaveBeenCalled());
    await waitFor(() => expect(useAiDraftStore.getState().plannedLessons).toEqual({}));
    await act(async () => useAiDraftStore.getState().clear());
  });

  it('shows the empty state of a course without sections', async () => {
    setDetail(makeDetail({ sections: [] }));
    await renderWithProviders(<CurriculumScreen courseId="course-1" />);
    expect(screen.getByText('No sections yet')).toBeOnTheScreen();
  });
});

describe('CurriculumScreen - other states', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows a skeleton, then the error with Retry', async () => {
    mockQuery = { isPending: true, isError: false, fetchStatus: 'fetching', refetch: mockRefetch };
    const { unmount } = await renderWithProviders(<CurriculumScreen courseId="course-1" />);
    expect(screen.getByTestId('curriculum-skeleton')).toBeOnTheScreen();
    unmount();

    mockQuery = {
      isPending: false,
      isError: true,
      error: new AppError({ status: 404, code: 'COURSE_NOT_FOUND', message: 'x' }),
      fetchStatus: 'idle',
      refetch: mockRefetch,
    };
    await renderWithProviders(<CurriculumScreen courseId="course-1" />);
    await fireEvent.press(screen.getByText('Retry'));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('asks a published course to create a revision first', async () => {
    setDetail(makeDetail({ status: 'PUBLISHED' }));
    mockWorkflow.mockResolvedValue(undefined);
    await renderWithProviders(<CurriculumScreen courseId="course-1" />);

    expect(screen.getByTestId('curriculum-needs-revision')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('curriculum-start-revision'));
    await waitFor(() => expect(mockWorkflow).toHaveBeenCalledWith('createRevision'));
  });

  it('locks the curriculum while the course or its revision is in review', async () => {
    setDetail(makeDetail({ status: 'PENDING_REVIEW' }));
    const first = await renderWithProviders(<CurriculumScreen courseId="course-1" />);
    expect(screen.getByTestId('curriculum-locked')).toBeOnTheScreen();
    first.unmount();

    setDetail(makeDetail({ status: 'PUBLISHED', revision: makeRevision('PENDING_REVIEW') }));
    await renderWithProviders(<CurriculumScreen courseId="course-1" />);
    expect(screen.getByTestId('curriculum-locked')).toBeOnTheScreen();
  });

  it('renders in Vietnamese', async () => {
    setDetail(makeDetail({ sections: TWO_SECTIONS }));
    await renderWithProviders(<CurriculumScreen courseId="course-1" />, {
      language: 'vi',
      theme: 'dark',
    });
    expect(screen.getByText('Chương 1: Basics')).toBeOnTheScreen();
    expect(screen.getByText('Thêm chương')).toBeOnTheScreen();
  });
});

describe('CurriculumScreen - revision of a published course', () => {
  const revision = {
    ...makeRevision('OPEN'),
    payload: {
      ...makeRevision('OPEN').payload,
      sections: [
        {
          id: 's1',
          title: 'Basics',
          lessons: [
            {
              id: 'l1',
              title: 'First lesson',
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              durationSec: 100,
              isPreview: true,
              content: '',
            },
          ],
        },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setDetail(makeDetail({ status: 'PUBLISHED', revision }));
  });

  it('edits a local copy and sends the whole payload on "Save revision"', async () => {
    mockSaveRevision.mockResolvedValue(makeDetail({ status: 'PUBLISHED', revision }));
    await renderWithProviders(<CurriculumScreen courseId="course-1" />);

    expect(screen.getByTestId('curriculum-revision-notice')).toBeOnTheScreen();
    expect(screen.getByTestId('curriculum-save-revision')).toBeDisabled();

    await fireEvent.press(screen.getByTestId('add-section'));
    await fireEvent.changeText(screen.getByLabelText('Section title'), 'Brand new');
    await fireEvent.press(screen.getByTestId('section-save'));

    expect(await screen.findByText('Section 2: Brand new')).toBeOnTheScreen();
    expect(mockSaveRevision).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('curriculum-save-revision'));

    await waitFor(() => expect(mockSaveRevision).toHaveBeenCalled());
    expect(mockSaveRevision).toHaveBeenCalledWith({
      ...revision.payload,
      sections: [revision.payload.sections[0], { title: 'Brand new', lessons: [] }],
    });
  });

  it('deletes a lesson locally after confirming', async () => {
    confirm.mockResolvedValue(true);
    await renderWithProviders(<CurriculumScreen courseId="course-1" />);

    await fireEvent.press(screen.getByLabelText('Delete lesson First lesson'));
    await waitFor(() => expect(screen.queryByText('1. First lesson')).not.toBeOnTheScreen());
    expect(screen.getByTestId('curriculum-save-revision')).toBeEnabled();
  });
});
