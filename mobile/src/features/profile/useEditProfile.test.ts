import { applyLanguage } from '@/i18n';
import type { UserDto } from '@/types/api';

import {
  editProfileSchema,
  getAvatarSizeMessage,
  getAvatarTypeMessage,
  getProfileChanges,
  mergeUpdatedUser,
  toAvatarFile,
  validateAvatarImage,
} from './useEditProfile';

jest.mock('expo-router', () => ({ router: {} }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('@/stores/authStore', () => ({ useAuthStore: jest.fn() }));

const USER: UserDto = {
  id: 'u1',
  email: 'rosie@example.com',
  fullName: 'Rosie Smith',
  headline: 'Designer',
  avatarUrl: null,
  coverUrl: null,
  role: 'STUDENT',
};

describe('validateAvatarImage', () => {
  it('accepts png and jpg within 5 MB', () => {
    expect(
      validateAvatarImage({ uri: 'file:///a.png', mimeType: 'image/png', fileSize: 100 }),
    ).toBeNull();
    expect(validateAvatarImage({ uri: 'file:///a.jpg', mimeType: 'image/jpeg' })).toBeNull();
    expect(validateAvatarImage({ uri: 'file:///a.JPEG' })).toBeNull();
  });

  it('rejects other image types, by MIME type or by extension', () => {
    expect(validateAvatarImage({ uri: 'file:///a.gif', mimeType: 'image/gif' })).toBe(
      getAvatarTypeMessage(),
    );
    expect(validateAvatarImage({ uri: 'file:///photo.heic' })).toBe(getAvatarTypeMessage());
  });

  it('rejects files over 5 MB', () => {
    expect(
      validateAvatarImage({
        uri: 'file:///a.png',
        mimeType: 'image/png',
        fileSize: 5 * 1024 * 1024 + 1,
      }),
    ).toBe(getAvatarSizeMessage());
  });

  it('lets the server decide when nothing is known about the file', () => {
    expect(validateAvatarImage({ uri: 'content://media/42' })).toBeNull();
  });
});

describe('toAvatarFile', () => {
  it('normalizes image/jpg and keeps the file name', () => {
    expect(toAvatarFile({ uri: 'file:///x', fileName: 'me.jpg', mimeType: 'image/jpg' })).toEqual({
      uri: 'file:///x',
      name: 'me.jpg',
      type: 'image/jpeg',
    });
  });

  it('invents a name with the right extension when there is none', () => {
    expect(toAvatarFile({ uri: 'content://media/42', mimeType: 'image/png' })).toEqual({
      uri: 'content://media/42',
      name: 'avatar.png',
      type: 'image/png',
    });
  });
});

describe('editProfileSchema', () => {
  it('requires a full name of at least 2 characters and trims input', () => {
    expect(editProfileSchema.safeParse({ fullName: ' A ', headline: '' }).success).toBe(false);
    const parsed = editProfileSchema.safeParse({ fullName: '  Rosie  ', headline: ' UX ' });
    expect(parsed.success && parsed.data).toEqual({ fullName: 'Rosie', headline: 'UX' });
  });

  it('limits the headline to 80 characters', () => {
    expect(
      editProfileSchema.safeParse({ fullName: 'Rosie', headline: 'x'.repeat(81) }).success,
    ).toBe(false);
  });

  it('reports validation errors in the active language', async () => {
    const messageOf = () => {
      const result = editProfileSchema.safeParse({ fullName: 'A', headline: '' });
      return result.success ? null : result.error.issues[0]?.message;
    };
    expect(messageOf()).toBe('Full name must be at least 2 characters');
    await applyLanguage('vi');
    expect(messageOf()).toBe('Họ và tên phải có ít nhất 2 ký tự');
  });
});

describe('avatar messages', () => {
  it('follow the active language', async () => {
    expect(getAvatarSizeMessage()).toBe('Image is too large (max 5 MB).');
    await applyLanguage('vi');
    expect(getAvatarSizeMessage()).toBe('Ảnh quá lớn (tối đa 5 MB).');
    expect(getAvatarTypeMessage()).toBe('Vui lòng chọn ảnh PNG hoặc JPG.');
  });
});

describe('getProfileChanges', () => {
  it('returns only the changed fields', () => {
    expect(getProfileChanges(USER, { fullName: 'Rosie Smith', headline: 'Designer' })).toEqual({});
    expect(getProfileChanges(USER, { fullName: 'Rosie S', headline: 'Designer' })).toEqual({
      fullName: 'Rosie S',
    });
    expect(getProfileChanges(USER, { fullName: 'Rosie Smith', headline: '' })).toEqual({
      headline: '',
    });
  });

  it('treats a null headline as empty', () => {
    expect(
      getProfileChanges({ ...USER, headline: null }, { fullName: 'Rosie Smith', headline: '' }),
    ).toEqual({});
  });
});

describe('mergeUpdatedUser', () => {
  it('prefers the user returned by the server', () => {
    const updated = { ...USER, fullName: 'Server Name' };
    expect(mergeUpdatedUser(USER, updated, { fullName: 'x' }).fullName).toBe('Server Name');
  });

  it('falls back to the sent fields when the response is empty', () => {
    expect(mergeUpdatedUser(USER, undefined, { fullName: 'New Name' })).toEqual({
      ...USER,
      fullName: 'New Name',
    });
    expect(mergeUpdatedUser(USER, undefined, { headline: '' }).headline).toBeNull();
  });
});
