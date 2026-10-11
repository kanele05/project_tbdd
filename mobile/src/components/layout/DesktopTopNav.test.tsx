import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { useAuthStore } from '@/stores/authStore';
import { renderWithProviders } from '@/test/renderWithProviders';
import { darkPalette } from '@/theme';
import type { Role } from '@/types/api';

import { useDesktopNavStore } from './desktopLayout';
import { DesktopTopNav } from './DesktopTopNav';

let mockPathname = '/';
const mockConfirmLogout = jest.fn();
let mockCartCount = 0;
let mockUnreadCount = 0;

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), push: jest.fn() },
  usePathname: () => mockPathname,
}));
jest.mock('@/features/auth/useConfirmLogout', () => ({
  useConfirmLogout: () => mockConfirmLogout,
}));
jest.mock('@/features/cart/hooks', () => ({ useCartCount: () => mockCartCount }));
jest.mock('@/features/notification/hooks', () => ({
  useUnreadNotificationCount: () => mockUnreadCount,
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1280, height: 800, scale: 1, fontScale: 1 })),
}));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;
const setWidth = (width: number) =>
  mockUseWindowDimensions.mockReturnValue({ width, height: 800, scale: 1, fontScale: 1 });

function signIn(role: Role = 'STUDENT') {
  useAuthStore.setState({
    status: 'authenticated',
    user: {
      id: 'u1',
      email: 'sara@example.com',
      fullName: 'Sara Weise',
      headline: null,
      avatarUrl: null,
      coverUrl: null,
      role,
    },
  });
}

const openMenu = async () => {
  await fireEvent.press(screen.getByRole('button', { name: /Account menu of Sara Weise/ }));
};

