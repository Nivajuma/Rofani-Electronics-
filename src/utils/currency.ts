import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { safeGetJSON, safeSetJSON } from './safeStorage';

export type StoreCurrencyCode =
  | 'KES'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'UGX'
  | 'TZS'
  | 'RWF'
  | 'ETB'
  | 'NGN'
  | 'ZAR'
  | 'AED'
  | 'CNY'
  | 'INR';

export interface StoreCurrencyOption {
  code: StoreCurrencyCode;
  symbol: string;
  name: string;
  defaultDecimals: number;
  defaultRatePerUSD: number;
}

export const STORE_CURRENCIES: StoreCurrencyOption[] = [
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', defaultDecimals: 0, defaultRatePerUSD: 129.5 },
  { code: 'USD', symbol: '$', name: 'US Dollar', defaultDecimals: 2, defaultRatePerUSD: 1.0 },
  { code: 'EUR', symbol: '€', name: 'Euro', defaultDecimals: 2, defaultRatePerUSD: 0.92 },
  { code: 'GBP', symbol: '£', name: 'British Pound', defaultDecimals: 2, defaultRatePerUSD: 0.78 },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', defaultDecimals: 0, defaultRatePerUSD: 3680 },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', defaultDecimals: 0, defaultRatePerUSD: 2650 },
  { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc', defaultDecimals: 0, defaultRatePerUSD: 1380 },
  { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', defaultDecimals: 2, defaultRatePerUSD: 126.5 },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', defaultDecimals: 2, defaultRatePerUSD: 1620 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', defaultDecimals: 2, defaultRatePerUSD: 18.1 },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', defaultDecimals: 2, defaultRatePerUSD: 3.67 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', defaultDecimals: 2, defaultRatePerUSD: 7.24 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', defaultDecimals: 2, defaultRatePerUSD: 84.5 },
];

export const DEFAULT_STORE_CURRENCY: StoreCurrencyCode = 'KES';
export const STORE_CURRENCY_EVENT = 'rofani:store-currency-updated';
const ACTIVE_CURRENCY_GLOBAL_KEY = 'rofani_active_store_currency';

export function normalizeCurrencyCode(raw: unknown): StoreCurrencyCode {
  if (typeof raw !== 'string') return DEFAULT_STORE_CURRENCY;
  const val = raw.trim().toUpperCase();
  if (!val) return DEFAULT_STORE_CURRENCY;

  // Match exact ISO codes or formatted labels like "KES (KSh)", "USD ($)"
  for (const item of STORE_CURRENCIES) {
    if (
      val === item.code ||
      val === item.symbol.toUpperCase() ||
      val.startsWith(`${item.code} `) ||
      val.startsWith(`${item.code}(`) ||
      val.includes(`(${item.code})`)
    ) {
      return item.code;
    }
  }

  // Common symbol / shorthand aliases
  if (val === 'KSH' || val === 'SH' || val === 'KENYAN SHILLING') return 'KES';
  if (val === '$' || val === 'US DOLLAR') return 'USD';
  if (val === '€' || val === 'EURO') return 'EUR';
  if (val === '£' || val === 'BRITISH POUND') return 'GBP';
  if (val === 'USH' || val === 'UGANDAN SHILLING') return 'UGX';
  if (val === 'TSH' || val === 'TANZANIAN SHILLING') return 'TZS';
  if (val === 'FRW' || val === 'RWF' || val === 'RWANDAN FRANC') return 'RWF';
  if (val === 'BR' || val === 'ETHIOPIAN BIRR') return 'ETB';
  if (val === '₦' || val === 'NIGERIAN NAIRA') return 'NGN';
  if (val === 'R' || val === 'SOUTH AFRICAN RAND') return 'ZAR';
  if (val === 'DH' || val === 'DHS' || val === 'UAE DIRHAM') return 'AED';
  if (val === '¥' || val === 'RMB' || val === 'CHINESE YUAN') return 'CNY';
  if (val === '₹' || val === 'RS' || val === 'INDIAN RUPEE') return 'INR';

  return DEFAULT_STORE_CURRENCY;
}

