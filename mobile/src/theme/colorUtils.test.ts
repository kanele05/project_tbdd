import { withAlpha } from './colorUtils';

describe('withAlpha', () => {
  it('turns #RRGGBB and an opacity into rgba()', () => {
    expect(withAlpha('#2EF2FF', 0.35)).toBe('rgba(46, 242, 255, 0.35)');
    expect(withAlpha('#08080C', 0.72)).toBe('rgba(8, 8, 12, 0.72)');
  });

  it('clamps the opacity to 0-1', () => {
    expect(withAlpha('#FFFFFF', 2)).toBe('rgba(255, 255, 255, 1)');
    expect(withAlpha('#FFFFFF', -1)).toBe('rgba(255, 255, 255, 0)');
  });

  it('rejects colors that are not #RRGGBB', () => {
    expect(() => withAlpha('transparent', 0.5)).toThrow();
  });
});
