import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, auth, firebaseConfig, handleFirestoreError, OperationType, isQuotaExceededError } from './firebase';
import { Product, Transaction, Customer, Supplier, Expense, RestockRecord, User, SensitiveActionLog } from '../types';

const DEFAULT_FIRESTORE_WRITE_TIMEOUT_MS = 18000;
const DEFAULT_FIRESTORE_BATCH_SDK_TIMEOUT_MS = 10000;
const DEFAULT_FIRESTORE_READ_TIMEOUT_MS = 20000;

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
  onError?: (err: any) => void
) {
  const colRef = collection(db, 'products');
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
      handleFirestoreError(error, OperationType.LIST, 'products');
      if (onError) onError(error);
    }
  );
}

// Helper to sanitize product document before uploading to Cloud Firestore.
// Strips raw oversized base64 images (>12KB) because full media is persisted in local IndexedDB.
// Prevents exceeding Firestore's 10MB writeBatch limit and keeps mobile/slow uploads fast.
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

export async function saveProductToCloud(product: Product): Promise<void> {
  const path = `products/${product.id}`;
  try {
    const docRef = doc(db, 'products', product.id);
    const cleaned = cleanProductForFirestore(product);
    await withFirestoreTimeout(setDoc(docRef, cleaned, { merge: true }), `saving product ${product.name || product.id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteProductFromCloud(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    const docRef = doc(db, 'products', productId);
    await withFirestoreTimeout(deleteDoc(docRef), `deleting product ${productId}`);
  } catch (error) {
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
  collectionName: string,
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
    // Proceed without auth header when anonymous/public rules apply
  }

  const loaded: T[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
        firebaseConfig.projectId
      )}/databases/${endpointDbId}/documents/${encodeURIComponent(collectionName)}`
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
  collectionName: string,
  operationLabel: string
): Promise<T[]> {
  try {
    const colRef = collection(db, collectionName);
    const snap = await withFirestoreTimeout(
      getDocs(colRef),
      operationLabel,
      10000
    );
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
        console.warn(`[${collectionName}] SDK getDocs stalled, using HTTPS REST read fallback...`);
        return await fetchCollectionViaRest<T>(collectionName, operationLabel);
      } catch (restError) {
        handleFirestoreError(restError, OperationType.LIST, collectionName);
        throw restError;
      }
    }
    handleFirestoreError(error, OperationType.LIST, collectionName);
    throw error;
  }
}

// Direct on-demand retrieval of all products from Cloud Firestore
export async function fetchProductsFromCloud(): Promise<Product[]> {
  return fetchCollectionWithFallback<Product>('products', 'fetching products from Cloud Firestore');
}

