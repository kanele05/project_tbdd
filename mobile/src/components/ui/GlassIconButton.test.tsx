import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { GlassIconButton } from './GlassIconButton';

describe('GlassIconButton', () => {
  it('is a labelled button that fires onPress', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <GlassIconButton icon="share-2" accessibilityLabel="Share" onPress={onPress} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Share' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('announces the active state as selected', async () => {
    await renderWithProviders(
      <GlassIconButton icon="heart" accessibilityLabel="Like" isActive onPress={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Like' })).toBeSelected();
  });

  it('pads a small visible size up to a 48 dp touch target', async () => {
    await renderWithProviders(
      <GlassIconButton icon="plus" accessibilityLabel="Add" size={36} onPress={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Add' }).props.hitSlop).toEqual({
      top: 6,
      bottom: 6,
      left: 6,
      right: 6,
    });
  });

  it('does not fire when disabled', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <GlassIconButton icon="plus" accessibilityLabel="Add" disabled onPress={onPress} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
