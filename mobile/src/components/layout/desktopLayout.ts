import { useCallback, useEffect } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { create } from 'zustand';

/** Chiều cao thanh điều hướng trên cùng ở bố cục rộng (≥ 768, PLAN §2.5). */
export const DESKTOP_NAV_HEIGHT = 68;

/** Bề rộng tối đa của nội dung trang trên PC; hai bên chừa lề 4 % như Netflix web. */
export const PAGE_MAX_WIDTH = 1440;

/** Cột hẹp cho màn CHƯA có bố cục PC (để không bị kéo giãn xấu) — xem `isWideRoute`. */
export const NARROW_FALLBACK_WIDTH = 760;

type DesktopNavState = {
  /** `true` khi trang đang ở trên banner (trang chủ chưa cuộn) → thanh điều hướng trong suốt. */
  isTransparent: boolean;
  setTransparent: (isTransparent: boolean) => void;
};

/** Trạng thái giao diện nhỏ của thanh điều hướng PC (client state, không phải dữ liệu API). */
export const useDesktopNavStore = create<DesktopNavState>((set) => ({
  isTransparent: false,
  setTransparent: (isTransparent) => set({ isTransparent }),
}));

/**
 * Route đã có bố cục PC riêng (dùng hết bề rộng). Route không khớp được hiển thị trong cột
 * `NARROW_FALLBACK_WIDTH` ở giữa màn. Agent làm xong màn nào thì THÊM (append) mẫu route của màn đó.
 */
export const WIDE_ROUTE_PATTERNS: readonly RegExp[] = [
  // WEB-02 (trang chủ + khám phá)
  /^\/$/,
  /^\/search\/?$/,
  /^\/my-courses\/?$/,
  /^\/course-list\/?$/,
  /^\/teachers\/?$/,
  // WEB-03 (chi tiết khóa + học bài + hỏi đáp)
  /^\/course\/[^/]+(\/reviews)?\/?$/,
  /^\/learn\/[^/]+\/?$/,
  /^\/question\/[^/]+\/?$/,
  // WEB-04 (Giảng dạy / Quản trị) - /studio/ai-draft là modal nên giữ cột hẹp
  /^\/studio\/?$/,
  /^\/studio\/(?!ai-draft\/?$)[^/]+\/?$/,
  /^\/studio\/[^/]+\/(edit|curriculum|stats|submissions)\/?$/,
  /^\/admin\/?$/,
  /^\/admin\/(courses|users)\/?$/,
  /^\/admin\/courses\/[^/]+\/?$/,
  /^\/profile\/teacher-edit\/?$/,
  // WEB-05b (giỏ, thanh toán, thông báo, hồ sơ, sửa hồ sơ, hồ sơ giảng viên)
  /^\/cart\/?$/,
  /^\/checkout\/?$/,
  /^\/notifications\/?$/,
  /^\/profile\/?$/,
  /^\/profile\/edit\/?$/,
  /^\/teacher\/[^/]+\/?$/,
  // WEB-05c (cài đặt, AI Tutor, quiz, hộp thoại nộp project / viết đánh giá / bộ lọc)
  /^\/settings\/?$/,
  /^\/settings\/(security|two-factor)\/?$/,
  /^\/learn\/[^/]+\/(tutor|quiz|submit-project)\/?$/,
  /^\/course\/[^/]+\/write-review\/?$/,
  /^\/search-filter\/?$/,
];

export function isWideRoute(pathname: string): boolean {
  return WIDE_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

/**
 * Một trang có banner tràn viền gọi hook này để thanh điều hướng trong suốt khi nó đang hiển thị
 * (`isTransparent = true`); rời trang thì tự trả về nền đặc.
 */
export function useTransparentNav(isTransparent: boolean): void {
  const setTransparent = useDesktopNavStore((state) => state.setTransparent);
  useEffect(() => {
    setTransparent(isTransparent);
    return () => setTransparent(false);
  }, [isTransparent, setTransparent]);
}

/** Cuộn quá ngần này (dp) thì thanh điều hướng chuyển sang nền đặc. */
export const NAV_SCROLL_THRESHOLD = 40;

/**
 * Như `useTransparentNav` nhưng theo cuộn: trong suốt khi trang ở trên cùng, nền đặc khi đã cuộn quá
 * `threshold`. Trả về handler gắn vào `onScroll` của ScrollView/FlatList (`scrollEventThrottle={16}`).
 */
export function useTransparentNavOnScroll(
  threshold: number = NAV_SCROLL_THRESHOLD,
): (event: NativeSyntheticEvent<NativeScrollEvent>) => void {
  const setTransparent = useDesktopNavStore((state) => state.setTransparent);
  useEffect(() => {
    setTransparent(true);
    return () => setTransparent(false);
  }, [setTransparent]);
  return useCallback(
    (event) => setTransparent(event.nativeEvent.contentOffset.y < threshold),
    [setTransparent, threshold],
  );
}
