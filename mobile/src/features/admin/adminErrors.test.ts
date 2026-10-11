import { AppError } from '@/lib/appError';

import { getAdminErrorMessage, isForbiddenError } from './adminErrors';

const error = (status: number, code: string) => new AppError({ status, code, message: 'server' });

describe('adminErrors', () => {
  it('uses the admin wording for admin codes', () => {
    expect(getAdminErrorMessage(error(422, 'CANNOT_DISABLE_ADMIN'))).toMatch(/can't be disabled/);
    expect(getAdminErrorMessage(error(422, 'INVALID_COURSE_STATE'))).toMatch(/state/);
  });

  it('falls back to the shared mapping and then the server message', () => {
    expect(getAdminErrorMessage(error(404, 'COURSE_NOT_FOUND'))).toBe(
      'This course could not be found.',
    );
    expect(getAdminErrorMessage(error(500, 'WEIRD_CODE'))).toBe('server');
  });

  it('recognises a 403', () => {
    expect(isForbiddenError(error(403, 'FORBIDDEN'))).toBe(true);
    expect(isForbiddenError(error(500, 'INTERNAL_ERROR'))).toBe(false);
  });
});
