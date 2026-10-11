import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppError } from '@/lib/appError';
import type { CourseProjectDto, ProjectSubmissionDto } from '@/types/api';

import { ProjectsTab } from './ProjectsTab';

const mockPush = jest.fn();
const mockDownload = jest.fn();
const mockRefetchProject = jest.fn();
const mockRefetchSubmissions = jest.fn();
let mockProject: Record<string, unknown> = {};
let mockSubmissions: Record<string, unknown> = {};
let mockMine: Record<string, unknown> = {};
let mockDownloading: { resourceId: string; percent: number | null } | null = null;

jest.mock('expo-router', () => ({
  router: { push: (href: string) => mockPush(href), back: jest.fn(), canGoBack: () => true },
}));

jest.mock('../hooks', () => ({
  useCourseProject: () => mockProject,
  useLatestSubmissions: () => mockSubmissions,
  useMySubmissions: () => mockMine,
  useResourceDownload: () => ({ download: mockDownload, downloading: mockDownloading }),
}));

const PROJECT: CourseProjectDto = {
  description: 'Culpa aliquip commodo incididunt nostrud aliqua.',
  submissionCount: 12,
  resources: [
    {
      id: 'r1',
      name: 'Document 1.txt',
      fileUrl: 'https://x/d1.txt',
      sizeBytes: 626688,
      mimeType: 'text/plain',
    },
    {
      id: 'r2',
      name: 'Document 2.pdf',
      fileUrl: 'https://x/d2.pdf',
      sizeBytes: 35 * 1024 * 1024,
      mimeType: 'application/pdf',
    },
  ],
};

function makeSubmission(id: string, title: string, author: string): ProjectSubmissionDto {
  return {
    id,
    title,
    description: null,
    imageUrl: null,
    fileUrl: 'https://x/f.zip',
    createdAt: '2026-10-01T00:00:00Z',
    user: { id: `u-${id}`, fullName: author, avatarUrl: null },
    grade: null,
    feedback: null,
    gradedAt: null,
  };
}

function loaded() {
  mockProject = { data: PROJECT, isPending: false, isError: false, refetch: mockRefetchProject };
  mockSubmissions = {
    data: [
      makeSubmission('s1', 'Wireframe', 'Ramono Wultschner'),
      makeSubmission('s2', 'Personal', 'Thomas Carlson'),
    ],
    isPending: false,
    isError: false,
    refetch: mockRefetchSubmissions,
  };
}

describe('ProjectsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDownloading = null;
    mockMine = { data: [] };
    loaded();
  });

  it('opens the submit-project modal from the dashed upload box', async () => {
    await render(<ProjectsTab courseId="c1" />);

    await fireEvent.press(screen.getByRole('button', { name: 'Upload your project here' }));
    expect(mockPush).toHaveBeenCalledWith('/learn/c1/submit-project');
  });

  it('shows the student projects with the submission count and no "View more"', async () => {
    await render(<ProjectsTab courseId="c1" />);

    expect(screen.getByText('12 Student Projects')).toBeOnTheScreen();
    expect(screen.getByText('Wireframe')).toBeOnTheScreen();
    expect(screen.getByText('Thomas Carlson')).toBeOnTheScreen();
    expect(screen.queryByText('View more')).not.toBeOnTheScreen();
  });

  it('shows the project description and the resources with icon label and size', async () => {
    await render(<ProjectsTab courseId="c1" />);

    expect(screen.getByText('Project Description')).toBeOnTheScreen();
    expect(screen.getByText('Resources (2)')).toBeOnTheScreen();
    expect(screen.getByText('Document 1.txt')).toBeOnTheScreen();
    expect(screen.getByText('612 KB')).toBeOnTheScreen();
    expect(screen.getByText('35 MB')).toBeOnTheScreen();
    expect(screen.getByText('.pdf')).toBeOnTheScreen();
  });

  it('downloads a resource when its button is pressed', async () => {
    await render(<ProjectsTab courseId="c1" />);

    await fireEvent.press(screen.getByRole('button', { name: /Download Document 2.pdf/ }));
    expect(mockDownload).toHaveBeenCalledWith(PROJECT.resources[1]);
  });

  it('shows progress on the downloading row and disables the other downloads', async () => {
    mockDownloading = { resourceId: 'r1', percent: 40 };
    await render(<ProjectsTab courseId="c1" />);

    expect(screen.getByText('Downloading 40%')).toBeOnTheScreen();
    expect(screen.getByTestId('resource-spinner')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /Download Document 2.pdf/ })).toBeDisabled();
  });

  it('shows an empty message when nobody has submitted a project', async () => {
    mockSubmissions = { ...mockSubmissions, data: [] };
    mockProject = { ...mockProject, data: { ...PROJECT, submissionCount: 0 } };
    await render(<ProjectsTab courseId="c1" />);

    expect(screen.getByText('0 Student Projects')).toBeOnTheScreen();
    expect(screen.getByText(/No projects yet/)).toBeOnTheScreen();
  });

  it('shows skeletons while loading', async () => {
    mockProject = { data: undefined, isPending: true, isError: false };
    mockSubmissions = { data: undefined, isPending: true, isError: false };
    await render(<ProjectsTab courseId="c1" />);

    expect(screen.getByTestId('projects-skeleton')).toBeOnTheScreen();
  });

  it('lets the user retry the project and the submissions independently', async () => {
    const error = new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'x' });
    mockProject = {
      data: undefined,
      isPending: false,
      isError: true,
      error,
      refetch: mockRefetchProject,
    };
    mockSubmissions = {
      data: undefined,
      isPending: false,
      isError: true,
      refetch: mockRefetchSubmissions,
    };
    await render(<ProjectsTab courseId="c1" />);

    const retries = screen.getAllByRole('button', { name: 'Retry' });
    expect(retries).toHaveLength(2);
    await fireEvent.press(retries[0] as (typeof retries)[number]);
    await fireEvent.press(retries[1] as (typeof retries)[number]);
    expect(mockRefetchSubmissions).toHaveBeenCalled();
    expect(mockRefetchProject).toHaveBeenCalled();
  });

  it('shows the grade and the instructor feedback on the own submission of a student', async () => {
    mockMine = {
      data: [
        {
          ...makeSubmission('s9', 'My landing page', 'Me'),
          grade: 85,
          feedback: 'Nice layout, improve contrast.',
          gradedAt: new Date().toISOString(),
        },
        makeSubmission('s10', 'Draft', 'Me'),
      ],
    };
    await render(<ProjectsTab courseId="c1" />);

    expect(screen.getByText('Your submissions')).toBeOnTheScreen();
    expect(screen.getByText('85/100')).toBeOnTheScreen();
    expect(screen.getByText('Nice layout, improve contrast.')).toBeOnTheScreen();
    expect(screen.getByText('Waiting for the instructor')).toBeOnTheScreen();
  });

  it('hides the "Your submissions" section when the student has none', async () => {
    await render(<ProjectsTab courseId="c1" />);

    expect(screen.queryByText('Your submissions')).not.toBeOnTheScreen();
  });
});
