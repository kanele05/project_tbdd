import type { Request } from 'express';

import { resolveLang } from '@/lib/lang';
import type { ClientContext } from '@/types/auth';

/**
 * Thông tin client của request: IP (đúng sau reverse proxy nhờ `trust proxy`), User-Agent và ngôn ngữ
 * (`lang` trong body > `Accept-Language` > `en`).
 */
export function getClientContext(req: Request, preferredLang?: string): ClientContext {
  return {
    ip: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
    lang: resolveLang(preferredLang, req.get('accept-language')),
  };
}
