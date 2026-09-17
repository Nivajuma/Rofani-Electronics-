import { Product, Expense, RecurringFrequency } from '../types';

export interface DuplicateGroup {
  id: string;
  matchReason: 'Barcode Match' | 'SKU Match' | 'Name & Category Match';
  matchKey: string;
  primaryItem: Product;
  duplicateItems: Product[];
  totalStockToMerge: number;
}

export interface DeduplicationResult {
  cleanedProducts: Product[];
  removedProductsCount: number;
  duplicateGroupsCount: number;
  mergedStockUnitsTotal: number;
  groups: DuplicateGroup[];
}

export interface DuplicateExpenseGroup {
  id: string;
  matchReason: 'Receipt Number Match' | 'Date, Description & Amount Match';
  matchKey: string;
  primaryExpense: Expense;
  duplicateExpenses: Expense[];
}

export interface ExpenseDeduplicationResult {
  cleanedExpenses: Expense[];
  removedExpensesCount: number;
  groups: DuplicateExpenseGroup[];
}

export function detectDuplicateExpenses(expenses: Expense[]): DuplicateExpenseGroup[] {
  if (!expenses || expenses.length <= 1) return [];

  const parent = expenses.map((_, idx) => idx);

  function find(i: number): number {
    if (parent[i] === i) return i;
    parent[i] = find(parent[i]);
    return parent[i];
  }

  function union(i: number, j: number) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
    }
  }

  const receiptMap = new Map<string, number>();
  const detailMap = new Map<string, number>();
  const matchReasons = new Map<string, 'Receipt Number Match' | 'Date, Description & Amount Match'>();

  expenses.forEach((e, idx) => {
    // 1. Receipt matching if explicit
    const normReceipt = e.receiptNo ? e.receiptNo.trim().toUpperCase() : '';
    if (normReceipt && normReceipt !== 'N/A' && !normReceipt.startsWith('REC-') && !normReceipt.startsWith('RNW-')) {
      if (receiptMap.has(normReceipt)) {
        const prevIdx = receiptMap.get(normReceipt)!;
        union(idx, prevIdx);
        matchReasons.set(`${find(idx)}`, 'Receipt Number Match');
      } else {
        receiptMap.set(normReceipt, idx);
      }
    }

    // 2. Date + Category + Description + Amount match
    const normDesc = (e.description || '').trim().toLowerCase();
    const normCat = (e.category || '').trim().toLowerCase();
    const detailKey = `${e.date}:::${normCat}:::${normDesc}:::${e.amount}`;
    if (detailMap.has(detailKey)) {
      const prevIdx = detailMap.get(detailKey)!;
      union(idx, prevIdx);
      if (!matchReasons.has(`${find(idx)}`)) {
        matchReasons.set(`${find(idx)}`, 'Date, Description & Amount Match');
      }
    } else {
      detailMap.set(detailKey, idx);
    }
  });

  const clusters = new Map<number, Expense[]>();
  expenses.forEach((e, idx) => {
    const root = find(idx);
    if (!clusters.has(root)) {
      clusters.set(root, []);
    }
    clusters.get(root)!.push(e);
  });

  const duplicateGroups: DuplicateExpenseGroup[] = [];

  clusters.forEach((items, root) => {
    if (items.length > 1) {
      const primaryExpense = items[0];
      const duplicateExpenses = items.slice(1);
      const reason = matchReasons.get(`${root}`) || 'Date, Description & Amount Match';

      duplicateGroups.push({
        id: `dup-exp-group-${root}-${Date.now()}`,
        matchReason: reason,
        matchKey: primaryExpense.description,
        primaryExpense,
        duplicateExpenses,
      });
    }
  });

  return duplicateGroups;
}

export function deduplicateExpenses(expenses: Expense[]): ExpenseDeduplicationResult {
  const groups = detectDuplicateExpenses(expenses);
  if (groups.length === 0) {
    return {
      cleanedExpenses: expenses,
      removedExpensesCount: 0,
      groups: [],
    };
  }

  const idsToRemoveSet = new Set<string>();
  let totalRemovedCount = 0;

  groups.forEach((group) => {
    group.duplicateExpenses.forEach((dup) => {
      idsToRemoveSet.add(dup.id);
      totalRemovedCount += 1;
    });
  });

  const cleanedExpenses = expenses.filter((e) => !idsToRemoveSet.has(e.id));

  return {
    cleanedExpenses,
    removedExpensesCount: totalRemovedCount,
    groups,
  };
}

