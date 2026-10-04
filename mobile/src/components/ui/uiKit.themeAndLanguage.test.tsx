import { act, fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { BookmarkButton } from '@/components/course/BookmarkButton';
import { CourseCardVertical } from '@/components/course/CourseCardVertical';
import { makeCourse } from '@/components/course/courseFixtures';
import { PriceTag } from '@/components/course/PriceTag';
import { AppError } from '@/lib/appError';
import { renderWithProviders } from '@/test/renderWithProviders';
import { darkPalette, lightPalette } from '@/theme';

import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Button } from './Button';
import { Chip } from './Chip';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { OfflineBanner } from './OfflineBanner';
import { ProgressBar } from './ProgressBar';
import { RatingInline } from './RatingInline';
import { ScreenHeader } from './ScreenHeader';
import { SearchBar } from './SearchBar';
import { SectionHeader } from './SectionHeader';
import { SegmentedTabs } from './SegmentedTabs';
import { StarRating } from './StarRating';
import { TextField } from './TextField';
import { ToastProvider, useToast } from './Toast';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

/** UI-02 / UI-03: every shared component follows the active palette and the active language. */

describe('UI kit in dark mode', () => {
  it('draws text with the dark palette (and the light one in light mode)', async () => {
    const { unmount } = await renderWithProviders(<AppText>Body</AppText>, { theme: 'dark' });
    expect(screen.getByText('Body')).toHaveStyle({ color: darkPalette.text });
    unmount();

    await renderWithProviders(<AppText>Body</AppText>, { theme: 'light' });
    expect(screen.getByText('Body')).toHaveStyle({ color: lightPalette.text });
  });

  it('resolves semantic and legacy color tokens against the dark palette', async () => {
    await renderWithProviders(
      <>
        <AppText color="textSecondary">semantic</AppText>
        <AppText color="textMuted">muted</AppText>
        <AppText color="dangerText">danger</AppText>
      </>,
      { theme: 'dark' },
    );
    expect(screen.getByText('semantic')).toHaveStyle({ color: darkPalette.textSecondary });
    expect(screen.getByText('muted')).toHaveStyle({ color: darkPalette.textMuted });
    expect(screen.getByText('danger')).toHaveStyle({ color: darkPalette.dangerText });
  });

  it('paints the buttons per variant', async () => {
    await renderWithProviders(
      <>
        <Button title="Primary" />
        <Button title="Secondary" variant="secondary" />
        <Button title="Outline" variant="outline" />
      </>,
      { theme: 'dark' },
    );
    expect(screen.getByRole('button', { name: 'Primary' })).toHaveStyle({
      backgroundColor: darkPalette.primary,
    });
    expect(screen.getByText('Primary')).toHaveStyle({ color: darkPalette.onPrimary });
    expect(screen.getByRole('button', { name: 'Secondary' })).toHaveStyle({
      backgroundColor: darkPalette.surface,
      borderColor: darkPalette.border,
    });
    expect(screen.getByText('Outline')).toHaveStyle({ color: darkPalette.primaryText });
  });

  it('paints chips, badges and progress bars', async () => {
    await renderWithProviders(
      <>
        <Chip label="Outline chip" />
        <Chip label="Filled chip" variant="filled" />
        <Badge label="Hot" tone="danger" />
        <ProgressBar percent={40} />
      </>,
      { theme: 'dark' },
    );
    expect(screen.getByText('Outline chip')).toHaveStyle({ color: darkPalette.text });
    expect(screen.getByText('Filled chip')).toHaveStyle({ color: darkPalette.onPrimary });
    expect(screen.getByText('Hot')).toHaveStyle({ color: darkPalette.onDanger });
    expect(screen.getByRole('progressbar')).toHaveStyle({
      backgroundColor: darkPalette.primaryTrack,
    });
  });

  it('colors text fields, placeholders and the keyboard for dark', async () => {
    await renderWithProviders(
      <TextField label="Email" placeholder="you@example.com" error="Required" />,
      { theme: 'dark' },
    );
    const input = screen.getByLabelText('Email');
    expect(input.props.placeholderTextColor).toBe(darkPalette.placeholder);
    expect(input.props.keyboardAppearance).toBe('dark');
    expect(input).toHaveStyle({ color: darkPalette.text });
    expect(screen.getByText('Required')).toHaveStyle({ color: darkPalette.dangerText });
  });

  it('uses the light keyboard in light mode', async () => {
    await renderWithProviders(<SearchBar value="" onChangeText={jest.fn()} />, {
      theme: 'light',
    });
    expect(screen.getByLabelText('Search course').props.keyboardAppearance).toBe('light');
  });

  it('paints the offline banner, segmented tabs and error text', async () => {
    await renderWithProviders(
      <>
        <OfflineBanner visible />
        <SegmentedTabs
          tabs={[
            { key: 'a', label: 'Overview' },
            { key: 'b', label: 'Lessons' },
          ]}
          value="a"
          onChange={jest.fn()}
        />
        <ErrorState title="Oops" message="Details" />
      </>,
      { theme: 'dark' },
    );
    expect(screen.getByTestId('offline-banner')).toHaveStyle({
      backgroundColor: darkPalette.banner,
    });
    expect(screen.getByText('Overview')).toHaveStyle({ color: darkPalette.text });
    expect(screen.getByText('Lessons')).toHaveStyle({ color: darkPalette.textMuted });
    expect(screen.getByText('Details')).toHaveStyle({ color: darkPalette.textSecondary });
  });

  it('paints course cards with the card surface', async () => {
    await renderWithProviders(<CourseCardVertical course={makeCourse()} onPress={jest.fn()} />, {
      theme: 'dark',
    });
    expect(screen.getByText('PHP in One Click')).toHaveStyle({ color: darkPalette.text });
    expect(screen.getByText('$59')).toHaveStyle({ color: darkPalette.primaryText });
    expect(screen.getByText('Ramono Wultschner')).toHaveStyle({ color: darkPalette.textMuted });
  });

  it('draws unfilled stars with a color that stays visible on dark surfaces', async () => {
    await renderWithProviders(<StarRating value={2} />, { theme: 'dark' });
    const tree = JSON.stringify(screen.toJSON());
    expect(tree).toContain(darkPalette.star);
    expect(tree).toContain(darkPalette.starEmpty);
  });

  it('shows the toast on a raised dark surface', async () => {
    function Trigger() {
      const toast = useToast();
      return <Text onPress={() => toast.info('Saved')}>go</Text>;
    }
    await renderWithProviders(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
      { theme: 'dark' },
    );
    await fireEvent.press(screen.getByText('go'));

    expect(screen.getByTestId('toast')).toHaveStyle({
      backgroundColor: darkPalette.toast,
      borderColor: darkPalette.border,
    });
    expect(screen.getByText('Saved')).toHaveStyle({ color: darkPalette.onToast });
    await act(async () => undefined);
  });
});

