import { fireEvent, render, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import { darkPalette, lightPalette } from '@/theme';

import { BookmarkButton } from './BookmarkButton';
import { CourseCardHorizontal } from './CourseCardHorizontal';
import {
  COURSE_CARD_VERTICAL_IMAGE_HEIGHT,
  COURSE_CARD_VERTICAL_WIDTH,
  CourseCardVertical,
  getCourseCardVerticalImageHeight,
} from './CourseCardVertical';
import { makeCourse } from './courseFixtures';

describe.each([
  ['CourseCardVertical', CourseCardVertical],
  ['CourseCardHorizontal', CourseCardHorizontal],
])('%s', (_name, Card) => {
  it('renders title, teacher, price and rating', async () => {
    await render(<Card course={makeCourse()} onPress={jest.fn()} />);

    expect(screen.getByText('PHP in One Click')).toBeOnTheScreen();
    expect(screen.getByText('Ramono Wultschner')).toBeOnTheScreen();
    expect(screen.getByText('$59')).toBeOnTheScreen();
    expect(screen.getByText('4.5')).toBeOnTheScreen();
    expect(screen.getByText('(1233)')).toBeOnTheScreen();
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

describe('CourseCardHorizontal', () => {
  it('shows the lesson count next to the rating', async () => {
    await render(<CourseCardHorizontal course={makeCourse()} onPress={jest.fn()} />);
    expect(screen.getByText('18 lessons')).toBeOnTheScreen();
  });
});

describe('CourseCardVertical', () => {
  it('is a borderless poster: two-line title and a taller-than-wide image', async () => {
    await render(<CourseCardVertical course={makeCourse()} onPress={jest.fn()} width={160} />);
    expect(screen.getByText('PHP in One Click').props.numberOfLines).toBe(2);
    expect(getCourseCardVerticalImageHeight(160)).toBeGreaterThan(160);
    expect(COURSE_CARD_VERTICAL_IMAGE_HEIGHT).toBe(
      getCourseCardVerticalImageHeight(COURSE_CARD_VERTICAL_WIDTH),
    );
  });

  it('tags a discounted course with a gold badge', async () => {
    await render(
      <CourseCardVertical
        course={makeCourse({ badge: 'DISCOUNT', discountPercent: 20 })}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText('20% Off')).toHaveStyle({ color: lightPalette.onGold });
  });
});

describe('BookmarkButton on a photo', () => {
  it('shows a filled neon bookmark on a glass disc when saved', async () => {
    await renderWithProviders(<BookmarkButton isBookmarked isOnPhoto onPress={jest.fn()} />);
    const button = screen.getByRole('button', { name: 'Remove from saved courses' });
    expect(button).toBeSelected();
    expect(JSON.stringify(screen.toJSON())).toContain(darkPalette.primary);
  });

  it('keeps the 48 dp touch target around the 36 dp disc', async () => {
    await renderWithProviders(
      <BookmarkButton isBookmarked={false} isOnPhoto onPress={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Save course' }).props.hitSlop).toEqual({
      top: 6,
      bottom: 6,
      left: 6,
      right: 6,
    });
  });
});
