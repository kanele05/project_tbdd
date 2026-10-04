import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { makeCourse } from '@/components/course/courseFixtures';
import { aiApi } from '@/features/ai/api';
import { renderWithClient } from '@/features/search/testUtils';
import { AppError } from '@/lib/appError';
import { useAuthStore } from '@/stores/authStore';
import type { AiRecommendationsDto } from '@/types/api';

import { AiRecommendationsCard } from './AiRecommendationsCard';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));
jest.mock('@/features/ai/api', () => ({ aiApi: { recommendations: jest.fn() } }));

const mockRecommendations = aiApi.recommendations as jest.Mock;

const SIGNED_IN_USER = {
  id: 'u1',
  email: 'rosie@example.com',
  fullName: 'Martha Rosie',
  headline: null,
  avatarUrl: null,
  coverUrl: null,
  role: 'STUDENT' as const,
};

function makePath(overrides: Partial<AiRecommendationsDto> = {}): AiRecommendationsDto {
  return {
    lang: 'en',
    encouragement: 'One small step a day makes the difference.',
    items: [
      { course: makeCourse({ id: 'c1', title: 'UX Foundation' }), reason: 'Builds on Design.' },
      { course: makeCourse({ id: 'c2', title: 'UX Research' }), reason: 'Next step after UX.' },
      { course: makeCourse({ id: 'c3', title: 'Prototyping' }), reason: 'Practice your skills.' },
    ],
    model: 'mock-ai-1',
    generatedAt: '2026-10-04T00:00:00Z',
    ...overrides,
  };
}

describe('AiRecommendationsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: SIGNED_IN_USER });
  });

  it('shows the learning path in order with the reason for each course', async () => {
    mockRecommendations.mockResolvedValue(makePath());
    await renderWithClient(<AiRecommendationsCard />);

    expect(await screen.findByText('AI picks for you')).toBeOnTheScreen();
    expect(await screen.findByText('UX Foundation')).toBeOnTheScreen();
    expect(screen.getByText('Builds on Design.')).toBeOnTheScreen();
    expect(screen.getByText('One small step a day makes the difference.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Step 1: UX Foundation/ })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Step 3: Prototyping/ })).toBeOnTheScreen();
    expect(mockRecommendations).toHaveBeenCalledWith('en');
  });

  it('opens the course of a step', async () => {
    mockRecommendations.mockResolvedValue(makePath());
    await renderWithClient(<AiRecommendationsCard />);

    await fireEvent.press(await screen.findByRole('button', { name: /^Step 2: UX Research/ }));

    expect(router.push).toHaveBeenCalledWith('/course/c2');
  });

  it('asks in the Vietnamese language when the app is Vietnamese', async () => {
    mockRecommendations.mockResolvedValue(makePath({ lang: 'vi' }));
    await renderWithClient(<AiRecommendationsCard />, { language: 'vi' });

    expect(await screen.findByText('AI gợi ý cho bạn')).toBeOnTheScreen();
    await waitFor(() => expect(mockRecommendations).toHaveBeenCalledWith('vi'));
  });

  it('is not shown and not requested when signed out', async () => {
    useAuthStore.setState({ user: null });
    await renderWithClient(<AiRecommendationsCard />);

    expect(screen.queryByText('AI picks for you')).not.toBeOnTheScreen();
    expect(mockRecommendations).not.toHaveBeenCalled();
  });

  it('shows a polite message with Try again when the AI is busy (429)', async () => {
    mockRecommendations.mockRejectedValueOnce(
      new AppError({ status: 429, code: 'AI_RATE_LIMITED', message: 'limit' }),
    );
    mockRecommendations.mockResolvedValue(makePath());
    await renderWithClient(<AiRecommendationsCard />);

    expect(
      await screen.findByText(
        'The AI assistant is busy right now. Please wait a moment and try again.',
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('UX Foundation')).toBeOnTheScreen();
    expect(mockRecommendations).toHaveBeenCalledTimes(2);
  });

  it('shows a polite message when the AI is unavailable (503)', async () => {
    mockRecommendations.mockRejectedValue(
      new AppError({ status: 503, code: 'AI_UNAVAILABLE', message: 'down' }),
    );
    await renderWithClient(<AiRecommendationsCard />);

    expect(
      await screen.findByText(
        "The AI assistant isn't available at the moment. Please try again later.",
      ),
    ).toBeOnTheScreen();
  });

  it('invites to explore courses when there is nothing to suggest yet', async () => {
    mockRecommendations.mockResolvedValue(makePath({ items: [], encouragement: '' }));
    await renderWithClient(<AiRecommendationsCard />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Explore courses' }));

    expect(router.navigate).toHaveBeenCalledWith('/search');
  });
});
