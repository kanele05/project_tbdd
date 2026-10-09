import { fireEvent, render, screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';

import { RegistrationRolePicker } from './RegistrationRolePicker';
import type { RegisterFormValues } from '../schemas';

function PickerHarness() {
  const { control } = useForm<RegisterFormValues>({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'STUDENT',
    },
  });
  return <RegistrationRolePicker control={control} />;
}

describe('RegistrationRolePicker', () => {
  it('exposes an accessible radio group and selects the requested role', async () => {
    await render(<PickerHarness />);

    expect(screen.getByLabelText('Account type')).toHaveProp('accessibilityRole', 'radiogroup');
    expect(screen.getByRole('radio', { name: 'Student' }).props.accessibilityState).toEqual({
      checked: true,
      disabled: false,
    });

    await fireEvent.press(screen.getByRole('radio', { name: 'Teacher' }));

    expect(screen.getByRole('radio', { name: 'Teacher' }).props.accessibilityState).toEqual({
      checked: true,
      disabled: false,
    });
    expect(screen.getByRole('radio', { name: 'Student' }).props.accessibilityState).toEqual({
      checked: false,
      disabled: false,
    });
  });
});