export function getCurrencyConfig(code?: unknown): StoreCurrencyOption {
  const normalized = normalizeCurrencyCode(code);
  return STORE_CURRENCIES.find((c) => c.code === normalized) || STORE_CURRENCIES[0];
}

export function getStoreCurrencyStorageKey(storeId?: string): string {
  const cleanStore = (storeId || 'default').trim() || 'default';
  return `rofani_store_currency_${cleanStore}`;
}

let activeStoreCurrencyCode: StoreCurrencyCode = (() => {
  if (typeof window === 'undefined') return DEFAULT_STORE_CURRENCY;
  const globalSaved = safeGetJSON<string>(ACTIVE_CURRENCY_GLOBAL_KEY, '');
  if (globalSaved) return normalizeCurrencyCode(globalSaved);
  const legacySaved = safeGetJSON<string>('rofani_settings_currency', '');
  if (legacySaved) return normalizeCurrencyCode(legacySaved);
  return DEFAULT_STORE_CURRENCY;
})();

export function getActiveStoreCurrency(): StoreCurrencyCode {
  return activeStoreCurrencyCode;
}

export function getActiveCurrencySymbol(codeOverride?: unknown): string {
  return getCurrencyConfig(codeOverride || activeStoreCurrencyCode).symbol;
}

export function loadStoreCurrencyLocal(storeId?: string): StoreCurrencyCode {
  const key = getStoreCurrencyStorageKey(storeId);
  const stored = safeGetJSON<string>(key, '');
  if (stored) {
    const norm = normalizeCurrencyCode(stored);
    activeStoreCurrencyCode = norm;
    return norm;
  }
  const legacy = safeGetJSON<string>('rofani_settings_currency', '');
  if (legacy) {
    const norm = normalizeCurrencyCode(legacy);
    activeStoreCurrencyCode = norm;
    return norm;
  }
  return DEFAULT_STORE_CURRENCY;
}

export function saveStoreCurrencyLocal(
  currency: StoreCurrencyCode | string,
  storeId?: string
): StoreCurrencyCode {
  const normalized = normalizeCurrencyCode(currency);
  const cfg = getCurrencyConfig(normalized);
  const key = getStoreCurrencyStorageKey(storeId);
  activeStoreCurrencyCode = normalized;
  safeSetJSON(key, normalized);
  safeSetJSON(ACTIVE_CURRENCY_GLOBAL_KEY, normalized);
  safeSetJSON('rofani_settings_currency', `${cfg.code} (${cfg.symbol})`);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(STORE_CURRENCY_EVENT, {
        detail: { storeId: storeId || 'default', currency: normalized },
      })
    );
  }
  return normalized;
}

export interface FormatCurrencyOptions {
  /**
   * Optional explicit currency code override (e.g. 'KES' or 'USD').
   * Defaults to the active store's configured currency.
   */
  currency?: StoreCurrencyCode | string;
  /**
   * If true, always formats with 2 decimal places.
   * If false, forces 0 decimal places.
   * If omitted, uses the currency's natural decimal style (e.g. 0 decimals for whole KES, 2 decimals for USD).
   */
  showDecimals?: boolean;
  /**
   * Minimum fraction digits (overrides showDecimals if provided).
   */
  minimumFractionDigits?: number;
  /**
   * Maximum fraction digits (defaults cleanly based on decimals/value).
   */
  maximumFractionDigits?: number;
  /**
   * Compact notation for large dashboard numbers (e.g. KSh 1.2M, $ 45.5k).
   */
  compact?: boolean;
  /**
   * Prefix override (defaults to active currency symbol, e.g. 'KSh', '$', '€').
   */
  prefix?: string;
}

/**
 * Safely parses any numeric or string monetary input without ever producing NaN.
 */
