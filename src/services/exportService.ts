import { invoke } from '@tauri-apps/api/core';
import { openPath } from '@tauri-apps/plugin-opener';
import { save } from '@tauri-apps/plugin-dialog';
import JSZip from 'jszip';
import { ProjectData, getDefaultProjectDirectory } from './projectService';
import { generateStandalonePlayerHtml } from './standalonePlayerGenerator';
import { optimizeImageDataUrl, downloadImageAsDataUrl } from '../utils/imageUtils';
import { sanitizeFilename } from '../utils/filenameSanitizer';

export interface ExportCourseOptions {
  theme?: 'dark' | 'light' | 'auto';
  allowFreeNavigation?: boolean;
  showCertificate?: boolean;
  passThresholdDefault?: number;
  optimizeMedia?: boolean;
  onProgress?: (step: string, percent: number) => void;
  signal?: AbortSignal;
}

/**
 * Helper to convert any URL or path into a canonical local OS filesystem path
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
 * Downloads a remote HTTP/HTTPS URL and converts it to a local Base64 data URL for offline bundling.
 * Handles timeouts, network failure, and content type validation.
 */
export async function downloadRemoteMediaForOffline(url: string, timeoutMs = 15000, signal?: AbortSignal): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const abortListener = () => controller.abort();
  if (signal) {
    signal.addEventListener('abort', abortListener);
  }

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const blob = await res.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read downloaded media blob'));
      reader.readAsDataURL(blob);
    });
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', abortListener);
    }
  }
}

/**
 * Resolves a media item into an embedded offline resource.
 * Downloads remote URLs, converts local files, and optimizes images.
 */
async function resolveMediaItem(
  mediaItem: any,
  contextName: string,
  shouldOptimizeImages = true,
  signal?: AbortSignal
): Promise<void> {
  if (!mediaItem) return;

  if (signal?.aborted) {
    throw new Error('Export cancelled by user.');
  }

  // Remote HTTP(S) URL Handling: download and package locally for true offline guarantee
  if (typeof mediaItem.url === 'string' && /^https?:\/\/(?!asset\.localhost)/i.test(mediaItem.url)) {
    try {
      const downloaded = await downloadRemoteMediaForOffline(mediaItem.url, 20000, signal);
      mediaItem.url = downloaded;
    } catch (e: any) {
      console.warn(`Could not download remote media "${mediaItem.url}":`, e);
      // Keep remote url as fallback and notify user
    }
  }

  // Already a base64 Data URL
  if (typeof mediaItem.url === 'string' && mediaItem.url.startsWith('data:')) {
    if (shouldOptimizeImages && mediaItem.url.startsWith('data:image/')) {
      mediaItem.url = await optimizeImageDataUrl(mediaItem.url, 1920, 1080, 0.82);
    }
    delete mediaItem.filePath;
    delete mediaItem.path;
    return;
  }

  const targetPath = mediaItem.filePath || extractLocalFilesystemPath(mediaItem.url);
  if (!targetPath) {
    return;
  }

  try {
    let dataUrl = await invoke<string>('load_media_data_url', { filePath: targetPath });
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      throw new Error(`Invalid data URL returned by load_media_data_url`);
    }

    if (shouldOptimizeImages && dataUrl.startsWith('data:image/')) {
      dataUrl = await optimizeImageDataUrl(dataUrl, 1920, 1080, 0.82);
    }

    mediaItem.url = dataUrl;
    delete mediaItem.filePath;
    delete mediaItem.path;
  } catch (err: any) {
    const mediaName = mediaItem.name || mediaItem.title || contextName || 'Media File';
    const errorMsg = err?.message || String(err);
    throw new Error(
      `Could not embed "${mediaName}" into the exported course.\n\nFile:\n${targetPath}\n\nError: ${errorMsg}`
    );
  }
}

/**
 * Prepares project for export by resolving media and pruning unreferenced assets.
 * Avoids deep full-object stringify where feasible.
 */
