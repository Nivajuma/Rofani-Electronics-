import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  getDoc,
  runTransaction,
  query,
  where,
} from 'firebase/firestore';
import {
  db,
  auth,
  firebaseConfig,
  handleFirestoreError,
  OperationType,
  isQuotaExceededError,
  getStoreIdForUser,
  OWNER_PRIMARY_STORE_ID,
  OWNER_CLOUD_EMAIL,
  isOwnerCloudUser,
  isSuperAdminEmail,
} from './firebase';
import { getActiveTenantStoreId, getActiveBranchCloudStoreId, resolveTenantStorageKey } from '../utils/tenantScope';
import { TRANSACTION_SETTINGS_DEFAULT } from '../utils/transactionSettings';
import {
  getOwnerMaxAllowedBranches,
  isBranchLicenseUnlocked,
} from '../utils/branchLicensing';
import {
  Product,
  Transaction,
  Customer,
  Supplier,
  Expense,
  RestockRecord,
  User,
  SensitiveActionLog,
  StoreSubscriptionProfile,
  SubscriptionPaymentRecord,
  ReferralCodeLookup,
  ReferralRewardClaim,
  CustomerDepositRecord,
  CustomerComplaint,
  CustomerReturnRecord,
  EtimsComplianceConfig,
  BusinessTypeId,
} from '../types';

const DEFAULT_FIRESTORE_WRITE_TIMEOUT_MS = 18000;
const DEFAULT_FIRESTORE_BATCH_SDK_TIMEOUT_MS = 10000;
const DEFAULT_FIRESTORE_READ_TIMEOUT_MS = 20000;

/**
 * Resolves the active Firestore store scope (`rofani-pos` for owner, `user.uid` for merchants).
 */
export function resolveCloudStoreId(explicitStoreId?: string): string {
  if (explicitStoreId && explicitStoreId.trim()) {
    return explicitStoreId.trim();
  }
  const activeBranch = getActiveBranchCloudStoreId();
  if (activeBranch) {
    return activeBranch;
  }
  const authStoreId = getStoreIdForUser(auth.currentUser);
  if (authStoreId) {
    return authStoreId;
  }
  return getActiveTenantStoreId() || OWNER_PRIMARY_STORE_ID;
}

function getScopedCollectionPath(subCollectionName: string, storeId?: string): string {
  return `stores/${resolveCloudStoreId(storeId)}/${subCollectionName}`;
}

function getScopedCollectionRef(subCollectionName: string, storeId?: string) {
  const sid = resolveCloudStoreId(storeId);
  return collection(db, 'stores', sid, subCollectionName);
}

function getScopedDocRef(subCollectionName: string, docId: string, storeId?: string) {
  const sid = resolveCloudStoreId(storeId);
  return doc(db, 'stores', sid, subCollectionName, docId);
}

function encodeRestDocumentPath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

/**
 * Wraps any Firestore promise with an offline fast-fail check and a hard timeout
 * so stalled WebChannel promises never leave UI spinners rotating indefinitely.
 */
export async function withFirestoreTimeout<T>(
  promise: Promise<T>,
  operationLabel: string,
  timeoutMs: number = DEFAULT_FIRESTORE_WRITE_TIMEOUT_MS
): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error(`Device is offline while ${operationLabel}. Your data is safely saved locally.`);
  }

  let timerId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      reject(
        new Error(
          `Cloud sync timed out after ${Math.round(timeoutMs / 1000)}s while ${operationLabel}. Your local data is safe; please check your connection and try again.`
        )
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
  }
}

export function isNonRetryableCloudError(error: unknown): boolean {
  if (isQuotaExceededError(error)) return true;
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes('timed out') ||
    msg.includes('offline') ||
    msg.includes('permission') ||
    msg.includes('permission-denied') ||
    msg.includes('unauthenticated') ||
    msg.includes('could not reach') ||
    msg.includes('unavailable')
  );
}

// Sanitize helper to recursively remove undefined values for Firestore compatibility
export function cleanForFirestore<T>(val: T): T {
  if (val === undefined) return undefined as any;
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) {
    return val
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item)) as any;
  }
  const result: any = {};
  for (const [key, value] of Object.entries(val as Record<string, any>)) {
    if (value !== undefined) {
      result[key] = cleanForFirestore(value);
    }
  }
  return result;
}

// ---------------- PRODUCTS LIVE SYNC ----------------

export function subscribeToProducts(
  onUpdate: (products: Product[]) => void,
  onError?: (err: any) => void,
  storeId?: string
) {
  const sid = resolveCloudStoreId(storeId);
  const path = getScopedCollectionPath('products', sid);
  const colRef = getScopedCollectionRef('products', sid);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const loaded: Product[] = [];
      if (!snapshot.empty) {
        snapshot.forEach((d) => {
          loaded.push({ id: d.id, ...d.data() } as Product);
        });
      }
      onUpdate(loaded);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

// Helper to sanitize product document before uploading to Cloud Firestore.
// Strips raw oversized base64 images (>12KB) because full media is persisted in local IndexedDB.
export function cleanProductForFirestore(product: Product): any {
  let cleanedImageUrl = product.imageUrl || '';
  if (typeof cleanedImageUrl === 'string' && cleanedImageUrl.startsWith('data:image/') && cleanedImageUrl.length > 12000) {
    cleanedImageUrl = '';
  }
  return cleanForFirestore({
    ...product,
    imageUrl: cleanedImageUrl,
    updatedAt: product.updatedAt || new Date().toISOString(),
  });
}

export async function saveProductToCloud(product: Product, storeId?: string): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const scopedColPath = getScopedCollectionPath('products', sid);
  const path = `${scopedColPath}/${product.id}`;
  const productWithTimestamp: Product = {
    ...product,
    updatedAt: product.updatedAt || new Date().toISOString(),
  };
  try {
    const docRef = getScopedDocRef('products', productWithTimestamp.id, sid);
    const cleaned = cleanProductForFirestore(productWithTimestamp);
    await withFirestoreTimeout(
      setDoc(docRef, cleaned, { merge: true }),
      `saving product ${productWithTimestamp.name || productWithTimestamp.id}`
    );
  } catch (error) {
    if (
      !isQuotaExceededError(error) &&
      isTransportStallError(error) &&
      (typeof navigator === 'undefined' || navigator.onLine)
    ) {
      try {
        console.warn(`[${path}] SDK setDoc stalled, using HTTPS REST write fallback...`);
        await commitChunkViaRest(
          scopedColPath,
          [productWithTimestamp],
          cleanProductForFirestore,
          `saving product ${productWithTimestamp.name || productWithTimestamp.id}`
        );
        return;
      } catch (restError) {
        handleFirestoreError(restError, OperationType.WRITE, path);
        throw restError;
      }
    }
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteProductFromCloud(productId: string, storeId?: string): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const scopedColPath = getScopedCollectionPath('products', sid);
  const path = `${scopedColPath}/${productId}`;
  try {
    const docRef = getScopedDocRef('products', productId, sid);
    await withFirestoreTimeout(deleteDoc(docRef), `deleting product ${productId}`);
  } catch (error) {
    if (
      !isQuotaExceededError(error) &&
      isTransportStallError(error) &&
      (typeof navigator === 'undefined' || navigator.onLine) &&
      firebaseConfig.projectId &&
      firebaseConfig.apiKey
    ) {
      try {
        const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
        const endpointDbId = dbId === '(default)' ? '(default)' : encodeURIComponent(dbId);
        const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
          firebaseConfig.projectId
        )}/databases/${endpointDbId}/documents/${encodeRestDocumentPath(path)}?key=${encodeURIComponent(
          firebaseConfig.apiKey
        )}`;
        const headers: Record<string, string> = {};
        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(endpoint, { method: 'DELETE', headers });
        if (res.ok || res.status === 404) {
          return;
        }
      } catch {
        // Fall through to standard error handling
      }
    }
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function batchDeleteProductsFromCloud(
  productIds: string[],
  storeId?: string
): Promise<number> {
  const uniqueIds = Array.from(new Set((productIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
  if (uniqueIds.length === 0) return 0;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Device is offline. Product deletions queued locally.');
  }

  const sid = resolveCloudStoreId(storeId);
  const scopedColPath = getScopedCollectionPath('products', sid);
  const CHUNK_SIZE = 100;
  let deletedCount = 0;

  for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
    const chunk = uniqueIds.slice(i, i + CHUNK_SIZE);
    try {
      const batch = writeBatch(db);
      chunk.forEach((pid) => {
        const docRef = getScopedDocRef('products', pid, sid);
        batch.delete(docRef);
      });
      await withFirestoreTimeout(
        batch.commit(),
        `deleting ${chunk.length} products`,
        DEFAULT_FIRESTORE_BATCH_SDK_TIMEOUT_MS
      );
      deletedCount += chunk.length;
    } catch (batchErr) {
      if (isNonRetryableCloudError(batchErr)) {
        // On transport stall, deleteProductFromCloud uses REST fallback; otherwise propagate non-retryable auth/quota error
        if (!isQuotaExceededError(batchErr) && isTransportStallError(batchErr)) {
          for (const pid of chunk) {
            await deleteProductFromCloud(pid, sid);
            deletedCount += 1;
          }
          continue;
        }
        handleFirestoreError(batchErr, OperationType.DELETE, `${scopedColPath}/batch-delete`);
        throw batchErr;
      }

      for (const pid of chunk) {
        await deleteProductFromCloud(pid, sid);
        deletedCount += 1;
      }
    }
  }

  return deletedCount;
}

function decodeFirestoreRestValue(val: any): any {
  if (!val || typeof val !== 'object') return undefined;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('stringValue' in val) return String(val.stringValue);
  if ('timestampValue' in val) return String(val.timestampValue);
  if ('arrayValue' in val) {
    const values = val.arrayValue?.values;
    return Array.isArray(values) ? values.map((v: any) => decodeFirestoreRestValue(v)) : [];
  }
  if ('mapValue' in val) {
    const fields = val.mapValue?.fields || {};
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreRestValue(v);
    }
    return out;
  }
  return undefined;
}

async function fetchCollectionViaRest<T extends { id: string }>(
  collectionPath: string,
  operationLabel: string
): Promise<T[]> {
  if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
    throw new Error('Firebase project configuration is missing.');
  }

  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  const endpointDbId = dbId === '(default)' ? '(default)' : encodeURIComponent(dbId);
  const headers: Record<string, string> = {};
  if (!auth.currentUser) {
    throw new Error('Firebase Auth session not active for Cloud REST read.');
  }
  let token = '';
  try {
    token = await auth.currentUser.getIdToken();
  } catch {
    try {
      token = await auth.currentUser.getIdToken(true);
    } catch {
      token = '';
    }
  }
  if (!token) {
    throw new Error('Firebase Auth ID token unavailable for Cloud REST read.');
  }
  headers['Authorization'] = `Bearer ${token}`;

  const loaded: T[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
        firebaseConfig.projectId
      )}/databases/${endpointDbId}/documents/${encodeRestDocumentPath(collectionPath)}`
    );
    url.searchParams.set('key', firebaseConfig.apiKey);
    url.searchParams.set('pageSize', '300');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_FIRESTORE_READ_TIMEOUT_MS);

    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      if (!res.ok) {
        let errMsg = `Cloud REST read failed (${res.status})`;
        try {
          const errJson = await res.json();
          if (errJson?.error?.message) errMsg = errJson.error.message;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      const docs = Array.isArray(data?.documents) ? data.documents : [];
      for (const d of docs) {
        const nameParts = typeof d?.name === 'string' ? d.name.split('/') : [];
        const id = nameParts[nameParts.length - 1] || '';
        const decoded: Record<string, any> = {};
        if (d?.fields && typeof d.fields === 'object') {
          for (const [k, v] of Object.entries(d.fields)) {
            decoded[k] = decodeFirestoreRestValue(v);
          }
        }
        loaded.push({ id, ...decoded } as T);
      }
      pageToken = data?.nextPageToken || undefined;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error(
          `Cloud sync timed out after ${Math.round(DEFAULT_FIRESTORE_READ_TIMEOUT_MS / 1000)}s while ${operationLabel}. Your local data is safe; please check your connection and try again.`
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  } while (pageToken);

  return loaded;
}

async function fetchCollectionWithFallback<T extends { id: string }>(
  collectionPath: string,
  operationLabel: string
): Promise<T[]> {
  try {
    const segments = collectionPath.split('/').filter(Boolean);
    const colRef =
      segments.length === 1
        ? collection(db, segments[0])
        : segments.length === 3
        ? collection(db, segments[0], segments[1], segments[2])
        : collection(db, collectionPath);
    const snap = await withFirestoreTimeout(getDocs(colRef), operationLabel, 10000);
    const loaded: T[] = [];
    snap.forEach((d) => {
      loaded.push({ id: d.id, ...d.data() } as T);
    });
    return loaded;
  } catch (error) {
    if (
      !isQuotaExceededError(error) &&
      isTransportStallError(error) &&
      (typeof navigator === 'undefined' || navigator.onLine)
    ) {
      try {
        console.warn(`[${collectionPath}] SDK getDocs stalled, using HTTPS REST read fallback...`);
        return await fetchCollectionViaRest<T>(collectionPath, operationLabel);
      } catch (restError) {
        handleFirestoreError(restError, OperationType.LIST, collectionPath);
        throw restError;
      }
    }
    handleFirestoreError(error, OperationType.LIST, collectionPath);
    throw error;
  }
}

// Direct on-demand retrieval of all products from Cloud Firestore
export async function fetchProductsFromCloud(storeId?: string): Promise<Product[]> {
  return fetchCollectionWithFallback<Product>(
    getScopedCollectionPath('products', storeId),
    'fetching products from Cloud Firestore'
  );
}

// Bulk upload initial or custom products to cloud in safe batches
export async function bulkUploadProductsToCloud(
  products: Product[],
  onProgress?: (uploadedCount: number, totalCount: number, batchIndex: number, totalBatches: number) => void,
  storeId?: string
): Promise<number> {
  return batchSaveProductsToCloud(products, onProgress, storeId);
}

function encodeFirestoreRestValue(value: any): any {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return { nullValue: null };
    if (Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER) {
      return { integerValue: String(value) };
    }
    return { doubleValue: value };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.filter((v) => v !== undefined).map((v) => encodeFirestoreRestValue(v)),
      },
    };
  }
  if (typeof value === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) {
        fields[k] = encodeFirestoreRestValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function escapeFirestoreFieldPath(fieldKey: string): string {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldKey)
    ? fieldKey
    : `\`${fieldKey.replace(/`/g, '\\`')}\``;
}

