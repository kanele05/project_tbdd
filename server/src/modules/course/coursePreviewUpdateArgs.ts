export type PreviewUpdateArgs = {
  manifestPath: string;
  shouldApply: boolean;
};

export const PREVIEW_UPDATE_USAGE =
  'Usage: updateCoursePreviews --external-manifest <file.json> [--apply]';

/** Phân tích đối số CLI của updater: bắt buộc `--external-manifest`, mặc định chạy thử (dry-run). */
export function parsePreviewUpdateArgs(args: readonly string[]): PreviewUpdateArgs {
  let manifestPath: string | undefined;
  let shouldApply = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--apply') {
      if (shouldApply) throw new Error(PREVIEW_UPDATE_USAGE);
      shouldApply = true;
    } else if (arg === '--external-manifest') {
      const value = args[index + 1];
      if (manifestPath !== undefined || !value || value.startsWith('--')) {
        throw new Error(
          manifestPath === undefined
            ? 'Provide a JSON file after --external-manifest'
            : PREVIEW_UPDATE_USAGE,
        );
      }
      manifestPath = value;
      index += 1;
    } else {
      throw new Error(PREVIEW_UPDATE_USAGE);
    }
  }
  if (manifestPath === undefined) {
    throw new Error(`--external-manifest is required. ${PREVIEW_UPDATE_USAGE}`);
  }
  return { manifestPath, shouldApply };
}
