import { render } from '@testing-library/react-native';

import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders a placeholder block and unmounts cleanly', async () => {
    const { toJSON, unmount } = await render(<Skeleton width={120} height={20} />);
    expect(toJSON()).not.toBeNull();
    await unmount();
  });
});
