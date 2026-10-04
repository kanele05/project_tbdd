import { GeminiProvider } from './gemini.provider';

/** Thay SDK thật bằng client giả để kiểm tra cách provider tạo client (không gọi mạng, không cần key thật). */
const constructed: unknown[] = [];
const generateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: class FakeGoogleGenAI {
    models = { generateContent, generateContentStream: jest.fn() };
    constructor(options: unknown) {
      constructed.push(options);
    }
  },
}));

beforeEach(() => {
  constructed.length = 0;
  generateContent.mockReset().mockResolvedValue({
    text: 'Hello',
    candidates: [{ finishReason: 'STOP' }],
  });
});

describe('GeminiProvider SDK client', () => {
  it('creates the SDK client lazily, once, with the API key and a single 503 retry', async () => {
    const provider = new GeminiProvider({
      apiKey: 'test-key-not-real',
      model: 'gemini-test-model',
      timeoutMs: 5_000,
    });
    expect(constructed).toHaveLength(0);

    await provider.generateText({ label: 't', prompt: 'p' });
    await provider.generateText({ label: 't', prompt: 'p' });

    expect(constructed).toHaveLength(1);
    expect(constructed[0]).toMatchObject({
      apiKey: 'test-key-not-real',
      httpOptions: { retryOptions: { attempts: 2, httpStatusCodes: [503] } },
    });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('never retries HTTP 429 so the free-tier quota is not burned twice', async () => {
    const provider = new GeminiProvider({
      apiKey: 'test-key-not-real',
      model: 'gemini-test-model',
      timeoutMs: 5_000,
    });
    await provider.generateText({ label: 't', prompt: 'p' });
    const options = constructed[0] as {
      httpOptions: { retryOptions: { httpStatusCodes: number[] } };
    };
    expect(options.httpOptions.retryOptions.httpStatusCodes).not.toContain(429);
  });
});
