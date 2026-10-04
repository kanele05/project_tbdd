import { fireEvent, screen } from '@testing-library/react-native';

import { POSTERS } from '@/constants/posters';
import { renderWithProviders } from '@/test/renderWithProviders';

import { getWallGeometry, PosterWall, WALL_TILT_DEG } from './PosterWall';

const OPTIONS = { includeHiddenElements: true };
const measure = (width: number, height: number) => ({
  nativeEvent: { layout: { width, height } },
});

describe('getWallGeometry', () => {
  it('covers the container after the wall is rotated', () => {
    const width = 390;
    const height = 844;
    const geometry = getWallGeometry(width, height);
    const radians = (Math.abs(WALL_TILT_DEG) * Math.PI) / 180;
    expect(geometry.wallWidth).toBeGreaterThanOrEqual(
      width * Math.cos(radians) + height * Math.sin(radians),
    );
    expect(geometry.wallHeight).toBeGreaterThanOrEqual(
      width * Math.sin(radians) + height * Math.cos(radians),
    );
  });

  it('fits whole columns inside the wall and keeps posters 2:3', () => {
    const geometry = getWallGeometry(390, 844);
    expect(geometry.columns).toBeGreaterThanOrEqual(3);
    expect(geometry.columns * (geometry.columnWidth + 8)).toBeLessThanOrEqual(geometry.wallWidth);
    expect(geometry.posterHeight).toBe(Math.round(geometry.columnWidth * 1.5));
  });

  it('renders enough posters to cover the wall plus one drift cycle', () => {
    const geometry = getWallGeometry(390, 844);
    const item = geometry.posterHeight + 8;
    expect(geometry.postersPerColumn * item).toBeGreaterThanOrEqual(
      geometry.wallHeight + geometry.cycleHeight,
    );
  });

  it('uses more columns on a wider window', () => {
    expect(getWallGeometry(520, 844).columns).toBeGreaterThanOrEqual(
      getWallGeometry(390, 844).columns,
    );
  });
});

describe('PosterWall', () => {
  it('bundles at least 12 posters', () => {
    expect(POSTERS.length).toBeGreaterThanOrEqual(12);
  });

  it('draws nothing until it is measured, then the poster columns', async () => {
    await renderWithProviders(<PosterWall testID="wall" />);
    expect(screen.queryAllByTestId('poster', OPTIONS)).toHaveLength(0);
  });

  it('is decorative: hidden from screen readers', async () => {
    await renderWithProviders(<PosterWall testID="wall" />);
    expect(screen.queryByTestId('wall')).toBeNull();
    expect(screen.getByTestId('wall', OPTIONS)).toBeOnTheScreen();
  });

  it('renders posters once measured (crisp and soft variants)', async () => {
    const { unmount } = await renderWithProviders(<PosterWall testID="wall" />);
    await fireEvent(screen.getByTestId('wall', OPTIONS), 'layout', measure(390, 844));
    expect(screen.getAllByTestId('poster', OPTIONS).length).toBeGreaterThan(8);
    unmount();

    await renderWithProviders(<PosterWall testID="soft" variant="soft" isPaused />);
    await fireEvent(screen.getByTestId('soft', OPTIONS), 'layout', measure(360, 640));
    expect(screen.getAllByTestId('poster', OPTIONS).length).toBeGreaterThan(8);
  });
});
