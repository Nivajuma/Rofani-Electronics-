/**
 * High-Capacity Persistent IndexedDB Media Storage for Product Images.
 * 
 * Why this is necessary:
 * Standard browser LocalStorage has a rigid 5MB total limit across the entire app.
 * High-resolution or AI-scanned photos (even compressed to 40KB-100KB) quickly
 * exhaust that 5MB quota when multiple items are added, triggering quota errors
 * that previously caused image data to be stripped.
 * 
 * IndexedDB provides hundreds of megabytes to gigabytes of persistent browser storage,
 * ensuring AI-scanned photos, gallery uploads, and camera snaps NEVER disappear across
 * page refreshes, tab changes, or app restarts.
 */

const DB_NAME = 'retail_pos_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'product_images';

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

// Fast in-memory cache for synchronous reads during renders
const memoryImageCache = new Map<string, string>();

/**
 * Initialize or retrieve the open IndexedDB instance
 */
export function getMediaDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        dbInstance = request.result;
        resolve(dbInstance);
      };

      request.onerror = () => {
        console.warn('Could not open IndexedDB media database:', request.error);
        reject(request.error);
      };
    } catch (err) {
      console.warn('Exception opening IndexedDB:', err);
      reject(err);
    }
  });

  return dbInitPromise;
}

/**
 * Save a product's image into IndexedDB and in-memory cache
 */
export async function saveProductImageToIndexedDB(productId: string, imageUrl: string): Promise<boolean> {
  if (!productId || !imageUrl) return false;

  // Always update fast in-memory cache
  memoryImageCache.set(productId, imageUrl);

  try {
    const db = await getMediaDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.put(imageUrl, productId);

      req.onsuccess = () => resolve(true);
      req.onerror = () => {
        console.warn(`Error storing image for product ${productId} in IndexedDB:`, req.error);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('Falling back to memory cache for image persistence:', err);
    return false;
  }
}

/**
 * Save multiple product images in a single atomic transaction
 */
export async function saveAllProductImagesToIndexedDB(
  products: { id: string; imageUrl?: string }[]
): Promise<void> {
  if (!products || products.length === 0) return;

  const validEntries = products.filter((p) => p.id && p.imageUrl && p.imageUrl.trim().length > 0);
  if (validEntries.length === 0) return;

  // Cache in memory immediately
  validEntries.forEach((p) => {
    memoryImageCache.set(p.id, p.imageUrl!);
  });

  try {
    const db = await getMediaDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    validEntries.forEach((p) => {
      store.put(p.imageUrl!, p.id);
    });
  } catch (err) {
    console.warn('Batch saving images to IndexedDB failed:', err);
  }
}

/**
 * Retrieve a single product's image from IndexedDB
 */
export async function getProductImageFromIndexedDB(productId: string): Promise<string | null> {
  if (!productId) return null;

  if (memoryImageCache.has(productId)) {
    return memoryImageCache.get(productId)!;
  }

  try {
    const db = await getMediaDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(productId);

      req.onsuccess = () => {
        const val = req.result;
        if (typeof val === 'string' && val.length > 0) {
          memoryImageCache.set(productId, val);
          resolve(val);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Retrieve all product images stored in IndexedDB as a lookup dictionary { [productId]: imageUrl }
 */
export async function getAllProductImagesFromIndexedDB(): Promise<Record<string, string>> {
  try {
    const db = await getMediaDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.openCursor();
      const results: Record<string, string> = {};

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const key = String(cursor.key);
          const value = cursor.value;
          if (typeof value === 'string' && value.length > 0) {
            results[key] = value;
            memoryImageCache.set(key, value);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      req.onerror = () => {
        console.warn('Error reading images from IndexedDB cursor:', req.error);
        const fallback: Record<string, string> = {};
        memoryImageCache.forEach((v, k) => {
          fallback[k] = v;
        });
        resolve(fallback);
      };
    });
  } catch {
    const fallback: Record<string, string> = {};
    memoryImageCache.forEach((v, k) => {
      fallback[k] = v;
    });
    return fallback;
  }
}

/**
 * Delete a product's image from IndexedDB
 */
export async function deleteProductImageFromIndexedDB(productId: string): Promise<boolean> {
  memoryImageCache.delete(productId);
  try {
    const db = await getMediaDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(productId);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Synchronous read from in-memory cache if available
 */
export function getMemoryCachedImage(productId: string): string | undefined {
  return memoryImageCache.get(productId);
}
