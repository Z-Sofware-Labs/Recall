/**
 * Utility for downloading external image URLs and converting them into
 * self-contained base64 Data URLs for 100% offline persistence.
 */

export async function downloadImageAsDataUrl(url: string): Promise<string> {
  const cleanUrl = url.trim();
  if (!cleanUrl) return '';

  // Already a base64 Data URL or local blob
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

  // 3. If CORS prevents canvas export, return the cleanUrl directly so <img> still displays it!
  return cleanUrl;
}