export function computeNextDueDate(startDateStr: string, frequency: RecurringFrequency): string {
  const d = new Date(startDateStr);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  if (frequency === 'Daily') {
    d.setDate(d.getDate() + 1);
  } else if (frequency === 'Monthly') {
    d.setMonth(d.getMonth() + 1);
  } else if (frequency === 'Yearly') {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d.toISOString().slice(0, 10);
}

export function processDueRecurringExpenses(expenses: Expense[], currentUserName: string): { newExpenses: Expense[]; processedCount: number } {
  const todayStr = new Date().toISOString().slice(0, 10);
  const newlyCreated: Expense[] = [];

  const updatedExpenses = expenses.map((exp) => {
    if (exp.recurringType && exp.recurringType !== 'One-Time' && exp.nextDueDate && exp.nextDueDate <= todayStr) {
      const processDate = exp.nextDueDate;
      const newNextDue = computeNextDueDate(processDate, exp.recurringType);

      // Create new cycle expense
      const renewalExp: Expense = {
        id: `exp-auto-rnw-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        date: processDate,
        category: exp.category,
        description: `${exp.description} (${exp.recurringType} Renewal)`,
        amount: exp.amount,
        paymentMethod: exp.paymentMethod,
        recordedBy: currentUserName,
        receiptNo: `AUTO-RNW-${Math.floor(1000 + Math.random() * 9000)}`,
        recurringType: exp.recurringType,
        isRecurring: true,
        nextDueDate: newNextDue,
        status: 'Paid',
      };

      newlyCreated.push(renewalExp);

      // Advance existing parent expense's nextDueDate
      return {
        ...exp,
        nextDueDate: newNextDue,
      };
    }
    return exp;
  });

  return {
    newExpenses: [...updatedExpenses, ...newlyCreated],
    processedCount: newlyCreated.length,
  };
}

export function detectDuplicateProducts(products: Product[]): DuplicateGroup[] {
  if (!products || products.length <= 1) return [];

  // Union-Find / Disjoint Set structure for grouping connected duplicate items
  const parent = products.map((_, idx) => idx);

  function find(i: number): number {
    if (parent[i] === i) return i;
    parent[i] = find(parent[i]);
    return parent[i];
  }

  function union(i: number, j: number) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
    }
  }

  const barcodeMap = new Map<string, number>();
  const skuMap = new Map<string, number>();
  const nameCategoryMap = new Map<string, number>();

  const matchReasons = new Map<string, 'Barcode Match' | 'SKU Match' | 'Name & Category Match'>();

  products.forEach((p, idx) => {
    // 1. Barcode normalization
    const normalizedBarcode = p.barcode ? p.barcode.trim().toLowerCase() : '';
    if (normalizedBarcode && normalizedBarcode !== 'n/a' && normalizedBarcode !== 'auto' && normalizedBarcode !== 'none') {
      if (barcodeMap.has(normalizedBarcode)) {
        const prevIdx = barcodeMap.get(normalizedBarcode)!;
        union(idx, prevIdx);
        matchReasons.set(`${find(idx)}`, 'Barcode Match');
      } else {
        barcodeMap.set(normalizedBarcode, idx);
      }
    }

    // 2. SKU normalization
    const normalizedSku = p.sku ? p.sku.trim().toLowerCase() : '';
    if (normalizedSku && normalizedSku !== 'n/a' && normalizedSku !== 'auto' && normalizedSku !== 'none') {
      if (skuMap.has(normalizedSku)) {
        const prevIdx = skuMap.get(normalizedSku)!;
        union(idx, prevIdx);
        if (!matchReasons.has(`${find(idx)}`)) {
          matchReasons.set(`${find(idx)}`, 'SKU Match');
        }
      } else {
        skuMap.set(normalizedSku, idx);
      }
    }

    // 3. Name & Category normalization
    const normalizedName = p.name ? p.name.trim().toLowerCase().replace(/\s+/g, ' ') : '';
    const normalizedCat = p.category ? p.category.trim().toLowerCase() : '';
    if (normalizedName) {
      const nameKey = `${normalizedCat}:::${normalizedName}`;
      if (nameCategoryMap.has(nameKey)) {
        const prevIdx = nameCategoryMap.get(nameKey)!;
        union(idx, prevIdx);
        if (!matchReasons.has(`${find(idx)}`)) {
          matchReasons.set(`${find(idx)}`, 'Name & Category Match');
        }
      } else {
        nameCategoryMap.set(nameKey, idx);
      }
    }
  });

  // Group products by root index
  const clusters = new Map<number, Product[]>();
  products.forEach((p, idx) => {
    const root = find(idx);
    if (!clusters.has(root)) {
      clusters.set(root, []);
    }
    clusters.get(root)!.push(p);
  });

  const duplicateGroups: DuplicateGroup[] = [];

  clusters.forEach((items, root) => {
    if (items.length > 1) {
      // Pick primary item: item with image or longest description or earlier creation date
      const sorted = [...items].sort((a, b) => {
        const aHasImg = a.imageUrl ? 1 : 0;
        const bHasImg = b.imageUrl ? 1 : 0;
        if (aHasImg !== bHasImg) return bHasImg - aHasImg;
        if ((a.description || '').length !== (b.description || '').length) {
          return (b.description || '').length - (a.description || '').length;
        }
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });

      const primaryItem = sorted[0];
      const duplicateItems = sorted.slice(1);

      const totalStockToMerge = duplicateItems.reduce((sum, item) => sum + (item.stockQuantity || 0), 0);

      const reason = matchReasons.get(`${root}`) || 'Name & Category Match';

      duplicateGroups.push({
        id: `dup-group-${root}-${Date.now()}`,
        matchReason: reason,
        matchKey: primaryItem.name,
        primaryItem,
        duplicateItems,
        totalStockToMerge,
      });
    }
  });

  return duplicateGroups;
}

export function deduplicateProducts(products: Product[]): DeduplicationResult {
  const groups = detectDuplicateProducts(products);

  if (groups.length === 0) {
    return {
      cleanedProducts: products,
      removedProductsCount: 0,
      duplicateGroupsCount: 0,
      mergedStockUnitsTotal: 0,
      groups: [],
    };
  }

  // Map of items to keep with merged stock and combined attributes
  const primaryUpdatesMap = new Map<string, Product>();
  const idsToRemoveSet = new Set<string>();

  let totalRemovedCount = 0;
  let totalMergedStockUnits = 0;

  groups.forEach((group) => {
    const { primaryItem, duplicateItems, totalStockToMerge } = group;

    // Combine stock quantities
    const totalCombinedStock = (primaryItem.stockQuantity || 0) + totalStockToMerge;

    // Combine store stock dictionaries
    const combinedStoreStock: Record<string, number> = { ...(primaryItem.storeStock || {}) };

    let finalImageUrl = primaryItem.imageUrl || '';

    duplicateItems.forEach((dup) => {
      idsToRemoveSet.add(dup.id);
      totalRemovedCount += 1;
      totalMergedStockUnits += dup.stockQuantity || 0;

      if (!finalImageUrl && dup.imageUrl) {
        finalImageUrl = dup.imageUrl;
      }

      if (dup.storeStock) {
        Object.entries(dup.storeStock).forEach(([storeId, qty]) => {
          combinedStoreStock[storeId] = (combinedStoreStock[storeId] || 0) + (qty || 0);
        });
      }
    });

    const updatedPrimary: Product = {
      ...primaryItem,
      stockQuantity: totalCombinedStock,
      imageUrl: finalImageUrl,
      storeStock: Object.keys(combinedStoreStock).length > 0 ? combinedStoreStock : primaryItem.storeStock,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    primaryUpdatesMap.set(primaryItem.id, updatedPrimary);
  });

  // Construct cleaned products array
  const cleanedProducts: Product[] = [];

  products.forEach((p) => {
    if (idsToRemoveSet.has(p.id)) {
      return;
    }
    if (primaryUpdatesMap.has(p.id)) {
      cleanedProducts.push(primaryUpdatesMap.get(p.id)!);
    } else {
      cleanedProducts.push(p);
    }
  });

  return {
    cleanedProducts,
    removedProductsCount: totalRemovedCount,
    duplicateGroupsCount: groups.length,
    mergedStockUnitsTotal: totalMergedStockUnits,
    groups,
  };
}
