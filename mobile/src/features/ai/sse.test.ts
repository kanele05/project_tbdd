import { createSseParser, createUtf8Decoder, toChatEvent, type SseMessage } from './sse';

function parseAll(chunks: readonly string[]): SseMessage[] {
  const parser = createSseParser();
  const messages: SseMessage[] = [];
  for (const chunk of chunks) messages.push(...parser.push(chunk));
  messages.push(...parser.flush());
  return messages;
}

const DELTA_HELLO = 'event: delta\ndata: {"text":"Hello"}\n\n';
const DONE = 'event: done\ndata: {"messageId":"msg_1"}\n\n';

describe('createSseParser', () => {
  it('parses a single event', () => {
    expect(parseAll([DELTA_HELLO])).toEqual([{ event: 'delta', data: '{"text":"Hello"}' }]);
  });

  it('parses several events that arrive in one chunk', () => {
    expect(parseAll([DELTA_HELLO + DONE])).toEqual([
      { event: 'delta', data: '{"text":"Hello"}' },
      { event: 'done', data: '{"messageId":"msg_1"}' },
    ]);
  });

  it('waits for the blank line before emitting an event', () => {
    const parser = createSseParser();
    expect(parser.push('event: delta\ndata: {"text":"Hi"}\n')).toEqual([]);
    expect(parser.push('\n')).toEqual([{ event: 'delta', data: '{"text":"Hi"}' }]);
  });

  it('survives a chunk boundary at every possible position', () => {
    const stream = DELTA_HELLO + 'event: delta\ndata: {"text":" world"}\n\n' + DONE;
    const expected = parseAll([stream]);
    expect(expected).toHaveLength(3);
    for (let cut = 1; cut < stream.length; cut += 1) {
      expect(parseAll([stream.slice(0, cut), stream.slice(cut)])).toEqual(expected);
    }
  });

  it('survives one character per chunk', () => {
    const stream = DELTA_HELLO + DONE;
    expect(parseAll(stream.split(''))).toEqual(parseAll([stream]));
  });

  it('supports CRLF line endings, also when "\\r" and "\\n" are in different chunks', () => {
    const stream = 'event: delta\r\ndata: {"text":"A"}\r\n\r\n';
    const expected = [{ event: 'delta', data: '{"text":"A"}' }];
    expect(parseAll([stream])).toEqual(expected);
    for (let cut = 1; cut < stream.length; cut += 1) {
      expect(parseAll([stream.slice(0, cut), stream.slice(cut)])).toEqual(expected);
    }
  });

  it('supports bare "\\r" line endings', () => {
    expect(parseAll(['event: done\rdata: {"messageId":"m"}\r\r'])).toEqual([
      { event: 'done', data: '{"messageId":"m"}' },
    ]);
  });

  it('joins multi-line data with a newline', () => {
    expect(parseAll(['event: delta\ndata: line one\ndata: line two\n\n'])).toEqual([
      { event: 'delta', data: 'line one\nline two' },
    ]);
  });

  it('ignores comments, unknown fields and empty events', () => {
    const stream = ': ping\n\nid: 7\nretry: 100\nevent: delta\ndata: {"text":"x"}\n\n';
    expect(parseAll([stream])).toEqual([{ event: 'delta', data: '{"text":"x"}' }]);
  });

  it('defaults the event name to "message" and keeps data without a leading space', () => {
    expect(parseAll(['data:{"a":1}\n\n'])).toEqual([{ event: 'message', data: '{"a":1}' }]);
  });

  it('emits a last event that the server did not close with a blank line', () => {
    expect(parseAll(['event: done\ndata: {"messageId":"m"}\n'])).toEqual([
      { event: 'done', data: '{"messageId":"m"}' },
    ]);
  });

  it('drops an incomplete trailing fragment without data', () => {
    expect(parseAll([DELTA_HELLO + 'event: delta\n'])).toEqual([
      { event: 'delta', data: '{"text":"Hello"}' },
    ]);
  });

  it('keeps a colon inside the data value', () => {
    expect(parseAll(['event: delta\ndata: {"text":"a: b"}\n\n'])[0]?.data).toBe('{"text":"a: b"}');
  });
});

describe('createUtf8Decoder', () => {
  const encoder = new TextEncoder();

  it('does not corrupt a multi-byte character cut between two chunks', () => {
    // "ệ" takes 3 bytes in UTF-8, "😀" takes 4.
    const bytes = encoder.encode('Tiếng Việt 😀 ok');
    for (let cut = 1; cut < bytes.length; cut += 1) {
      const decoder = createUtf8Decoder();
      const text = decoder.decode(bytes.slice(0, cut)) + decoder.decode(bytes.slice(cut));
      expect(text + decoder.decode()).toBe('Tiếng Việt 😀 ok');
    }
  });

  it('feeds the SSE parser with Vietnamese text split byte by byte', () => {
    const stream = 'event: delta\ndata: {"text":"Xin chào, đây là bài học"}\n\n';
    const bytes = encoder.encode(stream);
    const decoder = createUtf8Decoder();
    const parser = createSseParser();
    const messages: SseMessage[] = [];
    for (const byte of bytes) messages.push(...parser.push(decoder.decode(Uint8Array.of(byte))));
    messages.push(...parser.push(decoder.decode()), ...parser.flush());
    expect(messages).toEqual([{ event: 'delta', data: '{"text":"Xin chào, đây là bài học"}' }]);
  });
});

describe('toChatEvent', () => {
  it('maps the three documented events', () => {
    expect(toChatEvent({ event: 'delta', data: '{"text":"Hi"}' })).toEqual({
      event: 'delta',
      data: { text: 'Hi' },
    });
    expect(toChatEvent({ event: 'done', data: '{"messageId":"m1"}' })).toEqual({
      event: 'done',
      data: { messageId: 'm1' },
    });
    expect(
      toChatEvent({ event: 'error', data: '{"code":"AI_UNAVAILABLE","message":"x"}' }),
    ).toEqual({ event: 'error', data: { code: 'AI_UNAVAILABLE', message: 'x' } });
  });

  it('accepts an error event without a message', () => {
    expect(toChatEvent({ event: 'error', data: '{"code":"AI_BLOCKED"}' })).toEqual({
      event: 'error',
      data: { code: 'AI_BLOCKED', message: '' },
    });
  });

  it('returns null for unknown events, bad JSON and wrong shapes', () => {
    expect(toChatEvent({ event: 'ping', data: '{}' })).toBeNull();
    expect(toChatEvent({ event: 'delta', data: 'not json' })).toBeNull();
    expect(toChatEvent({ event: 'delta', data: '[1]' })).toBeNull();
    expect(toChatEvent({ event: 'delta', data: '{"text":5}' })).toBeNull();
    expect(toChatEvent({ event: 'done', data: '{}' })).toBeNull();
    expect(toChatEvent({ event: 'error', data: '{"message":"no code"}' })).toBeNull();
  });
});
