/**
 * Offline Sync and Network Status Utility
 * Manages connectivity detection, offline action queuing, and automatic cloud sync
 */

import React, { useState, useEffect, useCallback } from 'react';
import { safeGetJSON, safeSetJSON } from './safeStorage';

export interface PendingSyncItem {
  id: string;
  type: 'sale' | 'product' | 'customer' | 'supplier' | 'expense' | 'restock' | 'user';
  description: string;
  timestamp: string;
  data: any;
}

export interface SyncRetryResult {
  syncedCount: number;
  remainingCount: number;
  errorMessage?: string;
}

const STORAGE_KEY = 'retail_pos_pending_sync_queue';
const SYNC_EVENT = 'retail_pos_sync_queue_changed';
const SIMULATED_OFFLINE_KEY = 'retail_pos_simulated_offline';
const NETWORK_STATUS_EVENT = 'retail_pos_network_status_changed';
const AGGRESSIVE_AUTO_SYNC_KEY = 'retail_pos_aggressive_auto_sync';
const AGGRESSIVE_SYNC_EVENT = 'retail_pos_aggressive_auto_sync_changed';

let _simulatedOffline: boolean = false;

/**
 * Check if the app is currently online (factoring in real browser connectivity and optional simulation)
 */
export function getIsOnline(): boolean {
  if (_simulatedOffline) return false;
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Check whether offline simulation mode is active
 */
export function getIsSimulatedOffline(): boolean {
  return _simulatedOffline;
}

/**
 * Toggle or set simulated offline mode (useful for testing offline UX without disabling device network)
 */
export function setSimulatedOffline(offline: boolean): void {
  _simulatedOffline = offline;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SIMULATED_OFFLINE_KEY, offline ? 'true' : 'false');
    }
  } catch {
    // Ignore storage issues
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NETWORK_STATUS_EVENT, { detail: { isOnline: !offline } }));
    window.dispatchEvent(new Event(offline ? 'offline' : 'online'));
  }
}

/**
 * Get all queued offline actions from storage
 */
export function getPendingSyncQueue(): PendingSyncItem[] {
  return safeGetJSON<PendingSyncItem[]>(STORAGE_KEY, []);
}

/**
 * Get current count of queued actions
 */
export function getPendingSyncCount(): number {
  return getPendingSyncQueue().length;
}

/**
 * Add an action performed while offline (or when cloud write stalled) to the sync queue.
 * Deduplicates older queued entries for the same (type, data.id) so the newest state always wins.
 */
export function addPendingSyncItem(
  item: Omit<PendingSyncItem, 'id' | 'timestamp'>
): PendingSyncItem {
  const current = getPendingSyncQueue();
  const targetRecordId = item.data?.id ? String(item.data.id) : '';
  const filtered = targetRecordId
    ? current.filter((existing) => !(existing.type === item.type && String(existing.data?.id || '') === targetRecordId))
    : current;

  const newItem: PendingSyncItem = {
    ...item,
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  const updated = [newItem, ...filtered];
  safeSetJSON(STORAGE_KEY, updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(SYNC_EVENT, { detail: { count: updated.length } })
    );
  }

  return newItem;
}

/**
 * Remove a successfully synced item from the queue
 */
export function removePendingSyncItem(id: string): void {
  const current = getPendingSyncQueue();
  const updated = current.filter((item) => item.id !== id);
  safeSetJSON(STORAGE_KEY, updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(SYNC_EVENT, { detail: { count: updated.length } })
    );
  }
}

/**
 * Clear all pending sync items
 */
export function clearPendingSyncQueue(): void {
  safeSetJSON(STORAGE_KEY, []);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { count: 0 } }));
  }
}

/**
 * Subscribe to sync queue changes across components
 */
export function subscribeToSyncQueue(callback: (count: number) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: any) => {
    callback(e.detail?.count ?? getPendingSyncCount());
  };

  window.addEventListener(SYNC_EVENT, handler);
  return () => {
    window.removeEventListener(SYNC_EVENT, handler);
  };
}

