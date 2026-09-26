export interface MediaAssetRef {
  mediaId: string;
  name: string;
  type: 'slide' | 'photo' | 'video';
  mimeType?: string;
  relativeMediaPath?: string;
  filePath?: string;
  thumbnailUrl?: string;
  contentHash?: string;
  sizeBytes?: number;
}

export interface MediaItem {
  id: string;
  name: string;
  type: 'slide' | 'photo' | 'video';
  mimeType?: string;
  url: string;
  thumbnailUrl?: string;
  size?: number;
  isSelected?: boolean;
  filePath?: string;
  mediaId?: string;
  contentHash?: string;
}

export interface MediaMetadataResult {
  hash: string;
  size_bytes: number;
  mime_type: string;
  extension: string;
  file_name: string;
}
