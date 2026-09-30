import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppError } from '@/lib/appError';

import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('shows a friendly message for the error and a working Retry button', async () => {
    const onRetry = jest.fn();
    const error = new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'x' });
    await render(<ErrorState error={error} onRetry={onRetry} />);

    expect(screen.getByText(/No internet connection/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('maps server error codes to friendly messages', async () => {
    const error = new AppError({ status: 404, code: 'COURSE_NOT_FOUND', message: 'raw' });
    await render(<ErrorState error={error} />);
    expect(screen.getByText('This course could not be found.')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });
});
