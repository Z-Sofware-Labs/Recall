export type Platform = 'windows' | 'macos' | 'linux';

export function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'windows';
  const ua = (navigator.userAgent || '').toLowerCase();
  const plat = (navigator.platform || '').toLowerCase();

  if (ua.includes('mac') || plat.includes('mac')) {
    return 'macos';
  }
  if (ua.includes('linux') || plat.includes('linux')) {
    return 'linux';
  }
  return 'windows';
}
