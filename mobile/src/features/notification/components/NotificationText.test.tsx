import { act, render, screen } from '@testing-library/react-native';

import { i18n } from '@/i18n';
import type { NotificationDto } from '@/types/api';

import { NotificationItem } from './NotificationItem';
import { NotificationRowDesktop } from './NotificationRowDesktop';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

const NEW_DEVICE: NotificationDto = {
  id: 'n1',
  type: 'SYSTEM',
  title: 'Đăng nhập từ thiết bị mới',
  body: 'Tài khoản của bạn vừa được đăng nhập từ thiết bị mới: Pixel 8. Nếu không phải bạn, hãy đổi mật khẩu.',
  data: { key: 'NEW_DEVICE', params: { device: 'Pixel 8' } },
  isRead: false,
  createdAt: new Date().toISOString(),
};

const OLD_ROW: NotificationDto = {
  ...NEW_DEVICE,
  id: 'n2',
  data: { courseId: 'c1' },
  title: 'Stored title',
  body: 'Stored body',
};

const EN_BODY =
  "Your account was signed in from a new device: Pixel 8. If this wasn't you, change your password.";

const VARIANTS = [
  ['phone item', (n: NotificationDto) => <NotificationItem notification={n} onPress={jest.fn()} />],
  [
    'desktop row',
    (n: NotificationDto) => <NotificationRowDesktop notification={n} onPress={jest.fn()} />,
  ],
] as const;

describe.each(VARIANTS)('%s notification text', (_name, renderRow) => {
  beforeEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it('shows the key in English, then re-renders in Vietnamese when the language changes', async () => {
    await render(renderRow(NEW_DEVICE));
    expect(screen.getByText('New device sign-in')).toBeOnTheScreen();
    expect(screen.getByText(EN_BODY)).toBeOnTheScreen();

    await act(async () => {
      await i18n.changeLanguage('vi');
    });
    expect(screen.getByText('Đăng nhập từ thiết bị mới')).toBeOnTheScreen();
    expect(screen.getByText(NEW_DEVICE.body)).toBeOnTheScreen();
  });

  it('shows the stored text when there is no key', async () => {
    await render(renderRow(OLD_ROW));
    expect(screen.getByText('Stored title')).toBeOnTheScreen();
    expect(screen.getByText('Stored body')).toBeOnTheScreen();
  });

  it('shows the stored text when a known key lacks its params', async () => {
    await render(renderRow({ ...NEW_DEVICE, data: { key: 'NEW_DEVICE', params: {} } }));
    expect(screen.getByText(NEW_DEVICE.title)).toBeOnTheScreen();
    expect(screen.getByText(NEW_DEVICE.body)).toBeOnTheScreen();
  });
});
