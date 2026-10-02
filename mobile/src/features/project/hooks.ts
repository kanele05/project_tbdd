import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { STALE_TIME } from '@/constants/config';
import { queryKeys } from '@/lib/queryKeys';
import type { ProjectSubmissionDto, ResourceDto } from '@/types/api';

import { projectApi, type SubmissionInput } from './api';
import { downloadResource, openDownloadedFile } from './downloadResource';

/** The Projects tab shows at most the 10 newest submissions ("View more" is hidden - PLAN §7.3). */
export const SUBMISSIONS_PREVIEW_LIMIT = 10;

/** `GET /courses/:id/project` (staleTime 5 min). */
export function useCourseProject(courseId: string) {
  return useQuery({
    queryKey: queryKeys.courseProject(courseId),
    queryFn: () => projectApi.detail(courseId),
    staleTime: STALE_TIME.project,
  });
}

/**
 * First page (10 newest) of `GET /courses/:id/submissions`. Uses the infinite-query shape because
 * `queryKeys.courseSubmissions` is documented as an infinite key, but only page 1 is ever fetched.
 */
export function useLatestSubmissions(courseId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.courseSubmissions(courseId),
    queryFn: ({ pageParam }) =>
      projectApi.submissions(courseId, pageParam, SUBMISSIONS_PREVIEW_LIMIT),
    initialPageParam: 1,
    getNextPageParam: () => undefined,
    staleTime: STALE_TIME.submissions,
    select: (data): ProjectSubmissionDto[] =>
      data.pages.flatMap((page) => page.data).slice(0, SUBMISSIONS_PREVIEW_LIMIT),
  });
}

/**
 * `POST /courses/:id/submissions` (multipart) with upload progress (0-100).
 * Success refreshes the submissions list and the project (submission count).
 */
export function useSubmitProject(courseId: string) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const mutation = useMutation<ProjectSubmissionDto, Error, SubmissionInput>({
    mutationFn: (input) => {
      setProgress(0);
      return projectApi.submit(courseId, input, setProgress);
    },
    onSuccess: () => {
      const keys: QueryKey[] = [
        queryKeys.courseSubmissions(courseId),
        queryKeys.courseProject(courseId),
      ];
      for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
    },
  });
  return { submit: mutation.mutateAsync, isPending: mutation.isPending, progress };
}

export type DownloadState = { resourceId: string; percent: number | null } | null;

/**
 * Downloads a resource with `expo-file-system` then opens it with `expo-sharing`.
 * One download at a time; `downloading` drives the spinner of the row being downloaded.
 */
export function useResourceDownload() {
  const toast = useToast();
  const [downloading, setDownloading] = useState<DownloadState>(null);
  const isBusyRef = useRef(false);

  const download = useCallback(
    async (resource: ResourceDto) => {
      if (isBusyRef.current) return;
      isBusyRef.current = true;
      setDownloading({ resourceId: resource.id, percent: null });
      try {
        const uri = await downloadResource(resource, (percent) =>
          setDownloading({ resourceId: resource.id, percent }),
        );
        await openDownloadedFile(uri, resource.mimeType);
      } catch {
        toast.error("Couldn't download this file. Check your connection and try again.");
      } finally {
        isBusyRef.current = false;
        setDownloading(null);
      }
    },
    [toast],
  );

  return { download, downloading };
}
