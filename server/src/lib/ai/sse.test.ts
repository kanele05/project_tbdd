import { EventEmitter } from 'node:events';

import type { Response } from 'express';

import { formatSseEvent, openSse } from './sse';

function fakeResponse() {
  const written: string[] = [];
  const headers: Record<string, string> = {};
  const res = Object.assign(new EventEmitter(), {
    writableEnded: false,
    status: jest.fn(),
    setHeader: jest.fn((name: string, value: string) => {
      headers[name] = value;
    }),
    flushHeaders: jest.fn(),
    write: jest.fn((chunk: string) => {
      written.push(chunk);
      return true;
    }),
    flush: jest.fn(),
    end: jest.fn(() => {
      res.writableEnded = true;
    }),
  });
  return { res, written, headers, asResponse: res as unknown as Response };
}

describe('formatSseEvent', () => {
  it('writes event name and one-line JSON data terminated by a blank line', () => {
    expect(formatSseEvent('delta', { text: 'Hi' })).toBe('event: delta\ndata: {"text":"Hi"}\n\n');
  });

  it('escapes newlines inside the data so a delta can never break the framing', () => {
    const frame = formatSseEvent('delta', { text: 'line1\nline2\r\n\nline3' });
    expect(frame.split('\n\n')).toHaveLength(2); // exactly one frame + trailing ''
    expect(frame.split('\n')).toHaveLength(4); // event, data, '', ''
  });
});

describe('openSse', () => {
  it('sends SSE headers that disable buffering and compression', () => {
    const { res, headers, asResponse } = fakeResponse();
    openSse(asResponse);
    expect(headers['Content-Type']).toBe('text/event-stream; charset=utf-8');
    expect(headers['Cache-Control']).toContain('no-transform');
    expect(headers['X-Accel-Buffering']).toBe('no');
    expect(res.flushHeaders).toHaveBeenCalled();
  });

  it('writes events and flushes after each one (needed with compression)', () => {
    const { res, written, asResponse } = fakeResponse();
    const sse = openSse(asResponse);
    expect(sse.send('delta', { text: 'a' })).toBe(true);
    expect(sse.send('done', { messageId: 'm1' })).toBe(true);
    expect(written).toEqual([
      'event: delta\ndata: {"text":"a"}\n\n',
      'event: done\ndata: {"messageId":"m1"}\n\n',
    ]);
    expect(res.flush).toHaveBeenCalledTimes(2);
  });

  it('refuses to write after the client closed the connection', () => {
    const { res, written, asResponse } = fakeResponse();
    const sse = openSse(asResponse);
    res.emit('close');
    expect(sse.isClosed).toBe(true);
    expect(sse.send('delta', { text: 'late' })).toBe(false);
    expect(written).toEqual([]);
  });

  it('end() finishes the response once', () => {
    const { res, asResponse } = fakeResponse();
    const sse = openSse(asResponse);
    sse.end();
    sse.end();
    expect(res.end).toHaveBeenCalledTimes(1);
    expect(sse.isClosed).toBe(true);
  });
});
