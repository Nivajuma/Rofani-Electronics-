import {
  Product,
  Customer,
  Supplier,
  Transaction,
  Expense,
  AttendanceRecord,
  User,
  StoreLocation,
} from '../types';
import { safeGetJSON, safeSetJSON } from './safeStorage';
import { getActiveTenantStoreId } from './tenantScope';

export const LAST_BACKUP_META_KEY = 'rofani_pos_last_backup_meta';

export interface LastBackupMeta {
  timestamp: string;
  method: 'local_download' | 'csv_summary' | 'web_share' | 'email_mailto' | 'gmail_api';
  fileName: string;
  recipientEmail?: string;
  productsCount: number;
  categoriesCount: number;
  salesCount: number;
  customersCount: number;
  storeId?: string;
  storeName?: string;
}

export interface StoreSettingsSnapshot {
  storeName: string;
  kraPin: string;
  phone: string;
  paybillTillNumber: string;
  kraTaxRate: number;
  branchLocation?: string;
  receiptFooter?: string;
  enableVat?: boolean;
  pricingMode?: string;
  currency?: string;
  taxMode?: string;
  mpesaShortcode?: string;
  mpesaStoreNumber?: string;
  mpesaShortcodeType?: string;
}

export interface CompleteStoreBackupPayload {
  format: 'ROFANI_POS_STORE_BACKUP_V2';
  version: '2.0.0';
  exportedAt: string;
  storeId: string;
  accountEmail?: string;
  storeInfo: StoreSettingsSnapshot;
  summary: {
    totalProducts: number;
    totalCategories: number;
    totalTransactions: number;
    totalCustomers: number;
    totalSuppliers: number;
    totalExpenses: number;
    totalAttendanceRecords: number;
    totalStaffUsers: number;
    totalInventoryValueKSh: number;
    totalGrossSalesKSh: number;
  };
  data: {
    products: Product[];
    categories: any[];
    transactions: Transaction[];
    customers: Customer[];
    suppliers: Supplier[];
    expenses: Expense[];
    attendanceRecords: AttendanceRecord[];
    allUsers: User[];
    stores: StoreLocation[];
    storeSettings: StoreSettingsSnapshot;
  };
}

export interface ParsedBackupPreview {
  fileName: string;
  formatLabel: string;
  exportedAt: string | null;
  sourceStoreName: string;
  sourceStoreId: string | null;
  productsCount: number;
  categoriesCount: number;
  salesCount: number;
  customersCount: number;
  suppliersCount: number;
  expensesCount: number;
  usersCount: number;
  hasStoreSettings: boolean;
  importPayload: {
    products?: Product[];
    categories?: any[];
    transactions?: Transaction[];
    customers?: Customer[];
    suppliers?: Supplier[];
    expenses?: Expense[];
    attendanceRecords?: AttendanceRecord[];
    allUsers?: User[];
    stores?: StoreLocation[];
    storeInfo?: Partial<StoreSettingsSnapshot>;
  };
}

export function getLastBackupMeta(): LastBackupMeta | null {
  return safeGetJSON<LastBackupMeta | null>(LAST_BACKUP_META_KEY, null, (val) =>
    Boolean(val && typeof val === 'object' && typeof val.timestamp === 'string')
  );
}

export function recordLastBackupMeta(meta: LastBackupMeta): LastBackupMeta {
  safeSetJSON(LAST_BACKUP_META_KEY, meta);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rofani:backup-recorded', { detail: meta }));
  }
  return meta;
}

