import { formatDurationInput, parseDurationInput } from './duration';

describe('parseDurationInput', () => {
  it('reads mm:ss and h:mm:ss into seconds', () => {
    expect(parseDurationInput('12:34')).toBe(754);
    expect(parseDurationInput('0:01')).toBe(1);
    expect(parseDurationInput(' 5:00 ')).toBe(300);
    expect(parseDurationInput('1:02:05')).toBe(3725);
    expect(parseDurationInput('90:00')).toBe(5400);
  });

  it('rejects text, plain numbers, bad seconds and values outside 1 s .. 6 h', () => {
    for (const bad of ['', '12', 'abc', '1:60', '0:00', '6:00:01', '7:00:00', '1:75:00', '-1:00']) {
      expect(parseDurationInput(bad)).toBeNull();
    }
    expect(parseDurationInput('6:00:00')).toBe(21600);
  });
});

describe('formatDurationInput', () => {
  it('formats seconds as the editable text', () => {
    expect(formatDurationInput(754)).toBe('12:34');
    expect(formatDurationInput(3725)).toBe('1:02:05');
    expect(formatDurationInput(5)).toBe('0:05');
    expect(formatDurationInput(Number.NaN)).toBe('0:00');
  });

  it('round-trips with the parser', () => {
    for (const seconds of [1, 59, 60, 754, 3600, 21600]) {
      expect(parseDurationInput(formatDurationInput(seconds))).toBe(seconds);
    }
  });
});
