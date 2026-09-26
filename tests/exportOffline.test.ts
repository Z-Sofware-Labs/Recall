import { describe, it, expect } from 'vitest';
import { generateStandalonePlayerHtml } from '../src/services/standalonePlayerGenerator.ts';
import { ProjectData } from '../src/services/projectService.ts';

describe('Standalone Player Offline Bundle', () => {
  it('generates fully self-contained HTML without external CDNs or Google Fonts', () => {
    const mockProject: ProjectData = {
      id: 'test-proj',
      title: 'Offline Course Test',
      description: 'Course testing offline packaging',
      mediaItems: [
        {
          id: 'media-1',
          name: 'sample.mp4',
          type: 'video',
          url: 'data:video/mp4;base64,AAAA',
        }
      ],
      timeline: [
        {
          timelineId: 'step-1',
          kind: 'media',
          media: {
            id: 'media-1',
            name: 'sample.mp4',
            type: 'video',
            url: 'data:video/mp4;base64,AAAA',
          },
          durationSeconds: 30,
        }
      ],
      quizActivities: [],
      createdAt: Date.now(),
      lastModified: Date.now(),
    };

    const html = generateStandalonePlayerHtml(mockProject);

    // Verify external CDNs and fonts are NOT present
    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toContain('fonts.gstatic.com');
    expect(html).not.toContain('cdn.tailwindcss.com');
    expect(html).not.toContain('unpkg.com');
    expect(html).not.toContain('cdnjs.cloudflare.com');

    // Verify local styling and offline system font stack are embedded
    expect(html).toContain('<style>');
    expect(html).toContain('font-family: -apple-system, BlinkMacSystemFont');
    expect(html).toContain('Offline Course Test');
    expect(html).toContain('id="root"');
  });
});
