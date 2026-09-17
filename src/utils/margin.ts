export interface ProfitMarginInfo {
  marginPercent: number;
  profitAmount: number;
  level: 'high' | 'medium' | 'low' | 'loss';
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  label: string;
}

/**
 * Calculates profit margin percentage and returns color-coded styling properties.
 * High Margin: >= 30% (Emerald)
 * Medium Margin: 15% - 29.9% (Sky Blue)
 * Low Margin: 0.1% - 14.9% (Amber / Yellow)
 * Loss / Zero: <= 0% (Rose / Red)
 */
export function calculateProfitMargin(costPrice: number, sellingPrice: number): ProfitMarginInfo {
  const profitAmount = sellingPrice - costPrice;
  const marginPercent = sellingPrice > 0 ? (profitAmount / sellingPrice) * 100 : 0;

  if (marginPercent >= 30) {
    return {
      marginPercent,
      profitAmount,
      level: 'high',
      badgeBg: 'bg-emerald-950/80',
      badgeText: 'text-emerald-400',
      badgeBorder: 'border-emerald-800',
      label: 'High Margin'
    };
  } else if (marginPercent >= 15) {
    return {
      marginPercent,
      profitAmount,
      level: 'medium',
      badgeBg: 'bg-sky-950/80',
      badgeText: 'text-sky-400',
      badgeBorder: 'border-sky-800',
      label: 'Medium Margin'
    };
  } else if (marginPercent > 0) {
    return {
      marginPercent,
      profitAmount,
      level: 'low',
      badgeBg: 'bg-amber-950/80',
      badgeText: 'text-amber-400',
      badgeBorder: 'border-amber-800',
      label: 'Low Margin'
    };
  } else {
    return {
      marginPercent,
      profitAmount,
      level: 'loss',
      badgeBg: 'bg-rose-950/80',
      badgeText: 'text-rose-400',
      badgeBorder: 'border-rose-800',
      label: 'Loss / Zero'
    };
  }
}
