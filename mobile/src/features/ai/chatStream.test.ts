import { onlineManager } from '@tanstack/react-query';
import { fetch as mockFetch } from 'expo/fetch';

import { refreshAccessToken, setAuthTokens } from '@/lib/apiClient';
import { AppError } from '@/lib/appError';

import { AI_STREAM_ERROR, streamAiChat } from './chatStream';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('@/lib/apiClient', () => ({
  ...jest.requireActual('@/lib/apiClient'),
  refreshAccessToken: jest.fn(),
}));

const fetchMock = mockFetch as jest.MockedFunction<typeof mockFetch>;
const refreshMock = refreshAccessToken as jest.MockedFunction<typeof refreshAccessToken>;
const encoder = new TextEncoder();

const delta = (text: string) => `event: delta\ndata: ${JSON.stringify({ text })}\n\n`;
const done = (messageId = 'msg_1') => `event: done\ndata: ${JSON.stringify({ messageId })}\n\n`;
const errorEvent = (code: string) =>
  `event: error\ndata: ${JSON.stringify({ code, message: 'boom' })}\n\n`;

type Chunk = string | Uint8Array | Error;

/** A streaming response whose `read()` hands out one chunk per call (an `Error` rejects). */
function streamResponse(chunks: readonly Chunk[], signal?: AbortSignal) {
  const queue = [...chunks];
  const cancel = jest.fn(() => Promise.resolve());
  const response = {
    ok: true,
    status: 200,
    text: jest.fn(() => Promise.resolve('')),
    body: {
      getReader: () => ({
        read: async (): Promise<{ done: boolean; value?: Uint8Array }> => {
          if (signal?.aborted) throw new Error('aborted');
          const next = queue.shift();
          if (next === undefined) return { done: true };
          if (next instanceof Error) throw next;
          return { done: false, value: typeof next === 'string' ? encoder.encode(next) : next };
        },
        cancel,
      }),
    },
  };
  return { response: response as unknown as Awaited<ReturnType<typeof mockFetch>>, cancel };
}

function errorResponse(status: number, body: string) {
  return {
    ok: false,
    status,
    text: jest.fn(() => Promise.resolve(body)),
    body: null,
  } as unknown as Awaited<ReturnType<typeof mockFetch>>;
}

async function catchError(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    return error as AppError;
  }
  throw new Error('expected the stream to reject');
}

beforeEach(() => {
  jest.clearAllMocks();
  setAuthTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
});

afterEach(() => {
  onlineManager.setOnline(true);
  setAuthTokens(null);
});

