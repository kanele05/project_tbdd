import { api } from '@/lib/apiClient';
import { appendFilePart } from '@/lib/formData';
import type { UpdateProfileRequest, UploadAvatarResponse, UserDto } from '@/types/api';

/** A local image ready to be sent as the `file` part of the avatar upload. */
export type AvatarFile = { uri: string; name: string; type: string };

/** HTTP layer of SC-21 Edit profile (PLAN.md §9.2 "Me"). */
export const editProfileApi = {
  /**
   * `PATCH /me` `{ fullName?, headline? }`. The server answers with the updated user; an empty
   * body is tolerated (the hook then merges the sent fields into the cached user).
   */
  updateProfile: (body: UpdateProfileRequest) => api.patch<UserDto | undefined>('/me', body),

  /** `POST /me/avatar` multipart `file` (png/jpg <= 5 MB) -> `{ avatarUrl }`, with progress. */
  uploadAvatar: async (file: AvatarFile, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    await appendFilePart(form, 'file', file);
    return api.postForm<UploadAvatarResponse>('/me/avatar', form, onProgress);
  },
};
