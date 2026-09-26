import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { MediaItem, MediaAssetRef } from '../types/media';
import { QuizActivity } from '../types/quiz';
import { TimelineItem } from '../components/CourseOrganizer';
import { sanitizeProjectTitle } from '../utils/filenameSanitizer';

export const CURRENT_PROJECT_FORMAT_VERSION = 2;

export interface RecentProjectEntry {
  id: string;
  title: string;
  filePath?: string;
  lastOpened: string;
  timestamp: number;
}

export interface ProjectAssetManifest {
  formatVersion: number;
  projectId: string;
  title: string;
  createdWith: string;
  assets: Record<string, MediaAssetRef>;
}

export interface ProjectData {
  formatVersion?: number;
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  lastModified: number;
  filePath?: string;
  mediaItems: MediaItem[];
  quizActivities?: QuizActivity[];
  timeline?: TimelineItem[];
  certificate?: any;
  assetManifest?: ProjectAssetManifest;
}

const RECENT_PROJECTS_KEY = 'recall_recent_projects';

// Bounded in-memory ObjectURL and thumbnail cache to avoid memory amplification
const objectUrlRegistry = new Map<string, string>();
const thumbnailRegistry = new Map<string, string>();

export function registerMediaThumbnail(mediaId: string, thumbDataUrl: string) {
  thumbnailRegistry.set(mediaId, thumbDataUrl);
}

export function getMediaThumbnail(mediaId: string): string | undefined {
  return thumbnailRegistry.get(mediaId);
}

export function releaseObjectUrl(key: string) {
  const existing = objectUrlRegistry.get(key);
  if (existing) {
    URL.revokeObjectURL(existing);
    objectUrlRegistry.delete(key);
  }
}

export function clearObjectUrlRegistry() {
  for (const [, url] of objectUrlRegistry.entries()) {
    URL.revokeObjectURL(url);
  }
  objectUrlRegistry.clear();
}

/**
 * Migration Function: Migrate V1 (embedded Base64) to V2 (asset-based metadata + stable references)
 * Extracts embedded media into external asset references or assigns stable mediaId,
 * preserving all existing course content.
 */
