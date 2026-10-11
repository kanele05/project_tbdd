import { fireEvent, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { makeCourse } from '@/components/course/courseFixtures';
import { searchApi } from '@/features/search/api';
import { SAMPLE_CATEGORIES, makePage, renderWithClient } from '@/features/search/testUtils';

import { CourseListScreen } from './CourseListScreen';

jest.mock('@shopify/flash-list', () => jest.requireActual('@/features/search/flashListMock'));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1280, height: 800, scale: 1, fontScale: 1 })),
}));
jest.mock('@/features/search/api', () => ({
  searchApi: { courses: jest.fn(), categories: jest.fn(), hotTags: jest.fn() },
}));
jest.mock('@/features/bookmark/hooks', () => ({
  useToggleBookmark: () => ({ toggleBookmark: jest.fn(), isPending: false }),
}));
jest.mock('@/features/cart/hooks', () => ({
  useAddToCart: () => ({ mutateAsync: jest.fn() }),
}));

const mockCourses = searchApi.courses as jest.Mock;
const mockParams = useLocalSearchParams as jest.Mock;
const mockUseWindowDimensions = useWindowDimensions as jest.Mock;

function setWidth(width: number) {
  mockUseWindowDimensions.mockReturnValue({ width, height: 800, scale: 1, fontScale: 1 });
}

describe('CourseListScreen on a wide window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWidth(1280);
    (searchApi.categories as jest.Mock).mockResolvedValue(SAMPLE_CATEGORIES);
    mockCourses.mockResolvedValue(
      makePage([makeCourse({ id: 'a', title: 'Design Basics' })], { total: 6 }),
    );
  });

  it('shows the title as a page heading above a poster grid, without the phone header', async () => {
    mockParams.mockReturnValue({ section: 'popular' });
    await renderWithClient(<CourseListScreen />);

    expect(await screen.findByText('Design Basics')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Popular courses' })).toBeOnTheScreen();
    expect(screen.getByTestId('results-grid')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
    expect(mockCourses).toHaveBeenCalledWith({ section: 'popular', page: 1, limit: 20 });
  });

  it('opens a course from its card', async () => {
    mockParams.mockReturnValue({ categoryId: 'cat_design' });
    await renderWithClient(<CourseListScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: /^Design Basics, by/ }));
    expect(router.push).toHaveBeenLastCalledWith('/course/a');
  });

  it('shows the empty state with an explore button', async () => {
    mockParams.mockReturnValue({ section: 'inspires' });
    mockCourses.mockResolvedValue(makePage([], { total: 0, totalPages: 0 }));
    await renderWithClient(<CourseListScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Explore courses' }));
    expect(router.navigate).toHaveBeenCalledWith('/search');
  });

  it('keeps the phone header with a back button below 768 wide', async () => {
    setWidth(390);
    mockParams.mockReturnValue({ section: 'popular' });
    await renderWithClient(<CourseListScreen />);

    expect(await screen.findByText('Design Basics')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Back' })).toBeOnTheScreen();
    expect(screen.queryByTestId('results-grid')).not.toBeOnTheScreen();
  });
});
