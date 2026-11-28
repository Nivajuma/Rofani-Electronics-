import { useState, useEffect } from 'react';
import { safeGetJSON, safeSetJSON } from './safeStorage';
import { loadShopProtectionSettings } from './shopProtectionSettings';
import { loadTransactionSettings } from './transactionSettings';

export interface ItemSettingsState {
  enableItem: boolean;
  itemType: string;
  enableProductImages: boolean;
  barcodeScanning: boolean;
  trackExpiryDate: boolean;
  enableExpiryDate: boolean;
  expiryAlertDays: number;
  stockMaintenance: boolean;
  manufacturing: boolean;
  itemUnits: boolean;
  defaultUnit: boolean;
  itemCategory: boolean;
  partyWiseItemRate: boolean;
  wholesalePrice: boolean;
  quantityDecimals: number;
  itemWiseTax: boolean;
  itemWiseDiscount: boolean;
  enableGlobalItemDiscount: boolean;
  globalItemDiscountPercent: number;
  autoSetSellingPriceZeroMargin: boolean;
  canSellBelowBuyingPrice: boolean;
  enableCacheOnCart: boolean;
  updatedAt?: string;
}

export const ITEM_SETTINGS_EVENT = 'rofani:item-settings-updated';

export const DEFAULT_ITEM_SETTINGS: ItemSettingsState = {
  enableItem: true,
  itemType: 'Products and Services',
  enableProductImages: true,
  barcodeScanning: true,
  trackExpiryDate: false,
  enableExpiryDate: false,
  expiryAlertDays: 30,
  stockMaintenance: true,
  manufacturing: false,
  itemUnits: true,
  defaultUnit: false,
  itemCategory: true,
  partyWiseItemRate: false,
  wholesalePrice: true,
  quantityDecimals: 2,
  itemWiseTax: false,
  itemWiseDiscount: true,
  enableGlobalItemDiscount: false,
  globalItemDiscountPercent: 0,
  autoSetSellingPriceZeroMargin: false,
  canSellBelowBuyingPrice: false,
  enableCacheOnCart: true,
};

export function getItemSettingsStorageKey(storeId?: string): string {
  const cleanStore = (storeId || 'default').trim() || 'default';
  return `rofani_item_settings_${cleanStore}`;
}

export function normalizeItemSettings(raw: any): ItemSettingsState {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_ITEM_SETTINGS };
  }

  const parsedDecimals = Number(raw.quantityDecimals);
  const quantityDecimals =
    Number.isFinite(parsedDecimals) && parsedDecimals >= 0 && parsedDecimals <= 6
      ? Math.round(parsedDecimals)
      : DEFAULT_ITEM_SETTINGS.quantityDecimals;

  const parsedGlobalDisc = Number(raw.globalItemDiscountPercent);
  const globalItemDiscountPercent =
    Number.isFinite(parsedGlobalDisc) && parsedGlobalDisc >= 0 && parsedGlobalDisc <= 100
      ? Number(parsedGlobalDisc.toFixed(2))
      : DEFAULT_ITEM_SETTINGS.globalItemDiscountPercent;

  const parsedExpiryDays = Number(raw.expiryAlertDays);
  const expiryAlertDays =
    Number.isFinite(parsedExpiryDays) && parsedExpiryDays >= 1 && parsedExpiryDays <= 365
      ? Math.round(parsedExpiryDays)
      : DEFAULT_ITEM_SETTINGS.expiryAlertDays;

  return {
    enableItem:
      typeof raw.enableItem === 'boolean' ? raw.enableItem : DEFAULT_ITEM_SETTINGS.enableItem,
    itemType:
      typeof raw.itemType === 'string' && raw.itemType.trim()
        ? raw.itemType
        : DEFAULT_ITEM_SETTINGS.itemType,
    enableProductImages:
      typeof raw.enableProductImages === 'boolean'
        ? raw.enableProductImages
        : DEFAULT_ITEM_SETTINGS.enableProductImages,
    barcodeScanning:
      typeof raw.barcodeScanning === 'boolean'
        ? raw.barcodeScanning
        : DEFAULT_ITEM_SETTINGS.barcodeScanning,
    ...(() => {
      const resolvedExpiry =
        typeof raw.trackExpiryDate === 'boolean'
          ? raw.trackExpiryDate
          : typeof raw.enableExpiryDate === 'boolean'
          ? raw.enableExpiryDate
          : DEFAULT_ITEM_SETTINGS.trackExpiryDate;
      return {
        trackExpiryDate: resolvedExpiry,
        enableExpiryDate: resolvedExpiry,
        expiryAlertDays,
      };
    })(),
    stockMaintenance:
      typeof raw.stockMaintenance === 'boolean'
        ? raw.stockMaintenance
        : DEFAULT_ITEM_SETTINGS.stockMaintenance,
    manufacturing:
      typeof raw.manufacturing === 'boolean'
        ? raw.manufacturing
        : DEFAULT_ITEM_SETTINGS.manufacturing,
    itemUnits:
      typeof raw.itemUnits === 'boolean' ? raw.itemUnits : DEFAULT_ITEM_SETTINGS.itemUnits,
    defaultUnit:
      typeof raw.defaultUnit === 'boolean' ? raw.defaultUnit : DEFAULT_ITEM_SETTINGS.defaultUnit,
    itemCategory:
      typeof raw.itemCategory === 'boolean'
        ? raw.itemCategory
        : DEFAULT_ITEM_SETTINGS.itemCategory,
    partyWiseItemRate:
      typeof raw.partyWiseItemRate === 'boolean'
        ? raw.partyWiseItemRate
        : DEFAULT_ITEM_SETTINGS.partyWiseItemRate,
    wholesalePrice:
      typeof raw.wholesalePrice === 'boolean'
        ? raw.wholesalePrice
        : DEFAULT_ITEM_SETTINGS.wholesalePrice,
    quantityDecimals,
    itemWiseTax:
      typeof raw.itemWiseTax === 'boolean' ? raw.itemWiseTax : DEFAULT_ITEM_SETTINGS.itemWiseTax,
    itemWiseDiscount:
      typeof raw.itemWiseDiscount === 'boolean'
        ? raw.itemWiseDiscount
        : DEFAULT_ITEM_SETTINGS.itemWiseDiscount,
    enableGlobalItemDiscount:
      typeof raw.enableGlobalItemDiscount === 'boolean'
        ? raw.enableGlobalItemDiscount
        : DEFAULT_ITEM_SETTINGS.enableGlobalItemDiscount,
    globalItemDiscountPercent,
    autoSetSellingPriceZeroMargin:
      typeof raw.autoSetSellingPriceZeroMargin === 'boolean'
        ? raw.autoSetSellingPriceZeroMargin
        : DEFAULT_ITEM_SETTINGS.autoSetSellingPriceZeroMargin,
    canSellBelowBuyingPrice:
      typeof raw.canSellBelowBuyingPrice === 'boolean'
        ? raw.canSellBelowBuyingPrice
        : DEFAULT_ITEM_SETTINGS.canSellBelowBuyingPrice,
    enableCacheOnCart:
      typeof raw.enableCacheOnCart === 'boolean'
        ? raw.enableCacheOnCart
        : DEFAULT_ITEM_SETTINGS.enableCacheOnCart,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
}

