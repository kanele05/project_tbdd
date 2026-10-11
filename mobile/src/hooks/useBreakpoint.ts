import { useWindowDimensions } from 'react-native';

/**
 * Mốc bề rộng cửa sổ (dp) cho bố cục web responsive (PLAN §2.5):
 * - `phone`   < 768:  giao diện điện thoại hiện tại (thanh tab nổi dưới đáy) — app Android luôn ở đây;
 * - `tablet`  768–1023: nội dung co giãn, lưới 2–3 cột;
 * - `desktop` ≥ 1024: bố cục kiểu Netflix web (thanh điều hướng trên cùng, banner tràn viền, hàng thẻ).
 */
export const BREAKPOINTS = { tablet: 768, desktop: 1024 } as const;

export type Breakpoint = 'phone' | 'tablet' | 'desktop';

export function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'phone';
}

export type BreakpointInfo = {
  breakpoint: Breakpoint;
  width: number;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** `tablet` hoặc `desktop` — đủ rộng để bỏ bố cục điện thoại. */
  isWide: boolean;
};

export function useBreakpoint(): BreakpointInfo {
  const { width } = useWindowDimensions();
  const breakpoint = getBreakpoint(width);
  return {
    breakpoint,
    width,
    isPhone: breakpoint === 'phone',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    isWide: breakpoint !== 'phone',
  };
}
