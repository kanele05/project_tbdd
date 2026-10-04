import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Share } from 'react-native';

import { i18n } from '@/i18n';
import { queryKeys } from '@/lib/queryKeys';

import { useShareCourse } from './useShareCourse';

const mockShareApi = jest.fn();

jest.mock('@/features/learning/api', () => ({
  learningApi: { share: (courseId: string) => mockShareApi(courseId) },
}));

const COURSE = {
  id: 'c1',
  title: 'UX Foundation',
  teacher: {
    id: 't1',
    fullName: 'Sara Weise',
    avatarUrl: null,
    jobTitle: 'Lead',
    isFollowed: false,
  },
};

async function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = await renderHook(() => useShareCourse(COURSE), { wrapper });
  return { queryClient, ...hook };
}

describe('useShareCourse', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shares a translated message and counts the share when the user shared', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    mockShareApi.mockResolvedValue({ shareCount: 7 });
    const { queryClient, result } = await setup();
    queryClient.setQueryData(queryKeys.course('c1'), { id: 'c1', shareCount: 6 });

    await act(async () => {
      await result.current();
    });

    expect(shareSpy.mock.calls[0]?.[0]?.message).toBe(
      'Check out "UX Foundation" by Sara Weise on E-Learning',
    );
    await waitFor(() => expect(mockShareApi).toHaveBeenCalledWith('c1'));
    await waitFor(() =>
      expect(queryClient.getQueryData(queryKeys.course('c1'))).toMatchObject({ shareCount: 7 }),
    );
    shareSpy.mockRestore();
  });

  it('does not count a dismissed share sheet', async () => {
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.dismissedAction });
    const { result } = await setup();

    await act(async () => {
      await result.current();
    });

    expect(mockShareApi).not.toHaveBeenCalled();
    shareSpy.mockRestore();
  });

  it('writes the message in Vietnamese when the UI language is Vietnamese', async () => {
    await i18n.changeLanguage('vi');
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.dismissedAction });
    const { result } = await setup();

    await act(async () => {
      await result.current();
    });

    expect(shareSpy.mock.calls[0]?.[0]?.message).toBe(
      'Xem khóa học "UX Foundation" của Sara Weise trên E-Learning',
    );
    shareSpy.mockRestore();
  });
});
