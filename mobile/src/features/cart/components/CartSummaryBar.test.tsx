import { fireEvent, render, screen } from '@testing-library/react-native';

import { i18n } from '@/i18n';

import { CartSummaryBar } from './CartSummaryBar';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

describe('CartSummaryBar', () => {
  it('shows the course count, the total and calls onCheckout', async () => {
    const onCheckout = jest.fn();
    await render(<CartSummaryBar itemCount={2} totalCents={8400} onCheckout={onCheckout} />);

    expect(screen.getByText('Total (2 courses)')).toBeOnTheScreen();
    expect(screen.getByText('$84')).toBeOnTheScreen();
    expect(screen.getByLabelText('Total $84 for 2 courses')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Checkout' }));
    expect(onCheckout).toHaveBeenCalledTimes(1);
  });

  it('uses the singular form for one course', async () => {
    await render(<CartSummaryBar itemCount={1} totalCents={5900} onCheckout={jest.fn()} />);

    expect(screen.getByText('Total (1 course)')).toBeOnTheScreen();
  });

  it('is disabled when empty or busy', async () => {
    const { rerender } = await render(
      <CartSummaryBar itemCount={0} totalCents={0} onCheckout={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeDisabled();

    await rerender(
      <CartSummaryBar itemCount={2} totalCents={8400} onCheckout={jest.fn()} isBusy />,
    );
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeDisabled();
  });

  it('is written in Vietnamese with Vietnamese number formatting', async () => {
    await i18n.changeLanguage('vi');
    await render(<CartSummaryBar itemCount={2} totalCents={7375} onCheckout={jest.fn()} />);

    expect(screen.getByText('Tổng cộng (2 khóa học)')).toBeOnTheScreen();
    expect(screen.getByText('$73,75')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Thanh toán' })).toBeOnTheScreen();
  });
});
