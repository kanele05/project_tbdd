import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AppError } from '@/lib/appError';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { AiCourseDraftDto, StudioCourseDetailDto } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

import { useAiDraftStore } from '../aiDraftStore';
import { makeDetail } from '../studioFixtures';
import { AiDraftScreen } from './AiDraftScreen';

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockGenerate = jest.fn();
const mockAddSection = jest.fn();
let mockCourse: { data?: StudioCourseDetailDto } = {};

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    back: () => mockBack(),
    canGoBack: () => true,
  },
}));

jest.mock('@/utils/confirmAction', () => ({ confirmAction: jest.fn() }));

jest.mock('@/features/search/hooks', () => ({
  useCategories: () => ({
    isPending: false,
    isError: false,
    data: [
      { id: 'cat-1', name: 'Code' },
      { id: 'cat-2', name: 'Design' },
    ],
  }),
}));

jest.mock('../hooks', () => ({
  useAiCourseDraft: () => ({ mutateAsync: mockGenerate, isPending: false, isError: false }),
  useStudioCourse: () => mockCourse,
  useCurriculumMutations: () => ({ addSection: { mutateAsync: mockAddSection } }),
}));

const DRAFT: AiCourseDraftDto = {
  topic: 'React Native',
  level: 'beginner',
  lang: 'en',
  subtitle: 'Build mobile apps fast',
  description: 'A hands-on course that takes you from zero to a published mobile app.',
  benefits: ['Build apps', 'Ship to stores', 'Use Expo'],
  categoryId: 'cat-1',
  sections: [
    { title: 'Intro', lessons: [{ title: 'What is RN', summary: 'Overview' }] },
    {
      title: 'Core',
      lessons: [
        { title: 'Components', summary: 'Views and text' },
        { title: 'State', summary: 'Hooks' },
      ],
    },
  ],
  model: 'mock',
  generatedAt: '2026-10-10T00:00:00.000Z',
};

const confirm = jest.mocked(confirmAction);

async function generate() {
  await fireEvent.changeText(screen.getByLabelText('Topic'), 'React Native for beginners');
  await fireEvent.press(screen.getByTestId('ai-generate'));
}

