import fs from 'node:fs';
import path from 'node:path';

const MOBILE_API = path.resolve(__dirname, '..', '..', '..', 'mobile', 'src', 'types', 'api.ts');
const SERVER_DTO = path.resolve(__dirname, 'teacherAdminDto.ts');

/** Lấy khối giữa hai dòng đánh dấu, bỏ khoảng trắng thừa để Prettier của hai package không gây lệch giả. */
function extractBlock(source: string): string {
  const match = /\/\/ BEGIN TEACHER-ADMIN DTOs.*?\/\/ END TEACHER-ADMIN DTOs/s.exec(source);
  if (!match) throw new Error('Missing BEGIN/END TEACHER-ADMIN DTOs markers');
  return match[0].replace(/\s+/g, ' ').trim();
}

const hasMobile = fs.existsSync(MOBILE_API);

describe('teacher/admin DTO contract', () => {
  (hasMobile ? it : it.skip)(
    'server/src/types/teacherAdminDto.ts is a verbatim copy of the block in mobile/src/types/api.ts',
    () => {
      const mobile = extractBlock(fs.readFileSync(MOBILE_API, 'utf8'));
      const server = extractBlock(fs.readFileSync(SERVER_DTO, 'utf8'));
      expect(server).toBe(mobile);
    },
  );
});
