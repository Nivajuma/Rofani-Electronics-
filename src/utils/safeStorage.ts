/**
 * Safe LocalStorage Helpers with Quota Guard & Corruption Recovery
 * Backed by high-capacity IndexedDB for heavy image data
 */
import React, { useState, useEffect } from 'react';
import { saveAllProductImagesToIndexedDB } from './imageStorage';

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
          console.warn(`Validation failed for localStorage key "${key}", falling back to initial state.`);
          return defaultValue;
        }
      } catch (valErr) {
        console.warn(`Validator threw error for key "${key}":`, valErr);
        return defaultValue;
      }
    }

    return parsed as T;
  } catch (err) {
    console.warn(`Error parsing localStorage key "${key}", falling back to initial state:`, err);
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
  } catch (err) {
    console.warn(`Error removing localStorage key "${key}":`, err);
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
