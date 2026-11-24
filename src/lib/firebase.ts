import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  enableNetwork,
  doc,
  getDoc,
  getDocFromServer,
  setLogLevel,
  Firestore
} from 'firebase/firestore';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import rawConfig from '../../firebase-applet-config.json';

// Always use the provisioned Firebase project from firebase-applet-config.json
// (ignoring stale legacy VITE_FIREBASE_* env overrides if they target a different project).
const env = (import.meta as any)?.env || {};
const hasMatchingEnvProject =
  !env.VITE_FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID === rawConfig.projectId;

export const firebaseConfig = {
  apiKey: (hasMatchingEnvProject && (env.VITE_FIREBASE_API_KEY as string)) || rawConfig.apiKey,
  authDomain: (hasMatchingEnvProject && (env.VITE_FIREBASE_AUTH_DOMAIN as string)) || rawConfig.authDomain,
  projectId: rawConfig.projectId,
  storageBucket: (hasMatchingEnvProject && (env.VITE_FIREBASE_STORAGE_BUCKET as string)) || rawConfig.storageBucket,
  messagingSenderId: (hasMatchingEnvProject && (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string)) || rawConfig.messagingSenderId,
  appId: (hasMatchingEnvProject && (env.VITE_FIREBASE_APP_ID as string)) || rawConfig.appId,
  firestoreDatabaseId: (hasMatchingEnvProject && (env.VITE_FIREBASE_DATABASE_ID as string)) || (rawConfig as any).firestoreDatabaseId,
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

// Initialize Firestore with memoryLocalCache (the app persists instant offline snapshots and queues
// in localStorage + custom IndexedDB, avoiding Firestore persistentLocalCache Target ID collisions)
// plus ignoreUndefinedProperties and experimentalAutoDetectLongPolling for mobile/proxy networks.
export const db: Firestore = (() => {
  try {
    return initializeFirestore(
      app,
      {
        ignoreUndefinedProperties: true,
        experimentalAutoDetectLongPolling: true,
        localCache: memoryLocalCache(),
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    try {
      return initializeFirestore(
        app,
        {
          ignoreUndefinedProperties: true,
          experimentalAutoDetectLongPolling: true,
        },
        firebaseConfig.firestoreDatabaseId
      );
    } catch {
      // If already initialized in hot reload or previous instance, fallback to getFirestore
      return getFirestore(app, firebaseConfig.firestoreDatabaseId);
    }
  }
})();

let hadOfflineTransition = false;
if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => {
    hadOfflineTransition = true;
  });
}

// Safely re-enable Firestore network stream only after an actual offline transition
export async function refreshFirestoreConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    hadOfflineTransition = true;
    return false;
  }
  if (!hadOfflineTransition) {
    return true;
  }
  try {
    await enableNetwork(db);
    hadOfflineTransition = false;
    return true;
  } catch {
    return false;
  }
}

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);

export const OWNER_CLOUD_EMAIL = 'nivajuma@gmail.com';
export const OWNER_PRIMARY_STORE_ID = 'rofani-pos';

export function isOwnerCloudUser(user: FirebaseUser | null | undefined): boolean {
  return Boolean(
    user &&
    user.emailVerified &&
    user.email &&
    user.email.toLowerCase() === OWNER_CLOUD_EMAIL
  );
}

export function isAuthorizedCloudUser(user: FirebaseUser | null | undefined): boolean {
  return Boolean(user && user.emailVerified);
}

export function getStoreIdForUser(user: FirebaseUser | null | undefined): string | null {
  if (!user || !user.emailVerified) return null;
  return user.uid;
}

export function getFirebaseAuthConsoleUrl(): string {
  return `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;
}

export async function signInWithGoogleForCloud(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err: any) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'vercel.app';
    if (
      err?.code === 'auth/unauthorized-domain' ||
      err?.message?.includes('unauthorized-domain')
    ) {
      const customErr: any = new Error(
        `Domain '${host}' is not authorized in Firebase Authentication. Add '${host}' (and 'vercel.app') in Firebase Console -> Authentication -> Settings -> Authorized domains.`
      );
      customErr.code = 'auth/unauthorized-domain';
      customErr.isUnauthorizedDomain = true;
      customErr.hostname = host;
      customErr.consoleUrl = getFirebaseAuthConsoleUrl();
      throw customErr;
    }
    if (
      err?.code === 'auth/popup-blocked' ||
      err?.code === 'auth/operation-not-supported-in-this-environment' ||
      err?.code === 'auth/cancelled-popup-request'
    ) {
      const popupErr: any = new Error(
        'Browser popup sign-in was blocked or interrupted. Allow popups for this site or use "Sign in via Redirect" below.'
      );
      popupErr.code = err?.code || 'auth/popup-blocked';
      popupErr.isPopupBlocked = true;
      throw popupErr;
    }
    throw err;
  }
}

export async function signInWithGoogleRedirectForCloud(): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithRedirect(auth, provider);
}

export async function completeGoogleRedirectSignIn(): Promise<FirebaseUser | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (err: any) {
    console.warn('Google redirect sign-in check notice:', err?.message || err);
    return null;
  }
}

export async function signOutFromCloud(): Promise<void> {
  await signOut(auth);
}

// Connection test helper: verifies live Firestore connectivity against the server within 4s
// with HTTPS REST fallback when WebChannel is slow or blocked in iframe/mobile proxies.
export async function testFirestoreConnection(): Promise<boolean> {
  if (
    !firebaseConfig?.projectId ||
    !firebaseConfig?.apiKey ||
    !firebaseConfig?.firestoreDatabaseId
  ) {
    console.error('Please check your Firebase configuration.');
    return false;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  if (!auth.currentUser || !auth.currentUser.emailVerified) {
    return false;
  }

  const storeId = getStoreIdForUser(auth.currentUser) || auth.currentUser.uid;
  try {
    const fetchDoc = getDocFromServer(doc(db, 'stores', storeId));
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Connection check timeout')), 4000)
    );
    await Promise.race([fetchDoc, timeout]);
    return true;
  } catch (error) {
    // Fallback to direct Firestore HTTPS REST read so proxy/WebChannel delays never emit false config errors
    try {
      const idToken = await auth.currentUser.getIdToken();
      if (idToken) {
        const dbId = encodeURIComponent(firebaseConfig.firestoreDatabaseId);
        const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
          firebaseConfig.projectId
        )}/databases/${dbId}/documents/stores/${encodeURIComponent(storeId)}?key=${encodeURIComponent(
          firebaseConfig.apiKey
        )}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        try {
          const res = await fetch(endpoint, {
            method: 'GET',
            headers: { Authorization: `Bearer ${idToken}` },
            signal: controller.signal,
          });
          if (res.ok || res.status === 404) {
            return true;
          }
        } finally {
          clearTimeout(timer);
        }
      }
    } catch {
      // Transient offline / sandbox network restriction; handled silently below
    }

    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firestore] Client offline or WebChannel unavailable; continuing in offline-safe mode.');
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
