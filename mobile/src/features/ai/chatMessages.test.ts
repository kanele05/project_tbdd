import type { AiChatMessageDto } from '@/types/api';

import { toChronological } from './chatMessages';

function message(id: string, role: AiChatMessageDto['role'] = 'USER'): AiChatMessageDto {
  return { id, role, content: id, createdAt: '2026-10-04T10:00:00.000Z' };
}

describe('toChronological', () => {
  it('turns newest-first pages into oldest-first order', () => {
    // Server: page 1 = newest 3, page 2 = the older ones; each page newest first.
    const pages = [
      { data: [message('m6', 'ASSISTANT'), message('m5'), message('m4', 'ASSISTANT')] },
      { data: [message('m3'), message('m2', 'ASSISTANT'), message('m1')] },
    ];
    expect(toChronological(pages).map((item) => item.id)).toEqual([
      'm1',
      'm2',
      'm3',
      'm4',
      'm5',
      'm6',
    ]);
  });

  it('drops a message that appears on two pages (a new one shifted the pagination)', () => {
    const pages = [
      { data: [message('m3'), message('m2')] },
      { data: [message('m2'), message('m1')] },
    ];
    expect(toChronological(pages).map((item) => item.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('is empty without data', () => {
    expect(toChronological(undefined)).toEqual([]);
    expect(toChronological([{ data: [] }])).toEqual([]);
  });
});
