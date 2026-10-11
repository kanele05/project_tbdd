import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { OtpInput } from './OtpInput';

const onComplete = jest.fn();
const onSubmit = jest.fn();

function Harness({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState('');
  return (
    <OtpInput
      value={value}
      onChange={setValue}
      onComplete={onComplete}
      onSubmit={onSubmit}
      label="6-digit code"
      disabled={disabled}
    />
  );
}

describe('OtpInput', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is one labeled field for screen readers with the SMS / email autofill hints', async () => {
    await render(<Harness />);
    const input = screen.getByLabelText('6-digit code');
    expect(input.props.textContentType).toBe('oneTimeCode');
    expect(input.props.autoComplete).toBe('sms-otp');
    expect(input.props.keyboardType).toBe('number-pad');
  });

  it('fills the boxes digit by digit and reports the full code once', async () => {
    await render(<Harness />);
    const input = screen.getByLabelText('6-digit code');

    await fireEvent.changeText(input, '123');
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByText('3', { includeHiddenElements: true })).toBeOnTheScreen();

    await fireEvent.changeText(input, '123456');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('keeps only the digits of a pasted text and ignores extra ones', async () => {
    await render(<Harness />);
    const input = screen.getByLabelText('6-digit code');

    await fireEvent.changeText(input, 'Code: 12-34 56 78');

    expect(screen.getByLabelText('6-digit code').props.value).toBe('123456');
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('does not accept letters', async () => {
    await render(<Harness />);

    await fireEvent.changeText(screen.getByLabelText('6-digit code'), 'abc');

    expect(screen.getByLabelText('6-digit code').props.value).toBe('');
  });

  it('cannot be edited while disabled', async () => {
    await render(<Harness disabled />);
    expect(screen.getByLabelText('6-digit code').props.editable).toBe(false);
  });

  it('submits the full code on Enter (web keyboard) but not an incomplete one', async () => {
    await render(<Harness />);
    const input = screen.getByLabelText('6-digit code');
    await fireEvent.changeText(input, '123');
    await fireEvent(input, 'submitEditing');
    expect(onSubmit).not.toHaveBeenCalled();

    await fireEvent.changeText(input, '123456');
    await fireEvent(screen.getByLabelText('6-digit code'), 'submitEditing');
    expect(onSubmit).toHaveBeenCalledWith('123456');
  });
});
