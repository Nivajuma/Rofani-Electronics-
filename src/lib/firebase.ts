import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  memoryLocalCache,
  getFirestore,
  doc,
  getDocFromServer,
  setLogLevel,
  Firestore
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence Firestore internal network retry / backend timeout logs in restricted sandbox environments
try {
  setLogLevel('silent');
} catch {
  // Ignore in environments where setLogLevel is unavailable
}

// Initialize Firebase App instance safely
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore database using memoryLocalCache and long polling.
// Using memoryLocalCache keeps query caches in memory without writing cross-tab state to localStorage.
// This prevents WebStorageSharedClientState from allocating client heartbeat keys in window.localStorage,
// completely eliminating browser QuotaExceededError and Firestore internal assertion crash (ID: b815).
// experimentalForceLongPolling avoids duplex stream buffering timeouts behind proxies and sandboxed iframes.
export const db: Firestore = (() => {
  try {
    return initializeFirestore(
      app,
      {
        localCache: memoryLocalCache(),
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    // If already initialized in hot reload or previous instance, fallback to getFirestore
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
})();

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);

// Connection test helper with fast fallback timeout to prevent 10s blocking
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const fetchDoc = getDocFromServer(doc(db, 'test', 'connection'));
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Connection check timeout')), 2500)
    );
    await Promise.race([fetchDoc, timeout]);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes('the client is offline') ||
        error.message.includes('Quota') ||
        error.message.includes('quota') ||
        error.message.includes('timeout') ||
        error.message.includes('Could not reach') ||
        error.message.includes('unavailable')
      ) {
        return false;
      }
    }
    return false;
  }
}

export function isQuotaExceededError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded') ||
    msg.includes('Free daily read units per project')
  );
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export const FIREBASE_UPGRADE_URL = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;

let isQuotaExceededFlag = false;

export function markQuotaExceeded(): void {
  isQuotaExceededFlag = true;
}

export function getIsQuotaExceeded(): boolean {
  return isQuotaExceededFlag;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };

  // Quota exceeded is an account-level tier threshold, not an application code defect or security rule failure
  if (isQuotaExceededError(error)) {
    markQuotaExceeded();
    console.warn(
      `[Firestore Quota Notice] Free daily read units limit reached for path "${path}". Operating safely in offline local storage mode. Upgrade URL: ${FIREBASE_UPGRADE_URL}`,
      JSON.stringify(errInfo)
    );
    return errInfo;
  }

  // Handle transient offline mode and network connection timeouts cleanly
  const lowerMsg = errInfo.error.toLowerCase();
  if (
    lowerMsg.includes("could not reach cloud firestore backend") ||
    lowerMsg.includes("didn't respond within 10 seconds") ||
    lowerMsg.includes("the client is offline") ||
    lowerMsg.includes("failed to get document because the client is offline") ||
    lowerMsg.includes("unavailable") ||
    lowerMsg.includes("offline")
  ) {
    // POS gracefully runs with local memory/storage when offline
    return errInfo;
  }

  console.error('[Firestore Error]:', JSON.stringify(errInfo));
  return errInfo;
}