describe('DesktopTopNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/';
    mockCartCount = 0;
    mockUnreadCount = 0;
    setWidth(1280);
  });
  afterEach(async () => {
    await act(async () => {
      useAuthStore.setState({ status: 'idle', user: null });
      useDesktopNavStore.getState().setTransparent(false);
    });
  });

  describe('visibility', () => {
    it('renders nothing on a phone-sized window', async () => {
      signIn();
      setWidth(390);
      await renderWithProviders(<DesktopTopNav />);
      expect(screen.queryByTestId('desktop-top-nav')).not.toBeOnTheScreen();
    });

    it('renders nothing for a signed-out user (auth screens)', async () => {
      await renderWithProviders(<DesktopTopNav />);
      expect(screen.queryByTestId('desktop-top-nav')).not.toBeOnTheScreen();
    });

    it.each([768, 1024, 1440])('renders at %d dp when signed in', async (width) => {
      signIn();
      setWidth(width);
      await renderWithProviders(<DesktopTopNav />);
      expect(screen.getByTestId('desktop-top-nav')).toBeOnTheScreen();
    });
  });

  describe('links', () => {
    it('shows Home and My courses to a student, and navigates when pressed', async () => {
      signIn('STUDENT');
      await renderWithProviders(<DesktopTopNav />);
      expect(screen.getByRole('link', { name: 'Home' })).toBeOnTheScreen();
      expect(screen.queryByRole('link', { name: 'Teaching' })).not.toBeOnTheScreen();
      expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('link', { name: 'My Courses' }));
      expect(router.navigate).toHaveBeenCalledWith('/my-courses');
    });

    it('adds the Teaching link for a teacher and Admin for an admin', async () => {
      signIn('TEACHER');
      const { unmount } = await renderWithProviders(<DesktopTopNav />);
      await fireEvent.press(screen.getByRole('link', { name: 'Teaching' }));
      expect(router.navigate).toHaveBeenCalledWith('/studio');
      unmount();

      signIn('ADMIN');
      await renderWithProviders(<DesktopTopNav />);
      await fireEvent.press(screen.getByRole('link', { name: 'Admin' }));
      expect(router.navigate).toHaveBeenCalledWith('/admin');
    });

    it('marks the link of the current page as selected', async () => {
      signIn('TEACHER');
      mockPathname = '/studio/c1/edit';
      await renderWithProviders(<DesktopTopNav />);
      expect(screen.getByRole('link', { name: 'Teaching' })).toBeSelected();
      expect(screen.getByRole('link', { name: 'Home' })).not.toBeSelected();
    });

    it('goes Home from the wordmark', async () => {
      signIn();
      await renderWithProviders(<DesktopTopNav />);
      await fireEvent.press(screen.getByRole('link', { name: 'elearn, go to Home' }));
      expect(router.navigate).toHaveBeenCalledWith('/');
    });

    it('speaks Vietnamese', async () => {
      signIn('TEACHER');
      await renderWithProviders(<DesktopTopNav />, { language: 'vi' });
      expect(screen.getByRole('link', { name: 'Trang chủ' })).toBeOnTheScreen();
      expect(screen.getByRole('link', { name: 'Khóa của tôi' })).toBeOnTheScreen();
      expect(screen.getByRole('link', { name: 'Giảng dạy' })).toBeOnTheScreen();
    });
  });

  describe('search', () => {
    it('expands into an input and opens /search?q= on submit', async () => {
      signIn();
      await renderWithProviders(<DesktopTopNav />);
      expect(screen.queryByTestId('nav-search-input')).not.toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Open search' }));
      const input = screen.getByTestId('nav-search-input');
      await fireEvent.changeText(input, '  react native ');
      await fireEvent(input, 'submitEditing');
      expect(router.navigate).toHaveBeenCalledWith({
        pathname: '/search',
        params: { q: 'react native' },
      });
    });

    it('does not search for an empty keyword', async () => {
      signIn();
      await renderWithProviders(<DesktopTopNav />);
      await fireEvent.press(screen.getByRole('button', { name: 'Open search' }));
      await fireEvent(screen.getByTestId('nav-search-input'), 'submitEditing');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('collapses on Escape and when it loses focus while empty', async () => {
      signIn();
      await renderWithProviders(<DesktopTopNav />);
      await fireEvent.press(screen.getByRole('button', { name: 'Open search' }));
      await fireEvent(screen.getByTestId('nav-search-input'), 'keyPress', {
        nativeEvent: { key: 'Escape' },
      });
      expect(screen.queryByTestId('nav-search-input')).not.toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Open search' }));
      await fireEvent(screen.getByTestId('nav-search-input'), 'blur');
      expect(screen.queryByTestId('nav-search-input')).not.toBeOnTheScreen();
    });

    it('stays open on blur while it holds text, and the clear button empties it', async () => {
      signIn();
      await renderWithProviders(<DesktopTopNav />);
      await fireEvent.press(screen.getByRole('button', { name: 'Open search' }));
      await fireEvent.changeText(screen.getByTestId('nav-search-input'), 'sql');
      await fireEvent(screen.getByTestId('nav-search-input'), 'blur');
      expect(screen.getByTestId('nav-search-input')).toHaveDisplayValue('sql');

      await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));
      expect(screen.getByTestId('nav-search-input')).toHaveDisplayValue('');
    });

    it('hides the links on a tablet while the field is open to make room', async () => {
      signIn();
      setWidth(800);
      await renderWithProviders(<DesktopTopNav />);
      expect(screen.getByRole('link', { name: 'Home' })).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Open search' }));
      expect(screen.queryByRole('link', { name: 'Home' })).not.toBeOnTheScreen();
    });

    it('keeps the links on a desktop window', async () => {
      signIn();
      await renderWithProviders(<DesktopTopNav />);
      await fireEvent.press(screen.getByRole('button', { name: 'Open search' }));
      expect(screen.getByRole('link', { name: 'Home' })).toBeOnTheScreen();
    });
  });

  describe('cart and notifications', () => {
    it('opens the cart and the notifications page', async () => {
      signIn();
      await renderWithProviders(<DesktopTopNav />);
      await fireEvent.press(screen.getByRole('button', { name: 'Cart' }));
      expect(router.navigate).toHaveBeenCalledWith('/cart');
      await fireEvent.press(screen.getByRole('button', { name: 'Notifications' }));
      expect(router.navigate).toHaveBeenCalledWith('/notifications');
    });

    it('puts the counts in the labels and shows the badges', async () => {
      signIn();
      mockCartCount = 3;
      mockUnreadCount = 5;
      await renderWithProviders(<DesktopTopNav />);
      expect(screen.getByRole('button', { name: 'Cart, 3 items' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Notifications, 5 unread' })).toBeOnTheScreen();
      expect(screen.getByText('3')).toBeOnTheScreen();
      expect(screen.getByText('5')).toBeOnTheScreen();
    });
  });

  describe('account menu', () => {
    it('is closed until the avatar is pressed, then lists Profile, Settings, Log out in order', async () => {
      signIn();
      await renderWithProviders(<DesktopTopNav />);
      expect(screen.queryByTestId('nav-account-menu')).not.toBeOnTheScreen();

      await openMenu();
      const labels = screen.getAllByRole('menuitem').map((item) => item.props.accessibilityLabel);
      expect(labels).toEqual(['Profile', 'Settings', 'Log out']);
      expect(screen.getByRole('button', { name: /Account menu/ })).toBeExpanded();
    });

    it('goes to Profile and Settings and closes the menu', async () => {
      signIn();
      await renderWithProviders(<DesktopTopNav />);
      await openMenu();
      await fireEvent.press(screen.getByRole('menuitem', { name: 'Profile' }));
      expect(router.navigate).toHaveBeenCalledWith('/profile');
      expect(screen.queryByTestId('nav-account-menu')).not.toBeOnTheScreen();

      await openMenu();
      await fireEvent.press(screen.getByRole('menuitem', { name: 'Settings' }));
      expect(router.push).toHaveBeenCalledWith('/settings');
    });

    it('asks to confirm before logging out', async () => {
      signIn();
      await renderWithProviders(<DesktopTopNav />);
      await openMenu();
      await fireEvent.press(screen.getByRole('menuitem', { name: 'Log out' }));
      expect(mockConfirmLogout).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('nav-account-menu')).not.toBeOnTheScreen();
    });

    it('closes on an outside click and when the avatar is pressed again', async () => {
      signIn();
      await renderWithProviders(<DesktopTopNav />);
      await openMenu();
      await fireEvent.press(screen.getByTestId('nav-backdrop'));
      expect(screen.queryByTestId('nav-account-menu')).not.toBeOnTheScreen();

      await openMenu();
      await openMenu();
      expect(screen.queryByTestId('nav-account-menu')).not.toBeOnTheScreen();
    });

    it('closes when the search field opens', async () => {
      signIn();
      await renderWithProviders(<DesktopTopNav />);
      await openMenu();
      await fireEvent.press(screen.getByRole('button', { name: 'Open search' }));
      expect(screen.queryByTestId('nav-account-menu')).not.toBeOnTheScreen();
    });
  });

  describe('transparent and solid states', () => {
    it('shows the dark fade on top of a hero and the solid bar otherwise', async () => {
      signIn();
      await renderWithProviders(<DesktopTopNav />);
      expect(screen.getByTestId('desktop-top-nav-solid')).toHaveStyle({ opacity: 1 });
      expect(screen.getByTestId('desktop-top-nav-gradient')).toHaveStyle({ opacity: 0 });

      await act(async () => useDesktopNavStore.getState().setTransparent(true));
      await waitFor(() => {
        expect(screen.getByTestId('desktop-top-nav-solid')).toHaveStyle({ opacity: 0 });
        expect(screen.getByTestId('desktop-top-nav-gradient')).toHaveStyle({ opacity: 1 });
      });
    });

    it('starts transparent when the page asked for it before the bar mounted', async () => {
      signIn();
      useDesktopNavStore.getState().setTransparent(true);
      await renderWithProviders(<DesktopTopNav />);
      expect(screen.getByTestId('desktop-top-nav-gradient')).toHaveStyle({ opacity: 1 });
    });

    it('draws the solid bar with the theme background', async () => {
      signIn();
      await renderWithProviders(<DesktopTopNav />, { theme: 'dark' });
      expect(screen.getByTestId('desktop-top-nav-solid')).toHaveStyle({
        backgroundColor: darkPalette.background,
      });
    });
  });
});
