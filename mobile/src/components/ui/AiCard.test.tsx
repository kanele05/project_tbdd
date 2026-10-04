import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import { darkPalette } from '@/theme';

import { AiCard } from './AiCard';

describe('AiCard', () => {
  it('renders the title, subtitle and the children of a panel', async () => {
    await renderWithProviders(
      <AiCard title="AI Tutor" subtitle="Knows where you are stuck">
        <Text>Suggestion</Text>
      </AiCard>,
    );
    expect(screen.getByRole('header', { name: 'AI Tutor' })).toBeOnTheScreen();
    expect(screen.getByText('Knows where you are stuck')).toBeOnTheScreen();
    expect(screen.getByText('Suggestion')).toBeOnTheScreen();
  });

  it('draws the title in the italic display serif', async () => {
    await renderWithProviders(<AiCard title="AI Tutor" />);
    expect(screen.getByText('AI Tutor')).toHaveStyle({
      fontFamily: 'PlayfairDisplay_700Bold_Italic',
    });
  });

  it('is a single labelled button in the compact row variant', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <AiCard
        variant="row"
        title="Ask the AI Tutor"
        subtitle="Summaries and answers"
        onPress={onPress}
      />,
    );
    const button = screen.getByRole('button', { name: 'Ask the AI Tutor. Summaries and answers' });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is not a button without onPress', async () => {
    await renderWithProviders(<AiCard title="AI Tutor" />);
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('keeps the title readable on the dark card', async () => {
    await renderWithProviders(<AiCard title="AI Tutor" />, { theme: 'dark' });
    expect(screen.getByText('AI Tutor')).toHaveStyle({ color: darkPalette.text });
  });
});
