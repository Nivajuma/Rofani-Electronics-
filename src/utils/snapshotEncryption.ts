// Utility for Full Data Snapshot Generation & AES-256-GCM Encryption / Decryption

import { Product, Transaction, Customer, Supplier, Expense, AttendanceRecord, User, StoreLocation } from '../types';

export interface FullDataSnapshotPayload {
  version: string;
  exportedAt: string;
  metadata: {
    system: string;
    storeName?: string;
    totalProducts: number;
    totalTransactions: number;
    totalCustomers: number;
    totalSuppliers: number;
    totalExpenses: number;
  };
  collections: {
    products: Product[];
    transactions: Transaction[];
    customers: Customer[];
    suppliers?: Supplier[];
    expenses?: Expense[];
    attendanceRecords?: AttendanceRecord[];
    users?: Partial<User>[];
    stores?: StoreLocation[];
  };
}

export interface EncryptedSnapshotEnvelope {
  app: string;
  format: 'ENCRYPTED_SNAPSHOT_V1';
  algorithm: 'AES-GCM-256';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string; // Base64
  iv: string; // Base64
  ciphertext: string; // Base64
  checksum: string; // SHA-256 Hex
  createdAt: string;
  collectionsSummary: {
    products: number;
    transactions: number;
    customers: number;
    totalRecords: number;
  };
}

// Convert ArrayBuffer to Base64
const bufferToBase64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Convert Base64 to ArrayBuffer
const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// Compute SHA-256 hash string
export const computeSha256 = async (text: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Encrypt arbitrary object data with AES-256-GCM using Web Crypto API
 */
export const encryptSnapshotData = async (
  snapshot: FullDataSnapshotPayload,
  passphrase: string
): Promise<EncryptedSnapshotEnvelope> => {
  if (!passphrase || passphrase.trim().length === 0) {
    throw new Error('Encryption passphrase cannot be empty.');
  }

  const jsonString = JSON.stringify(snapshot, null, 2);
  const checksum = await computeSha256(jsonString);

  // Generate 16-byte random salt and 12-byte random IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Import passphrase
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES-GCM 256-bit key
  const iterations = 100000;
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // Encrypt
  const encryptedBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(jsonString)
  );

  const envelope: EncryptedSnapshotEnvelope = {
    app: 'ROFANI_RETAIL_STOCK_POS',
    format: 'ENCRYPTED_SNAPSHOT_V1',
    algorithm: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256',
    iterations,
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
    ciphertext: bufferToBase64(encryptedBuf),
    checksum,
    createdAt: new Date().toISOString(),
    collectionsSummary: {
      products: snapshot.collections.products.length,
      transactions: snapshot.collections.transactions.length,
      customers: snapshot.collections.customers.length,
      totalRecords:
        snapshot.collections.products.length +
        snapshot.collections.transactions.length +
        snapshot.collections.customers.length,
    },
  };

  return envelope;
};

/**
 * Decrypt an EncryptedSnapshotEnvelope back into FullDataSnapshotPayload
 */
export const decryptSnapshotData = async (
  envelope: EncryptedSnapshotEnvelope,
  passphrase: string
): Promise<FullDataSnapshotPayload> => {
  if (envelope.format !== 'ENCRYPTED_SNAPSHOT_V1') {
    throw new Error('Unsupported snapshot format or corrupted envelope.');
  }

  const saltBuf = base64ToBuffer(envelope.salt);
  const ivBuf = base64ToBuffer(envelope.iv);
  const ciphertextBuf = base64ToBuffer(envelope.ciphertext);

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(saltBuf),
      iterations: envelope.iterations || 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  try {
    const decryptedBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(ivBuf) },
      key,
      ciphertextBuf
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuf);

    // Verify SHA-256 checksum
    const computedChecksum = await computeSha256(jsonString);
    if (computedChecksum !== envelope.checksum) {
      throw new Error('Integrity check failed: Checksum mismatch detected.');
    }

    return JSON.parse(jsonString) as FullDataSnapshotPayload;
  } catch (err: any) {
    throw new Error('Decryption failed! Please check that your security passphrase / PIN is correct.');
  }
};

