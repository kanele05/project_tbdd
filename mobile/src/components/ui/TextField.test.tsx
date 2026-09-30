import { fireEvent, render, screen } from '@testing-library/react-native';

import { TextField } from './TextField';

describe('TextField', () => {
  it('renders the label and forwards typed text', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Email" value="" onChangeText={onChangeText} />);

    expect(screen.getByText('Email')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.com');
    expect(onChangeText).toHaveBeenCalledWith('a@b.com');
  });

  it('shows the error message', async () => {
    await render(<TextField label="Email" value="x" error="Enter a valid email address" />);
    expect(screen.getByText('Enter a valid email address')).toBeOnTheScreen();
  });

  it('toggles password visibility', async () => {
    await render(<TextField label="Password" value="secret123" secureTextEntry />);

    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeOnTheScreen();
  });
});