describe('UI kit in Vietnamese', () => {
  it('translates the empty and error states', async () => {
    const error = new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'x' });
    await renderWithProviders(
      <>
        <EmptyState />
        <ErrorState error={error} onRetry={jest.fn()} />
      </>,
      { language: 'vi' },
    );
    expect(screen.getByText('Chưa có gì ở đây')).toBeOnTheScreen();
    expect(screen.getByText('Không tải được nội dung này')).toBeOnTheScreen();
    expect(screen.getByText(/Không có kết nối mạng/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeOnTheScreen();
  });

  it('translates the accessibility labels of the small components', async () => {
    await renderWithProviders(
      <>
        <OfflineBanner visible />
        <Avatar name="Sara Weise" />
        <ProgressBar percent={40} />
        <StarRating value={4} />
        <Badge count={3} />
        <BookmarkButton isBookmarked={false} onPress={jest.fn()} />
        <BookmarkButton isBookmarked onPress={jest.fn()} />
      </>,
      { language: 'vi' },
    );
    expect(
      screen.getByText('Bạn đang ngoại tuyến - đang hiển thị dữ liệu đã lưu'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Ảnh đại diện của Sara Weise')).toBeOnTheScreen();
    expect(screen.getByLabelText('Đã hoàn thành 40%')).toBeOnTheScreen();
    expect(screen.getByLabelText('Đánh giá 4 trên 5 sao')).toBeOnTheScreen();
    expect(screen.getByLabelText('3 mới')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Lưu khóa học' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Bỏ khỏi khóa học đã lưu' })).toBeOnTheScreen();
  });

  it('translates headers, search and section links', async () => {
    await renderWithProviders(
      <>
        <ScreenHeader title="Giỏ hàng" />
        <SearchBar value="php" onChangeText={jest.fn()} />
        <SectionHeader title="Phổ biến" onViewMore={jest.fn()} />
        <TextField label="Mật khẩu" secureTextEntry />
      </>,
      { language: 'vi' },
    );
    expect(screen.getByRole('button', { name: 'Quay lại' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Tìm khóa học')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Xóa nội dung tìm kiếm' })).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Xem thêm, Phổ biến' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Hiện mật khẩu' })).toBeOnTheScreen();
  });

  it('formats prices, ratings and lesson counts the Vietnamese way', async () => {
    await renderWithProviders(
      <>
        <PriceTag priceCents={0} />
        <PriceTag priceCents={7375} originalPriceCents={102000} />
        <RatingInline rating={4.5} count={1233} lessonCount={12} />
      </>,
      { language: 'vi' },
    );
    expect(screen.getByText('Miễn phí')).toBeOnTheScreen();
    expect(screen.getByText('$73,75')).toBeOnTheScreen();
    expect(screen.getByText('$1.020')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Đánh giá 4,5 trên 5, 1233 lượt đánh giá, 12 bài học'),
    ).toBeOnTheScreen();
  });

  it('labels a course card for screen readers in Vietnamese', async () => {
    await renderWithProviders(
      <CourseCardVertical course={makeCourse({ priceCents: 0 })} onPress={jest.fn()} />,
      { language: 'vi' },
    );
    expect(
      screen.getByRole('button', {
        name: 'PHP in One Click, giảng viên Ramono Wultschner, Miễn phí, đánh giá 4,5',
      }),
    ).toBeOnTheScreen();
  });

  it('translates the course badges', async () => {
    await renderWithProviders(
      <CourseCardVertical
        course={makeCourse({ badge: 'DISCOUNT', discountPercent: 20, originalPriceCents: 7375 })}
        onPress={jest.fn()}
      />,
      { language: 'vi' },
    );
    expect(screen.getByText('Giảm 20%')).toBeOnTheScreen();
  });
});
