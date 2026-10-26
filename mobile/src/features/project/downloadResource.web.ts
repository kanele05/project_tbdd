import type { ResourceDto } from '@/types/api';

import { sanitizeFileName } from './fileUtils';

/** Clicks a temporary `<a>` so the browser saves (or, as a fallback, opens) the file. */
function clickAnchor(href: string, name: string, isCrossOriginFallback: boolean): void {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.rel = 'noopener';
  if (isCrossOriginFallback) {
    // `download` is ignored for cross-origin URLs, so open the file in a new tab instead.
    anchor.target = '_blank';
  } else {
    anchor.download = name;
  }
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/**
 * Web version of `downloadResource.ts`: `expo-file-system` does not exist in the browser, so the
 * file is fetched as a blob and saved through an `<a download>` (this works cross-origin because
 * the API sends CORS headers). If the fetch is blocked, the URL is opened in a new tab instead.
 * Returns the URL that was saved/opened; there is no local file to share afterwards.
 */
export async function downloadResource(
  resource: ResourceDto,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const name = sanitizeFileName(resource.name);
  let blobUrl: string | null = null;
  try {
    const response = await fetch(resource.fileUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    blobUrl = URL.createObjectURL(await response.blob());
  } catch {
    clickAnchor(resource.fileUrl, name, true);
    return resource.fileUrl;
  }
  onProgress?.(100);
  clickAnchor(blobUrl, name, false);
  // Give the browser time to start the save before releasing the blob.
  const url = blobUrl;
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return url;
}

/** The browser already saved the file in `downloadResource`, so there is nothing to open. */
export async function openDownloadedFile(_uri: string, _mimeType: string): Promise<void> {
  // Intentionally empty: kept so web and native expose the same module shape.
}
