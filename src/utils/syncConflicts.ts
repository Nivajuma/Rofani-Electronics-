import { Customer, Expense, Product, Supplier, Transaction, User } from '../types';

export type SyncConflictRecordType =
  | 'product'
  | 'customer'
  | 'supplier'
  | 'transaction'
  | 'expense'
  | 'user';

export interface ConflictFieldDiff {
  key: string;
  label: string;
  localValue: any;
  remoteValue: any;
  formattedLocal: string;
  formattedRemote: string;
  numericDelta?: number;
  isCurrency?: boolean;
  isCritical?: boolean;
}

export interface SyncConflict<T = Record<string, any>> {
  id: string;
  fingerprint: string;
  recordType: SyncConflictRecordType;
  recordId: string;
  recordLabel: string;
  recordSublabel?: string;
  sharedTimestampMs: number;
  sharedTimestampIso: string;
  detectedAt: string;
  sourceLabel: string;
  localRecord: T;
  remoteRecord: T;
  diffs: ConflictFieldDiff[];
  allComparableFields: ConflictFieldDiff[];
}

export type ConflictResolutionChoice = 'local' | 'remote' | 'custom';

export function parseTimestampMs(val?: string | number): number {
  if (typeof val === 'number') {
    return Number.isFinite(val) && val > 0 ? val : 0;
  }
  if (!val || typeof val !== 'string') return 0;
  const trimmed = val.trim();
  if (!trimmed) return 0;
  const ms = Date.parse(trimmed);
  return Number.isFinite(ms) ? ms : 0;
}

export function getRecordTimestampInfo(
  recordType: SyncConflictRecordType,
  record: Record<string, any> | null | undefined
): { ms: number; iso: string } {
  if (!record || typeof record !== 'object') {
    return { ms: 0, iso: '' };
  }

  let candidate: string | number | undefined;
  if (recordType === 'transaction') {
    candidate = record.editedAt || record.updatedAt || record.timestamp || record.date;
  } else if (recordType === 'expense') {
    candidate = record.updatedAt || record.date;
  } else {
    candidate = record.updatedAt;
  }

  const ms = parseTimestampMs(candidate);
  if (ms <= 0) return { ms: 0, iso: '' };
  const iso =
    typeof candidate === 'string' && candidate.trim()
      ? candidate.trim()
      : new Date(ms).toISOString();
  return { ms, iso };
}

const CURRENCY_KEYS = new Set([
  'costPrice',
  'buyingPrice',
  'sellingPrice',
  'totalPurchases',
  'currentBalanceDue',
  'debtBalance',
  'creditLimit',
  'totalSuppliedValue',
  'currentBalance',
  'subtotal',
  'discountTotal',
  'taxTotal',
  'grandTotal',
  'total',
  'totalAmount',
  'amountPaid',
  'balanceDue',
  'amount',
  'basePayRate',
  'fixedAllowance',
  'dailySalesTarget',
  'fixedCommissionPerSale',
]);

const CRITICAL_KEYS = new Set([
  'name',
  'sellingPrice',
  'costPrice',
  'buyingPrice',
  'stockQuantity',
  'stock',
  'grandTotal',
  'amountPaid',
  'balanceDue',
  'paymentStatus',
  'amount',
  'currentBalanceDue',
  'pin',
  'role',
  'roles',
  'basePayRate',
  'status',
]);

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  sku: 'SKU',
  barcode: 'Barcode',
  category: 'Category',
  subcategory: 'Subcategory',
  sizeCapacity: 'Size / Capacity',
  description: 'Description',
  costPrice: 'Buying / Cost Price',
  buyingPrice: 'Buying Price',
  sellingPrice: 'Selling Price',
  profitMargin: 'Profit Margin',
  stockQuantity: 'Stock Quantity',
  stock: 'Stock Count',
  minStockAlert: 'Min Stock Alert',
  unit: 'Unit',
  supplierId: 'Supplier ID',
  supplierName: 'Supplier',
  kraTaxType: 'KRA Tax Classification',
  storeStock: 'Store Stock Allocation',
  imageUrl: 'Product Image',
  phone: 'Phone Number',
  email: 'Email Address',
  address: 'Address',
  totalPurchases: 'Total Purchases',
  currentBalanceDue: 'Balance Due',
  creditLimit: 'Credit Limit',
  kraPin: 'KRA PIN',
  customerType: 'Customer Type',
  contactPerson: 'Contact Person',
  totalSuppliedValue: 'Total Supplied Value',
  paymentTerms: 'Payment Terms',
  bankDetails: 'Bank / Payment Details',
  categorySpecialty: 'Category Specialty',
  contactsList: 'Contacts List',
  receiptNumber: 'Receipt Number',
  items: 'Line Items',
  subtotal: 'Subtotal',
  discountTotal: 'Discount Total',
  taxTotal: 'Tax Total',
  grandTotal: 'Grand Total',
  amountPaid: 'Amount Paid',
  balanceDue: 'Balance Due',
  paymentStatus: 'Payment Status',
  payments: 'Payment Breakdown',
  customerName: 'Customer Name',
  cashierName: 'Cashier',
  salesRepName: 'Sales Rep',
  date: 'Date / Time',
  amount: 'Amount',
  paymentMethod: 'Payment Method',
  recordedBy: 'Recorded By',
  receiptNo: 'Receipt Ref',
  status: 'Status',
  recurringType: 'Frequency',
  role: 'Primary Role',
  roles: 'Assigned Roles',
  pin: 'Terminal PIN',
  department: 'Department',
  payType: 'Pay Type',
  payCycle: 'Pay Cycle',
  basePayRate: 'Base Pay Rate',
  fixedAllowance: 'Fixed Allowance',
  commissionRate: 'Commission Rate (%)',
  commissionType: 'Commission Model',
  notes: 'Notes',
};

