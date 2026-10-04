import {
  escapeHtml,
  newDeviceMail,
  newDeviceNotification,
  passwordChangedMail,
  resetPasswordMail,
  verifyEmailMail,
} from './mailTemplates';

describe('escapeHtml', () => {
  it('escapes the characters that can inject markup', () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;',
    );
  });
});

describe('verifyEmailMail', () => {
  const params = { fullName: 'Martha Rosie', code: '482913', ttlMinutes: 10 };

  it('renders English with the code in both text and HTML', () => {
    const mail = verifyEmailMail('en', params);
    expect(mail.subject).toBe('Verify your email for E-Learning');
    expect(mail.text).toContain('Hi Martha Rosie,');
    expect(mail.text).toContain('482913');
    expect(mail.text).toContain('expires in 10 minutes');
    expect(mail.html).toContain('482913');
    expect(mail.html).toContain('<div');
  });

  it('renders Vietnamese', () => {
    const mail = verifyEmailMail('vi', params);
    expect(mail.subject).toBe('Xác minh email E-Learning của bạn');
    expect(mail.text).toContain('Xin chào Martha Rosie,');
    expect(mail.text).toContain('482913');
    expect(mail.text).toContain('10 phút');
  });

  it('escapes the user-supplied name in HTML but keeps it readable in text', () => {
    const mail = verifyEmailMail('en', { ...params, fullName: '<img src=x onerror=alert(1)>' });
    expect(mail.html).not.toContain('<img');
    expect(mail.html).toContain('&lt;img');
    expect(mail.text).toContain('<img src=x onerror=alert(1)>');
  });
});

describe('resetPasswordMail', () => {
  it('renders both languages with the code', () => {
    const en = resetPasswordMail('en', { fullName: 'A', code: '111222', ttlMinutes: 10 });
    const vi = resetPasswordMail('vi', { fullName: 'A', code: '111222', ttlMinutes: 10 });
    expect(en.subject).toBe('Reset your E-Learning password');
    expect(vi.subject).toBe('Đặt lại mật khẩu E-Learning');
    expect(en.text).toContain('111222');
    expect(vi.text).toContain('111222');
  });
});

describe('newDeviceMail / newDeviceNotification', () => {
  const when = new Date('2026-10-04T08:30:45Z');

  it('lists device, masked IP and UTC time', () => {
    const mail = newDeviceMail('en', {
      fullName: 'Martha',
      deviceName: 'Pixel 8',
      ip: '113.161.45.x',
      when,
    });
    expect(mail.subject).toBe('New sign-in to your E-Learning account');
    expect(mail.text).toContain('Device: Pixel 8 | IP: 113.161.45.x | Time: 2026-10-04 08:30 UTC');
  });

  it('shows a placeholder when the IP is unknown and supports Vietnamese', () => {
    const mail = newDeviceMail('vi', { fullName: 'Martha', deviceName: 'Pixel 8', ip: null, when });
    expect(mail.text).toContain('Thiết bị: Pixel 8 | IP: ? |');
  });

  it('builds the in-app notification text in both languages', () => {
    expect(newDeviceNotification('en', 'Pixel 8')).toEqual({
      title: 'New device sign-in',
      body: expect.stringContaining('Pixel 8'),
    });
    expect(newDeviceNotification('vi', 'Pixel 8').title).toBe('Đăng nhập từ thiết bị mới');
  });
});

describe('passwordChangedMail', () => {
  it('renders both languages', () => {
    expect(passwordChangedMail('en', { fullName: 'A' }).subject).toBe(
      'Your E-Learning password was changed',
    );
    expect(passwordChangedMail('vi', { fullName: 'A' }).subject).toContain('đã được thay đổi');
  });
});
