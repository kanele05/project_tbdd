import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { CourseCardDesktop } from './CourseCardDesktop';
import { makeCourse } from './courseFixtures';

const course = makeCourse({ id: 'c1', title: 'PHP in One Click', priceCents: 5900 });

describe('CourseCardDesktop', () => {
  it('shows the photo, title and teacher at rest and keeps the panel inert', async () => {
    await renderWithProviders(
      <CourseCardDesktop course={course} onPress={jest.fn()} testID="card" />,
    );

    expect(screen.getByText('PHP in One Click')).toBeOnTheScreen();
    expect(screen.getByText('Ramono Wultschner')).toBeOnTheScreen();
    expect(screen.getByTestId('card-overlay')).toHaveStyle({ pointerEvents: 'none' });
  });

  it('activates the panel on hover and reveals price and rating', async () => {
    await renderWithProviders(
      <CourseCardDesktop course={course} onPress={jest.fn()} testID="card" />,
    );

    await fireEvent(screen.getByTestId('card'), 'pointerEnter');
    expect(screen.getByTestId('card-overlay')).toHaveStyle({ pointerEvents: 'box-none' });
    expect(screen.getByText('$59')).toBeOnTheScreen();
    expect(screen.getByText('4.5')).toBeOnTheScreen();

    await fireEvent(screen.getByTestId('card'), 'pointerLeave');
    expect(screen.getByTestId('card-overlay')).toHaveStyle({ pointerEvents: 'none' });
  });

  it('opens the course from the card and adds a paid course to the cart from its button', async () => {
    const onPress = jest.fn();
    const onAddToCart = jest.fn();
    await renderWithProviders(
      <CourseCardDesktop
        course={course}
        onPress={onPress}
        onAddToCart={onAddToCart}
        testID="card"
      />,
    );

    await fireEvent(screen.getByTestId('card'), 'pointerEnter');
    await fireEvent.press(screen.getByRole('button', { name: 'Add PHP in One Click to cart' }));
    expect(onAddToCart).toHaveBeenCalledWith(course);
    expect(onPress).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: /^PHP in One Click, by/ }));
    expect(onPress).toHaveBeenCalledWith(course);
  });

  it('has no cart button for a free course', async () => {
    await renderWithProviders(
      <CourseCardDesktop
        course={makeCourse({ priceCents: 0 })}
        onPress={jest.fn()}
        onAddToCart={jest.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /to cart/ })).not.toBeOnTheScreen();
    expect(screen.getByText('Free')).toBeOnTheScreen();
  });

  it('shows progress and a play button for an owned course', async () => {
    const onPlay = jest.fn();
    await renderWithProviders(
      <CourseCardDesktop
        course={{ id: 'c9', title: 'UX Foundation', thumbnailUrl: 'https://example.com/ux.png' }}
        onPress={jest.fn()}
        onPlay={onPlay}
        onAddToCart={jest.fn()}
        progressPercent={30}
        testID="card"
      />,
    );

    await fireEvent(screen.getByTestId('card'), 'pointerEnter');
    expect(screen.getByText('30% done')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /to cart/ })).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue UX Foundation' }));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });
});
