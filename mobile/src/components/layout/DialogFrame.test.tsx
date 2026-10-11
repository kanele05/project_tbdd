import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { isWideRoute } from './desktopLayout';
import { DialogFrame } from './DialogFrame';

describe('DialogFrame', () => {
  it('shows the title, the body and the footer in a dialog card', async () => {
    await renderWithProviders(
      <DialogFrame
        title="Write a review"
        closeLabel="Close"
        onClose={jest.fn()}
        footer={<Text>Footer action</Text>}
        testID="dialog"
      >
        <Text>Body content</Text>
      </DialogFrame>,
    );

    expect(screen.getByTestId('dialog-card')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Write a review' })).toBeOnTheScreen();
    expect(screen.getByText('Body content')).toBeOnTheScreen();
    expect(screen.getByText('Footer action')).toBeOnTheScreen();
  });

  it('closes with the close button and with a click on the backdrop', async () => {
    const onClose = jest.fn();
    await renderWithProviders(
      <DialogFrame title="Filters" closeLabel="Close" onClose={onClose} testID="dialog">
        <Text>Body</Text>
      </DialogFrame>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    await fireEvent.press(screen.getByTestId('dialog-backdrop', { hidden: true }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('puts the extra header controls next to the close button', async () => {
    await renderWithProviders(
      <DialogFrame
        title="Filters"
        closeLabel="Close"
        onClose={jest.fn()}
        headerRight={<Text>Reset</Text>}
      >
        <Text>Body</Text>
      </DialogFrame>,
    );

    expect(screen.getByText('Reset')).toBeOnTheScreen();
  });
});

describe('WEB-05c route patterns', () => {
  it.each([
    '/settings',
    '/settings/security',
    '/settings/two-factor',
    '/learn/c1/tutor',
    '/learn/c1/quiz',
    '/learn/c1/submit-project',
    '/course/c1/write-review',
    '/search-filter',
  ])('gives %s a desktop layout', (pathname) => {
    expect(isWideRoute(pathname)).toBe(true);
  });

  it('leaves unknown sub-routes in the narrow column', () => {
    expect(isWideRoute('/settings/other')).toBe(false);
    expect(isWideRoute('/learn/c1/other')).toBe(false);
  });
});
