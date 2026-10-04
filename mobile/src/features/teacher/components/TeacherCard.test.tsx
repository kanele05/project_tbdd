import { fireEvent, render, screen } from '@testing-library/react-native';

import { i18n } from '@/i18n';
import type { TeacherSummary } from '@/types/api';

import { TeacherCard } from './TeacherCard';

const TEACHER: TeacherSummary = {
  id: 't1',
  fullName: 'Christian Hayes',
  avatarUrl: 'https://example.com/christian.png',
  organization: 'University of London',
  ratingAvg: 4.5,
  ratingCount: 1233,
};

describe('TeacherCard', () => {
  it('shows name, organization and the rating line', async () => {
    await render(<TeacherCard teacher={TEACHER} onPress={jest.fn()} />);

    expect(screen.getByText('Christian Hayes')).toBeOnTheScreen();
    expect(screen.getByText('University of London')).toBeOnTheScreen();
    expect(screen.getByText('4.5')).toBeOnTheScreen();
    expect(screen.getByText('(1233)')).toBeOnTheScreen();
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    await render(<TeacherCard teacher={TEACHER} onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: /Christian Hayes/ }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('falls back to initials without a photo and hides a missing organization', async () => {
    await render(
      <TeacherCard
        teacher={{ ...TEACHER, avatarUrl: null, organization: null }}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('CH')).toBeOnTheScreen();
    expect(screen.queryByText('University of London')).not.toBeOnTheScreen();
  });

  it('describes the card for screen readers, with or without an organization', async () => {
    const { rerender } = await render(<TeacherCard teacher={TEACHER} onPress={jest.fn()} />);
    expect(
      screen.getByRole('button', { name: 'Christian Hayes, University of London, rated 4.5' }),
    ).toBeOnTheScreen();

    await rerender(
      <TeacherCard teacher={{ ...TEACHER, organization: null }} onPress={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Christian Hayes, rated 4.5' })).toBeOnTheScreen();
  });

  it('uses the Vietnamese label and decimal comma after a language change', async () => {
    await i18n.changeLanguage('vi');
    await render(<TeacherCard teacher={TEACHER} onPress={jest.fn()} />);

    expect(
      screen.getByRole('button', {
        name: 'Christian Hayes, University of London, đánh giá 4,5',
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText('4,5')).toBeOnTheScreen();
  });
});
