import { ProjectData } from './projectService';
import { ExportCourseOptions } from './exportService';
import { STANDALONE_PLAYER_BUNDLE_JS } from './playerBundle.generated';

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeMediaUrlForStandalone(url?: string): string {
  if (!url) return '';
  const raw = String(url).trim();
  if (raw.startsWith('data:') || raw.startsWith('blob:') || /^https?:\/\//i.test(raw)) {
    return raw;
  }
  return '';
}

/**
 * Generate a complete, standalone, self-contained HTML5 Player for the given course
 * Powered directly by the compiled React CoursePlayerEngine.
 */
export function generateStandalonePlayerHtml(
  project: ProjectData,
  options: ExportCourseOptions = {}
): string {
  const courseTitle = project.title || 'Interactive Course';

  const clonedProject: ProjectData = JSON.parse(JSON.stringify(project));
  if (clonedProject.mediaItems) {
    clonedProject.mediaItems.forEach(m => {
      if (m.url) m.url = sanitizeMediaUrlForStandalone(m.url);
      if ((m as any).src) (m as any).src = sanitizeMediaUrlForStandalone((m as any).src);
    });
  }
  if (clonedProject.timeline) {
    clonedProject.timeline.forEach(item => {
      if (item.media) {
        if (item.media.url) item.media.url = sanitizeMediaUrlForStandalone(item.media.url);
        if ((item.media as any).src) (item.media as any).src = sanitizeMediaUrlForStandalone((item.media as any).src);
      }
    });
  }
  if (clonedProject.quizActivities) {
    clonedProject.quizActivities.forEach(q => {
      if (q.data?.clickAnImage?.imageUrl) {
        q.data.clickAnImage.imageUrl = sanitizeMediaUrlForStandalone(q.data.clickAnImage.imageUrl);
      }
    });
  }

  const serializedProject = JSON.stringify(clonedProject).replace(/</g, '\\u003c');
  const initialTheme = options.theme || 'auto';

  return `<!DOCTYPE html>
<html lang="en" style="height: 100%; min-height: 100dvh;">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="mobile-web-app-capable" content="yes">
  <title>${escapeHtml(courseTitle)} - Learner Player</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
            serif: ['"Playfair Display"', 'Georgia', 'serif'],
          }
        }
      }
    };
    (function() {
      var pref = '${initialTheme}';
      var isDark = pref === 'dark' || ((pref === 'auto' || pref === 'device') ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) : pref !== 'light');
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    })();
  </script>
  <style>
    * {
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }
    html, body, #root {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      user-select: none;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(15, 23, 42, 0.6);
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #475569;
    }
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: #ffffff !important;
      }
      body * {
        visibility: hidden !important;
      }
      #printable-certificate, #printable-certificate * {
        visibility: visible !important;
      }
    }
  </style>
</head>
<body class="flex flex-col h-full w-full overflow-hidden transition-colors">
  <div id="root" class="flex flex-col h-full w-full overflow-hidden"></div>
  <script>
    window.__RECALL_COURSE_DATA__ = ${serializedProject};
    window.__RECALL_INITIAL_THEME__ = '${initialTheme}';
  </script>
  <script>
    ${STANDALONE_PLAYER_BUNDLE_JS}
  </script>
</body>
</html>`;
}
