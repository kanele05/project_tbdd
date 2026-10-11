// Service quản trị: gom các service con để controller import một chỗ (chỉ service được dùng Prisma).
export { getAdminCourseDetail } from './adminCourseDetail.service';
export {
  approveCourse,
  archiveCourse,
  rejectCourse,
  restoreCourse,
} from './adminModeration.service';
export { listAdminCourses } from './adminQueue.service';
export { getAdminStats } from './adminStats.service';
export { disableAdminUser, enableAdminUser, listAdminUsers } from './adminUser.service';
