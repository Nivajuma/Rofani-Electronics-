/**
 * Safe LocalStorage Helpers with Quota Guard & Corruption Recovery
 * Backed by high-capacity IndexedDB for heavy image data
 */
import React, { useState, useEffect } from 'react';
import { saveAllProductImagesToIndexedDB } from './imageStorage';

/**
 * Strips heavy data URLs (e.g. base64 camera or AI photos) from products before localStorage.
 * IndexedDB remains the durable source of truth for all binary photo data.
 */
function stripLargeMediaFromProducts(products: any[]): any[] {
  if (!Array.isArray(products)) return products;
  return products.map((item) => {
    if (item && typeof item === 'object') {
      const img = item.imageUrl;
      if (typeof img === 'string' && (img.startsWith('data:') || img.length > 200)) {
        return { ...item, imageUrl: '' };
      }
    }
    return item;
  });
}

/**
 * Scans localStorage and cleans up heavy bloat, stale firestore client states,
 * and oversized log arrays to prevent QuotaExceededError.
 */
export function cleanupLocalStorageQuota(aggressive = false): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    // 1. Clean up stale or leaked firestore multi-tab synchronization keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('firestore_clients_') ||
          key.startsWith('__sak') ||
          key.startsWith('firebase:firestore:'))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });

    // 2. Strip embedded base64 images from retail_pos_products if previously saved
    const rawProducts = localStorage.getItem('retail_pos_products');
    if (rawProducts && rawProducts.includes('data:')) {
      try {
        const parsed = JSON.parse(rawProducts);
        if (Array.isArray(parsed)) {
          try {
            saveAllProductImagesToIndexedDB(parsed);
          } catch {}

          const trimmed = stripLargeMediaFromProducts(parsed);
          localStorage.setItem('retail_pos_products', JSON.stringify(trimmed));
        }
      } catch {}
    }

    // 3. Strip data URL from draft editing product if present
    const rawEditing = localStorage.getItem('retail_pos_inv_editing_product');
    if (rawEditing && rawEditing.includes('data:')) {
      try {
        const parsed = JSON.parse(rawEditing);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.imageUrl === 'string' && parsed.imageUrl.startsWith('data:')) {
            parsed.imageUrl = '';
            localStorage.setItem('retail_pos_inv_editing_product', JSON.stringify(parsed));
          }
        }
      } catch {}
    }

    // 4. Cap growing collection and log arrays to prevent storage choke
    const limits: Record<string, number> = {
      retail_pos_transactions: aggressive ? 30 : 60,
      retail_pos_cash_transactions: aggressive ? 20 : 40,
      retail_pos_restock_records: aggressive ? 20 : 40,
      retail_pos_expenses: aggressive ? 20 : 40,
      retail_pos_attendance: aggressive ? 20 : 40,
      retail_pos_commission_payouts: aggressive ? 15 : 30,
      retail_pos_stock_transfers: aggressive ? 15 : 30,
      retail_pos_online_orders: aggressive ? 15 : 30,
      retail_pos_pending_sync_queue: aggressive ? 15 : 30,
      retail_pos_barcode_scan_logs: aggressive ? 15 : 40,
      retail_pos_audit_logs: aggressive ? 15 : 40,
      retail_pos_sensitive_action_logs: aggressive ? 15 : 40,
      retail_pos_ai_messages: aggressive ? 5 : 15,
      retail_pos_pos_payment_entries: aggressive ? 2 : 5,
    };

    Object.entries(limits).forEach(([key, maxItems]) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > maxItems) {
          localStorage.setItem(key, JSON.stringify(parsed.slice(0, maxItems)));
        }
      } catch {}
    });

    // 5. In aggressive mode, purge non-essential transient cache items
    if (aggressive) {
      const transientKeys = [
        'retail_pos_ai_messages',
        'retail_pos_barcode_scan_logs',
        'retail_pos_sensitive_action_logs',
        'retail_pos_excel_search',
        'retail_pos_audit_search',
        'retail_pos_staff_search',
        'retail_pos_online_search',
        'retail_pos_unlocked_tabs',
      ];
      transientKeys.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {}
      });
    }
  } catch (err) {
    console.warn('[SafeStorage] Storage cleanup notice:', err);
  }
}

// Proactively run cleanup on startup
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    cleanupLocalStorageQuota(false);
  } catch {}
}

/**
 * Safely retrieve and parse a JSON value from localStorage with fallback and optional validation.
 */
export function safeGetJSON<T>(key: string, defaultValue: T, validator?: (val: any) => boolean): T {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultValue;
  }

  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined || raw.trim() === '') {
      return defaultValue;
    }

    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) {
      return defaultValue;
    }

    if (validator && typeof validator === 'function') {
      try {
        if (!validator(parsed)) {
          return defaultValue;
        }
      } catch {
        return defaultValue;
      }
    }

    return parsed as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely store a value in localStorage as JSON with QuotaExceeded guard.
 */
export function safeSetJSON(key: string, value: any): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  // If value is undefined, remove from storage
  if (value === undefined) {
    return safeRemove(key);
  }

  let toStore = value;

  // If saving products, proactively ensure all images are safely recorded in IndexedDB
  // and keep localStorage copy clean of multi-megabyte base64 strings
  if (key === 'retail_pos_products' && Array.isArray(value)) {
    try {
      saveAllProductImagesToIndexedDB(value);
    } catch {}
    toStore = stripLargeMediaFromProducts(value);
  } else if (key === 'retail_pos_inv_editing_product' && value && typeof value === 'object') {
    if (typeof value.imageUrl === 'string' && (value.imageUrl.startsWith('data:') || value.imageUrl.length > 200)) {
      toStore = { ...value, imageUrl: '' };
    }
  }

  // Pre-emptively cap arrays if they exceed safe thresholds
  if (Array.isArray(toStore)) {
    const arrayLimits: Record<string, number> = {
      retail_pos_transactions: 80,
      retail_pos_cash_transactions: 50,
      retail_pos_restock_records: 50,
      retail_pos_expenses: 50,
      retail_pos_attendance: 50,
      retail_pos_commission_payouts: 30,
      retail_pos_barcode_scan_logs: 40,
      retail_pos_audit_logs: 40,
      retail_pos_sensitive_action_logs: 40,
      retail_pos_ai_messages: 15,
      retail_pos_pos_payment_entries: 5,
    };
    if (arrayLimits[key] && toStore.length > arrayLimits[key]) {
      toStore = toStore.slice(0, arrayLimits[key]);
    }
  }

  try {
    localStorage.setItem(key, JSON.stringify(toStore));
    return true;
  } catch (err: any) {
    // Quota exceeded: run emergency cleanup to reclaim space
    try {
      cleanupLocalStorageQuota(true);
    } catch {}

    try {
      // Re-try storing with stripped/compacted data
      let sanitized = toStore;
      if (Array.isArray(toStore) && toStore.length > 20) {
        sanitized = toStore.slice(0, 20);
      }

      localStorage.setItem(key, JSON.stringify(sanitized));
      return true;
    } catch {
      // Graceful fallback: do NOT emit console.error or crash. State remains safely in memory.
      console.warn(`[SafeStorage] "${key}" kept in memory (storage quota limit reached).`);
      return false;
    }
  }
}

/**
 * Safely remove a key from localStorage
 */
export function safeRemove(key: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Custom React hook to automatically synchronize active state with localStorage.
 * Restores saved state on load/reopen with safety validation and fallback.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  validator?: (val: any) => boolean
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => safeGetJSON<T>(key, defaultValue, validator));

  useEffect(() => {
    safeSetJSON(key, state);
  }, [key, state]);

  return [state, setState];
}
