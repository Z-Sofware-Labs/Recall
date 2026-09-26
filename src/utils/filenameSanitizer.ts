/**
 * Cross-platform filename and path sanitization utility.
 * Enforces Windows forbidden characters, reserved device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9),
 * trailing spaces/dots, macOS/Linux restrictions, and length constraints.
 */

// Windows reserved filenames (case-insensitive)
const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

/**
 * Sanitizes a single filename component (not a full path).
 * Replaces illegal characters (< > : " / \ | ? *) with underscores,
 * strips trailing dots and spaces, avoids reserved Windows names, and caps length.
 */
export function sanitizeFilename(filename: string, fallback = 'untitled', maxLength = 255): string {
  if (!filename || typeof filename !== 'string') {
    return fallback;
  }

  let cleaned = filename.trim();

  // If filename consists only of invalid characters or slashes, sanitize to fallback
  if (/^[\\/]+$/.test(cleaned)) {
    return fallback;
  }

  // Replace invalid characters across Windows, macOS, Linux:
  // Control characters 0x00-0x1F, \0, and < > : " / \ | ? *
  cleaned = cleaned.replace(/[\x00-\x1f<>:"/\\|?*]/g, '_');

  // Strip trailing spaces and trailing periods (illegal on Windows filesystems)
  cleaned = cleaned.replace(/[. ]+$/, '');

  // Strip leading spaces
  cleaned = cleaned.trimStart();

  if (!cleaned || /^_+$/.test(cleaned)) {
    return fallback;
  }

  // Separate basename and extension
  let base = cleaned;
  let ext = '';
  const lastDot = cleaned.lastIndexOf('.');
  if (lastDot > 0 && lastDot < cleaned.length - 1) {
    base = cleaned.substring(0, lastDot);
    ext = cleaned.substring(lastDot);
  }

  // Clean trailing dots and spaces from the base component
  base = base.replace(/[. ]+$/, '');

  // Check against Windows reserved device names (e.g. CON, NUL, PRN, AUX, COM1.txt)
  if (WINDOWS_RESERVED_NAMES.has(base.toUpperCase())) {
    base = `_${base}_`;
  }

  let result = base + ext;

  // Cap maximum filename length
  if (result.length > maxLength) {
    if (ext.length > 0 && ext.length < maxLength) {
      result = base.substring(0, maxLength - ext.length) + ext;
    } else {
      result = result.substring(0, maxLength);
    }
  }

  return result || fallback;
}

/**
 * Checks whether a filename is valid without needing modifications.
 */
export function isValidFilename(filename: string): boolean {
  if (!filename || typeof filename !== 'string' || filename.trim() !== filename) {
    return false;
  }
  if (filename.length === 0 || filename.length > 255) {
    return false;
  }
  // Check for forbidden characters
  if (/[\x00-\x1f<>:"/\\|?*]/.test(filename)) {
    return false;
  }
  // Check for trailing dot or space
  if (/[. ]$/.test(filename)) {
    return false;
  }
  // Check Windows reserved names
  const base = filename.split('.')[0].toUpperCase();
  if (WINDOWS_RESERVED_NAMES.has(base)) {
    return false;
  }
  return true;
}

/**
 * Sanitizes a project title for use as a file base name without extension.
 */
export function sanitizeProjectTitle(title?: string, defaultTitle = 'Untitled Project'): string {
  const sanitized = sanitizeFilename(title || defaultTitle, defaultTitle);
  // Ensure the sanitized title doesn't end with .recall if already typed by user
  return sanitized.replace(/\.recall$/i, '');
}
