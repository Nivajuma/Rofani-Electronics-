import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  getDoc,
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
  isOwnerCloudUser,
} from './firebase';
import { getActiveTenantStoreId } from '../utils/tenantScope';
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
      if (!snapshot.empty) {
        const loaded: Product[] = [];
        snapshot.forEach((d) => {
          loaded.push({ id: d.id, ...d.data() } as Product);
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
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch {
    // Proceed without auth header when unavailable
  }

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
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch {
    // Proceed without auth header
  }

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
    msg.includes('network')
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
      if (!snapshot.empty) {
        const loaded: Transaction[] = [];
        snapshot.forEach((d) => {
          loaded.push({ id: d.id, ...d.data() } as Transaction);
        });
        loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        onUpdate(loaded);
      }
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
      12000
    );
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as StoreSubscriptionProfile;
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
        onUpdate({ id: snapshot.id, ...snapshot.data() } as StoreSubscriptionProfile);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
}

export async function ensureOwnerPrimaryStoreProfile(user: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}): Promise<StoreSubscriptionProfile> {
  const nowIso = new Date().toISOString();
  const existing = await fetchStoreProfile(OWNER_PRIMARY_STORE_ID).catch(() => null);
  if (existing) {
    if (existing.subscriptionStatus !== 'active' || existing.planType !== 'annual') {
      const updated: StoreSubscriptionProfile = {
        ...existing,
        planType: 'annual',
        subscriptionStatus: 'active',
        expiresAt: existing.expiresAt && Date.parse(existing.expiresAt) > Date.now() + 365 * 86400000
          ? existing.expiresAt
          : new Date(Date.now() + 10 * 365 * 86400000).toISOString(),
        updatedAt: nowIso,
      };
      await setDoc(doc(db, 'stores', OWNER_PRIMARY_STORE_ID), cleanForFirestore(updated), { merge: true });
      return updated;
    }
    return existing;
  }

  const profile: StoreSubscriptionProfile = {
    id: OWNER_PRIMARY_STORE_ID,
    ownerUid: user.uid,
    ownerEmail: (user.email || 'nivajuma@gmail.com').toLowerCase(),
    storeName: 'Rofani Electronics & Boutique',
    phone: '0700000000',
    kraPin: '',
    mpesaShortcode: '1833804',
    mpesaShortcodeType: 'till',
    mpesaStoreNumber: '1365369',
    planType: 'annual',
    subscriptionStatus: 'active',
    expiresAt: new Date(Date.now() + 10 * 365 * 86400000).toISOString(),
    lastPaymentRef: 'OWNER-MASTER',
    lastPaymentMethod: 'admin_override',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    await withFirestoreTimeout(
      setDoc(doc(db, 'stores', OWNER_PRIMARY_STORE_ID), cleanForFirestore(profile), { merge: true }),
      'initializing Rofani primary store profile'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `stores/${OWNER_PRIMARY_STORE_ID}`);
  }
  return profile;
}

export async function createMerchantStoreProfile(params: {
  uid: string;
  email: string;
  displayName?: string;
  storeName: string;
  phone: string;
  kraPin?: string;
  mpesaShortcode?: string;
  mpesaShortcodeType?: 'till' | 'paybill';
}): Promise<StoreSubscriptionProfile> {
  const now = new Date();
  const nowIso = now.toISOString();
  const trialExpiresIso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const storeId = params.uid;

  const profile: StoreSubscriptionProfile = {
    id: storeId,
    ownerUid: params.uid,
    ownerEmail: params.email.trim().toLowerCase(),
    storeName: params.storeName.trim(),
    phone: params.phone.trim(),
    kraPin: (params.kraPin || '').trim().toUpperCase(),
    mpesaShortcode: (params.mpesaShortcode || '').trim(),
    mpesaShortcodeType: params.mpesaShortcodeType || 'till',
    planType: 'trial',
    subscriptionStatus: 'active',
    expiresAt: trialExpiresIso,
    lastPaymentMethod: 'free_trial',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    await withFirestoreTimeout(
      setDoc(doc(db, 'stores', storeId), cleanForFirestore(profile), { merge: true }),
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

    return profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `stores/${storeId}`);
    throw error;
  }
}

