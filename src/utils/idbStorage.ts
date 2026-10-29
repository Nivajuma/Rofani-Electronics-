/**
 * Robust IndexedDB Persistent Storage Utility for Rofani POS
 * Protects against mobile sleep / hibernation data loss (Android Chrome / iOS PWA)
 */

export const saveToIDB = async (key: string, data: any): Promise<boolean> => {
  if (typeof window === 'undefined' || !window.indexedDB) return false;
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('RofaniPOS_DB', 1);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('store')) {
          db.createObjectStore('store');
        }
      };
      request.onsuccess = (e: any) => {
        try {
          const db = e.target.result;
          const tx = db.transaction('store', 'readwrite');
          tx.objectStore('store').put(data, key);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      };
      request.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
};

export const getFromIDB = async (key: string): Promise<any> => {
  if (typeof window === 'undefined' || !window.indexedDB) return null;
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('RofaniPOS_DB', 1);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('store')) {
          db.createObjectStore('store');
        }
      };
      request.onsuccess = (e: any) => {
        try {
          const db = e.target.result;
          const tx = db.transaction('store', 'readonly');
          const getReq = tx.objectStore('store').get(key);
          getReq.onsuccess = () => resolve(getReq.result);
          getReq.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};
