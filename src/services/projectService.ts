import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { MediaItem } from '../components/MediaOrganizer';
import { QuizActivity } from '../types/quiz';
import { TimelineItem } from '../components/CourseOrganizer';

export interface RecentProjectEntry {
  id: string;
  title: string;
  filePath?: string;
  lastOpened: string;
  timestamp: number;
}

export interface ProjectData {
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
}

const RECENT_PROJECTS_KEY = 'recall_recent_projects';

export async function reviveMediaItem(item: MediaItem): Promise<MediaItem> {
  // If url is already an embedded Base64 data URL, keep it directly (fully self-contained)
  if (item.url && item.url.startsWith('data:')) {
    return item;
  }

  // If url is missing, a stale/dead blob:, or a machine-specific local link, restore from filePath
  if (item.filePath) {
    try {
      const dataUrl = await invoke<string>('load_media_data_url', { filePath: item.filePath });
      if (dataUrl && dataUrl.startsWith('data:')) {
        return {
          ...item,
          url: dataUrl,
        };
      }
    } catch (e) {
      console.warn(`Could not load data URL for media ${item.name || item.id} from ${item.filePath}:`, e);
    }

    return {
      ...item,
      url: convertFileSrc(item.filePath),
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
 * Load project content from a specific file path and revive media URLs
 */
export async function loadProjectFromPath(filePath: string): Promise<ProjectData> {
  const jsonContent = await invoke<string>('load_project_file', { filePath });
  const parsed = JSON.parse(jsonContent) as ProjectData;
  parsed.filePath = filePath;
  parsed.lastModified = Date.now();

  // Revive Media Item URLs using persistent desktop asset loading and Base64 Data URLs
  if (parsed.mediaItems && Array.isArray(parsed.mediaItems)) {
    parsed.mediaItems = await Promise.all(parsed.mediaItems.map(reviveMediaItem));
  }

  // Revive Timeline Media URLs
  if (parsed.timeline && Array.isArray(parsed.timeline)) {
    parsed.timeline = await Promise.all(
      parsed.timeline.map(async (step) => {
        if (step.media) {
          const revivedMedia = await reviveMediaItem(step.media);
          return {
            ...step,
            media: revivedMedia,
          };
        }
        return step;
      })
    );
  }

  recordRecentProject(parsed);
  return parsed;
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
 * Resolves local file paths and embeds all media (videos, slides, images) as Base64 Data URLs.
 * This guarantees that *.recall project files are completely self-contained and portable across devices.
 */
export async function embedProjectMedia(project: ProjectData): Promise<ProjectData> {
  const cloned: ProjectData = JSON.parse(JSON.stringify(project));
  const dataUrlCache = new Map<string, string>();

  async function resolveUrl(filePath?: string, existingUrl?: string): Promise<string | undefined> {
    if (existingUrl && existingUrl.startsWith('data:')) {
      return existingUrl;
    }

    const cleanPath = filePath || (
      existingUrl && !existingUrl.startsWith('blob:') && !existingUrl.startsWith('data:') && !existingUrl.startsWith('http://') && !existingUrl.startsWith('https://')
        ? existingUrl
        : undefined
    );

    if (cleanPath) {
      if (dataUrlCache.has(cleanPath)) {
        return dataUrlCache.get(cleanPath)!;
      }
      try {
        const dataUrl = await invoke<string>('load_media_data_url', { filePath: cleanPath });
        if (dataUrl && dataUrl.startsWith('data:')) {
          dataUrlCache.set(cleanPath, dataUrl);
          return dataUrl;
        }
      } catch (err) {
        console.warn('Failed to embed media from path:', cleanPath, err);
      }
    }

    return existingUrl;
  }

  // 1. Embed Media Items (Videos, Photos, Slides)
  if (Array.isArray(cloned.mediaItems)) {
    for (const item of cloned.mediaItems) {
      const embeddedUrl = await resolveUrl(item.filePath, item.url);
      if (embeddedUrl) {
        item.url = embeddedUrl;
      }
    }
  }

  // 2. Embed Timeline Items
  if (Array.isArray(cloned.timeline)) {
    for (const step of cloned.timeline) {
      if (step.media) {
        const embeddedUrl = await resolveUrl(step.media.filePath, step.media.url);
        if (embeddedUrl) {
          step.media.url = embeddedUrl;
        }
      }
    }
  }

  // 3. Embed Quiz Activities (e.g. Click An Image hotspots)
  if (Array.isArray(cloned.quizActivities)) {
    for (const quiz of cloned.quizActivities) {
      if (quiz.data?.clickAnImage?.imageUrl && !quiz.data.clickAnImage.imageUrl.startsWith('data:')) {
        const embeddedUrl = await resolveUrl(undefined, quiz.data.clickAnImage.imageUrl);
        if (embeddedUrl) {
          quiz.data.clickAnImage.imageUrl = embeddedUrl;
        }
      }
    }
  }

  return cloned;
}

/**
 * Save project to disk. If filePath is missing, prompts for Save As dialog.
 * Automatically embeds all video, audio, and image assets into the *.recall file.
 */
export async function saveProject(project: ProjectData, forceSaveAs = false): Promise<{ success: boolean; filePath: string } | null> {
  let targetPath = project.filePath;

  if (!targetPath || forceSaveAs) {
    const defaultDir = await getDefaultProjectDirectory();
    const fileName = `${project.title || 'Untitled Project'}.recall`;
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

  // Embed all media assets (videos, slides, images) into the saved *.recall project
  const preparedProject = await embedProjectMedia(project);

  const toSave: ProjectData = {
    ...preparedProject,
    filePath: targetPath,
    lastModified: Date.now(),
  };

  const jsonString = JSON.stringify(toSave, null, 2);
  await invoke<boolean>('save_project_file', {
    filePath: targetPath,
    content: jsonString,
  });

  recordRecentProject(toSave);
  return { success: true, filePath: targetPath };
}
