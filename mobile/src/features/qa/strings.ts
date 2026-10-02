/** Copy of the Q&A feature (English, matching the design). */
export const QA_STRINGS = {
  questionPlaceholder: 'Write a Q&A...',
  replyPlaceholder: 'Write a reply...',
  send: 'Send',
  noQuestionsTitle: 'No questions yet',
  noQuestionsMessage: 'Ask the first question about this course.',
  noAnswersTitle: 'No replies yet',
  noAnswersMessage: 'Be the first to reply.',
  loadFailed: "Couldn't load the questions",
  loadQuestionFailed: "Couldn't load this question",
  loadAnswersFailed: "Couldn't load the replies",
  questionTitle: 'Question',
  like: 'Like',
  unlike: 'Remove like',
  comments: (count: number) => `${count} Comment`,
  repliesTitle: (count: number) => `${count} ${count === 1 ? 'reply' : 'replies'}`,
} as const;

/** Quick emoji of the composer (PLAN.md SC-15). */
export const QUICK_EMOJIS = ['🙌', '😍', '💖', '👏', '😱', '😂', '🔥'] as const;

/** BR-09: questions and answers have 1-1000 characters. */
export const QA_MAX_LENGTH = 1000;
