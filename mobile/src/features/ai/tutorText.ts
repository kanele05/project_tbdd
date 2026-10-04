/**
 * The AI Tutor answers in light Markdown (bold, inline code, bullet lists, headings). The chat
 * shows it as styled text instead of raw `**` and `#` characters. This is a deliberately small
 * subset - no links, tables or nested lists - and it never throws, so a half-received answer
 * (an unclosed `**` while streaming) simply stays literal until the closing marker arrives.
 */

export type TextSegment = { text: string; style: 'plain' | 'bold' | 'code' };

export type TutorBlock = {
  kind: 'paragraph' | 'bullet' | 'heading';
  segments: TextSegment[];
};

const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/g;
const BULLET = /^\s*[-*•]\s+(.*)$/;
const HEADING = /^\s{0,3}#{1,6}\s+(.*)$/;

/** "a **b** `c`" -> plain "a ", bold "b", plain " ", code "c". */
export function parseInline(line: string): TextSegment[] {
  const segments: TextSegment[] = [];
  for (const part of line.split(INLINE)) {
    if (part === '') continue;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      segments.push({ text: part.slice(2, -2), style: 'bold' });
    } else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      segments.push({ text: part.slice(1, -1), style: 'code' });
    } else {
      segments.push({ text: part, style: 'plain' });
    }
  }
  return segments;
}

/** Split an answer into display blocks; blank lines only separate blocks and produce none. */
export function parseTutorText(text: string): TutorBlock[] {
  const blocks: TutorBlock[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') continue;
    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ kind: 'heading', segments: parseInline(heading[1] ?? '') });
      continue;
    }
    const bullet = BULLET.exec(line);
    if (bullet) {
      blocks.push({ kind: 'bullet', segments: parseInline(bullet[1] ?? '') });
      continue;
    }
    blocks.push({ kind: 'paragraph', segments: parseInline(line.trim()) });
  }
  return blocks;
}

/** The text without any Markdown markers: what a screen reader should read. */
export function toPlainText(text: string): string {
  return parseTutorText(text)
    .map((block) => block.segments.map((segment) => segment.text).join(''))
    .join('\n');
}
