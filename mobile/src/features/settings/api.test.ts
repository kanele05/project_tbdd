import { api } from '@/lib/apiClient';

import { securityApi } from './api';

jest.mock('@/lib/apiClient', () => ({
  api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

const mocked = api as jest.Mocked<typeof api>;

describe('securityApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads the overview and the sessions', async () => {
    await securityApi.overview();
    await securityApi.sessions();
    expect(mocked.get).toHaveBeenNthCalledWith(1, '/me/security');
    expect(mocked.get).toHaveBeenNthCalledWith(2, '/me/sessions');
  });

  it('changes the password', async () => {
    const body = { currentPassword: 'abc12345', newPassword: 'abc123456' };
    await securityApi.changePassword(body);
    expect(mocked.post).toHaveBeenCalledWith('/me/password', body);
  });

  it('signs devices out (one, or all the others)', async () => {
    await securityApi.revokeSession('s 1');
    await securityApi.revokeOtherSessions();
    expect(mocked.delete).toHaveBeenNthCalledWith(1, '/me/sessions/s%201');
    expect(mocked.delete).toHaveBeenNthCalledWith(2, '/me/sessions');
  });

  it('drives the two-step verification endpoints', async () => {
    await securityApi.setupTwoFactor();
    await securityApi.enableTwoFactor({ code: '123456' });
    await securityApi.disableTwoFactor({ password: 'abc12345', code: '123456' });
    await securityApi.regenerateRecoveryCodes({ recoveryCode: 'ABCDE-FGHJK' });
    expect(mocked.post.mock.calls).toEqual([
      ['/me/2fa/setup'],
      ['/me/2fa/enable', { code: '123456' }],
      ['/me/2fa/disable', { password: 'abc12345', code: '123456' }],
      ['/me/2fa/recovery-codes', { recoveryCode: 'ABCDE-FGHJK' }],
    ]);
  });
});
