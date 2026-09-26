import { Product, Transaction } from '../types';

export type ReplenishmentUrgency =
  | 'out_of_stock'
  | 'critical'
  | 'reorder_soon'
  | 'healthy'
  | 'overstocked'
  | 'stagnant';

export interface ReplenishmentItem {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  subcategory?: string;
  imageUrl?: string;
  unit: string;
  currentStock: number;
  minStockAlert: number;
  costPrice: number;
  sellingPrice: number;

  // Sales velocity
  totalUnitsSold: number;
  salesRevenue: number;
  dailyVelocity: number; // units sold / day
  weeklyVelocity: number; // units sold / 7 days
  daysRemaining: number; // days of stock runway left

  // Replenishment proposal
  urgency: ReplenishmentUrgency;
  urgencyLabel: string;
  recommendedOrderQty: number; // suggested units to order
  estimatedCost: number; // recommendedOrderQty * costPrice
  projectedRevenue: number; // recommendedOrderQty * sellingPrice
  projectedProfit: number; // projectedRevenue - estimatedCost
  marginPercent: number;
  supplierName?: string;
  rationale: string;
}

export interface ReplenishmentSummary {
  totalCatalogItems: number;
  outOfStockCount: number;
  criticalCount: number;
  reorderSoonCount: number;
  healthyCount: number;
  overstockedCount: number;
  stagnantCount: number;
  totalRecommendedUnits: number;
  totalWorkingCapitalNeeded: number;
  totalProjectedProfit: number;
  fastestDepletingItem?: ReplenishmentItem;
  highestCostRestockItem?: ReplenishmentItem;
  overallHealthScore: number; // 0 to 100
}

/**
 * Computes sales velocity and smart replenishment metrics for all store products.
 * @param products Current catalog list
 * @param transactions All sales transactions
 * @param targetDaysCover Target buffer days to cover (e.g. 14, 21, 30 days, default 21)
 * @param windowDays Lookback window for velocity calculation (default 30)
 */