export function safeMoneyNumber(amount: number | string | undefined | null): number {
  if (amount === undefined || amount === null || amount === '') return 0;
  if (typeof amount === 'number') {
    return Number.isFinite(amount) ? amount : 0;
  }
  const cleaned = String(amount).replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Global Multi-Currency Money Formatter across Rofani POS.
 * Reads the active store currency by default (KES => "KSh 1,500", USD => "$ 15.00"),
 * handles null/undefined/NaN safely, and formats with thousand separators.
 */
export const formatMoney = (
  amount: number | string | undefined | null,
  options?: FormatCurrencyOptions
): string => {
  const cfg = getCurrencyConfig(options?.currency || activeStoreCurrencyCode);
  const symbol = options?.prefix ?? cfg.symbol;
  const numeric = safeMoneyNumber(amount);
  const abs = Math.abs(numeric);
  const sign = numeric < 0 ? '-' : '';

  if (options?.compact) {
    if (abs >= 1_000_000) {
      return `${sign}${symbol} ${(abs / 1_000_000).toFixed(1)}M`;
    }
    if (abs >= 1_000) {
      return `${sign}${symbol} ${(abs / 1_000).toFixed(1)}k`;
    }
  }

  let minDecimals: number;
  let maxDecimals: number;

  if (options?.minimumFractionDigits !== undefined) {
    minDecimals = Math.max(0, Math.min(4, options.minimumFractionDigits));
    maxDecimals =
      options?.maximumFractionDigits !== undefined
        ? Math.max(minDecimals, Math.min(4, options.maximumFractionDigits))
        : Math.max(minDecimals, 2);
  } else if (options?.showDecimals === true) {
    minDecimals = 2;
    maxDecimals =
      options?.maximumFractionDigits !== undefined
        ? Math.max(2, options.maximumFractionDigits)
        : 2;
  } else if (options?.showDecimals === false) {
    minDecimals = 0;
    maxDecimals =
      options?.maximumFractionDigits !== undefined ? options.maximumFractionDigits : 0;
  } else if (cfg.defaultDecimals > 0) {
    minDecimals = cfg.defaultDecimals;
    maxDecimals =
      options?.maximumFractionDigits !== undefined
        ? Math.max(minDecimals, options.maximumFractionDigits)
        : cfg.defaultDecimals;
  } else {
    // East African whole-unit currencies (KES, UGX, TZS, RWF): "KSh 1,500", or 2 decimals if fractional
    const hasFraction = Math.abs(abs - Math.round(abs)) >= 0.005;
    minDecimals = hasFraction ? 2 : 0;
    maxDecimals =
      options?.maximumFractionDigits !== undefined
        ? options.maximumFractionDigits
        : hasFraction
          ? 2
          : 0;
  }

  const formattedNum = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(abs);

  return `${sign}${symbol} ${formattedNum}`;
};

/**
 * Legacy helper alias — delegates to the store's active currency via formatMoney
 * so existing catalog/POS/inventory components automatically reflect Store Currency.
 */
export const formatKSh = (
  amount: number | string | undefined | null,
  options?: FormatCurrencyOptions
): string => formatMoney(amount, options);

/**
 * Strict Kenyan Shilling formatter reserved for Master Subscription Billing (TILL 1833804)
 * and Safaricom M-Pesa billing workflows. Never changes with store display currency.
 */
export const formatKesBilling = (
  amount: number | string | undefined | null,
  options?: Omit<FormatCurrencyOptions, 'currency'>
): string => formatMoney(amount, { ...options, currency: 'KES' });

/**
 * Formal ISO Kenyan Shilling formatter (e.g. "KES 1,500.00") — strictly KES.
 */
export const formatKES = (
  amount: number | string | undefined | null,
  showDecimals: boolean = true
): string => {
  const numeric = safeMoneyNumber(amount);
  const minDecimals = showDecimals ? 2 : 0;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: 2,
  }).format(numeric);
};

/**
 * Parses any currency string or user input (e.g. "KSh 1,500", "$ 15.50", "KES 20,000")
 * into a pure float number.
 */
export const parseMoney = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return !Number.isFinite(parsed) ? 0 : Number(parsed.toFixed(2));
};

export const parseKSh = parseMoney;