/**
 * Direct HTTPS REST fallback for Firestore batch commits (`documents:commit`).
 */
async function commitChunkViaRest<T extends { id: string }>(
  collectionPath: string,
  chunk: T[],
  sanitizeItem: (item: T) => any,
  operationLabel: string
): Promise<number> {
  if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
    throw new Error('Firebase project configuration is missing for cloud sync.');
  }

  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  const endpointDbId = dbId === '(default)' ? '(default)' : encodeURIComponent(dbId);
  const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    firebaseConfig.projectId
  )}/databases/${endpointDbId}/documents:commit?key=${encodeURIComponent(
    firebaseConfig.apiKey
  )}`;

  const writes = chunk
    .filter((item) => Boolean(item?.id))
    .map((item) => {
      const sanitized = sanitizeItem(item) || {};
      const fields: Record<string, any> = {};
      for (const [k, v] of Object.entries(sanitized)) {
        if (v !== undefined) {
          fields[k] = encodeFirestoreRestValue(v);
        }
      }
      const fieldPaths = Object.keys(fields).map(escapeFirestoreFieldPath);
      const docId = String(item.id).replace(/\//g, '_');
      return {
        update: {
          name: `projects/${firebaseConfig.projectId}/databases/${dbId}/documents/${collectionPath}/${docId}`,
          fields,
        },
        ...(fieldPaths.length > 0 ? { updateMask: { fieldPaths } } : {}),
      };
    });

  if (writes.length === 0) return 0;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (!auth.currentUser) {
    throw new Error('Firebase Auth session not active for Cloud REST write.');
  }
  let token = '';
  try {
    token = await auth.currentUser.getIdToken();
  } catch {
    try {
      token = await auth.currentUser.getIdToken(true);
    } catch {
      token = '';
    }
  }
  if (!token) {
    throw new Error('Firebase Auth ID token unavailable for Cloud REST write.');
  }
  headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_FIRESTORE_WRITE_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ writes }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errMsg = `Cloud REST sync failed (${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson?.error?.message) {
          errMsg = errJson.error.message;
        }
      } catch {}
      throw new Error(errMsg);
    }

    return writes.length;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(
        `Cloud sync timed out after ${Math.round(DEFAULT_FIRESTORE_WRITE_TIMEOUT_MS / 1000)}s while ${operationLabel}. Your local data is safe; please check your connection and try again.`
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function isTransportStallError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes('timed out') ||
    msg.includes('could not reach') ||
    msg.includes('unavailable') ||
    msg.includes('deadline') ||
    msg.includes('network') ||
    msg.includes('target id already exists')
  );
}

/**
 * Generic chunked writeBatch helper scoped to `stores/{storeId}/{subCollectionName}`.
 */
async function batchSaveCollectionToCloud<T extends { id: string }>(
  subCollectionName: string,
  items: T[],
  sanitizeItem: (item: T) => any,
  onProgress?: (uploadedCount: number, totalCount: number, batchIndex: number, totalBatches: number) => void,
  storeId?: string
): Promise<number> {
  if (!items || items.length === 0) return 0;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error(`Device is offline. Cannot push ${subCollectionName} to Cloud Firestore right now.`);
  }

  const sid = resolveCloudStoreId(storeId);
  const scopedColPath = getScopedCollectionPath(subCollectionName, sid);
  const CHUNK_SIZE = subCollectionName === 'products' ? 10 : 20;
  const totalBatches = Math.ceil(items.length / CHUNK_SIZE);
  let totalUploaded = 0;
  let lastError: unknown = null;
  let useRestFallback = false;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batchIndex = Math.floor(i / CHUNK_SIZE) + 1;
    const operationLabel = `uploading ${subCollectionName} batch ${batchIndex}/${totalBatches}`;

    if (useRestFallback) {
      try {
        const restCount = await commitChunkViaRest(scopedColPath, chunk, sanitizeItem, operationLabel);
        totalUploaded += restCount;
      } catch (restErr) {
        handleFirestoreError(restErr, OperationType.WRITE, `${scopedColPath}/rest-batch-${batchIndex}`);
        const msg = restErr instanceof Error ? restErr.message : String(restErr);
        throw new Error(
          totalUploaded > 0
            ? `Synced ${totalUploaded}/${items.length} ${subCollectionName}, then stopped: ${msg}`
            : msg
        );
      }
      if (onProgress) {
        onProgress(totalUploaded, items.length, batchIndex, totalBatches);
      }
      continue;
    }

    try {
      const batch = writeBatch(db);
      for (const item of chunk) {
        if (!item?.id) continue;
        const docRef = getScopedDocRef(subCollectionName, item.id, sid);
        batch.set(docRef, sanitizeItem(item), { merge: true });
      }
      await withFirestoreTimeout(
        batch.commit(),
        operationLabel,
        DEFAULT_FIRESTORE_BATCH_SDK_TIMEOUT_MS
      );
      totalUploaded += chunk.length;
    } catch (batchErr) {
      lastError = batchErr;

      if (!isQuotaExceededError(batchErr) && isTransportStallError(batchErr) && (typeof navigator === 'undefined' || navigator.onLine)) {
        try {
          console.warn(`[${scopedColPath} Batch ${batchIndex}/${totalBatches}] SDK batch stalled, switching to HTTPS REST commit fallback...`);
          const restCount = await commitChunkViaRest(scopedColPath, chunk, sanitizeItem, operationLabel);
          useRestFallback = true;
          totalUploaded += restCount;
          if (onProgress) {
            onProgress(totalUploaded, items.length, batchIndex, totalBatches);
          }
          continue;
        } catch (restFallbackErr) {
          lastError = restFallbackErr;
          handleFirestoreError(restFallbackErr, OperationType.WRITE, `${scopedColPath}/batch-${batchIndex}`);
          const msg = restFallbackErr instanceof Error ? restFallbackErr.message : String(restFallbackErr);
          throw new Error(
            totalUploaded > 0
              ? `Synced ${totalUploaded}/${items.length} ${subCollectionName}, then stopped: ${msg}`
              : msg
          );
        }
      }

      if (isNonRetryableCloudError(batchErr)) {
        handleFirestoreError(batchErr, OperationType.WRITE, `${scopedColPath}/batch-${batchIndex}`);
        const msg = batchErr instanceof Error ? batchErr.message : String(batchErr);
        throw new Error(
          totalUploaded > 0
            ? `Synced ${totalUploaded}/${items.length} ${subCollectionName}, then stopped: ${msg}`
            : msg
        );
      }

      console.warn(`[${scopedColPath} Batch ${batchIndex}/${totalBatches}] writeBatch commit failed, attempting individual doc saves:`, batchErr);
      let chunkUploaded = 0;
      for (const item of chunk) {
        if (!item?.id) continue;
        try {
          const docRef = getScopedDocRef(subCollectionName, item.id, sid);
          await withFirestoreTimeout(
            setDoc(docRef, sanitizeItem(item), { merge: true }),
            `saving ${scopedColPath}/${item.id}`,
            10000
          );
          totalUploaded += 1;
          chunkUploaded += 1;
        } catch (individualErr) {
          lastError = individualErr;
          if (isNonRetryableCloudError(individualErr)) {
            const msg = individualErr instanceof Error ? individualErr.message : String(individualErr);
            throw new Error(
              totalUploaded > 0
                ? `Synced ${totalUploaded}/${items.length} ${subCollectionName}, then stopped: ${msg}`
                : msg
            );
          }
          console.warn(`[${scopedColPath} ${item.id}] Individual cloud save skipped:`, individualErr);
        }
      }

      if (chunkUploaded === 0 && totalUploaded === 0 && lastError) {
        throw lastError;
      }
    }

    if (onProgress) {
      onProgress(totalUploaded, items.length, batchIndex, totalBatches);
    }
  }

  return totalUploaded;
}

export async function batchSaveProductsToCloud(
  products: Product[],
  onProgress?: (uploadedCount: number, totalCount: number, batchIndex: number, totalBatches: number) => void,
  storeId?: string
): Promise<number> {
  return batchSaveCollectionToCloud('products', products, cleanProductForFirestore, onProgress, storeId);
}

export async function batchSaveTransactionsToCloud(
  transactions: Transaction[],
  onProgress?: (uploadedCount: number, totalCount: number, batchIndex: number, totalBatches: number) => void,
  storeId?: string
): Promise<number> {
  return batchSaveCollectionToCloud('transactions', transactions, (tx) => cleanForFirestore(tx), onProgress, storeId);
}

export async function batchSaveCustomersToCloud(
  customers: Customer[],
  onProgress?: (uploadedCount: number, totalCount: number, batchIndex: number, totalBatches: number) => void,
  storeId?: string
): Promise<number> {
  return batchSaveCollectionToCloud('customers', customers, (c) => cleanForFirestore(c), onProgress, storeId);
}

export async function batchSaveSuppliersToCloud(
  suppliers: Supplier[],
  onProgress?: (uploadedCount: number, totalCount: number, batchIndex: number, totalBatches: number) => void,
  storeId?: string
): Promise<number> {
  return batchSaveCollectionToCloud('suppliers', suppliers, (s) => cleanForFirestore(s), onProgress, storeId);
}

export async function batchSaveExpensesToCloud(
  expenses: Expense[],
  onProgress?: (uploadedCount: number, totalCount: number, batchIndex: number, totalBatches: number) => void,
  storeId?: string
): Promise<number> {
  return batchSaveCollectionToCloud('expenses', expenses, (e) => cleanForFirestore(e), onProgress, storeId);
}

// ---------------- TRANSACTIONS (SALES) LIVE SYNC ----------------

