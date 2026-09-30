import type { Ref } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import type { TextInput } from 'react-native';

import { TextField, type TextFieldProps } from './TextField';

export type FormTextFieldProps<T extends FieldValues> = Omit<
  TextFieldProps,
  'value' | 'onChangeText' | 'error' | 'onBlur'
> & {
  control: Control<T>;
  name: Path<T>;
};

function assignRef(ref: Ref<TextInput> | undefined, instance: TextInput | null): void {
  if (typeof ref === 'function') ref(instance);
  else if (ref) (ref as { current: TextInput | null }).current = instance;
}

/**
 * `TextField` bound to react-hook-form: shows the field's validation error under the input.
 * Use one per field inside a form built with `useForm` + `zodResolver`.
 * A `ref` passed in (to focus the next field) is merged with react-hook-form's own ref.
 */
export function FormTextField<T extends FieldValues>({
  control,
  name,
  ref: externalRef,
  ...fieldProps
}: FormTextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...fieldProps}
          ref={(instance) => {
            field.ref(instance);
            assignRef(externalRef, instance);
          }}
          value={typeof field.value === 'string' ? field.value : ''}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
