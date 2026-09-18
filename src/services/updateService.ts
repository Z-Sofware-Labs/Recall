import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateCheckResult {
  available: boolean;
  currentVersion?: string;
  version?: string;
  body?: string;
  date?: string;
  updateInstance?: Update | null;
  error?: string;
}

export type DownloadProgressCallback = (downloaded: number, total: number | null, percent: number) => void;

// Safe utility to check if running inside Tauri environment
export function isTauriEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
}

/**
 * Checks for updates using Tauri v2 updater plugin.
 * Returns information about available updates, release notes, and error details if any.
 */
export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  if (!isTauriEnvironment()) {
    return {
      available: false,
      error: 'Updater is only available in the Recall desktop application.',
    };
  }

  try {
    const update = await check();
    if (!update) {
      return {
        available: false,
      };
    }

    return {
      available: true,
      currentVersion: update.currentVersion,
      version: update.version,
      body: update.body || '',
      date: update.date || '',
      updateInstance: update,
    };
  } catch (err: any) {
    console.error('Update check failed:', err);
    return {
      available: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * Downloads and installs the given update.
 * Tracks download progress and triggers restart upon completion.
 */
export async function downloadAndInstallUpdate(
  update: Update,
  onProgress?: DownloadProgressCallback
): Promise<void> {
  let downloadedBytes = 0;
  let contentLength: number | null = null;

  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case 'Started':
        contentLength = event.data.contentLength ?? null;
        if (onProgress) {
          onProgress(0, contentLength, 0);
        }
        break;
      case 'Progress':
        downloadedBytes += event.data.chunkLength;
        const percent = contentLength && contentLength > 0
          ? Math.min(100, Math.round((downloadedBytes / contentLength) * 100))
          : 0;
        if (onProgress) {
          onProgress(downloadedBytes, contentLength, percent);
        }
        break;
      case 'Finished':
        if (onProgress) {
          onProgress(downloadedBytes, contentLength, 100);
        }
        break;
    }
  });

  // Relaunch the application to finalize the update
  await relaunch();
}

/**
 * Format bytes into human readable format (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
