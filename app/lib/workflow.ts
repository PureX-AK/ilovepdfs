export interface DownloadResultInfo {
  url: string;
  filename: string;
  fileCount?: number;
  createdAt?: string;
}

const DOWNLOAD_KEY_PREFIX = 'workflow:download:';

export function saveDownloadResult(toolId: string, info: DownloadResultInfo) {
  if (typeof window === 'undefined') return;
  try {
    const key = `${DOWNLOAD_KEY_PREFIX}${toolId}`;
    const data = {
      ...info,
      createdAt: info.createdAt || new Date().toISOString(),
    };
    window.sessionStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save download result info', err);
  }
}

export function loadDownloadResult(toolId: string): DownloadResultInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = `${DOWNLOAD_KEY_PREFIX}${toolId}`;
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as DownloadResultInfo;
  } catch (err) {
    console.error('Failed to load download result info', err);
    return null;
  }
}


