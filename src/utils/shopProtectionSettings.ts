import { useState, useEffect } from 'react';
import { safeGetJSON, safeSetJSON } from './safeStorage';

export type InactivityTimeoutMinutes = 2 | 5 | 10 | 15 | 30;

export interface HomepageSummaryCardToggles {
  cashInHand: boolean;
  toReceiveCredit: boolean;
  todaysSales: boolean;
  todaysStockIn: boolean;
  todaysProfit: boolean;
  expenses: boolean;
  orders: boolean;
}

export interface ShopProtectionSettingsState {
  // 1. Cart, Pricing & Stock Guards
  enableCacheOnCart: boolean;
  canSellBelowBuyingPrice: boolean;
  enableExpiryAlerts: boolean;

  // 2. Homepage Live Summary Cards
  homepageSummaryCards: HomepageSummaryCardToggles;

  // 3. Shop Protection & Notifications
  enableInactivityLock: boolean;
  inactivityTimeoutMinutes: InactivityTimeoutMinutes;
  alertOnSaleEditDelete: boolean;
  alertOnAnySale: boolean;
  enable9PmDailySummary: boolean;

  updatedAt?: string;
}

export const SHOP_PROTECTION_SETTINGS_EVENT = 'rofani:shop-controls-updated';

export const DEFAULT_HOMEPAGE_SUMMARY_CARDS: HomepageSummaryCardToggles = {
  cashInHand: true,
  toReceiveCredit: true,
  todaysSales: true,
  todaysStockIn: true,
  todaysProfit: true,
  expenses: true,
  orders: true,
};

export const DEFAULT_SHOP_PROTECTION_SETTINGS: ShopProtectionSettingsState = {
  enableCacheOnCart: true,
  canSellBelowBuyingPrice: false,
  enableExpiryAlerts: true,
  homepageSummaryCards: { ...DEFAULT_HOMEPAGE_SUMMARY_CARDS },
  enableInactivityLock: false,
  inactivityTimeoutMinutes: 5,
  alertOnSaleEditDelete: true,
  alertOnAnySale: false,
  enable9PmDailySummary: true,
};

export function getShopProtectionSettingsStorageKey(storeId?: string): string {
  const cleanStore = (storeId || 'default').trim() || 'default';
  return `rofani_shop_controls_${cleanStore}`;
}

export function normalizeShopProtectionSettings(raw: any): ShopProtectionSettingsState {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_SHOP_PROTECTION_SETTINGS,
      homepageSummaryCards: { ...DEFAULT_HOMEPAGE_SUMMARY_CARDS },
    };
  }

  const rawCards = raw.homepageSummaryCards && typeof raw.homepageSummaryCards === 'object'
    ? raw.homepageSummaryCards
    : {};

  const allowedMinutes: InactivityTimeoutMinutes[] = [2, 5, 10, 15, 30];
  const parsedTimeout = Number(raw.inactivityTimeoutMinutes);
  const timeoutMinutes: InactivityTimeoutMinutes = allowedMinutes.includes(
    parsedTimeout as InactivityTimeoutMinutes
  )
    ? (parsedTimeout as InactivityTimeoutMinutes)
    : DEFAULT_SHOP_PROTECTION_SETTINGS.inactivityTimeoutMinutes;

  return {
    enableCacheOnCart:
      typeof raw.enableCacheOnCart === 'boolean'
        ? raw.enableCacheOnCart
        : DEFAULT_SHOP_PROTECTION_SETTINGS.enableCacheOnCart,
    canSellBelowBuyingPrice:
      typeof raw.canSellBelowBuyingPrice === 'boolean'
        ? raw.canSellBelowBuyingPrice
        : DEFAULT_SHOP_PROTECTION_SETTINGS.canSellBelowBuyingPrice,
    enableExpiryAlerts:
      typeof raw.enableExpiryAlerts === 'boolean'
        ? raw.enableExpiryAlerts
        : DEFAULT_SHOP_PROTECTION_SETTINGS.enableExpiryAlerts,
    homepageSummaryCards: {
      cashInHand:
        typeof rawCards.cashInHand === 'boolean'
          ? rawCards.cashInHand
          : DEFAULT_HOMEPAGE_SUMMARY_CARDS.cashInHand,
      toReceiveCredit:
        typeof rawCards.toReceiveCredit === 'boolean'
          ? rawCards.toReceiveCredit
          : DEFAULT_HOMEPAGE_SUMMARY_CARDS.toReceiveCredit,
      todaysSales:
        typeof rawCards.todaysSales === 'boolean'
          ? rawCards.todaysSales
          : DEFAULT_HOMEPAGE_SUMMARY_CARDS.todaysSales,
      todaysStockIn:
        typeof rawCards.todaysStockIn === 'boolean'
          ? rawCards.todaysStockIn
          : DEFAULT_HOMEPAGE_SUMMARY_CARDS.todaysStockIn,
      todaysProfit:
        typeof rawCards.todaysProfit === 'boolean'
          ? rawCards.todaysProfit
          : DEFAULT_HOMEPAGE_SUMMARY_CARDS.todaysProfit,
      expenses:
        typeof rawCards.expenses === 'boolean'
          ? rawCards.expenses
          : DEFAULT_HOMEPAGE_SUMMARY_CARDS.expenses,
      orders:
        typeof rawCards.orders === 'boolean'
          ? rawCards.orders
          : DEFAULT_HOMEPAGE_SUMMARY_CARDS.orders,
    },
    enableInactivityLock:
      typeof raw.enableInactivityLock === 'boolean'
        ? raw.enableInactivityLock
        : DEFAULT_SHOP_PROTECTION_SETTINGS.enableInactivityLock,
    inactivityTimeoutMinutes: timeoutMinutes,
    alertOnSaleEditDelete:
      typeof raw.alertOnSaleEditDelete === 'boolean'
        ? raw.alertOnSaleEditDelete
        : DEFAULT_SHOP_PROTECTION_SETTINGS.alertOnSaleEditDelete,
    alertOnAnySale:
      typeof raw.alertOnAnySale === 'boolean'
        ? raw.alertOnAnySale
        : DEFAULT_SHOP_PROTECTION_SETTINGS.alertOnAnySale,
    enable9PmDailySummary:
      typeof raw.enable9PmDailySummary === 'boolean'
        ? raw.enable9PmDailySummary
        : DEFAULT_SHOP_PROTECTION_SETTINGS.enable9PmDailySummary,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
}

