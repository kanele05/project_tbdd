import { fireEvent, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { makeCourse } from '@/components/course/courseFixtures';
import { searchApi } from '@/features/search/api';
import { SAMPLE_CATEGORIES, makePage, renderWithClient } from '@/features/search/testUtils';

import { CourseListScreen } from './CourseListScreen';

jest.mock('@shopify/flash-list', () => jest.requireActual('@/features/search/flashListMock'));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@/features/search/api', () => ({
  searchApi: { courses: jest.fn(), categories: jest.fn(), hotTags: jest.fn() },
}));
jest.mock('@/features/bookmark/hooks', () => ({
  useToggleBookmark: () => ({ toggleBookmark: jest.fn(), isPending: false }),
}));

const mockCourses = searchApi.courses as jest.Mock;
const mockParams = useLocalSearchParams as jest.Mock;

describe('CourseListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (searchApi.categories as jest.Mock).mockResolvedValue(SAMPLE_CATEGORIES);
    mockCourses.mockResolvedValue(
      makePage([makeCourse({ id: 'a', title: 'Design Basics' })], { total: 6 }),
    );
  });

  it('uses the section name as the title and requests that section', async () => {
    mockParams.mockReturnValue({ section: 'popular' });
    await renderWithClient(<CourseListScreen />);

    expect(await screen.findByText('Design Basics')).toBeOnTheScreen();
    expect(screen.getByText('Popular courses')).toBeOnTheScreen();
    expect(screen.getByText('6 Results')).toBeOnTheScreen();
    expect(mockCourses).toHaveBeenCalledWith({ section: 'popular', page: 1, limit: 20 });
  });

  it('uses the category name as the title and filters by category', async () => {
    mockParams.mockReturnValue({ categoryId: 'cat_design' });
    await renderWithClient(<CourseListScreen />);

    expect(await screen.findByText('Design Basics')).toBeOnTheScreen();
    expect(await screen.findByText('Design')).toBeOnTheScreen();
    expect(mockCourses).toHaveBeenCalledWith({ categoryId: 'cat_design', page: 1, limit: 20 });
  });

  it('prefers the title and teacher passed by the caller', async () => {
    mockParams.mockReturnValue({ teacherId: 't1', categoryId: 'cat_code', title: 'UI/UX Design' });
    await renderWithClient(<CourseListScreen />);

    expect(await screen.findByText('UI/UX Design')).toBeOnTheScreen();
    expect(mockCourses).toHaveBeenCalledWith(
      expect.objectContaining({ teacherId: 't1', categoryId: 'cat_code' }),
    );
  });

  it('ignores an unknown section and falls back to all courses', async () => {
    mockParams.mockReturnValue({ section: 'bogus' });
    await renderWithClient(<CourseListScreen />);

    expect(await screen.findByText('All courses')).toBeOnTheScreen();
    expect(mockCourses).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('shows an empty state that leads to the Search tab', async () => {
    mockParams.mockReturnValue({});
    mockCourses.mockResolvedValue(makePage([], { total: 0, totalPages: 0 }));
    await renderWithClient(<CourseListScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Explore courses' }));

    expect(router.navigate).toHaveBeenCalledWith('/search');
  });

  it('opens the course detail when a card is pressed', async () => {
    mockParams.mockReturnValue({});
    await renderWithClient(<CourseListScreen />);

    await fireEvent.press(await screen.findByText('Design Basics'));

    expect(router.push).toHaveBeenCalledWith('/course/a');
  });
  it('translates the section title and the result count', async () => {
    mockParams.mockReturnValue({ section: 'inspires' });
    await renderWithClient(<CourseListScreen />, { language: 'vi' });

    expect(await screen.findByText('Truyền cảm hứng')).toBeOnTheScreen();
    expect(await screen.findByText('6 kết quả')).toBeOnTheScreen();
  });
});