const IGNORED_DIFF_KEYS = new Set([
  'id',
  'updatedAt',
  'editedAt',
  'createdAt',
  'syncedAt',
  'timestamp',
  '_deleted',
]);

function stableNormalize(val: any): any {
  if (val === undefined || val === null || val === '') return null;
  if (Array.isArray(val)) {
    return val.map((v) => stableNormalize(v));
  }
  if (typeof val === 'object') {
    const out: Record<string, any> = {};
    for (const key of Object.keys(val).sort()) {
      const normalized = stableNormalize(val[key]);
      if (normalized !== null) {
        out[key] = normalized;
      }
    }
    return out;
  }
  return val;
}

function deepEqualNormalized(a: any, b: any): boolean {
  const na = stableNormalize(a);
  const nb = stableNormalize(b);
  return JSON.stringify(na) === JSON.stringify(nb);
}

function formatFieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function formatConflictValue(key: string, val: any): string {
  if (val === undefined || val === null || val === '') return '— (Empty)';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') {
    if (CURRENCY_KEYS.has(key)) {
      return `KSh ${val.toLocaleString('en-KE', {
        minimumFractionDigits: Number.isInteger(val) ? 0 : 2,
        maximumFractionDigits: 2,
      })}`;
    }
    if (key === 'commissionRate' || key === 'profitMargin' || key === 'profitShareRate') {
      return `${val}%`;
    }
    return val.toLocaleString();
  }
  if (typeof val === 'string') {
    if (val.startsWith('data:image/')) {
      return '[Embedded Photo Asset]';
    }
    if (val.length > 140) {
      return `${val.slice(0, 137)}...`;
    }
    return val;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return 'None (0 items)';
    if (val.every((x) => typeof x === 'string' || typeof x === 'number')) {
      return val.join(', ');
    }
    if (key === 'items') {
      return `${val.length} item(s): ${val
        .slice(0, 3)
        .map((it: any) => `${it?.quantity || 1}x ${it?.product?.name || it?.productName || 'Item'}`)
        .join(', ')}${val.length > 3 ? '...' : ''}`;
    }
    if (key === 'payments') {
      return val
        .map((p: any) => `${p?.method || 'pay'}: KSh ${Number(p?.amount || 0).toLocaleString()}`)
        .join(', ');
    }
    return `${val.length} entries`;
  }
  if (typeof val === 'object') {
    const entries = Object.entries(val);
    if (entries.length === 0) return '— (Empty)';
    return entries
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(', ');
  }
  return String(val);
}

