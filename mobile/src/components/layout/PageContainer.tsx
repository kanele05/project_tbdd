import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useBreakpoint } from '@/hooks/useBreakpoint';

import { PAGE_MAX_WIDTH } from './desktopLayout';

export type PageContainerProps = {
  children: ReactNode;
  /** Bề rộng tối đa ở bố cục rộng (mặc định `PAGE_MAX_WIDTH`). */
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Khung nội dung của một trang ở bố cục rộng (≥ 768): căn giữa, tối đa `maxWidth`, lề hai bên 4 %.
 * Trên điện thoại không thêm gì (màn tự quản lý lề như trước).
 */
export function PageContainer({
  children,
  maxWidth = PAGE_MAX_WIDTH,
  style,
  testID,
}: PageContainerProps) {
  const { isWide } = useBreakpoint();
  if (!isWide)
    return (
      <View style={style} testID={testID}>
        {children}
      </View>
    );
  return (
    <View style={[styles.wide, { maxWidth }, style]} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wide: { width: '100%', alignSelf: 'center', paddingHorizontal: '4%' },
});
