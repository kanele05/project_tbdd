import { act, render, screen } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';

import { AppIntro } from './AppIntro';
import { EXIT_START_MS, TOTAL_MS } from './introTimeline';

function advance(ms: number) {
  return act(async () => {
    jest.advanceTimersByTime(ms);
    // Reanimated schedules frames and the completion callback on the JS side in tests.
    await Promise.resolve();
  });
}

let mockIsReducedMotion = false;
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    ...actual,
    __esModule: true,
    default: actual.default,
    useReducedMotion: () => mockIsReducedMotion,
  };
});

describe('AppIntro', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockIsReducedMotion = false;
    Reanimated.setUpTests();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders a full-screen overlay labelled with the app name', async () => {
    await render(<AppIntro isReady={false} onFinish={jest.fn()} />);
    const overlay = screen.getByTestId('app-intro');
    expect(overlay).toBeOnTheScreen();
    expect(screen.getByLabelText('E-Learning')).toBeOnTheScreen();
  });

  it('hides the individual letters from screen readers', async () => {
    await render(<AppIntro isReady={false} onFinish={jest.fn()} />);
    expect(screen.queryByText('e', { includeHiddenElements: false })).toBeNull();
  });

  it('does not finish while the app is still loading', async () => {
    const onFinish = jest.fn();
    await render(<AppIntro isReady={false} onFinish={onFinish} />);
    await advance(TOTAL_MS + 3000);
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('finishes once the animation has played and the app is ready', async () => {
    const onFinish = jest.fn();
    await render(<AppIntro isReady onFinish={onFinish} />);
    await advance(EXIT_START_MS + 50);
    await advance(TOTAL_MS);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('waits for fonts (isActive) before it starts', async () => {
    const onFinish = jest.fn();
    await render(<AppIntro isReady isActive={false} onFinish={onFinish} />);
    await advance(TOTAL_MS + 1000);
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('never finishes while frozen on a frame (dev screenshots)', async () => {
    const onFinish = jest.fn();
    await render(<AppIntro isReady freezeAtMs={900} onFinish={onFinish} />);
    await advance(TOTAL_MS + 1000);
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('only fades briefly when Reduce Motion is on', async () => {
    mockIsReducedMotion = true;
    const onFinish = jest.fn();
    await render(<AppIntro isReady onFinish={onFinish} />);
    // Far shorter than the full 2.15 s timeline: 600 ms hold + 250 ms fade.
    await advance(700);
    await advance(400);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
