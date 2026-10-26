import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Composer } from './Composer';

// Pretend to be on the web, where the browser draws its own focus outline.
jest.mock('@/components/ui/inputStyles', () => ({
  noWebFocusOutline: { outlineStyle: 'none', outlineWidth: 0 },
}));

describe('Composer (web focus outline)', () => {
  it('removes the default browser outline from the pill input', async () => {
    await render(<Composer placeholder="Write a Q&A..." onSubmit={jest.fn()} />);

    const style = StyleSheet.flatten(screen.getByLabelText('Write a Q&A...').props.style);

    expect(style).toMatchObject({ outlineStyle: 'none', outlineWidth: 0 });
  });
});
