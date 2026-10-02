import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import type { PickedFile } from './api';
import {
  getFileExtension,
  getUploadMimeType,
  SUBMISSION_PICKER_TYPES,
  validateCoverImage,
  validateSubmissionFile,
} from './fileUtils';

/** A picked image sometimes has no usable name (edited / cropped copy): build one. */
function nameForImage(asset: ImagePicker.ImagePickerAsset): string {
  const fromAsset = asset.fileName?.trim();
  if (fromAsset && getFileExtension(fromAsset)) return fromAsset;
  const extension = asset.mimeType === 'image/png' ? 'png' : 'jpg';
  return `${fromAsset || 'cover'}.${extension}`;
}

/**
 * State + pickers of the Submit project form: the project file (`expo-document-picker`, png / jpg /
 * pdf / zip <= 10 MB, validated before upload) and the optional cover image (`expo-image-picker`).
 * A rejected selection keeps the previous valid one and exposes the reason in `*Error`.
 */
export function useSubmissionFiles() {
  const [file, setFile] = useState<PickedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [cover, setCover] = useState<PickedFile | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);

  const pickFile = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: SUBMISSION_PICKER_TYPES,
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    const error = validateSubmissionFile(asset);
    setFileError(error);
    if (error) return;
    setFile({
      uri: asset.uri,
      name: asset.name,
      mimeType: getUploadMimeType(asset.name, asset.mimeType),
      size: asset.size,
    });
  }, []);

  const pickCover = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    const name = nameForImage(asset);
    const error = validateCoverImage({ name, size: asset.fileSize });
    setCoverError(error);
    if (error) return;
    setCover({
      uri: asset.uri,
      name,
      mimeType: getUploadMimeType(name, asset.mimeType),
      size: asset.fileSize,
    });
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setFileError(null);
  }, []);
  const clearCover = useCallback(() => {
    setCover(null);
    setCoverError(null);
  }, []);

  return {
    file,
    fileError,
    setFileError,
    pickFile,
    clearFile,
    cover,
    coverError,
    pickCover,
    clearCover,
  };
}
