import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Product, Transaction, Customer, Supplier, Expense, RestockRecord, User, SensitiveActionLog } from '../types';

// Sanitize helper to remove undefined values for Firestore compatibility
export function cleanForFirestore<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = cleanForFirestore(value);
      } else {
        result[key] = value;
      }
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

export async function saveProductToCloud(product: Product): Promise<void> {
  const path = `products/${product.id}`;
  try {
    const docRef = doc(db, 'products', product.id);
    const cleaned = cleanForFirestore({
      ...product,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteProductFromCloud(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    const docRef = doc(db, 'products', productId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// Bulk upload initial products to cloud
export async function bulkUploadProductsToCloud(products: Product[]): Promise<number> {
  try {
    const batch = writeBatch(db);
    let count = 0;
    for (const p of products) {
      const docRef = doc(db, 'products', p.id);
      const cleaned = cleanForFirestore({
        ...p,
        updatedAt: p.updatedAt || new Date().toISOString(),
      });
      batch.set(docRef, cleaned, { merge: true });
      count++;
    }
    await batch.commit();
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'products/batch');
    throw error;
  }
}

// ---------------- TRANSACTIONS (SALES) LIVE SYNC ----------------

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
    await setDoc(docRef, cleaned, { merge: true });
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
    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
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
    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
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
    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
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
    await setDoc(docRef, cleaned, { merge: true });
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
    await setDoc(docRef, cleaned, { merge: true });
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
    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteUserFromCloud(userId: string): Promise<void> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function bulkUploadUsersToCloud(users: User[]): Promise<number> {
  try {
    const batch = writeBatch(db);
    let count = 0;
    for (const u of users) {
      const docRef = doc(db, 'users', u.id);
      const cleaned = cleanForFirestore(u);
      batch.set(docRef, cleaned, { merge: true });
      count++;
    }
    await batch.commit();
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'users/batch');
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
    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

