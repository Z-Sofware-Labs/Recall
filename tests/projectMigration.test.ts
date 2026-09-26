import { describe, it, expect } from 'vitest';
import { migrateV1ToV2, CURRENT_PROJECT_FORMAT_VERSION } from '../src/services/projectService.ts';

describe('Project Migration (V1 to V2)', () => {
  it('detects V1 projects with embedded Base64 media and migrates to V2', () => {
    const v1Project = {
      id: 'proj-123',
      title: 'Legacy V1 Course',
      description: 'Course with embedded Base64 media',
      mediaItems: [
        {
          id: 'item-1',
          name: 'sample_video.mp4',
          type: 'video',
          url: 'data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29t',
          size: 24,
        },
        {
          id: 'item-2',
          name: 'sample_image.png',
          type: 'photo',
          url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          size: 69,
        }
      ],
      timeline: [
        {
          id: 't-1',
          type: 'media',
          media: {
            id: 'item-1',
            name: 'sample_video.mp4',
            url: 'data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29t',
          },
          duration: 10,
        }
      ],
      quizActivities: [],
      createdAt: Date.now(),
      lastModified: Date.now(),
    };

    const v2Project = migrateV1ToV2(v1Project);

    expect(v2Project.formatVersion).toBe(CURRENT_PROJECT_FORMAT_VERSION);
    expect(v2Project.formatVersion).toBe(2);
    expect(v2Project.assetManifest).toBeDefined();
    expect(v2Project.assetManifest?.formatVersion).toBe(2);
    expect(Object.keys(v2Project.assetManifest?.assets || {}).length).toBe(2);

    // Verify that the media item was transformed with stable asset references
    const migratedItem1 = v2Project.mediaItems.find(m => m.id === 'item-1');
    expect(migratedItem1).toBeDefined();
    expect(migratedItem1?.mediaId).toBe('item-1');
    expect(v2Project.assetManifest?.assets['item-1']).toBeDefined();

    // Verify timeline item reference was preserved and updated
    const timelineStep = v2Project.timeline?.[0];
    expect(timelineStep?.media?.mediaId).toBe('item-1');
  });

  it('preserves already-migrated V2 projects without re-migrating', () => {
    const v2Project = {
      formatVersion: 2,
      assetManifest: {
        formatVersion: 2,
        projectId: 'proj-v2',
        title: 'Native V2 Course',
        createdWith: 'Recall',
        assets: {
          'asset-existing': {
            mediaId: 'asset-existing',
            name: 'existing.mp4',
            type: 'video' as const,
            mimeType: 'video/mp4',
            sizeBytes: 1024,
          }
        }
      },
      id: 'proj-v2',
      title: 'Native V2 Course',
      mediaItems: [
        {
          id: 'item-v2',
          mediaId: 'asset-existing',
          name: 'existing.mp4',
          type: 'video' as const,
          url: '',
        }
      ],
      timeline: [],
      quizActivities: [],
      createdAt: Date.now(),
      lastModified: Date.now(),
    };

    const project = migrateV1ToV2(v2Project);
    expect(project.formatVersion).toBe(2);
    expect(project.mediaItems[0].mediaId).toBe('asset-existing');
    expect(project.assetManifest?.assets['asset-existing'].name).toBe('existing.mp4');
  });
});
