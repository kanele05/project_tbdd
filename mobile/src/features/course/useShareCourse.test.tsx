import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Platform, Share } from 'react-native';

import { showToast } from '@/components/ui/Toast';
import { i18n } from '@/i18n';
import { queryKeys } from '@/lib/queryKeys';
import { createTestQueryClient } from '@/test/queryWrapper';

import { useShareCourse } from './useShareCourse';

const mockShareApi = jest.fn();
const mockCopy = jest.fn();

jest.mock('expo-clipboard', () => ({ setStringAsync: (text: string) => mockCopy(text) }));
jest.mock('@/components/ui/Toast', () => ({ showToast: jest.fn() }));

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
  const queryClient = createTestQueryClient();
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

  it('counts a Web Share API share that resolves undefined', async () => {
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue(undefined as unknown as Awaited<ReturnType<typeof Share.share>>);
    mockShareApi.mockResolvedValue({ shareCount: 14 });
    const { result } = await setup();

    await act(async () => {
      await result.current();
    });

    await waitFor(() => expect(mockShareApi).toHaveBeenCalledWith('c1'));
    shareSpy.mockRestore();
  });

  describe('on the web without the Web Share API', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'web');
      mockCopy.mockResolvedValue(true);
    });
    afterEach(() => jest.restoreAllMocks());

    it('copies the course link, shows a toast and counts the share', async () => {
      await i18n.changeLanguage('en');
      const shareSpy = jest.spyOn(Share, 'share');
      mockShareApi.mockResolvedValue({ shareCount: 8 });
      const { result } = await setup();

      await act(async () => {
        await result.current();
      });

      expect(shareSpy).not.toHaveBeenCalled();
      expect(mockCopy).toHaveBeenCalledWith(expect.stringMatching(/\/course\/c1$/));
      expect(showToast).toHaveBeenCalledWith('Course link copied', { type: 'success' });
      await waitFor(() => expect(mockShareApi).toHaveBeenCalledWith('c1'));
    });

    it('shows an error toast and does not count when the copy fails', async () => {
      await i18n.changeLanguage('en');
      mockCopy.mockRejectedValue(new Error('denied'));
      const { result } = await setup();

      await act(async () => {
        await result.current();
      });

      expect(showToast).toHaveBeenCalledWith('Could not copy the course link', { type: 'error' });
      expect(mockShareApi).not.toHaveBeenCalled();
    });

    it('uses the Vietnamese toast text when the UI language is Vietnamese', async () => {
      await i18n.changeLanguage('vi');
      const { result } = await setup();

      await act(async () => {
        await result.current();
      });

      expect(showToast).toHaveBeenCalledWith('Đã sao chép liên kết khóa học', { type: 'success' });
    });
  });
});
