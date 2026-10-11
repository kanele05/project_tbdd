import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { PageContainer } from '@/components/layout/PageContainer';
import { TwoColumn, WorkFrame } from '@/components/layout/work';
import { useConfirmLogout } from '@/features/auth/useConfirmLogout';
import { useAuthStore } from '@/stores/authStore';
import { spacing } from '@/theme';

import { AccountCard } from '../components/desktop/AccountCard';
import { ProfileBand } from '../components/desktop/ProfileBand';
import { SavedCoursesGrid } from '../components/desktop/SavedCoursesGrid';
import { useMeStats } from '../hooks';

const ACCOUNT_WIDTH = 340;

function goToMyCourses(status: 'ongoing' | 'completed'): void {
  router.navigate({ pathname: '/my-courses', params: { tab: status } });
}

const editProfile = () => router.push('/profile/edit');
const teacherProfile = () => router.push('/profile/teacher-edit');
const teaching = () => router.navigate('/studio');
const admin = () => router.navigate('/admin');
const notifications = () => router.push('/notifications');
const settings = () => router.push('/settings');

/**
 * SC-20 User profile on a PC window (PLAN §2.5): a full-bleed header band with the avatar, name,
 * headline and the three counters, then two columns - saved courses as a poster grid on the left,
 * the account card (Edit profile, role shortcuts, Notifications, Settings, Log out) on the right.
 */
export function ProfileDesktopScreen() {
  const user = useAuthStore((state) => state.user);
  const confirmLogout = useConfirmLogout();
  const stats = useMeStats();
  const role = user?.role;

  return (
    <WorkFrame testID="profile-screen">
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator>
        <ProfileBand
          user={user}
          stats={stats.data}
          isStatsLoading={stats.isPending}
          onEdit={editProfile}
          onPressOngoing={() => goToMyCourses('ongoing')}
          onPressCompleted={() => goToMyCourses('completed')}
        />
        <PageContainer style={styles.body}>
          <TwoColumn
            testID="profile-columns"
            sideWidth={ACCOUNT_WIDTH}
            main={<SavedCoursesGrid />}
            side={
              <AccountCard
                onEditProfile={editProfile}
                onNotifications={notifications}
                onSettings={settings}
                onTeacherProfile={role === 'TEACHER' ? teacherProfile : undefined}
                onTeaching={role === 'TEACHER' ? teaching : undefined}
                onAdmin={role === 'ADMIN' ? admin : undefined}
                onLogout={() => void confirmLogout()}
              />
            }
          />
        </PageContainer>
      </ScrollView>
    </WorkFrame>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: spacing.huge },
  body: { paddingTop: spacing.xxl },
});
