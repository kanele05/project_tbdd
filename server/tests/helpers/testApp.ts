import request from 'supertest';

import { createApp } from '@/app';

/** Supertest agent gắn vào app thật (không listen cổng): `const api = createTestApi(); await api.get('/api/v1/health')`. */
export function createTestApi() {
  return request(createApp());
}

export type TestApi = ReturnType<typeof createTestApi>;

export const API = '/api/v1';
