import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

import { useAuthStore } from '@/stores/authStore';

/**
 * Renders its children for a TEACHER only; anyone else (a student who typed the URL on the web, a
 * signed-out visitor) is sent to the start screen. The API enforces the role too (403), this just
 * avoids showing screens that can only fail.
 */
export function TeacherOnly({ children }: { children: ReactNode }) {
  const role = useAuthStore((state) => state.user?.role);
  if (role !== 'TEACHER') return <Redirect href="/" />;
  return <>{children}</>;
}
