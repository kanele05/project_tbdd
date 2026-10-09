import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { CourseInfo } from './CourseInfo';

describe('CourseInfo', () => {
  it('lets the like / share pills wrap so the second one is not cut off at a large font size', async () => {
    await renderWithProviders(
      <CourseInfo
        title="UX Foundation"
        likeCount={3}
        shareCount={31}
        isLiked={false}
        onToggleLike={jest.fn()}
        onShare={jest.fn()}
      />,
    );

    const row = screen.getByTestId('course-like').parent;
    expect(StyleSheet.flatten(row?.props.style).flexWrap).toBe('wrap');
  });
});
