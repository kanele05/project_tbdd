import { parseInline, parseTutorText, toPlainText } from './tutorText';

describe('parseInline', () => {
  it('splits bold and inline code from plain text', () => {
    expect(parseInline('Use **useEffect** and `cleanup` here')).toEqual([
      { text: 'Use ', style: 'plain' },
      { text: 'useEffect', style: 'bold' },
      { text: ' and ', style: 'plain' },
      { text: 'cleanup', style: 'code' },
      { text: ' here', style: 'plain' },
    ]);
  });

  it('keeps an unclosed marker literal (a streaming answer is cut mid-word)', () => {
    expect(parseInline('This is **impor')).toEqual([{ text: 'This is **impor', style: 'plain' }]);
    expect(parseInline('call `foo')).toEqual([{ text: 'call `foo', style: 'plain' }]);
  });

  it('handles Vietnamese text and emoji', () => {
    expect(parseInline('**Hook** là gì? 🎯')).toEqual([
      { text: 'Hook', style: 'bold' },
      { text: ' là gì? 🎯', style: 'plain' },
    ]);
  });

  it('returns nothing for an empty line', () => {
    expect(parseInline('')).toEqual([]);
  });
});

describe('parseTutorText', () => {
  it('turns bullets, headings and paragraphs into blocks', () => {
    const blocks = parseTutorText('## Summary\nA paragraph.\n\n- first\n* second\n• third');
    expect(blocks.map((block) => block.kind)).toEqual([
      'heading',
      'paragraph',
      'bullet',
      'bullet',
      'bullet',
    ]);
    expect(blocks[0]?.segments[0]?.text).toBe('Summary');
    expect(blocks[4]?.segments[0]?.text).toBe('third');
  });

  it('keeps a numbered list as paragraphs', () => {
    expect(parseTutorText('1. one\n2. two').map((block) => block.kind)).toEqual([
      'paragraph',
      'paragraph',
    ]);
  });

  it('copes with CRLF and empty input', () => {
    expect(parseTutorText('a\r\nb')).toHaveLength(2);
    expect(parseTutorText('')).toEqual([]);
    expect(parseTutorText('\n\n')).toEqual([]);
  });
});

describe('toPlainText', () => {
  it('drops the Markdown markers', () => {
    expect(toPlainText('# Title\n- **bold** item\nplain `code`')).toBe(
      'Title\nbold item\nplain code',
    );
  });
});
