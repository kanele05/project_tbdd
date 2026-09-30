import { Redirect } from 'expo-router';

import { selectIsLoggedIn, useAuthStore } from '@/stores/authStore';

/** Entry route: send the user to the tabs or to Login depending on the session (SC-01). */
export default function Index() {
  const isLoggedIn = useAuthStore(selectIsLoggedIn);
  return <Redirect href={isLoggedIn ? '/(tabs)' : '/login'} />;
}
