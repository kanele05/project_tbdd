import { useCallback, useState } from 'react';

/**
 * State around one `TurnstileWidget`: the current token plus a key that restarts the challenge.
 * A token can be used only once, so call `reset()` after EVERY request that carried it (success or
 * failure) to get a fresh challenge for the next attempt.
 */
export function useCaptcha() {
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const onToken = useCallback((value: string) => setToken(value), []);
  const onExpire = useCallback(() => setToken(null), []);
  const onError = useCallback(() => setToken(null), []);
  const reset = useCallback(() => {
    setToken(null);
    setResetKey((value) => value + 1);
  }, []);

  return { token, resetKey, onToken, onExpire, onError, reset };
}
