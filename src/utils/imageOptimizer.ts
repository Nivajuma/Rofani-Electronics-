/**
 * High-performance, low-memory image optimizer for mobile devices.
 * Prevents mobile browser crashes (OOM) by downscaling high-resolution photos
 * (12MP - 108MP) directly using ObjectURLs and small off-screen canvases.
 */

export async function optimizeImageFile(
  file: File | Blob,
  maxDimension = 720,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve) => {
    // 1. If createImageBitmap is available with hardware resize, use it to avoid large memory footprint
    if ('createImageBitmap' in window) {
      createImageBitmap(file)
        .then((bitmap) => {
          let { width, height } = bitmap;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { alpha: false });
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'medium';
            ctx.drawImage(bitmap, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            bitmap.close();
            // Free canvas memory
            canvas.width = 0;
            canvas.height = 0;
            resolve(dataUrl);
            return;
          }
          bitmap.close();
          fallbackViaImage(file, maxDimension, quality).then(resolve);
        })
        .catch(() => {
          fallbackViaImage(file, maxDimension, quality).then(resolve);
        });
    } else {
      fallbackViaImage(file, maxDimension, quality).then(resolve);
    }
  });
}

function fallbackViaImage(
  file: File | Blob,
  maxDimension: number,
  quality: number
): Promise<string> {
  return new Promise((resolve) => {
    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      // If object URL cannot be created, fallback to empty
      resolve('');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width || 400;
      canvas.height = height || 400;
      const ctx = canvas.getContext('2d', { alpha: false });

      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.width = 0;
        canvas.height = 0;
        resolve(dataUrl);
      } else {
        resolve('');
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve('');
    };

    img.src = objectUrl;
  });
}

/**
 * Optimizes a base64 or raw string image to ensure it's under max dimensions and lightweight
 */
export async function optimizeImageDataUrl(
  dataUrl: string,
  maxDimension = 720,
  quality = 0.8
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) {
    return dataUrl;
  }

  // If the base64 string is already tiny (< 100KB), return as is
  if (dataUrl.length < 100000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        canvas.width = 0;
        canvas.height = 0;
        resolve(compressed);
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
