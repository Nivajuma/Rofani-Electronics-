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

const STORAGE_KEY = 'retail_pos_pending_sync_queue';
const SYNC_EVENT = 'retail_pos_sync_queue_changed';
const SIMULATED_OFFLINE_KEY = 'retail_pos_simulated_offline';
const NETWORK_STATUS_EVENT = 'retail_pos_network_status_changed';

let _simulatedOffline: boolean = (() => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
  } catch {
    return false;
  }
})();

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
 * Add an action performed while offline to the sync queue
 */
export function addPendingSyncItem(
  item: Omit<PendingSyncItem, 'id' | 'timestamp'>
): PendingSyncItem {
  const current = getPendingSyncQueue();
  const newItem: PendingSyncItem = {
    ...item,
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  const updated = [newItem, ...current];
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

