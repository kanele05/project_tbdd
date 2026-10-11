import { useCallback, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent, ScrollView } from 'react-native';

import type { SegmentedTab } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { spacing } from '@/theme';

export type CourseTab = 'overview' | 'lessons' | 'reviews';

/** Gap kept above the AI block when the AI button scrolls to it. */
const AI_SCROLL_MARGIN = spacing.lg;

export type UseCourseTabsOptions = {
  /** Height of something fixed over the top of the scroll area (the PC nav bar). Default 0. */
  topClearance?: number;
};

/**
 * Tab state of the course details plus the AI-summary request and the scroll that takes the AI
 * button to the AI block. Phone and PC bodies share it: the PC body also reports where its columns
 * start in the scroll content (`handleBaseLayout`) and where the tabs column starts inside them
 * (`handleMainLayout`), because the tabs are not at the top of the scroll content there.
 */
export function useCourseTabs({ topClearance = 0 }: UseCourseTabsOptions = {}) {
  const { t } = useTranslation('course');
  const [activeTab, setActiveTab] = useState<CourseTab>('overview');
  const [isAiRequested, setIsAiRequested] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const baseY = useRef(0);
  const mainY = useRef(0);
  const tabContentY = useRef(0);
  const aiY = useRef<number | null>(null);
  const isScrollToAiPending = useRef(false);

  const tabs = useMemo<readonly SegmentedTab<CourseTab>[]>(
    () => [
      { key: 'overview', label: t('tabs.overview') },
      { key: 'lessons', label: t('tabs.lessons') },
      { key: 'reviews', label: t('tabs.reviews') },
    ],
    [t],
  );

  const scrollToAi = useCallback(() => {
    if (aiY.current === null) return;
    isScrollToAiPending.current = false;
    scrollRef.current?.scrollTo({
      y: Math.max(
        0,
        baseY.current +
          mainY.current +
          tabContentY.current +
          aiY.current -
          AI_SCROLL_MARGIN -
          topClearance,
      ),
      animated: true,
    });
  }, [topClearance]);
  const handleAiLayout = useCallback(
    (y: number) => {
      aiY.current = y;
      if (isScrollToAiPending.current) scrollToAi();
    },
    [scrollToAi],
  );
  const handleTabContentLayout = useCallback((event: LayoutChangeEvent) => {
    tabContentY.current = event.nativeEvent.layout.y;
  }, []);
  const handleBaseLayout = useCallback((event: LayoutChangeEvent) => {
    baseY.current = event.nativeEvent.layout.y;
  }, []);
  const handleMainLayout = useCallback((event: LayoutChangeEvent) => {
    mainY.current = event.nativeEvent.layout.y;
  }, []);
  const handleChangeTab = useCallback((tab: CourseTab) => {
    aiY.current = null;
    setActiveTab(tab);
  }, []);
  const handleRequestAi = useCallback(() => setIsAiRequested(true), []);
  const handleAskAi = useCallback(() => {
    setIsAiRequested(true);
    isScrollToAiPending.current = true;
    if (activeTab === 'overview') scrollToAi();
    else handleChangeTab('overview');
  }, [activeTab, handleChangeTab, scrollToAi]);

  return {
    tabs,
    activeTab,
    isAiRequested,
    scrollRef,
    handleChangeTab,
    handleRequestAi,
    handleAskAi,
    handleAiLayout,
    handleTabContentLayout,
    handleBaseLayout,
    handleMainLayout,
  };
}
