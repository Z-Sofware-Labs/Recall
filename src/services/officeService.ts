import { invoke } from '@tauri-apps/api/core';

export interface OfficeSuiteInfo {
  has_ms_office: boolean;
  has_libreoffice: boolean;
  preferred: string;
  ms_office_version: string | null;
  libreoffice_path: string | null;
  platform: string;
}

let cachedOfficeInfo: OfficeSuiteInfo | null = null;
let detectionPromise: Promise<OfficeSuiteInfo> | null = null;

export async function getOfficeSuiteInfo(): Promise<OfficeSuiteInfo> {
  if (cachedOfficeInfo) {
    return cachedOfficeInfo;
  }

  if (detectionPromise) {
    return detectionPromise;
  }

  detectionPromise = invoke<OfficeSuiteInfo>('detect_office_suite')
    .then((info) => {
      cachedOfficeInfo = info;
      return info;
    })
    .catch((err) => {
      console.warn('Failed to detect office suite:', err);
      const fallback: OfficeSuiteInfo = {
        has_ms_office: false,
        has_libreoffice: false,
        preferred: 'none',
        ms_office_version: null,
        libreoffice_path: null,
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
      };
      cachedOfficeInfo = fallback;
      return fallback;
    })
    .finally(() => {
      detectionPromise = null;
    });

  return detectionPromise;
}

export function getCachedOfficeInfo(): OfficeSuiteInfo | null {
  return cachedOfficeInfo;
}
