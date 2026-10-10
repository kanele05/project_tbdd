import { fireEvent, render, screen, within } from '@testing-library/react-native';

import { lightPalette } from '@/theme';
import type { CurriculumSection } from '@/types/api';

import { CurriculumList } from './CurriculumList';

const SECTIONS: CurriculumSection[] = [
  {
    id: 'section-1',
    title: 'I - Introduction',
    order: 1,
    lessons: [
      {
        id: 'lesson-1',
        number: 1,
        title: 'Amet adipisicing consectetur',
        durationSec: 83,
        isPreview: true,
        status: 'COMPLETED',
      },
      {
        id: 'lesson-2',
        number: 2,
        title: 'Adipisicing dolor amet occaeca',
        durationSec: 83,
        isPreview: false,
        status: 'IN_PROGRESS',
      },
    ],
  },
  {
    id: 'section-2',
    title: 'III - Plan for your UX Research',
    order: 2,
    lessons: [
      {
        id: 'lesson-3',
        number: 3,
        title: 'Exercitation elit incididunt esse',
        durationSec: 83,
        isPreview: false,
        status: 'UNLOCKED',
      },
      {
        id: 'lesson-4',
        number: 4,
        title: 'Duis esse ipsum laboru',
        durationSec: 3725,
        isPreview: false,
        status: 'LOCKED',
      },
    ],
  },
  {
    id: 'section-3',
    title: 'IV - Articulate findings',
    order: 3,
    lessons: [
      {
        id: 'lesson-5',
        number: 5,
        title: 'Labore minim reprehenderit',
        durationSec: 120,
        isPreview: false,
        status: 'LOCKED',
      },
    ],
  },
];

describe('CurriculumList', () => {
  it('renders the four lesson states of BR-02 with number, title and duration', async () => {
    await render(<CurriculumList sections={SECTIONS} onLessonPress={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'III - Plan for your UX Research' }));

    const completed = screen.getByTestId('lesson-row-lesson-1');
    expect(within(completed).getByText('01')).toBeOnTheScreen();
    expect(within(completed).getByText('Amet adipisicing consectetur')).toBeOnTheScreen();
    expect(within(completed).getByText('1 min 23 secs')).toBeOnTheScreen();
    expect(within(completed).getByTestId('lesson-status-COMPLETED')).toBeOnTheScreen();

    const inProgress = screen.getByTestId('lesson-row-lesson-2');
    expect(within(inProgress).getByTestId('lesson-status-IN_PROGRESS')).toBeOnTheScreen();

    const unlocked = screen.getByTestId('lesson-row-lesson-3');
    expect(within(unlocked).getByTestId('lesson-status-UNLOCKED')).toBeOnTheScreen();

    const locked = screen.getByTestId('lesson-row-lesson-4');
    expect(within(locked).getByTestId('lesson-status-LOCKED')).toBeOnTheScreen();
    expect(within(locked).getByText('1 hr 2 mins')).toBeOnTheScreen();
  });

  it('highlights the IN_PROGRESS lesson with the primarySoft fill and accent border', async () => {
    await render(<CurriculumList sections={SECTIONS} onLessonPress={jest.fn()} />);

    expect(screen.getByTestId('lesson-row-lesson-2')).toHaveStyle({
      backgroundColor: lightPalette.primarySoft,
      borderColor: lightPalette.primaryText,
    });
    expect(screen.getByTestId('lesson-row-lesson-1')).not.toHaveStyle({
      backgroundColor: lightPalette.primarySoft,
    });
  });

  it('highlights the lesson given by activeLessonId instead (Learning screen)', async () => {
    await render(
      <CurriculumList sections={SECTIONS} activeLessonId="lesson-1" onLessonPress={jest.fn()} />,
    );

    expect(screen.getByTestId('lesson-row-lesson-1')).toHaveStyle({
      backgroundColor: lightPalette.primarySoft,
    });
    expect(screen.getByTestId('lesson-row-lesson-2')).not.toHaveStyle({
      backgroundColor: lightPalette.primarySoft,
    });
  });

  it('opens the first chapter and the chapter of the highlighted lesson only', async () => {
    await render(<CurriculumList sections={SECTIONS} onLessonPress={jest.fn()} />);

    expect(screen.getByTestId('lesson-row-lesson-1')).toBeOnTheScreen();
    expect(screen.queryByTestId('lesson-row-lesson-3')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('lesson-row-lesson-5')).not.toBeOnTheScreen();
  });

  it('expands and collapses a chapter', async () => {
    await render(<CurriculumList sections={SECTIONS} onLessonPress={jest.fn()} />);
    const header = screen.getByRole('button', { name: 'IV - Articulate findings' });

    await fireEvent.press(header);
    expect(screen.getByTestId('lesson-row-lesson-5')).toBeOnTheScreen();

    await fireEvent.press(header);
    expect(screen.queryByTestId('lesson-row-lesson-5')).not.toBeOnTheScreen();
  });

  it('reports the pressed lesson', async () => {
    const onLessonPress = jest.fn();
    await render(<CurriculumList sections={SECTIONS} onLessonPress={onLessonPress} />);

    await fireEvent.press(screen.getByTestId('lesson-row-lesson-1'));

    expect(onLessonPress).toHaveBeenCalledWith(SECTIONS[0]?.lessons[0]);
  });

  it('describes each row to screen readers, including its state', async () => {
    await render(<CurriculumList sections={SECTIONS} onLessonPress={jest.fn()} />);

    expect(
      screen.getByRole('button', {
        name: 'Lesson 2, Adipisicing dolor amet occaeca, 1 min 23 secs, in progress',
      }),
    ).toBeOnTheScreen();
  });

  it('opens the chapter of a lesson that becomes highlighted later (next lesson plays)', async () => {
    const { rerender } = await render(
      <CurriculumList sections={SECTIONS} activeLessonId="lesson-1" onLessonPress={jest.fn()} />,
    );
    expect(screen.queryByTestId('lesson-row-lesson-3')).not.toBeOnTheScreen();

    await rerender(
      <CurriculumList sections={SECTIONS} activeLessonId="lesson-3" onLessonPress={jest.fn()} />,
    );

    expect(screen.getByTestId('lesson-row-lesson-3')).toBeOnTheScreen();
  });
});