export function computeRecordDiffs(
  recordType: SyncConflictRecordType,
  localRecord: Record<string, any>,
  remoteRecord: Record<string, any>
): { diffs: ConflictFieldDiff[]; allComparableFields: ConflictFieldDiff[] } {
  const allKeys = Array.from(
    new Set([
      ...Object.keys(localRecord || {}),
      ...Object.keys(remoteRecord || {}),
    ])
  ).filter((k) => !IGNORED_DIFF_KEYS.has(k));

  const diffs: ConflictFieldDiff[] = [];
  const allComparableFields: ConflictFieldDiff[] = [];

  for (const key of allKeys) {
    const localVal = localRecord?.[key];
    let remoteVal = remoteRecord?.[key];

    // Cloud sync intentionally strips >12KB base64 images before uploading; preserve local image without triggering a false conflict
    if (
      recordType === 'product' &&
      key === 'imageUrl' &&
      (!remoteVal || remoteVal === '') &&
      typeof localVal === 'string' &&
      localVal.startsWith('data:image/')
    ) {
      remoteVal = localVal;
    }

    const formattedLocal = formatFieldLabel(key) ? formatConflictValue(key, localVal) : '';
    const formattedRemote = formatConflictValue(key, remoteVal);
    const numericDelta =
      typeof localVal === 'number' && typeof remoteVal === 'number'
        ? localVal - remoteVal
        : undefined;

    const entry: ConflictFieldDiff = {
      key,
      label: formatFieldLabel(key),
      localValue: localVal,
      remoteValue: remoteVal,
      formattedLocal,
      formattedRemote,
      numericDelta,
      isCurrency: CURRENCY_KEYS.has(key),
      isCritical: CRITICAL_KEYS.has(key),
    };

    allComparableFields.push(entry);

    if (!deepEqualNormalized(localVal, remoteVal)) {
      diffs.push(entry);
    }
  }

  // Sort critical business fields first
  diffs.sort((a, b) => {
    if (Boolean(a.isCritical) !== Boolean(b.isCritical)) {
      return a.isCritical ? -1 : 1;
    }
    return a.label.localeCompare(b.label);
  });

  return { diffs, allComparableFields };
}

export function getRecordDisplayInfo(
  recordType: SyncConflictRecordType,
  record: Record<string, any>
): { label: string; sublabel?: string } {
  if (!record) return { label: 'Unknown Record' };
  switch (recordType) {
    case 'product':
      return {
        label: record.name || 'Unnamed Product',
        sublabel: [record.sku ? `SKU: ${record.sku}` : '', record.category].filter(Boolean).join(' · '),
      };
    case 'customer':
      return {
        label: record.name || 'Unnamed Customer',
        sublabel: record.phone || record.email || undefined,
      };
    case 'supplier':
      return {
        label: record.name || 'Unnamed Supplier',
        sublabel: record.contactPerson || record.phone || undefined,
      };
    case 'transaction':
      return {
        label: record.receiptNumber ? `Receipt #${record.receiptNumber}` : `Sale ${record.id}`,
        sublabel: record.customerName || record.cashierName || undefined,
      };
    case 'expense':
      return {
        label: `${record.category || 'Expense'}: ${record.description || record.id}`,
        sublabel: record.amount !== undefined ? `KSh ${Number(record.amount).toLocaleString()}` : undefined,
      };
    case 'user':
      return {
        label: record.name || 'Staff Member',
        sublabel: record.role || record.email || undefined,
      };
    default:
      return { label: String(record.id || 'Record') };
  }
}

function buildConflictFingerprint(
  recordType: SyncConflictRecordType,
  recordId: string,
  sharedTimestampMs: number,
  diffs: ConflictFieldDiff[]
): string {
  const sig = diffs
    .map((d) => `${d.key}:${JSON.stringify(stableNormalize(d.localValue))}=>${JSON.stringify(stableNormalize(d.remoteValue))}`)
    .join('|');
  return `${recordType}::${recordId}::${sharedTimestampMs}::${sig}`;
}

export interface MergeWithConflictOptions<T extends { id: string }> {
  recordType: SyncConflictRecordType;
  localRecords: T[];
  incomingRecords: T[];
  deletedIds?: Set<string>;
  pendingMap?: Map<string, T>;
  resolvedFingerprints?: Set<string>;
  sourceLabel?: string;
}

