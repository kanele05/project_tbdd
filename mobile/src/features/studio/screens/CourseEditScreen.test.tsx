import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AppError } from '@/lib/appError';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { StudioCourseDetailDto } from '@/types/api';

import { useAiDraftStore } from '../aiDraftStore';
import { makeDetail, makeRevision } from '../studioFixtures';
import { CourseEditScreen } from './CourseEditScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockSaveRevision = jest.fn();
const mockWorkflow = jest.fn();
const mockRefetch = jest.fn();
let mockQuery: Record<string, unknown> = {};

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
    back: () => mockBack(),
    canGoBack: () => true,
  },
  useNavigation: () => ({ addListener: () => jest.fn(), dispatch: jest.fn() }),
}));

jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

jest.mock('@/features/search/hooks', () => ({
  useCategories: () => ({
    isPending: false,
    isError: false,
    data: [
      { id: 'cat-1', name: 'Code' },
      { id: 'cat-2', name: 'Design' },
    ],
  }),
  useHotTags: () => ({
    isPending: false,
    data: [
      { id: 'tag-1', name: 'React', isHot: true },
      { id: 'tag-2', name: 'Expo', isHot: true },
    ],
  }),
}));

jest.mock('../hooks', () => ({
  useStudioCourse: () => mockQuery,
  useCreateCourse: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateCourse: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useSaveRevision: () => ({ mutateAsync: mockSaveRevision, isPending: false }),
  useCourseWorkflow: () => ({ mutateAsync: mockWorkflow, isPending: false }),
  useUploadCover: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

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

describe('CourseEditScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = { data: undefined, isPending: true, fetchStatus: 'idle' };
  });

  it('creates a draft from a title and a category, then opens its status screen', async () => {
    mockCreate.mockResolvedValue(makeDetail({ id: 'new-id' }));
    await renderWithProviders(<CourseEditScreen courseId="new" />);

    await fireEvent.changeText(screen.getByLabelText('Title'), 'Complete React Native Bootcamp');
    await fireEvent.press(screen.getByTestId('category-cat-1'));
    await fireEvent.changeText(screen.getByLabelText('Price (USD)'), '29.99');
    await fireEvent.press(screen.getByTestId('tag-tag-2'));
    await fireEvent.press(screen.getByTestId('edit-save'));

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(mockCreate).toHaveBeenCalledWith({
      title: 'Complete React Native Bootcamp',
      categoryId: 'cat-1',
      priceCents: 2999,
      originalPriceCents: null,
      tagIds: ['tag-2'],
      benefits: [],
    });
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/studio/[id]',
      params: { id: 'new-id' },
    });
  });

  it('shows field errors under the fields and does not call the API', async () => {
    await renderWithProviders(<CourseEditScreen courseId="new" />);

    await fireEvent.changeText(screen.getByLabelText('Title'), 'Hi');
    await fireEvent.press(screen.getByTestId('edit-save'));

    expect(await screen.findByText('Title needs at least 5 characters.')).toBeOnTheScreen();
    expect(screen.getByText('Pick a category.')).toBeOnTheScreen();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('puts the server field errors of a 400 under the matching fields', async () => {
    mockCreate.mockRejectedValue(
      new AppError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'x',
        details: [{ source: 'body', field: 'priceCents', message: 'Price is too high' }],
      }),
    );
    await renderWithProviders(<CourseEditScreen courseId="new" />);

    await fireEvent.changeText(screen.getByLabelText('Title'), 'A valid course title');
    await fireEvent.press(screen.getByTestId('category-cat-2'));
    await fireEvent.press(screen.getByTestId('edit-save'));

    expect(await screen.findByText('Price is too high')).toBeOnTheScreen();
  });

  it('opens the AI suggestion screen with the typed title', async () => {
    await renderWithProviders(<CourseEditScreen courseId="new" />);
    await fireEvent.changeText(screen.getByLabelText('Title'), 'My topic');
    await fireEvent.press(screen.getByTestId('edit-ai-suggest'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/studio/ai-draft',
      params: { courseId: 'new', topic: 'My topic' },
    });
  });

  it('pours the parts the AI suggested into the form', async () => {
    await renderWithProviders(<CourseEditScreen courseId="new" />);
    await act(async () => {
      useAiDraftStore.getState().queueFields({ subtitle: 'AI subtitle', benefits: ['Learn A'] });
    });

    await waitFor(() => expect(screen.getByLabelText('Subtitle').props.value).toBe('AI subtitle'));
    expect(screen.getByLabelText('Learning point 1').props.value).toBe('Learn A');
    expect(useAiDraftStore.getState().pendingFields).toBeNull();
  });

  it('edits a draft and sends only the changed fields', async () => {
    setDetail(makeDetail());
    mockUpdate.mockResolvedValue(makeDetail({ subtitle: 'Fresh subtitle' }));
    await renderWithProviders(<CourseEditScreen courseId="course-1" />);

    await waitFor(() =>
      expect(screen.getByLabelText('Title').props.value).toBe('React Native Bootcamp'),
    );
    expect(screen.getByTestId('edit-save')).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Subtitle'), 'Fresh subtitle');
    await fireEvent.press(screen.getByTestId('edit-save'));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ subtitle: 'Fresh subtitle' }));
    expect(mockBack).toHaveBeenCalled();
  });

  it('adds and removes learning points', async () => {
    setDetail(makeDetail({ benefits: ['One'] }));
    await renderWithProviders(<CourseEditScreen courseId="course-1" />);

    await waitFor(() => expect(screen.getByLabelText('Learning point 1')).toBeOnTheScreen());
    await fireEvent.press(screen.getByTestId('benefit-add'));
    expect(screen.getByLabelText('Learning point 2')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Remove learning point 1'));
    expect(screen.queryByLabelText('Learning point 2')).not.toBeOnTheScreen();
  });

  it('keeps the major fields locked on a published course until a revision exists', async () => {
    setDetail(makeDetail({ status: 'PUBLISHED' }));
    mockWorkflow.mockResolvedValue(undefined);
    await renderWithProviders(<CourseEditScreen courseId="course-1" />);

    expect(await screen.findByTestId('edit-notice-published')).toBeOnTheScreen();
    expect(screen.getByLabelText('Title')).toHaveProp('editable', false);
    expect(screen.getByLabelText('Subtitle')).toHaveProp('editable', true);
    await fireEvent.press(screen.getByTestId('edit-start-revision'));
    await waitFor(() => expect(mockWorkflow).toHaveBeenCalledWith('createRevision'));
  });

  it('saves a minor change by PATCH and a major change in the revision', async () => {
    const revision = makeRevision('OPEN');
    const detail = makeDetail({ status: 'PUBLISHED', revision });
    setDetail(detail);
    mockUpdate.mockResolvedValue(detail);
    mockSaveRevision.mockResolvedValue(detail);
    await renderWithProviders(<CourseEditScreen courseId="course-1" />);

    expect(await screen.findByTestId('edit-notice-revision')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByLabelText('Title').props.value).toBe('New title'));
    await fireEvent.changeText(screen.getByLabelText('Title'), 'Even newer title');
    await fireEvent.changeText(screen.getByLabelText('Subtitle'), 'Updated subtitle');
    await fireEvent.press(screen.getByTestId('edit-save'));

    await waitFor(() => expect(mockSaveRevision).toHaveBeenCalled());
    expect(mockUpdate).toHaveBeenCalledWith({ subtitle: 'Updated subtitle' });
    expect(mockSaveRevision).toHaveBeenCalledWith({
      ...revision.payload,
      title: 'Even newer title',
    });
  });

  it('locks everything while the course is in review', async () => {
    setDetail(makeDetail({ status: 'PENDING_REVIEW' }));
    await renderWithProviders(<CourseEditScreen courseId="course-1" />);

    expect(await screen.findByTestId('edit-notice-locked')).toBeOnTheScreen();
    expect(screen.queryByTestId('edit-save')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('edit-ai-suggest')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Subtitle')).toHaveProp('editable', false);
  });

  it('shows a loading skeleton and an error state with Retry', async () => {
    mockQuery = { data: undefined, isPending: true, isError: false, fetchStatus: 'fetching' };
    const { unmount } = await renderWithProviders(<CourseEditScreen courseId="course-1" />);
    expect(screen.getByTestId('edit-skeleton')).toBeOnTheScreen();
    unmount();

    mockQuery = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new AppError({ status: 404, code: 'COURSE_NOT_FOUND', message: 'x' }),
      fetchStatus: 'idle',
      refetch: mockRefetch,
    };
    await renderWithProviders(<CourseEditScreen courseId="course-1" />);
    await fireEvent.press(screen.getByText('Retry'));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('renders in Vietnamese and dark', async () => {
    await renderWithProviders(<CourseEditScreen courseId="new" />, {
      language: 'vi',
      theme: 'dark',
    });
    expect(screen.getByText('Khóa học mới')).toBeOnTheScreen();
    expect(screen.getByLabelText('Tiêu đề')).toBeOnTheScreen();
    expect(screen.getByText('Gợi ý bằng AI')).toBeOnTheScreen();
  });
});