export function loadItemSettings(storeId?: string): ItemSettingsState {
  const key = getItemSettingsStorageKey(storeId);
  const stored = safeGetJSON<any>(key, null);
  const shopControls = loadShopProtectionSettings(storeId);
  const txSettings = loadTransactionSettings(storeId);

  if (stored && typeof stored === 'object') {
    const normalized = normalizeItemSettings(stored);
    // Keep cross-screen shared rules synchronized with store controls/tx settings if not set in item doc
    return {
      ...normalized,
      canSellBelowBuyingPrice:
        typeof stored.canSellBelowBuyingPrice === 'boolean'
          ? stored.canSellBelowBuyingPrice
          : shopControls.canSellBelowBuyingPrice,
      enableCacheOnCart:
        typeof stored.enableCacheOnCart === 'boolean'
          ? stored.enableCacheOnCart
          : shopControls.enableCacheOnCart,
      barcodeScanning:
        typeof stored.barcodeScanning === 'boolean'
          ? stored.barcodeScanning
          : txSettings.enableBarcodeScanning,
    };
  }

  const isDefaultStore = !storeId || storeId === 'default' || storeId === 'store-main';
  const legacyFallback = isDefaultStore
    ? safeGetJSON<any>('rofani_item_settings_v1', null)
    : null;
  if (legacyFallback && typeof legacyFallback === 'object') {
    return normalizeItemSettings({
      ...legacyFallback,
      canSellBelowBuyingPrice: shopControls.canSellBelowBuyingPrice,
      enableCacheOnCart: shopControls.enableCacheOnCart,
      barcodeScanning:
        typeof legacyFallback.barcodeScanning === 'boolean'
          ? legacyFallback.barcodeScanning
          : txSettings.enableBarcodeScanning,
    });
  }

  return normalizeItemSettings({
    ...DEFAULT_ITEM_SETTINGS,
    canSellBelowBuyingPrice: shopControls.canSellBelowBuyingPrice,
    enableCacheOnCart: shopControls.enableCacheOnCart,
    barcodeScanning: txSettings.enableBarcodeScanning,
  });
}

export function saveItemSettingsLocal(
  settings: ItemSettingsState,
  storeId?: string
): ItemSettingsState {
  const normalized = normalizeItemSettings({
    ...settings,
    updatedAt: new Date().toISOString(),
  });
  const key = getItemSettingsStorageKey(storeId);
  safeSetJSON(key, normalized);
  safeSetJSON('rofani_item_settings_v1', normalized);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(ITEM_SETTINGS_EVENT, {
        detail: { storeId: storeId || 'default', settings: normalized },
      })
    );
  }
  return normalized;
}

export function useItemSettings(
  storeId?: string
): [ItemSettingsState, (next: ItemSettingsState) => void] {
  const [settings, setSettings] = useState<ItemSettingsState>(() =>
    loadItemSettings(storeId)
  );

  useEffect(() => {
    setSettings(loadItemSettings(storeId));
  }, [storeId]);

  useEffect(() => {
    const syncHandler = (ev: Event) => {
      const custom = ev as CustomEvent<{
        storeId?: string;
        settings?: ItemSettingsState;
      }>;
      if (custom?.detail?.settings) {
        if (!storeId || !custom.detail.storeId || custom.detail.storeId === storeId) {
          setSettings(normalizeItemSettings(custom.detail.settings));
          return;
        }
      }
      setSettings(loadItemSettings(storeId));
    };

    window.addEventListener(ITEM_SETTINGS_EVENT, syncHandler);
    window.addEventListener('storage', syncHandler);
    return () => {
      window.removeEventListener(ITEM_SETTINGS_EVENT, syncHandler);
      window.removeEventListener('storage', syncHandler);
    };
  }, [storeId]);

  const updateSettings = (next: ItemSettingsState) => {
    const saved = saveItemSettingsLocal(next, storeId);
    setSettings(saved);
  };

  return [settings, updateSettings];
}
