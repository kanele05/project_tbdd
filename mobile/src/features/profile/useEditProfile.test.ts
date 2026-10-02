import type { UserDto } from '@/types/api';

import {
  AVATAR_SIZE_MESSAGE,
  AVATAR_TYPE_MESSAGE,
  editProfileSchema,
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
      AVATAR_TYPE_MESSAGE,
    );
    expect(validateAvatarImage({ uri: 'file:///photo.heic' })).toBe(AVATAR_TYPE_MESSAGE);
  });

  it('rejects files over 5 MB', () => {
    expect(
      validateAvatarImage({
        uri: 'file:///a.png',
        mimeType: 'image/png',
        fileSize: 5 * 1024 * 1024 + 1,
      }),
    ).toBe(AVATAR_SIZE_MESSAGE);
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
