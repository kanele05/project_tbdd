import { i18n } from '@/i18n';

/**
 * Total learning time for the My Courses header: 22800 -> "6 giờ 20 phút" (vi) / "6 h 20 min" (en),
 * 7200 -> "2 h", 1500 -> "25 min", anything under a minute -> "< 1 phút".
 */
export function formatLearningTime(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, totalSeconds) : 0;
  const totalMinutes = Math.floor(safe / 60);
  if (totalMinutes < 1) return i18n.t('myCourses:learningTime.lessThanMinute');
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return i18n.t('myCourses:learningTime.minutes', { count: minutes });
  const hoursText = i18n.t('myCourses:learningTime.hours', { count: hours });
  if (minutes === 0) return hoursText;
  return `${hoursText} ${i18n.t('myCourses:learningTime.minutes', { count: minutes })}`;
}