describe('AiDraftScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerate.mockResolvedValue(DRAFT);
    confirm.mockResolvedValue(true);
    mockCourse = { data: makeDetail() };
  });
  afterEach(async () => {
    await act(async () => useAiDraftStore.getState().clear());
  });

  it('asks the AI with the chosen topic, level and language', async () => {
    await renderWithProviders(<AiDraftScreen courseId="course-1" topic="Prefilled" />);
    expect(screen.getByLabelText('Topic').props.value).toBe('Prefilled');

    await fireEvent.press(screen.getByTestId('ai-level-advanced'));
    await fireEvent.press(screen.getByTestId('ai-lang-vi'));
    await generate();

    await waitFor(() =>
      expect(mockGenerate).toHaveBeenCalledWith({
        topic: 'React Native for beginners',
        level: 'advanced',
        lang: 'vi',
      }),
    );
    expect(await screen.findByTestId('ai-draft-result')).toBeOnTheScreen();
    expect(screen.getByLabelText('Subtitle').props.value).toBe('Build mobile apps fast');
    expect(screen.getByTestId('ai-category-name')).toHaveTextContent('Code');
  });

  it('offers only the subtitle and the description when opened by "Help me write"', async () => {
    await renderWithProviders(<AiDraftScreen courseId="course-1" topic="x" scope="text" />);
    await generate();
    await screen.findByTestId('ai-draft-result');

    expect(screen.getByTestId('ai-part-subtitle')).toBeOnTheScreen();
    expect(screen.getByTestId('ai-part-description')).toBeOnTheScreen();
    expect(screen.queryByTestId('ai-part-category')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('ai-part-benefits')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('ai-part-outline')).not.toBeOnTheScreen();
  });

  it('defaults the language to the one the app is shown in', async () => {
    await renderWithProviders(<AiDraftScreen courseId="course-1" />, { language: 'vi' });
    await fireEvent.changeText(screen.getByLabelText('Chủ đề'), 'Lập trình mobile');
    await fireEvent.press(screen.getByTestId('ai-generate'));
    await waitFor(() =>
      expect(mockGenerate).toHaveBeenCalledWith(expect.objectContaining({ lang: 'vi' })),
    );
  });

  it('requires a topic of at least 3 characters', async () => {
    await renderWithProviders(<AiDraftScreen courseId="course-1" />);
    await fireEvent.changeText(screen.getByLabelText('Topic'), 'ab');
    await fireEvent.press(screen.getByTestId('ai-generate'));

    expect(
      await screen.findByText('Describe the topic in at least 3 characters.'),
    ).toBeOnTheScreen();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('hands the applied parts to the editor, one by one', async () => {
    await renderWithProviders(<AiDraftScreen courseId="course-1" />);
    await generate();
    await screen.findByTestId('ai-draft-result');

    await fireEvent.press(screen.getByTestId('ai-apply-subtitle'));
    await fireEvent.press(screen.getByTestId('ai-apply-benefits'));

    expect(useAiDraftStore.getState().pendingFields).toEqual({
      subtitle: DRAFT.subtitle,
      benefits: DRAFT.benefits,
    });
    expect(screen.queryByTestId('ai-apply-subtitle')).not.toBeOnTheScreen();
    expect(screen.getByTestId('ai-apply-description')).toBeOnTheScreen();
  });

  it('creates the sections of the outline after a confirmation and plans the lessons', async () => {
    mockAddSection.mockResolvedValueOnce({ id: 's-intro' }).mockResolvedValueOnce({ id: 's-core' });
    await renderWithProviders(<AiDraftScreen courseId="course-1" />);
    await generate();
    await screen.findByTestId('ai-draft-result');

    await fireEvent.press(screen.getByTestId('ai-apply-outline'));

    await waitFor(() => expect(mockAddSection).toHaveBeenCalledTimes(2));
    expect(confirm).toHaveBeenCalled();
    expect(mockAddSection).toHaveBeenNthCalledWith(1, { title: 'Intro' });
    expect(useAiDraftStore.getState().plannedLessons['s-core']).toHaveLength(2);
    // The sheet closes; the wizard under it shows the Lessons step.
    expect(mockBack).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('creates nothing when the outline confirmation is declined', async () => {
    confirm.mockResolvedValue(false);
    await renderWithProviders(<AiDraftScreen courseId="course-1" />);
    await generate();
    await screen.findByTestId('ai-draft-result');

    await fireEvent.press(screen.getByTestId('ai-apply-outline'));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(mockAddSection).not.toHaveBeenCalled();
  });

  it('cannot apply the outline to a course that does not exist yet or is not a draft', async () => {
    const first = await renderWithProviders(<AiDraftScreen courseId="new" />);
    await generate();
    await screen.findByTestId('ai-draft-result');
    expect(screen.getByTestId('ai-apply-outline')).toBeDisabled();
    expect(
      screen.getByText(
        'Press Next on the first step to create the draft, then apply the outline from the Lessons step.',
      ),
    ).toBeOnTheScreen();
    first.unmount();

    mockCourse = { data: makeDetail({ status: 'PUBLISHED' }) };
    await renderWithProviders(<AiDraftScreen courseId="course-1" />);
    await generate();
    await screen.findByTestId('ai-draft-result');
    expect(screen.getByTestId('ai-apply-outline')).toBeDisabled();
    expect(
      screen.getByText('The outline can only be applied to a draft or rejected course.'),
    ).toBeOnTheScreen();
  });

  it.each([
    ['AI_RATE_LIMITED', 'The AI assistant is busy right now.'],
    ['AI_UNAVAILABLE', "The AI assistant isn't available at the moment."],
    ['AI_BLOCKED', "The AI assistant can't answer this request."],
  ])('explains %s in plain words', async (code, text) => {
    mockGenerate.mockRejectedValue(new AppError({ status: 429, code, message: 'raw' }));
    await renderWithProviders(<AiDraftScreen courseId="course-1" />);
    await generate();
    expect(await screen.findByTestId('form-error')).toHaveTextContent(new RegExp(text));
  });

  it('offers Next once every part that can be applied is applied, and hands over to the wizard', async () => {
    await renderWithProviders(<AiDraftScreen courseId="new" />);
    await generate();
    await screen.findByTestId('ai-draft-result');

    await fireEvent.press(screen.getByTestId('ai-apply-subtitle'));
    await fireEvent.press(screen.getByTestId('ai-apply-description'));
    await fireEvent.press(screen.getByTestId('ai-apply-category'));
    expect(screen.queryByTestId('ai-next')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('ai-apply-benefits'));

    await fireEvent.press(screen.getByTestId('ai-next'));
    expect(useAiDraftStore.getState().isAdvanceRequested).toBe(true);
    expect(useAiDraftStore.getState().pendingFields).toEqual(
      expect.objectContaining({
        title: 'React Native for beginners',
        subtitle: DRAFT.subtitle,
        categoryId: 'cat-1',
      }),
    );
    expect(mockBack).toHaveBeenCalled();
  });

  describe('category', () => {
    it('shows the suggested category by name and queues its id on Apply', async () => {
      await renderWithProviders(<AiDraftScreen courseId="new" />);
      await generate();
      await screen.findByTestId('ai-draft-result');

      expect(screen.getByTestId('ai-category-name')).toHaveTextContent('Code');
      await fireEvent.press(screen.getByTestId('ai-apply-category'));
      expect(useAiDraftStore.getState().pendingFields).toEqual({ categoryId: 'cat-1' });
      expect(screen.queryByTestId('ai-apply-category')).not.toBeOnTheScreen();
    });

    it.each([null, 'cat-unknown'])(
      'offers no Apply for categoryId %s and still offers Next once the rest is applied',
      async (categoryId) => {
        mockGenerate.mockResolvedValue({ ...DRAFT, categoryId });
        await renderWithProviders(<AiDraftScreen courseId="new" />);
        await generate();
        await screen.findByTestId('ai-draft-result');

        expect(screen.queryByTestId('ai-apply-category')).not.toBeOnTheScreen();
        expect(screen.getByTestId('ai-hint-category')).toHaveTextContent(
          'No existing category fits this topic. Pick one in the form.',
        );
        for (const part of ['subtitle', 'description', 'benefits']) {
          await fireEvent.press(screen.getByTestId(`ai-apply-${part}`));
        }
        expect(screen.getByTestId('ai-next')).toBeOnTheScreen();
      },
    );

    it('does not offer the category of a published course (major field)', async () => {
      mockCourse = { data: makeDetail({ status: 'PUBLISHED' }) };
      await renderWithProviders(<AiDraftScreen courseId="course-1" />);
      await generate();
      await screen.findByTestId('ai-draft-result');

      expect(screen.queryByTestId('ai-apply-category')).not.toBeOnTheScreen();
      expect(screen.getByTestId('ai-hint-category')).toHaveTextContent(
        'A published course changes its category only through a revision.',
      );
    });
  });

  describe('editing before Apply', () => {
    it('applies the edited subtitle, and editing after Apply re-enables Apply', async () => {
      await renderWithProviders(<AiDraftScreen courseId="new" />);
      await generate();
      await screen.findByTestId('ai-draft-result');

      await fireEvent.changeText(screen.getByLabelText('Subtitle'), '  My own subtitle ');
      await fireEvent.press(screen.getByTestId('ai-apply-subtitle'));
      expect(useAiDraftStore.getState().pendingFields).toEqual({ subtitle: 'My own subtitle' });
      expect(screen.queryByTestId('ai-apply-subtitle')).not.toBeOnTheScreen();

      await fireEvent.changeText(screen.getByLabelText('Subtitle'), 'Another version');
      await fireEvent.press(screen.getByTestId('ai-apply-subtitle'));
      expect(useAiDraftStore.getState().pendingFields).toEqual({ subtitle: 'Another version' });
    });

    it('applies the edited description', async () => {
      await renderWithProviders(<AiDraftScreen courseId="new" />);
      await generate();
      await screen.findByTestId('ai-draft-result');

      await fireEvent.changeText(screen.getByLabelText('Description'), 'Shorter text');
      await fireEvent.press(screen.getByTestId('ai-apply-description'));
      expect(useAiDraftStore.getState().pendingFields).toEqual({ description: 'Shorter text' });
    });

    it('applies the learning points left after removing one and editing another', async () => {
      await renderWithProviders(<AiDraftScreen courseId="new" />);
      await generate();
      await screen.findByTestId('ai-draft-result');

      await fireEvent.press(screen.getByLabelText('Remove learning point 2'));
      await fireEvent.changeText(screen.getByLabelText('Learning point 2'), 'Use Expo Router');
      await fireEvent.press(screen.getByTestId('ai-apply-benefits'));
      expect(useAiDraftStore.getState().pendingFields).toEqual({
        benefits: ['Build apps', 'Use Expo Router'],
      });
    });

    it('adds a learning point', async () => {
      await renderWithProviders(<AiDraftScreen courseId="new" />);
      await generate();
      await screen.findByTestId('ai-draft-result');

      await fireEvent.press(screen.getByTestId('benefit-add'));
      await fireEvent.changeText(screen.getByLabelText('Learning point 4'), 'Debug fast');
      await fireEvent.press(screen.getByTestId('ai-apply-benefits'));
      expect(useAiDraftStore.getState().pendingFields?.benefits).toHaveLength(4);
    });

    it('creates only the sections that are left in the edited outline', async () => {
      mockAddSection.mockResolvedValue({ id: 's-core' });
      await renderWithProviders(<AiDraftScreen courseId="course-1" />);
      await generate();
      await screen.findByTestId('ai-draft-result');

      await fireEvent.press(screen.getByLabelText('Remove section 1'));
      await fireEvent.press(screen.getByLabelText('Remove lesson 2 of section 1'));
      await fireEvent.changeText(screen.getByLabelText('Section 1 title'), 'Core ideas');
      await fireEvent.press(screen.getByTestId('ai-apply-outline'));

      await waitFor(() => expect(mockAddSection).toHaveBeenCalledTimes(1));
      expect(mockAddSection).toHaveBeenCalledWith({ title: 'Core ideas' });
      expect(useAiDraftStore.getState().plannedLessons['s-core']).toEqual([
        { title: 'Components', summary: 'Views and text' },
      ]);
    });

    it('cannot apply an outline whose sections were all removed', async () => {
      await renderWithProviders(<AiDraftScreen courseId="course-1" />);
      await generate();
      await screen.findByTestId('ai-draft-result');

      await fireEvent.press(screen.getByLabelText('Remove section 2'));
      await fireEvent.press(screen.getByLabelText('Remove section 1'));
      expect(screen.getByTestId('ai-apply-outline')).toBeDisabled();
    });

    it('replaces the edits when the draft is generated again', async () => {
      await renderWithProviders(<AiDraftScreen courseId="new" />);
      await generate();
      await screen.findByTestId('ai-draft-result');
      await fireEvent.changeText(screen.getByLabelText('Subtitle'), 'Edited');

      await fireEvent.press(screen.getByTestId('ai-generate'));
      await waitFor(() =>
        expect(screen.getByLabelText('Subtitle').props.value).toBe('Build mobile apps fast'),
      );
    });
  });

  it('closes with the X button', async () => {
    await renderWithProviders(<AiDraftScreen courseId="course-1" />);
    await fireEvent.press(screen.getByLabelText('Close'));
    expect(mockBack).toHaveBeenCalled();
  });
});
