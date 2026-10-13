import { Platform } from 'react-native';

/** A picked local file to send as a multipart part. */
export type FilePart = { uri: string; name: string; type: string };

/**
 * Appends a picked file to a multipart body. React Native's FormData takes `{ uri, name, type }`
 * and reads the file itself, but a browser would send that object as the text "[object Object]"
 * (the server then sees no file). On the web the picker's `blob:` / `data:` URI is read into a
 * Blob first.
 */
export async function appendFilePart(form: FormData, field: string, file: FilePart): Promise<void> {
  if (Platform.OS !== 'web') {
    form.append(field, file as unknown as Blob);
    return;
  }
  const blob = await (await fetch(file.uri)).blob();
  const typed = blob.type === file.type ? blob : new Blob([blob], { type: file.type });
  form.append(field, typed, file.name);
}
