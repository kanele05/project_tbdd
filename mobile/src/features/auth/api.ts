import { api } from '@/lib/apiClient';
import type { AuthResponse, LoginRequest, RegisterRequest, UserDto } from '@/types/api';

/** Shorter timeout for the bootstrap call so a dead server does not hold the splash for long. */
const BOOTSTRAP_TIMEOUT_MS = 8000;

export const authApi = {
  /** `POST /auth/login` - 401 INVALID_CREDENTIALS. */
  login: (body: LoginRequest) => api.post<AuthResponse>('/auth/login', body),

  /** `POST /auth/register` - 409 EMAIL_TAKEN. */
  register: (body: RegisterRequest) => api.post<AuthResponse>('/auth/register', body),

  /** `GET /auth/me`. */
  me: () => api.get<UserDto>('/auth/me'),

  /** `GET /auth/me` used by the bootstrap (SC-01) with a short timeout. */
  meForBootstrap: () => api.get<UserDto>('/auth/me', undefined, { timeout: BOOTSTRAP_TIMEOUT_MS }),
};
