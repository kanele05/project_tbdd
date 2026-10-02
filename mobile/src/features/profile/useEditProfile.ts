import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { showToast } from '@/components/ui/Toast';
import { STRINGS } from '@/constants/strings';
import { applyAuthError } from '@/features/auth/authErrors';
import { getErrorMessage, toAppError } from '@/lib/appError';
import { useAuthStore } from '@/stores/authStore';
import type { UpdateProfileRequest, UserDto } from '@/types/api';

import { editProfileApi, type AvatarFile } from './editProfileApi';

/** BR: avatar must be a png/jpg of at most 5 MB (PLAN.md §9.2 `POST /me/avatar`). */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_TYPES = ['image/png', 'image/jpeg'];
const EXTENSION_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

export const AVATAR_TYPE_MESSAGE = 'Please choose a PNG or JPG image.';
export const AVATAR_SIZE_MESSAGE = 'Image is too large (max 5 MB).';

export const editProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(60, 'Full name is too long'),
  headline: z.string().trim().max(80, 'Headline must be 80 characters or fewer'),
});

export type EditProfileValues = z.infer<typeof editProfileSchema>;

/** The parts of an `ImagePickerAsset` the avatar checks need. */
export type PickedImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string;
  fileSize?: number;
};

function getExtension(nameOrUri: string): string | null {
  const match = /\.([a-z0-9]+)$/i.exec(nameOrUri.split('?')[0] ?? '');
  return match?.[1]?.toLowerCase() ?? null;
}

/** MIME type from the picker, else from the file extension; `null` when it cannot be told. */
export function resolveImageMimeType(image: PickedImage): string | null {
  const declared = image.mimeType?.toLowerCase();
  if (declared) return declared === 'image/jpg' ? 'image/jpeg' : declared;
  const extension = getExtension(image.fileName ?? image.uri);
  return extension ? (EXTENSION_TYPES[extension] ?? `image/${extension}`) : null;
}

/** Client-side check before uploading: png/jpg and <= 5 MB. Returns an error message or `null`. */
export function validateAvatarImage(image: PickedImage): string | null {
  const mimeType = resolveImageMimeType(image);
  if (mimeType && !AVATAR_TYPES.includes(mimeType)) return AVATAR_TYPE_MESSAGE;
  if (image.fileSize !== undefined && image.fileSize > AVATAR_MAX_BYTES) return AVATAR_SIZE_MESSAGE;
  return null;
}

/** Build the multipart `file` descriptor (`uri`, `name`, `type`) for an accepted image. */
export function toAvatarFile(image: PickedImage): AvatarFile {
  const type = resolveImageMimeType(image) ?? 'image/jpeg';
  const extension = type === 'image/png' ? 'png' : 'jpg';
  const name = image.fileName?.trim() || `avatar.${extension}`;
  return { uri: image.uri, name: getExtension(name) ? name : `${name}.${extension}`, type };
}

/** Friendly message for a failed avatar upload (the generic 10 MB text does not fit here). */
export function getAvatarErrorMessage(error: unknown): string {
  switch (toAppError(error).code) {
    case 'FILE_TOO_LARGE':
      return AVATAR_SIZE_MESSAGE;
    case 'UNSUPPORTED_FILE_TYPE':
      return AVATAR_TYPE_MESSAGE;
    default:
      return getErrorMessage(error);
  }
}

/** Only the fields that differ from the current user (PATCH sends what changed). */
export function getProfileChanges(user: UserDto, values: EditProfileValues): UpdateProfileRequest {
  const changes: UpdateProfileRequest = {};
  const fullName = values.fullName.trim();
  const headline = values.headline.trim();
  if (fullName !== user.fullName) changes.fullName = fullName;
  if (headline !== (user.headline ?? '')) changes.headline = headline;
  return changes;
}

/** Updated user = the server's answer when it sent one, else the current user + sent fields. */
export function mergeUpdatedUser(
  current: UserDto,
  updated: UserDto | undefined,
  changes: UpdateProfileRequest,
): UserDto {
  if (updated && typeof updated === 'object' && 'id' in updated) return { ...current, ...updated };
  return {
    ...current,
    fullName: changes.fullName ?? current.fullName,
    headline: changes.headline === undefined ? current.headline : changes.headline || null,
  };
}

function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * SC-21 Edit profile logic (FR-22): form state (react-hook-form + zod), avatar picking with a
 * square crop, and Save = optional `POST /me/avatar` (with progress) then `PATCH /me`. Each
 * success writes the new user to the auth store and the `['me']` cache.
 */
export function useEditProfile() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [pendingAvatar, setPendingAvatar] = useState<AvatarFile | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: { fullName: user?.fullName ?? '', headline: user?.headline ?? '' },
  });
  const { isDirty } = form.formState;

  const updateProfile = useMutation({
    mutationFn: (changes: UpdateProfileRequest) => editProfileApi.updateProfile(changes),
  });
  const uploadAvatar = useMutation({
    mutationFn: (file: AvatarFile) => editProfileApi.uploadAvatar(file, setUploadProgress),
  });
  const isSaving = updateProfile.isPending || uploadAvatar.isPending;

  const pickAvatar = useCallback(async () => {
    if (isSaving) return;
    try {
      // The system photo picker needs no runtime permission.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      const image = result.canceled ? undefined : result.assets[0];
      if (!image) return;
      const problem = validateAvatarImage(image);
      if (problem) {
        showToast(problem, { type: 'error' });
        return;
      }
      setFormError(null);
      setPendingAvatar(toAvatarFile(image));
    } catch {
      showToast(STRINGS.errors.generic, { type: 'error' });
    }
  }, [isSaving]);

  const save = form.handleSubmit(async (values) => {
    if (!user) return;
    setFormError(null);
    let current = user;
    let isChanged = false;

    if (pendingAvatar) {
      try {
        const { avatarUrl } = await uploadAvatar.mutateAsync(pendingAvatar);
        current = { ...current, avatarUrl };
        setUser(current); // keep the new photo even if the PATCH below fails
        setPendingAvatar(null);
        isChanged = true;
      } catch (error) {
        setFormError(getAvatarErrorMessage(error));
        return;
      } finally {
        setUploadProgress(null);
      }
    }

    const changes = getProfileChanges(user, values);
    if (Object.keys(changes).length > 0) {
      try {
        const updated = await updateProfile.mutateAsync(changes);
        current = mergeUpdatedUser(current, updated, changes);
        setUser(current);
        isChanged = true;
      } catch (error) {
        setFormError(applyAuthError(error, form.setError, ['fullName', 'headline'] as const));
        return;
      }
    }

    if (isChanged) showToast('Profile updated', { type: 'success' });
    goBack();
  });

  return {
    control: form.control,
    user,
    avatarUri: pendingAvatar?.uri ?? user?.avatarUrl ?? null,
    uploadProgress,
    isUploadingAvatar: uploadAvatar.isPending,
    isSaving,
    hasChanges: isDirty || pendingAvatar !== null,
    formError,
    pickAvatar,
    save,
  };
}
