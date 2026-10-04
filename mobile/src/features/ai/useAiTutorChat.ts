import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { queryKeys } from '@/lib/queryKeys';

import { describeAiError, type AiErrorInfo } from './aiErrors';
import { AI_CHAT_MAX_LENGTH } from './chatConfig';
import { streamAiChat } from './chatStream';

/** Streamed text is painted at most this often, so a fast model does not re-render per token. */
const FLUSH_INTERVAL_MS = 40;

export type TutorTurn = {
  question: string;
  /** The text received so far (the whole answer once `status` is `done`). */
  answer: string;
  /**
   * `streaming` the answer is being written; `done` it is complete and saved on the server (it
   * will appear in the history); `error` the request failed or was cut off - nothing was saved,
   * `answer` is whatever arrived before the failure.
   */
  status: 'streaming' | 'done' | 'error';
  /** Id of the saved assistant message (set with `done`); lets the screen hide this turn once the history has it. */
  messageId: string | null;
  error: AiErrorInfo | null;
};

/**
 * One AI Tutor exchange at a time. `send` posts the question and fills `turn.answer` while the
 * stream arrives; when it ends the chat history is invalidated so the saved messages replace the
 * local turn. Leaving the screen aborts the request. A 429 starts a countdown (`cooldownSec`)
 * taken from `details.retryAfterSec`.
 */
export function useAiTutorChat(courseId: string) {
  const queryClient = useQueryClient();
  const [turn, setTurn] = useState<TutorTurn | null>(null);
  const [cooldownSec, setCooldownSec] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const pendingTextRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const text = pendingTextRef.current;
    if (!text) return;
    pendingTextRef.current = '';
    setTurn((current) =>
      current?.status === 'streaming' ? { ...current, answer: current.answer + text } : current,
    );
  }, []);

  const send = useCallback(
    async (rawMessage: string): Promise<boolean> => {
      const message = rawMessage.trim();
      if (!message || message.length > AI_CHAT_MAX_LENGTH || abortRef.current) return false;
      const controller = new AbortController();
      abortRef.current = controller;
      pendingTextRef.current = '';
      setTurn({ question: message, answer: '', status: 'streaming', messageId: null, error: null });
      try {
        const { messageId } = await streamAiChat({
          courseId,
          message,
          signal: controller.signal,
          onDelta: (text) => {
            pendingTextRef.current += text;
            timerRef.current ??= setTimeout(flush, FLUSH_INTERVAL_MS);
          },
        });
        flush();
        setTurn((current) => (current ? { ...current, status: 'done', messageId } : current));
        void queryClient.invalidateQueries({ queryKey: queryKeys.aiChat(courseId) });
        return true;
      } catch (error) {
        flush();
        const info = describeAiError(error);
        if (info.isCanceled) return false;
        setTurn((current) => (current ? { ...current, status: 'error', error: info } : current));
        if (info.retryAfterSec) setCooldownSec(info.retryAfterSec);
        return false;
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [courseId, flush, queryClient],
  );

  const retry = useCallback(() => {
    if (turn?.status === 'error') void send(turn.question);
  }, [send, turn]);

  /** Forget the local turn (after the history was cleared) and stop anything still streaming. */
  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    pendingTextRef.current = '';
    setTurn(null);
  }, []);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const id = setTimeout(() => setCooldownSec((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(id);
  }, [cooldownSec]);

  // Leaving the screen aborts the request: the server stops writing and the socket is released.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return { turn, isStreaming: turn?.status === 'streaming', cooldownSec, send, retry, reset };
}
