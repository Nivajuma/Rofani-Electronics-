import { Product, Transaction } from '../types';

export type PerformanceTier =
  | 'high_sales_high_profit' // Highly sold item with higher profit (Emerald/Gold)
  | 'high_sales_low_profit'  // Highly sold item with lower profit (Sky Blue/Cyan)
  | 'low_sales_high_profit'  // Lower sold item with high profit (Purple/Indigo)
  | 'low_sales_low_profit'   // Lower sold item with low profit / slow mover (Amber/Orange)
  | 'unranked_no_sales';     // New item / 0 sales recorded yet (Slate/Gray)

export interface ProductPerformanceInfo {
  productId: string;
  unitsSold: number;
  totalRevenue: number;
  totalProfit: number;
  profitPerUnit: number;
  marginPercent: number;
  tier: PerformanceTier;
  tierLabel: string;
  tierShortLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  cardBorder: string;
  cardGlow: string;
  accentBorderLeft: string;
  tableRowHighlight: string;
  accentColor: string;
  iconType: 'star' | 'zap' | 'gem' | 'alert' | 'package';
  description: string;
}

export interface PerformanceSummaryMetrics {
  highSalesHighProfitCount: number;
  highSalesHighProfitUnits: number;
  highSalesHighProfitProfit: number;
  highSalesLowProfitCount: number;
  lowSalesHighProfitCount: number;
  lowSalesLowProfitCount: number;
  noSalesCount: number;
  unrankedCount: number;
  totalProducts: number;
  totalUnitsSold: number;
  totalStoreProfit: number;
}

/**
 * Computes product sales velocity and profit performance across all store transactions.
 */
export function computeProductsPerformance(
  products: Product[],
  transactions: Transaction[] = []
): Record<string, ProductPerformanceInfo> {
  // 1. Aggregate units sold, revenue, and gross profit by product ID
  const salesMap = new Map<string, { unitsSold: number; totalRevenue: number; totalProfit: number }>();

  transactions.forEach((tx) => {
    (tx.items || []).forEach((item) => {
      const pId = item.product?.id;
      if (!pId) return;

      const qty = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || Number(item.product?.sellingPrice) || 0;
      const unitCost = Number(item.product?.costPrice) || 0;
      const totalRev = Number(item.total) || qty * unitPrice;
      const totalProf = (unitPrice - unitCost) * qty;

      const current = salesMap.get(pId) || { unitsSold: 0, totalRevenue: 0, totalProfit: 0 };
      salesMap.set(pId, {
        unitsSold: current.unitsSold + qty,
        totalRevenue: current.totalRevenue + totalRev,
        totalProfit: current.totalProfit + totalProf,
      });
    });
  });

  // 2. Establish sales volume benchmarks across current catalog
  const unitsList = products.map((p) => salesMap.get(p.id)?.unitsSold || 0);
  const maxSold = Math.max(...unitsList, 0);
  const totalUnits = unitsList.reduce((a, b) => a + b, 0);
  const avgSold = unitsList.length > 0 ? totalUnits / unitsList.length : 0;

  // Items with >= 3 units sold or >= average sold are classified as High Sales Volume
  const highSalesThreshold = Math.max(3, Math.ceil(avgSold));

  const result: Record<string, ProductPerformanceInfo> = {};

  products.forEach((p) => {
    const sales = salesMap.get(p.id) || { unitsSold: 0, totalRevenue: 0, totalProfit: 0 };
    const costPrice = Number(p.costPrice) || 0;
    const sellingPrice = Number(p.sellingPrice) || 0;
    const profitPerUnit = sellingPrice - costPrice;
    const marginPercent = sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0;

    // High profit criteria: margin >= 30% OR profit per unit >= KSh 1,000
    const isHighProfit = marginPercent >= 30 || profitPerUnit >= 1000;
    const isHighSales = sales.unitsSold >= highSalesThreshold;

    let tier: PerformanceTier = 'unranked_no_sales';

    if (sales.unitsSold === 0) {
      tier = 'unranked_no_sales';
    } else if (isHighSales) {
      tier = isHighProfit ? 'high_sales_high_profit' : 'high_sales_low_profit';
    } else {
      // Lower sold items (1 or 2 units sold, or below average)
      tier = isHighProfit ? 'low_sales_high_profit' : 'low_sales_low_profit';
    }

    // Styling configuration based on tier
    switch (tier) {
      case 'high_sales_high_profit':
        result[p.id] = {
          productId: p.id,
          unitsSold: sales.unitsSold,
          totalRevenue: sales.totalRevenue,
          totalProfit: sales.totalProfit,
          profitPerUnit,
          marginPercent,
          tier,
          tierLabel: 'High Sales • High Profit',
          tierShortLabel: '⭐ High Sales & High Profit',
          badgeBg: 'bg-emerald-950/90',
          badgeText: 'text-emerald-300',
          badgeBorder: 'border-emerald-500',
          cardBorder: 'border-emerald-500/70 hover:border-emerald-400 bg-emerald-950/15',
          cardGlow: 'shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30',
          accentBorderLeft: 'border-l-4 border-l-emerald-500',
          tableRowHighlight: 'bg-emerald-950/20 hover:bg-emerald-950/30',
          accentColor: '#10b981',
          iconType: 'star',
          description: 'Crown Jewel / Star: High sales volume combined with strong profit margins.',
        };
        break;

      case 'high_sales_low_profit':
        result[p.id] = {
          productId: p.id,
          unitsSold: sales.unitsSold,
          totalRevenue: sales.totalRevenue,
          totalProfit: sales.totalProfit,
          profitPerUnit,
          marginPercent,
          tier,
          tierLabel: 'High Sales • Lower Margin',
          tierShortLabel: '⚡ High Sales (Volume Driver)',
          badgeBg: 'bg-sky-950/90',
          badgeText: 'text-sky-300',
          badgeBorder: 'border-sky-500',
          cardBorder: 'border-sky-500/60 hover:border-sky-400 bg-sky-950/15',
          cardGlow: 'shadow-lg shadow-sky-950/40 ring-1 ring-sky-500/30',
          accentBorderLeft: 'border-l-4 border-l-sky-500',
          tableRowHighlight: 'bg-sky-950/20 hover:bg-sky-950/30',
          accentColor: '#0284c7',
          iconType: 'zap',
          description: 'Volume Driver: Sells rapidly, but unit margins are leaner.',
        };
        break;

      case 'low_sales_high_profit':
        result[p.id] = {
          productId: p.id,
          unitsSold: sales.unitsSold,
          totalRevenue: sales.totalRevenue,
          totalProfit: sales.totalProfit,
          profitPerUnit,
          marginPercent,
          tier,
          tierLabel: 'Lower Sales • High Profit',
          tierShortLabel: '💎 High Profit (Low Volume)',
          badgeBg: 'bg-purple-950/90',
          badgeText: 'text-purple-300',
          badgeBorder: 'border-purple-500',
          cardBorder: 'border-purple-500/60 hover:border-purple-400 bg-purple-950/15',
          cardGlow: 'shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/30',
          accentBorderLeft: 'border-l-4 border-l-purple-500',
          tableRowHighlight: 'bg-purple-950/20 hover:bg-purple-950/30',
          accentColor: '#a855f7',
          iconType: 'gem',
          description: 'High Margin Potential: Premium profit per item, but sells in lower quantities.',
        };
        break;

      case 'low_sales_low_profit':
        result[p.id] = {
          productId: p.id,
          unitsSold: sales.unitsSold,
          totalRevenue: sales.totalRevenue,
          totalProfit: sales.totalProfit,
          profitPerUnit,
          marginPercent,
          tier,
          tierLabel: 'Lower Sold • Slow Mover',
          tierShortLabel: '⚠️ Lower Sold (Slow Mover)',
          badgeBg: 'bg-amber-950/90',
          badgeText: 'text-amber-300',
          badgeBorder: 'border-amber-500',
          cardBorder: 'border-amber-500/60 hover:border-amber-400 bg-amber-950/15',
          cardGlow: 'shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/30',
          accentBorderLeft: 'border-l-4 border-l-amber-500',
          tableRowHighlight: 'bg-amber-950/20 hover:bg-amber-950/30',
          accentColor: '#f59e0b',
          iconType: 'alert',
          description: 'Slow Mover: Low sales velocity and modest margin. Candidate for promotional clearance.',
        };
        break;

      case 'unranked_no_sales':
      default:
        result[p.id] = {
          productId: p.id,
          unitsSold: 0,
          totalRevenue: 0,
          totalProfit: 0,
          profitPerUnit,
          marginPercent,
          tier: 'unranked_no_sales',
          tierLabel: 'No Sales Recorded',
          tierShortLabel: '📦 No Sales Yet',
          badgeBg: 'bg-slate-800/80',
          badgeText: 'text-slate-400',
          badgeBorder: 'border-slate-700',
          cardBorder: 'border-slate-800 hover:border-slate-700',
          cardGlow: '',
          accentBorderLeft: 'border-l-2 border-l-slate-700',
          tableRowHighlight: 'hover:bg-slate-800/40',
          accentColor: '#64748b',
          iconType: 'package',
          description: 'Newly stocked or zero recorded sales transactions yet.',
        };
        break;
    }
  });

  return result;
}

