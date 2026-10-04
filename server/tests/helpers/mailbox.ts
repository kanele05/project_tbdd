/**
 * Hộp thư giả cho test: thay transport của mailer để bắt thư (không SMTP, không mạng).
 *
 *   beforeAll(() => installMailbox());  beforeEach(() => mailbox.clear());
 *   const code = otpFrom(mailbox.lastTo('a@example.com'));
 */
import { type MailMessage, setMailTransport } from '@/lib/mailer';

export type CapturedMail = MailMessage & { from: string };

class Mailbox {
  readonly messages: CapturedMail[] = [];
  /** Giả lập lỗi SMTP cho lần gửi tiếp theo. */
  failNext = false;

  clear(): void {
    this.messages.length = 0;
    this.failNext = false;
  }

  to(email: string): CapturedMail[] {
    return this.messages.filter((m) => m.to === email);
  }

  lastTo(email: string): CapturedMail {
    const found = this.to(email).at(-1);
    if (!found) throw new Error(`No mail was sent to ${email}`);
    return found;
  }
}

export const mailbox = new Mailbox();

export function installMailbox(): void {
  setMailTransport({
    sendMail: async (message) => {
      if (mailbox.failNext) {
        mailbox.failNext = false;
        throw new Error('SMTP down');
      }
      mailbox.messages.push(message as CapturedMail);
    },
  });
}

export function uninstallMailbox(): void {
  setMailTransport(undefined);
}

/** Lấy mã 6 số đầu tiên trong nội dung thư (OTP xác minh / đặt lại mật khẩu). */
export function otpFrom(mail: MailMessage): string {
  const match = /\b(\d{6})\b/.exec(mail.text);
  if (!match?.[1]) throw new Error(`No 6-digit code found in: ${mail.text}`);
  return match[1];
}
