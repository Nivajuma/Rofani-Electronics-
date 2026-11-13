import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setLogLevel,
  Firestore
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import rawConfig from '../../firebase-applet-config.json';

// Support Vercel environment variables (VITE_FIREBASE_*) with safe fallback to firebase-applet-config.json
const env = (import.meta as any)?.env || {};
export const firebaseConfig = {
  apiKey: (env.VITE_FIREBASE_API_KEY as string) || rawConfig.apiKey,
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string) || rawConfig.authDomain,
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string) || rawConfig.projectId,
  storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET as string) || rawConfig.storageBucket,
  messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || rawConfig.messagingSenderId,
  appId: (env.VITE_FIREBASE_APP_ID as string) || rawConfig.appId,
  firestoreDatabaseId: (env.VITE_FIREBASE_DATABASE_ID as string) || (rawConfig as any).firestoreDatabaseId,
  measurementId: rawConfig.measurementId || '',
};

// Silence Firestore internal network retry / backend timeout logs in restricted sandbox environments
try {
  setLogLevel('silent');
} catch {
  // Ignore in environments where setLogLevel is unavailable
}

// Initialize Firebase App instance safely
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore database with ignoreUndefinedProperties and experimentalForceLongPolling
// so restricted mobile, proxy, and iframe networks never hang on WebChannel streams.
export const db: Firestore = (() => {
  try {
    return initializeFirestore(
      app,
      {
        ignoreUndefinedProperties: true,
        experimentalForceLongPolling: true,
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

// Connection test helper: verifies live Firestore connectivity against the products collection
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const fetchDoc = getDoc(doc(db, 'products', 'prod-1'));
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Connection check timeout')), 8000)
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
    lowerMsg.includes("timed out") ||
    lowerMsg.includes("aborterror") ||
    lowerMsg.includes("failed to fetch") ||
    lowerMsg.includes("networkerror") ||
    lowerMsg.includes("load failed") ||
    lowerMsg.includes("the client is offline") ||
    lowerMsg.includes("failed to get document because the client is offline") ||
    lowerMsg.includes("unavailable") ||
    lowerMsg.includes("offline")
  ) {
    // POS gracefully runs with local memory/storage when offline or temporarily unreachable
    return errInfo;
  }

  console.error('[Firestore Error]:', JSON.stringify(errInfo));
  return errInfo;
}
