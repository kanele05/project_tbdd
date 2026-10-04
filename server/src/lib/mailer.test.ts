import type * as MailerNamespace from './mailer';

const mockCreateTransport = jest.fn();
const mockLogger = { warn: jest.fn(), error: jest.fn(), info: jest.fn() };

jest.mock('nodemailer', () => ({
  createTransport: (...args: unknown[]) => mockCreateTransport(...args),
}));
jest.mock('@/lib/logger', () => ({ logger: mockLogger }));

type Mailer = typeof MailerNamespace;

const message = {
  to: 'martha@example.com',
  subject: 'Verify',
  text: 'Your code is 123456',
  html: '<p>Your code is 123456</p>',
};

function loadMailer(envValues: Record<string, unknown>): Mailer {
  let loaded: Mailer | undefined;
  jest.isolateModules(() => {
    jest.doMock('@/config/env', () => ({
      isProduction: false,
      env: { MAIL_FROM: 'E-Learning <no-reply@example.com>', SMTP_PORT: 587, ...envValues },
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('./mailer') as Mailer;
  });
  jest.dontMock('@/config/env');
  return loaded as Mailer;
}

beforeEach(() => {
  mockCreateTransport.mockReset();
  mockLogger.warn.mockReset();
  mockLogger.error.mockReset();
});

describe('sendMail without SMTP_HOST', () => {
  it('only logs the mail (including the body in development) and never opens a connection', async () => {
    const { sendMail } = loadMailer({});
    await sendMail(message);
    expect(mockCreateTransport).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { to: message.to, subject: message.subject, text: message.text },
      expect.stringContaining('SMTP_HOST'),
    );
  });

  it('does not log the body (OTP code) in production', async () => {
    let mailer: Mailer | undefined;
    jest.isolateModules(() => {
      jest.doMock('@/config/env', () => ({ isProduction: true, env: { MAIL_FROM: 'x' } }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mailer = require('./mailer') as Mailer;
    });
    jest.dontMock('@/config/env');
    await mailer?.sendMail(message);
    const [context] = mockLogger.warn.mock.calls[0] as [Record<string, unknown>];
    expect(context).toEqual({ to: message.to, subject: message.subject });
    expect(JSON.stringify(mockLogger.warn.mock.calls)).not.toContain('123456');
  });
});

describe('sendMail with SMTP_HOST', () => {
  it('creates one SMTP transport lazily and sends with the configured sender', async () => {
    const sendMailFn = jest.fn().mockResolvedValue({});
    mockCreateTransport.mockReturnValue({ sendMail: sendMailFn });
    const { sendMail } = loadMailer({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: 465,
      SMTP_USER: 'user',
      SMTP_PASS: 'secret',
    });

    await sendMail(message);
    await sendMail(message);

    expect(mockCreateTransport).toHaveBeenCalledTimes(1);
    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        port: 465,
        secure: true,
        auth: { user: 'user', pass: 'secret' },
      }),
    );
    expect(sendMailFn).toHaveBeenCalledWith({
      from: 'E-Learning <no-reply@example.com>',
      ...message,
    });
  });

  it('omits auth when no credentials are set and uses STARTTLS on port 587/1025', async () => {
    mockCreateTransport.mockReturnValue({ sendMail: jest.fn().mockResolvedValue({}) });
    const { sendMail } = loadMailer({ SMTP_HOST: 'localhost', SMTP_PORT: 1025 });
    await sendMail(message);
    const options = mockCreateTransport.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(options).not.toHaveProperty('auth');
    expect(options.secure).toBe(false);
  });

  it('uses the fake transport installed by tests and can reset to the env default', async () => {
    const { sendMail, setMailTransport } = loadMailer({});
    const fake = { sendMail: jest.fn().mockResolvedValue({}) };
    setMailTransport(fake);
    await sendMail(message);
    expect(fake.sendMail).toHaveBeenCalledTimes(1);

    setMailTransport(undefined);
    await sendMail(message);
    expect(fake.sendMail).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalled();
  });
});

describe('queueMail', () => {
  it('delivers in the background and swallows SMTP errors after logging them', async () => {
    const { queueMail, setMailTransport } = loadMailer({});
    const failing = { sendMail: jest.fn().mockRejectedValue(new Error('SMTP down')) };
    setMailTransport(failing);

    expect(() => queueMail(message)).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));

    expect(failing.sendMail).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ to: message.to, subject: message.subject }),
      'Failed to send email',
    );
  });
});
