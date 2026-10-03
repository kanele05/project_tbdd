import { router } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, ErrorState, Skeleton } from '@/components/ui';
import { ExpandableText } from '@/features/course/components/ExpandableText';
import { spacing } from '@/theme';
import type { ResourceDto } from '@/types/api';

import { useCourseProject, useLatestSubmissions, useResourceDownload } from '../hooks';
import { ResourceItem } from './ResourceItem';
import { StudentProjectsSection } from './StudentProjectsSection';
import { UploadBox } from './UploadBox';

export type ProjectsTabProps = {
  courseId: string;
};

function ProjectsSkeleton() {
  return (
    <View style={styles.section} testID="projects-skeleton">
      <Skeleton width="45%" height={20} />
      <Skeleton height={14} />
      <Skeleton height={14} />
      <Skeleton width="70%" height={14} />
      <Skeleton width="35%" height={20} style={styles.skeletonGap} />
      <Skeleton height={64} />
    </View>
  );
}

/**
 * Projects tab of the Learning screen (SC-15): upload box, student projects, project description
 * and downloadable resources. The parent screen provides the horizontal padding and the scrolling.
 */
export function ProjectsTab({ courseId }: ProjectsTabProps) {
  const project = useCourseProject(courseId);
  const submissions = useLatestSubmissions(courseId);
  const { download, downloading } = useResourceDownload();

  const handleUpload = useCallback(() => {
    router.push(`/learn/${courseId}/submit-project`);
  }, [courseId]);
  const handleRetryProject = useCallback(() => void project.refetch(), [project]);
  const handleRetrySubmissions = useCallback(() => void submissions.refetch(), [submissions]);
  const handleDownload = useCallback(
    (resource: ResourceDto) => void download(resource),
    [download],
  );

  const data = project.data;
  let projectBody;
  if (data) {
    projectBody = (
      <>
        <View style={styles.section}>
          <AppText variant="title" accessibilityRole="header">
            Project Description
          </AppText>
          <ExpandableText text={data.description} />
        </View>
        <View style={styles.section}>
          <AppText variant="title" accessibilityRole="header">
            {`Resources (${data.resources.length})`}
          </AppText>
          {data.resources.length === 0 ? (
            <AppText variant="body" color="textSecondary">
              No resources for this project.
            </AppText>
          ) : (
            data.resources.map((resource) => (
              <ResourceItem
                key={resource.id}
                resource={resource}
                isDownloading={downloading?.resourceId === resource.id}
                percent={downloading?.resourceId === resource.id ? downloading.percent : null}
                isDisabled={downloading !== null}
                onDownload={handleDownload}
              />
            ))
          )}
        </View>
      </>
    );
  } else if (project.isError) {
    projectBody = <ErrorState error={project.error} onRetry={handleRetryProject} />;
  } else {
    projectBody = <ProjectsSkeleton />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <AppText variant="title" accessibilityRole="header">
          Upload your project
        </AppText>
        <UploadBox onPress={handleUpload} />
      </View>
      <StudentProjectsSection
        count={data?.submissionCount ?? submissions.data?.length ?? 0}
        submissions={submissions.data}
        isLoading={submissions.isPending}
        isError={submissions.isError}
        onRetry={handleRetrySubmissions}
      />
      {projectBody}
    </View>
  );
}

const styles = StyleSheet.create({
  // Design: 32 dp between sections, 12 dp under each heading. The Learning screen already pads the
  // tab content by 8 dp, so +8 here gives the 16 dp the design leaves under the tab bar.
  container: { gap: spacing.xxxl, paddingTop: spacing.sm },
  section: { gap: spacing.md },
  skeletonGap: { marginTop: spacing.lg },
});
