import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors, typography } from '@/theme';

import { AppText } from './AppText';

describe('AppText', () => {
  it('applies the body variant and text color by default', async () => {
    await render(<AppText>Hello</AppText>);
    const style = StyleSheet.flatten(screen.getByText('Hello').props.style);
    expect(style.fontFamily).toBe(typography.body.fontFamily);
    expect(style.fontSize).toBe(14);
    expect(style.color).toBe(colors.textPrimary);
  });

  it('uses heading font for h3 and muted color for caption', async () => {
    await render(
      <>
        <AppText variant="h3">Title</AppText>
        <AppText variant="caption">Small</AppText>
      </>,
    );
    expect(StyleSheet.flatten(screen.getByText('Title').props.style).fontFamily).toBe(
      'Epilogue_600SemiBold',
    );
    expect(StyleSheet.flatten(screen.getByText('Small').props.style).color).toBe(colors.textMuted);
  });

  it('supports color, family, alignment and uppercase overrides', async () => {
    await render(
      <AppText color="primary" family="bodySemiBold" align="center" uppercase>
        Tab
      </AppText>,
    );
    const style = StyleSheet.flatten(screen.getByText('Tab').props.style);
    expect(style.color).toBe(colors.primary);
    expect(style.fontFamily).toBe('Inter_600SemiBold');
    expect(style.textAlign).toBe('center');
    expect(style.textTransform).toBe('uppercase');
  });
});
