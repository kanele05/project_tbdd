import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AppError } from '@/lib/appError';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { CourseMissingItemDto, StudioCourseDetailDto } from '@/types/api';

import { useAiDraftStore } from '../aiDraftStore';
import { makeDetail, makeRevision } from '../studioFixtures';
import { CourseWizardScreen } from './CourseWizardScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockSetParams = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockSaveRevision = jest.fn();
const mockWorkflow = jest.fn();
const mockRefetch = jest.fn();
const mockFlush = jest.fn();
let mockQuery: Record<string, unknown> = {};

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
    back: () => mockBack(),
    canGoBack: () => true,
    setParams: (...args: unknown[]) => mockSetParams(...args),
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
  useDiscardRevision: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteCourse: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUploadCover: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

// The curriculum editor has its own tests; here only the hand-over to the wizard matters.
jest.mock('../components/CurriculumContent', () => ({
  CurriculumContent: ({
    registerFlush,
  }: {
    registerFlush?: (flush: () => Promise<boolean>) => void;
  }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    registerFlush?.(mockFlush);
    return <Text>curriculum-content</Text>;
  },
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

async function openStep(detail: StudioCourseDetailDto, step?: string) {
  setDetail(detail);
  return renderWithProviders(<CourseWizardScreen courseId={detail.id} step={step} />);
}

async function pressNext() {
  await fireEvent.press(screen.getByTestId('wizard-next'));
}

describe('CourseWizardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFlush.mockResolvedValue(true);
    mockQuery = { data: undefined, isPending: true, fetchStatus: 'idle' };
    useAiDraftStore.getState().clear();
  });

  describe('new course', () => {
    it('starts on the Idea step with five progress segments and no errors', async () => {
      await renderWithProviders(<CourseWizardScreen courseId="new" />);

      expect(screen.getByText('What is your course about?')).toBeOnTheScreen();
      expect(screen.getByText('New course')).toBeOnTheScreen();
      for (const step of ['idea', 'intro', 'price', 'lessons', 'review']) {
        expect(screen.getByTestId(`wizard-step-${step}`)).toBeOnTheScreen();
      }
      expect(screen.queryByText(/needs at least/)).not.toBeOnTheScreen();
      expect(screen.queryByText('Pick a category.')).not.toBeOnTheScreen();
      expect(screen.getByTestId('edit-ai-suggest')).toBeOnTheScreen();
    });

    it('shows the errors only after Next and does not create anything', async () => {
      await renderWithProviders(<CourseWizardScreen courseId="new" />);

      await fireEvent.changeText(screen.getByLabelText('Title'), 'Hi');
      expect(screen.queryByText('Title needs at least 5 characters.')).not.toBeOnTheScreen();
      await pressNext();

      expect(await screen.findByText('Title needs at least 5 characters.')).toBeOnTheScreen();
      expect(screen.getByText('Pick a category.')).toBeOnTheScreen();
      expect(mockCreate).not.toHaveBeenCalled();
      expect(screen.getByText('What is your course about?')).toBeOnTheScreen();
    });

    it('creates the draft on Next, swaps the route id and moves to the Intro step', async () => {
      const created = makeDetail({ id: 'new-id' });
      mockCreate.mockImplementation(async () => {
        setDetail(created);
        return created;
      });
      await renderWithProviders(<CourseWizardScreen courseId="new" />);

      await fireEvent.changeText(screen.getByLabelText('Title'), 'Complete React Native Bootcamp');
      await fireEvent.press(screen.getByTestId('category-cat-1'));
      await pressNext();

      await waitFor(() => expect(mockCreate).toHaveBeenCalled());
      expect(mockCreate).toHaveBeenCalledWith({
        title: 'Complete React Native Bootcamp',
        categoryId: 'cat-1',
        priceCents: 0,
        originalPriceCents: null,
        tagIds: [],
        benefits: [],
      });
      expect(mockSetParams).toHaveBeenCalledWith({ id: 'new-id' });
      expect(await screen.findByText('Introduce your course')).toBeOnTheScreen();
      expect(screen.getByText('Course info')).toBeOnTheScreen();
      expect(mockSetParams).toHaveBeenCalledWith({ step: 'intro' });
    });

    it('puts a 400 on the matching field and stays on the step', async () => {
      mockCreate.mockRejectedValue(
        new AppError({
          status: 400,
          code: 'VALIDATION_ERROR',
          message: 'x',
          details: [{ source: 'body', field: 'title', message: 'Title is taken' }],
        }),
      );
      await renderWithProviders(<CourseWizardScreen courseId="new" />);

      await fireEvent.changeText(screen.getByLabelText('Title'), 'A valid course title');
      await fireEvent.press(screen.getByTestId('category-cat-2'));
      await pressNext();

      expect(await screen.findByText('Title is taken')).toBeOnTheScreen();
      expect(screen.getByText('What is your course about?')).toBeOnTheScreen();
    });

    it('does not let the progress bar skip ahead before the draft exists', async () => {
      await renderWithProviders(<CourseWizardScreen courseId="new" />);
      await fireEvent.press(screen.getByTestId('wizard-step-price'));
      expect(screen.getByText('What is your course about?')).toBeOnTheScreen();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('opens the AI sheet with the typed title and pours the suggestion into later steps', async () => {
      const created = makeDetail({ id: 'new-id', description: '', subtitle: null });
      mockCreate.mockImplementation(async () => {
        setDetail(created);
        return created;
      });
      await renderWithProviders(<CourseWizardScreen courseId="new" />);
      await fireEvent.changeText(screen.getByLabelText('Title'), 'My topic');
      await fireEvent.press(screen.getByTestId('edit-ai-suggest'));
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/studio/ai-draft',
        params: { courseId: 'new', topic: 'My topic', scope: 'all' },
      });

      await act(async () => {
        useAiDraftStore.getState().queueFields({ subtitle: 'AI subtitle', benefits: ['Learn A'] });
      });
      await fireEvent.press(screen.getByTestId('category-cat-1'));
      await pressNext();

      await screen.findByText('Introduce your course');
      expect(screen.getByLabelText('Subtitle').props.value).toBe('AI subtitle');
      expect(screen.getByLabelText('Learning point 1').props.value).toBe('Learn A');
      // The draft itself was created with the first step's fields only.
      expect(mockCreate.mock.calls[0]?.[0]).not.toHaveProperty('subtitle');
    });
  });

  describe('existing draft', () => {
    it('opens the step named by ?step= and shows the loaded values', async () => {
      await openStep(makeDetail(), 'price');
      expect(screen.getByText('Price and tags')).toBeOnTheScreen();
      await waitFor(() => expect(screen.getByLabelText('Price (USD)').props.value).toBe('29.99'));
    });

    it('falls back to the first step for an unknown ?step=', async () => {
      await openStep(makeDetail(), 'nonsense');
      expect(screen.getByText('What is your course about?')).toBeOnTheScreen();
      await waitFor(() =>
        expect(screen.getByLabelText('Title').props.value).toBe('React Native Bootcamp'),
      );
    });

    it('autosaves only the changed fields of the step on Next', async () => {
      await openStep(makeDetail(), 'intro');
      mockUpdate.mockResolvedValue(makeDetail({ subtitle: 'Fresh subtitle' }));
      await waitFor(() =>
        expect(screen.getByLabelText('Subtitle').props.value).toBe('Ship real apps'),
      );

      await fireEvent.changeText(screen.getByLabelText('Subtitle'), 'Fresh subtitle');
      await pressNext();

      await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ subtitle: 'Fresh subtitle' }));
      expect(await screen.findByText('Price and tags')).toBeOnTheScreen();
    });

    it('moves on without a request when nothing changed', async () => {
      await openStep(makeDetail());
      await waitFor(() =>
        expect(screen.getByLabelText('Title').props.value).toBe('React Native Bootcamp'),
      );
      await pressNext();
      expect(await screen.findByText('Introduce your course')).toBeOnTheScreen();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('keeps AI text for the Intro step and saves it there, not on the Idea step', async () => {
      await openStep(makeDetail());
      mockUpdate.mockResolvedValue(makeDetail());
      await waitFor(() =>
        expect(screen.getByLabelText('Title').props.value).toBe('React Native Bootcamp'),
      );
      await act(async () => {
        useAiDraftStore.getState().queueFields({ description: 'Brand new AI description' });
      });

      await pressNext();
      await screen.findByText('Introduce your course');
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Description').props.value).toBe('Brand new AI description');

      await pressNext();
      await waitFor(() =>
        expect(mockUpdate).toHaveBeenCalledWith({ description: 'Brand new AI description' }),
      );
    });

    it('"Help me write" opens the AI sheet limited to the text parts', async () => {
      await openStep(makeDetail(), 'intro');
      await fireEvent.press(screen.getByTestId('intro-help-write'));
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/studio/ai-draft',
        params: { courseId: 'course-1', topic: expect.any(String), scope: 'text' },
      });
    });

    it('adds and removes learning points on the Intro step', async () => {
      await openStep(makeDetail({ benefits: ['One'] }), 'intro');
      await waitFor(() => expect(screen.getByLabelText('Learning point 1')).toBeOnTheScreen());
      await fireEvent.press(screen.getByTestId('benefit-add'));
      expect(screen.getByLabelText('Learning point 2')).toBeOnTheScreen();
      await fireEvent.press(screen.getByLabelText('Remove learning point 1'));
      expect(screen.queryByLabelText('Learning point 2')).not.toBeOnTheScreen();
    });

    it('presses Next when the AI sheet asks to move on, keeping an existing title', async () => {
      await openStep(makeDetail(), 'idea');
      await waitFor(() => expect(screen.getByLabelText('Title').props.value).not.toBe(''));
      const title = screen.getByLabelText('Title').props.value as string;
      await act(async () => {
        useAiDraftStore.getState().queueFields({ title: 'From the AI topic', subtitle: 'AI sub' });
        useAiDraftStore.getState().requestAdvance();
      });

      expect(await screen.findByText('Introduce your course')).toBeOnTheScreen();
      expect(useAiDraftStore.getState().isAdvanceRequested).toBe(false);
      expect(mockSetParams).toHaveBeenCalledWith({ step: 'intro' });
      await fireEvent.press(screen.getByTestId('wizard-back'));
      expect(await screen.findByText('What is your course about?')).toBeOnTheScreen();
      expect(screen.getByLabelText('Title').props.value).toBe(title);
    });

    it('creates a new course from the AI topic and category, then lands on the Intro step', async () => {
      const created = makeDetail({ id: 'new-id' });
      mockCreate.mockImplementation(async () => {
        setDetail(created);
        return created;
      });
      await renderWithProviders(<CourseWizardScreen courseId="new" />);

      await act(async () => {
        useAiDraftStore.getState().queueFields({
          title: 'Complete React Native Bootcamp',
          categoryId: 'cat-2',
          subtitle: 'AI sub',
        });
        useAiDraftStore.getState().requestAdvance();
      });

      await waitFor(() => expect(mockCreate).toHaveBeenCalled());
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Complete React Native Bootcamp',
          categoryId: 'cat-2',
        }),
      );
      expect(await screen.findByText('Introduce your course')).toBeOnTheScreen();
      expect(screen.queryByText('Pick a category.')).not.toBeOnTheScreen();
    });

    it('Back goes one step back and leaves the wizard from the first step', async () => {
      await openStep(makeDetail(), 'intro');
      expect(mockSetParams).not.toHaveBeenCalled();
      await fireEvent.press(screen.getByTestId('wizard-back'));
      expect(await screen.findByText('What is your course about?')).toBeOnTheScreen();
      expect(mockSetParams).toHaveBeenCalledWith({ step: 'idea' });
      await fireEvent.press(screen.getByTestId('wizard-back'));
      expect(mockBack).toHaveBeenCalled();
    });

    it('jumps with the progress bar after saving the current step', async () => {
      await openStep(makeDetail(), 'intro');
      mockUpdate.mockResolvedValue(makeDetail({ subtitle: 'Jumped' }));
      await waitFor(() =>
        expect(screen.getByLabelText('Subtitle').props.value).toBe('Ship real apps'),
      );
      await fireEvent.changeText(screen.getByLabelText('Subtitle'), 'Jumped');
      await fireEvent.press(screen.getByTestId('wizard-step-lessons'));

      expect(await screen.findByText('curriculum-content')).toBeOnTheScreen();
      expect(mockUpdate).toHaveBeenCalledWith({ subtitle: 'Jumped' });
    });

    it('stays on the Lessons step when the revision draft cannot be saved', async () => {
      await openStep(makeDetail(), 'lessons');
      mockFlush.mockResolvedValueOnce(false);
      await pressNext();
      expect(screen.getByText('curriculum-content')).toBeOnTheScreen();

      await pressNext();
      expect(await screen.findByText('Review and submit')).toBeOnTheScreen();
      expect(mockFlush).toHaveBeenCalledTimes(2);
    });

    it('shows the planned lessons of an AI outline on the Lessons step', async () => {
      await openStep(makeDetail());
      await act(async () => {
        useAiDraftStore.getState().setPlannedLessons({ 's-1': [{ title: 'A', summary: 'B' }] });
      });
      expect(await screen.findByText('curriculum-content')).toBeOnTheScreen();
    });
  });

  describe('price step', () => {
    it('needs a price of at least $0.99 for a paid course', async () => {
      await openStep(makeDetail({ priceCents: 0 }), 'price');
      await fireEvent.press(screen.getByLabelText('Paid'));
      await pressNext();

      expect(await screen.findByText('A paid course costs at least $0.99.')).toBeOnTheScreen();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('requires an original price above the price', async () => {
      await openStep(makeDetail(), 'price');
      await waitFor(() => expect(screen.getByLabelText('Price (USD)').props.value).toBe('29.99'));
      await fireEvent.changeText(screen.getByLabelText('Original price (USD)'), '10');
      await pressNext();

      expect(
        await screen.findByText('The original price must be higher than the price.'),
      ).toBeOnTheScreen();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('saves a new price and tags in cents', async () => {
      await openStep(makeDetail(), 'price');
      mockUpdate.mockResolvedValue(makeDetail());
      await waitFor(() => expect(screen.getByLabelText('Price (USD)').props.value).toBe('29.99'));
      await fireEvent.changeText(screen.getByLabelText('Price (USD)'), '19.5');
      await fireEvent.changeText(screen.getByLabelText('Original price (USD)'), '39');
      await fireEvent.press(screen.getByTestId('tag-tag-2'));
      await pressNext();

      await waitFor(() =>
        expect(mockUpdate).toHaveBeenCalledWith({
          priceCents: 1950,
          originalPriceCents: 3900,
          tagIds: ['tag-1', 'tag-2'],
        }),
      );
    });

    it('Free clears the prices and saves a zero price', async () => {
      await openStep(makeDetail(), 'price');
      mockUpdate.mockResolvedValue(makeDetail({ priceCents: 0 }));
      await waitFor(() => expect(screen.getByLabelText('Price (USD)').props.value).toBe('29.99'));
      await fireEvent.press(screen.getByLabelText('Free'));
      expect(screen.queryByLabelText('Price (USD)')).not.toBeOnTheScreen();
      await pressNext();

      await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ priceCents: 0 }));
    });
  });

  describe('published course', () => {
    it('keeps the major fields locked until a revision exists', async () => {
      mockWorkflow.mockResolvedValue(undefined);
      await openStep(makeDetail({ status: 'PUBLISHED' }));

      expect(await screen.findByTestId('edit-notice-published')).toBeOnTheScreen();
      expect(screen.getByLabelText('Title')).toHaveProp('editable', false);
      await fireEvent.press(screen.getByTestId('edit-start-revision'));
      await waitFor(() => expect(mockWorkflow).toHaveBeenCalledWith('createRevision'));
    });

    it('saves a minor change by PATCH and a major change in the revision', async () => {
      const revision = makeRevision('OPEN');
      const detail = makeDetail({ status: 'PUBLISHED', revision });
      mockUpdate.mockResolvedValue(detail);
      mockSaveRevision.mockResolvedValue(detail);
      await openStep(detail);

      expect(await screen.findByTestId('edit-notice-revision')).toBeOnTheScreen();
      await waitFor(() => expect(screen.getByLabelText('Title').props.value).toBe('New title'));
      await fireEvent.changeText(screen.getByLabelText('Title'), 'Even newer title');
      await pressNext();
      await waitFor(() => expect(mockSaveRevision).toHaveBeenCalled());
      expect(mockSaveRevision).toHaveBeenCalledWith({
        ...revision.payload,
        title: 'Even newer title',
      });
      expect(mockUpdate).not.toHaveBeenCalled();

      await screen.findByText('Introduce your course');
      await fireEvent.changeText(screen.getByLabelText('Subtitle'), 'Updated subtitle');
      await pressNext();
      await waitFor(() =>
        expect(mockUpdate).toHaveBeenCalledWith({ subtitle: 'Updated subtitle' }),
      );
    });

    it('submits the revision from the Review step', async () => {
      const detail = makeDetail({ status: 'PUBLISHED', revision: makeRevision('OPEN') });
      mockWorkflow.mockResolvedValue(detail);
      await openStep(detail, 'review');

      await fireEvent.press(screen.getByTestId('wizard-submit'));

      await waitFor(() => expect(mockWorkflow).toHaveBeenCalledWith('submitRevision'));
      expect(screen.getByText('Submit revision')).toBeOnTheScreen();
      await waitFor(() =>
        expect(mockReplace).toHaveBeenCalledWith({
          pathname: '/studio/[id]',
          params: { id: 'course-1' },
        }),
      );
    });

    it('offers only Done on the Review step while no revision is open', async () => {
      await openStep(makeDetail({ status: 'PUBLISHED' }), 'review');
      expect(screen.queryByTestId('wizard-submit')).not.toBeOnTheScreen();
      await fireEvent.press(screen.getByTestId('wizard-done'));
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/studio/[id]',
        params: { id: 'course-1' },
      });
    });
  });

  describe('review step', () => {
    it('previews the course and submits it, then opens the status screen', async () => {
      mockWorkflow.mockResolvedValue(makeDetail({ status: 'PENDING_REVIEW' }));
      await openStep(makeDetail({ priceCents: 2999, lessonCount: 1 }), 'review');

      expect(screen.getByTestId('review-preview')).toBeOnTheScreen();
      expect(screen.getByText('React Native Bootcamp')).toBeOnTheScreen();
      expect(screen.getByText('Ship real apps')).toBeOnTheScreen();
      expect(screen.getByText('$29.99')).toBeOnTheScreen();
      expect(screen.getByText('1 lesson - 12 mins')).toBeOnTheScreen();
      expect(screen.getByTestId('review-ready')).toBeOnTheScreen();

      await fireEvent.press(screen.getByTestId('wizard-submit'));

      await waitFor(() => expect(mockWorkflow).toHaveBeenCalledWith('submit'));
      await waitFor(() =>
        expect(mockReplace).toHaveBeenCalledWith({
          pathname: '/studio/[id]',
          params: { id: 'course-1' },
        }),
      );
    });

    it('lists what is missing, blocks submit and jumps to the step that fixes each item', async () => {
      const missing: CourseMissingItemDto[] = [
        { code: 'NO_THUMBNAIL' },
        { code: 'PRICE_INVALID' },
        { code: 'NOT_ENOUGH_LESSONS' },
      ];
      await openStep(makeDetail({ missing }), 'review');

      expect(screen.getByTestId('wizard-submit')).toBeDisabled();
      await fireEvent.press(screen.getByText('Upload a cover image.'));
      expect(await screen.findByText('Introduce your course')).toBeOnTheScreen();

      await fireEvent.press(screen.getByTestId('wizard-step-review'));
      await fireEvent.press(await screen.findByText('Add at least 3 lessons in total.'));
      expect(await screen.findByText('curriculum-content')).toBeOnTheScreen();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('shows the missing list the server sent back when submit is refused', async () => {
      mockWorkflow.mockRejectedValue(
        new AppError({
          status: 422,
          code: 'COURSE_INCOMPLETE',
          message: 'Course is incomplete',
          details: { missing: [{ code: 'PREVIEW_COUNT' }] },
        }),
      );
      await openStep(makeDetail(), 'review');
      await fireEvent.press(screen.getByTestId('wizard-submit'));

      expect(await screen.findByText('Mark 1 to 3 lessons as free previews.')).toBeOnTheScreen();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('saves pending fields before submitting', async () => {
      mockUpdate.mockResolvedValue(makeDetail());
      mockWorkflow.mockResolvedValue(makeDetail());
      await openStep(makeDetail(), 'intro');
      await waitFor(() =>
        expect(screen.getByLabelText('Subtitle').props.value).toBe('Ship real apps'),
      );
      await fireEvent.changeText(screen.getByLabelText('Subtitle'), 'Late change');
      await fireEvent.press(screen.getByTestId('wizard-step-review'));
      await fireEvent.press(await screen.findByTestId('wizard-submit'));

      await waitFor(() => expect(mockWorkflow).toHaveBeenCalledWith('submit'));
      expect(mockUpdate).toHaveBeenCalledWith({ subtitle: 'Late change' });
    });
  });

  describe('locked and loading states', () => {
    it('locks every field while the course is in review and saves nothing', async () => {
      await openStep(makeDetail({ status: 'PENDING_REVIEW' }), 'intro');

      expect(await screen.findByTestId('edit-notice-locked')).toBeOnTheScreen();
      expect(screen.getByLabelText('Subtitle')).toHaveProp('editable', false);
      expect(screen.queryByTestId('intro-help-write')).not.toBeOnTheScreen();
      await pressNext();
      expect(await screen.findByText('Price and tags')).toBeOnTheScreen();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('shows a loading skeleton and an error state with Retry', async () => {
      mockQuery = { data: undefined, isPending: true, isError: false, fetchStatus: 'fetching' };
      const { unmount } = await renderWithProviders(<CourseWizardScreen courseId="course-1" />);
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
      await renderWithProviders(<CourseWizardScreen courseId="course-1" />);
      await fireEvent.press(screen.getByText('Retry'));
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('renders in Vietnamese and dark', async () => {
      await renderWithProviders(<CourseWizardScreen courseId="new" />, {
        language: 'vi',
        theme: 'dark',
      });
      expect(screen.getByText('Khóa học mới')).toBeOnTheScreen();
      expect(screen.getByText('Khóa học của bạn nói về gì?')).toBeOnTheScreen();
      expect(screen.getByLabelText('Tiêu đề')).toBeOnTheScreen();
      expect(screen.getByText('Giá & thẻ')).toBeOnTheScreen();
      expect(screen.getAllByText('Gợi ý bằng AI').length).toBeGreaterThan(0);
      expect(screen.getByText('Tiếp')).toBeOnTheScreen();
    });
  });
});
