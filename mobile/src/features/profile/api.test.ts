import { PAGE_SIZE } from '@/constants/config';
import { api } from '@/lib/apiClient';

import { profileApi } from './api';
import { editProfileApi } from './editProfileApi';

jest.mock('@/lib/apiClient', () => ({
  api: {
    get: jest.fn(),
    getPage: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    postForm: jest.fn(),
  },
}));

const mocked = api as jest.Mocked<typeof api>;

describe('profileApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads stats and one page of bookmarks', async () => {
    await profileApi.stats();
    await profileApi.bookmarks(3);
    expect(mocked.get).toHaveBeenCalledWith('/me/stats');
    expect(mocked.getPage).toHaveBeenCalledWith('/me/bookmarks', { page: 3, limit: PAGE_SIZE });
  });
});

describe('editProfileApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('patches the profile fields', async () => {
    await editProfileApi.updateProfile({ fullName: 'Jane' });
    expect(mocked.patch).toHaveBeenCalledWith('/me', { fullName: 'Jane' });
  });

  it('uploads the avatar as multipart "file" and forwards the progress callback', async () => {
    const onProgress = jest.fn();
    const file = { uri: 'file:///a.png', name: 'a.png', type: 'image/png' };
    await editProfileApi.uploadAvatar(file, onProgress);

    const [url, form, callback] = mocked.postForm.mock.calls[0] ?? [];
    expect(url).toBe('/me/avatar');
    expect(form).toBeInstanceOf(FormData);
    expect(callback).toBe(onProgress);
  });
});
