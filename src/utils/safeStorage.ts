/**
 * Safe LocalStorage Helpers with Quota Guard & Corruption Recovery
 * Backed by high-capacity IndexedDB for heavy image data
 */
import { saveAllProductImagesToIndexedDB } from './imageStorage';

export function safeGetJSON<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : defaultValue;
  } catch (err) {
    console.warn(`Error parsing localStorage key "${key}", falling back to default:`, err);
    return defaultValue;
  }
}

export function safeSetJSON(key: string, value: any): boolean {
  // If saving products, proactively ensure all images are safely recorded in IndexedDB
  if (key === 'retail_pos_products' && Array.isArray(value)) {
    try {
      saveAllProductImagesToIndexedDB(value);
    } catch (idbErr) {
      console.warn('Proactive image IndexedDB backup failed:', idbErr);
    }
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err: any) {
    console.warn(`LocalStorage quota exceeded or write failed for key "${key}":`, err);

    // If quota exceeded, backup images to IndexedDB first so they are never lost,
    // then reduce footprint in localStorage to keep text/metadata operational.
    try {
      if (Array.isArray(value)) {
        if (key === 'retail_pos_products') {
          saveAllProductImagesToIndexedDB(value);
        }

        const trimmed = value.map((item) => {
          if (item && typeof item === 'object') {
            const copy = { ...item };
            // If image is a large data URL, strip from localStorage only because IndexedDB holds the real photo
            if (typeof copy.imageUrl === 'string' && copy.imageUrl.startsWith('data:') && copy.imageUrl.length > 50000) {
              copy.imageUrl = '';
            }
            return copy;
          }
          return item;
        });
        localStorage.setItem(key, JSON.stringify(trimmed));
        return true;
      }
    } catch (fallbackErr) {
      console.error(`Failed to save fallback data for "${key}":`, fallbackErr);
    }
    return false;
  }
}
