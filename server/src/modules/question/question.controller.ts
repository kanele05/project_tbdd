import type { Request, Response } from 'express';

import { created, ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';

import type {
  CourseIdParams,
  CreateAnswerBody,
  CreateQuestionBody,
  ListQuery,
  QuestionIdParams,
} from './question.schema';
import * as questionService from './question.service';

export async function listQuestions(req: Request, res: Response): Promise<void> {
  const { id } = req.params as CourseIdParams;
  const { items, meta } = await questionService.listQuestions(
    getAuthUser(req).id,
    id,
    req.query as unknown as ListQuery,
  );
  ok(res, items, meta);
}

export async function createQuestion(req: Request, res: Response): Promise<void> {
  const { id } = req.params as CourseIdParams;
  const { content } = req.body as CreateQuestionBody;
  created(res, await questionService.createQuestion(getAuthUser(req).id, id, content));
}

export async function getQuestion(req: Request, res: Response): Promise<void> {
  const { id } = req.params as QuestionIdParams;
  ok(res, await questionService.getQuestion(getAuthUser(req).id, id));
}

export async function listAnswers(req: Request, res: Response): Promise<void> {
  const { id } = req.params as QuestionIdParams;
  const { items, meta } = await questionService.listAnswers(
    getAuthUser(req).id,
    id,
    req.query as unknown as ListQuery,
  );
  ok(res, items, meta);
}

export async function createAnswer(req: Request, res: Response): Promise<void> {
  const { id } = req.params as QuestionIdParams;
  const { content } = req.body as CreateAnswerBody;
  created(res, await questionService.createAnswer(getAuthUser(req).id, id, content));
}

export async function like(req: Request, res: Response): Promise<void> {
  const { id } = req.params as QuestionIdParams;
  ok(res, await questionService.likeQuestion(getAuthUser(req).id, id));
}

export async function unlike(req: Request, res: Response): Promise<void> {
  const { id } = req.params as QuestionIdParams;
  ok(res, await questionService.unlikeQuestion(getAuthUser(req).id, id));
}
