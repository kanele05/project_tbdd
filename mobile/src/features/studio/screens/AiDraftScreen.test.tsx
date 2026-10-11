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
    expect(screen.getByText('Build mobile apps fast')).toBeOnTheScreen();
  });

  it('offers only the subtitle and the description when opened by "Help me write"', async () => {
    await renderWithProviders(<AiDraftScreen courseId="course-1" topic="x" scope="text" />);
    await generate();
    await screen.findByTestId('ai-draft-result');

    expect(screen.getByTestId('ai-part-subtitle')).toBeOnTheScreen();
    expect(screen.getByTestId('ai-part-description')).toBeOnTheScreen();
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

  it('closes with the X button', async () => {
    await renderWithProviders(<AiDraftScreen courseId="course-1" />);
    await fireEvent.press(screen.getByLabelText('Close'));
    expect(mockBack).toHaveBeenCalled();
  });
});
