// Controller của AI soạn khóa / AI kiểm duyệt (chỉ xử lý req/res).
import type { Request, Response } from 'express';

import { ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';

import { resolveLang } from './ai.lang';
import type { IdParams, LangQuery } from './ai.schema';
import type { DraftBody } from './courseAi.schema';
import * as courseAiService from './courseAi.service';

/** `POST /teacher/ai/course-draft` - `lang` trong body, thiếu thì `Accept-Language`, mặc định `en`. */
export async function courseDraft(req: Request, res: Response): Promise<void> {
  const { topic, level, lang } = req.body as DraftBody;
  ok(
    res,
    await courseAiService.createCourseDraft(getAuthUser(req).id, {
      topic,
      level,
      lang: resolveLang(lang, req.headers['accept-language']),
    }),
  );
}

/** `GET /admin/courses/:id/ai-review?lang=` - `?lang=` -> `Accept-Language` -> `en`. */
export async function courseReview(req: Request, res: Response): Promise<void> {
  const { id } = req.params as IdParams;
  const { lang } = req.query as LangQuery;
  ok(
    res,
    await courseAiService.getCourseReview(
      getAuthUser(req).id,
      id,
      resolveLang(lang, req.headers['accept-language']),
    ),
  );
}
