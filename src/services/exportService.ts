import { invoke } from '@tauri-apps/api/core';
import { openPath } from '@tauri-apps/plugin-opener';
import { save } from '@tauri-apps/plugin-dialog';
import JSZip from 'jszip';
import { ProjectData, getDefaultProjectDirectory } from './projectService';
import { generateStandalonePlayerHtml } from './standalonePlayerGenerator';

export interface ExportCourseOptions {
  theme?: 'dark' | 'light' | 'auto';
  allowFreeNavigation?: boolean;
  showCertificate?: boolean;
  passThresholdDefault?: number;
}

/**
 * Helper to convert any URL or path into a canonical local Windows / OS filesystem path
 */
export function extractLocalFilesystemPath(pathOrUrl?: string): string | null {
  if (!pathOrUrl) return null;
  let raw = String(pathOrUrl).trim();
  
  if (raw.startsWith('data:') || raw.startsWith('blob:')) {
    return null;
  }
  if (/^https?:\/\/(?!asset\.localhost)/i.test(raw)) {
    return null;
  }

  // Strip Tauri asset protocols if present
  raw = raw.replace(/^https?:\/\/asset\.localhost\//i, '');
  raw = raw.replace(/^asset:\/\/localhost\//i, '');
  raw = raw.replace(/^asset:\/\//i, '');
  raw = raw.replace(/^tauri:\/\/localhost\//i, '');
  raw = raw.replace(/^tauri:\/\//i, '');

  // Strip file:/// or file://
  if (raw.startsWith('file:///')) {
    raw = raw.substring(8);
  } else if (raw.startsWith('file://')) {
    raw = raw.substring(7);
  }

  // Decode URI component (e.g. %20 -> space, %3A -> :)
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  // If path starts with /C:/ on Windows (from file:///C:/...), strip leading /
  if (/^\/[a-zA-Z]:/.test(decoded)) {
    decoded = decoded.substring(1);
  }

  return decoded;
}

/**
 * Resolves and embeds a media item as Base64 data URL
 */
async function resolveMediaItem(mediaItem: any, contextName: string): Promise<void> {
  if (!mediaItem) return;
  if (typeof mediaItem.url === 'string' && mediaItem.url.startsWith('data:')) {
    // Already embedded as base64 - strip machine-specific local paths from export clone
    delete mediaItem.filePath;
    delete mediaItem.path;
    return;
  }

  // Prefer mediaItem.filePath when available, fallback to extracting local path from url
  const targetPath = mediaItem.filePath || extractLocalFilesystemPath(mediaItem.url);

  if (!targetPath) {
    // If it is a remote web URL (https://) or empty, nothing to embed
    return;
  }

  try {
    const dataUrl = await invoke<string>('load_media_data_url', { filePath: targetPath });
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      throw new Error(`Invalid data URL returned by load_media_data_url (received ${typeof dataUrl})`);
    }
    mediaItem.url = dataUrl;
    delete mediaItem.filePath;
    delete mediaItem.path;
  } catch (err: any) {
    const mediaName = mediaItem.name || mediaItem.title || contextName || 'Media File';
    const errorMsg = err?.message || String(err);
    throw new Error(
      `Could not embed "${mediaName}" into the exported course.\n\nFile:\n${targetPath}\n\nThe export was stopped because the media could not be embedded.\n\nOriginal error:\n${errorMsg}`
    );
  }
}

/**
 * Prepares project for export by embedding all media (videos & images) as base64 data URLs
 */
export async function prepareProjectForExport(project: ProjectData): Promise<ProjectData> {
  // 1. Deep clone project to never mutate the original project
  const cloned: ProjectData = JSON.parse(JSON.stringify(project));

  // 2. Resolve mediaItems
  if (Array.isArray(cloned.mediaItems)) {
    for (let i = 0; i < cloned.mediaItems.length; i++) {
      const item = cloned.mediaItems[i];
      await resolveMediaItem(item, item.name || `Media Item ${i + 1}`);
    }
  }

  // 3. Resolve timeline items
  if (Array.isArray(cloned.timeline)) {
    for (let i = 0; i < cloned.timeline.length; i++) {
      const step = cloned.timeline[i];
      if (step.media) {
        const stepTitle = step.media.name || (step as any).title || `Slide ${i + 1} Media`;
        await resolveMediaItem(step.media, stepTitle);
      }
    }
  }

  // 4. Resolve quiz activities images (e.g. clickAnImage)
  if (Array.isArray(cloned.quizActivities)) {
    for (let i = 0; i < cloned.quizActivities.length; i++) {
      const quiz = cloned.quizActivities[i];
      if (quiz.data?.clickAnImage?.imageUrl) {
        const fakeMedia = { url: quiz.data.clickAnImage.imageUrl, name: `${quiz.name || 'Quiz'} Hotspot Image` };
        await resolveMediaItem(fakeMedia, `${quiz.name || 'Quiz'} Hotspot Image`);
        quiz.data.clickAnImage.imageUrl = fakeMedia.url;
      }
    }
  }

  // 5. Attach certificate if not already present
  if (!cloned.certificate) {
    try {
      const saved = localStorage.getItem(`recall_certificate_${project.id || 'default'}`) || localStorage.getItem('recall_certificate_default');
      if (saved) {
        cloned.certificate = JSON.parse(saved);
      }
    } catch {}
  }

  return cloned;
}

/**
 * Asserts that the prepared project contains no remaining local filesystem paths or file:// URLs.
 */
export function assertNoLocalFileUrls(project: ProjectData): void {
  const isLocalUrl = (url?: string): boolean => {
    if (!url) return false;
    const trimmed = url.trim();
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return false;
    if (/^https?:\/\/(?!asset\.localhost)/i.test(trimmed)) return false;
    if (/^file:\/\//i.test(trimmed)) return true;
    if (/^[a-zA-Z]:[\\\/]/.test(trimmed)) return true;
    if (/^https?:\/\/asset\.localhost/i.test(trimmed)) return true;
    if (/^asset:\/\//i.test(trimmed)) return true;
    if (/^tauri:\/\//i.test(trimmed)) return true;
    return false;
  };

  if (Array.isArray(project.mediaItems)) {
    for (const item of project.mediaItems) {
      if (item.url && (item.url.startsWith('data:') || item.url.startsWith('blob:'))) {
        delete item.filePath;
        delete (item as any).path;
      }
      if (isLocalUrl(item.url) || isLocalUrl(item.filePath)) {
        throw new Error(
          `Export validation failed: A local filesystem media reference (${item.filePath || item.url}) remains in mediaItems["${item.name || item.id}"]. All local media must be embedded as base64 before export.`
        );
      }
    }
  }

  if (Array.isArray(project.timeline)) {
    for (const step of project.timeline) {
      if (step.media) {
        if (step.media.url && (step.media.url.startsWith('data:') || step.media.url.startsWith('blob:'))) {
          delete step.media.filePath;
          delete (step.media as any).path;
        }
        if (isLocalUrl(step.media.url) || isLocalUrl(step.media.filePath)) {
          const stepTitle = step.media.name || (step as any).title || step.timelineId;
          throw new Error(
            `Export validation failed: A local filesystem media reference (${step.media.filePath || step.media.url}) remains in timeline slide "${stepTitle}". All local media must be embedded as base64 before export.`
          );
        }
      }
    }
  }

  if (Array.isArray(project.quizActivities)) {
    for (const quiz of project.quizActivities) {
      if (quiz.data?.clickAnImage?.imageUrl && isLocalUrl(quiz.data.clickAnImage.imageUrl)) {
        throw new Error(
          `Export validation failed: A local filesystem image reference (${quiz.data.clickAnImage.imageUrl}) remains in quiz "${quiz.name || quiz.id}". All local media must be embedded as base64 before export.`
        );
      }
    }
  }
}

/**
 * Exports the project to a single self-contained offline HTML file
 */
export async function exportCourseToSingleHtml(
  project: ProjectData,
  options: ExportCourseOptions = {}
): Promise<{ success: boolean; filePath: string } | null> {
  const defaultDir = await getDefaultProjectDirectory();
  const safeTitle = (project.title || 'Course').replace(/[/\\?%*:|"<>]/g, '_');
  const defaultFileName = `${safeTitle}.html`;
  const defaultPath = defaultDir ? `${defaultDir.replace(/[\\/]$/, '')}/${defaultFileName}` : defaultFileName;

  const selected = await save({
    defaultPath,
    filters: [
      {
        name: 'Single-File Webpage (*.html)',
        extensions: ['html', 'htm'],
      },
    ],
  });

  if (!selected) return null;
  const targetPath = typeof selected === 'string' ? selected : (selected as any).path || selected;
  if (!targetPath) return null;

  const preparedProject = await prepareProjectForExport(project);
  assertNoLocalFileUrls(preparedProject);
  const htmlContent = generateStandalonePlayerHtml(preparedProject, options);

  await invoke<boolean>('save_project_file', {
    filePath: targetPath,
    content: htmlContent,
  });

  return { success: true, filePath: targetPath };
}

/**
 * Exports the project to a distributable Web Package (.zip) for hosting on websites, school intranets, or LMS
 */
export async function exportCourseToWebZip(
  project: ProjectData,
  options: ExportCourseOptions = {}
): Promise<{ success: boolean; filePath: string } | null> {
  const defaultDir = await getDefaultProjectDirectory();
  const safeTitle = (project.title || 'Course').replace(/[/\\?%*:|"<>]/g, '_');
  const defaultFileName = `${safeTitle}_web_package.zip`;
  const defaultPath = defaultDir ? `${defaultDir.replace(/[\\/]$/, '')}/${defaultFileName}` : defaultFileName;

  const selected = await save({
    defaultPath,
    filters: [
      {
        name: 'Web Package Archive (*.zip)',
        extensions: ['zip'],
      },
    ],
  });

  if (!selected) return null;
  const targetPath = typeof selected === 'string' ? selected : (selected as any).path || selected;
  if (!targetPath) return null;

  const preparedProject = await prepareProjectForExport(project);
  assertNoLocalFileUrls(preparedProject);
  const htmlContent = generateStandalonePlayerHtml(preparedProject, options);

  const zip = new JSZip();
  zip.file('index.html', htmlContent);
  zip.file(
    'course_data.json',
    JSON.stringify(
      {
        title: preparedProject.title,
        id: preparedProject.id,
        createdAt: preparedProject.createdAt,
        lastModified: preparedProject.lastModified,
        timeline: preparedProject.timeline,
        quizActivities: preparedProject.quizActivities,
        mediaCount: preparedProject.mediaItems?.length || 0,
      },
      null,
      2
    )
  );
  zip.file(
    'README.txt',
    `=== ${project.title || 'Recall Course'} Web Package ===\n\n` +
      `HOW TO RUN OFFLINE:\n` +
      `1. Double-click "index.html" in this folder.\n` +
      `2. The course will open and run completely locally in your default web browser.\n\n` +
      `HOW TO HOST ONLINE:\n` +
      `1. Upload the contents of this zip folder to any web server, intranet, or static hosting service (e.g. Apache, Nginx, GitHub Pages, Cloudflare Pages, Netlify).\n` +
      `2. Point learners to your domain/index.html.\n\n` +
      `Generated with Recall Course Authoring System.\n`
  );

  const base64Zip = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  await invoke<boolean>('save_binary_file', {
    filePath: targetPath,
    base64Content: base64Zip,
  });

  return { success: true, filePath: targetPath };
}

/**
 * Open the exported file in the default system browser or file manager
 */
export async function openExportedFile(filePath: string): Promise<void> {
  try {
    await invoke('open_in_browser', { filePath });
  } catch (err) {
    try {
      await openPath(filePath);
    } catch (e) {
      console.warn('Failed to open exported file:', err, e);
    }
  }
}
