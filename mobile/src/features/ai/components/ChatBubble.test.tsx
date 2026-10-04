import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { AI_CHAT_MAX_LENGTH } from '../chatConfig';
import { ChatBubble } from './ChatBubble';
import { TutorComposer } from './TutorComposer';

describe('ChatBubble', () => {
  it('shows the Markdown of an answer as styled text, without the markers', async () => {
    await render(
      <ChatBubble
        role="assistant"
        text={'## Hooks\nUse **useState** for `state`.\n- first\n- second'}
      />,
    );

    expect(screen.getByText('Hooks')).toBeOnTheScreen();
    expect(screen.getByText('useState')).toBeOnTheScreen();
    expect(screen.getByText('state')).toBeOnTheScreen();
    expect(screen.queryByText(/\*\*/)).not.toBeOnTheScreen();
    expect(screen.getAllByText('•')).toHaveLength(2);
  });

  it('gives a screen reader one plain-text label for the whole reply', async () => {
    await render(<ChatBubble role="assistant" text={'Use **useState** here'} />);

    expect(screen.getByLabelText('AI Tutor said: Use useState here')).toBeOnTheScreen();
  });

  it('labels the user message as coming from the user', async () => {
    await render(<ChatBubble role="user" text="Why?" />);

    expect(screen.getByLabelText('You said: Why?')).toBeOnTheScreen();
  });

  it('shows the typing indicator while nothing has arrived and a cursor once text does', async () => {
    const { rerender } = await render(<ChatBubble role="assistant" text="" isStreaming />);
    expect(screen.getByText('AI Tutor is writing...')).toBeOnTheScreen();

    await rerender(<ChatBubble role="assistant" text="Hel" isStreaming />);
    expect(screen.queryByText('AI Tutor is writing...')).not.toBeOnTheScreen();
    expect(screen.getByText(/▍/)).toBeOnTheScreen();

    await rerender(<ChatBubble role="assistant" text="Hello" />);
    expect(screen.queryByText(/▍/)).not.toBeOnTheScreen();
  });
});

describe('TutorComposer', () => {
  const onSend = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    onSend.mockResolvedValue(true);
  });

  it('keeps Send disabled until there is text', async () => {
    await render(<TutorComposer onSend={onSend} isBusy={false} cooldownSec={0} />);
    expect(screen.getByTestId('tutor-send')).toBeDisabled();

    await fireEvent.changeText(screen.getByTestId('tutor-input'), '   ');
    expect(screen.getByTestId('tutor-send')).toBeDisabled();

    await fireEvent.changeText(screen.getByTestId('tutor-input'), 'Hi');
    expect(screen.getByTestId('tutor-send')).toBeEnabled();
  });

  it('limits the field to 1000 characters', async () => {
    await render(<TutorComposer onSend={onSend} isBusy={false} cooldownSec={0} />);

    expect(screen.getByTestId('tutor-input').props.maxLength).toBe(AI_CHAT_MAX_LENGTH);
  });

  it('shows a character counter close to the limit', async () => {
    await render(<TutorComposer onSend={onSend} isBusy={false} cooldownSec={0} />);
    expect(screen.queryByText(/\/1000/)).not.toBeOnTheScreen();

    await fireEvent.changeText(screen.getByTestId('tutor-input'), 'x'.repeat(850));

    expect(screen.getByText('850/1000')).toBeOnTheScreen();
  });

  it('empties the field after a message was accepted', async () => {
    await render(<TutorComposer onSend={onSend} isBusy={false} cooldownSec={0} />);

    await fireEvent.changeText(screen.getByTestId('tutor-input'), 'Hello');
    await fireEvent.press(screen.getByTestId('tutor-send'));

    expect(onSend).toHaveBeenCalledWith('Hello');
    await waitFor(() => expect(screen.getByTestId('tutor-input').props.value).toBe(''));
  });

  it('keeps the text when the message could not be sent', async () => {
    onSend.mockResolvedValue(false);
    await render(<TutorComposer onSend={onSend} isBusy={false} cooldownSec={0} />);

    await fireEvent.changeText(screen.getByTestId('tutor-input'), 'Hello');
    await fireEvent.press(screen.getByTestId('tutor-send'));

    await waitFor(() => expect(screen.getByTestId('tutor-input').props.value).toBe('Hello'));
  });

  it('does not send while an answer is streaming, but still lets the user type', async () => {
    await render(<TutorComposer onSend={onSend} isBusy cooldownSec={0} />);

    await fireEvent.changeText(screen.getByTestId('tutor-input'), 'Next question');
    await fireEvent.press(screen.getByTestId('tutor-send'));

    expect(screen.getByTestId('tutor-input').props.value).toBe('Next question');
    expect(onSend).not.toHaveBeenCalled();
  });

  it('says how long to wait during a rate limit and blocks sending', async () => {
    await render(<TutorComposer onSend={onSend} isBusy={false} cooldownSec={7} />);

    await fireEvent.changeText(screen.getByTestId('tutor-input'), 'Hello');

    expect(screen.getByText('You can ask again in 7 s')).toBeOnTheScreen();
    expect(screen.getByTestId('tutor-send')).toBeDisabled();
  });

  it('shows the AI disclaimer', async () => {
    await render(<TutorComposer onSend={onSend} isBusy={false} cooldownSec={0} />);

    expect(
      screen.getByText('AI can make mistakes. Double-check important information.'),
    ).toBeOnTheScreen();
  });
});
