import { act, renderHook } from '@testing-library/react-native';

import { useCaptcha } from './useCaptcha';

describe('useCaptcha', () => {
  it('keeps the token until it expires', async () => {
    const { result } = await renderHook(() => useCaptcha());
    expect(result.current.token).toBeNull();

    await act(async () => result.current.onToken('tok'));
    expect(result.current.token).toBe('tok');

    await act(async () => result.current.onExpire());
    expect(result.current.token).toBeNull();
  });

  it('reset drops the token and changes the key so the widget starts a new challenge', async () => {
    const { result } = await renderHook(() => useCaptcha());
    await act(async () => result.current.onToken('tok'));
    const keyBefore = result.current.resetKey;

    await act(async () => result.current.reset());

    expect(result.current.token).toBeNull();
    expect(result.current.resetKey).toBe(keyBefore + 1);
  });

  it('drops the current token when the security check reports an error', async () => {
    const { result } = await renderHook(() => useCaptcha());
    await act(async () => result.current.onToken('tok'));

    await act(async () => result.current.onError());

    expect(result.current.token).toBeNull();
  });
});
