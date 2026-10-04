import type { AiChatSseEvent } from '@/types/api';

/**
 * Pure Server-Sent Events parsing for the AI Tutor stream (PLAN §9.3 "AiChatSseEvent").
 * `EventSource` cannot send a POST body or an Authorization header, so the app reads the response
 * body of a streaming `fetch` and feeds the decoded text here. Nothing in this file touches the
 * network, so it is easy to test with chunks cut at awkward places.
 */

/** One raw SSE message: the `event:` name (default `message`) and the joined `data:` lines. */
export type SseMessage = { event: string; data: string };

export type SseParser = {
  /** Feed the next decoded chunk; returns the messages that were completed by it. */
  push: (chunk: string) => SseMessage[];
  /** Stream ended: returns a last message that was not closed by a blank line (if any). */
  flush: () => SseMessage[];
};

/** Parse one block of lines (no blank line inside) into a message, or `null` when it has no data. */
function parseBlock(block: string): SseMessage | null {
  let event = 'message';
  const data: string[] = [];
  for (const line of block.split('\n')) {
    // A line starting with ":" is a comment (servers use it as a keep-alive ping).
    if (line === '' || line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
    // `id:` and `retry:` are irrelevant here.
  }
  return data.length > 0 ? { event, data: data.join('\n') } : null;
}

/**
 * Incremental SSE parser. It copes with:
 * - events split across any number of chunks (even in the middle of a word or of `\r\n`);
 * - `\n`, `\r\n` and `\r` line endings, multi-line `data:`, comments and unknown fields.
 * Chunks must already be decoded text; use `createUtf8Decoder` for the raw bytes so a multi-byte
 * character cut between two chunks is not corrupted.
 */
export function createSseParser(): SseParser {
  let buffer = '';
  // A chunk may end with "\r" that is the first half of "\r\n": hold it until the next chunk.
  let heldCr = false;

  const drain = (): SseMessage[] => {
    const messages: SseMessage[] = [];
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const message = parseBlock(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      if (message) messages.push(message);
      boundary = buffer.indexOf('\n\n');
    }
    return messages;
  };

  return {
    push(chunk) {
      let text = (heldCr ? '\r' : '') + chunk;
      heldCr = text.endsWith('\r');
      if (heldCr) text = text.slice(0, -1);
      buffer += text.replace(/\r\n|\r/g, '\n');
      return drain();
    },
    flush() {
      const rest = buffer + (heldCr ? '\n' : '');
      buffer = '';
      heldCr = false;
      const message = parseBlock(rest);
      return message ? [message] : [];
    },
  };
}

type Utf8Decoder = { decode: (bytes?: Uint8Array) => string };

/**
 * Streaming UTF-8 decoder: a character whose bytes arrive in two chunks (Vietnamese letters take 2
 * to 3 bytes) is held back until complete instead of becoming "�". Call `decode()` without
 * arguments at the end of the stream to flush.
 */
export function createUtf8Decoder(): Utf8Decoder {
  const decoder = new TextDecoder('utf-8');
  return {
    decode: (bytes) => (bytes ? decoder.decode(bytes, { stream: true }) : decoder.decode()),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Turn a raw message into a typed `AiChatSseEvent`, or `null` for an unknown event name / malformed
 * JSON / a payload of the wrong shape (the stream keeps going; one bad event never breaks it).
 */
export function toChatEvent(message: SseMessage): AiChatSseEvent | null {
  let payload: unknown;
  try {
    payload = JSON.parse(message.data);
  } catch {
    return null;
  }
  if (!isRecord(payload)) return null;

  switch (message.event) {
    case 'delta':
      return typeof payload.text === 'string'
        ? { event: 'delta', data: { text: payload.text } }
        : null;
    case 'done':
      return typeof payload.messageId === 'string'
        ? { event: 'done', data: { messageId: payload.messageId } }
        : null;
    case 'error':
      return typeof payload.code === 'string'
        ? {
            event: 'error',
            data: {
              code: payload.code,
              message: typeof payload.message === 'string' ? payload.message : '',
            },
          }
        : null;
    default:
      return null;
  }
}