export async function commitSaleToCloudBatch(
  tx: Transaction,
  updatedProducts: Product[],
  updatedCustomer?: Customer,
  storeId?: string
): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  try {
    const batch = writeBatch(db);

    const txRef = getScopedDocRef('transactions', tx.id, sid);
    batch.set(
      txRef,
      cleanForFirestore({
        ...tx,
        syncedAt: new Date().toISOString(),
      }),
      { merge: true }
    );

    const soldProductIds = new Set((tx.items || []).map((it) => it.product?.id || (it as any).productId));
    const targetProducts = updatedProducts.filter((p) => soldProductIds.has(p.id));
    for (const p of targetProducts.length > 0 ? targetProducts : updatedProducts.slice(0, 5)) {
      const pRef = getScopedDocRef('products', p.id, sid);
      batch.set(
        pRef,
        cleanProductForFirestore({
          ...p,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    }

    if (updatedCustomer && updatedCustomer.id) {
      const cRef = getScopedDocRef('customers', updatedCustomer.id, sid);
      batch.set(
        cRef,
        cleanForFirestore({
          ...updatedCustomer,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    }

    await withFirestoreTimeout(batch.commit(), 'committing sale batch');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `stores/${sid}/sales/writeBatch`);
    throw error;
  }
}

export async function fetchTransactionsFromCloud(storeId?: string): Promise<Transaction[]> {
  const loaded = await fetchCollectionWithFallback<Transaction>(
    getScopedCollectionPath('transactions', storeId),
    'fetching sales transactions from Cloud Firestore'
  );
  loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return loaded;
}

export function subscribeToTransactions(
  onUpdate: (transactions: Transaction[]) => void,
  onError?: (err: any) => void,
  storeId?: string
) {
  const sid = resolveCloudStoreId(storeId);
  const path = getScopedCollectionPath('transactions', sid);
  const colRef = getScopedCollectionRef('transactions', sid);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const loaded: Transaction[] = [];
      if (!snapshot.empty) {
        snapshot.forEach((d) => {
          loaded.push({ id: d.id, ...d.data() } as Transaction);
        });
        loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
      onUpdate(loaded);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

export async function saveTransactionToCloud(tx: Transaction, storeId?: string): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('transactions', sid)}/${tx.id}`;
  try {
    const docRef = getScopedDocRef('transactions', tx.id, sid);
    const cleaned = cleanForFirestore(tx);
    await withFirestoreTimeout(
      setDoc(docRef, cleaned, { merge: true }),
      `saving sale ${tx.receiptNumber || tx.id}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteTransactionFromCloud(txId: string, storeId?: string): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('transactions', sid)}/${txId}`;
  try {
    const docRef = getScopedDocRef('transactions', txId, sid);
    await withFirestoreTimeout(deleteDoc(docRef), `deleting sale ${txId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ---------------- CUSTOMERS LIVE SYNC ----------------

export function subscribeToCustomers(
  onUpdate: (customers: Customer[]) => void,
  onError?: (err: any) => void,
  storeId?: string
) {
  const sid = resolveCloudStoreId(storeId);
  const path = getScopedCollectionPath('customers', sid);
  const colRef = getScopedCollectionRef('customers', sid);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Customer[] = [];
        snapshot.forEach((d) => {
          loaded.push({ id: d.id, ...d.data() } as Customer);
        });
        onUpdate(loaded);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

export async function saveCustomerToCloud(cust: Customer, storeId?: string): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('customers', sid)}/${cust.id}`;
  try {
    const docRef = getScopedDocRef('customers', cust.id, sid);
    const cleaned = cleanForFirestore(cust);
    await withFirestoreTimeout(
      setDoc(docRef, cleaned, { merge: true }),
      `saving customer ${cust.name || cust.id}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteCustomerFromCloud(customerId: string, storeId?: string): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('customers', sid)}/${customerId}`;
  try {
    const docRef = getScopedDocRef('customers', customerId, sid);
    await withFirestoreTimeout(deleteDoc(docRef), `deleting customer ${customerId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function fetchCustomersFromCloud(storeId?: string): Promise<Customer[]> {
  return fetchCollectionWithFallback<Customer>(
    getScopedCollectionPath('customers', storeId),
    'fetching customers from Cloud Firestore'
  );
}

// ---------------- SUPPLIERS LIVE SYNC ----------------

export function subscribeToSuppliers(
  onUpdate: (suppliers: Supplier[]) => void,
  onError?: (err: any) => void,
  storeId?: string
) {
  const sid = resolveCloudStoreId(storeId);
  const path = getScopedCollectionPath('suppliers', sid);
  const colRef = getScopedCollectionRef('suppliers', sid);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Supplier[] = [];
        snapshot.forEach((d) => {
          loaded.push({ id: d.id, ...d.data() } as Supplier);
        });
        onUpdate(loaded);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

export async function saveSupplierToCloud(supp: Supplier, storeId?: string): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('suppliers', sid)}/${supp.id}`;
  try {
    const docRef = getScopedDocRef('suppliers', supp.id, sid);
    const cleaned = cleanForFirestore(supp);
    await withFirestoreTimeout(
      setDoc(docRef, cleaned, { merge: true }),
      `saving supplier ${supp.name || supp.id}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteSupplierFromCloud(supplierId: string, storeId?: string): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('suppliers', sid)}/${supplierId}`;
  try {
    const docRef = getScopedDocRef('suppliers', supplierId, sid);
    await withFirestoreTimeout(deleteDoc(docRef), `deleting supplier ${supplierId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function fetchSuppliersFromCloud(storeId?: string): Promise<Supplier[]> {
  return fetchCollectionWithFallback<Supplier>(
    getScopedCollectionPath('suppliers', storeId),
    'fetching suppliers from Cloud Firestore'
  );
}

// ---------------- EXPENSES LIVE SYNC ----------------

export function subscribeToExpenses(
  onUpdate: (expenses: Expense[]) => void,
  onError?: (err: any) => void,
  storeId?: string
) {
  const sid = resolveCloudStoreId(storeId);
  const path = getScopedCollectionPath('expenses', sid);
  const colRef = getScopedCollectionRef('expenses', sid);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Expense[] = [];
        snapshot.forEach((d) => {
          loaded.push({ id: d.id, ...d.data() } as Expense);
        });
        onUpdate(loaded);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

export async function saveExpenseToCloud(exp: Expense, storeId?: string): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('expenses', sid)}/${exp.id}`;
  try {
    const docRef = getScopedDocRef('expenses', exp.id, sid);
    const cleaned = cleanForFirestore(exp);
    await withFirestoreTimeout(setDoc(docRef, cleaned, { merge: true }), `saving expense ${exp.id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteExpenseFromCloud(expenseId: string, storeId?: string): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('expenses', sid)}/${expenseId}`;
  try {
    const docRef = getScopedDocRef('expenses', expenseId, sid);
    await withFirestoreTimeout(deleteDoc(docRef), `deleting expense ${expenseId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function fetchExpensesFromCloud(storeId?: string): Promise<Expense[]> {
  const loaded = await fetchCollectionWithFallback<Expense>(
    getScopedCollectionPath('expenses', storeId),
    'fetching expenses from Cloud Firestore'
  );
  loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return loaded;
}

// ---------------- RESTOCK RECORDS LIVE SYNC ----------------

export function subscribeToRestockRecords(
  onUpdate: (records: RestockRecord[]) => void,
  onError?: (err: any) => void,
  storeId?: string
) {
  const sid = resolveCloudStoreId(storeId);
  const path = getScopedCollectionPath('restock_records', sid);
  const colRef = getScopedCollectionRef('restock_records', sid);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: RestockRecord[] = [];
        snapshot.forEach((d) => {
          loaded.push({ id: d.id, ...d.data() } as RestockRecord);
        });
        onUpdate(loaded);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

export async function saveRestockRecordToCloud(rec: RestockRecord, storeId?: string): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('restock_records', sid)}/${rec.id}`;
  try {
    const docRef = getScopedDocRef('restock_records', rec.id, sid);
    const cleaned = cleanForFirestore(rec);
    await withFirestoreTimeout(setDoc(docRef, cleaned, { merge: true }), `saving restock record ${rec.id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// ---------------- STORE SECURITY & PIN LIVE SYNC ----------------

export interface StoreSecurityConfig {
  requirePinOnStartup: boolean;
  biometricUnlockEnabled?: boolean;
  masterPin: string;
  storeName?: string;
  recoveryEmail?: string;
  emergencyKey?: string;
  updatedAt?: string;
}

export function subscribeToStoreSecurity(
  onUpdate: (config: StoreSecurityConfig) => void,
  onError?: (err: any) => void,
  storeId?: string
) {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('store_settings', sid)}/security_config`;
  const docRef = getScopedDocRef('store_settings', 'security_config', sid);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as StoreSecurityConfig);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
}

export async function saveStoreSecurityToCloud(config: StoreSecurityConfig, storeId?: string): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('store_settings', sid)}/security_config`;
  try {
    const docRef = getScopedDocRef('store_settings', 'security_config', sid);
    const cleaned = cleanForFirestore({
      ...config,
      updatedAt: new Date().toISOString(),
    });
    await withFirestoreTimeout(setDoc(docRef, cleaned, { merge: true }), 'saving store security config');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// ---------------- MPESA TILL & DARAJA CONFIG LIVE SYNC ----------------

export function subscribeToMpesaConfig(
  onUpdate: (config: any) => void,
  onError?: (err: any) => void,
  storeId?: string
) {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('store_settings', sid)}/mpesa_config`;
  const docRef = getScopedDocRef('store_settings', 'mpesa_config', sid);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data());
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
}

export async function saveMpesaConfigToCloud(config: any, storeId?: string): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('store_settings', sid)}/mpesa_config`;
  try {
    const docRef = getScopedDocRef('store_settings', 'mpesa_config', sid);
    const cleaned = cleanForFirestore({
      ...config,
      updatedAt: new Date().toISOString(),
    });
    await withFirestoreTimeout(setDoc(docRef, cleaned, { merge: true }), 'saving M-Pesa config');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// ---------------- TRANSACTION SETTINGS LIVE SYNC (stores/{storeId}/settings/transaction) ----------------

export function subscribeToTransactionSettings(
  onUpdate: (config: Record<string, any>) => void,
  onError?: (err: any) => void,
  storeId?: string
) {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('settings', sid)}/transaction`;
  const docRef = getScopedDocRef('settings', 'transaction', sid);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as Record<string, any>);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
}

export async function saveTransactionSettingsToCloud(
  config: Record<string, any>,
  storeId?: string
): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const scopedColPath = getScopedCollectionPath('settings', sid);
  const path = `${scopedColPath}/transaction`;
  const cleaned = cleanForFirestore({
    ...config,
    updatedAt: new Date().toISOString(),
  });
  try {
    const docRef = getScopedDocRef('settings', 'transaction', sid);
    await withFirestoreTimeout(setDoc(docRef, cleaned, { merge: true }), 'saving transaction settings');
  } catch (error) {
    if (
      !isQuotaExceededError(error) &&
      isTransportStallError(error) &&
      (typeof navigator === 'undefined' || navigator.onLine)
    ) {
      try {
        await commitChunkViaRest(
          scopedColPath,
          [{ ...cleaned, id: 'transaction' }],
          (item) => cleanForFirestore(item),
          'saving transaction settings'
        );
        return;
      } catch (restError) {
        handleFirestoreError(restError, OperationType.WRITE, path);
        throw restError;
      }
    }
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// ---------------- SHOP PROTECTION & SUMMARY CONTROLS SYNC (stores/{storeId}/settings/shop_controls) ----------------

export function subscribeToShopProtectionSettings(
  onUpdate: (config: Record<string, any>) => void,
  onError?: (err: any) => void,
  storeId?: string
) {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('settings', sid)}/shop_controls`;
  const docRef = getScopedDocRef('settings', 'shop_controls', sid);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as Record<string, any>);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
}

export async function saveShopProtectionSettingsToCloud(
  config: Record<string, any>,
  storeId?: string
): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const scopedColPath = getScopedCollectionPath('settings', sid);
  const path = `${scopedColPath}/shop_controls`;
  const cleaned = cleanForFirestore({
    ...config,
    updatedAt: new Date().toISOString(),
  });
  try {
    const docRef = getScopedDocRef('settings', 'shop_controls', sid);
    await withFirestoreTimeout(setDoc(docRef, cleaned, { merge: true }), 'saving shop protection controls');
  } catch (error) {
    if (
      !isQuotaExceededError(error) &&
      isTransportStallError(error) &&
      (typeof navigator === 'undefined' || navigator.onLine)
    ) {
      try {
        await commitChunkViaRest(
          scopedColPath,
          [{ ...cleaned, id: 'shop_controls' }],
          (item) => cleanForFirestore(item),
          'saving shop protection controls'
        );
        return;
      } catch (restError) {
        handleFirestoreError(restError, OperationType.WRITE, path);
        throw restError;
      }
    }
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// ---------------- USERS (STAFF & WORKERS) LIVE SYNC ----------------

export function subscribeToUsers(
  onUpdate: (users: User[]) => void,
  onError?: (err: any) => void,
  storeId?: string
) {
  const sid = resolveCloudStoreId(storeId);
  const path = getScopedCollectionPath('users', sid);
  const colRef = getScopedCollectionRef('users', sid);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: User[] = [];
        snapshot.forEach((d) => {
          loaded.push({ id: d.id, ...d.data() } as User);
        });
        onUpdate(loaded);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

export async function saveUserToCloud(user: User, storeId?: string): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('users', sid)}/${user.id}`;
  try {
    const docRef = getScopedDocRef('users', user.id, sid);
    const cleaned = cleanForFirestore(user);
    await withFirestoreTimeout(
      setDoc(docRef, cleaned, { merge: true }),
      `saving staff user ${user.name || user.id}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteUserFromCloud(userId: string, storeId?: string): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('users', sid)}/${userId}`;
  try {
    const docRef = getScopedDocRef('users', userId, sid);
    await withFirestoreTimeout(deleteDoc(docRef), `deleting staff user ${userId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function bulkUploadUsersToCloud(users: User[], storeId?: string): Promise<number> {
  if (!users || users.length === 0) return 0;
  try {
    return await batchSaveCollectionToCloud('users', users, (u) => cleanForFirestore(u), undefined, storeId);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${getScopedCollectionPath('users', storeId)}/batch`);
    throw error;
  }
}

export async function fetchUsersFromCloud(storeId?: string): Promise<User[]> {
  return fetchCollectionWithFallback<User>(
    getScopedCollectionPath('users', storeId),
    'fetching staff users from Cloud Firestore'
  );
}

// ---------------- SENSITIVE ACTION & AUDIT LOGS LIVE SYNC ----------------

export function subscribeToAuditLogs(
  onUpdate: (logs: SensitiveActionLog[]) => void,
  onError?: (err: any) => void,
  storeId?: string
) {
  const sid = resolveCloudStoreId(storeId);
  const path = getScopedCollectionPath('sensitive_action_logs', sid);
  const colRef = getScopedCollectionRef('sensitive_action_logs', sid);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: SensitiveActionLog[] = [];
        snapshot.forEach((d) => {
          loaded.push({ id: d.id, ...d.data() } as SensitiveActionLog);
        });
        loaded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        onUpdate(loaded);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

export async function saveAuditLogToCloud(log: SensitiveActionLog, storeId?: string): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('sensitive_action_logs', sid)}/${log.id}`;
  try {
    const docRef = getScopedDocRef('sensitive_action_logs', log.id, sid);
    const cleaned = cleanForFirestore(log);
    await withFirestoreTimeout(setDoc(docRef, cleaned, { merge: true }), 'saving audit log');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// ---------------- MULTI-TENANT STORE PROFILE & SUBSCRIPTIONS ----------------

export async function fetchStoreProfile(storeId: string): Promise<StoreSubscriptionProfile | null> {
  const path = `stores/${storeId}`;
  try {
    const snap = await withFirestoreTimeout(
      getDoc(doc(db, 'stores', storeId)),
      `fetching store profile ${storeId}`,
      3000
    );
    if (!snap.exists()) return null;
    const raw = snap.data() as any;
    const resolvedBusinessType = raw?.businessType || raw?.profile?.businessType;
    return {
      id: snap.id,
      ...raw,
      ...(resolvedBusinessType ? { businessType: resolvedBusinessType } : {}),
    } as StoreSubscriptionProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    throw error;
  }
}

export function subscribeToStoreProfile(
  storeId: string,
  onUpdate: (profile: StoreSubscriptionProfile | null) => void,
  onError?: (err: any) => void
) {
  const path = `stores/${storeId}`;
  const docRef = doc(db, 'stores', storeId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(null);
      } else {
        const raw = snapshot.data() as any;
        const resolvedBusinessType = raw?.businessType || raw?.profile?.businessType;
        onUpdate({
          id: snapshot.id,
          ...raw,
          ...(resolvedBusinessType ? { businessType: resolvedBusinessType } : {}),
        } as StoreSubscriptionProfile);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
}

export const STANDARD_FREE_TRIAL_DAYS = 7;
export const REFERRED_FREE_TRIAL_DAYS = 22;
export const REFERRER_BONUS_DAYS = 30;

export function normalizeReferralCode(raw: string): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 32);
}

export function generateStoreReferralCode(
  storeName: string,
  storeId: string,
  saltIndex: number = 0
): string {
  const cleanedName = String(storeName || '')
    .toUpperCase()
    .replace(/\b(ROFANI|POS|SHOP|STORE|ENTERPRISES|LTD)\b/g, '')
    .replace(/[^A-Z0-9]/g, '');
  const prefix = (cleanedName.slice(0, 4) || 'SHOP').padEnd(4, 'X');
  const uidClean = String(storeId || 'RF01')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const tail = (uidClean.slice(0, 2) + uidClean.slice(-2)).slice(0, 2).padEnd(2, '9');
  const salt = saltIndex > 0 ? String(saltIndex) : '';
  return `ROFANI-${prefix}${tail}${salt}`.slice(0, 20);
}

export async function lookupReferralCode(rawCode: string): Promise<ReferralCodeLookup | null> {
  const normalized = normalizeReferralCode(rawCode);
  if (!normalized || normalized.length < 4) return null;

  const candidates = normalized.startsWith('ROFANI-')
    ? [normalized]
    : [normalized, `ROFANI-${normalized}`];

  for (const candidate of candidates) {
    try {
      const snap = await withFirestoreTimeout(
        getDoc(doc(db, 'referral_codes', candidate)),
        `checking referral code ${candidate}`,
        3000
      );
      if (snap.exists()) {
        return snap.data() as ReferralCodeLookup;
      }
    } catch {
      // Ignore invalid/offline lookup attempt and try next candidate
    }
  }
  return null;
}

export async function ensureReferralCodeForStore(
  profile: StoreSubscriptionProfile
): Promise<StoreSubscriptionProfile> {
  if (!profile?.id) return profile;

  const existingCode = profile.referralCode ? normalizeReferralCode(profile.referralCode) : '';
  let chosenCode = existingCode;

  if (!chosenCode) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateStoreReferralCode(
        profile.ownerEmail?.toLowerCase() === OWNER_CLOUD_EMAIL ? 'NIVA' : profile.storeName,
        profile.id,
        attempt
      );
      try {
        const snap = await withFirestoreTimeout(
          getDoc(doc(db, 'referral_codes', candidate)),
          'checking referral code availability',
          3000
        );
        if (!snap.exists() || snap.data()?.storeId === profile.id) {
          chosenCode = candidate;
          break;
        }
      } catch {
        chosenCode = candidate;
        break;
      }
    }
    if (!chosenCode) {
      chosenCode = generateStoreReferralCode(profile.storeName, profile.id, Date.now() % 97);
    }
  }

  const nowIso = new Date().toISOString();
  try {
    await withFirestoreTimeout(
      setDoc(
        doc(db, 'referral_codes', chosenCode),
        cleanForFirestore({
          code: chosenCode,
          storeId: profile.id,
          storeName: (profile.storeName || 'Rofani POS').slice(0, 200),
          ownerUid: profile.ownerUid || profile.id,
          createdAt: profile.createdAt || nowIso,
        }),
        { merge: true }
      ),
      'registering referral code index',
      3000
    ).catch(() => {});

    if (profile.referralCode !== chosenCode) {
      const updated: StoreSubscriptionProfile = {
        ...profile,
        referralCode: chosenCode,
        referralCount: profile.referralCount ?? 0,
        updatedAt: nowIso,
      };
      await withFirestoreTimeout(
        setDoc(
          doc(db, 'stores', profile.id),
          cleanForFirestore({
            referralCode: chosenCode,
            referralCount: profile.referralCount ?? 0,
            updatedAt: nowIso,
          }),
          { merge: true }
        ),
        'saving store referral code',
        3000
      ).catch(() => {});
      return updated;
    }
  } catch {
    // Non-fatal offline fallback
  }

  return profile.referralCode ? profile : { ...profile, referralCode: chosenCode };
}

export function isLegacyRofaniStoreBrand(name?: string | null): boolean {
  const norm = (name || '').trim().toLowerCase();
  return (
    !norm ||
    norm === 'rofani pos' ||
    norm === 'rofani electronic' ||
    norm === 'rofani electronics' ||
    norm === 'rofani electronic & boutique' ||
    norm === 'rofani electronic and boutique' ||
    norm === 'rofani electronics & boutique' ||
    norm === 'rofani electronics and boutique'
  );
}

export async function ensureOwnerPrimaryStoreProfile(user: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}): Promise<StoreSubscriptionProfile> {
  const targetStoreId = user.uid;
  const nowIso = new Date().toISOString();
  const existing = await fetchStoreProfile(targetStoreId).catch(() => null);
  if (existing) {
    let baseProfile = existing;
    if (existing.subscriptionStatus !== 'active' || existing.planType !== 'annual') {
      const updated: StoreSubscriptionProfile = {
        ...existing,
        ownerId: existing.ownerId || existing.ownerUid || user.uid,
        isPrimaryBranch: existing.isPrimaryBranch ?? true,
        maxAllowedBranches: existing.maxAllowedBranches ?? 10,
        planType: 'annual',
        subscriptionStatus: 'active',
        expiresAt:
          existing.expiresAt && Date.parse(existing.expiresAt) > Date.now() + 365 * 86400000
            ? existing.expiresAt
            : new Date(Date.now() + 10 * 365 * 86400000).toISOString(),
        expiryDate:
          existing.expiresAt && Date.parse(existing.expiresAt) > Date.now() + 365 * 86400000
            ? existing.expiresAt
            : new Date(Date.now() + 10 * 365 * 86400000).toISOString(),
        updatedAt: nowIso,
      };
      await withFirestoreTimeout(
        setDoc(doc(db, 'stores', targetStoreId), cleanForFirestore(updated), { merge: true }),
        'updating primary owner store profile',
        3000
      ).catch(() => {});
      baseProfile = updated;
    }
    return ensureReferralCodeForStore(baseProfile);
  }

  // Fallback: inherit existing primary profile from legacy stores/rofani-pos if present
  const legacyProfile = await fetchStoreProfile(OWNER_PRIMARY_STORE_ID).catch(() => null);
  const resolvedLegacyName =
    legacyProfile?.storeName && !isLegacyRofaniStoreBrand(legacyProfile.storeName)
      ? legacyProfile.storeName
      : 'Rofani POS';
  const masterExpiresAt = new Date(Date.now() + 10 * 365 * 86400000).toISOString();

  const profile: StoreSubscriptionProfile = {
    ...(legacyProfile || {}),
    id: targetStoreId,
    ownerUid: user.uid,
    ownerId: user.uid,
    ownerEmail: (user.email || 'nivajuma@gmail.com').toLowerCase(),
    storeName: resolvedLegacyName,
    branchName: resolvedLegacyName,
    isPrimaryBranch: true,
    maxAllowedBranches: legacyProfile?.maxAllowedBranches ?? 10,
    phone: legacyProfile?.phone || '0700000000',
    kraPin: legacyProfile?.kraPin || '',
    mpesaShortcode: legacyProfile?.mpesaShortcode || '1833804',
    mpesaShortcodeType: legacyProfile?.mpesaShortcodeType || 'till',
    mpesaStoreNumber: legacyProfile?.mpesaStoreNumber || '1365369',
    planType: 'annual',
    subscriptionStatus: 'active',
    expiresAt: masterExpiresAt,
    expiryDate: masterExpiresAt,
    lastPaymentRef: legacyProfile?.lastPaymentRef || 'OWNER-MASTER',
    lastPaymentMethod: 'admin_override',
    referralCode: legacyProfile?.referralCode || generateStoreReferralCode('NIVA', targetStoreId),
    referralCount: legacyProfile?.referralCount ?? 0,
    createdAt: legacyProfile?.createdAt || nowIso,
    updatedAt: nowIso,
  };

  try {
    await withFirestoreTimeout(
      setDoc(doc(db, 'stores', targetStoreId), cleanForFirestore(profile), { merge: true }),
      'initializing Rofani primary store profile',
      3000
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `stores/${targetStoreId}`);
  }
  return ensureReferralCodeForStore(profile);
}

export async function createMerchantStoreProfile(params: {
  uid: string;
  email: string;
  displayName?: string;
  storeName: string;
  businessType?: BusinessTypeId;
  phone: string;
  kraPin?: string;
  mpesaShortcode?: string;
  mpesaShortcodeType?: 'till' | 'paybill';
  referralCode?: string;
}): Promise<StoreSubscriptionProfile> {
  const now = new Date();
  const nowIso = now.toISOString();
  const storeId = params.uid;

  const matchedReferrer = params.referralCode
    ? await lookupReferralCode(params.referralCode).catch(() => null)
    : null;
  const validReferrer =
    matchedReferrer && matchedReferrer.storeId !== storeId ? matchedReferrer : null;

  const grantedTrialDays = validReferrer ? REFERRED_FREE_TRIAL_DAYS : STANDARD_FREE_TRIAL_DAYS;
  const trialExpiresIso = new Date(
    now.getTime() + grantedTrialDays * 24 * 60 * 60 * 1000
  ).toISOString();

  // Generate unique clean referral code for this newly created merchant store
  let ownReferralCode = generateStoreReferralCode(params.storeName, storeId, 0);
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateStoreReferralCode(params.storeName, storeId, attempt);
    const existingCodeSnap = await getDoc(doc(db, 'referral_codes', candidate)).catch(() => null);
    if (!existingCodeSnap || !existingCodeSnap.exists() || existingCodeSnap.data()?.storeId === storeId) {
      ownReferralCode = candidate;
      break;
    }
  }

  const profile: StoreSubscriptionProfile = {
    id: storeId,
    ownerUid: params.uid,
    ownerId: params.uid,
    ownerEmail: params.email.trim().toLowerCase(),
    storeName: params.storeName.trim(),
    branchName: params.storeName.trim(),
    businessType: params.businessType || 'general',
    phone: params.phone.trim(),
    kraPin: (params.kraPin || '').trim().toUpperCase(),
    mpesaShortcode: (params.mpesaShortcode || '').trim(),
    mpesaShortcodeType: params.mpesaShortcodeType || 'till',
    planType: 'trial',
    subscriptionStatus: 'trial',
    expiresAt: trialExpiresIso,
    expiryDate: trialExpiresIso,
    lastPaymentMethod: 'free_trial',
    referralCode: ownReferralCode,
    referralCount: 0,
    trialDaysGranted: grantedTrialDays,
    isPrimaryBranch: true,
    isBranchStore: false,
    maxAllowedBranches: 1,
    taxMode: 'none',
    transactionWiseTax: false,
    ...(validReferrer
      ? {
          referredBy: validReferrer.storeId,
          referredByCode: validReferrer.code,
          referredByStoreName: validReferrer.storeName,
        }
      : {}),
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'stores', storeId), cleanForFirestore(profile), { merge: true });
    batch.set(
      doc(db, 'referral_codes', ownReferralCode),
      cleanForFirestore({
        code: ownReferralCode,
        storeId,
        storeName: profile.storeName.slice(0, 200),
        ownerUid: params.uid,
        createdAt: nowIso,
      }),
      { merge: true }
    );

    if (validReferrer) {
      const claimDoc: ReferralRewardClaim = {
        id: storeId,
        referrerStoreId: validReferrer.storeId,
        referredStoreId: storeId,
        referredStoreName: profile.storeName,
        referralCode: validReferrer.code,
        bonusDays: REFERRER_BONUS_DAYS,
        applied: false,
        awardedAt: nowIso,
      };
      batch.set(
        doc(db, 'stores', validReferrer.storeId, 'referral_rewards', storeId),
        cleanForFirestore(claimDoc)
      );
    }

    await withFirestoreTimeout(
      batch.commit(),
      `creating store ${profile.storeName}`
    );

    const adminUser: User = {
      id: 'usr-owner',
      name: params.displayName?.trim() || `${profile.storeName} Owner`,
      role: 'Admin',
      roles: ['Admin'],
      email: profile.ownerEmail,
      pin: '1234',
      phone: profile.phone,
      status: 'active',
      updatedAt: nowIso,
    };

    await withFirestoreTimeout(
      setDoc(getScopedDocRef('users', adminUser.id, storeId), cleanForFirestore(adminUser), { merge: true }),
      'initializing store admin account'
    );

    await withFirestoreTimeout(
      setDoc(
        getScopedDocRef('store_settings', 'mpesa_config', storeId),
        cleanForFirestore({
          shortcode: profile.mpesaShortcode || '',
          storeNumber: profile.mpesaShortcode || '',
          shortcodeType: profile.mpesaShortcodeType || 'till',
          storeDisplayName: profile.storeName.toUpperCase(),
          environment: 'production',
          mode: profile.mpesaShortcode ? 'live_daraja' : 'instant_demo',
          updatedAt: nowIso,
        }),
        { merge: true }
      ),
      'initializing merchant M-Pesa profile'
    );

    await withFirestoreTimeout(
      setDoc(
        getScopedDocRef('settings', 'transaction', storeId),
        cleanForFirestore({
          ...TRANSACTION_SETTINGS_DEFAULT,
          enableTransactionWiseTax: false,
          activePrefixFirmId: storeId,
          updatedAt: nowIso,
        }),
        { merge: true }
      ),
      'initializing store transaction defaults'
    );

    return profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `stores/${storeId}`);
    throw error;
  }
}

export async function reconcileIncomingReferralRewards(storeId: string): Promise<{
  newlyAppliedCount: number;
  totalBonusDays: number;
  latestReferredStoreName?: string;
  updatedProfile?: StoreSubscriptionProfile;
}> {
  if (!storeId) {
    return { newlyAppliedCount: 0, totalBonusDays: 0 };
  }

  const rewardsColRef = collection(db, 'stores', storeId, 'referral_rewards');
  try {
    const snap = await withFirestoreTimeout(
      getDocs(rewardsColRef),
      'checking referral rewards',
      4000
    );

    const pendingClaims: ReferralRewardClaim[] = [];
    snap.forEach((d) => {
      const data = d.data() as ReferralRewardClaim;
      if (data && data.applied !== true) {
        pendingClaims.push({ ...data, id: d.id });
      }
    });

    if (pendingClaims.length === 0) {
      return { newlyAppliedCount: 0, totalBonusDays: 0 };
    }

    const result = await withFirestoreTimeout(
      runTransaction(db, async (tx) => {
        const storeRef = doc(db, 'stores', storeId);
        const storeSnap = await tx.get(storeRef);
        if (!storeSnap.exists()) {
          return { newlyAppliedCount: 0, totalBonusDays: 0 };
        }

        const currentStore = { id: storeSnap.id, ...storeSnap.data() } as StoreSubscriptionProfile;
        const claimsToApply: { ref: ReturnType<typeof doc>; data: ReferralRewardClaim }[] = [];

        for (const claim of pendingClaims) {
          const claimRef = doc(db, 'stores', storeId, 'referral_rewards', claim.id);
          const freshClaimSnap = await tx.get(claimRef);
          if (freshClaimSnap.exists()) {
            const freshData = freshClaimSnap.data() as ReferralRewardClaim;
            if (freshData.applied !== true) {
              claimsToApply.push({ ref: claimRef, data: freshData });
            }
          }
        }

        if (claimsToApply.length === 0) {
          return { newlyAppliedCount: 0, totalBonusDays: 0 };
        }

        const totalDays = claimsToApply.reduce(
          (sum, c) => sum + (Number(c.data.bonusDays) || REFERRER_BONUS_DAYS),
          0
        );
        const nowMs = Date.now();
        const nowIso = new Date(nowMs).toISOString();
        const existingExpMs = currentStore.expiresAt ? Date.parse(currentStore.expiresAt) : 0;
        const baseMs = Number.isFinite(existingExpMs) && existingExpMs > nowMs ? existingExpMs : nowMs;
        const nextExpiresAt = new Date(baseMs + totalDays * 24 * 60 * 60 * 1000).toISOString();
        const nextReferralCount = (currentStore.referralCount || 0) + claimsToApply.length;
        const latestReferredStoreName =
          claimsToApply[claimsToApply.length - 1]?.data?.referredStoreName || 'a fellow merchant';

        const storePatch: Partial<StoreSubscriptionProfile> = {
          subscriptionStatus: 'active',
          expiresAt: nextExpiresAt,
          referralCount: nextReferralCount,
          lastReferralBonusAt: nowIso,
          lastReferralRewardStoreName: latestReferredStoreName,
          updatedAt: nowIso,
        };

        tx.set(storeRef, cleanForFirestore(storePatch), { merge: true });
        for (const item of claimsToApply) {
          tx.update(item.ref, {
            applied: true,
            appliedAt: nowIso,
          });
        }

        return {
          newlyAppliedCount: claimsToApply.length,
          totalBonusDays: totalDays,
          latestReferredStoreName,
          updatedProfile: {
            ...currentStore,
            ...storePatch,
          } as StoreSubscriptionProfile,
        };
      }),
      'applying referral bonus days',
      5000
    );

    return result;
  } catch (err) {
    console.warn('[Referral Rewards] Non-fatal reconciliation notice:', err);
    return { newlyAppliedCount: 0, totalBonusDays: 0 };
  }
}

export function subscribeToReferralRewards(
  storeId: string,
  onPendingRewardsDetected: () => void
) {
  if (!storeId) return () => {};
  const rewardsColRef = collection(db, 'stores', storeId, 'referral_rewards');
  return onSnapshot(
    rewardsColRef,
    (snapshot) => {
      let hasUnapplied = false;
      snapshot.forEach((d) => {
        const data = d.data() as ReferralRewardClaim;
        if (data && data.applied !== true) {
          hasUnapplied = true;
        }
      });
      if (hasUnapplied) {
        onPendingRewardsDetected();
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `stores/${storeId}/referral_rewards`);
    }
  );
}

export async function updateStoreProfileDetails(
  storeId: string,
  updates: Partial<
    Pick<
      StoreSubscriptionProfile,
      | 'storeName'
      | 'businessType'
      | 'phone'
      | 'kraPin'
      | 'mpesaShortcode'
      | 'mpesaShortcodeType'
      | 'skipLegacySeed'
      | 'preferredLabelSizeId'
      | 'businessCard'
      | 'backupEmail'
      | 'backupEmailConfirmed'
      | 'emailAutoBackupEnabled'
      | 'dismissedBackupBannerDate'
      | 'isMultiBranch'
      | 'businessGroupId'
      | 'businessGroupName'
      | 'parentStoreId'
      | 'isBranchStore'
      | 'isPrimaryBranch'
      | 'branchName'
      | 'maxAllowedBranches'
      | 'branchCode'
      | 'branchCity'
      | 'branchAddress'
      | 'branchManagerName'
    >
  >
): Promise<void> {
  const path = `stores/${storeId}`;
  try {
    await withFirestoreTimeout(
      setDoc(
        doc(db, 'stores', storeId),
        cleanForFirestore({
          ...updates,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      ),
      'updating store details'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function activateStoreSubscription(
  storeId: string,
  params: {
    planType: 'monthly' | 'quarterly' | 'biannual' | 'annual';
    durationDays: number;
    paymentRef: string;
    amount: number;
    phone: string;
    paymentMethod: 'stk_push' | 'manual_receipt';
    currentExpiresAt?: string;
    recordedByEmail?: string;
  }
): Promise<StoreSubscriptionProfile> {
  const nowMs = Date.now();
  const currentExpMs = params.currentExpiresAt ? Date.parse(params.currentExpiresAt) : 0;
  const baseMs = Number.isFinite(currentExpMs) && currentExpMs > nowMs ? currentExpMs : nowMs;
  const nextExpiresAt = new Date(baseMs + params.durationDays * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date(nowMs).toISOString();
  const cleanRef = params.paymentRef.trim().toUpperCase();

  const path = `stores/${storeId}`;
  try {
    // Each branch keeps its own independent subscription status & expiryDate/expiresAt
    const patch = cleanForFirestore({
      planType: params.planType,
      subscriptionStatus: 'active',
      expiresAt: nextExpiresAt,
      expiryDate: nextExpiresAt,
      licensePendingActivation: false,
      lastPaymentRef: cleanRef,
      lastPaymentAmount: params.amount,
      lastPaymentAt: nowIso,
      lastPaymentPhone: params.phone.trim(),
      lastPaymentMethod: params.paymentMethod,
      updatedAt: nowIso,
    });

    await withFirestoreTimeout(
      setDoc(doc(db, 'stores', storeId), patch, { merge: true }),
      'activating branch subscription'
    );

    const paymentId = `subpay-${nowMs}-${Math.random().toString(36).slice(2, 7)}`;
    const paymentRecord: SubscriptionPaymentRecord = {
      id: paymentId,
      storeId,
      planType: params.planType,
      amount: params.amount,
      phoneNumber: params.phone.trim(),
      mpesaReceiptNumber: cleanRef,
      paymentMethod: params.paymentMethod,
      status: 'Completed',
      paidAt: nowIso,
      expiresAtAfter: nextExpiresAt,
      recordedByEmail: params.recordedByEmail,
    };

    await withFirestoreTimeout(
      setDoc(
        getScopedDocRef('subscription_payments', paymentId, storeId),
        cleanForFirestore(paymentRecord),
        { merge: true }
      ),
      'recording subscription payment receipt'
    );

    const updated = await fetchStoreProfile(storeId);
    if (!updated) {
      throw new Error('Could not reload updated store subscription profile.');
    }

    // If an additional branch was just licensed via M-Pesa, ensure owner's maxAllowedBranches accommodates all active licensed branches
    if (updated.ownerUid && (updated.isBranchStore || updated.isPrimaryBranch === false)) {
      try {
        const siblingsSnap = await withFirestoreTimeout(
          getDocs(query(collection(db, 'stores'), where('ownerUid', '==', updated.ownerUid))),
          'updating multi-branch allowance after branch activation',
          4000
        );
        const allOwnerBranches: StoreSubscriptionProfile[] = [];
        siblingsSnap.forEach((docSnap) => {
          allOwnerBranches.push({ id: docSnap.id, ...docSnap.data() } as StoreSubscriptionProfile);
        });
        const activeCount = allOwnerBranches.filter((b) => isBranchLicenseUnlocked(b)).length;
        const currentMax = getOwnerMaxAllowedBranches(allOwnerBranches, updated);
        if (activeCount > currentMax) {
          const primaryTargetId = updated.parentStoreId || updated.ownerUid;
          await setDoc(
            doc(db, 'stores', primaryTargetId),
            cleanForFirestore({
              maxAllowedBranches: activeCount,
              updatedAt: nowIso,
            }),
            { merge: true }
          ).catch(() => {});
        }
      } catch {
        // Non-fatal: branch license is already active
      }
    }

    return updated;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// ---------------- SUPER ADMIN CONTROL PANEL (OWNER ONLY) ----------------

export async function fetchAllStoresForSuperAdmin(): Promise<StoreSubscriptionProfile[]> {
  if (!isOwnerCloudUser(auth.currentUser)) {
    throw new Error('Super Admin privileges required.');
  }
  const list = await fetchCollectionWithFallback<StoreSubscriptionProfile>(
    'stores',
    'fetching all registered subscriber stores'
  );
  list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return list;
}

export function subscribeToAllStoresForSuperAdmin(
  onUpdate: (stores: StoreSubscriptionProfile[]) => void,
  onError?: (err: any) => void
) {
  if (!isOwnerCloudUser(auth.currentUser)) {
    return () => {};
  }
  const colRef = collection(db, 'stores');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const loaded: StoreSubscriptionProfile[] = [];
      snapshot.forEach((d) => {
        loaded.push({ id: d.id, ...d.data() } as StoreSubscriptionProfile);
      });
      loaded.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(loaded);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'stores');
      if (onError) onError(error);
    }
  );
}

export type SuperAdminBranchAction =
  | 'extend_30d'
  | 'extend_1y'
  | 'extend_custom'
  | 'activate'
  | 'suspend';

function buildSuperAdminBranchPatch(
  action: SuperAdminBranchAction,
  currentProfile?: StoreSubscriptionProfile,
  customDays?: number
): Record<string, any> {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const existingExpMs = currentProfile?.expiresAt ? Date.parse(currentProfile.expiresAt) : 0;
  const activeBaseMs = Number.isFinite(existingExpMs) && existingExpMs > nowMs ? existingExpMs : nowMs;

  if (action === 'suspend') {
    return {
      subscriptionStatus: 'suspended',
      updatedAt: nowIso,
    };
  }

  if (action === 'activate') {
    const targetExpIso =
      Number.isFinite(existingExpMs) && existingExpMs > nowMs
        ? new Date(existingExpMs).toISOString()
        : new Date(nowMs + Math.max(1, customDays || 30) * 86400000).toISOString();
    return {
      planType: currentProfile?.planType && currentProfile.planType !== 'trial' ? currentProfile.planType : 'monthly',
      subscriptionStatus: 'active',
      expiresAt: targetExpIso,
      expiryDate: targetExpIso,
      licensePendingActivation: false,
      lastPaymentMethod: 'admin_override',
      lastPaymentAt: nowIso,
      updatedAt: nowIso,
    };
  }

  const days =
    action === 'extend_1y'
      ? 365
      : action === 'extend_custom'
      ? Math.max(1, Math.floor(customDays || 30))
      : 30;
  const nextExpIso = new Date(activeBaseMs + days * 24 * 60 * 60 * 1000).toISOString();
  return {
    planType: days >= 365 ? 'annual' : currentProfile?.planType && currentProfile.planType !== 'trial' ? currentProfile.planType : 'monthly',
    subscriptionStatus: 'active',
    expiresAt: nextExpIso,
    expiryDate: nextExpIso,
    licensePendingActivation: false,
    lastPaymentMethod: 'admin_override',
    lastPaymentAt: nowIso,
    updatedAt: nowIso,
  };
}

export async function superAdminUpdateStoreSubscription(
  storeId: string,
  action: SuperAdminBranchAction,
  currentProfile?: StoreSubscriptionProfile,
  customDays?: number
): Promise<void> {
  if (!isOwnerCloudUser(auth.currentUser)) {
    throw new Error('Only the app owner can modify subscriber access.');
  }
  const isOwnerTarget =
    storeId === OWNER_PRIMARY_STORE_ID ||
    isSuperAdminEmail(currentProfile?.ownerEmail) ||
    (auth.currentUser?.uid && storeId === auth.currentUser.uid);
  if (isOwnerTarget && action === 'suspend') {
    throw new Error('Cannot suspend the primary owner store.');
  }

  const updatePayload = buildSuperAdminBranchPatch(action, currentProfile, customDays);
  const path = `stores/${storeId}`;
  try {
    await withFirestoreTimeout(
      setDoc(doc(db, 'stores', storeId), cleanForFirestore(updatePayload), { merge: true }),
      `updating subscription for ${storeId}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function superAdminBulkUpdateOwnerGroup(
  ownerBranches: StoreSubscriptionProfile[],
  action: SuperAdminBranchAction,
  customDays?: number
): Promise<number> {
  if (!isOwnerCloudUser(auth.currentUser)) {
    throw new Error('Super Admin privileges required.');
  }
  const eligible = ownerBranches.filter((b) => {
    const isMaster = b.id === OWNER_PRIMARY_STORE_ID || isSuperAdminEmail(b.ownerEmail);
    return !(isMaster && action === 'suspend');
  });
  if (eligible.length === 0) return 0;

  const batch = writeBatch(db);
  eligible.forEach((branch) => {
    const patch = buildSuperAdminBranchPatch(action, branch, customDays);
    batch.set(doc(db, 'stores', branch.id), cleanForFirestore(patch), { merge: true });
  });

  await withFirestoreTimeout(
    batch.commit(),
    `bulk updating ${eligible.length} branch(es)`
  );
  return eligible.length;
}

export async function superAdminSetOwnerMaxBranches(
  ownerBranches: StoreSubscriptionProfile[],
  maxAllowedBranches: number
): Promise<number> {
  if (!isOwnerCloudUser(auth.currentUser)) {
    throw new Error('Super Admin privileges required.');
  }
  const clamped = Math.max(1, Math.min(100, Math.floor(maxAllowedBranches || 1)));
  if (ownerBranches.length === 0) return clamped;

  const nowIso = new Date().toISOString();
  const batch = writeBatch(db);
  ownerBranches.forEach((branch) => {
    batch.set(
      doc(db, 'stores', branch.id),
      cleanForFirestore({
        maxAllowedBranches: clamped,
        updatedAt: nowIso,
      }),
      { merge: true }
    );
  });

  await withFirestoreTimeout(
    batch.commit(),
    `setting maxAllowedBranches=${clamped}`
  );
  return clamped;
}

// ---------------- AUTOMATIC ONE-TIME LEGACY DATA BRIDGE (stores/{userId}) ----------------

/**
 * Checks `stores/{userId}` first when NivaJuma@gmail.com connects.
 * If `stores/{userId}` is empty or missing, automatically reads existing products, sales,
 * store_settings, and supporting collections from the original root Firestore collections
 * (with fallback to legacy `stores/rofani-pos`) and copies them into `stores/{userId}`.
 */
export async function migrateLegacyRootCollectionsToOwnerStoreIfNeeded(
  targetUserId?: string
): Promise<boolean> {
  if (!isOwnerCloudUser(auth.currentUser)) return false;
  const userId = (targetUserId || auth.currentUser?.uid || '').trim();
  if (!userId) return false;

  const migrationFlagKey = `rofani_pos_migrated_uid_${userId}`;
  try {
    if (typeof window !== 'undefined') {
      if (window.localStorage?.getItem(migrationFlagKey) === '1') {
        return false;
      }
      const blankModeRaw =
        window.localStorage?.getItem('rofani_pos_blank_mode') ||
        window.localStorage?.getItem(resolveTenantStorageKey('rofani_pos_blank_mode', userId));
      if (blankModeRaw === 'true' || blankModeRaw === '1') {
        window.localStorage?.setItem(migrationFlagKey, '1');
        return false;
      }
    }
  } catch {}

  try {
    const [existingProfile, scopedProducts, scopedSales] = await Promise.all([
      fetchStoreProfile(userId).catch(() => null),
      fetchProductsFromCloud(userId).catch(() => []),
      fetchTransactionsFromCloud(userId).catch(() => []),
    ]);

    if (existingProfile?.skipLegacySeed) {
      try {
        localStorage.setItem(migrationFlagKey, '1');
      } catch {}
      return false;
    }

    if (scopedProducts.length > 0 || scopedSales.length > 0) {
      try {
        localStorage.setItem(migrationFlagKey, '1');
      } catch {}
      return false; // stores/{userId} is already populated
    }

    // 1. Read original root Firestore collections and store_settings documents
    let [
      legacyProducts,
      legacySales,
      legacyCustomers,
      legacySuppliers,
      legacyExpenses,
      legacyUsers,
      legacyRestocks,
      legacyAuditLogs,
      legacyStoreSettings,
    ] = await Promise.all([
      fetchCollectionWithFallback<Product>('products', 'reading root products').catch(() => []),
      fetchCollectionWithFallback<Transaction>('transactions', 'reading root sales').catch(() => []),
      fetchCollectionWithFallback<Customer>('customers', 'reading root customers').catch(() => []),
      fetchCollectionWithFallback<Supplier>('suppliers', 'reading root suppliers').catch(() => []),
      fetchCollectionWithFallback<Expense>('expenses', 'reading root expenses').catch(() => []),
      fetchCollectionWithFallback<User>('users', 'reading root staff').catch(() => []),
      fetchCollectionWithFallback<RestockRecord>('restock_records', 'reading root restocks').catch(() => []),
      fetchCollectionWithFallback<SensitiveActionLog>('sensitive_action_logs', 'reading root audit logs').catch(() => []),
      fetchCollectionWithFallback<any>('store_settings', 'reading root store settings').catch(() => []),
    ]);

    // 2. Secondary fallback: if root collections were empty, check legacy `stores/rofani-pos`
    if (
      legacyProducts.length === 0 &&
      legacySales.length === 0 &&
      legacyCustomers.length === 0 &&
      legacySuppliers.length === 0 &&
      legacyExpenses.length === 0 &&
      legacyUsers.length === 0 &&
      legacyStoreSettings.length === 0
    ) {
      [
        legacyProducts,
        legacySales,
        legacyCustomers,
        legacySuppliers,
        legacyExpenses,
        legacyUsers,
        legacyRestocks,
        legacyAuditLogs,
        legacyStoreSettings,
      ] = await Promise.all([
        fetchProductsFromCloud(OWNER_PRIMARY_STORE_ID).catch(() => []),
        fetchTransactionsFromCloud(OWNER_PRIMARY_STORE_ID).catch(() => []),
        fetchCollectionWithFallback<Customer>(
          getScopedCollectionPath('customers', OWNER_PRIMARY_STORE_ID),
          'reading legacy rofani-pos customers'
        ).catch(() => []),
        fetchCollectionWithFallback<Supplier>(
          getScopedCollectionPath('suppliers', OWNER_PRIMARY_STORE_ID),
          'reading legacy rofani-pos suppliers'
        ).catch(() => []),
        fetchCollectionWithFallback<Expense>(
          getScopedCollectionPath('expenses', OWNER_PRIMARY_STORE_ID),
          'reading legacy rofani-pos expenses'
        ).catch(() => []),
        fetchUsersFromCloud(OWNER_PRIMARY_STORE_ID).catch(() => []),
        fetchCollectionWithFallback<RestockRecord>(
          getScopedCollectionPath('restock_records', OWNER_PRIMARY_STORE_ID),
          'reading legacy rofani-pos restocks'
        ).catch(() => []),
        fetchCollectionWithFallback<SensitiveActionLog>(
          getScopedCollectionPath('sensitive_action_logs', OWNER_PRIMARY_STORE_ID),
          'reading legacy rofani-pos audit logs'
        ).catch(() => []),
        fetchCollectionWithFallback<any>(
          getScopedCollectionPath('store_settings', OWNER_PRIMARY_STORE_ID),
          'reading legacy rofani-pos settings'
        ).catch(() => []),
      ]);
    }

    if (
      legacyProducts.length === 0 &&
      legacySales.length === 0 &&
      legacyCustomers.length === 0 &&
      legacySuppliers.length === 0 &&
      legacyExpenses.length === 0 &&
      legacyUsers.length === 0 &&
      legacyRestocks.length === 0 &&
      legacyAuditLogs.length === 0 &&
      legacyStoreSettings.length === 0
    ) {
      return false;
    }

    await Promise.all([
      legacyProducts.length > 0 ? batchSaveProductsToCloud(legacyProducts, undefined, userId) : Promise.resolve(0),
      legacySales.length > 0 ? batchSaveTransactionsToCloud(legacySales, undefined, userId) : Promise.resolve(0),
      legacyCustomers.length > 0 ? batchSaveCustomersToCloud(legacyCustomers, undefined, userId) : Promise.resolve(0),
      legacySuppliers.length > 0 ? batchSaveSuppliersToCloud(legacySuppliers, undefined, userId) : Promise.resolve(0),
      legacyExpenses.length > 0 ? batchSaveExpensesToCloud(legacyExpenses, undefined, userId) : Promise.resolve(0),
      legacyUsers.length > 0 ? bulkUploadUsersToCloud(legacyUsers, userId) : Promise.resolve(0),
      legacyRestocks.length > 0
        ? batchSaveCollectionToCloud('restock_records', legacyRestocks, (r) => cleanForFirestore(r), undefined, userId)
        : Promise.resolve(0),
      legacyAuditLogs.length > 0
        ? batchSaveCollectionToCloud('sensitive_action_logs', legacyAuditLogs, (l) => cleanForFirestore(l), undefined, userId)
        : Promise.resolve(0),
      ...legacyStoreSettings.map((settingDoc: any) => {
        if (!settingDoc?.id) return Promise.resolve();
        const { id: settingId, ...rest } = settingDoc;
        return setDoc(
          getScopedDocRef('store_settings', String(settingId), userId),
          cleanForFirestore({ ...rest, migratedAt: new Date().toISOString() }),
          { merge: true }
        ).catch(() => {});
      }),
    ]);

    try {
      localStorage.setItem(migrationFlagKey, '1');
    } catch {}

    return true;
  } catch (err) {
    console.warn('[Legacy Store Bridge] Notice:', err);
    return false;
  }
}

export async function migrateLegacyRootCollectionsToRofaniStoreIfNeeded(): Promise<boolean> {
  return migrateLegacyRootCollectionsToOwnerStoreIfNeeded(auth.currentUser?.uid);
}

// ---------------- MULTI-BRANCH BUSINESS GROUP & COMBINED ANALYTICS ----------------

const MULTI_BRANCH_CACHE_PREFIX = 'rofani_multi_branch_group_';

export function getCachedGroupBranches(primaryStoreId: string): StoreSubscriptionProfile[] {
  if (typeof window === 'undefined' || !primaryStoreId) return [];
  try {
    const raw = window.localStorage.getItem(`${MULTI_BRANCH_CACHE_PREFIX}${primaryStoreId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCachedGroupBranches(primaryStoreId: string, branches: StoreSubscriptionProfile[]): void {
  if (typeof window === 'undefined' || !primaryStoreId) return;
  try {
    window.localStorage.setItem(`${MULTI_BRANCH_CACHE_PREFIX}${primaryStoreId}`, JSON.stringify(branches));
  } catch {}
}

export async function upgradeStoreToMultiBranchGroup(params: {
  primaryStoreId: string;
  businessGroupName: string;
  currentProfile?: StoreSubscriptionProfile | null;
  fallbackOwnerUid?: string;
  fallbackOwnerEmail?: string;
  fallbackStoreName?: string;
  fallbackPhone?: string;
}): Promise<StoreSubscriptionProfile> {
  const cleanGroupName = params.businessGroupName.trim().slice(0, 200);
  if (!cleanGroupName) {
    throw new Error('Please enter the name of the whole business.');
  }
  const nowIso = new Date().toISOString();
  const existing = params.currentProfile;
  const ownerUid = existing?.ownerUid || params.fallbackOwnerUid || auth.currentUser?.uid || params.primaryStoreId;
  const ownerEmail = (existing?.ownerEmail || params.fallbackOwnerEmail || auth.currentUser?.email || 'owner@rofanipos.app').toLowerCase();
  const branchStoreName = existing?.storeName || params.fallbackStoreName || cleanGroupName;

  const existingMaxBranches = Math.max(1, existing?.maxAllowedBranches ?? 1);
  const defaultExpIso = new Date(Date.now() + 7 * 86400000).toISOString();

  const updatedProfile: StoreSubscriptionProfile = {
    ...(existing || {
      id: params.primaryStoreId,
      ownerUid,
      ownerId: ownerUid,
      ownerEmail,
      storeName: branchStoreName,
      branchName: branchStoreName,
      phone: params.fallbackPhone || '',
      planType: 'trial',
      subscriptionStatus: 'trial',
      expiresAt: defaultExpIso,
      expiryDate: defaultExpIso,
      createdAt: nowIso,
    }),
    id: params.primaryStoreId,
    ownerUid,
    ownerId: existing?.ownerId || ownerUid,
    ownerEmail,
    storeName: branchStoreName,
    branchName: existing?.branchName || branchStoreName,
    isMultiBranch: true,
    businessGroupId: params.primaryStoreId,
    businessGroupName: cleanGroupName,
    parentStoreId: params.primaryStoreId,
    isBranchStore: false,
    isPrimaryBranch: true,
    maxAllowedBranches: existingMaxBranches,
    expiryDate: existing?.expiresAt || defaultExpIso,
    branchCode: existing?.branchCode || 'MAIN-01',
    branchCity: existing?.branchCity || 'Main Branch',
    updatedAt: nowIso,
  };

  if (auth.currentUser && auth.currentUser.emailVerified && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      await withFirestoreTimeout(
        setDoc(
          doc(db, 'stores', params.primaryStoreId),
          cleanForFirestore({
            ownerId: updatedProfile.ownerId,
            branchName: updatedProfile.branchName,
            isMultiBranch: true,
            businessGroupId: params.primaryStoreId,
            businessGroupName: cleanGroupName,
            parentStoreId: params.primaryStoreId,
            isBranchStore: false,
            isPrimaryBranch: true,
            maxAllowedBranches: existingMaxBranches,
            branchCode: updatedProfile.branchCode,
            branchCity: updatedProfile.branchCity,
            updatedAt: nowIso,
          }),
          { merge: true }
        ),
        'upgrading store to Multi-Branch Business Group',
        6000
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `stores/${params.primaryStoreId}`);
    }
  }

  const cached = getCachedGroupBranches(params.primaryStoreId);
  const nextCache = [
    updatedProfile,
    ...cached
      .filter((b) => b.id !== updatedProfile.id)
      .map((b) => ({ ...b, isMultiBranch: true, businessGroupName: cleanGroupName })),
  ];
  saveCachedGroupBranches(params.primaryStoreId, nextCache);
  return updatedProfile;
}

export async function createBranchStoreInGroup(params: {
  primaryStoreId: string;
  ownerUid: string;
  ownerEmail: string;
  businessGroupName: string;
  branchName: string;
  branchCode?: string;
  branchCity?: string;
  branchAddress?: string;
  branchPhone?: string;
  branchManagerName?: string;
  parentProfile?: StoreSubscriptionProfile | null;
  existingGroupBranches?: StoreSubscriptionProfile[];
  defaultStaff?: User[];
}): Promise<StoreSubscriptionProfile> {
  const cleanBranchName = params.branchName.trim().slice(0, 200);
  if (!cleanBranchName) {
    throw new Error('Branch name is required.');
  }
  const slug =
    cleanBranchName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 10) || 'shop';
  const branchStoreId = `${params.primaryStoreId}_br_${slug}_${Date.now().toString(36)}`.slice(0, 120);
  const nowIso = new Date().toISOString();
  const parent = params.parentProfile;
  const cleanGroupName = params.businessGroupName.trim() || parent?.businessGroupName || parent?.storeName || 'Business Group';

  const currentGroup =
    params.existingGroupBranches && params.existingGroupBranches.length > 0
      ? params.existingGroupBranches
      : parent
      ? [parent]
      : [];
  const activeBranchesCount = currentGroup.filter((b) => isBranchLicenseUnlocked(b)).length;
  const maxAllowedBranches = getOwnerMaxAllowedBranches(currentGroup, parent);
  const requiresPaidLicense = activeBranchesCount >= maxAllowedBranches;
  const trialExpIso = new Date(Date.now() + 7 * 86400000).toISOString();

  const branchProfile: StoreSubscriptionProfile = {
    id: branchStoreId,
    ownerUid: params.ownerUid,
    ownerId: params.ownerUid,
    ownerEmail: params.ownerEmail.toLowerCase(),
    storeName: cleanBranchName,
    branchName: cleanBranchName,
    businessType: parent?.businessType || 'general',
    phone: (params.branchPhone || parent?.phone || '').trim(),
    kraPin: parent?.kraPin || '',
    mpesaShortcode: parent?.mpesaShortcode || '',
    mpesaShortcodeType: parent?.mpesaShortcodeType || 'till',
    planType: requiresPaidLicense ? 'monthly' : 'trial',
    subscriptionStatus: requiresPaidLicense ? 'expired' : 'trial',
    expiresAt: requiresPaidLicense ? nowIso : trialExpIso,
    expiryDate: requiresPaidLicense ? nowIso : trialExpIso,
    licensePendingActivation: requiresPaidLicense,
    lastPaymentMethod: requiresPaidLicense ? undefined : 'free_trial',
    taxMode: parent?.taxMode || 'none',
    transactionWiseTax: parent?.transactionWiseTax ?? false,
    skipLegacySeed: true,
    isMultiBranch: true,
    businessGroupId: params.primaryStoreId,
    businessGroupName: cleanGroupName,
    parentStoreId: params.primaryStoreId,
    isBranchStore: true,
    isPrimaryBranch: false,
    maxAllowedBranches,
    branchCode: (params.branchCode || `BR-${Math.floor(10 + Math.random() * 89)}`).trim().toUpperCase().slice(0, 32),
    branchCity: (params.branchCity || 'Nairobi').trim().slice(0, 120),
    branchAddress: (params.branchAddress || '').trim().slice(0, 200),
    branchManagerName: (params.branchManagerName || '').trim().slice(0, 150),
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // Seed default users & branch flag in isolated branch localStorage immediately
  try {
    const seedUsers: User[] = (params.defaultStaff && params.defaultStaff.length > 0
      ? params.defaultStaff
      : [
          {
            id: 'usr-owner',
            name: params.branchManagerName?.trim() || `${cleanBranchName} Admin`,
            role: 'Admin' as const,
            roles: ['Admin' as const],
            email: params.ownerEmail.toLowerCase(),
            pin: '1234',
            phone: branchProfile.phone,
            status: 'active' as const,
            assignedBranchIds: [params.primaryStoreId, branchStoreId],
            updatedAt: nowIso,
          },
        ]
    ).map((u) => ({
      ...u,
      assignedBranchIds: Array.from(new Set([...(u.assignedBranchIds || [params.primaryStoreId]), branchStoreId])),
      updatedAt: nowIso,
    }));
    window.localStorage.setItem(resolveTenantStorageKey('retail_pos_users', branchStoreId), JSON.stringify(seedUsers));
    window.localStorage.setItem(resolveTenantStorageKey('rofani_pos_blank_mode', branchStoreId), 'true');
  } catch {}

  if (auth.currentUser && auth.currentUser.emailVerified && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      await withFirestoreTimeout(
        setDoc(doc(db, 'stores', branchStoreId), cleanForFirestore(branchProfile), { merge: true }),
        `creating branch ${cleanBranchName}`,
        8000
      );

      const staffToSeed = params.defaultStaff && params.defaultStaff.length > 0
        ? params.defaultStaff
        : [
            {
              id: 'usr-owner',
              name: params.branchManagerName?.trim() || `${cleanBranchName} Admin`,
              role: 'Admin' as const,
              roles: ['Admin' as const],
              email: params.ownerEmail.toLowerCase(),
              pin: '1234',
              phone: branchProfile.phone,
              status: 'active' as const,
              assignedBranchIds: [params.primaryStoreId, branchStoreId],
              updatedAt: nowIso,
            },
          ];

      await Promise.all([
        ...staffToSeed.map((u) =>
          setDoc(
            getScopedDocRef('users', u.id, branchStoreId),
            cleanForFirestore({
              ...u,
              assignedBranchIds: Array.from(new Set([...(u.assignedBranchIds || [params.primaryStoreId]), branchStoreId])),
              updatedAt: nowIso,
            }),
            { merge: true }
          ).catch(() => {})
        ),
        setDoc(
          getScopedDocRef('settings', 'transaction', branchStoreId),
          cleanForFirestore({
            ...TRANSACTION_SETTINGS_DEFAULT,
            enableTransactionWiseTax: false,
            activePrefixFirmId: branchStoreId,
            updatedAt: nowIso,
          }),
          { merge: true }
        ).catch(() => {}),
      ]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `stores/${branchStoreId}`);
      throw error;
    }
  }

  const existingCache = getCachedGroupBranches(params.primaryStoreId);
  const nextCache = [...existingCache.filter((b) => b.id !== branchStoreId), branchProfile];
  saveCachedGroupBranches(params.primaryStoreId, nextCache);
  return branchProfile;
}

export async function fetchBusinessGroupBranches(
  ownerUid: string | null | undefined,
  primaryStoreId: string,
  fallbackPrimaryProfile?: StoreSubscriptionProfile | null
): Promise<StoreSubscriptionProfile[]> {
  const cached = getCachedGroupBranches(primaryStoreId);
  const map = new Map<string, StoreSubscriptionProfile>();

  if (fallbackPrimaryProfile) {
    map.set(fallbackPrimaryProfile.id || primaryStoreId, {
      ...fallbackPrimaryProfile,
      id: fallbackPrimaryProfile.id || primaryStoreId,
    });
  }
  cached.forEach((b) => {
    if (b?.id) map.set(b.id, b);
  });

  if (ownerUid && auth.currentUser && auth.currentUser.emailVerified && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const snap = await withFirestoreTimeout(
        getDocs(query(collection(db, 'stores'), where('ownerUid', '==', ownerUid))),
        'fetching business group branches',
        5000
      );
      snap.forEach((docSnap) => {
        const data = { id: docSnap.id, ...docSnap.data() } as StoreSubscriptionProfile;
        if (
          docSnap.id === primaryStoreId ||
          data.parentStoreId === primaryStoreId ||
          data.businessGroupId === primaryStoreId ||
          data.isBranchStore
        ) {
          map.set(docSnap.id, data);
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'stores');
    }
  }

  const list = Array.from(map.values());
  list.sort((a, b) => {
    if (a.id === primaryStoreId || !a.isBranchStore) return -1;
    if (b.id === primaryStoreId || !b.isBranchStore) return 1;
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });

  if (list.length > 0) {
    saveCachedGroupBranches(primaryStoreId, list);
  }
  return list;
}

export interface BranchAnalyticsSummary {
  storeId: string;
  branchName: string;
  branchCode: string;
  branchCity: string;
  isMainBranch: boolean;
  salesTotal: number;
  transactionsCount: number;
  cogsTotal: number;
  grossProfit: number;
  expensesTotal: number;
  wagesTotal: number;
  netProfit: number;
  stockValue: number;
  productCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  stockVarianceCount: number;
  staffCount: number;
  isOutlier: boolean;
  anomalySeverity: 'normal' | 'warning' | 'alert';
  anomalyReasons: string[];
}

export interface MultiBranchCombinedReport {
  branches: BranchAnalyticsSummary[];
  totals: {
    salesTotal: number;
    expensesTotal: number;
    wagesTotal: number;
    netProfit: number;
    stockValue: number;
    transactionsCount: number;
    outlierCount: number;
  };
  generatedAt: string;
}

function readLocalTenantArray<T>(key: string, storeId: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(resolveTenantStorageKey(key, storeId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function fetchMultiBranchCombinedAnalytics(
  branches: StoreSubscriptionProfile[],
  activeBranchStoreId: string,
  activeLiveData?: {
    products: Product[];
    transactions: Transaction[];
    expenses: Expense[];
    users: User[];
    salaryPayouts?: any[];
    commissionPayouts?: any[];
  }
): Promise<MultiBranchCombinedReport> {
  const canQueryCloud = Boolean(
    auth.currentUser &&
      auth.currentUser.emailVerified &&
      typeof navigator !== 'undefined' &&
      navigator.onLine
  );

  const rawSummaries: BranchAnalyticsSummary[] = await Promise.all(
    branches.map(async (branch, idx) => {
      const sid = branch.id;
      const isActive = sid === activeBranchStoreId;

      let prods: Product[] = isActive && activeLiveData ? activeLiveData.products : readLocalTenantArray<Product>('retail_pos_products', sid);
      let sales: Transaction[] = isActive && activeLiveData ? activeLiveData.transactions : readLocalTenantArray<Transaction>('retail_pos_transactions', sid);
      let exps: Expense[] = isActive && activeLiveData ? activeLiveData.expenses : readLocalTenantArray<Expense>('retail_pos_expenses', sid);
      let usersList: User[] = isActive && activeLiveData ? activeLiveData.users : readLocalTenantArray<User>('retail_pos_users', sid);
      const salaryPayouts = isActive && activeLiveData?.salaryPayouts
        ? activeLiveData.salaryPayouts
        : readLocalTenantArray<any>('retail_pos_salary_payouts', sid);
      const commissionPayouts = isActive && activeLiveData?.commissionPayouts
        ? activeLiveData.commissionPayouts
        : readLocalTenantArray<any>('retail_pos_commission_payouts', sid);

      if (!isActive && canQueryCloud) {
        const [cloudProds, cloudSales, cloudExps, cloudUsers] = await Promise.all([
          fetchProductsFromCloud(sid).catch(() => []),
          fetchTransactionsFromCloud(sid).catch(() => []),
          fetchExpensesFromCloud(sid).catch(() => []),
          fetchUsersFromCloud(sid).catch(() => []),
        ]);
        if (cloudProds.length > 0) prods = cloudProds;
        if (cloudSales.length > 0) sales = cloudSales;
        if (cloudExps.length > 0) exps = cloudExps;
        if (cloudUsers.length > 0) usersList = cloudUsers;
      }

      let salesTotal = 0;
      let cogsTotal = 0;
      let commissionAccrued = 0;
      sales.forEach((tx) => {
        const amt = Number(tx.grandTotal || 0);
        salesTotal += amt;
        (tx.items || []).forEach((item) => {
          const unitCost = Number(item.product?.costPrice ?? item.product?.buyingPrice ?? 0);
          cogsTotal += unitCost * Number(item.quantity || 0);
        });
        if (tx.cashierCommissionAmount) {
          commissionAccrued += Number(tx.cashierCommissionAmount || 0);
        }
      });

      const expensesTotal = exps.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const paidSalaries = salaryPayouts.reduce((sum, p) => sum + Number(p.netPaid || p.amount || 0), 0);
      const paidCommissions = commissionPayouts.reduce((sum, c) => sum + Number(c.amount || 0), 0);
      const accruedBasePay = usersList.reduce((sum, u) => sum + Number(u.basePayRate || 0) + Number(u.fixedAllowance || 0), 0);
      const wagesTotal = paidSalaries > 0 || paidCommissions > 0
        ? paidSalaries + paidCommissions
        : commissionAccrued + (sales.length > 0 ? accruedBasePay : 0);

      const grossProfit = salesTotal - cogsTotal;
      const netProfit = grossProfit - expensesTotal - wagesTotal;

      let stockValue = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;
      let stockVarianceCount = 0;
      prods.forEach((p) => {
        const qty = Number(p.stockQuantity ?? p.stock ?? 0);
        const cost = Number(p.costPrice ?? p.buyingPrice ?? 0);
        const minAlert = Number(p.minStockAlert ?? 5);
        stockValue += Math.max(0, qty) * cost;
        if (qty <= 0) {
          outOfStockCount += 1;
          stockVarianceCount += 1;
        } else if (qty <= minAlert) {
          lowStockCount += 1;
        }
        if (qty < 0 || (p.sellingPrice > 0 && cost > p.sellingPrice)) {
          stockVarianceCount += 1;
        }
      });

      return {
        storeId: sid,
        branchName: branch.storeName || `Branch ${idx + 1}`,
        branchCode: branch.branchCode || (idx === 0 ? 'MAIN-01' : `BR-0${idx + 1}`),
        branchCity: branch.branchCity || 'Main Location',
        isMainBranch: !branch.isBranchStore || idx === 0,
        salesTotal,
        transactionsCount: sales.length,
        cogsTotal,
        grossProfit,
        expensesTotal,
        wagesTotal,
        netProfit,
        stockValue,
        productCount: prods.length,
        lowStockCount,
        outOfStockCount,
        stockVarianceCount,
        staffCount: usersList.length,
        isOutlier: false,
        anomalySeverity: 'normal',
        anomalyReasons: [],
      };
    })
  );

  // Detect branches whose performance or stock variance is out of line with the rest
  const activeBranchesWithSales = rawSummaries.filter((b) => b.salesTotal > 0);
  const avgSales =
    activeBranchesWithSales.length > 0
      ? activeBranchesWithSales.reduce((s, b) => s + b.salesTotal, 0) / activeBranchesWithSales.length
      : 0;
  const avgVarianceRate =
    rawSummaries.length > 0
      ? rawSummaries.reduce(
          (s, b) => s + (b.productCount > 0 ? b.stockVarianceCount / b.productCount : 0),
          0
        ) / rawSummaries.length
      : 0;

  const analyzed = rawSummaries.map((b) => {
    const reasons: string[] = [];
    let severity: 'normal' | 'warning' | 'alert' = 'normal';

    if (rawSummaries.length > 1 && avgSales > 0) {
      if (b.salesTotal === 0) {
        reasons.push('No recorded sales yet compared to active peer branches');
        severity = 'warning';
      } else if (b.salesTotal < avgSales * 0.55) {
        const pctBelow = Math.round(((avgSales - b.salesTotal) / avgSales) * 100);
        reasons.push(`Sales ${pctBelow}% below group average`);
        severity = 'alert';
      }
    }

    if (b.netProfit < 0) {
      reasons.push(`Operating at a net loss (-KSh ${Math.abs(Math.round(b.netProfit)).toLocaleString()})`);
      severity = 'alert';
    } else if (b.salesTotal > 0 && b.expensesTotal + b.wagesTotal > b.salesTotal * 0.65) {
      reasons.push('Expenses & wages exceed 65% of branch revenue');
      if (severity === 'normal') severity = 'warning';
    }

    const varianceRate = b.productCount > 0 ? b.stockVarianceCount / b.productCount : 0;
    if (b.stockVarianceCount > 0 && (varianceRate > Math.max(0.2, avgVarianceRate * 1.6) || b.outOfStockCount >= 5)) {
      reasons.push(
        `${b.stockVarianceCount} stock variance / out-of-stock item${b.stockVarianceCount === 1 ? '' : 's'} needing review`
      );
      if (severity === 'normal') severity = 'warning';
    }

    return {
      ...b,
      isOutlier: reasons.length > 0,
      anomalySeverity: severity,
      anomalyReasons: reasons,
    };
  });

  const totals = analyzed.reduce(
    (acc, b) => ({
      salesTotal: acc.salesTotal + b.salesTotal,
      expensesTotal: acc.expensesTotal + b.expensesTotal,
      wagesTotal: acc.wagesTotal + b.wagesTotal,
      netProfit: acc.netProfit + b.netProfit,
      stockValue: acc.stockValue + b.stockValue,
      transactionsCount: acc.transactionsCount + b.transactionsCount,
      outlierCount: acc.outlierCount + (b.isOutlier ? 1 : 0),
    }),
    {
      salesTotal: 0,
      expensesTotal: 0,
      wagesTotal: 0,
      netProfit: 0,
      stockValue: 0,
      transactionsCount: 0,
      outlierCount: 0,
    }
  );

  return {
    branches: analyzed,
    totals,
    generatedAt: new Date().toISOString(),
  };
}

export async function syncCrossBranchStaffAssignment(params: {
  user: User;
  targetBranchIds: string[];
  allBranchIds: string[];
}): Promise<User> {
  const uniqueTargetIds = Array.from(new Set(params.targetBranchIds.filter(Boolean)));
  const updatedUser: User = {
    ...params.user,
    assignedBranchIds: uniqueTargetIds,
    updatedAt: new Date().toISOString(),
  };

  const canCloud = Boolean(
    auth.currentUser &&
      auth.currentUser.emailVerified &&
      typeof navigator !== 'undefined' &&
      navigator.onLine
  );

  // Sync worker record into every assigned branch's isolated users storage & cloud subcollection
  await Promise.all(
    uniqueTargetIds.map(async (branchId) => {
      try {
        const key = resolveTenantStorageKey('retail_pos_users', branchId);
        const raw = window.localStorage.getItem(key);
        const existing: User[] = raw ? JSON.parse(raw) : [];
        const exists = Array.isArray(existing) && existing.some((u) => u.id === updatedUser.id);
        const nextList = exists
          ? existing.map((u) => (u.id === updatedUser.id ? updatedUser : u))
          : [...(Array.isArray(existing) ? existing : []), updatedUser];
        window.localStorage.setItem(key, JSON.stringify(nextList));
      } catch {}

      if (canCloud) {
        await saveUserToCloud(updatedUser, branchId).catch(() => {});
      }
    })
  );

  // Update assignedBranchIds on unassigned branches cleanly if worker already existed there
  const unassignedIds = params.allBranchIds.filter((id) => !uniqueTargetIds.includes(id));
  await Promise.all(
    unassignedIds.map(async (branchId) => {
      try {
        const key = resolveTenantStorageKey('retail_pos_users', branchId);
        const raw = window.localStorage.getItem(key);
        const existing: User[] = raw ? JSON.parse(raw) : [];
        if (Array.isArray(existing) && existing.some((u) => u.id === updatedUser.id)) {
          const nextList = existing.filter((u) => u.id !== updatedUser.id);
          window.localStorage.setItem(key, JSON.stringify(nextList));
          if (canCloud && updatedUser.role !== 'Admin') {
            await deleteUserFromCloud(updatedUser.id, branchId).catch(() => {});
          }
        }
      } catch {}
    })
  );

  return updatedUser;
}

// ---------------- CUSTOMER DEPOSITS & PARTIAL PAYMENTS LIVE SYNC ----------------

export function subscribeToCustomerDeposits(
  onUpdate: (records: CustomerDepositRecord[]) => void,
  onError?: (err: any) => void,
  storeId?: string
) {
  const sid = resolveCloudStoreId(storeId);
  const path = getScopedCollectionPath('customer_deposits', sid);
  const colRef = getScopedCollectionRef('customer_deposits', sid);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const loaded: CustomerDepositRecord[] = [];
      snapshot.forEach((d) => {
        loaded.push({ id: d.id, ...d.data() } as CustomerDepositRecord);
      });
      loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(loaded);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

export async function saveCustomerDepositToCloud(
  record: CustomerDepositRecord,
  storeId?: string
): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('customer_deposits', sid)}/${record.id}`;
  try {
    const docRef = getScopedDocRef('customer_deposits', record.id, sid);
    const cleaned = cleanForFirestore({
      ...record,
      updatedAt: record.updatedAt || new Date().toISOString(),
    });
    await withFirestoreTimeout(
      setDoc(docRef, cleaned, { merge: true }),
      `saving customer deposit ${record.receiptRef || record.id}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// ---------------- CUSTOMER COMPLAINTS LIVE SYNC ----------------

export function subscribeToCustomerComplaints(
  onUpdate: (complaints: CustomerComplaint[]) => void,
  onError?: (err: any) => void,
  storeId?: string
) {
  const sid = resolveCloudStoreId(storeId);
  const path = getScopedCollectionPath('customer_complaints', sid);
  const colRef = getScopedCollectionRef('customer_complaints', sid);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const loaded: CustomerComplaint[] = [];
      snapshot.forEach((d) => {
        loaded.push({ id: d.id, ...d.data() } as CustomerComplaint);
      });
      loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(loaded);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

export async function saveCustomerComplaintToCloud(
  complaint: CustomerComplaint,
  storeId?: string
): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('customer_complaints', sid)}/${complaint.id}`;
  try {
    const docRef = getScopedDocRef('customer_complaints', complaint.id, sid);
    const cleaned = cleanForFirestore({
      ...complaint,
      updatedAt: complaint.updatedAt || new Date().toISOString(),
    });
    await withFirestoreTimeout(
      setDoc(docRef, cleaned, { merge: true }),
      `saving customer complaint ${complaint.complaintNumber || complaint.id}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// ---------------- CUSTOMER GOODS RETURNS & RESTOCK LIVE SYNC ----------------

export function subscribeToCustomerReturns(
  onUpdate: (returns: CustomerReturnRecord[]) => void,
  onError?: (err: any) => void,
  storeId?: string
) {
  const sid = resolveCloudStoreId(storeId);
  const path = getScopedCollectionPath('customer_returns', sid);
  const colRef = getScopedCollectionRef('customer_returns', sid);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const loaded: CustomerReturnRecord[] = [];
      snapshot.forEach((d) => {
        loaded.push({ id: d.id, ...d.data() } as CustomerReturnRecord);
      });
      loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(loaded);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
}

export async function saveCustomerReturnToCloud(
  ret: CustomerReturnRecord,
  storeId?: string
): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('customer_returns', sid)}/${ret.id}`;
  try {
    const docRef = getScopedDocRef('customer_returns', ret.id, sid);
    const cleaned = cleanForFirestore({
      ...ret,
      updatedAt: ret.updatedAt || new Date().toISOString(),
    });
    await withFirestoreTimeout(
      setDoc(docRef, cleaned, { merge: true }),
      `saving customer return ${ret.returnNumber || ret.id}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// ---------------- KRA ETIMS VSCU CONFIGURATION SYNC ----------------

export async function saveEtimsConfigToCloud(
  config: EtimsComplianceConfig,
  storeId?: string
): Promise<void> {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('store_settings', sid)}/etims_config`;
  try {
    const docRef = getScopedDocRef('store_settings', 'etims_config', sid);
    await withFirestoreTimeout(
      setDoc(docRef, cleanForFirestore({ ...config, updatedAt: new Date().toISOString() }), { merge: true }),
      'saving KRA eTIMS configuration'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function fetchEtimsConfigFromCloud(
  storeId?: string
): Promise<EtimsComplianceConfig | null> {
  const sid = resolveCloudStoreId(storeId);
  const path = `${getScopedCollectionPath('store_settings', sid)}/etims_config`;
  try {
    const docRef = getScopedDocRef('store_settings', 'etims_config', sid);
    const snap = await withFirestoreTimeout(getDoc(docRef), 'fetching KRA eTIMS configuration');
    return snap.exists() ? (snap.data() as EtimsComplianceConfig) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