/**
 * Cleans integer inputs (e.g. quantity, stock counts, order quantities)
 * by stripping unwanted leading zeros (e.g. "056" -> 56, "07" -> 7).
 */
export const cleanIntegerInput = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  const parsed = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
};

/**
 * Cleans decimal and monetary inputs by parsing floats safely and rounding to 2 decimal places.
 */
export const cleanDecimalInput = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? 0 : Number(parsed.toFixed(2));
};

// ---------------- REACT CONTEXT & HOOK ----------------

export interface CurrencyContextValue {
  currency: StoreCurrencyCode;
  currencyConfig: StoreCurrencyOption;
  symbol: string;
  setCurrency: (next: StoreCurrencyCode) => void;
  formatMoney: (
    amount: number | string | undefined | null,
    options?: FormatCurrencyOptions
  ) => string;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: DEFAULT_STORE_CURRENCY,
  currencyConfig: STORE_CURRENCIES[0],
  symbol: STORE_CURRENCIES[0].symbol,
  setCurrency: () => {},
  formatMoney: (amount, options) =>
    formatMoney(amount, { ...options, currency: options?.currency || DEFAULT_STORE_CURRENCY }),
});

interface CurrencyProviderProps {
  currency?: StoreCurrencyCode;
  storeId?: string;
  onPersistCurrency?: (nextCurrency: StoreCurrencyCode) => void;
  children: React.ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({
  currency: controlledCurrency,
  storeId,
  onPersistCurrency,
  children,
}) => {
  const [internalCurrency, setInternalCurrency] = useState<StoreCurrencyCode>(() =>
    controlledCurrency ? normalizeCurrencyCode(controlledCurrency) : loadStoreCurrencyLocal(storeId)
  );

  useEffect(() => {
    if (controlledCurrency) {
      const norm = normalizeCurrencyCode(controlledCurrency);
      setInternalCurrency(norm);
      activeStoreCurrencyCode = norm;
      safeSetJSON(ACTIVE_CURRENCY_GLOBAL_KEY, norm);
    } else {
      setInternalCurrency(loadStoreCurrencyLocal(storeId));
    }
  }, [controlledCurrency, storeId]);

  const currency = controlledCurrency
    ? normalizeCurrencyCode(controlledCurrency)
    : internalCurrency;

  useEffect(() => {
    activeStoreCurrencyCode = currency;
    safeSetJSON(ACTIVE_CURRENCY_GLOBAL_KEY, currency);
  }, [currency]);

  useEffect(() => {
    const onCurrencyEvent = (ev: Event) => {
      const custom = ev as CustomEvent<{ storeId?: string; currency?: StoreCurrencyCode }>;
      if (custom?.detail?.currency) {
        if (!storeId || !custom.detail.storeId || custom.detail.storeId === storeId) {
          const norm = normalizeCurrencyCode(custom.detail.currency);
          setInternalCurrency(norm);
          activeStoreCurrencyCode = norm;
          return;
        }
      }
      setInternalCurrency(loadStoreCurrencyLocal(storeId));
    };
    window.addEventListener(STORE_CURRENCY_EVENT, onCurrencyEvent);
    return () => window.removeEventListener(STORE_CURRENCY_EVENT, onCurrencyEvent);
  }, [storeId]);

  const setCurrency = useCallback(
    (next: StoreCurrencyCode) => {
      const normalized = saveStoreCurrencyLocal(next, storeId);
      setInternalCurrency(normalized);
      onPersistCurrency?.(normalized);
    },
    [storeId, onPersistCurrency]
  );

  const currencyConfig = getCurrencyConfig(currency);
  const boundFormatMoney = useCallback(
    (amount: number | string | undefined | null, options?: FormatCurrencyOptions) =>
      formatMoney(amount, { ...options, currency: options?.currency || currency }),
    [currency]
  );

  return React.createElement(
    CurrencyContext.Provider,
    {
      value: {
        currency,
        currencyConfig,
        symbol: currencyConfig.symbol,
        setCurrency,
        formatMoney: boundFormatMoney,
      },
    },
    children
  );
};

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}