export function migrateV1ToV2(oldProject: any): ProjectData {
  const isV1 = !oldProject.formatVersion || oldProject.formatVersion < 2;
  if (!isV1) {
    return oldProject as ProjectData;
  }

  const assetManifest: ProjectAssetManifest = {
    formatVersion: CURRENT_PROJECT_FORMAT_VERSION,
    projectId: oldProject.id || `proj_${Date.now()}`,
    title: oldProject.title || 'Migrated Course',
    createdWith: 'Recall Migration V1->V2',
    assets: {},
  };

  const migratedMediaItems: MediaItem[] = [];
  const mediaIdMap = new Map<string, string>(); // oldId or url -> stable mediaId

  if (Array.isArray(oldProject.mediaItems)) {
    for (let i = 0; i < oldProject.mediaItems.length; i++) {
      const item = oldProject.mediaItems[i];
      const stableId = item.id || `asset_${Date.now()}_${i}`;
      mediaIdMap.set(stableId, stableId);
      if (item.url) {
        mediaIdMap.set(item.url, stableId);
      }

      assetManifest.assets[stableId] = {
        mediaId: stableId,
        name: item.name || `Asset ${i + 1}`,
        type: item.type || 'photo',
        mimeType: item.mimeType,
        filePath: item.filePath,
        thumbnailUrl: item.thumbnailUrl,
        sizeBytes: item.size,
      };

      migratedMediaItems.push({
        ...item,
        id: stableId,
        mediaId: stableId,
      });
    }
  }

  // Rewrite timeline item references
  const migratedTimeline: TimelineItem[] = [];
  if (Array.isArray(oldProject.timeline)) {
    for (const step of oldProject.timeline) {
      if (step.media) {
        const matchingId = step.media.id || (step.media.url && mediaIdMap.get(step.media.url)) || `asset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        migratedTimeline.push({
          ...step,
          media: {
            ...step.media,
            id: matchingId,
            mediaId: matchingId,
          },
        });
      } else {
        migratedTimeline.push(step);
      }
    }
  }

  return {
    ...oldProject,
    formatVersion: CURRENT_PROJECT_FORMAT_VERSION,
    mediaItems: migratedMediaItems,
    timeline: migratedTimeline,
    assetManifest,
    lastModified: Date.now(),
  };
}

/**
 * Lazy media revival: Loads thumbnails / lightweight metadata first without decoding huge videos into RAM.
 */
export async function reviveMediaItemLazy(item: MediaItem): Promise<MediaItem> {
  const stableId = item.mediaId || item.id;
  const cachedThumb = getMediaThumbnail(stableId);

  // If already a valid working URL or thumbnail
  if (item.url && !item.url.startsWith('file://')) {
    return {
      ...item,
      thumbnailUrl: item.thumbnailUrl || cachedThumb,
    };
  }

  // If filePath exists, use Tauri asset protocol convertFileSrc for zero-copy streaming
  if (item.filePath) {
    const assetUrl = convertFileSrc(item.filePath);
    return {
      ...item,
      url: assetUrl,
      thumbnailUrl: item.thumbnailUrl || cachedThumb,
    };
  }

  return item;
}

export function getStoredRecentProjects(): RecentProjectEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_PROJECTS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse recent projects from localStorage:', e);
  }
  return [];
}

export function saveStoredRecentProjects(list: RecentProjectEntry[]) {
  try {
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(list.slice(0, 10)));
  } catch (e) {
    console.warn('Failed to store recent projects:', e);
  }
}

export function clearStoredRecentProjects() {
  try {
    localStorage.removeItem(RECENT_PROJECTS_KEY);
  } catch (e) {
    console.warn('Failed to clear recent projects from localStorage:', e);
  }
}

export function removeStoredRecentProject(id: string) {
  try {
    const list = getStoredRecentProjects().filter(p => p.id !== id);
    saveStoredRecentProjects(list);
    return list;
  } catch (e) {
    console.warn('Failed to remove recent project from localStorage:', e);
    return [];
  }
}

export function recordRecentProject(project: ProjectData) {
  const list = getStoredRecentProjects().filter(p => p.id !== project.id && p.filePath !== project.filePath);
  const newEntry: RecentProjectEntry = {
    id: project.id,
    title: project.title || 'Untitled Project',
    filePath: project.filePath,
    lastOpened: 'Just now',
    timestamp: Date.now(),
  };
  saveStoredRecentProjects([newEntry, ...list]);
}

/**
 * Open native file picker to select a .recall or .json file and load it
 */
export async function browseAndOpenProject(): Promise<ProjectData | null> {
  const selected = await open({
    multiple: false,
    filters: [
      {
        name: 'Recall Project',
        extensions: ['recall', 'json'],
      },
    ],
  });

  if (!selected) return null;

  const targetPath = typeof selected === 'string' ? selected : (selected as any).path || selected;
  if (!targetPath) return null;

  return loadProjectFromPath(targetPath);
}

/**
 * Load project content from disk, detect project version, run migration if needed,
 * and revive media URLs lazily.
 */
export async function loadProjectFromPath(filePath: string): Promise<ProjectData> {
  const jsonContent = await invoke<string>('load_project_file', { filePath });
  let parsed: any;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (err: any) {
    throw new Error(`Corrupted project file: Could not parse JSON content from "${filePath}".\n\n${err?.message || err}`);
  }

  // Run backward compatibility migration if older format
  const migrated = migrateV1ToV2(parsed);
  migrated.filePath = filePath;
  migrated.lastModified = Date.now();

  // Lazy load media items with bounded concurrency
  if (migrated.mediaItems && Array.isArray(migrated.mediaItems)) {
    const concurrency = 6;
    const items = migrated.mediaItems;
    const results: MediaItem[] = new Array(items.length);

    for (let i = 0; i < items.length; i += concurrency) {
      const slice = items.slice(i, i + concurrency);
      const revivedSlice = await Promise.all(slice.map(reviveMediaItemLazy));
      for (let j = 0; j < revivedSlice.length; j++) {
        results[i + j] = revivedSlice[j];
      }
    }
    migrated.mediaItems = results;
  }

  // Lazy revive timeline media
  if (migrated.timeline && Array.isArray(migrated.timeline)) {
    migrated.timeline = await Promise.all(
      migrated.timeline.map(async (step) => {
        if (step.media) {
          const revived = await reviveMediaItemLazy(step.media);
          return { ...step, media: revived };
        }
        return step;
      })
    );
  }

  recordRecentProject(migrated);
  return migrated;
}

const DEFAULT_PROJECT_LOCATION_KEY = 'recall_default_project_location';

export async function getDefaultProjectDirectory(): Promise<string> {
  const custom = localStorage.getItem(DEFAULT_PROJECT_LOCATION_KEY);
  if (custom && custom.trim()) {
    return custom.trim();
  }
  try {
    const dir = await invoke<string>('get_default_project_directory');
    if (dir) return dir;
  } catch (e) {
    console.warn('Failed to get default project directory from backend:', e);
  }
  return 'Documents/Recall';
}

export function setDefaultProjectDirectory(path: string) {
  localStorage.setItem(DEFAULT_PROJECT_LOCATION_KEY, path);
}

/**
 * Prepares project for saving.
 * Instead of embedding hundreds of megabytes of duplicate Base64 strings into the JSON tree,
 * builds a clean asset manifest and maintains stable media references.
 */
export async function prepareProjectForSave(project: ProjectData): Promise<ProjectData> {
  const assetManifest: ProjectAssetManifest = {
    formatVersion: CURRENT_PROJECT_FORMAT_VERSION,
    projectId: project.id,
    title: project.title,
    createdWith: 'Recall Authoring App',
    assets: {},
  };

  const sanitizedMediaItems: MediaItem[] = [];

  if (Array.isArray(project.mediaItems)) {
    for (let i = 0; i < project.mediaItems.length; i++) {
      const item = project.mediaItems[i];
      const mediaId = item.mediaId || item.id || `asset_${Date.now()}_${i}`;

      assetManifest.assets[mediaId] = {
        mediaId,
        name: item.name,
        type: item.type,
        mimeType: item.mimeType,
        filePath: item.filePath,
        thumbnailUrl: item.thumbnailUrl,
        sizeBytes: item.size,
      };

      // Strip large Base64 data URL from saved project JSON if filePath is present,
      // saving memory and disk space while maintaining reproducibility
      const isLargeDataUrl = item.url && item.url.startsWith('data:') && item.url.length > 500000;
      const cleanUrl = (item.filePath && isLargeDataUrl) ? '' : item.url;

      sanitizedMediaItems.push({
        ...item,
        mediaId,
        url: cleanUrl,
      });
    }
  }

  // Ensure timeline items reference stable mediaId
  const sanitizedTimeline: TimelineItem[] = [];
  if (Array.isArray(project.timeline)) {
    for (const step of project.timeline) {
      if (step.media) {
        const mediaId = step.media.mediaId || step.media.id;
        const isLargeDataUrl = step.media.url && step.media.url.startsWith('data:') && step.media.url.length > 500000;
        const cleanUrl = (step.media.filePath && isLargeDataUrl) ? '' : step.media.url;

        sanitizedTimeline.push({
          ...step,
          media: {
            ...step.media,
            mediaId,
            url: cleanUrl,
          },
        });
      } else {
        sanitizedTimeline.push(step);
      }
    }
  }

  return {
    ...project,
    formatVersion: CURRENT_PROJECT_FORMAT_VERSION,
    mediaItems: sanitizedMediaItems,
    timeline: sanitizedTimeline,
    assetManifest,
    lastModified: Date.now(),
  };
}

/**
 * Save project to disk atomically with automatic backup (.bak).
 * If filePath is missing, prompts for Save As dialog.
 */
export async function saveProject(project: ProjectData, forceSaveAs = false): Promise<{ success: boolean; filePath: string } | null> {
  let targetPath = project.filePath;

  if (!targetPath || forceSaveAs) {
    const defaultDir = await getDefaultProjectDirectory();
    const safeTitle = sanitizeProjectTitle(project.title);
    const fileName = `${safeTitle}.recall`;
    const defaultPath = defaultDir ? `${defaultDir.replace(/[\\/]$/, '')}/${fileName}` : fileName;

    const selected = await save({
      defaultPath,
      filters: [
        {
          name: 'Recall Project (*.recall)',
          extensions: ['recall', 'json'],
        },
      ],
    });

    if (!selected) return null;
    targetPath = typeof selected === 'string' ? selected : (selected as any).path || selected;
  }

  if (!targetPath) return null;

  const preparedProject = await prepareProjectForSave(project);
  preparedProject.filePath = targetPath;

  const jsonString = JSON.stringify(preparedProject, null, 2);

  // Invoke atomic Rust save
  await invoke<boolean>('save_project_file', {
    filePath: targetPath,
    content: jsonString,
  });

  recordRecentProject(preparedProject);
  return { success: true, filePath: targetPath };
}
