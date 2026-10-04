import { aiRequestDurationSeconds, aiRequestsTotal } from '@/lib/metrics';

import { AiProviderError } from './errors';
import type { AiJsonRequest, AiJsonResult, AiProvider, AiTextRequest, AiTextResult } from './types';

/**
 * Trạng thái ghi vào nhãn `status` của `ai_requests_total`: `ok`, một `AiFailureKind`
 * (rate_limited | blocked | unavailable | timeout | bad_output | aborted) hoặc `error` (lỗi lạ).
 */
function statusOf(err: unknown): string {
  return err instanceof AiProviderError ? err.kind : 'error';
}

/**
 * Bọc một provider để đo Prometheus cho MỌI lệnh gọi model (OPS-02): đếm theo feature/provider/status
 * và đo thời gian. Nhãn `feature` = `request.label` (hằng số trong code như `course_summary`,
 * `tutor_chat` - không chứa dữ liệu người dùng) nên số chuỗi thời gian luôn nhỏ.
 */
export function withMetrics(inner: AiProvider): AiProvider {
  const provider = inner.name;

  async function measure<R>(feature: string, call: () => Promise<R>): Promise<R> {
    const end = aiRequestDurationSeconds.startTimer({ feature, provider });
    let status = 'ok';
    try {
      return await call();
    } catch (err) {
      status = statusOf(err);
      throw err;
    } finally {
      end();
      aiRequestsTotal.inc({ feature, provider, status });
    }
  }

  /** Stream: đo từ lúc đọc chunk đầu tới khi hết; người đọc dừng giữa chừng (client ngắt) = `aborted`. */
  async function* measureStream(feature: string, source: AsyncIterable<string>) {
    const end = aiRequestDurationSeconds.startTimer({ feature, provider });
    let status = 'ok';
    let isFinished = false;
    try {
      for await (const chunk of source) yield chunk;
      isFinished = true;
    } catch (err) {
      status = statusOf(err);
      throw err;
    } finally {
      if (!isFinished && status === 'ok') status = 'aborted';
      end();
      aiRequestsTotal.inc({ feature, provider, status });
    }
  }

  return {
    name: inner.name,
    model: inner.model,
    generateText: (request: AiTextRequest): Promise<AiTextResult> =>
      measure(request.label, () => inner.generateText(request)),
    generateJson: <T>(request: AiJsonRequest<T>): Promise<AiJsonResult<T>> =>
      measure(request.label, () => inner.generateJson(request)),
    streamText: (request: AiTextRequest): AsyncIterable<string> =>
      measureStream(request.label, inner.streamText(request)),
  };
}
