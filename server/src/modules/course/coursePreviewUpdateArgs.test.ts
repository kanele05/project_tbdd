import { parsePreviewUpdateArgs } from './coursePreviewUpdateArgs';

describe('parsePreviewUpdateArgs', () => {
  it('defaults to a dry run', () => {
    expect(parsePreviewUpdateArgs(['--external-manifest', 'm.json'])).toEqual({
      manifestPath: 'm.json',
      shouldApply: false,
    });
  });

  it('applies only with an explicit --apply, in either argument order', () => {
    const expected = { manifestPath: 'm.json', shouldApply: true };
    expect(parsePreviewUpdateArgs(['--apply', '--external-manifest', 'm.json'])).toEqual(expected);
    expect(parsePreviewUpdateArgs(['--external-manifest', 'm.json', '--apply'])).toEqual(expected);
  });

  it('requires a manifest so there is no hidden default mode', () => {
    expect(() => parsePreviewUpdateArgs([])).toThrow('--external-manifest is required');
    expect(() => parsePreviewUpdateArgs(['--apply'])).toThrow('--external-manifest is required');
  });

  it.each([
    [['--external-manifest']],
    [['--external-manifest', '--apply']],
    [['--external-manifest', 'a.json', '--external-manifest', 'b.json']],
    [['--external-manifest', 'a.json', '--apply', '--apply']],
    [['--external-manifest', 'a.json', '--rendered']],
    [['--external-manifest', 'a.json', 'extra.json']],
    [['m.json']],
  ])('rejects malformed arguments %j', (args) => {
    expect(() => parsePreviewUpdateArgs(args)).toThrow();
  });
});
