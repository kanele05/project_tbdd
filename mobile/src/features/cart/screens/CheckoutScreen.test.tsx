import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { makeCourse } from '@/components/course/courseFixtures';
import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';
import type { CheckoutResponse } from '@/types/api';

import { CheckoutScreen } from './CheckoutScreen';

const mockPush = jest.fn();
const mockDismissTo = jest.fn();
const mockBack = jest.fn();
const mockPay = jest.fn();
let mockCartState: Record<string, unknown> = {};

jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockPush(href),
    dismissTo: (href: string) => mockDismissTo(href),
    back: () => mockBack(),
    canGoBack: () => true,
  },
}));

jest.mock('../hooks', () => ({
  useCart: () => mockCartState,
  useCheckout: () => ({ mutateAsync: mockPay, isPending: false }),
}));

const A = makeCourse({ id: 'a', title: 'UX Foundation', priceCents: 5900 });
const B = makeCourse({ id: 'b', title: 'Python Introduction', priceCents: 2500 });

const SUCCESS: CheckoutResponse = {
  order: {
    id: 'o1',
    totalCents: 8400,
    status: 'PAID',
    paymentMethod: 'MOCK_CARD',
    createdAt: '2026-10-01T00:00:00Z',
    paidAt: '2026-10-01T00:00:00Z',
    items: [
      { courseId: 'a', priceCents: 5900 },
      { courseId: 'b', priceCents: 2500 },
    ],
  },
  enrolledCourseIds: ['a', 'b'],
};

function withCart() {
  mockCartState = {
    data: {
      items: [A, B].map((course) => ({ course, addedAt: '2026-10-01T00:00:00Z' })),
      totalCents: 8400,
    },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  };
}

async function renderScreen() {
  return render(
    <ToastProvider>
      <CheckoutScreen />
    </ToastProvider>,
  );
}

const PAYMENT_FAILED = new AppError({ status: 402, code: 'PAYMENT_FAILED', message: 'declined' });

describe('CheckoutScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    withCart();
  });

  it('shows the order summary, the demo note and Pay with the total', async () => {
    await renderScreen();

    expect(screen.getByText('UX Foundation')).toBeOnTheScreen();
    expect(screen.getByText('Python Introduction')).toBeOnTheScreen();
    expect(screen.getByTestId('order-total')).toHaveTextContent('$84');
    expect(screen.getByText('Demo payment — no real card needed')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Pay $84' })).toBeOnTheScreen();
  });

  it('selects Mock Card by default and can switch to Mock E-wallet', async () => {
    mockPay.mockResolvedValue(SUCCESS);
    await renderScreen();

    expect(screen.getByRole('radio', { name: /Mock Card/ })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: /Mock E-wallet/ }));
    expect(screen.getByRole('radio', { name: /Mock E-wallet/ })).toBeChecked();

    await fireEvent.press(screen.getByRole('button', { name: 'Pay $84' }));
    await waitFor(() => expect(mockPay).toHaveBeenCalledWith({ paymentMethod: 'MOCK_EWALLET' }));
  });

  it('shows the success result and opens the first purchased course', async () => {
    mockPay.mockResolvedValue(SUCCESS);
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Pay $84' }));

    expect(await screen.findByText('Payment successful')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Start learning' }));
    expect(mockDismissTo).toHaveBeenCalledWith('/my-courses');
    expect(mockPush).toHaveBeenCalledWith('/learn/a');
  });

  it('goes to My Courses from the success result', async () => {
    mockPay.mockResolvedValue(SUCCESS);
    await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Pay $84' }));

    await fireEvent.press(await screen.findByRole('button', { name: 'Go to My Courses' }));

    expect(mockDismissTo).toHaveBeenCalledWith('/my-courses');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows the failure result on 402 and "Try again" returns to the form with the cart intact', async () => {
    mockPay.mockRejectedValue(PAYMENT_FAILED);
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Pay $84' }));

    expect(await screen.findByText('Payment failed')).toBeOnTheScreen();
    expect(screen.queryByText('Payment successful')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('UX Foundation')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Pay $84' })).toBeOnTheScreen();
  });

  it('goes back to the cart from the failure result', async () => {
    mockPay.mockRejectedValue(PAYMENT_FAILED);
    await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Pay $84' }));

    await fireEvent.press(await screen.findByRole('button', { name: 'Back to cart' }));
    expect(mockBack).toHaveBeenCalled();
  });

  it('stays on the form with a toast for other errors (e.g. offline)', async () => {
    mockPay.mockRejectedValue(new AppError({ status: 0, code: 'OFFLINE', message: 'x' }));
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Pay $84' }));

    expect(await screen.findByText("You're offline")).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Pay $84' })).toBeOnTheScreen();
    expect(screen.queryByText('Payment failed')).not.toBeOnTheScreen();
  });

  describe('simulate failure switch', () => {
    const globalWithDev = globalThis as unknown as { __DEV__: boolean };
    const original = globalWithDev.__DEV__;
    afterEach(() => {
      globalWithDev.__DEV__ = original;
    });

    it('is shown in dev builds and sends simulateFailure: true when on', async () => {
      globalWithDev.__DEV__ = true;
      mockPay.mockRejectedValue(PAYMENT_FAILED);
      await renderScreen();

      await fireEvent(screen.getByLabelText('Simulate payment failure'), 'valueChange', true);
      await fireEvent.press(screen.getByRole('button', { name: 'Pay $84' }));

      await waitFor(() =>
        expect(mockPay).toHaveBeenCalledWith({
          paymentMethod: 'MOCK_CARD',
          simulateFailure: true,
        }),
      );
    });

    it('is hidden in production builds', async () => {
      globalWithDev.__DEV__ = false;
      await renderScreen();

      expect(screen.queryByText('Simulate payment failure')).not.toBeOnTheScreen();
    });
  });

  it('shows the empty state when the cart has no items', async () => {
    mockCartState = { data: { items: [], totalCents: 0 }, isPending: false, isError: false };
    await renderScreen();

    expect(screen.getByText('Your cart is empty')).toBeOnTheScreen();
    expect(screen.queryByTestId('pay-button')).not.toBeOnTheScreen();
  });

  it('shows a skeleton while loading and an error with Retry', async () => {
    mockCartState = { data: undefined, isPending: true, isError: false };
    const { unmount } = await renderScreen();
    expect(screen.getByTestId('checkout-skeleton')).toBeOnTheScreen();
    await unmount();

    const refetch = jest.fn();
    mockCartState = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'x' }),
      refetch,
    };
    await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
  });
});
