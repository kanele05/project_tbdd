import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { queryKeys } from '@/lib/queryKeys';
import { createTestQueryClient, flushNotifications } from '@/test/queryWrapper';
import type { CartDto, CheckoutResponse, CourseDetail, CourseSummary } from '@/types/api';

import { useAddToCart, useCart, useCartCount, useCheckout, useRemoveFromCart } from './hooks';

const mockGet = jest.fn();
const mockAdd = jest.fn();
const mockRemove = jest.fn();
const mockCheckout = jest.fn();

jest.mock('./api', () => ({
  cartApi: {
    get: () => mockGet(),
    add: (id: string) => mockAdd(id),
    remove: (id: string) => mockRemove(id),
    checkout: (body: unknown) => mockCheckout(body),
  },
}));

function makeSummary(id: string): CourseSummary {
  return {
    id,
    title: `Course ${id}`,
    thumbnailUrl: 'https://example.com/t.png',
    teacher: { id: 't1', fullName: 'Teacher' },
    priceCents: 1000,
    originalPriceCents: null,
    badge: null,
    discountPercent: null,
    ratingAvg: 4,
    ratingCount: 1,
    lessonCount: 1,
    totalDurationSec: 60,
    isBookmarked: false,
  };
}

const CART: CartDto = {
  items: [
    { course: makeSummary('a'), addedAt: '2026-10-01T00:00:00Z' },
    { course: makeSummary('b'), addedAt: '2026-10-01T00:00:00Z' },
  ],
  totalCents: 2000,
};

function setup() {
  // No retries and no gc timers: a pending 5-minute timer keeps the Jest worker from exiting.
  const queryClient = createTestQueryClient();
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, invalidate, wrapper };
}

/** Waits for TanStack's batched notification so no state update happens outside act(). */
async function settled(result: { current: { isPending: boolean } }) {
  await waitFor(() => expect(result.current.isPending).toBe(false));
  await act(flushNotifications);
}

function invalidatedKeys(spy: jest.SpyInstance): unknown[][] {
  return spy.mock.calls.map(([filters]) => (filters as { queryKey: unknown[] }).queryKey);
}

describe('cart hooks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('useCart loads GET /cart', async () => {
    mockGet.mockResolvedValue(CART);
    const { wrapper } = setup();

    const { result } = await renderHook(() => useCart(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(CART));
  });

  it('useCartCount returns the number of items (0 until loaded)', async () => {
    // Deferred response: the "0 until loaded" assertion must not race the fetch.
    let resolveCart: (cart: typeof CART) => void = () => undefined;
    mockGet.mockReturnValue(new Promise<typeof CART>((resolve) => (resolveCart = resolve)));
    const { wrapper } = setup();

    const { result } = await renderHook(() => useCartCount(), { wrapper });

    expect(result.current).toBe(0);
    await act(async () => {
      resolveCart(CART);
    });
    await waitFor(() => expect(result.current).toBe(2));
  });

  it('useAddToCart flips isInCart on the cached course and refreshes cart + course', async () => {
    mockAdd.mockResolvedValue(undefined);
    const { queryClient, invalidate, wrapper } = setup();
    queryClient.setQueryData(queryKeys.course('a'), { id: 'a', isInCart: false } as CourseDetail);

    const { result } = await renderHook(() => useAddToCart(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('a');
    });
    await settled(result);

    expect(mockAdd).toHaveBeenCalledWith('a');
    expect(queryClient.getQueryData<CourseDetail>(queryKeys.course('a'))?.isInCart).toBe(true);
    expect(invalidatedKeys(invalidate)).toEqual(
      expect.arrayContaining([queryKeys.cart(), queryKeys.course('a')]),
    );
  });

  it('useAddToCart refreshes the course even when the server says it is already in the cart', async () => {
    mockAdd.mockRejectedValue(new Error('ALREADY_IN_CART'));
    const { invalidate, wrapper } = setup();

    const { result } = await renderHook(() => useAddToCart(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('a').catch(() => undefined);
    });
    await settled(result);

    expect(invalidatedKeys(invalidate)).toEqual(expect.arrayContaining([queryKeys.course('a')]));
  });

  it('useRemoveFromCart deletes the item and refreshes cart + course', async () => {
    mockRemove.mockResolvedValue(undefined);
    const { invalidate, wrapper } = setup();

    const { result } = await renderHook(() => useRemoveFromCart(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('a');
    });
    await settled(result);

    expect(mockRemove).toHaveBeenCalledWith('a');
    expect(invalidatedKeys(invalidate)).toEqual(
      expect.arrayContaining([queryKeys.cart(), queryKeys.course('a')]),
    );
  });

  describe('useCheckout', () => {
    const RESPONSE: CheckoutResponse = {
      order: {
        id: 'o1',
        totalCents: 2000,
        status: 'PAID',
        paymentMethod: 'MOCK_CARD',
        createdAt: '2026-10-01T00:00:00Z',
        paidAt: '2026-10-01T00:00:00Z',
        items: [],
      },
      enrolledCourseIds: ['a', 'b'],
    };

    it('invalidates cart, my courses, stats, home, notifications and each purchased course', async () => {
      mockCheckout.mockResolvedValue(RESPONSE);
      const { invalidate, wrapper } = setup();

      const { result } = await renderHook(() => useCheckout(), { wrapper });
      await act(async () => {
        await result.current.mutateAsync({ paymentMethod: 'MOCK_CARD' });
      });
      await settled(result);

      expect(mockCheckout).toHaveBeenCalledWith({ paymentMethod: 'MOCK_CARD' });
      expect(invalidatedKeys(invalidate)).toEqual(
        expect.arrayContaining([
          queryKeys.cart(),
          queryKeys.meCoursesAll(),
          queryKeys.meStats(),
          queryKeys.home(),
          queryKeys.notifications(),
          queryKeys.course('a'),
          queryKeys.course('b'),
        ]),
      );
    });

    it('leaves every cache alone when the payment fails', async () => {
      mockCheckout.mockRejectedValue(new Error('PAYMENT_FAILED'));
      const { invalidate, wrapper } = setup();

      const { result } = await renderHook(() => useCheckout(), { wrapper });
      await act(async () => {
        await result.current
          .mutateAsync({ paymentMethod: 'MOCK_CARD', simulateFailure: true })
          .catch(() => undefined);
      });
      await settled(result);

      expect(mockCheckout).toHaveBeenCalledWith({
        paymentMethod: 'MOCK_CARD',
        simulateFailure: true,
      });
      expect(invalidate).not.toHaveBeenCalled();
    });
  });
});
