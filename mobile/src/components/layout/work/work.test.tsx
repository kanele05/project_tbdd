import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Text, useWindowDimensions } from 'react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { isWideRoute } from '../desktopLayout';
import { TableLoadMore } from './TableLoadMore';
import { TwoColumn } from './TwoColumn';
import { WorkHeader } from './WorkHeader';
import { WorkPanel } from './WorkPanel';
import { getColumnStyle, TableCell, TableHeaderRow, TableRow } from './WorkTable';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1280, height: 900, scale: 1, fontScale: 1 })),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;
const setWidth = (width: number) =>
  mockUseWindowDimensions.mockReturnValue({ width, height: 900, scale: 1, fontScale: 1 });

describe('getColumnStyle', () => {
  it('gives a fixed width or a flex share, and right-aligns on request', () => {
    expect(getColumnStyle({ key: 'a', label: 'A', width: 90 })).toEqual({
      width: 90,
      flexShrink: 0,
    });
    expect(getColumnStyle({ key: 'b', label: 'B', flex: 3 })).toEqual({ flex: 3, minWidth: 0 });
    expect(getColumnStyle({ key: 'c', label: 'C' })).toEqual({ flex: 1, minWidth: 0 });
    expect(getColumnStyle({ key: 'd', label: 'D', width: 50, align: 'right' })).toMatchObject({
      alignItems: 'flex-end',
    });
  });
});

describe('work route patterns', () => {
  it('marks the Studio, Admin and teacher-profile routes as wide, but not the AI sheet', () => {
    for (const path of [
      '/studio',
      '/studio/c1',
      '/studio/new/edit',
      '/studio/c1/curriculum',
      '/studio/c1/stats',
      '/studio/c1/submissions',
      '/admin',
      '/admin/courses',
      '/admin/users',
      '/admin/courses/c1',
      '/profile/teacher-edit',
    ]) {
      expect({ path, isWide: isWideRoute(path) }).toEqual({ path, isWide: true });
    }
    expect(isWideRoute('/studio/ai-draft')).toBe(false);
    expect(isWideRoute('/dev/ui-kit')).toBe(false);
  });
});

describe('WorkHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWidth(1280);
  });

  it('shows the title, subtitle and actions, with an optional back link', async () => {
    const onBack = jest.fn();
    await renderWithProviders(
      <WorkHeader
        title="Review queue"
        subtitle="Oldest first"
        hasBack
        onBack={onBack}
        right={<Text>action</Text>}
      />,
    );

    expect(screen.getByText('Review queue')).toBeOnTheScreen();
    expect(screen.getByText('Oldest first')).toBeOnTheScreen();
    expect(screen.getByText('action')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('work-header-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('goes back through the router, or home when there is no history', async () => {
    await renderWithProviders(<WorkHeader title="T" hasBack />);
    await fireEvent.press(screen.getByTestId('work-header-back'));
    expect(router.back).toHaveBeenCalledTimes(1);

    (router.canGoBack as jest.Mock).mockReturnValueOnce(false);
    await fireEvent.press(screen.getByTestId('work-header-back'));
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('has no back link by default', async () => {
    await renderWithProviders(<WorkHeader title="T" />);
    expect(screen.queryByTestId('work-header-back')).not.toBeOnTheScreen();
  });
});

describe('table primitives', () => {
  const columns = [
    { key: 'name', label: 'Name', flex: 2 },
    { key: 'price', label: 'Price', width: 80, align: 'right' as const },
  ];

  it('renders the column labels and a pressable row', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <>
        <TableHeaderRow columns={columns} />
        <TableRow onPress={onPress} accessibilityLabel="Open row" testID="row">
          <TableCell column={columns[0]!}>
            <Text>Course A</Text>
          </TableCell>
          <TableCell column={columns[1]!}>
            <Text>$5</Text>
          </TableCell>
        </TableRow>
      </>,
    );

    expect(screen.getByText('Name')).toBeOnTheScreen();
    expect(screen.getByText('Price')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Open row'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders a row without onPress as plain content', async () => {
    await renderWithProviders(
      <TableRow testID="plain">
        <Text>cell</Text>
      </TableRow>,
    );
    expect(screen.getByTestId('plain')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('shows the load-more button only while more pages exist', async () => {
    const onPress = jest.fn();
    const first = await renderWithProviders(
      <TableLoadMore hasMore isLoading={false} onPress={onPress} />,
    );
    await fireEvent.press(screen.getByTestId('table-load-more'));
    expect(onPress).toHaveBeenCalledTimes(1);
    first.unmount();

    await renderWithProviders(
      <TableLoadMore hasMore={false} isLoading={false} onPress={onPress} />,
    );
    expect(screen.queryByTestId('table-load-more')).not.toBeOnTheScreen();
  });
});

describe('TwoColumn', () => {
  it('renders a fixed side column on a desktop window and stacks it on a tablet', async () => {
    setWidth(1280);
    const desktop = await renderWithProviders(
      <TwoColumn testID="cols" main={<Text>main</Text>} side={<Text>side</Text>} />,
    );
    expect(screen.getByTestId('cols-side')).toBeOnTheScreen();
    desktop.unmount();

    setWidth(820);
    await renderWithProviders(
      <TwoColumn testID="cols" main={<Text>main</Text>} side={<Text>side</Text>} />,
    );
    expect(screen.getByText('main')).toBeOnTheScreen();
    expect(screen.getByText('side')).toBeOnTheScreen();
    expect(screen.queryByTestId('cols-side')).not.toBeOnTheScreen();
  });
});

describe('WorkPanel', () => {
  it('shows an optional heading above its content', async () => {
    await renderWithProviders(
      <WorkPanel title="History">
        <Text>body</Text>
      </WorkPanel>,
    );
    expect(screen.getByRole('header', { name: 'History' })).toBeOnTheScreen();
    expect(screen.getByText('body')).toBeOnTheScreen();
  });
});
