import { useState, useEffect, useCallback } from 'react';
import { safeGetJSON, safeSetJSON } from './safeStorage';
import { Transaction } from '../types';

export type ShareTransactionPreference = 'ask' | 'pdf' | 'thermal' | 'whatsapp';

export interface AdditionalCustomFieldConfig {
  id: string;
  label: string;
  enabled: boolean;
  defaultValue?: string;
}

export interface FirmPrefixSet {
  saleInvoice: string;
  creditNote: string;
  saleOrder: string;
  purchaseOrder: string;
  estimate: string;
  deliveryNote: string;
  paymentIn: string;
}

export const DEFAULT_FIRM_PREFIXES: FirmPrefixSet = {
  saleInvoice: 'INV-',
  creditNote: 'CN-',
  saleOrder: 'SO-',
  purchaseOrder: 'PO-',
  estimate: 'EST-',
  deliveryNote: 'DN-',
  paymentIn: 'PAY-',
};

export interface TransactionSettingsState {
  // Section 1: Transaction Header Toggles
  enableInvoiceBillNumber: boolean;
  cashSaleByDefault: boolean;
  enableBillingPartyName: boolean;
  enableCustomerPoDetails: boolean;
  addTimeOnTransactions: boolean;

  // Section 2: Items Table Toggles
  allowTaxInclusiveExclusiveOnRate: boolean;
  displayPurchasePrice: boolean;
  showLast5SalePrices: boolean;
  enableFreeItemQuantity: boolean;
  enableItemCountColumn: boolean;
  customCountLabel: string;
  enableBarcodeScanning: boolean;

  // Section 3: Taxes, Discount & Total
  enableTransactionWiseTax: boolean;
  enableTransactionWiseDiscount: boolean;
  roundOffTransactionAmount: boolean;

  // Section 4: More Transaction Features & Expandable Sub-Menus
  shareTransactionAs: ShareTransactionPreference;
  passcodeForEditDelete: boolean;
  discountDuringPayment: boolean;
  linkPaymentsToInvoices: boolean;
  showProfitOnSaleInvoice: boolean;

  dueDatesPaymentTerms: {
    enabled: boolean;
    defaultTerms: string;
    defaultDueDays: number;
  };
  termsAndConditions: {
    enabled: boolean;
    text: string;
  };
  additionalFields: {
    enabled: boolean;
    fields: AdditionalCustomFieldConfig[];
  };
  transportationDetails: {
    enabled: boolean;
    defaultMode: string;
    driverLabel: string;
    vehicleLabel: string;
  };
  additionalCharges: {
    enabled: boolean;
    defaultLabel: string;
    defaultAmount: number;
  };

  // Section 5: Transaction Prefixes (Per Store / Firm)
  activePrefixFirmId: string;
  prefixesByFirm: Record<string, FirmPrefixSet>;

  // Core POS Defaults (preserved for seamless compatibility)
  defaultPaymentMethod: 'mpesa' | 'cash' | 'credit_card' | 'bank_transfer';
  autoPrintReceipt: boolean;
  defaultSalesRep: string;

  updatedAt?: string;
}

export const TRANSACTION_SETTINGS_DEFAULT: TransactionSettingsState = {
  // Section 1
  enableInvoiceBillNumber: true,
  cashSaleByDefault: false,
  enableBillingPartyName: false,
  enableCustomerPoDetails: false,
  addTimeOnTransactions: true,

  // Section 2
  allowTaxInclusiveExclusiveOnRate: false,
  displayPurchasePrice: false,
  showLast5SalePrices: false,
  enableFreeItemQuantity: false,
  enableItemCountColumn: false,
  customCountLabel: 'Count',
  enableBarcodeScanning: true,

  // Section 3
  enableTransactionWiseTax: true,
  enableTransactionWiseDiscount: true,
  roundOffTransactionAmount: false,

  // Section 4
  shareTransactionAs: 'ask',
  passcodeForEditDelete: true,
  discountDuringPayment: false,
  linkPaymentsToInvoices: true,
  showProfitOnSaleInvoice: false,

  dueDatesPaymentTerms: {
    enabled: false,
    defaultTerms: 'Net 15 Days',
    defaultDueDays: 15,
  },
  termsAndConditions: {
    enabled: false,
    text: 'Goods once sold are not returnable after 7 days. Present official receipt for warranty support.',
  },
  additionalFields: {
    enabled: false,
    fields: [
      { id: 'field-1', label: 'Delivery Contact / Receiver', enabled: true, defaultValue: '' },
      { id: 'field-2', label: 'Reference / Job Card #', enabled: false, defaultValue: '' },
      { id: 'field-3', label: 'Warranty Period', enabled: false, defaultValue: '' },
    ],
  },
  transportationDetails: {
    enabled: false,
    defaultMode: 'Boda Boda',
    driverLabel: 'Rider / Driver Name',
    vehicleLabel: 'Plate / Matatu / Waybill #',
  },
  additionalCharges: {
    enabled: false,
    defaultLabel: 'Delivery / Packaging Fee',
    defaultAmount: 0,
  },

  // Section 5
  activePrefixFirmId: 'default',
  prefixesByFirm: {
    default: { ...DEFAULT_FIRM_PREFIXES },
  },

  defaultPaymentMethod: 'mpesa',
  autoPrintReceipt: true,
  defaultSalesRep: 'Any Available Cashier',
};

