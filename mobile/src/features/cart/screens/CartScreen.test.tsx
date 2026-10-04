import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { makeCourse } from '@/components/course/courseFixtures';
import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';

import { CartScreen } from './CartScreen';

const mockPush = jest.fn();
const mockDismissTo = jest.fn();
const mockRemove = jest.fn();
const mockRefetch = jest.fn();
let mockCartState: Record<string, unknown> = {};
let mockRemoveState: Record<string, unknown> = {};

jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockPush(href),
    dismissTo: (href: string) => mockDismissTo(href),
    back: jest.fn(),
    canGoBack: () => true,
  },
}));

jest.mock('../hooks', () => ({
  useCart: () => mockCartState,
  useRemoveFromCart: () => ({ mutate: mockRemove, isPending: false, ...mockRemoveState }),
}));

const COURSE_A = makeCourse({ id: 'a', title: 'UX Foundation', priceCents: 5900 });
const COURSE_B = makeCourse({
  id: 'b',
  title: 'Python Introduction',
  priceCents: 2500,
  originalPriceCents: 5000,
});

function withCart(items = [COURSE_A, COURSE_B], totalCents = 8400) {
  mockCartState = {
    data: {
      items: items.map((course) => ({ course, addedAt: '2026-10-01T00:00:00Z' })),
      totalCents,
    },
    isPending: false,
    isError: false,
    refetch: mockRefetch,
  };
}

async function renderScreen() {
  return render(
    <ToastProvider>
      <CartScreen />
    </ToastProvider>,
  );
}

describe('CartScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveState = {};
  });

  it('shows a skeleton while loading', async () => {
    mockCartState = { data: undefined, isPending: true, isError: false };
    await renderScreen();
    expect(screen.getByTestId('cart-skeleton')).toBeOnTheScreen();
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

  it('shows the empty state and sends the user to Search', async () => {
    withCart([], 0);
    await renderScreen();

    expect(screen.getByText('Your cart is empty')).toBeOnTheScreen();
    expect(screen.queryByTestId('cart-checkout-button')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Explore courses' }));
    expect(mockDismissTo).toHaveBeenCalledWith('/search');
  });

  it('lists the items with prices and the total', async () => {
    withCart();
    await renderScreen();

    expect(screen.getByText('My cart')).toBeOnTheScreen();
    expect(screen.getByText('UX Foundation')).toBeOnTheScreen();
    expect(screen.getByText('Python Introduction')).toBeOnTheScreen();
    expect(screen.getByText('$84')).toBeOnTheScreen();
    expect(screen.getByText('Total (2 courses)')).toBeOnTheScreen();
  });

  it('opens the course when a row is pressed', async () => {
    withCart();
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: /UX Foundation.*Open course/ }));
    expect(mockPush).toHaveBeenCalledWith('/course/a');
  });

  it('asks for confirmation before removing and removes only after confirming', async () => {
    withCart();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Remove UX Foundation from cart' }));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(mockRemove).not.toHaveBeenCalled();
    const buttons = alertSpy.mock.calls[0]?.[2] as AlertButton[];
    await act(async () => {
      buttons.find((button) => button.text === 'Remove')?.onPress?.();
    });
    await waitFor(() =>
      expect(mockRemove).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ onError: expect.any(Function) }),
      ),
    );
    alertSpy.mockRestore();
  });

  it('does not remove when the confirmation is cancelled', async () => {
    withCart();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Remove UX Foundation from cart' }));
    const buttons = alertSpy.mock.calls[0]?.[2] as AlertButton[];
    await act(async () => {
      buttons.find((button) => button.text === 'Cancel')?.onPress?.();
    });

    expect(mockRemove).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('shows a toast when removing fails', async () => {
    withCart();
    mockRemove.mockImplementation((_id: string, options: { onError: (e: unknown) => void }) =>
      options.onError(new AppError({ status: 0, code: 'OFFLINE', message: 'x' })),
    );
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Remove UX Foundation from cart' }));
    const buttons = alertSpy.mock.calls[0]?.[2] as AlertButton[];
    await act(async () => {
      buttons.find((button) => button.text === 'Remove')?.onPress?.();
    });

    expect(await screen.findByText("You're offline")).toBeOnTheScreen();
    alertSpy.mockRestore();
  });

  it('goes to Checkout', async () => {
    withCart();
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Checkout' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/checkout'));
  });

  it('disables Checkout while an item is being removed', async () => {
    withCart();
    mockRemoveState = { isPending: true, variables: 'a' };
    await renderScreen();

    expect(screen.getByRole('button', { name: 'Checkout' })).toBeDisabled();
  });
});