/**
 * Generate a single consolidated CSV file containing all collections
 */
export const generateConsolidatedCsvSnapshot = (snapshot: FullDataSnapshotPayload): string => {
  const parts: string[] = [];

  // Section 1: Snapshot Header Info
  parts.push(`# ========================================================`);
  parts.push(`# ROFANI ENTERPRISE POS - FULL DATA SNAPSHOT`);
  parts.push(`# Exported At: ${snapshot.exportedAt}`);
  parts.push(`# Store: ${snapshot.metadata.storeName || 'ROFANI ELECTRONICS & BOUTIQUE'}`);
  parts.push(`# Total Products: ${snapshot.metadata.totalProducts}`);
  parts.push(`# Total Transactions: ${snapshot.metadata.totalTransactions}`);
  parts.push(`# Total Customers: ${snapshot.metadata.totalCustomers}`);
  parts.push(`# ========================================================\n`);

  // Section 2: Products Collection
  parts.push(`[COLLECTION: PRODUCTS]`);
  parts.push(`ID,Name,Category,Subcategory,SKU,Barcode,CostPrice(KSh),SellingPrice(KSh),StockQuantity,Unit,SupplierName,CreatedAt`);
  snapshot.collections.products.forEach((p) => {
    parts.push(
      `"${p.id}","${(p.name || '').replace(/"/g, '""')}","${(p.category || '').replace(/"/g, '""')}","${(p.subcategory || '').replace(/"/g, '""')}","${p.sku || ''}","${p.barcode || ''}",${p.costPrice || 0},${p.sellingPrice || 0},${p.stockQuantity || 0},"${p.unit || 'pcs'}","${(p.supplierName || '').replace(/"/g, '""')}","${p.createdAt || ''}"`
    );
  });
  parts.push('\n');

  // Section 3: Transactions Collection
  parts.push(`[COLLECTION: TRANSACTIONS]`);
  parts.push(`ID,ReceiptNumber,Date,CustomerName,CustomerPhone,ItemsCount,Subtotal(KSh),Discount(KSh),GrandTotal(KSh),AmountPaid(KSh),BalanceDue(KSh),PaymentStatus,CashierName,SalesRepName,Payments`);
  snapshot.collections.transactions.forEach((tx) => {
    const paymentsStr = (tx.payments || []).map((p) => `${p.method}:${p.amount}${p.reference ? `(${p.reference})` : ''}`).join(';');
    parts.push(
      `"${tx.id}","${tx.receiptNumber}","${tx.date}","${(tx.customerName || 'Walk-in').replace(/"/g, '""')}","${tx.customerPhone || ''}",${tx.items?.length || 0},${tx.subtotal || 0},${tx.discountTotal || 0},${tx.grandTotal || 0},${tx.amountPaid || 0},${tx.balanceDue || 0},"${tx.paymentStatus}","${(tx.cashierName || '').replace(/"/g, '""')}","${(tx.salesRepName || '').replace(/"/g, '""')}","${paymentsStr.replace(/"/g, '""')}"`
    );
  });
  parts.push('\n');

  // Section 4: Customers Collection
  parts.push(`[COLLECTION: CUSTOMERS]`);
  parts.push(`ID,Name,Phone,Email,Address,TotalPurchases(KSh),CurrentBalanceDue(KSh),CustomerType,Notes`);
  snapshot.collections.customers.forEach((c) => {
    parts.push(
      `"${c.id}","${(c.name || '').replace(/"/g, '""')}","${c.phone || ''}","${c.email || ''}","${(c.address || '').replace(/"/g, '""')}",${c.totalPurchases || 0},${c.currentBalanceDue || 0},"${c.customerType || 'Individual'}","${(c.notes || '').replace(/"/g, '""')}"`
    );
  });

  return parts.join('\n');
};

/**
 * Triggers client-side browser file download
 */
export const downloadSnapshotFile = (
  content: string,
  filename: string,
  mimeType: string = 'application/json'
): void => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
