import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, isQuotaExceededError } from './firebase';
import { Product, Transaction, Customer, Supplier, Expense, RestockRecord, User, SensitiveActionLog } from '../types';

const DEFAULT_FIRESTORE_WRITE_TIMEOUT_MS = 12000;
const DEFAULT_FIRESTORE_READ_TIMEOUT_MS = 15000;

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
// Strips raw oversized base64 images (>20KB) because full media is persisted in local IndexedDB.
// Prevents exceeding Firestore's 10MB writeBatch limit and 1MB document limit.
export function cleanProductForFirestore(product: Product): any {
  let cleanedImageUrl = product.imageUrl || '';
  if (typeof cleanedImageUrl === 'string' && cleanedImageUrl.startsWith('data:image/') && cleanedImageUrl.length > 20000) {
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

// Direct on-demand retrieval of all products from Cloud Firestore
export async function fetchProductsFromCloud(): Promise<Product[]> {
  const path = 'products';
  try {
    const colRef = collection(db, path);
    const snap = await withFirestoreTimeout(
      getDocs(colRef),
      'fetching products from Cloud Firestore',
      DEFAULT_FIRESTORE_READ_TIMEOUT_MS
    );
    const loaded: Product[] = [];
    snap.forEach((d) => {
      loaded.push({ id: d.id, ...d.data() } as Product);
    });
    return loaded;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
}

// Bulk upload initial or custom products to cloud in safe batches of 25 items
export async function bulkUploadProductsToCloud(
  products: Product[],
  onProgress?: (uploadedCount: number, totalCount: number, batchIndex: number, totalBatches: number) => void
): Promise<number> {
  return batchSaveProductsToCloud(products, onProgress);
}

/**
 * Generic chunked writeBatch helper with hard timeout protection and live progress reporting.
 * Never stalls indefinitely and throws a clear error when offline, timed out, or quota-exceeded.
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

  const CHUNK_SIZE = 25;
  const totalBatches = Math.ceil(items.length / CHUNK_SIZE);
  let totalUploaded = 0;
  let lastError: unknown = null;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batchIndex = Math.floor(i / CHUNK_SIZE) + 1;

    try {
      const batch = writeBatch(db);
      for (const item of chunk) {
        if (!item?.id) continue;
        const docRef = doc(db, collectionName, item.id);
        batch.set(docRef, sanitizeItem(item), { merge: true });
      }
      await withFirestoreTimeout(
        batch.commit(),
        `uploading ${collectionName} batch ${batchIndex}/${totalBatches}`,
        DEFAULT_FIRESTORE_WRITE_TIMEOUT_MS
      );
      totalUploaded += chunk.length;
    } catch (batchErr) {
      lastError = batchErr;
      // Fail fast on network timeout, offline, permission, or quota errors instead of hanging for 25 more retries
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
            8000
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
  const path = 'transactions';
  try {
    const colRef = collection(db, path);
    const snap = await withFirestoreTimeout(
      getDocs(colRef),
      'fetching sales transactions from Cloud Firestore',
      DEFAULT_FIRESTORE_READ_TIMEOUT_MS
    );
    const loaded: Transaction[] = [];
    snap.forEach((d) => {
      loaded.push({ id: d.id, ...d.data() } as Transaction);
    });
    loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return loaded;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
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
  const path = 'customers';
  try {
    const colRef = collection(db, path);
    const snap = await withFirestoreTimeout(
      getDocs(colRef),
      'fetching customers from Cloud Firestore',
      DEFAULT_FIRESTORE_READ_TIMEOUT_MS
    );
    const loaded: Customer[] = [];
    snap.forEach((d) => {
      loaded.push({ id: d.id, ...d.data() } as Customer);
    });
    return loaded;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
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
  const path = 'suppliers';
  try {
    const colRef = collection(db, path);
    const snap = await withFirestoreTimeout(
      getDocs(colRef),
      'fetching suppliers from Cloud Firestore',
      DEFAULT_FIRESTORE_READ_TIMEOUT_MS
    );
    const loaded: Supplier[] = [];
    snap.forEach((d) => {
      loaded.push({ id: d.id, ...d.data() } as Supplier);
    });
    return loaded;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
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
  const path = 'expenses';
  try {
    const colRef = collection(db, path);
    const snap = await withFirestoreTimeout(
      getDocs(colRef),
      'fetching expenses from Cloud Firestore',
      DEFAULT_FIRESTORE_READ_TIMEOUT_MS
    );
    const loaded: Expense[] = [];
    snap.forEach((d) => {
      loaded.push({ id: d.id, ...d.data() } as Expense);
    });
    loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return loaded;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
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
  const path = 'users';
  try {
    const colRef = collection(db, path);
    const snap = await withFirestoreTimeout(
      getDocs(colRef),
      'fetching staff users from Cloud Firestore',
      DEFAULT_FIRESTORE_READ_TIMEOUT_MS
    );
    const loaded: User[] = [];
    snap.forEach((d) => {
      loaded.push({ id: d.id, ...d.data() } as User);
    });
    return loaded;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
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

