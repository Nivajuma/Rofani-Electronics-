/**
 * Robust IndexedDB Persistent Storage Utility for Rofani POS
 * Protects against Chrome tab sleep / hibernation memory discard (Android, Chrome Desktop & iOS PWA)
 * 
 * IndexedDB has hundreds of megabytes of capacity and NEVER fails due to 5MB localStorage limits.
 */

const DB_NAME = 'RofaniPOS_DB';
const DB_VERSION = 1;
const STORE_NAME = 'store';

let cachedDb: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (cachedDb) return Promise.resolve(cachedDb);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (e: any) => {
        cachedDb = e.target.result;
        cachedDb!.onclose = () => {
          cachedDb = null;
          dbPromise = null;
        };
        resolve(cachedDb!);
      };

      request.onerror = (e: any) => {
        dbPromise = null;
        reject(e.target.error || new Error('Failed to open IndexedDB'));
      };
    } catch (err) {
      dbPromise = null;
      reject(err);
    }
  });

  return dbPromise;
}

export const saveToIDB = async (key: string, data: any): Promise<boolean> => {
  if (typeof window === 'undefined' || !window.indexedDB) return false;
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(data, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
};

export const getFromIDB = async (key: string): Promise<any> => {
  if (typeof window === 'undefined' || !window.indexedDB) return null;
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
};

export const saveMultipleToIDB = async (entries: { key: string; data: any }[]): Promise<boolean> => {
  if (typeof window === 'undefined' || !window.indexedDB || !entries || entries.length === 0) return false;
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        entries.forEach((entry) => {
          store.put(entry.data, entry.key);
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
};

export const getAllKeysFromIDB = async (): Promise<string[]> => {
  if (typeof window === 'undefined' || !window.indexedDB) return [];
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).getAllKeys();
        req.onsuccess = () => resolve((req.result as string[]) || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  } catch {
    return [];
  }
};

export const removeFromIDB = async (key: string): Promise<boolean> => {
  if (typeof window === 'undefined' || !window.indexedDB) return false;
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
};
