import { i18n } from '@/i18n';

import { reviewSchema } from './schema';

function messagesOf(values: unknown): string[] {
  const result = reviewSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe('reviewSchema (BR-08)', () => {
  it('accepts a whole rating 1-5 and 10-1000 characters', () => {
    expect(reviewSchema.safeParse({ rating: 4, content: 'Very clear lessons.' }).success).toBe(
      true,
    );
  });

  it('rejects a missing rating and too-short text with English messages', () => {
    const messages = messagesOf({ rating: 0, content: 'short' });

    expect(messages).toContain('Select a rating from 1 to 5 stars');
    expect(messages).toContain('Write at least 10 characters');
  });

  it('rejects text over 1000 characters', () => {
    expect(messagesOf({ rating: 5, content: 'a'.repeat(1001) })).toContain(
      'Your review can have at most 1000 characters',
    );
  });

  it('trims the text before counting characters', () => {
    expect(messagesOf({ rating: 5, content: `   ${'a'.repeat(5)}   ` })).toContain(
      'Write at least 10 characters',
    );
  });

  it('translates the messages when the language is changed (lazy messages)', async () => {
    await i18n.changeLanguage('vi');
    const messages = messagesOf({ rating: 0, content: 'short' });

    expect(messages).toContain('Hãy chọn từ 1 đến 5 sao');
    expect(messages).toContain('Hãy viết ít nhất 10 ký tự');
  });
});
