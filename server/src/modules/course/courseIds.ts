/** Id ổn định của khóa học seed: `crs_<slug với dấu gạch nối đổi thành gạch dưới>`. */
export const courseId = (slug: string): string => `crs_${slug.replace(/-/g, '_')}`;

/** Id hai bài xem thử (bài 01 và 02) của khóa học seed, sinh từ id khóa học. */
export function previewLessonIds(id: string): readonly [string, string] {
  const suffix = id.replace(/^crs_/, '');
  return [`les_${suffix}_01`, `les_${suffix}_02`];
}