/**
 * Calculates high-level matrix counts for store summary cards.
 */
export function computePerformanceSummary(
  performanceMap: Record<string, ProductPerformanceInfo>
): PerformanceSummaryMetrics {
  const values = Object.values(performanceMap);

  let highSalesHighProfitCount = 0;
  let highSalesHighProfitUnits = 0;
  let highSalesHighProfitProfit = 0;
  let highSalesLowProfitCount = 0;
  let lowSalesHighProfitCount = 0;
  let lowSalesLowProfitCount = 0;
  let noSalesCount = 0;
  let totalUnitsSold = 0;
  let totalStoreProfit = 0;

  values.forEach((v) => {
    totalUnitsSold += v.unitsSold;
    totalStoreProfit += v.totalProfit;

    if (v.tier === 'high_sales_high_profit') {
      highSalesHighProfitCount++;
      highSalesHighProfitUnits += v.unitsSold;
      highSalesHighProfitProfit += v.totalProfit;
    } else if (v.tier === 'high_sales_low_profit') {
      highSalesLowProfitCount++;
    } else if (v.tier === 'low_sales_high_profit') {
      lowSalesHighProfitCount++;
    } else if (v.tier === 'low_sales_low_profit') {
      lowSalesLowProfitCount++;
    } else {
      noSalesCount++;
    }
  });

  return {
    highSalesHighProfitCount,
    highSalesHighProfitUnits,
    highSalesHighProfitProfit,
    highSalesLowProfitCount,
    lowSalesHighProfitCount,
    lowSalesLowProfitCount,
    noSalesCount,
    unrankedCount: noSalesCount,
    totalProducts: values.length,
    totalUnitsSold,
    totalStoreProfit,
  };
}
