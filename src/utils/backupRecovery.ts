import { Product, Transaction, Customer, Supplier, Expense, User } from '../types';
import { safeGetJSON, safeSetJSON } from './safeStorage';
import { saveToIDB, getFromIDB } from './idbStorage';

export interface RecoverableBackup {
  key: string;
  label: string;
  timestamp: number;
  formattedDate: string;
  productsCount: number;
  salesCount: number;
  customersCount: number;
  expensesCount: number;
  data: {
    products?: Product[];
    transactions?: Transaction[];
    sales?: Transaction[];
    customers?: Customer[];
    suppliers?: Supplier[];
    expenses?: Expense[];
    allUsers?: User[];
    staff?: User[];
  };
}

const BACKUP_STORAGE_KEYS = [
  { key: 'rofani_pos_largest_backup', label: 'Protected Master Catalog Backup (Largest recorded inventory)' },
  { key: 'rofani_pos_pre_pull_backup', label: 'Pre-Cloud-Pull Snapshot (Saved right before pulling from cloud)' },
  { key: 'rofani_pos_auto_backup', label: 'Auto-Backup Snapshot' },
  { key: 'rofani_pos_last_snapshot', label: 'Last App Snapshot' },
  { key: 'rofani_pos_pre_import_backup', label: 'Pre-Import Backup' },
  { key: 'retail_pos_products_backup', label: 'Local Products Backup' },
];

/**
 * Inspects browser localStorage to find any historical backups containing products.
 * Returns backups sorted with highest product count first.
 */
export function findRecoverableBackups(): RecoverableBackup[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];

  const found: RecoverableBackup[] = [];
  const checkedKeys = new Set<string>();

  // Check known backup keys first
  for (const item of BACKUP_STORAGE_KEYS) {
    checkedKeys.add(item.key);
    try {
      const raw = localStorage.getItem(item.key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!parsed) continue;

      const prods: Product[] =
        parsed.products ||
        (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.sku ? parsed : []) ||
        parsed.data?.products ||
        [];

      const sales: Transaction[] =
        parsed.transactions ||
        parsed.sales ||
        parsed.data?.transactions ||
        parsed.data?.sales ||
        [];

      const custs: Customer[] = parsed.customers || parsed.data?.customers || [];
      const exps: Expense[] = parsed.expenses || parsed.data?.expenses || [];

      if (prods.length > 0 || sales.length > 0) {
        const ts = parsed.timestamp || parsed.date || Date.now();
        found.push({
          key: item.key,
          label: item.label,
          timestamp: typeof ts === 'number' ? ts : new Date(ts).getTime() || Date.now(),
          formattedDate: new Date(typeof ts === 'number' ? ts : Date.now()).toLocaleString(),
          productsCount: prods.length,
          salesCount: sales.length,
          customersCount: custs.length,
          expensesCount: exps.length,
          data: {
            products: prods,
            transactions: sales,
            customers: custs,
            suppliers: parsed.suppliers || parsed.data?.suppliers || [],
            expenses: exps,
            allUsers: parsed.allUsers || parsed.staff || parsed.data?.allUsers || [],
          },
        });
      }
    } catch (e) {
      // Ignore unparseable keys
    }
  }

  // Scan localStorage for any other key that might have been saved by previous versions
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || checkedKeys.has(k)) continue;
      if (k.includes('backup') || k.includes('snapshot') || k.includes('products_archive')) {
        try {
          const raw = localStorage.getItem(k);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (!parsed) continue;

          const prods: Product[] =
            parsed.products ||
            (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.sku ? parsed : []) ||
            [];

          if (prods.length > 0) {
            found.push({
              key: k,
              label: `LocalStorage Snapshot (${k})`,
              timestamp: parsed.timestamp || Date.now(),
              formattedDate: new Date(parsed.timestamp || Date.now()).toLocaleString(),
              productsCount: prods.length,
              salesCount: (parsed.transactions || parsed.sales || []).length,
              customersCount: (parsed.customers || []).length,
              expensesCount: (parsed.expenses || []).length,
              data: {
                products: prods,
                transactions: parsed.transactions || parsed.sales || [],
                customers: parsed.customers || [],
                expenses: parsed.expenses || [],
              },
            });
          }
        } catch {}
      }
    }
  } catch {}

  // Sort with highest product count first
  found.sort((a, b) => b.productsCount - a.productsCount);
  return found;
}

/**
 * Safely saves to 'rofani_pos_largest_backup' only if current products count is
 * greater than or equal to any previously recorded largest backup.
 * This guarantees that pulling a smaller cloud database (e.g. 29 items) will NEVER
 * overwrite a 500+ item local backup.
 */
export function protectLargestBackup(
  currentProducts: Product[],
  currentSales: Transaction[],
  currentCustomers: Customer[],
  currentSuppliers: Supplier[],
  currentExpenses: Expense[],
  currentUsers: User[]
): void {
  if (!currentProducts || currentProducts.length === 0) return;

  try {
    const existing = safeGetJSON<any>('rofani_pos_largest_backup', null);
    const existingCount = existing?.products?.length || 0;

    // Only update if current catalog is at least as large as the existing largest backup
    if (currentProducts.length >= existingCount) {
      const payload = {
        timestamp: Date.now(),
        productsCount: currentProducts.length,
        products: currentProducts,
        transactions: currentSales,
        customers: currentCustomers,
        suppliers: currentSuppliers,
        expenses: currentExpenses,
        allUsers: currentUsers,
      };
      // Save to IndexedDB (primary durable store without 5MB limits)
      try {
        saveToIDB('rofani_pos_largest_backup', payload);
      } catch {}
      safeSetJSON('rofani_pos_largest_backup', payload);
    }
  } catch (err) {
    console.warn('Could not update protected largest backup:', err);
  }
}

/**
 * Retrieves full backup data by key, checking persistent IndexedDB first, then localStorage.
 */
export async function getBackupDataByKey(key: string): Promise<any> {
  try {
    const idbData = await getFromIDB(key);
    if (idbData && (idbData.products || idbData.transactions || Array.isArray(idbData))) {
      return idbData;
    }
  } catch {}

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  return null;
}
