import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { QuestionDto } from '@/types/api';

import { Composer } from './Composer';
import { QuestionCard } from './QuestionCard';

const DAY_MS = 24 * 60 * 60 * 1000;

function makeQuestion(overrides: Partial<QuestionDto> = {}): QuestionDto {
  return {
    id: 'question-1',
    content: 'How do I start the first project?',
    createdAt: new Date(Date.now() - DAY_MS).toISOString(),
    likeCount: 23,
    answerCount: 5,
    isLiked: false,
    user: { id: 'user-1', fullName: 'Jane Barry', avatarUrl: null },
    ...overrides,
  };
}

describe('QuestionCard', () => {
  it('shows the author, time, text, like count and comment count', async () => {
    await render(<QuestionCard question={makeQuestion()} onToggleLike={jest.fn()} />);

    expect(screen.getByText('Jane Barry')).toBeOnTheScreen();
    expect(screen.getByText('A day ago')).toBeOnTheScreen();
    expect(screen.getByText('How do I start the first project?')).toBeOnTheScreen();
    expect(screen.getByText('23')).toBeOnTheScreen();
    expect(screen.getByText('5 Comment')).toBeOnTheScreen();
  });

  it('toggles the like and shows the liked state', async () => {
    const onToggleLike = jest.fn();
    const question = makeQuestion({ isLiked: true });
    await render(<QuestionCard question={question} onToggleLike={onToggleLike} />);

    const like = screen.getByTestId('question-like-question-1');
    expect(like).toBeSelected();
    await fireEvent.press(like);

    expect(onToggleLike).toHaveBeenCalledWith(question);
  });

  it('opens the discussion from the comment button', async () => {
    const onOpen = jest.fn();
    const question = makeQuestion();
    await render(<QuestionCard question={question} onToggleLike={jest.fn()} onOpen={onOpen} />);

    await fireEvent.press(screen.getByTestId('question-comments-question-1'));

    expect(onOpen).toHaveBeenCalledWith(question);
  });

  it('has no comment button in the detail variant and shows the whole text', async () => {
    await render(
      <QuestionCard
        question={makeQuestion()}
        variant="detail"
        onToggleLike={jest.fn()}
        onOpen={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('question-comments-question-1')).not.toBeOnTheScreen();
    expect(
      screen.getByText('How do I start the first project?').props.numberOfLines,
    ).toBeUndefined();
  });
});

describe('Composer', () => {
  it('inserts a quick emoji into the input', async () => {
    await render(<Composer placeholder="Write a Q&A..." onSubmit={jest.fn()} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Insert 🙌' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Insert 🔥' }));

    expect(screen.getByLabelText('Write a Q&A...').props.value).toBe('🙌🔥');
  });

  it('offers the seven quick emoji of the design', async () => {
    await render(<Composer placeholder="Write a Q&A..." onSubmit={jest.fn()} />);

    for (const emoji of ['🙌', '😍', '💖', '👏', '😱', '😂', '🔥']) {
      expect(screen.getByRole('button', { name: `Insert ${emoji}` })).toBeOnTheScreen();
    }
  });

  it('cannot send an empty or blank message', async () => {
    const onSubmit = jest.fn();
    await render(<Composer placeholder="Write a Q&A..." onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByLabelText('Write a Q&A...'), '   ');
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('sends the trimmed text and clears the input', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<Composer placeholder="Write a Q&A..." onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByLabelText('Write a Q&A...'), '  Any tips?  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('Any tips?'));
    await waitFor(() => expect(screen.getByLabelText('Write a Q&A...').props.value).toBe(''));
  });

  it('keeps the text when sending fails', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('offline'));
    await render(<Composer placeholder="Write a reply..." onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByLabelText('Write a reply...'), 'Thanks!');
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Write a reply...').props.value).toBe('Thanks!');
  });

  it('limits the text to 1000 characters', async () => {
    await render(<Composer placeholder="Write a Q&A..." onSubmit={jest.fn()} />);

    expect(screen.getByLabelText('Write a Q&A...').props.maxLength).toBe(1000);
  });
});
