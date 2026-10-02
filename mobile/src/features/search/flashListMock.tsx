import { FlatList, type FlatListProps } from 'react-native';

/**
 * Jest stand-in for `@shopify/flash-list` (its own `jestSetup` is broken for v2.0.2): renders the
 * same props with a plain `FlatList`, so header / empty / footer / separators / pull-to-refresh
 * can be tested. Use: `jest.mock('@shopify/flash-list', () => jest.requireActual('@/features/search/flashListMock'))`.
 */
export function FlashList<T>(props: FlatListProps<T>) {
  return <FlatList {...props} />;
}
