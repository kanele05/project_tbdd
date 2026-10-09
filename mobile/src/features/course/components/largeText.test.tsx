import { screen } from '@testing-library/react-native';

import { setFontScale } from '@/test/fontScale';
import { renderWithProviders } from '@/test/renderWithProviders';

import { CourseBottomBar } from './CourseBottomBar';
import { CourseHero } from './CourseHero';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

const BAR_COURSE = {
  enrollment: null,
  priceCents: 2900,
  originalPriceCents: 3625,
  isInCart: false,
} as const;

const HERO_PROPS = {
  imageUrl: 'https://example.com/hero.jpg',
  title: 'UX Research For Beginners',
  tag: 'Design',
  ratingAvg: 4.9,
  ratingCount: 9,
  canPlayPreview: true,
  onPlayPreview: jest.fn(),
  isBookmarked: false,
  onToggleBookmark: jest.fn(),
  isLiked: false,
  onToggleLike: jest.fn(),
  onShare: jest.fn(),
} as const;

describe('CourseBottomBar with a large system font', () => {
  afterEach(async () => {
    await setFontScale(1);
  });

  it('keeps the price beside the buttons at the default font size', async () => {
    await setFontScale(1);
    await renderWithProviders(
      <CourseBottomBar course={BAR_COURSE} isLoading={false} onAction={jest.fn()} />,
    );
    expect(screen.getByTestId('course-bottom-bar-price')).not.toHaveStyle({ width: '100%' });
  });

  it('puts the price on its own row at 130 % so the button label does not wrap into an oval', async () => {
    await setFontScale(1.3);
    await renderWithProviders(
      <CourseBottomBar
        course={BAR_COURSE}
        isLoading={false}
        onAction={jest.fn()}
        onAskAi={jest.fn()}
      />,
    );
    expect(screen.getByTestId('course-bottom-bar-price')).toHaveStyle({ width: '100%' });
    expect(screen.getByTestId('course-action-button')).toBeOnTheScreen();
    expect(screen.getByTestId('course-ai-button')).toBeOnTheScreen();
  });
});

describe('CourseHero with a large system font', () => {
  afterEach(async () => {
    await setFontScale(1);
  });

  it('has the base height at the default font size', async () => {
    await setFontScale(1);
    await renderWithProviders(<CourseHero {...HERO_PROPS} />);
    expect(screen.getByTestId('course-hero')).toHaveStyle({ height: 480 });
  });

  it('grows with the font size and caps the title scaling so it cannot cover the play button', async () => {
    await setFontScale(1.3);
    await renderWithProviders(<CourseHero {...HERO_PROPS} />);
    expect(screen.getByTestId('course-hero')).toHaveStyle({ height: 480 + 36 });
    expect(screen.getByText('UX Research For Beginners').props.maxFontSizeMultiplier).toBe(1.2);
  });

  it('stops growing at 160 % so an extreme setting cannot push the title off the photo', async () => {
    await setFontScale(2);
    await renderWithProviders(<CourseHero {...HERO_PROPS} />);
    expect(screen.getByTestId('course-hero')).toHaveStyle({ height: 480 + 72 });
  });
});
