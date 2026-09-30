import { fireEvent, render, screen } from '@testing-library/react-native';

import { CourseCardHorizontal } from './CourseCardHorizontal';
import { CourseCardVertical } from './CourseCardVertical';
import { makeCourse } from './courseFixtures';

describe.each([
  ['CourseCardVertical', CourseCardVertical],
  ['CourseCardHorizontal', CourseCardHorizontal],
])('%s', (_name, Card) => {
  it('renders title, teacher, price, rating and lessons', async () => {
    await render(<Card course={makeCourse()} onPress={jest.fn()} />);

    expect(screen.getByText('PHP in One Click')).toBeOnTheScreen();
    expect(screen.getByText('Ramono Wultschner')).toBeOnTheScreen();
    expect(screen.getByText('$59')).toBeOnTheScreen();
    expect(screen.getByText('4.5')).toBeOnTheScreen();
    expect(screen.getByText('(1233)')).toBeOnTheScreen();
    expect(screen.getByText('18 lessons')).toBeOnTheScreen();
  });

  it('calls onPress with the course', async () => {
    const onPress = jest.fn();
    const course = makeCourse();
    await render(<Card course={course} onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: /PHP in One Click/ }));
    expect(onPress).toHaveBeenCalledWith(course);
  });

  it('shows the Best-seller and discount badges', async () => {
    const { rerender } = await render(
      <Card course={makeCourse({ badge: 'BEST_SELLER' })} onPress={jest.fn()} />,
    );
    expect(screen.getByText('Best-seller')).toBeOnTheScreen();

    await rerender(
      <Card course={makeCourse({ badge: 'DISCOUNT', discountPercent: 20 })} onPress={jest.fn()} />,
    );
    expect(screen.getByText('20% Off')).toBeOnTheScreen();
  });

  it('toggles the bookmark without opening the course', async () => {
    const onPress = jest.fn();
    const onToggleBookmark = jest.fn();
    const course = makeCourse();
    await render(<Card course={course} onPress={onPress} onToggleBookmark={onToggleBookmark} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Save course' }));
    expect(onToggleBookmark).toHaveBeenCalledWith(course);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('reflects the bookmarked state', async () => {
    await render(
      <Card
        course={makeCourse({ isBookmarked: false })}
        isBookmarked
        onPress={jest.fn()}
        onToggleBookmark={jest.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Remove from saved courses' })).toBeSelected();
  });
});
