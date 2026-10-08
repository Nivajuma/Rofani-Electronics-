/**
 * Standard Kenyan Shilling (KES / KSh) currency formatting utility for ROFANI Retail POS.
 * Ensures consistent presentation across point-of-sale, inventory, customer CRM,
 * debts, loans, commissions, discounts, receipts, and PDF reports.
 */

export interface FormatCurrencyOptions {
  /**
   * If true, always formats with 2 decimal places (e.g. KSh 1,500.00).
   * If false or omitted, defaults to 0 decimal places (e.g. KSh 1,500) per standard Kenyan retail practice.
   */
  showDecimals?: boolean;
  /**
   * Minimum fraction digits (overrides showDecimals if provided).
   */
  minimumFractionDigits?: number;
  /**
   * Maximum fraction digits (defaults to minimumFractionDigits or 2).
   */
  maximumFractionDigits?: number;
  /**
   * Compact notation for large dashboard numbers (e.g. KSh 1.2M, KSh 45.5k).
   */
  compact?: boolean;
  /**
   * Prefix override (defaults to 'KSh').
   */
  prefix?: string;
}

/**
 * Standard format function for Kenyan Shillings.
 * Formats a numeric or string monetary value into 'KSh X,XXX' or 'KSh X,XXX.XX'.
 *
 * Example:
 *  formatKSh(1500) => "KSh 1,500"
 *  formatKSh(1500, { showDecimals: true }) => "KSh 1,500.00"
 *  formatKSh(2500000, { compact: true }) => "KSh 2.5M"
 */
export const formatKSh = (
  amount: number | string | undefined | null,
  options?: FormatCurrencyOptions
): string => {
  if (amount === undefined || amount === null || amount === '') {
    return 'KSh 0';
  }

  const numeric = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(numeric)) {
    return 'KSh 0';
  }

  // Handle compact notation for space-constrained UI
  if (options?.compact) {
    const abs = Math.abs(numeric);
    const sign = numeric < 0 ? '-' : '';
    if (abs >= 1_000_000) {
      return `${sign}KSh ${(abs / 1_000_000).toFixed(1)}M`;
    }
    if (abs >= 1_000) {
      return `${sign}KSh ${(abs / 1_000).toFixed(1)}k`;
    }
  }

  const minDecimals = options?.minimumFractionDigits !== undefined
    ? options.minimumFractionDigits
    : options?.showDecimals ? 2 : 0;

  const maxDecimals = options?.maximumFractionDigits !== undefined
    ? options.maximumFractionDigits
    : options?.showDecimals ? 2 : 2;

  // Use Intl.NumberFormat with 'en-KE' and currency 'KES', replacing 'KES' with 'KSh'
  const formatted = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(numeric);

  return formatted.replace('KES', 'KSh');
};

/**
 * Formal ISO Kenyan Shilling formatter (e.g. "KES 1,500.00")
 */
export const formatKES = (
  amount: number | string | undefined | null,
  showDecimals: boolean = true
): string => {
  if (amount === undefined || amount === null || amount === '') {
    return showDecimals ? 'KES 0.00' : 'KES 0';
  }
  const numeric = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(numeric)) {
    return showDecimals ? 'KES 0.00' : 'KES 0';
  }
  const minDecimals = showDecimals ? 2 : 0;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: 2,
  }).format(numeric);
};

/**
 * Parses any currency string or user input (e.g. "KSh 1,500", "1500.50", "KES 20,000")
 * into a pure float number.
 */
export const parseKSh = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = val.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};