describe('streamAiChat', () => {
  it('posts the question with the auth + language headers and reads the deltas in order', async () => {
    fetchMock.mockResolvedValue(
      streamResponse([delta('Hel'), delta('lo'), done('msg_9')]).response,
    );
    const onDelta = jest.fn();

    const result = await streamAiChat({ courseId: 'course-1', message: 'Hi', onDelta });

    expect(result).toEqual({ messageId: 'msg_9' });
    expect(onDelta.mock.calls).toEqual([['Hel'], ['lo']]);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toMatch(/\/courses\/course-1\/ai\/chat\?lang=en$/);
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ message: 'Hi' }) });
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer access-1',
      Accept: 'text/event-stream',
      'Accept-Language': 'en',
      'Content-Type': 'application/json',
    });
  });

  it('keeps Vietnamese text intact when a character is split between two chunks', async () => {
    const bytes = encoder.encode(delta('Xin chào Việt Nam') + done());
    const cut = bytes.indexOf(0xe1) + 1; // inside the 3-byte "ệ"
    fetchMock.mockResolvedValue(streamResponse([bytes.slice(0, cut), bytes.slice(cut)]).response);
    const received: string[] = [];

    await streamAiChat({ courseId: 'c', message: 'm', onDelta: (text) => received.push(text) });

    expect(received.join('')).toBe('Xin chào Việt Nam');
  });

  it('handles an event cut in the middle between chunks', async () => {
    const whole = delta('Hello') + done();
    fetchMock.mockResolvedValue(streamResponse([whole.slice(0, 12), whole.slice(12)]).response);
    const onDelta = jest.fn();

    await streamAiChat({ courseId: 'c', message: 'm', onDelta });

    expect(onDelta).toHaveBeenCalledWith('Hello');
  });

  it('stops reading as soon as `done` arrives', async () => {
    const { response, cancel } = streamResponse([done(), delta('late')]);
    fetchMock.mockResolvedValue(response);
    const onDelta = jest.fn();

    await streamAiChat({ courseId: 'c', message: 'm', onDelta });

    expect(onDelta).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalled();
  });

  it('rejects with the JSON error of a request that failed before the first byte', async () => {
    fetchMock.mockResolvedValue(
      errorResponse(
        429,
        JSON.stringify({
          error: { code: 'AI_RATE_LIMITED', message: 'slow down', details: { retryAfterSec: 42 } },
        }),
      ),
    );
    const onDelta = jest.fn();

    const error = await catchError(streamAiChat({ courseId: 'c', message: 'm', onDelta }));

    expect(error).toMatchObject({
      status: 429,
      code: 'AI_RATE_LIMITED',
      details: { retryAfterSec: 42 },
    });
    expect(onDelta).not.toHaveBeenCalled();
  });

  it('maps 403 NOT_ENROLLED and 503 AI_UNAVAILABLE the same way', async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(403, JSON.stringify({ error: { code: 'NOT_ENROLLED', message: 'no' } })),
    );
    expect(
      await catchError(streamAiChat({ courseId: 'c', message: 'm', onDelta: jest.fn() })),
    ).toMatchObject({
      status: 403,
      code: 'NOT_ENROLLED',
    });
    fetchMock.mockResolvedValueOnce(
      errorResponse(503, JSON.stringify({ error: { code: 'AI_UNAVAILABLE', message: 'down' } })),
    );
    expect(
      await catchError(streamAiChat({ courseId: 'c', message: 'm', onDelta: jest.fn() })),
    ).toMatchObject({
      status: 503,
      code: 'AI_UNAVAILABLE',
    });
  });

  it('falls back to a generic HTTP error when the body is not JSON', async () => {
    fetchMock.mockResolvedValue(errorResponse(502, '<html>Bad gateway</html>'));

    const error = await catchError(
      streamAiChat({ courseId: 'c', message: 'm', onDelta: jest.fn() }),
    );

    expect(error).toMatchObject({ status: 502, code: 'HTTP_502' });
  });

  it('keeps the partial text and rejects when an `error` event arrives mid-stream', async () => {
    fetchMock.mockResolvedValue(
      streamResponse([delta('Partial '), delta('answer'), errorEvent('AI_UNAVAILABLE')]).response,
    );
    const received: string[] = [];

    const error = await catchError(
      streamAiChat({ courseId: 'c', message: 'm', onDelta: (text) => received.push(text) }),
    );

    expect(received.join('')).toBe('Partial answer');
    expect(error).toMatchObject({ code: 'AI_UNAVAILABLE', status: 200 });
  });

  it('rejects with AI_STREAM_INTERRUPTED when the connection ends before `done`', async () => {
    fetchMock.mockResolvedValue(streamResponse([delta('Half an ans')]).response);

    const error = await catchError(
      streamAiChat({ courseId: 'c', message: 'm', onDelta: jest.fn() }),
    );

    expect(error.code).toBe(AI_STREAM_ERROR.interrupted);
  });

  it('rejects with AI_STREAM_INTERRUPTED when the socket breaks while reading', async () => {
    fetchMock.mockResolvedValue(streamResponse([delta('Hi'), new Error('socket closed')]).response);

    const error = await catchError(
      streamAiChat({ courseId: 'c', message: 'm', onDelta: jest.fn() }),
    );

    expect(error.code).toBe(AI_STREAM_ERROR.interrupted);
  });

  it('rejects with CANCELED when the caller aborts while reading', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(() =>
      Promise.resolve(streamResponse([delta('a'), delta('b'), done()], controller.signal).response),
    );
    const onDelta = jest.fn(() => controller.abort());

    const error = await catchError(
      streamAiChat({ courseId: 'c', message: 'm', signal: controller.signal, onDelta }),
    );

    expect(error.code).toBe(AI_STREAM_ERROR.canceled);
  });

  it('rejects with CANCELED when fetch itself is aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    fetchMock.mockRejectedValue(new Error('The operation was aborted.'));

    const error = await catchError(
      streamAiChat({ courseId: 'c', message: 'm', signal: controller.signal, onDelta: jest.fn() }),
    );

    expect(error.code).toBe(AI_STREAM_ERROR.canceled);
  });

  it('rejects with NETWORK_ERROR when the request cannot be sent', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    const error = await catchError(
      streamAiChat({ courseId: 'c', message: 'm', onDelta: jest.fn() }),
    );

    expect(error).toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });

  it('does not send anything while offline', async () => {
    onlineManager.setOnline(false);

    const error = await catchError(
      streamAiChat({ courseId: 'c', message: 'm', onDelta: jest.fn() }),
    );

    expect(error.code).toBe('OFFLINE');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reads a response without a streaming body as one piece', async () => {
    const text = delta('All at once') + done('msg_7');
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      body: null,
      text: () => Promise.resolve(text),
    } as unknown as Awaited<ReturnType<typeof mockFetch>>);
    const onDelta = jest.fn();

    const result = await streamAiChat({ courseId: 'c', message: 'm', onDelta });

    expect(result).toEqual({ messageId: 'msg_7' });
    expect(onDelta).toHaveBeenCalledWith('All at once');
  });

  describe('expired access token', () => {
    it('refreshes the session once and sends the question again with the new token', async () => {
      fetchMock
        .mockResolvedValueOnce(
          errorResponse(
            401,
            JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'expired' } }),
          ),
        )
        .mockResolvedValueOnce(streamResponse([delta('ok'), done('msg_2')]).response);
      refreshMock.mockResolvedValue('access-2');

      const result = await streamAiChat({ courseId: 'c', message: 'm', onDelta: jest.fn() });

      expect(result).toEqual({ messageId: 'msg_2' });
      expect(refreshMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({
        Authorization: 'Bearer access-2',
      });
    });

    it('surfaces the refusal when the refresh token is rejected (the auth layer logs out)', async () => {
      fetchMock.mockResolvedValue(
        errorResponse(401, JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'expired' } })),
      );
      refreshMock.mockRejectedValue(
        new AppError({ status: 401, code: 'INVALID_REFRESH_TOKEN', message: '' }),
      );

      const error = await catchError(
        streamAiChat({ courseId: 'c', message: 'm', onDelta: jest.fn() }),
      );

      expect(error.code).toBe('INVALID_REFRESH_TOKEN');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not try to refresh a session that has no refresh token', async () => {
      setAuthTokens({ accessToken: 'legacy', refreshToken: null });
      fetchMock.mockResolvedValue(
        errorResponse(401, JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'x' } })),
      );

      const error = await catchError(
        streamAiChat({ courseId: 'c', message: 'm', onDelta: jest.fn() }),
      );

      expect(error.status).toBe(401);
      expect(refreshMock).not.toHaveBeenCalled();
    });
  });
});
