import { onlineManager } from '@tanstack/react-query';
import { fetch } from 'expo/fetch';

import { API_URL } from '@/constants/config';
import { getCurrentLanguage } from '@/i18n';
import { getAccessToken, getRefreshToken, refreshAccessToken } from '@/lib/apiClient';
import { AppError } from '@/lib/appError';
import type { AiChatRequest, AiChatSseEvent, ApiErrorBody } from '@/types/api';

import { createSseParser, createUtf8Decoder, toChatEvent } from './sse';

/** Error codes raised by the client itself (the server never sends them). */
export const AI_STREAM_ERROR = {
  /** The connection closed before a `done` / `error` event. */
  interrupted: 'AI_STREAM_INTERRUPTED',
  /** The caller aborted (screen closed): not an error to show. */
  canceled: 'CANCELED',
} as const;

export type StreamAiChatInput = {
  courseId: string;
  message: string;
  /** Abort to stop reading (the screen unmounts). The promise then rejects with `CANCELED`. */
  signal?: AbortSignal;
  /** Called with every text fragment, in order. */
  onDelta: (text: string) => void;
};

export type StreamAiChatResult = { messageId: string };

type StreamResponse = Awaited<ReturnType<typeof fetch>>;

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const inner = (value as { error: unknown }).error;
  return (
    typeof inner === 'object' &&
    inner !== null &&
    typeof (inner as { code?: unknown }).code === 'string'
  );
}

/** A non-2xx answer is the usual `{ error: { code, message, details } }` JSON (before any text). */
async function toHttpError(response: StreamResponse): Promise<AppError> {
  let body: unknown = null;
  try {
    body = JSON.parse(await response.text());
  } catch {
    // Not JSON (a proxy error page): fall through to the generic error.
  }
  if (isApiErrorBody(body)) {
    const { code, message, details } = body.error;
    return new AppError({ status: response.status, code, message: message ?? '', details });
  }
  return new AppError({ status: response.status, code: `HTTP_${response.status}`, message: '' });
}

function canceledError(): AppError {
  return new AppError({ status: 0, code: AI_STREAM_ERROR.canceled, message: 'Request canceled' });
}

function interruptedError(): AppError {
  return new AppError({ status: 0, code: AI_STREAM_ERROR.interrupted, message: '' });
}

/**
 * Feeds decoded text to the SSE parser and applies the typed events in order: `delta` goes to
 * `onDelta`, `error` throws (status 200: the HTTP exchange itself succeeded) and `done` ends the
 * stream with the id of the saved message.
 */
function createEventSink(onDelta: (text: string) => void) {
  const parser = createSseParser();

  const apply = (messages: ReturnType<typeof parser.push>): StreamAiChatResult | null => {
    for (const message of messages) {
      const event: AiChatSseEvent | null = toChatEvent(message);
      if (!event) continue;
      if (event.event === 'delta') onDelta(event.data.text);
      else if (event.event === 'error') {
        throw new AppError({ status: 200, code: event.data.code, message: event.data.message });
      } else return { messageId: event.data.messageId };
    }
    return null;
  };

  return {
    push: (text: string) => apply(parser.push(text)),
    flush: () => apply(parser.flush()),
  };
}

async function readStream(
  body: NonNullable<StreamResponse['body']>,
  sink: ReturnType<typeof createEventSink>,
): Promise<StreamAiChatResult | null> {
  const reader = body.getReader();
  const decoder = createUtf8Decoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const result = sink.push(decoder.decode(value));
      if (result) return result;
    }
    return sink.push(decoder.decode()) ?? sink.flush();
  } finally {
    // Stops the download when `done` arrived early or on error; harmless once the stream ended.
    void Promise.resolve(reader.cancel()).catch(() => undefined);
  }
}

/**
 * `POST /courses/:id/ai/chat` (PLAN §9.2): sends the question and reads the answer as it is
 * written. Resolves with the saved message id once the `done` event arrives; rejects with an
 * `AppError` when
 * - the request fails before the first byte (offline, 401/403/429/503... - the JSON error);
 * - an `error` event arrives mid-stream (the text already passed to `onDelta` is the partial answer);
 * - the connection drops before `done` (`AI_STREAM_INTERRUPTED`);
 * - `signal` aborts (`CANCELED`).
 *
 * `fetch` comes from `expo/fetch`: on native it exposes the response body as a stream (React
 * Native's own fetch buffers it); on web it is the browser `fetch`. Auth and language headers are
 * the same as the axios client sends.
 */
export async function streamAiChat(input: StreamAiChatInput): Promise<StreamAiChatResult> {
  const { courseId, message, signal, onDelta } = input;
  if (!onlineManager.isOnline()) {
    throw new AppError({ status: 0, code: 'OFFLINE', message: '' });
  }
  const language = getCurrentLanguage();
  const url = `${API_URL}/courses/${courseId}/ai/chat?lang=${language}`;
  const payload = JSON.stringify({ message } satisfies AiChatRequest);

  const send = async (token: string | null): Promise<StreamResponse> => {
    try {
      return await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          'Accept-Language': language,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: payload,
        signal,
      });
    } catch (error) {
      if (signal?.aborted) throw canceledError();
      throw new AppError({
        status: 0,
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : '',
      });
    }
  };

  let response = await send(getAccessToken());
  // Axios renews an expired access token by itself; this request bypasses axios, so do it here
  // once. A refused refresh token ends the session (the auth store logs the user out) and throws.
  if (response.status === 401 && getRefreshToken()) {
    await response.text().catch(() => '');
    response = await send(await refreshAccessToken());
  }
  if (!response.ok) throw await toHttpError(response);

  const sink = createEventSink(onDelta);
  let result: StreamAiChatResult | null;
  try {
    // No streaming body on this platform: parse the whole answer at once (no live typing).
    result = response.body
      ? await readStream(response.body, sink)
      : (sink.push(await response.text()) ?? sink.flush());
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw signal?.aborted ? canceledError() : interruptedError();
  }
  if (!result) throw signal?.aborted ? canceledError() : interruptedError();
  return result;
}
