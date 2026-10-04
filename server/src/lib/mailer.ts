/**
 * Gửi email qua SMTP bằng nodemailer (AUTH-07).
 *  - `SMTP_HOST` để trống -> KHÔNG gửi, chỉ ghi thư ra log (dev không cần Mailpit). Nội dung thư (có mã OTP)
 *    chỉ được log ngoài production.
 *  - Test thay transport bằng bản giả qua `setMailTransport()` để bắt thư (không gọi mạng).
 */
import { createTransport } from 'nodemailer';

import { env, isProduction } from '@/config/env';
import { logger } from '@/lib/logger';

export type MailMessage = { to: string; subject: string; text: string; html: string };

/** Phần của nodemailer Transporter mà ta dùng - đủ nhỏ để làm transport giả trong test. */
export type MailTransport = {
  sendMail(message: MailMessage & { from: string }): Promise<unknown>;
};

/** `undefined` = chưa khởi tạo, `null` = không cấu hình SMTP (chỉ log). */
let transport: MailTransport | null | undefined;

function getTransport(): MailTransport | null {
  if (transport !== undefined) return transport;
  transport = env.SMTP_HOST
    ? createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        // Cổng 465 = TLS ngay từ đầu; 587/25/1025 dùng STARTTLS nếu máy chủ hỗ trợ.
        secure: env.SMTP_PORT === 465,
        ...(env.SMTP_USER && env.SMTP_PASS
          ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
          : {}),
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      })
    : null;
  return transport;
}

/** Chỉ dùng trong test: đặt transport giả (hoặc `undefined` để khởi tạo lại từ env). */
export function setMailTransport(next: MailTransport | null | undefined): void {
  transport = next;
}

export async function sendMail(message: MailMessage): Promise<void> {
  const active = getTransport();
  if (!active) {
    const context = isProduction
      ? { to: message.to, subject: message.subject }
      : { to: message.to, subject: message.subject, text: message.text };
    logger.warn(context, 'Email not sent: SMTP_HOST is not configured');
    return;
  }
  await active.sendMail({ from: env.MAIL_FROM, ...message });
}

/**
 * Gửi nền (không chờ) rồi nuốt lỗi sau khi log: request không bị chậm bởi SMTP và thời gian phản hồi
 * không lộ email có tồn tại hay không (quên mật khẩu). Người dùng vẫn có nút "gửi lại".
 */
export function queueMail(message: MailMessage): void {
  sendMail(message).catch((err: unknown) => {
    logger.error({ err, to: message.to, subject: message.subject }, 'Failed to send email');
  });
}
