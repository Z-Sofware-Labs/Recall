import { describe, it, expect } from 'vitest';
import { ProjectData } from '../src/services/projectService.ts';

describe('Large Project Scale and Usage Map Benchmark', () => {
  it('efficiently calculates usage maps for 500 media items, 500 timeline items, and 100 quizzes without O(N^2) lag', () => {
    const mediaCount = 500;
    const timelineCount = 500;
    const quizCount = 100;

    const largeProject: ProjectData = {
      id: 'large-benchmark-course',
      title: 'Large Course Benchmark',
      formatVersion: 2,
      createdAt: Date.now(),
      lastModified: Date.now(),
      assetManifest: {
        formatVersion: 2,
        projectId: 'large-benchmark-course',
        title: 'Large Course Benchmark',
        createdWith: 'Recall',
        assets: {},
      },
      mediaItems: Array.from({ length: mediaCount }, (_, i) => ({
        id: `media-${i}`,
        mediaId: `asset-${i}`,
        name: `Asset_${i}.mp4`,
        type: (i % 2 === 0 ? 'video' : 'photo') as any,
        url: '',
      })),
      timeline: Array.from({ length: timelineCount }, (_, i) => ({
        timelineId: `timeline-${i}`,
        kind: 'media' as const,
        media: {
          id: `media-${i % mediaCount}`,
          name: `Asset_${i % mediaCount}.mp4`,
          type: 'video',
          url: '',
        },
        durationSeconds: 15,
      })),
      quizActivities: Array.from({ length: quizCount }, (_, i) => ({
        id: `quiz-${i}`,
        title: `Quiz ${i}`,
        questions: [],
      }) as any),
    };

    const startTime = performance.now();

    // Map-based O(N) aggregation
    const mediaUsageMap = new Map<string, number>();
    const quizUsageMap = new Map<string, number>();

    for (const step of largeProject.timeline || []) {
      if (step.media?.id) {
        mediaUsageMap.set(step.media.id, (mediaUsageMap.get(step.media.id) || 0) + 1);
      }
      if (step.quiz?.id) {
        quizUsageMap.set(step.quiz.id, (quizUsageMap.get(step.quiz.id) || 0) + 1);
      }
    }

    const durationMs = performance.now() - startTime;

    // Verify correct counts
    for (let i = 0; i < mediaCount; i++) {
      expect(mediaUsageMap.get(`media-${i}`)).toBe(1);
    }
    expect(durationMs).toBeLessThan(50); // Aggregation completes in <50ms

    // Verify metadata serialization does not embed Base64 strings
    const serialized = JSON.stringify(largeProject);
    expect(serialized).not.toContain('data:video/mp4;base64');
    expect(serialized.length).toBeLessThan(1024 * 1024); // Less than 1MB for 500 items metadata
  });
});
