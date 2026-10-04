import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { AppError } from '@/lib/appError';
import { queryKeys } from '@/lib/queryKeys';

import { AI_CHAT_MAX_LENGTH } from './chatConfig';
import { streamAiChat, type StreamAiChatInput } from './chatStream';
import { useAiTutorChat } from './useAiTutorChat';

jest.mock('./chatStream', () => ({
  ...jest.requireActual('./chatStream'),
  streamAiChat: jest.fn(),
}));

const streamMock = streamAiChat as jest.MockedFunction<typeof streamAiChat>;

type Deferred = {
  input: StreamAiChatInput;
  resolve: (messageId: string) => void;
  reject: (error: unknown) => void;
};

/** Each `streamAiChat` call becomes a controllable stream: the test pushes text and ends it. */
function controlStream(): { calls: Deferred[] } {
  const calls: Deferred[] = [];
  streamMock.mockImplementation(
    (input) =>
      new Promise((resolve, reject) => {
        calls.push({
          input,
          resolve: (messageId) => resolve({ messageId }),
          reject,
        });
      }),
  );
  return { calls };
}

async function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = await renderHook(() => useAiTutorChat('course-1'), { wrapper });
  return { ...hook, invalidate };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useAiTutorChat', () => {
  it('starts idle with no turn', async () => {
    const { result } = await setup();
    expect(result.current).toMatchObject({ turn: null, isStreaming: false, cooldownSec: 0 });
  });

  it('shows the question at once and grows the answer while the stream arrives', async () => {
    const { calls } = controlStream();
    const { result } = await setup();

    let sent: Promise<boolean> | undefined;
    await act(async () => {
      sent = result.current.send('  What is a hook?  ');
    });

    expect(result.current.turn).toMatchObject({
      question: 'What is a hook?',
      answer: '',
      status: 'streaming',
    });
    expect(result.current.isStreaming).toBe(true);
    expect(streamMock).toHaveBeenCalledWith(
      expect.objectContaining({ courseId: 'course-1', message: 'What is a hook?' }),
    );

    await act(async () => {
      calls[0]?.input.onDelta('A hook ');
      calls[0]?.input.onDelta('is a function.');
    });
    await waitFor(() => expect(result.current.turn?.answer).toBe('A hook is a function.'));
    expect(result.current.turn?.status).toBe('streaming');

    await act(async () => {
      calls[0]?.resolve('msg_1');
      await sent;
    });
    expect(result.current.turn).toMatchObject({
      answer: 'A hook is a function.',
      status: 'done',
      messageId: 'msg_1',
    });
    expect(result.current.isStreaming).toBe(false);
  });

  it('refreshes the saved history when the answer is complete', async () => {
    const { calls } = controlStream();
    const { result, invalidate } = await setup();

    await act(async () => {
      const sent = result.current.send('Hi');
      calls[0]?.resolve('msg_1');
      await sent;
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.aiChat('course-1') });
  });

  it('refuses a second question while one is streaming', async () => {
    const { calls } = controlStream();
    const { result } = await setup();

    await act(async () => {
      void result.current.send('first');
    });
    let accepted = true;
    await act(async () => {
      accepted = await result.current.send('second');
    });

    expect(accepted).toBe(false);
    expect(streamMock).toHaveBeenCalledTimes(1);
    expect(result.current.turn?.question).toBe('first');
    expect(calls).toHaveLength(1);
  });

  it('ignores empty questions and questions over the limit', async () => {
    controlStream();
    const { result } = await setup();

    await act(async () => {
      expect(await result.current.send('   ')).toBe(false);
      expect(await result.current.send('x'.repeat(AI_CHAT_MAX_LENGTH + 1))).toBe(false);
    });

    expect(streamMock).not.toHaveBeenCalled();
    expect(result.current.turn).toBeNull();
  });

  it('shows a failure before the first word as an error with no answer, and can resend', async () => {
    const { calls } = controlStream();
    const { result } = await setup();

    await act(async () => {
      void result.current.send('Why?');
    });
    await act(async () => {
      calls[0]?.reject(new AppError({ status: 503, code: 'AI_UNAVAILABLE', message: 'down' }));
    });

    expect(result.current.turn).toMatchObject({ question: 'Why?', answer: '', status: 'error' });
    expect(result.current.turn?.error?.isTemporary).toBe(true);
    expect(result.current.turn?.error?.message).toMatch(/AI assistant/i);

    await act(async () => {
      result.current.retry();
    });
    expect(streamMock).toHaveBeenCalledTimes(2);
    expect(streamMock).toHaveBeenLastCalledWith(expect.objectContaining({ message: 'Why?' }));
    expect(result.current.turn?.status).toBe('streaming');
  });

  it('keeps the received text when an error arrives mid-stream', async () => {
    const { calls } = controlStream();
    const { result } = await setup();

    await act(async () => {
      void result.current.send('Explain');
    });
    await act(async () => {
      calls[0]?.input.onDelta('Partial answer');
      calls[0]?.reject(new AppError({ status: 200, code: 'AI_UNAVAILABLE', message: 'x' }));
    });

    expect(result.current.turn).toMatchObject({ answer: 'Partial answer', status: 'error' });
  });

  it('says the answer was cut off when the connection drops', async () => {
    const { calls } = controlStream();
    const { result } = await setup();

    await act(async () => {
      void result.current.send('Explain');
    });
    await act(async () => {
      calls[0]?.reject(new AppError({ status: 0, code: 'AI_STREAM_INTERRUPTED', message: '' }));
    });

    expect(result.current.turn?.error?.message).toMatch(/cut off/i);
  });

  it('starts a countdown from retryAfterSec on a rate limit', async () => {
    jest.useFakeTimers();
    try {
      const { calls } = controlStream();
      const { result } = await setup();

      await act(async () => {
        void result.current.send('Hi');
      });
      await act(async () => {
        calls[0]?.reject(
          new AppError({
            status: 429,
            code: 'AI_RATE_LIMITED',
            message: 'slow',
            details: { retryAfterSec: 3 },
          }),
        );
      });
      expect(result.current.cooldownSec).toBe(3);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.cooldownSec).toBe(2);
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.cooldownSec).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('aborts the request when the screen goes away and shows no error for it', async () => {
    const { calls } = controlStream();
    const { result, unmount } = await setup();

    await act(async () => {
      void result.current.send('Hi');
    });
    const signal = calls[0]?.input.signal;
    expect(signal?.aborted).toBe(false);

    await unmount();

    expect(signal?.aborted).toBe(true);
  });

  it('treats a CANCELED rejection as nothing to report', async () => {
    const { calls } = controlStream();
    const { result } = await setup();

    await act(async () => {
      void result.current.send('Hi');
    });
    await act(async () => {
      calls[0]?.reject(new AppError({ status: 0, code: 'CANCELED', message: '' }));
    });

    expect(result.current.turn?.status).toBe('streaming');
    expect(result.current.turn?.error).toBeNull();
  });

  it('reset forgets the turn and aborts a running stream', async () => {
    const { calls } = controlStream();
    const { result } = await setup();

    await act(async () => {
      void result.current.send('Hi');
    });
    const signal = calls[0]?.input.signal;
    await act(async () => {
      result.current.reset();
    });

    expect(result.current.turn).toBeNull();
    expect(signal?.aborted).toBe(true);
  });
});