export function calculateReplenishmentPlan(
  products: Product[],
  transactions: Transaction[] = [],
  targetDaysCover: number = 21,
  windowDays: number = 30
): { items: ReplenishmentItem[]; summary: ReplenishmentSummary } {
  const now = Date.now();
  const windowMillis = windowDays * 24 * 60 * 60 * 1000;
  const cutoffTime = now - windowMillis;

  // 1. Aggregate recent units sold and revenue per product
  const salesMap = new Map<string, { units: number; revenue: number }>();

  transactions.forEach((tx) => {
    const txTime = tx.date ? new Date(tx.date).getTime() : now;
    // Consider recent transactions or all if window has few
    const isWithinWindow = txTime >= cutoffTime || transactions.length < 50;

    if (isWithinWindow && Array.isArray(tx.items)) {
      tx.items.forEach((item) => {
        const pId = item.product?.id;
        if (!pId) return;

        const qty = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || Number(item.product?.sellingPrice) || 0;
        const total = Number(item.total) || qty * unitPrice;

        const current = salesMap.get(pId) || { units: 0, revenue: 0 };
        salesMap.set(pId, {
          units: current.units + qty,
          revenue: current.revenue + total,
        });
      });
    }
  });

  // Calculate actual active days in transaction dataset (min 7 days to avoid spikes)
  let activeDays = windowDays;
  if (transactions.length > 0) {
    const timestamps = transactions
      .map((t) => (t.date ? new Date(t.date).getTime() : 0))
      .filter((t) => t > 0);
    if (timestamps.length >= 2) {
      const minDate = Math.min(...timestamps);
      const spanDays = Math.ceil((now - minDate) / (24 * 60 * 60 * 1000));
      activeDays = Math.max(7, Math.min(windowDays, spanDays));
    }
  }

  // 2. Build replenishment item for each product
  const items: ReplenishmentItem[] = products.map((product) => {
    const currentStock = Number(product.stockQuantity ?? product.stock ?? 0);
    const minStock = Math.max(1, Number(product.minStockAlert ?? 5));
    const costPrice = Math.max(0, Number(product.costPrice ?? product.buyingPrice ?? 0));
    const sellingPrice = Math.max(0, Number(product.sellingPrice ?? 0));
    const profitPerUnit = sellingPrice - costPrice;
    const marginPercent = sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0;

    const sales = salesMap.get(product.id) || { units: 0, revenue: 0 };
    const totalUnitsSold = sales.units;
    const salesRevenue = sales.revenue;

    // Daily and weekly velocity
    const dailyVelocity = parseFloat((totalUnitsSold / activeDays).toFixed(2));
    const weeklyVelocity = parseFloat((dailyVelocity * 7).toFixed(1));

    // Days remaining of inventory
    let daysRemaining = 999;
    if (currentStock <= 0) {
      daysRemaining = 0;
    } else if (dailyVelocity > 0) {
      daysRemaining = Math.max(0, Math.floor(currentStock / dailyVelocity));
    }

    // Determine Urgency
    let urgency: ReplenishmentUrgency = 'healthy';
    let urgencyLabel = 'Healthy Stock';
    let rationale = '';

    if (currentStock <= 0) {
      urgency = 'out_of_stock';
      urgencyLabel = 'Out of Stock (Lost Sales)';
      rationale = `Zero inventory on hand. ${totalUnitsSold > 0 ? `Selling ~${weeklyVelocity} pcs/week.` : 'No stock available for sales.'}`;
    } else if (daysRemaining <= 4 || currentStock <= Math.max(1, Math.floor(minStock / 2))) {
      urgency = 'critical';
      urgencyLabel = 'Critical (< 4 Days Left)';
      rationale = `Stockout expected in ~${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Depleting at ~${dailyVelocity} pcs/day.`;
    } else if (daysRemaining <= 10 || currentStock <= minStock) {
      urgency = 'reorder_soon';
      urgencyLabel = 'Reorder Soon';
      rationale = `Approaching reorder threshold (${minStock} ${product.unit || 'pcs'}). ~${daysRemaining} days of stock remaining.`;
    } else if (totalUnitsSold === 0 && currentStock > minStock * 2) {
      urgency = 'stagnant';
      urgencyLabel = 'Slow / Stagnant Mover';
      rationale = `No sales recorded in lookback period with ${currentStock} units held. Avoid ordering more.`;
    } else if (daysRemaining > targetDaysCover * 2 && dailyVelocity > 0) {
      urgency = 'overstocked';
      urgencyLabel = 'Overstocked Runway';
      rationale = `Comfortable buffer (~${daysRemaining} days runway). Current stock will last well past target period.`;
    } else {
      urgency = 'healthy';
      urgencyLabel = 'Adequate Runway';
      rationale = `Current stock covers ~${daysRemaining} days. Inventory levels align with sales demand.`;
    }

    // Calculate Recommended Order Quantity
    let recommendedOrderQty = 0;
    if (urgency === 'out_of_stock') {
      const demandCover = Math.ceil(dailyVelocity * targetDaysCover);
      recommendedOrderQty = Math.max(minStock * 2, demandCover + minStock);
    } else if (urgency === 'critical' || urgency === 'reorder_soon') {
      const targetStockLevel = Math.ceil(dailyVelocity * targetDaysCover) + minStock;
      recommendedOrderQty = Math.max(0, targetStockLevel - currentStock);
      // Ensure at least minStock difference if velocity is low
      if (recommendedOrderQty === 0 && currentStock < minStock) {
        recommendedOrderQty = minStock - currentStock;
      }
    } else if (currentStock < minStock) {
      recommendedOrderQty = minStock - currentStock;
    }

    const estimatedCost = Math.round(recommendedOrderQty * costPrice);
    const projectedRevenue = Math.round(recommendedOrderQty * sellingPrice);
    const projectedProfit = Math.round(projectedRevenue - estimatedCost);

    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku || `SKU-${product.id.slice(-4)}`,
      category: product.category,
      subcategory: product.subcategory,
      imageUrl: product.imageUrl,
      unit: product.unit || 'pcs',
      currentStock,
      minStockAlert: minStock,
      costPrice,
      sellingPrice,
      totalUnitsSold,
      salesRevenue,
      dailyVelocity,
      weeklyVelocity,
      daysRemaining,
      urgency,
      urgencyLabel,
      recommendedOrderQty,
      estimatedCost,
      projectedRevenue,
      projectedProfit,
      marginPercent: Math.round(marginPercent),
      supplierName: product.supplierName || 'Primary Supplier',
      rationale,
    };
  });

  // Sort items: Out of stock first, then critical, then reorder_soon, then healthy, etc.
  const urgencyWeight: Record<ReplenishmentUrgency, number> = {
    out_of_stock: 0,
    critical: 1,
    reorder_soon: 2,
    healthy: 3,
    overstocked: 4,
    stagnant: 5,
  };

  items.sort((a, b) => {
    const weightDiff = urgencyWeight[a.urgency] - urgencyWeight[b.urgency];
    if (weightDiff !== 0) return weightDiff;
    // Secondary sort: lower days remaining first
    return a.daysRemaining - b.daysRemaining;
  });

  // 3. Compute High-Level Summary
  const outOfStockCount = items.filter((i) => i.urgency === 'out_of_stock').length;
  const criticalCount = items.filter((i) => i.urgency === 'critical').length;
  const reorderSoonCount = items.filter((i) => i.urgency === 'reorder_soon').length;
  const healthyCount = items.filter((i) => i.urgency === 'healthy').length;
  const overstockedCount = items.filter((i) => i.urgency === 'overstocked').length;
  const stagnantCount = items.filter((i) => i.urgency === 'stagnant').length;

  const totalRecommendedUnits = items.reduce((acc, i) => acc + i.recommendedOrderQty, 0);
  const totalWorkingCapitalNeeded = items.reduce((acc, i) => acc + i.estimatedCost, 0);
  const totalProjectedProfit = items.reduce((acc, i) => acc + i.projectedProfit, 0);

  // Fastest depleting item (with positive velocity)
  const itemsWithVelocity = items.filter((i) => i.dailyVelocity > 0);
  itemsWithVelocity.sort((a, b) => a.daysRemaining - b.daysRemaining);
  const fastestDepletingItem = itemsWithVelocity[0] || items[0];

  // Highest cost restock item
  const restockItems = [...items].sort((a, b) => b.estimatedCost - a.estimatedCost);
  const highestCostRestockItem = restockItems[0];

  // Inventory Health Score calculation (0-100)
  // Penalize for out-of-stock and critical items
  let healthScore = 100;
  if (items.length > 0) {
    const outOfStockPenalty = (outOfStockCount / items.length) * 50;
    const criticalPenalty = (criticalCount / items.length) * 30;
    const reorderSoonPenalty = (reorderSoonCount / items.length) * 10;
    healthScore = Math.max(10, Math.round(100 - (outOfStockPenalty + criticalPenalty + reorderSoonPenalty)));
  }

  const summary: ReplenishmentSummary = {
    totalCatalogItems: items.length,
    outOfStockCount,
    criticalCount,
    reorderSoonCount,
    healthyCount,
    overstockedCount,
    stagnantCount,
    totalRecommendedUnits,
    totalWorkingCapitalNeeded,
    totalProjectedProfit,
    fastestDepletingItem,
    highestCostRestockItem,
    overallHealthScore: healthScore,
  };

  return { items, summary };
}
