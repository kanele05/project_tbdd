/**
 * Suy ngược `key` + `params` từ `type`/`title`/`body` của thông báo CŨ (lưu dạng chữ đã dựng sẵn, chưa có
 * `data.key`) để script backfill gắn khóa dịch cho chúng. Các mẫu câu hiện tại được sinh thẳng từ
 * `NOTIFICATION_MESSAGES` (cả `en` và `vi`, chạy `render` với tham số giữ chỗ) nên không thể lệch với
 * `notificationMessage()`; ngoài ra có vài mẫu CŨ của seed (xem `LEGACY_MATCHERS`). Không khớp -> `null`
 * (dòng đó giữ nguyên, mobile hiển thị chữ đã lưu).
 */
import type { NotificationType } from '@/generated/prisma/client';
import { NOTIFICATION_MESSAGES } from '@/lib/notificationMessage';
import type { NotificationMessageKey, NotificationMessageParams } from '@/types/dto';

export type StoredNotificationText = { type: NotificationType; title: string; body: string };

export type ParsedNotificationMessage = {
  key: NotificationMessageKey;
  params: NotificationMessageParams;
};

/** Tham số kiểu số (còn lại là chuỗi). */
const NUMERIC_PARAMS: ReadonlySet<string> = new Set(['count', 'grade']);
const LANGS = ['en', 'vi'] as const;
/** Ký tự private-use bao quanh tên tham số trong câu mẫu (không bao giờ xuất hiện trong câu thật). */
const MARK = String.fromCharCode(0xe000);
const PLACEHOLDER = new RegExp(`${MARK}([A-Za-z0-9_]+)${MARK}`, 'g');

type Matcher = {
  key: NotificationMessageKey;
  type: NotificationType;
  titles: string[];
  body: RegExp;
  /** Tên tham số theo thứ tự nhóm bắt (capture group) của `body`. */
  names: readonly string[];
};

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Chuyển câu mẫu (có `\0name\0` thay cho tham số) thành regex có nhóm bắt. */
function toBodyRegex(template: string): { body: RegExp; names: string[] } {
  const names: string[] = [];
  let source = '';
  let last = 0;
  for (const match of template.matchAll(PLACEHOLDER)) {
    const name = match[1] ?? '';
    source += escapeRegExp(template.slice(last, match.index));
    source += NUMERIC_PARAMS.has(name) ? '(\\d+)' : '([\\s\\S]+?)';
    names.push(name);
    last = match.index + match[0].length;
  }
  source += escapeRegExp(template.slice(last));
  return { body: new RegExp(`^${source}$`), names };
}

/** Chạy `render` với Proxy trả về `\0name\0` để biết tham số nào xuất hiện ở đâu trong câu. */
function renderTemplate(key: NotificationMessageKey, lang: 'en' | 'vi') {
  const placeholders = new Proxy({}, { get: (_, name) => `${MARK}${String(name)}${MARK}` });
  const def = NOTIFICATION_MESSAGES[key] as {
    type: NotificationType;
    render: (params: never, lang: 'en' | 'vi') => { title: string; body: string };
  };
  return { type: def.type, ...def.render(placeholders as never, lang) };
}

function buildCurrentMatchers(): Matcher[] {
  const bySource = new Map<string, Matcher>();
  for (const key of Object.keys(NOTIFICATION_MESSAGES) as NotificationMessageKey[]) {
    for (const lang of LANGS) {
      const { type, title, body } = renderTemplate(key, lang);
      const { body: regex, names } = toBodyRegex(body);
      const id = `${key}|${regex.source}`;
      const existing = bySource.get(id);
      if (existing) {
        if (!existing.titles.includes(title)) existing.titles.push(title);
      } else {
        bySource.set(id, { key, type, titles: [title], body: regex, names });
      }
    }
  }
  return [...bySource.values()];
}

/** Mẫu cũ còn nằm trong dữ liệu seed (`prisma/seed-data/activity.ts` trước khi có `key`): tên khóa không có ngoặc kép. */
const LEGACY_MATCHERS: Matcher[] = [
  {
    key: 'COURSE_COMPLETED',
    type: 'COURSE_COMPLETED',
    titles: ['Course completed!', 'Course completed'],
    body: /^Congratulations! You completed ([\s\S]+?)\.$/,
    names: ['courseTitle'],
  },
  {
    key: 'NEW_ANSWER',
    type: 'NEW_ANSWER',
    titles: ['New answer to your question'],
    body: /^([\s\S]+?) answered your question in ([\s\S]+?)\.$/,
    names: ['author', 'courseTitle'],
  },
];

/** Mẫu có tham số số (`3 courses`) thử trước để không bị mẫu một-khóa (`(.+?)`) nuốt mất. */
function hasNumericParam(matcher: Matcher): boolean {
  return matcher.names.some((name) => NUMERIC_PARAMS.has(name));
}

let cachedMatchers: Matcher[] | undefined;
function getMatchers(): Matcher[] {
  if (!cachedMatchers) {
    const current = buildCurrentMatchers();
    cachedMatchers = [
      ...current.filter(hasNumericParam),
      ...current.filter((matcher) => !hasNumericParam(matcher)),
      ...LEGACY_MATCHERS,
    ];
  }
  return cachedMatchers;
}

/** `null` nếu không có mẫu nào khớp (loại thông báo lạ, đã bị sửa tay, hoặc câu của phiên bản khác). */
export function parseStoredNotification(
  row: StoredNotificationText,
): ParsedNotificationMessage | null {
  for (const matcher of getMatchers()) {
    if (matcher.type !== row.type || !matcher.titles.includes(row.title)) continue;
    const match = matcher.body.exec(row.body);
    if (!match) continue;
    const params: NotificationMessageParams = {};
    matcher.names.forEach((name, index) => {
      const raw = match[index + 1] ?? '';
      params[name] = NUMERIC_PARAMS.has(name) ? Number(raw) : raw;
    });
    return { key: matcher.key, params };
  }
  return null;
}
