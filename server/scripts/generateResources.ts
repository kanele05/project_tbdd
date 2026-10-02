/**
 * Sinh 2 tài liệu mẫu cho phần Resources của khóa học (seed dùng lại):
 *   static/resources/Document 1.txt   - văn bản thuần
 *   static/resources/Document 2.pdf   - PDF 1 trang tối giản, hợp lệ (viết tay, có bảng xref đúng offset)
 * Chạy: npx tsx scripts/generateResources.ts (file đã được commit nên thường không cần chạy lại).
 */
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve(__dirname, '..', 'static', 'resources');

const TEXT = [
  'E-Learning App - Course Resource (Document 1)',
  '==============================================',
  '',
  'This is a sample resource file attached to a course project.',
  'Use it to practise downloading course materials in the mobile app.',
  '',
  '1. Read the project brief.',
  '2. Complete the tasks step by step.',
  '3. Submit your work from the Projects tab.',
  '',
].join('\n');

function buildPdf(lines: string[]): Buffer {
  const escape = (s: string) => s.replace(/([\\()])/g, '\\$1');
  const content =
    'BT\n/F1 20 Tf\n72 740 Td\n' +
    lines.map((line, i) => `${i === 0 ? '' : '0 -28 Td\n'}(${escape(line)}) Tj\n`).join('') +
    'ET';

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'Document 1.txt'), TEXT, 'utf8');
fs.writeFileSync(
  path.join(outDir, 'Document 2.pdf'),
  buildPdf([
    'E-Learning App - Course Resource (Document 2)',
    'Sample PDF attached to a course project.',
    'Download it from the Projects tab of the Learning screen.',
  ]),
);
console.log(`Đã tạo tài liệu mẫu trong ${outDir}`);
