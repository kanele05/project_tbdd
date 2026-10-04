import type { Response } from 'express';

/** Một sự kiện SSE: `event: <tên>\ndata: <JSON một dòng>\n\n`. */
export function formatSseEvent(event: string, data: unknown): string {
  // JSON.stringify không bao giờ chứa xuống dòng thật -> an toàn trong một dòng `data:`.
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

type FlushableResponse = Response & { flush?: () => void };

/**
 * Kết nối Server-Sent Events trên một `Response` Express.
 * - `Cache-Control: no-transform` để middleware `compression` KHÔNG buffer luồng;
 * - `X-Accel-Buffering: no` để reverse proxy (nginx/Render) không buffer;
 * - gọi `res.flush()` (do compression gắn) sau mỗi lần ghi nếu có.
 */
export class SseConnection {
  private closed = false;

  constructor(private readonly res: Response) {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.on('close', () => {
      this.closed = true;
    });
  }

  /** true khi client đã ngắt kết nối hoặc response đã kết thúc. */
  get isClosed(): boolean {
    return this.closed || this.res.writableEnded;
  }

  /** Gửi một sự kiện; trả về false (và không ghi gì) nếu kết nối đã đóng. */
  send(event: string, data: unknown): boolean {
    if (this.isClosed) return false;
    this.res.write(formatSseEvent(event, data));
    (this.res as FlushableResponse).flush?.();
    return true;
  }

  end(): void {
    if (!this.res.writableEnded) this.res.end();
  }
}

export function openSse(res: Response): SseConnection {
  return new SseConnection(res);
}
