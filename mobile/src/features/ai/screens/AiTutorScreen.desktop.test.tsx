import { fireEvent, render, screen } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';

import { ToastProvider } from '@/components/ui/Toast';
import type { AiChatMessageDto } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

import { AiTutorScreen } from './AiTutorScreen';

const mockReplace = jest.fn();
const mockSend = jest.fn();
const mockClear = jest.fn();
let mockHistory: Record<string, unknown> = {};
let mockChat: Record<string, unknown> = {};

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1280, height: 900, scale: 1, fontScale: 1 })),
}));
jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    back: jest.fn(),
    canGoBack: () => true,
  },
}));
jest.mock('@/features/course/hooks', () => ({
  useCourseDetail: () => ({ data: { title: 'UX Foundation: Introduction to UX' } }),
}));
jest.mock('../hooks', () => ({
  useAiChatHistory: () => mockHistory,
  useClearAiChat: () => ({ mutateAsync: mockClear }),
}));
jest.mock('../useAiTutorChat', () => ({ useAiTutorChat: () => mockChat }));
jest.mock('@/utils/confirmAction', () => ({ confirmAction: jest.fn() }));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;
const setWidth = (width: number) =>
  mockUseWindowDimensions.mockReturnValue({ width, height: 900, scale: 1, fontScale: 1 });

function msg(id: string, role: AiChatMessageDto['role'], content: string): AiChatMessageDto {
  return { id, role, content, createdAt: '2026-10-04T10:00:00.000Z' };
}

function setHistory(messages: AiChatMessageDto[]) {
  mockHistory = {
    data: { pages: [{ data: messages, meta: { page: 1, limit: 20, total: 2, totalPages: 1 } }] },
    isPending: false,
    isError: false,
    error: null,
    fetchStatus: 'idle',
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
  };
}

async function renderScreen() {
  return render(
    <ToastProvider>
      <AiTutorScreen courseId="course-1" />
    </ToastProvider>,
  );
}

describe('AiTutorScreen on a PC window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWidth(1280);
    mockSend.mockResolvedValue(true);
    mockClear.mockResolvedValue(undefined);
    setHistory([msg('m2', 'ASSISTANT', 'First answer'), msg('m1', 'USER', 'First question')]);
    mockChat = {
      turn: null,
      isStreaming: false,
      cooldownSec: 0,
      send: mockSend,
      retry: jest.fn(),
      reset: jest.fn(),
    };
  });

  it('shows a chat card with the composer and a side column with the course', async () => {
    await renderScreen();

    expect(screen.getByTestId('tutor-desktop')).toBeOnTheScreen();
    expect(screen.getByTestId('tutor-chat-card')).toBeOnTheScreen();
    expect(screen.getByTestId('tutor-input')).toBeOnTheScreen();
    expect(screen.getByText('First question')).toBeOnTheScreen();
    expect(screen.getByTestId('tutor-side-course')).toBeOnTheScreen();
    expect(screen.getByText('UX Foundation: Introduction to UX')).toBeOnTheScreen();
  });

  it('sends a quick question from the side column once the chat has messages', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByTestId('tutor-side-suggestion-summary'));

    expect(mockSend).toHaveBeenCalledWith('Summarize this course for me');
  });

  it('lists the quick questions only in the empty chat while there are no messages', async () => {
    setHistory([]);
    await renderScreen();

    expect(screen.getByTestId('tutor-empty')).toBeOnTheScreen();
    expect(screen.queryByTestId('tutor-side-questions')).not.toBeOnTheScreen();
  });

  it('opens the course from the side column and clears after confirmation', async () => {
    (confirmAction as jest.Mock).mockResolvedValue(true);
    await renderScreen();

    await fireEvent.press(screen.getByTestId('tutor-side-open-course'));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/course/[id]',
      params: { id: 'course-1' },
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Clear conversation' }));
    expect(confirmAction).toHaveBeenCalledTimes(1);
  });

  it('drops the side column on a tablet', async () => {
    setWidth(900);
    await renderScreen();

    expect(screen.getByTestId('tutor-desktop')).toBeOnTheScreen();
    expect(screen.queryByTestId('tutor-side')).not.toBeOnTheScreen();
  });

  it('keeps the phone layout under 768 dp', async () => {
    setWidth(390);
    await renderScreen();

    expect(screen.queryByTestId('tutor-desktop')).not.toBeOnTheScreen();
    expect(screen.getByTestId('tutor-input')).toBeOnTheScreen();
  });
});
