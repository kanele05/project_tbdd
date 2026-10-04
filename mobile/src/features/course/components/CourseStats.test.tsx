import { render, screen } from '@testing-library/react-native';

import { i18n } from '@/i18n';

import { CourseStats } from './CourseStats';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

const PROPS = { lessonCount: 42, totalDurationSec: 18 * 3600, likeCount: 1233 } as const;

describe('CourseStats', () => {
  it('shows lessons, total length and likes with accessible labels', async () => {
    await render(<CourseStats {...PROPS} />);

    expect(screen.getByLabelText('42 lessons')).toBeOnTheScreen();
    expect(screen.getByLabelText('18 hours total length')).toBeOnTheScreen();
    expect(screen.getByLabelText('1,233 likes')).toBeOnTheScreen();
  });

  it('follows the UI language (Vietnamese labels and number format)', async () => {
    await i18n.changeLanguage('vi');
    await render(<CourseStats {...PROPS} />);

    expect(screen.getByLabelText('42 bài học')).toBeOnTheScreen();
    expect(screen.getByLabelText('18 giờ tổng thời lượng')).toBeOnTheScreen();
    expect(screen.getByLabelText('1.233 lượt thích')).toBeOnTheScreen();
  });
});
