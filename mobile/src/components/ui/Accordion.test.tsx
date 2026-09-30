import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Accordion } from './Accordion';

describe('Accordion', () => {
  it('starts collapsed and expands on press', async () => {
    await render(
      <Accordion title="I - Introduction">
        <Text>Lesson 01</Text>
      </Accordion>,
    );

    expect(screen.queryByText('Lesson 01')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'I - Introduction' }));
    expect(screen.getByText('Lesson 01')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'I - Introduction' })).toBeExpanded();
  });

  it('honors defaultExpanded and reports toggles', async () => {
    const onToggle = jest.fn();
    await render(
      <Accordion title="II - Basics" defaultExpanded onToggle={onToggle}>
        <Text>Lesson 02</Text>
      </Accordion>,
    );

    expect(screen.getByText('Lesson 02')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'II - Basics' }));
    expect(onToggle).toHaveBeenCalledWith(false);
    expect(screen.queryByText('Lesson 02')).not.toBeOnTheScreen();
  });
});