// Bulk upload initial or custom products to cloud in safe batches of 25 items
export async function bulkUploadProductsToCloud(
  products: Product[],
  onProgress?: (uploadedCount: number, totalCount: number, batchIndex: number, totalBatches: number) => void
): Promise<number> {
  return batchSaveProductsToCloud(products, onProgress);
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
 * Bypasses stalled gRPC-Web / WebChannel streams on restricted mobile, proxy, or iframe networks.
 */
async function commitChunkViaRest<T extends { id: string }>(
  collectionName: string,
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
          name: `projects/${firebaseConfig.projectId}/databases/${dbId}/documents/${collectionName}/${docId}`,
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
    // Proceed without auth header when anonymous/public rules apply
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
 * Generic chunked writeBatch helper with hard timeout protection, live progress reporting,
 * and automatic HTTPS REST fallback if Firestore WebChannel streaming stalls.
 */
async function batchSaveCollectionToCloud<T extends { id: string }>(
  collectionName: string,
  items: T[],
  sanitizeItem: (item: T) => any,
  onProgress?: (uploadedCount: number, totalCount: number, batchIndex: number, totalBatches: number) => void
): Promise<number> {
  if (!items || items.length === 0) return 0;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error(`Device is offline. Cannot push ${collectionName} to Cloud Firestore right now.`);
  }

  const CHUNK_SIZE = collectionName === 'products' ? 10 : 20;
  const totalBatches = Math.ceil(items.length / CHUNK_SIZE);
  let totalUploaded = 0;
  let lastError: unknown = null;
  let useRestFallback = false;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batchIndex = Math.floor(i / CHUNK_SIZE) + 1;
    const operationLabel = `uploading ${collectionName} batch ${batchIndex}/${totalBatches}`;

    if (useRestFallback) {
      try {
        const restCount = await commitChunkViaRest(collectionName, chunk, sanitizeItem, operationLabel);
        totalUploaded += restCount;
      } catch (restErr) {
        handleFirestoreError(restErr, OperationType.WRITE, `${collectionName}/rest-batch-${batchIndex}`);
        const msg = restErr instanceof Error ? restErr.message : String(restErr);
        throw new Error(
          totalUploaded > 0
            ? `Synced ${totalUploaded}/${items.length} ${collectionName}, then stopped: ${msg}`
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
        const docRef = doc(db, collectionName, item.id);
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

      // If WebChannel timed out or stalled (but device is online and not quota/permission error),
      // immediately fall back to direct HTTPS REST documents:commit for this and remaining batches.
      if (!isQuotaExceededError(batchErr) && isTransportStallError(batchErr) && (typeof navigator === 'undefined' || navigator.onLine)) {
        try {
          console.warn(`[${collectionName} Batch ${batchIndex}/${totalBatches}] SDK batch stalled, switching to HTTPS REST commit fallback...`);
          const restCount = await commitChunkViaRest(collectionName, chunk, sanitizeItem, operationLabel);
          useRestFallback = true;
          totalUploaded += restCount;
          if (onProgress) {
            onProgress(totalUploaded, items.length, batchIndex, totalBatches);
          }
          continue;
        } catch (restFallbackErr) {
          lastError = restFallbackErr;
          handleFirestoreError(restFallbackErr, OperationType.WRITE, `${collectionName}/batch-${batchIndex}`);
          const msg = restFallbackErr instanceof Error ? restFallbackErr.message : String(restFallbackErr);
          throw new Error(
            totalUploaded > 0
              ? `Synced ${totalUploaded}/${items.length} ${collectionName}, then stopped: ${msg}`
              : msg
          );
        }
      }

      // Fail fast on offline, permission, or quota errors instead of hanging for 25 more retries
      if (isNonRetryableCloudError(batchErr)) {
        handleFirestoreError(batchErr, OperationType.WRITE, `${collectionName}/batch-${batchIndex}`);
        const msg = batchErr instanceof Error ? batchErr.message : String(batchErr);
        throw new Error(
          totalUploaded > 0
            ? `Synced ${totalUploaded}/${items.length} ${collectionName}, then stopped: ${msg}`
            : msg
        );
      }

      console.warn(`[${collectionName} Batch ${batchIndex}/${totalBatches}] writeBatch commit failed, attempting individual doc saves:`, batchErr);
      let chunkUploaded = 0;
      for (const item of chunk) {
        if (!item?.id) continue;
        try {
          const docRef = doc(db, collectionName, item.id);
          await withFirestoreTimeout(
            setDoc(docRef, sanitizeItem(item), { merge: true }),
            `saving ${collectionName}/${item.id}`,
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
                ? `Synced ${totalUploaded}/${items.length} ${collectionName}, then stopped: ${msg}`
                : msg
            );
          }
          console.warn(`[${collectionName} ${item.id}] Individual cloud save skipped:`, individualErr);
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

/**
 * Commits products to Firestore in chunked atomic writeBatches (25 items per batch)
 * - Strips huge base64 camera images from cloud payloads (IndexedDB retains them locally)
 * - Safe against the 10MB Firestore writeBatch ceiling and 1MB document size limit
 * - Bounded by hard per-batch timeouts so sync never rotates indefinitely
 */
export async function batchSaveProductsToCloud(
  products: Product[],
  onProgress?: (uploadedCount: number, totalCount: number, batchIndex: number, totalBatches: number) => void
): Promise<number> {
  return batchSaveCollectionToCloud('products', products, cleanProductForFirestore, onProgress);
}

export async function batchSaveTransactionsToCloud(
  transactions: Transaction[],
  onProgress?: (uploadedCount: number, totalCount: number, batchIndex: number, totalBatches: number) => void
): Promise<number> {
  return batchSaveCollectionToCloud('transactions', transactions, (tx) => cleanForFirestore(tx), onProgress);
}

export async function batchSaveCustomersToCloud(
  customers: Customer[],
  onProgress?: (uploadedCount: number, totalCount: number, batchIndex: number, totalBatches: number) => void
): Promise<number> {
  return batchSaveCollectionToCloud('customers', customers, (c) => cleanForFirestore(c), onProgress);
}

export async function batchSaveSuppliersToCloud(
  suppliers: Supplier[],
  onProgress?: (uploadedCount: number, totalCount: number, batchIndex: number, totalBatches: number) => void
): Promise<number> {
  return batchSaveCollectionToCloud('suppliers', suppliers, (s) => cleanForFirestore(s), onProgress);
}

export async function batchSaveExpensesToCloud(
  expenses: Expense[],
  onProgress?: (uploadedCount: number, totalCount: number, batchIndex: number, totalBatches: number) => void
): Promise<number> {
  return batchSaveCollectionToCloud('expenses', expenses, (e) => cleanForFirestore(e), onProgress);
}

// ---------------- TRANSACTIONS (SALES) LIVE SYNC ----------------

/**
 * Commits an entire completed sale, along with updated product stock levels and customer stats,
 * inside a SINGLE atomic writeBatch(). Replaces multiple individual doc writes.
 */
export async function commitSaleToCloudBatch(
  tx: Transaction,
  updatedProducts: Product[],
  updatedCustomer?: Customer
): Promise<void> {
  try {
    const batch = writeBatch(db);

    // 1. Transaction doc
    const txRef = doc(db, 'transactions', tx.id);
    batch.set(txRef, cleanForFirestore({
      ...tx,
      syncedAt: new Date().toISOString(),
    }), { merge: true });

    // 2. Stock updates ONLY for products actually purchased in this sale
    const soldProductIds = new Set((tx.items || []).map((it) => it.product?.id || (it as any).productId));
    const targetProducts = updatedProducts.filter((p) => soldProductIds.has(p.id));
    for (const p of (targetProducts.length > 0 ? targetProducts : updatedProducts.slice(0, 5))) {
      const pRef = doc(db, 'products', p.id);
      batch.set(pRef, cleanForFirestore({
        ...p,
        updatedAt: new Date().toISOString(),
      }), { merge: true });
    }

    // 3. Customer loyalty points / balance update if applicable
    if (updatedCustomer && updatedCustomer.id) {
      const cRef = doc(db, 'customers', updatedCustomer.id);
      batch.set(cRef, cleanForFirestore({
        ...updatedCustomer,
        updatedAt: new Date().toISOString(),
      }), { merge: true });
    }

    await withFirestoreTimeout(batch.commit(), 'committing sale batch');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'sales/writeBatch');
    throw error;
  }
}

// Direct on-demand retrieval of all transactions from Cloud Firestore
export async function fetchTransactionsFromCloud(): Promise<Transaction[]> {
  const loaded = await fetchCollectionWithFallback<Transaction>(
    'transactions',
    'fetching sales transactions from Cloud Firestore'
  );
  loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return loaded;
}

export function subscribeToTransactions(
  onUpdate: (transactions: Transaction[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, 'transactions');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Transaction[] = [];
        snapshot.forEach((d) => {
          loaded.push({ id: d.id, ...d.data() } as Transaction);
        });
        // Sort descending by date
        loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        onUpdate(loaded);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
      if (onError) onError(error);
    }
  );
}

export async function saveTransactionToCloud(tx: Transaction): Promise<void> {
  const path = `transactions/${tx.id}`;
  try {
    const docRef = doc(db, 'transactions', tx.id);
    const cleaned = cleanForFirestore(tx);
    await withFirestoreTimeout(setDoc(docRef, cleaned, { merge: true }), `saving sale ${tx.receiptNumber || tx.id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// ---------------- CUSTOMERS LIVE SYNC ----------------

export function subscribeToCustomers(
  onUpdate: (customers: Customer[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, 'customers');
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
      handleFirestoreError(error, OperationType.LIST, 'customers');
      if (onError) onError(error);
    }
  );
}

export async function saveCustomerToCloud(cust: Customer): Promise<void> {
  const path = `customers/${cust.id}`;
  try {
    const docRef = doc(db, 'customers', cust.id);
    const cleaned = cleanForFirestore(cust);
    await withFirestoreTimeout(setDoc(docRef, cleaned, { merge: true }), `saving customer ${cust.name || cust.id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteCustomerFromCloud(customerId: string): Promise<void> {
  const path = `customers/${customerId}`;
  try {
    const docRef = doc(db, 'customers', customerId);
    await withFirestoreTimeout(deleteDoc(docRef), `deleting customer ${customerId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// Direct on-demand retrieval of all customers from Cloud Firestore
export async function fetchCustomersFromCloud(): Promise<Customer[]> {
  return fetchCollectionWithFallback<Customer>('customers', 'fetching customers from Cloud Firestore');
}

// ---------------- SUPPLIERS LIVE SYNC ----------------

export function subscribeToSuppliers(
  onUpdate: (suppliers: Supplier[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, 'suppliers');
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
      handleFirestoreError(error, OperationType.LIST, 'suppliers');
      if (onError) onError(error);
    }
  );
}

export async function saveSupplierToCloud(supp: Supplier): Promise<void> {
  const path = `suppliers/${supp.id}`;
  try {
    const docRef = doc(db, 'suppliers', supp.id);
    const cleaned = cleanForFirestore(supp);
    await withFirestoreTimeout(setDoc(docRef, cleaned, { merge: true }), `saving supplier ${supp.name || supp.id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteSupplierFromCloud(supplierId: string): Promise<void> {
  const path = `suppliers/${supplierId}`;
  try {
    const docRef = doc(db, 'suppliers', supplierId);
    await withFirestoreTimeout(deleteDoc(docRef), `deleting supplier ${supplierId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// Direct on-demand retrieval of all suppliers from Cloud Firestore
export async function fetchSuppliersFromCloud(): Promise<Supplier[]> {
  return fetchCollectionWithFallback<Supplier>('suppliers', 'fetching suppliers from Cloud Firestore');
}

// ---------------- EXPENSES LIVE SYNC ----------------

export function subscribeToExpenses(
  onUpdate: (expenses: Expense[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, 'expenses');
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
      handleFirestoreError(error, OperationType.LIST, 'expenses');
      if (onError) onError(error);
    }
  );
}

export async function saveExpenseToCloud(exp: Expense): Promise<void> {
  const path = `expenses/${exp.id}`;
  try {
    const docRef = doc(db, 'expenses', exp.id);
    const cleaned = cleanForFirestore(exp);
    await withFirestoreTimeout(setDoc(docRef, cleaned, { merge: true }), `saving expense ${exp.id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteExpenseFromCloud(expenseId: string): Promise<void> {
  const path = `expenses/${expenseId}`;
  try {
    const docRef = doc(db, 'expenses', expenseId);
    await withFirestoreTimeout(deleteDoc(docRef), `deleting expense ${expenseId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// Direct on-demand retrieval of all expenses from Cloud Firestore
export async function fetchExpensesFromCloud(): Promise<Expense[]> {
  const loaded = await fetchCollectionWithFallback<Expense>('expenses', 'fetching expenses from Cloud Firestore');
  loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return loaded;
}

// ---------------- RESTOCK RECORDS LIVE SYNC ----------------

export function subscribeToRestockRecords(
  onUpdate: (records: RestockRecord[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, 'restock_records');
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
      handleFirestoreError(error, OperationType.LIST, 'restock_records');
      if (onError) onError(error);
    }
  );
}

export async function saveRestockRecordToCloud(rec: RestockRecord): Promise<void> {
  const path = `restock_records/${rec.id}`;
  try {
    const docRef = doc(db, 'restock_records', rec.id);
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
  onError?: (err: any) => void
) {
  const docRef = doc(db, 'store_settings', 'security_config');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as StoreSecurityConfig);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'store_settings/security_config');
      if (onError) onError(error);
    }
  );
}

export async function saveStoreSecurityToCloud(config: StoreSecurityConfig): Promise<void> {
  const path = 'store_settings/security_config';
  try {
    const docRef = doc(db, 'store_settings', 'security_config');
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
  onError?: (err: any) => void
) {
  const docRef = doc(db, 'store_settings', 'mpesa_config');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data());
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'store_settings/mpesa_config');
      if (onError) onError(error);
    }
  );
}

export async function saveMpesaConfigToCloud(config: any): Promise<void> {
  const path = 'store_settings/mpesa_config';
  try {
    const docRef = doc(db, 'store_settings', 'mpesa_config');
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
  onError?: (err: any) => void
) {
  const colRef = collection(db, 'users');
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
      handleFirestoreError(error, OperationType.LIST, 'users');
      if (onError) onError(error);
    }
  );
}

export async function saveUserToCloud(user: User): Promise<void> {
  const path = `users/${user.id}`;
  try {
    const docRef = doc(db, 'users', user.id);
    const cleaned = cleanForFirestore(user);
    await withFirestoreTimeout(setDoc(docRef, cleaned, { merge: true }), `saving staff user ${user.name || user.id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteUserFromCloud(userId: string): Promise<void> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    await withFirestoreTimeout(deleteDoc(docRef), `deleting staff user ${userId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function bulkUploadUsersToCloud(users: User[]): Promise<number> {
  if (!users || users.length === 0) return 0;
  try {
    return await batchSaveCollectionToCloud('users', users, (u) => cleanForFirestore(u));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'users/batch');
    throw error;
  }
}

// Direct on-demand retrieval of all staff users from Cloud Firestore
export async function fetchUsersFromCloud(): Promise<User[]> {
  return fetchCollectionWithFallback<User>('users', 'fetching staff users from Cloud Firestore');
}

// ---------------- SENSITIVE ACTION & AUDIT LOGS LIVE SYNC ----------------

export function subscribeToAuditLogs(
  onUpdate: (logs: SensitiveActionLog[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, 'sensitive_action_logs');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: SensitiveActionLog[] = [];
        snapshot.forEach((d) => {
          loaded.push({ id: d.id, ...d.data() } as SensitiveActionLog);
        });
        // Sort newest first
        loaded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        onUpdate(loaded);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sensitive_action_logs');
      if (onError) onError(error);
    }
  );
}

export async function saveAuditLogToCloud(log: SensitiveActionLog): Promise<void> {
  const path = `sensitive_action_logs/${log.id}`;
  try {
    const docRef = doc(db, 'sensitive_action_logs', log.id);
    const cleaned = cleanForFirestore(log);
    await withFirestoreTimeout(setDoc(docRef, cleaned, { merge: true }), 'saving audit log');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