export function loadShopProtectionSettings(storeId?: string): ShopProtectionSettingsState {
  const key = getShopProtectionSettingsStorageKey(storeId);
  const stored = safeGetJSON<any>(key, null);
  if (stored && typeof stored === 'object') {
    return normalizeShopProtectionSettings(stored);
  }
  const fallback = safeGetJSON<any>('rofani_shop_controls_default', null);
  return normalizeShopProtectionSettings(fallback);
}

export function saveShopProtectionSettingsLocal(
  settings: ShopProtectionSettingsState,
  storeId?: string
): ShopProtectionSettingsState {
  const normalized = normalizeShopProtectionSettings({
    ...settings,
    updatedAt: new Date().toISOString(),
  });
  const key = getShopProtectionSettingsStorageKey(storeId);
  safeSetJSON(key, normalized);
  safeSetJSON('rofani_shop_controls_default', normalized);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(SHOP_PROTECTION_SETTINGS_EVENT, {
        detail: { storeId: storeId || 'default', settings: normalized },
      })
    );
  }
  return normalized;
}

export function useShopProtectionSettings(
  storeId?: string
): [ShopProtectionSettingsState, (next: ShopProtectionSettingsState) => void] {
  const [settings, setSettings] = useState<ShopProtectionSettingsState>(() =>
    loadShopProtectionSettings(storeId)
  );

  useEffect(() => {
    setSettings(loadShopProtectionSettings(storeId));
  }, [storeId]);

  useEffect(() => {
    const syncHandler = (ev: Event) => {
      const custom = ev as CustomEvent<{
        storeId?: string;
        settings?: ShopProtectionSettingsState;
      }>;
      if (custom?.detail?.settings) {
        if (!storeId || !custom.detail.storeId || custom.detail.storeId === storeId) {
          setSettings(normalizeShopProtectionSettings(custom.detail.settings));
          return;
        }
      }
      setSettings(loadShopProtectionSettings(storeId));
    };

    window.addEventListener(SHOP_PROTECTION_SETTINGS_EVENT, syncHandler);
    window.addEventListener('storage', syncHandler);
    return () => {
      window.removeEventListener(SHOP_PROTECTION_SETTINGS_EVENT, syncHandler);
      window.removeEventListener('storage', syncHandler);
    };
  }, [storeId]);

  const updateSettings = (next: ShopProtectionSettingsState) => {
    const saved = saveShopProtectionSettingsLocal(next, storeId);
    setSettings(saved);
  };

  return [settings, updateSettings];
}

export type ProductExpiryStatus = 'none' | 'expired' | 'expiring_soon' | 'ok';

export interface ProductExpiryInfo {
  status: ProductExpiryStatus;
  daysRemaining: number | null;
  formattedDate: string;
}

export function evaluateProductExpiry(
  expiryDate?: string,
  alertDaysThreshold: number = 30
): ProductExpiryInfo {
  if (!expiryDate || typeof expiryDate !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(expiryDate.trim())) {
    return { status: 'none', daysRemaining: null, formattedDate: '' };
  }
  const cleanDate = expiryDate.trim().slice(0, 10);
  const [y, m, d] = cleanDate.split('-').map(Number);
  if (!y || !m || !d) {
    return { status: 'none', daysRemaining: null, formattedDate: '' };
  }
  const parsedThreshold = Number(alertDaysThreshold);
  const thresholdDays = Number.isFinite(parsedThreshold)
    ? Math.max(0, Math.min(365, Math.round(parsedThreshold)))
    : 30;

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const expiryMidnight = new Date(y, m - 1, d).getTime();
  const diffDays = Math.round((expiryMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

  const formattedDate = new Date(y, m - 1, d).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (diffDays < 0) {
    return { status: 'expired', daysRemaining: diffDays, formattedDate };
  }
  if (diffDays <= thresholdDays) {
    return { status: 'expiring_soon', daysRemaining: diffDays, formattedDate };
  }
  return { status: 'ok', daysRemaining: diffDays, formattedDate };
}
