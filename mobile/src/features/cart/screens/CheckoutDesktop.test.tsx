import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';

import { makeCourse } from '@/components/course/courseFixtures';
import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';
import { useAuthStore } from '@/stores/authStore';
import type { CheckoutResponse } from '@/types/api';

import { CheckoutScreen } from './CheckoutScreen';

const mockPush = jest.fn();
const mockDismissTo = jest.fn();
const mockBack = jest.fn();
const mockPay = jest.fn();
const mockRefetch = jest.fn();
let mockCartState: Record<string, unknown> = {};

jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockPush(href),
    dismissTo: (href: string) => mockDismissTo(href),
    back: () => mockBack(),
    canGoBack: () => true,
  },
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1280, height: 800, scale: 1, fontScale: 1 })),
}));
jest.mock('../hooks', () => ({
  useCart: () => mockCartState,
  useCheckout: () => ({ mutateAsync: mockPay, isPending: false }),
}));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;

const A = makeCourse({ id: 'a', title: 'UX Foundation', priceCents: 5900 });
const B = makeCourse({
  id: 'b',
  title: 'Python Introduction',
  priceCents: 2500,
  originalPriceCents: 5000,
});

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

function withCart(courses = [A, B], totalCents = 8400) {
  mockCartState = {
    data: {
      items: courses.map((course) => ({ course, addedAt: '2026-10-01T00:00:00Z' })),
      totalCents,
    },
    isPending: false,
    isError: false,
    refetch: mockRefetch,
  };
}

function setWidth(width: number) {
  mockUseWindowDimensions.mockReturnValue({ width, height: 800, scale: 1, fontScale: 1 });
}

async function renderScreen() {
  return render(
    <ToastProvider>
      <CheckoutScreen />
    </ToastProvider>,
  );
}

const PAYMENT_FAILED = new AppError({ status: 402, code: 'PAYMENT_FAILED', message: 'declined' });

describe('CheckoutScreen on a wide window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWidth(1280);
    withCart();
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'rosie@example.com',
        fullName: 'Martha Rosie',
        headline: null,
        avatarUrl: null,
        coverUrl: null,
        role: 'STUDENT',
      },
    });
  });

  it('shows billing, payment method and the order summary in two columns', async () => {
    await renderScreen();

    expect(screen.getByTestId('checkout-columns')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Checkout' })).toBeOnTheScreen();
    expect(screen.getByTestId('billing-panel')).toBeOnTheScreen();
    expect(screen.getByText('rosie@example.com')).toBeOnTheScreen();
    expect(screen.getByTestId('payment-panel')).toBeOnTheScreen();
    expect(screen.getByText('Demo payment — no real card needed')).toBeOnTheScreen();
    expect(screen.getByTestId('checkout-summary-card')).toBeOnTheScreen();
    expect(screen.getByText('UX Foundation')).toBeOnTheScreen();
    expect(screen.getByTestId('order-discount')).toHaveTextContent('-$25');
    expect(screen.getByTestId('order-total')).toHaveTextContent('$84');
    expect(screen.getByRole('button', { name: 'Pay $84' })).toBeOnTheScreen();
  });

  it('pays with the chosen method', async () => {
    mockPay.mockResolvedValue(SUCCESS);
    await renderScreen();

    expect(screen.getByRole('radio', { name: /Mock Card/ })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: /Mock E-wallet/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Pay $84' }));

    await waitFor(() => expect(mockPay).toHaveBeenCalledWith({ paymentMethod: 'MOCK_EWALLET' }));
  });

  it('replaces the form by a centred success card and opens the first course', async () => {
    mockPay.mockResolvedValue(SUCCESS);
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Pay $84' }));

    expect(await screen.findByText('Payment successful')).toBeOnTheScreen();
    expect(screen.getByTestId('checkout-result-card')).toBeOnTheScreen();
    expect(screen.queryByTestId('checkout-columns')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Start learning' }));
    expect(mockDismissTo).toHaveBeenCalledWith('/my-courses');
    expect(mockPush).toHaveBeenCalledWith('/learn/a');
  });

  it('shows the failure card on 402 and lets the user try again', async () => {
    mockPay.mockRejectedValue(PAYMENT_FAILED);
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Pay $84' }));
    expect(await screen.findByText('Payment failed')).toBeOnTheScreen();
    expect(screen.getByTestId('checkout-result-card')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByTestId('checkout-columns')).toBeOnTheScreen();
  });

  it('goes back to the cart from the Back link', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('link', { name: 'Back' }));
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows a skeleton while loading', async () => {
    mockCartState = { data: undefined, isPending: true, isError: false };
    await renderScreen();
    expect(screen.getByTestId('checkout-skeleton')).toBeOnTheScreen();
  });

  it('shows an error state with Retry', async () => {
    mockCartState = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'x' }),
      refetch: mockRefetch,
    };
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('shows the empty state for an empty cart', async () => {
    withCart([], 0);
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Explore courses' }));
    expect(mockDismissTo).toHaveBeenCalledWith('/search');
  });

  it('keeps the phone layout below 768 wide', async () => {
    setWidth(390);
    await renderScreen();

    expect(screen.queryByTestId('checkout-columns')).not.toBeOnTheScreen();
    expect(screen.getByTestId('pay-button')).toBeOnTheScreen();
  });
});
