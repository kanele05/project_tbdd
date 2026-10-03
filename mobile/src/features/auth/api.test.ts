import { api } from '@/lib/apiClient';

import { authApi } from './api';

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

describe('authApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('logs in and registers with POST', async () => {
    const login = { email: 'a@b.co', password: 'secret123' };
    const register = { ...login, fullName: 'Jane' };
    await authApi.login(login);
    await authApi.register(register);
    expect(mocked.post).toHaveBeenNthCalledWith(1, '/auth/login', login);
    expect(mocked.post).toHaveBeenNthCalledWith(2, '/auth/register', register);
  });

  it('uses a shorter timeout for the bootstrap call than the default', async () => {
    await authApi.me();
    await authApi.meForBootstrap();
    expect(mocked.get).toHaveBeenNthCalledWith(1, '/auth/me');
    expect(mocked.get).toHaveBeenNthCalledWith(2, '/auth/me', undefined, { timeout: 8000 });
  });
});
