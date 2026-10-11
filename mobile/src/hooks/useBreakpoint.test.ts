import { BREAKPOINTS, getBreakpoint } from './useBreakpoint';

describe('getBreakpoint', () => {
  it('maps window widths to phone, tablet and desktop', () => {
    expect(getBreakpoint(360)).toBe('phone');
    expect(getBreakpoint(BREAKPOINTS.tablet - 1)).toBe('phone');
    expect(getBreakpoint(BREAKPOINTS.tablet)).toBe('tablet');
    expect(getBreakpoint(BREAKPOINTS.desktop - 1)).toBe('tablet');
    expect(getBreakpoint(BREAKPOINTS.desktop)).toBe('desktop');
    expect(getBreakpoint(1920)).toBe('desktop');
  });
});