export const TRANSACTION_SETTINGS_EVENT = 'rofani:transaction-settings-updated';

function getStorageKey(storeId?: string): string {
  const cleanId = (storeId || '').trim();
  return cleanId ? `rofani_transaction_settings_${cleanId}` : 'rofani_transaction_settings_v1';
}

export function normalizeTransactionSettings(
  raw?: Partial<TransactionSettingsState> | null
): TransactionSettingsState {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    ...TRANSACTION_SETTINGS_DEFAULT,
    ...src,
    customCountLabel:
      typeof src.customCountLabel === 'string' && src.customCountLabel.trim()
        ? src.customCountLabel
        : TRANSACTION_SETTINGS_DEFAULT.customCountLabel,
    dueDatesPaymentTerms: {
      ...TRANSACTION_SETTINGS_DEFAULT.dueDatesPaymentTerms,
      ...(src.dueDatesPaymentTerms || {}),
    },
    termsAndConditions: {
      ...TRANSACTION_SETTINGS_DEFAULT.termsAndConditions,
      ...(src.termsAndConditions || {}),
    },
    additionalFields: {
      ...TRANSACTION_SETTINGS_DEFAULT.additionalFields,
      ...(src.additionalFields || {}),
      fields:
        Array.isArray(src.additionalFields?.fields) && src.additionalFields.fields.length > 0
          ? src.additionalFields.fields
          : TRANSACTION_SETTINGS_DEFAULT.additionalFields.fields,
    },
    transportationDetails: {
      ...TRANSACTION_SETTINGS_DEFAULT.transportationDetails,
      ...(src.transportationDetails || {}),
    },
    additionalCharges: {
      ...TRANSACTION_SETTINGS_DEFAULT.additionalCharges,
      ...(src.additionalCharges || {}),
    },
    prefixesByFirm: {
      ...TRANSACTION_SETTINGS_DEFAULT.prefixesByFirm,
      ...(src.prefixesByFirm || {}),
    },
  };
}

export function loadTransactionSettings(storeId?: string): TransactionSettingsState {
  const scopedKey = getStorageKey(storeId);
  const scoped = safeGetJSON<Partial<TransactionSettingsState> | null>(scopedKey, null);
  if (scoped) {
    return normalizeTransactionSettings(scoped);
  }
  const fallback = safeGetJSON<Partial<TransactionSettingsState> | null>(
    'rofani_transaction_settings_v1',
    null
  );
  // Also migrate legacy defaultPaymentMethod / autoPrintReceipt if present
  const legacyDefaultPay = safeGetJSON<string>('rofani_settings_default_payment', '');
  const legacyAutoPrint = safeGetJSON<boolean | null>('rofani_settings_auto_print', null);
  const legacyRep = safeGetJSON<string>('rofani_settings_default_rep', '');
  return normalizeTransactionSettings({
    ...(fallback || {}),
    ...(legacyDefaultPay === 'cash' ||
    legacyDefaultPay === 'mpesa' ||
    legacyDefaultPay === 'credit_card' ||
    legacyDefaultPay === 'bank_transfer'
      ? { defaultPaymentMethod: legacyDefaultPay }
      : {}),
    ...(typeof legacyAutoPrint === 'boolean' ? { autoPrintReceipt: legacyAutoPrint } : {}),
    ...(legacyRep ? { defaultSalesRep: legacyRep } : {}),
  });
}

