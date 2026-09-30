import { useMutation } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/authStore';
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/types/api';

import { authApi } from './api';

/** `POST /auth/login`, then store the session (token in SecureStore + user in the auth store). */
export function useLogin() {
  const login = useAuthStore((state) => state.login);
  return useMutation<AuthResponse, Error, LoginRequest>({
    mutationFn: authApi.login,
    onSuccess: ({ token, user }) => login(token, user),
  });
}

/** `POST /auth/register` - registering logs the user in right away (PLAN.md SC-03). */
export function useRegister() {
  const login = useAuthStore((state) => state.login);
  return useMutation<AuthResponse, Error, RegisterRequest>({
    mutationFn: authApi.register,
    onSuccess: ({ token, user }) => login(token, user),
  });
}
