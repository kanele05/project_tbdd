import { fireEvent, render, screen } from '@testing-library/react-native';

import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('calls onChangeText while typing and onSubmit on the search key', async () => {
    const onChangeText = jest.fn();
    const onSubmit = jest.fn();
    await render(<SearchBar value="Design" onChangeText={onChangeText} onSubmit={onSubmit} />);

    const input = screen.getByLabelText('Search course');
    await fireEvent.changeText(input, 'Design 2');
    expect(onChangeText).toHaveBeenCalledWith('Design 2');

    await fireEvent(input, 'submitEditing');
    expect(onSubmit).toHaveBeenCalledWith('Design');
  });

  it('shows a clear button only when there is text and clears on press', async () => {
    const onChangeText = jest.fn();
    const onClear = jest.fn();
    const { rerender } = await render(
      <SearchBar value="" onChangeText={onChangeText} onClear={onClear} />,
    );
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeOnTheScreen();

    await rerender(<SearchBar value="abc" onChangeText={onChangeText} onClear={onClear} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));
    expect(onChangeText).toHaveBeenCalledWith('');
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