export function saveTransactionSettingsLocal(
  settings: TransactionSettingsState,
  storeId?: string
): TransactionSettingsState {
  const normalized = normalizeTransactionSettings({
    ...settings,
    updatedAt: new Date().toISOString(),
  });
  safeSetJSON(getStorageKey(storeId), normalized);
  safeSetJSON('rofani_transaction_settings_v1', normalized);
  safeSetJSON('rofani_settings_default_payment', normalized.cashSaleByDefault ? 'cash' : normalized.defaultPaymentMethod);
  safeSetJSON('rofani_settings_auto_print', normalized.autoPrintReceipt);
  safeSetJSON('rofani_settings_default_rep', normalized.defaultSalesRep);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(TRANSACTION_SETTINGS_EVENT, {
        detail: { storeId: storeId || 'default', settings: normalized },
      })
    );
  }
  return normalized;
}

export function getActiveFirmPrefixes(
  settings: TransactionSettingsState,
  firmOrStoreId?: string
): FirmPrefixSet {
  const key =
    (firmOrStoreId && settings.prefixesByFirm[firmOrStoreId] ? firmOrStoreId : undefined) ||
    (settings.activePrefixFirmId && settings.prefixesByFirm[settings.activePrefixFirmId]
      ? settings.activePrefixFirmId
      : undefined) ||
    'default';
  return {
    ...DEFAULT_FIRM_PREFIXES,
    ...(settings.prefixesByFirm[key] || {}),
  };
}

export function formatDocumentNumberWithPrefix(prefix: string, dateObj: Date, randomDigits?: number): string {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  const rand = randomDigits ?? Math.floor(100 + Math.random() * 900);
  const cleanPrefix = (prefix || '').trim();
  if (!cleanPrefix || cleanPrefix.toLowerCase() === 'none') {
    return `${y}${m}${d}-${rand}`;
  }
  return `${cleanPrefix}${y}${m}${d}-${rand}`;
}

export function getLast5SalePricesForProduct(
  productId: string,
  transactions: Transaction[],
  customerId?: string
): { unitPrice: number; date: string; customerName: string; receiptNumber: string }[] {
  if (!productId || !Array.isArray(transactions) || transactions.length === 0) return [];
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const customerMatches: { unitPrice: number; date: string; customerName: string; receiptNumber: string }[] = [];
  const otherMatches: { unitPrice: number; date: string; customerName: string; receiptNumber: string }[] = [];

  for (const tx of sorted) {
    const matchedItem = tx.items?.find((it) => it.product?.id === productId);
    if (!matchedItem) continue;
    const entry = {
      unitPrice: Number(matchedItem.unitPrice) || 0,
      date: tx.date,
      customerName: tx.customerName || 'Walk-in',
      receiptNumber: tx.receiptNumber,
    };
    if (customerId && tx.customerId === customerId && customerId !== 'walk-in') {
      customerMatches.push(entry);
    } else {
      otherMatches.push(entry);
    }
    if (customerMatches.length >= 5) break;
  }

  return [...customerMatches, ...otherMatches].slice(0, 5);
}

export function useTransactionSettings(storeId?: string) {
  const [settings, setSettings] = useState<TransactionSettingsState>(() =>
    loadTransactionSettings(storeId)
  );

  useEffect(() => {
    setSettings(loadTransactionSettings(storeId));
  }, [storeId]);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent<{ storeId?: string; settings?: TransactionSettingsState }>)
        .detail;
      if (detail?.settings) {
        setSettings(normalizeTransactionSettings(detail.settings));
      } else {
        setSettings(loadTransactionSettings(storeId));
      }
    };
    const handleStorage = () => {
      setSettings(loadTransactionSettings(storeId));
    };
    window.addEventListener(TRANSACTION_SETTINGS_EVENT, handleUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(TRANSACTION_SETTINGS_EVENT, handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [storeId]);

  const updateSettings = useCallback(
    (next: TransactionSettingsState) => {
      const saved = saveTransactionSettingsLocal(next, storeId);
      setSettings(saved);
      return saved;
    },
    [storeId]
  );

  return [settings, updateSettings] as const;
}