export async function updateStoreProfileDetails(
  storeId: string,
  updates: Partial<Pick<StoreSubscriptionProfile, 'storeName' | 'phone' | 'kraPin' | 'mpesaShortcode' | 'mpesaShortcodeType'>>
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
    planType: 'monthly' | 'annual';
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
    const patch = cleanForFirestore({
      planType: params.planType,
      subscriptionStatus: 'active',
      expiresAt: nextExpiresAt,
      lastPaymentRef: cleanRef,
      lastPaymentAmount: params.amount,
      lastPaymentAt: nowIso,
      lastPaymentPhone: params.phone.trim(),
      lastPaymentMethod: params.paymentMethod,
      updatedAt: nowIso,
    });

    await withFirestoreTimeout(
      setDoc(doc(db, 'stores', storeId), patch, { merge: true }),
      'activating subscription'
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

export async function superAdminUpdateStoreSubscription(
  storeId: string,
  action: 'extend_30d' | 'extend_1y' | 'suspend',
  currentProfile?: StoreSubscriptionProfile
): Promise<void> {
  if (!isOwnerCloudUser(auth.currentUser)) {
    throw new Error('Only the app owner can modify subscriber access.');
  }
  if (storeId === OWNER_PRIMARY_STORE_ID && action === 'suspend') {
    throw new Error('Cannot suspend the primary owner store.');
  }

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const existingExpMs = currentProfile?.expiresAt ? Date.parse(currentProfile.expiresAt) : 0;
  const activeBaseMs = Number.isFinite(existingExpMs) && existingExpMs > nowMs ? existingExpMs : nowMs;

  let updatePayload: Record<string, any>;
  if (action === 'extend_30d') {
    updatePayload = {
      planType: 'monthly',
      subscriptionStatus: 'active',
      expiresAt: new Date(activeBaseMs + 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastPaymentMethod: 'admin_override',
      lastPaymentAt: nowIso,
      updatedAt: nowIso,
    };
  } else if (action === 'extend_1y') {
    updatePayload = {
      planType: 'annual',
      subscriptionStatus: 'active',
      expiresAt: new Date(activeBaseMs + 365 * 24 * 60 * 60 * 1000).toISOString(),
      lastPaymentMethod: 'admin_override',
      lastPaymentAt: nowIso,
      updatedAt: nowIso,
    };
  } else {
    updatePayload = {
      subscriptionStatus: 'expired',
      expiresAt: nowIso,
      updatedAt: nowIso,
    };
  }

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

// ---------------- LEGACY ROOT DATA MIGRATION FOR ROFANI-POS ----------------

/**
 * Ensures NivaJuma@gmail.com's existing root Firestore data (`products`, `transactions`, etc.)
 * is seamlessly copied into `stores/rofani-pos/...` if `stores/rofani-pos/products` is empty.
 */
export async function migrateLegacyRootCollectionsToRofaniStoreIfNeeded(): Promise<boolean> {
  if (!isOwnerCloudUser(auth.currentUser)) return false;

  try {
    const scopedProducts = await fetchProductsFromCloud(OWNER_PRIMARY_STORE_ID).catch(() => []);
    if (scopedProducts.length > 0) {
      return false; // Already migrated or populated
    }

    const legacyProducts = await fetchCollectionWithFallback<Product>('products', 'checking legacy root products').catch(() => []);
    const legacySales = await fetchCollectionWithFallback<Transaction>('transactions', 'checking legacy root sales').catch(() => []);
    const legacyCustomers = await fetchCollectionWithFallback<Customer>('customers', 'checking legacy root customers').catch(() => []);
    const legacySuppliers = await fetchCollectionWithFallback<Supplier>('suppliers', 'checking legacy root suppliers').catch(() => []);
    const legacyExpenses = await fetchCollectionWithFallback<Expense>('expenses', 'checking legacy root expenses').catch(() => []);
    const legacyUsers = await fetchCollectionWithFallback<User>('users', 'checking legacy root staff').catch(() => []);

    if (
      legacyProducts.length === 0 &&
      legacySales.length === 0 &&
      legacyCustomers.length === 0 &&
      legacySuppliers.length === 0 &&
      legacyExpenses.length === 0 &&
      legacyUsers.length === 0
    ) {
      return false;
    }

    await Promise.all([
      legacyProducts.length > 0 ? batchSaveProductsToCloud(legacyProducts, undefined, OWNER_PRIMARY_STORE_ID) : Promise.resolve(0),
      legacySales.length > 0 ? batchSaveTransactionsToCloud(legacySales, undefined, OWNER_PRIMARY_STORE_ID) : Promise.resolve(0),
      legacyCustomers.length > 0 ? batchSaveCustomersToCloud(legacyCustomers, undefined, OWNER_PRIMARY_STORE_ID) : Promise.resolve(0),
      legacySuppliers.length > 0 ? batchSaveSuppliersToCloud(legacySuppliers, undefined, OWNER_PRIMARY_STORE_ID) : Promise.resolve(0),
      legacyExpenses.length > 0 ? batchSaveExpensesToCloud(legacyExpenses, undefined, OWNER_PRIMARY_STORE_ID) : Promise.resolve(0),
      legacyUsers.length > 0 ? bulkUploadUsersToCloud(legacyUsers, OWNER_PRIMARY_STORE_ID) : Promise.resolve(0),
    ]);

    return true;
  } catch (err) {
    console.warn('[Legacy Store Migration] Notice:', err);
    return false;
  }
}
