import { fireEvent, render, screen } from '@testing-library/react-native';

import { ExpandableText } from './ExpandableText';

const LONG_TEXT = 'Culpa aliquip commodo incididunt nostrud aliqua ut adipisicing officia laborum.';

function layoutEvent(lines: string[]) {
  return { nativeEvent: { lines: lines.map((text) => ({ text })) } };
}

async function measure(lines: string[]) {
  await fireEvent(
    screen.getByTestId('expandable-text-measure', { includeHiddenElements: true }),
    'textLayout',
    layoutEvent(lines),
  );
}

describe('ExpandableText', () => {
  it('shows the whole text without a link when it fits in the line limit', async () => {
    await render(<ExpandableText text="Short text" />);
    await measure(['Short text']);

    expect(screen.getAllByText('Short text').length).toBeGreaterThan(0);
    expect(screen.queryByText(/See more/)).not.toBeOnTheScreen();
  });

  it('clamps long text to 4 lines with an inline "See more"', async () => {
    await render(<ExpandableText text={LONG_TEXT} />);
    await measure([
      'Culpa aliquip commodo ',
      'incididunt nostrud aliqua ',
      'ut adipisicing ',
      'officia ',
      'laborum.',
    ]);

    expect(screen.getByText(/See more/)).toBeOnTheScreen();
    // The visible copy is cut (the hidden measurer holds the full text).
    expect(screen.queryByText(LONG_TEXT)).not.toBeOnTheScreen();
  });

  it('expands to the full text and offers "See less"', async () => {
    await render(<ExpandableText text={LONG_TEXT} />);
    await measure(['a ', 'b ', 'c ', 'd ', 'e']);

    await fireEvent.press(screen.getByText(/See more/));

    expect(screen.getByText(LONG_TEXT)).toBeOnTheScreen();
    expect(screen.queryByText(/See more/)).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByText('See less'));
    expect(screen.getByText(/See more/)).toBeOnTheScreen();
  });

  it('respects a custom line limit', async () => {
    await render(<ExpandableText text={LONG_TEXT} maxLines={2} />);
    await measure(['a ', 'b ', 'c']);

    expect(screen.getByText(/See more/)).toBeOnTheScreen();
  });
});
