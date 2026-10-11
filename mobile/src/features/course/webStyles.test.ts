import { Platform } from 'react-native';

import { autoScrollStyle, pointerStyle, stickyStyle } from './webStyles';

describe('webStyles', () => {
  afterEach(() => jest.restoreAllMocks());

  it('adds nothing on native, so the phone layout is untouched', () => {
    expect(stickyStyle(84)).toEqual({});
    expect(autoScrollStyle()).toEqual({});
  });

  it('makes the element sticky under the nav bar on web', () => {
    jest.replaceProperty(Platform, 'OS', 'web');

    expect(stickyStyle(84)).toEqual({ position: 'sticky', top: 84 });
  });

  it('lets a column scroll on its own on web', () => {
    jest.replaceProperty(Platform, 'OS', 'web');

    expect(autoScrollStyle()).toEqual({ overflow: 'auto' });
  });

  it('exposes a pointer cursor for clickable rows', () => {
    expect(pointerStyle).toEqual({ cursor: 'pointer' });
  });
});