export function formatLastBackupTimestamp(iso?: string | null): string {
  if (!iso) return 'Never backed up yet';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never backed up yet';
  return d.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatBackupMethodLabel(method?: LastBackupMeta['method']): string {
  switch (method) {
    case 'local_download':
      return 'Local Device';
    case 'csv_summary':
      return 'CSV Summary';
    case 'web_share':
      return 'Phone Share';
    case 'email_mailto':
      return 'Email Draft';
    case 'gmail_api':
      return 'Gmail Dispatch';
    default:
      return 'Backup';
  }
}

export function sanitizeStoreSlug(storeName: string): string {
  const clean = (storeName || 'RofaniPOS')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  return clean || 'RofaniPOS';
}

export function getStoreBackupFileName(
  storeName: string,
  ext: 'json' | 'csv' = 'json',
  prefix: 'RofaniPOS_Backup' | 'RofaniPOS_Summary' = 'RofaniPOS_Backup'
): string {
  const datePart = new Date().toISOString().slice(0, 10);
  const storeSlug = sanitizeStoreSlug(storeName);
  return `${prefix}_${storeSlug}_${datePart}.${ext}`;
}

export function readCurrentStoreSettingsSnapshot(overrides?: Partial<StoreSettingsSnapshot>): StoreSettingsSnapshot {
  const savedMpesa = safeGetJSON<any>('rofani_pos_mpesa_config', {});
  const storeName =
    overrides?.storeName ||
    safeGetJSON<string>('retail_pos_store_name', '') ||
    safeGetJSON<string>('rofani_settings_shop_name', 'Rofani POS');
  const kraPin = overrides?.kraPin ?? safeGetJSON<string>('retail_pos_kra_pin', 'P051234567X');
  const phone =
    overrides?.phone ??
    safeGetJSON<string>('retail_pos_store_phone', safeGetJSON<string>('rofani_settings_phone', '+254 700 000 000'));
  const paybillTillNumber =
    overrides?.paybillTillNumber ?? safeGetJSON<string>('retail_pos_store_paybill', 'Till 1833804');
  const kraTaxRate =
    overrides?.kraTaxRate ?? safeGetJSON<number>('retail_pos_kra_tax_rate', 1.5);

  return {
    storeName: storeName || 'Rofani POS',
    kraPin: kraPin || '',
    phone: phone || '',
    paybillTillNumber: paybillTillNumber || '',
    kraTaxRate: typeof kraTaxRate === 'number' ? kraTaxRate : 1.5,
    branchLocation: safeGetJSON<string>('rofani_settings_branch', 'Main Store'),
    receiptFooter: safeGetJSON<string>(
      'rofani_settings_footer',
      'Thank you for shopping with Rofani POS!'
    ),
    enableVat: safeGetJSON<boolean>('rofani_settings_enable_vat', false),
    pricingMode: safeGetJSON<string>('rofani_settings_pricing_mode', 'tax_inclusive'),
    currency: safeGetJSON<string>('rofani_settings_currency', 'KES (KSh)'),
    taxMode: safeGetJSON<string>('rofani_settings_tax_mode', 'none'),
    mpesaShortcode: savedMpesa?.shortcode || '',
    mpesaStoreNumber: savedMpesa?.storeNumber || '',
    mpesaShortcodeType: savedMpesa?.shortcodeType || 'till',
  };
}

export function buildCompleteStoreBackupPayload(params: {
  storeId?: string | null;
  accountEmail?: string | null;
  storeName?: string;
  storeSettingsOverrides?: Partial<StoreSettingsSnapshot>;
  products: Product[];
  categories: any[];
  transactions: Transaction[];
  customers: Customer[];
  suppliers: Supplier[];
  expenses: Expense[];
  attendanceRecords: AttendanceRecord[];
  allUsers: User[];
  stores?: StoreLocation[];
}): CompleteStoreBackupPayload {
  const sid = (params.storeId && params.storeId.trim()) || getActiveTenantStoreId();
  const storeInfo = readCurrentStoreSettingsSnapshot({
    storeName: params.storeName,
    ...(params.storeSettingsOverrides || {}),
  });

  const products = Array.isArray(params.products) ? params.products : [];
  const categories = Array.isArray(params.categories) ? params.categories : [];
  const transactions = Array.isArray(params.transactions) ? params.transactions : [];
  const customers = Array.isArray(params.customers) ? params.customers : [];
  const suppliers = Array.isArray(params.suppliers) ? params.suppliers : [];
  const expenses = Array.isArray(params.expenses) ? params.expenses : [];
  const attendanceRecords = Array.isArray(params.attendanceRecords) ? params.attendanceRecords : [];
  const allUsers = Array.isArray(params.allUsers) ? params.allUsers : [];
  const stores = Array.isArray(params.stores) ? params.stores : [];

  const totalInventoryValueKSh = products.reduce(
    (sum, p) => sum + Number(p.sellingPrice || 0) * Number(p.stockQuantity || 0),
    0
  );
  const totalGrossSalesKSh = transactions.reduce(
    (sum, tx) => sum + Number(tx.grandTotal || 0),
    0
  );

  return {
    format: 'ROFANI_POS_STORE_BACKUP_V2',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    storeId: sid,
    accountEmail: params.accountEmail || undefined,
    storeInfo,
    summary: {
      totalProducts: products.length,
      totalCategories: categories.length,
      totalTransactions: transactions.length,
      totalCustomers: customers.length,
      totalSuppliers: suppliers.length,
      totalExpenses: expenses.length,
      totalAttendanceRecords: attendanceRecords.length,
      totalStaffUsers: allUsers.length,
      totalInventoryValueKSh,
      totalGrossSalesKSh,
    },
    data: {
      products,
      categories,
      transactions,
      customers,
      suppliers,
      expenses,
      attendanceRecords,
      allUsers,
      stores,
      storeSettings: storeInfo,
    },
  };
}

function escapeCsvCell(val: unknown): string {
  const str = val === null || val === undefined ? '' : String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

export function buildHumanReadableStoreSummaryCSV(
  payload: CompleteStoreBackupPayload
): string {
  const lines: string[] = [];
  const { storeInfo, summary, data } = payload;

  lines.push('SECTION,ROFANI POS STORE BACKUP SUMMARY');
  lines.push(['Store Name', storeInfo.storeName].map(escapeCsvCell).join(','));
  lines.push(['Store Scope ID', payload.storeId].map(escapeCsvCell).join(','));
  lines.push(['Exported At', payload.exportedAt].map(escapeCsvCell).join(','));
  lines.push(['Products Count', summary.totalProducts].map(escapeCsvCell).join(','));
  lines.push(['Categories Count', summary.totalCategories].map(escapeCsvCell).join(','));
  lines.push(['Sales Receipts Count', summary.totalTransactions].map(escapeCsvCell).join(','));
  lines.push(['Customers Count', summary.totalCustomers].map(escapeCsvCell).join(','));
  lines.push(['Inventory Retail Value (KSh)', summary.totalInventoryValueKSh].map(escapeCsvCell).join(','));
  lines.push(['Cumulative Gross Sales (KSh)', summary.totalGrossSalesKSh].map(escapeCsvCell).join(','));
  lines.push('');

  lines.push('SECTION,INVENTORY PRODUCTS');
  lines.push(
    [
      'ID',
      'Product Name',
      'Category',
      'SKU',
      'Barcode',
      'Cost Price (KSh)',
      'Selling Price (KSh)',
      'Stock Quantity',
      'Unit',
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  data.products.forEach((p) => {
    lines.push(
      [
        p.id,
        p.name,
        p.category,
        p.sku || '',
        p.barcode || '',
        p.costPrice ?? 0,
        p.sellingPrice ?? 0,
        p.stockQuantity ?? 0,
        p.unit || 'pcs',
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  });
  lines.push('');

  lines.push('SECTION,SALES & RECEIPTS HISTORY');
  lines.push(
    [
      'Receipt Number',
      'Date',
      'Customer',
      'Items Count',
      'Subtotal (KSh)',
      'Discount (KSh)',
      'Grand Total (KSh)',
      'Amount Paid (KSh)',
      'Balance Due (KSh)',
      'Payment Status',
      'Payment Methods',
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  data.transactions.forEach((tx) => {
    const methods = (tx.payments || [])
      .map((pm) => `${pm.method}:${pm.amount}`)
      .join('; ');
    lines.push(
      [
        tx.receiptNumber,
        tx.date,
        tx.customerName || 'Walk-in Customer',
        (tx.items || []).length,
        tx.subtotal ?? 0,
        tx.discountTotal ?? 0,
        tx.grandTotal ?? 0,
        tx.amountPaid ?? 0,
        tx.balanceDue ?? 0,
        tx.paymentStatus || 'Paid',
        methods,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  });

  return lines.join('\n');
}

export function triggerBrowserDownload(
  content: string,
  filename: string,
  mimeType = 'application/json'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function canUseNativeFileShare(sampleFile?: File): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }
  try {
    if (typeof File === 'undefined') return false;
    const testFile =
      sampleFile ||
      new File(['{}'], 'backup.json', { type: 'application/json' });
    if (typeof navigator.canShare === 'function') {
      return navigator.canShare({ files: [testFile] });
    }
    return false;
  } catch {
    return false;
  }
}

export async function shareOrEmailStoreBackup(params: {
  payload: CompleteStoreBackupPayload;
  recipientEmail: string;
  preferNativeShare?: boolean;
}): Promise<{
  outcome: 'web_share' | 'mailto_fallback' | 'cancelled';
  fileName: string;
}> {
  const { payload, recipientEmail, preferNativeShare = true } = params;
  const fileName = getStoreBackupFileName(payload.storeInfo.storeName, 'json', 'RofaniPOS_Backup');
  const jsonString = JSON.stringify(payload, null, 2);
  const dateReadable = new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const summaryText = [
    `Rofani POS Store Backup — ${payload.storeInfo.storeName} (${dateReadable})`,
    `• Products: ${payload.summary.totalProducts}`,
    `• Categories: ${payload.summary.totalCategories}`,
    `• Sales Receipts: ${payload.summary.totalTransactions}`,
    `• Customers: ${payload.summary.totalCustomers}`,
    `• Stock Valuation: KSh ${payload.summary.totalInventoryValueKSh.toLocaleString()}`,
    `• Cumulative Sales: KSh ${payload.summary.totalGrossSalesKSh.toLocaleString()}`,
    '',
    `Keep this ${fileName} file safe. You can restore it anytime from Settings → Data Settings, Sync & Backups → Restore from File.`,
  ].join('\n');

  if (preferNativeShare && typeof File !== 'undefined') {
    const backupFile = new File([jsonString], fileName, { type: 'application/json' });
    if (canUseNativeFileShare(backupFile)) {
      try {
        await navigator.share({
          title: `Rofani POS Backup • ${payload.storeInfo.storeName} (${dateReadable})`,
          text: summaryText,
          files: [backupFile],
        });
        recordLastBackupMeta({
          timestamp: new Date().toISOString(),
          method: 'web_share',
          fileName,
          recipientEmail: recipientEmail.trim() || undefined,
          productsCount: payload.summary.totalProducts,
          categoriesCount: payload.summary.totalCategories,
          salesCount: payload.summary.totalTransactions,
          customersCount: payload.summary.totalCustomers,
          storeId: payload.storeId,
          storeName: payload.storeInfo.storeName,
        });
        return { outcome: 'web_share', fileName };
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return { outcome: 'cancelled', fileName };
        }
        // Non-abort error (e.g. desktop share policy): seamlessly fall through to mailto + download
      }
    }
  }

  // Fallback for browsers without Web Share file support:
  // 1) Save the .json file to Downloads so the user can attach it immediately
  triggerBrowserDownload(jsonString, fileName, 'application/json');

  // 2) Open pre-filled mailto: draft safely in iframe/SPA without window.open
  const subject = encodeURIComponent(
    `Rofani POS Backup — ${payload.storeInfo.storeName} (${dateReadable})`
  );
  const mailBody = encodeURIComponent(
    [
      `Hello,`,
      ``,
      `Attached is the latest Rofani POS store backup for ${payload.storeInfo.storeName}.`,
      ``,
      `Backup Summary (${dateReadable}):`,
      `- File Saved to Downloads: ${fileName}`,
      `- Products: ${payload.summary.totalProducts}`,
      `- Categories: ${payload.summary.totalCategories}`,
      `- Sales Receipts: ${payload.summary.totalTransactions}`,
      `- Customers: ${payload.summary.totalCustomers}`,
      `- Inventory Valuation: KSh ${payload.summary.totalInventoryValueKSh.toLocaleString()}`,
      `- Cumulative Sales: KSh ${payload.summary.totalGrossSalesKSh.toLocaleString()}`,
      ``,
      `IMPORTANT: Because your browser opened an email draft directly, please tap the paperclip (Attach) button and select "${fileName}" from your Downloads folder before tapping Send.`,
      ``,
      `To restore later: Open Rofani POS → Settings → Data Settings, Sync & Backups → Restore from File.`,
    ].join('\n')
  );

  const cleanEmail = (recipientEmail || '').trim();
  const mailtoHref = `mailto:${encodeURIComponent(cleanEmail)}?subject=${subject}&body=${mailBody}`;

  const anchor = document.createElement('a');
  anchor.href = mailtoHref;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  recordLastBackupMeta({
    timestamp: new Date().toISOString(),
    method: 'email_mailto',
    fileName,
    recipientEmail: cleanEmail || undefined,
    productsCount: payload.summary.totalProducts,
    categoriesCount: payload.summary.totalCategories,
    salesCount: payload.summary.totalTransactions,
    customersCount: payload.summary.totalCustomers,
    storeId: payload.storeId,
    storeName: payload.storeInfo.storeName,
  });

  return { outcome: 'mailto_fallback', fileName };
}

export function parseStoreBackupFile(rawText: string, fileName: string): ParsedBackupPreview {
  const parsed = JSON.parse(rawText);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid JSON file. Expected a valid Rofani POS backup object.');
  }

  if (parsed.format === 'ENCRYPTED_SNAPSHOT_V1') {
    throw new Error(
      'This file is an AES-256 encrypted snapshot (.enc.json). Open "Download Full Snapshot → Verify & Restore" to decrypt it with your passphrase.'
    );
  }

  const container = parsed.data || parsed.collections || parsed;
  const products = Array.isArray(container.products) ? container.products : undefined;
  const categories = Array.isArray(container.categories) ? container.categories : undefined;
  const transactions = Array.isArray(container.transactions)
    ? container.transactions
    : Array.isArray(container.sales)
    ? container.sales
    : undefined;
  const customers = Array.isArray(container.customers) ? container.customers : undefined;
  const suppliers = Array.isArray(container.suppliers) ? container.suppliers : undefined;
  const expenses = Array.isArray(container.expenses) ? container.expenses : undefined;
  const attendanceRecords = Array.isArray(container.attendanceRecords)
    ? container.attendanceRecords
    : undefined;
  const allUsers = Array.isArray(container.allUsers)
    ? container.allUsers
    : Array.isArray(container.users)
    ? container.users
    : Array.isArray(container.employees)
    ? container.employees
    : undefined;
  const stores = Array.isArray(container.stores) ? container.stores : undefined;
  const storeInfo: Partial<StoreSettingsSnapshot> | undefined =
    container.storeSettings || parsed.storeInfo || parsed.metadata?.storeInfo || undefined;

  const hasAnyCollection = Boolean(
    (products && products.length > 0) ||
      (categories && categories.length > 0) ||
      (transactions && transactions.length > 0) ||
      (customers && customers.length > 0) ||
      (suppliers && suppliers.length > 0) ||
      (expenses && expenses.length > 0) ||
      (allUsers && allUsers.length > 0) ||
      storeInfo
  );

  if (!hasAnyCollection && !products && !transactions && !customers) {
    throw new Error(
      'Unrecognized backup structure. Please choose a valid Rofani POS .json backup file.'
    );
  }

  const formatLabel =
    parsed.format === 'ROFANI_POS_STORE_BACKUP_V2'
      ? 'Rofani POS Store Backup v2'
      : parsed.collections
      ? 'Rofani POS Snapshot'
      : 'Rofani POS Backup JSON';

  return {
    fileName,
    formatLabel,
    exportedAt: parsed.exportedAt || parsed.backupGeneratedAt || null,
    sourceStoreName:
      storeInfo?.storeName ||
      (storeInfo as any)?.name ||
      parsed.storeName ||
      parsed.metadata?.storeName ||
      'Rofani POS',
    sourceStoreId: parsed.storeId || null,
    productsCount: products?.length || 0,
    categoriesCount: categories?.length || 0,
    salesCount: transactions?.length || 0,
    customersCount: customers?.length || 0,
    suppliersCount: suppliers?.length || 0,
    expensesCount: expenses?.length || 0,
    usersCount: allUsers?.length || 0,
    hasStoreSettings: Boolean(storeInfo),
    importPayload: {
      products,
      categories,
      transactions,
      customers,
      suppliers,
      expenses,
      attendanceRecords,
      allUsers,
      stores,
      storeInfo,
    },
  };
}
