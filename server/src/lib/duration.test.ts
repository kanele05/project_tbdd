import { durationToMs, durationToSeconds } from './duration';

describe('duration', () => {
  it.each([
    ['900s', 900_000],
    ['15m', 900_000],
    ['12h', 43_200_000],
    ['30d', 2_592_000_000],
  ])('parses %s', (value, ms) => {
    expect(durationToMs(value)).toBe(ms);
    expect(durationToSeconds(value)).toBe(ms / 1000);
  });

  it.each(['', '15', 'm', '0m', '-5m', '1.5h', '15 minutes', '1w'])('rejects "%s"', (value) => {
    expect(() => durationToMs(value)).toThrow('Invalid duration');
  });
});
