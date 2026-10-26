import { router } from 'expo-router';

import { goBackOr } from './navigation';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() },
}));

const canGoBack = router.canGoBack as jest.Mock;

describe('goBackOr', () => {
  beforeEach(() => jest.clearAllMocks());

  it('goes back when there is history', () => {
    canGoBack.mockReturnValue(true);
    goBackOr('/settings/security');
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('replaces with the fallback when there is no history', () => {
    canGoBack.mockReturnValue(false);
    goBackOr('/settings/security');
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/settings/security');
  });
});
