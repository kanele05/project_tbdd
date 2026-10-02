import { api } from '@/lib/apiClient';
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
  uploadAvatar: (file: AvatarFile, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    // React Native's FormData accepts `{ uri, name, type }` in place of a Blob.
    form.append('file', file as unknown as Blob);
    return api.postForm<UploadAvatarResponse>('/me/avatar', form, onProgress);
  },
};
