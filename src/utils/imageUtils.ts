/**
 * Utility for downloading external image URLs, optimizing image assets,
 * checking transparency/alpha channels, and generating video thumbnails.
 */

export async function downloadImageAsDataUrl(url: string): Promise<string> {
  const cleanUrl = url.trim();
  if (!cleanUrl) return '';

  if (cleanUrl.startsWith('data:image/') || cleanUrl.startsWith('blob:')) {
    return cleanUrl;
  }

  // 1. Try standard Fetch API
  try {
    const response = await fetch(cleanUrl);
    if (response.ok) {
      const blob = await response.blob();
      if (blob.size > 0) {
        return await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result);
            } else {
              resolve(cleanUrl);
            }
          };
          reader.onerror = () => resolve(cleanUrl);
          reader.readAsDataURL(blob);
        });
      }
    }
  } catch (e) {
    console.warn('Fetch failed for image URL, attempting canvas fallback:', e);
  }

  // 2. Try HTML5 Image with crossOrigin = 'anonymous' drawn to canvas
  try {
    const canvasDataUrl = await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;

          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);

          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(null);
        }
      };

      img.onerror = () => resolve(null);
      img.src = cleanUrl;
    });

    if (canvasDataUrl) {
      return canvasDataUrl;
    }
  } catch {
    // Fall through
  }

  // 3. Fallback to cleanUrl
  return cleanUrl;
}

/**
 * Checks whether an image context has any transparent pixels (alpha < 255).
 * Inspects 2D canvas pixel buffer using sampled or full scan.
 */
export function hasImageAlpha(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    // Check every 4th byte (alpha channel)
    // Sample every few pixels for large images to keep performance O(n/4)
    const step = (width * height > 500000) ? 16 : 4;
    for (let i = 3; i < data.length; i += step) {
      if (data[i] < 250) {
        return true;
      }
    }
  } catch (e) {
    // If getImageData throws (e.g. cross-origin taint), assume transparent to be safe
    return true;
  }
  return false;
}

/**
 * Optimizes an image Data URL by downscaling if it exceeds max dimension (e.g. 1920px)
 * and compressing.
 * CRITICAL RULE: NEVER converts transparent images to JPEG. If transparency exists,
 * encodes to WebP or preserves PNG.
 */
export async function optimizeImageDataUrl(
  dataUrl: string,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.82
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  // Preserve vector SVGs and animated GIFs
  if (dataUrl.startsWith('data:image/svg') || dataUrl.startsWith('data:image/gif')) {
    return dataUrl;
  }

  // If already small (< 64KB base64), skip processing overhead
  if (dataUrl.length < 65536) {
    return dataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width <= 0 || height <= 0) {
          return resolve(dataUrl);
        }

        // Calculate proportional scale
        let scale = 1;
        if (width > maxWidth || height > maxHeight) {
          scale = Math.min(maxWidth / width, maxHeight / height);
        }

        const targetWidth = Math.round(width * scale);
        const targetHeight = Math.round(height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(dataUrl);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const isTransparent = hasImageAlpha(ctx, targetWidth, targetHeight);

        // Try WebP first (supports alpha and high compression)
        const webpUrl = canvas.toDataURL('image/webp', quality);
        if (webpUrl && webpUrl.startsWith('data:image/webp') && webpUrl.length < dataUrl.length) {
          return resolve(webpUrl);
        }

        // If the image has transparency, DO NOT convert to JPEG! Use PNG fallback
        if (isTransparent) {
          const pngUrl = canvas.toDataURL('image/png');
          if (pngUrl && pngUrl.length < dataUrl.length) {
            return resolve(pngUrl);
          }
          return resolve(dataUrl);
        }

        // Only convert to JPEG if the image is verified completely opaque
        const jpegUrl = canvas.toDataURL('image/jpeg', quality);
        if (jpegUrl && jpegUrl.length < dataUrl.length) {
          return resolve(jpegUrl);
        }

        // Keep original if neither reduced file size
        resolve(dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };

    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Extracts a representative frame from a video file or URL and produces a lightweight WebP/PNG thumbnail.
 * Cleans up temporary video elements and object URLs immediately to prevent leaks.
 */
export async function extractVideoThumbnail(
  videoUrlOrBlob: string | Blob,
  seekTimeSeconds = 1.0,
  maxWidth = 320,
  maxHeight = 180
): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    let objectUrlToRevoke: string | null = null;
    if (typeof videoUrlOrBlob !== 'string') {
      objectUrlToRevoke = URL.createObjectURL(videoUrlOrBlob);
      video.src = objectUrlToRevoke;
    } else {
      video.src = videoUrlOrBlob;
    }

    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 8000);

    video.onloadedmetadata = () => {
      const targetTime = Math.min(seekTimeSeconds, Math.max(0.1, video.duration / 2));
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      try {
        const width = video.videoWidth || 320;
        const height = video.videoHeight || 180;
        const scale = Math.min(maxWidth / width, maxHeight / height, 1);
        const targetWidth = Math.max(1, Math.round(width * scale));
        const targetHeight = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          // Prefer WebP thumbnail
          let thumb = canvas.toDataURL('image/webp', 0.8);
          if (!thumb || !thumb.startsWith('data:image/webp')) {
            thumb = canvas.toDataURL('image/jpeg', 0.8);
          }
          clearTimeout(timeout);
          cleanup();
          return resolve(thumb);
        }
      } catch (e) {
        console.warn('Failed to capture video thumbnail frame:', e);
      }
      clearTimeout(timeout);
      cleanup();
      resolve(null);
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve(null);
    };
  });
}
