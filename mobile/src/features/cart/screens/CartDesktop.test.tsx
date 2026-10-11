import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';

import { makeCourse } from '@/components/course/courseFixtures';
import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';
import { confirmAction } from '@/utils/confirmAction';

import { CartScreen } from './CartScreen';

const mockPush = jest.fn();
const mockDismissTo = jest.fn();
const mockRemove = jest.fn();
const mockRefetch = jest.fn();
let mockCartState: Record<string, unknown> = {};
let mockHomeState: Record<string, unknown> = {};

jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockPush(href),
    dismissTo: (href: string) => mockDismissTo(href),
    back: jest.fn(),
    canGoBack: () => true,
  },
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1280, height: 800, scale: 1, fontScale: 1 })),
}));
jest.mock('@/utils/confirmAction', () => ({ confirmAction: jest.fn() }));
jest.mock('../hooks', () => ({
  useCart: () => mockCartState,
  useRemoveFromCart: () => ({ mutate: mockRemove, isPending: false }),
}));
jest.mock('@/features/home/hooks', () => ({ useHome: () => mockHomeState }));
jest.mock('@/features/search/useQuickCardActions', () => ({
  useQuickCardActions: () => ({
    onPress: jest.fn(),
    onToggleBookmark: jest.fn(),
    onAddToCart: jest.fn(),
  }),
}));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;
const mockConfirm = confirmAction as jest.Mock;

const COURSE_A = makeCourse({ id: 'a', title: 'UX Foundation', priceCents: 5900 });
const COURSE_B = makeCourse({
  id: 'b',
  title: 'Python Introduction',
  priceCents: 2500,
  originalPriceCents: 5000,
});
const SUGGESTED = makeCourse({ id: 's', title: 'Suggested Course' });

function withCart(courses = [COURSE_A, COURSE_B], totalCents = 8400) {
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
      <CartScreen />
    </ToastProvider>,
  );
}

describe('CartScreen on a wide window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWidth(1280);
    mockHomeState = { data: { recommended: [COURSE_A, SUGGESTED] } };
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

  it('lists the courses with a sticky order summary, discount and total', async () => {
    withCart();
    await renderScreen();

    expect(screen.getByRole('header', { name: 'My cart' })).toBeOnTheScreen();
    expect(screen.getByText('2 courses ready to check out')).toBeOnTheScreen();
    expect(screen.getByTestId('cart-columns')).toBeOnTheScreen();
    expect(screen.getByTestId('cart-row-a')).toBeOnTheScreen();
    expect(screen.getByTestId('cart-row-b')).toBeOnTheScreen();
    expect(screen.getByTestId('cart-summary-card')).toBeOnTheScreen();
    expect(screen.getByText('Subtotal')).toBeOnTheScreen();
    expect(screen.getByTestId('order-discount')).toHaveTextContent('-$25');
    expect(screen.getByTestId('order-total')).toHaveTextContent('$84');
    expect(screen.queryByTestId('cart-summary-bar')).not.toBeOnTheScreen();
  });

  it('hides the discount rows when nothing is on sale', async () => {
    withCart([COURSE_A], 5900);
    await renderScreen();

    expect(screen.queryByText('Subtotal')).not.toBeOnTheScreen();
    expect(screen.getByTestId('order-total')).toHaveTextContent('$59');
  });

  it('goes to Checkout and opens a course', async () => {
    withCart();
    await renderScreen();

    await fireEvent.press(screen.getByTestId('cart-checkout-button'));
    expect(mockPush).toHaveBeenCalledWith('/checkout');

    await fireEvent.press(screen.getByRole('button', { name: /UX Foundation, by/ }));
    expect(mockPush).toHaveBeenCalledWith('/course/a');
  });

  it('removes a course only after the confirmation', async () => {
    withCart();
    mockConfirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await renderScreen();

    await fireEvent.press(screen.getByTestId('cart-remove-b'));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
    expect(mockRemove).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('cart-remove-b'));
    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith('b', expect.anything()));
  });

  it('shows the empty state with Explore courses and a recommendation row', async () => {
    withCart([], 0);
    await renderScreen();

    expect(screen.getByText('Your cart is empty')).toBeOnTheScreen();
    expect(screen.getByTestId('cart-recommendations')).toBeOnTheScreen();
    expect(screen.getByText('You might also like')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Explore courses' }));
    expect(mockDismissTo).toHaveBeenCalledWith('/search');
  });

  it('does not suggest what is already in the cart', async () => {
    withCart([COURSE_A], 5900);
    await renderScreen();

    expect(screen.getByText('Suggested Course')).toBeOnTheScreen();
    expect(screen.queryAllByText('UX Foundation')).toHaveLength(1);
  });

  it('shows no recommendation row without suggestions', async () => {
    withCart([], 0);
    mockHomeState = { data: undefined };
    await renderScreen();

    expect(screen.queryByTestId('cart-recommendations')).not.toBeOnTheScreen();
  });

  it('keeps the phone layout below 768 wide', async () => {
    setWidth(390);
    withCart();
    await renderScreen();

    expect(screen.getByTestId('cart-summary-bar')).toBeOnTheScreen();
    expect(screen.queryByTestId('cart-columns')).not.toBeOnTheScreen();
  });
});