/**
 * Custom React Hook for live, reactive network status and offline queue
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => getIsOnline());
  const [pendingCount, setPendingCount] = useState<number>(() => getPendingSyncCount());
  const [queuedItems, setQueuedItems] = useState<PendingSyncItem[]>(() => getPendingSyncQueue());
  const [isSimulated, setIsSimulated] = useState<boolean>(() => getIsSimulatedOffline());

  useEffect(() => {
    const handleStatusChange = () => {
      setIsOnline(getIsOnline());
      setIsSimulated(getIsSimulatedOffline());
    };

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    window.addEventListener(NETWORK_STATUS_EVENT, handleStatusChange);

    const unsubscribeQueue = subscribeToSyncQueue((count) => {
      setPendingCount(count);
      setQueuedItems(getPendingSyncQueue());
    });

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      window.removeEventListener(NETWORK_STATUS_EVENT, handleStatusChange);
      unsubscribeQueue();
    };
  }, []);

  const toggleSimulatedOffline = useCallback(() => {
    const nextVal = !getIsSimulatedOffline();
    setSimulatedOffline(nextVal);
    setIsSimulated(nextVal);
    setIsOnline(!nextVal && (typeof navigator !== 'undefined' ? navigator.onLine : true));
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (getIsSimulatedOffline()) {
      return false;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      return false;
    }
    try {
      await fetch('/?ping=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
      setIsOnline(true);
      return true;
    } catch {
      const online = typeof navigator !== 'undefined' ? navigator.onLine : false;
      setIsOnline(online);
      return online;
    }
  }, []);

  return {
    isOnline,
    pendingCount,
    queuedItems,
    isSimulated,
    toggleSimulatedOffline,
    checkConnection,
  };
}

/**
 * Read whether Aggressive Auto-Sync on reconnect/detection is enabled.
 * Defaults to true for continuous real-time sync; disable to prioritize battery life & mobile data.
 */
export function getAggressiveAutoSync(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return true;
  try {
    const raw = localStorage.getItem(AGGRESSIVE_AUTO_SYNC_KEY);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

/**
 * Persist Aggressive Auto-Sync setting and notify all listeners
 */
export function setAggressiveAutoSync(enabled: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(AGGRESSIVE_AUTO_SYNC_KEY, enabled ? 'true' : 'false');
    }
  } catch {
    // Ignore storage issues
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AGGRESSIVE_SYNC_EVENT, { detail: { enabled } }));
  }
}

/**
 * Reactive hook for reading and toggling Aggressive Auto-Sync setting
 */
export function useAggressiveAutoSync(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabledState] = useState<boolean>(() => getAggressiveAutoSync());

  useEffect(() => {
    const handler = (e: any) => {
      if (typeof e?.detail?.enabled === 'boolean') {
        setEnabledState(e.detail.enabled);
      } else {
        setEnabledState(getAggressiveAutoSync());
      }
    };
    window.addEventListener(AGGRESSIVE_SYNC_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(AGGRESSIVE_SYNC_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const updateSetting = useCallback((nextVal: boolean) => {
    setAggressiveAutoSync(nextVal);
    setEnabledState(nextVal);
  }, []);

  return [enabled, updateSetting];
}

export interface SyncHistoryEntry {
  id: string;
  timestamp: string;
  operation: 'queue_flush' | 'full_upload' | 'cloud_pull' | 'realtime_sale';
  status: 'success' | 'partial' | 'failed';
  syncedCount: number;
  failedCount: number;
  summary: string;
  errorDetails?: string;
}

const SYNC_HISTORY_KEY = 'retail_pos_cloud_sync_history';
const SYNC_HISTORY_EVENT = 'retail_pos_cloud_sync_history_changed';
const MAX_SYNC_HISTORY_ENTRIES = 60;

export function getSyncHistory(): SyncHistoryEntry[] {
  return safeGetJSON<SyncHistoryEntry[]>(SYNC_HISTORY_KEY, []);
}

export function addSyncHistoryEntry(
  entry: Omit<SyncHistoryEntry, 'id' | 'timestamp'>
): SyncHistoryEntry {
  const newEntry: SyncHistoryEntry = {
    ...entry,
    id: `synclog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  const current = getSyncHistory();
  const updated = [newEntry, ...current].slice(0, MAX_SYNC_HISTORY_ENTRIES);
  safeSetJSON(SYNC_HISTORY_KEY, updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_HISTORY_EVENT, { detail: updated }));
  }

  return newEntry;
}

export function clearSyncHistory(): void {
  safeSetJSON(SYNC_HISTORY_KEY, []);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_HISTORY_EVENT, { detail: [] }));
  }
}

export function useSyncHistory(): {
  history: SyncHistoryEntry[];
  clearHistory: () => void;
} {
  const [history, setHistory] = useState<SyncHistoryEntry[]>(() => getSyncHistory());

  useEffect(() => {
    const refresh = () => setHistory(getSyncHistory());
    window.addEventListener(SYNC_HISTORY_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(SYNC_HISTORY_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const clearHistory = useCallback(() => {
    clearSyncHistory();
    setHistory([]);
  }, []);

  return { history, clearHistory };
}