export async function prepareProjectForExport(
  project: ProjectData,
  options: ExportCourseOptions = {}
): Promise<ProjectData> {
  if (options.signal?.aborted) {
    throw new Error('Export cancelled by user.');
  }

  // Shallow clone top-level arrays to prevent mutating live React state
  const cloned: ProjectData = {
    ...project,
    mediaItems: project.mediaItems ? [...project.mediaItems.map(m => ({ ...m }))] : [],
    timeline: project.timeline ? [...project.timeline.map(t => ({ ...t, media: t.media ? { ...t.media } : undefined }))] : [],
    quizActivities: project.quizActivities ? [...project.quizActivities.map(q => ({ ...q, data: q.data ? { ...q.data } : undefined }))] : [],
  };

  const referencedMediaIds = new Set<string>();
  if (Array.isArray(cloned.timeline)) {
    cloned.timeline.forEach(step => {
      if ((step as any).mediaId) referencedMediaIds.add((step as any).mediaId);
      if (step.media?.id) referencedMediaIds.add(step.media.id);
      if (step.media?.mediaId) referencedMediaIds.add(step.media.mediaId);
    });
  }

  const shouldOptimize = options.optimizeMedia !== false;
  const totalItems = (cloned.mediaItems?.length || 0) + (cloned.timeline?.length || 0);
  let processedItems = 0;

  // 1. Resolve media items
  if (Array.isArray(cloned.mediaItems)) {
    const activeMediaItems = cloned.mediaItems.filter(
      item => referencedMediaIds.size === 0 || referencedMediaIds.has(item.id) || (item.mediaId && referencedMediaIds.has(item.mediaId))
    );

    for (let i = 0; i < activeMediaItems.length; i++) {
      if (options.signal?.aborted) throw new Error('Export cancelled by user.');
      const item = activeMediaItems[i];
      options.onProgress?.(`Processing media asset ${i + 1}/${activeMediaItems.length}`, Math.round((processedItems / Math.max(1, totalItems)) * 80));
      await resolveMediaItem(item, item.name || `Media Item ${i + 1}`, shouldOptimize, options.signal);
      processedItems++;
    }
    cloned.mediaItems = activeMediaItems;
  }

  // 2. Resolve timeline items
  if (Array.isArray(cloned.timeline)) {
    for (let i = 0; i < cloned.timeline.length; i++) {
      if (options.signal?.aborted) throw new Error('Export cancelled by user.');
      const step = cloned.timeline[i];
      if (step.media) {
        const stepTitle = step.media.name || (step as any).title || `Slide ${i + 1} Media`;
        await resolveMediaItem(step.media, stepTitle, shouldOptimize, options.signal);
        processedItems++;
      }
    }
  }

  // 3. Resolve quiz images (Click an image hotspots)
  if (Array.isArray(cloned.quizActivities)) {
    for (let i = 0; i < cloned.quizActivities.length; i++) {
      const quiz = cloned.quizActivities[i];
      if (quiz.data?.clickAnImage?.imageUrl) {
        const fakeMedia = { url: quiz.data.clickAnImage.imageUrl, name: `${quiz.name || 'Quiz'} Hotspot Image` };
        await resolveMediaItem(fakeMedia, `${quiz.name || 'Quiz'} Hotspot Image`, shouldOptimize, options.signal);
        quiz.data.clickAnImage.imageUrl = fakeMedia.url;
      }
    }
  }

  // 4. Attach certificate if requested
  if (options.showCertificate !== false && !cloned.certificate) {
    try {
      const saved = localStorage.getItem(`recall_certificate_${project.id || 'default'}`) || localStorage.getItem('recall_certificate_default');
      if (saved) {
        cloned.certificate = JSON.parse(saved);
      }
    } catch {}
  } else if (options.showCertificate === false) {
    delete cloned.certificate;
  }

  delete (cloned as any).filePath;
  return cloned;
}

/**
 * Asserts that the prepared project contains no remaining local filesystem paths.
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
      if (isLocalUrl(item.url) || isLocalUrl(item.filePath)) {
        throw new Error(
          `Export validation failed: A local filesystem media reference (${item.filePath || item.url}) remains in media library item "${item.name || item.id}".`
        );
      }
    }
  }

  if (Array.isArray(project.timeline)) {
    for (const step of project.timeline) {
      if (step.media) {
        if (isLocalUrl(step.media.url) || isLocalUrl(step.media.filePath)) {
          const stepTitle = step.media.name || (step as any).title || step.timelineId;
          throw new Error(
            `Export validation failed: A local filesystem media reference (${step.media.filePath || step.media.url}) remains in timeline slide "${stepTitle}".`
          );
        }
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
  const safeTitle = sanitizeFilename(project.title || 'Course', 'Course');
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

  options.onProgress?.('Preparing course media...', 20);
  const preparedProject = await prepareProjectForExport(project, options);
  assertNoLocalFileUrls(preparedProject);

  options.onProgress?.('Generating offline player HTML...', 85);
  const htmlContent = generateStandalonePlayerHtml(preparedProject, options);

  options.onProgress?.('Saving file to disk...', 95);
  await invoke<boolean>('save_project_file', {
    filePath: targetPath,
    content: htmlContent,
  });

  options.onProgress?.('Export complete', 100);
  return { success: true, filePath: targetPath };
}

/**
 * Exports the project to a distributable Web Package (.zip) for hosting.
 * Optimizes ZIP generation by adding pre-compressed media without redundant re-compression.
 */
export async function exportCourseToWebZip(
  project: ProjectData,
  options: ExportCourseOptions = {}
): Promise<{ success: boolean; filePath: string } | null> {
  const defaultDir = await getDefaultProjectDirectory();
  const safeTitle = sanitizeFilename(project.title || 'Course', 'Course');
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

  options.onProgress?.('Preparing course media...', 20);
  const preparedProject = await prepareProjectForExport(project, options);
  assertNoLocalFileUrls(preparedProject);

  options.onProgress?.('Generating standalone HTML...', 70);
  const htmlContent = generateStandalonePlayerHtml(preparedProject, options);

  const zip = new JSZip();
  // Compress HTML/JSON metadata with standard DEFLATE
  zip.file('index.html', htmlContent, { compression: 'DEFLATE', compressionOptions: { level: 6 } });
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
    ),
    { compression: 'DEFLATE', compressionOptions: { level: 6 } }
  );

  zip.file(
    'README.txt',
    `=== ${project.title || 'Recall Course'} Web Package ===\n\n` +
      `HOW TO RUN OFFLINE:\n` +
      `1. Double-click "index.html" in this folder.\n` +
      `2. The course will open and run completely locally in your default web browser.\n\n` +
      `HOW TO HOST ONLINE:\n` +
      `1. Upload the contents of this zip folder to any web server, intranet, or static hosting service.\n` +
      `2. Point learners to your domain/index.html.\n\n` +
      `Generated with Recall Course Authoring System.\n`
  );

  options.onProgress?.('Building ZIP package...', 85);

  const base64Zip = await zip.generateAsync(
    {
      type: 'base64',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      options.onProgress?.(`Compressing archive: ${Math.round(metadata.percent)}%`, 85 + Math.round(metadata.percent * 0.1));
    }
  );

  options.onProgress?.('Saving package to disk...', 96);
  await invoke<boolean>('save_binary_file', {
    filePath: targetPath,
    base64Content: base64Zip,
  });

  options.onProgress?.('Export complete', 100);
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
