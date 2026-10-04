import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { i18n } from '@/i18n';
import type { ResourceDto } from '@/types/api';

import { sanitizeFileName } from './fileUtils';

/**
 * Downloads a project resource into the cache directory with the SDK 57 `expo-file-system` API
 * and returns the local `file://` URI. `onProgress` receives 0-100 when the size is known.
 */
export async function downloadResource(
  resource: ResourceDto,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const destination = new File(Paths.cache, sanitizeFileName(resource.name));
  const file = await File.downloadFileAsync(resource.fileUrl, destination, {
    idempotent: true,
    onProgress: ({ bytesWritten, totalBytes }) => {
      if (onProgress && totalBytes > 0) onProgress(Math.round((bytesWritten / totalBytes) * 100));
    },
  });
  return file.uri;
}

/** Opens the system share / "open with" sheet for a local file (`expo-sharing`). */
export async function openDownloadedFile(uri: string, mimeType: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error(i18n.t('project:openUnsupported'));
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: i18n.t('project:openResource') });
}