export function mergeRecordsWithConflictDetection<T extends { id: string }>({
  recordType,
  localRecords,
  incomingRecords,
  deletedIds,
  pendingMap,
  resolvedFingerprints,
  sourceLabel = 'Cloud Firestore Sync',
}: MergeWithConflictOptions<T>): { merged: T[]; conflicts: SyncConflict<T>[] } {
  const map = new Map<string, T>();
  const conflicts: SyncConflict<T>[] = [];

  (localRecords || []).forEach((lr) => {
    if (lr && lr.id && !deletedIds?.has(lr.id)) {
      map.set(lr.id, lr);
    }
  });

  if (pendingMap) {
    pendingMap.forEach((pendingItem, id) => {
      if (deletedIds?.has(id)) return;
      const existing = map.get(id);
      if (!existing) {
        map.set(id, pendingItem);
        return;
      }
      const pendingTs = getRecordTimestampInfo(recordType, pendingItem).ms;
      const existingTs = getRecordTimestampInfo(recordType, existing).ms;
      if (pendingTs >= existingTs) {
        const mergedPending: any = { ...pendingItem };
        if (recordType === 'product' && !mergedPending.imageUrl && (existing as any).imageUrl) {
          mergedPending.imageUrl = (existing as any).imageUrl;
        }
        map.set(id, mergedPending);
      }
    });
  }

  (incomingRecords || []).forEach((remoteItem) => {
    if (!remoteItem || !remoteItem.id || deletedIds?.has(remoteItem.id)) return;
    const local = map.get(remoteItem.id);
    if (!local) {
      map.set(remoteItem.id, remoteItem);
      return;
    }

    const localTs = getRecordTimestampInfo(recordType, local);
    const remoteTs = getRecordTimestampInfo(recordType, remoteItem);
    const pendingItem = pendingMap?.get(remoteItem.id);
    const pendingTs = pendingItem ? getRecordTimestampInfo(recordType, pendingItem) : { ms: 0, iso: '' };

    // Exact millisecond timestamp tie between local edit and remote server update
    if (localTs.ms > 0 && remoteTs.ms > 0 && localTs.ms === remoteTs.ms) {
      const { diffs, allComparableFields } = computeRecordDiffs(recordType, local, remoteItem);
      if (diffs.length > 0) {
        const fingerprint = buildConflictFingerprint(
          recordType,
          remoteItem.id,
          remoteTs.ms,
          diffs
        );
        if (!resolvedFingerprints?.has(fingerprint)) {
          const display = getRecordDisplayInfo(recordType, local);
          conflicts.push({
            id: `${recordType}:${remoteItem.id}:${remoteTs.ms}`,
            fingerprint,
            recordType,
            recordId: remoteItem.id,
            recordLabel: display.label,
            recordSublabel: display.sublabel,
            sharedTimestampMs: remoteTs.ms,
            sharedTimestampIso: remoteTs.iso || localTs.iso,
            detectedAt: new Date().toISOString(),
            sourceLabel,
            localRecord: local,
            remoteRecord:
              recordType === 'product' && !(remoteItem as any).imageUrl && (local as any).imageUrl
                ? ({ ...remoteItem, imageUrl: (local as any).imageUrl } as T)
                : remoteItem,
            diffs,
            allComparableFields,
          });
        }
      }

      // Preserve local imageUrl if remote stripped oversized base64
      if (recordType === 'product' && !(local as any).imageUrl && (remoteItem as any).imageUrl) {
        map.set(remoteItem.id, {
          ...local,
          imageUrl: (remoteItem as any).imageUrl,
        } as T);
      }
      return;
    }

    // Standard timestamp resolution: strictly newer (`>`) wins, never clobbering newer pending writes
    if (remoteTs.ms > localTs.ms && (!pendingItem || remoteTs.ms > pendingTs.ms)) {
      const nextRemote: any = { ...remoteItem };
      if (recordType === 'product' && !nextRemote.imageUrl && (local as any).imageUrl) {
        nextRemote.imageUrl = (local as any).imageUrl;
      }
      map.set(remoteItem.id, nextRemote);
    } else if (recordType === 'product' && !(local as any).imageUrl && (remoteItem as any).imageUrl) {
      map.set(remoteItem.id, {
        ...local,
        imageUrl: (remoteItem as any).imageUrl,
      } as T);
    }
  });

  return { merged: Array.from(map.values()), conflicts };
}

export function formatPreciseTimestamp(isoOrMs: string | number): {
  localFormatted: string;
  utcIso: string;
  epochMs: number;
} {
  const ms = typeof isoOrMs === 'number' ? isoOrMs : parseTimestampMs(isoOrMs);
  if (!ms) {
    return {
      localFormatted: String(isoOrMs || 'Unknown'),
      utcIso: String(isoOrMs || ''),
      epochMs: 0,
    };
  }
  const d = new Date(ms);
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const pad3 = (n: number) => String(n).padStart(3, '0');
  const localFormatted = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(d.getMilliseconds())}`;
  return {
    localFormatted,
    utcIso: d.toISOString(),
    epochMs: ms,
  };
}

export type AnySyncRecord = Product | Customer | Supplier | Transaction | Expense | User;
