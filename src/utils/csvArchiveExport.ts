import { Transaction, Product, Expense } from '../types';

/**
 * RFC 4180 compliant cell escaping for CSV generation
 * Wraps values with quotes if they contain commas, double quotes, or line breaks.
 * Doubles up any existing internal double quotes.
 */
export const escapeCsvCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Builds standard UTF-8 CSV text with Byte Order Mark (BOM)
 * to ensure Microsoft Excel and spreadsheet tools display currency symbols and UTF-8 characters cleanly.
 */
export const buildCsvString = (
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string => {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const rowLines = rows.map((r) => r.map(escapeCsvCell).join(','));
  // \uFEFF is UTF-8 BOM
  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
};

/**
 * Programmatically triggers a clean file download via a virtual link element.
 */
export const triggerCsvDownload = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch (_) {}
  }, 4000);
};

/**
 * Formats a date string safely to YYYY-MM-DD
 */
const formatDateStamp = (): string => {
  return new Date().toISOString().slice(0, 10);
};

/**
 * 1. Exports current sales transactions to archival CSV
 */
export const exportSalesToCSV = (
  transactions: Transaction[],
  filterLabel = 'All'
): string => {
  const headers = [
    'Receipt Number',
    'Date',
    'Time',
    'Customer Name',
    'Customer Phone',
    'Cashier Name',
    'Sales Rep',
    'Items Count',
    'Items Summary',
    'Subtotal (KSh)',
    'Discount Total (KSh)',
    'Tax Total (KSh)',
    'Grand Total (KSh)',
    'Amount Paid (KSh)',
    'Balance Due (KSh)',
    'Payment Status',
    'Payment Modes',
    'Store Name',
    'Source Channel',
    'Notes',
  ];

  const rows = transactions.map((tx) => {
    const txDate = new Date(tx.date);
    const dateFormatted = !isNaN(txDate.getTime()) ? txDate.toLocaleDateString() : tx.date;
    const timeFormatted = !isNaN(txDate.getTime())
      ? txDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    const itemsSummary = tx.items
      .map((it) => `${it.quantity}x ${it.product.name} (KSh ${it.unitPrice})`)
      .join('; ');

    const paymentModes = tx.payments && tx.payments.length > 0
      ? tx.payments.map((p) => `${p.method.toUpperCase()} (KSh ${p.amount})`).join('; ')
      : tx.paymentMethod || 'CASH';

    return [
      tx.receiptNumber,
      dateFormatted,
      timeFormatted,
      tx.customerName || 'Walk-in Customer',
      tx.customerPhone || 'N/A',
      tx.cashierName || 'Staff',
      tx.salesRepName || 'N/A',
      tx.items.length,
      itemsSummary,
      tx.subtotal.toFixed(2),
      (tx.discountTotal || 0).toFixed(2),
      (tx.taxTotal || 0).toFixed(2),
      tx.grandTotal.toFixed(2),
      tx.amountPaid.toFixed(2),
      tx.balanceDue.toFixed(2),
      tx.paymentStatus,
      paymentModes,
      tx.storeName || 'Main Store',
      tx.sourceType || 'POS',
      tx.notes || '',
    ];
  });

  const csv = buildCsvString(headers, rows);
  const sanitizedFilter = filterLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Sales_Archive_${sanitizedFilter}_${formatDateStamp()}.csv`;
  triggerCsvDownload(csv, filename);
  return filename;
};

/**
 * 2. Exports current inventory stock data to archival CSV
 */
export const exportInventoryToCSV = (
  products: Product[],
  velocityMap: Record<string, number> = {}
): string => {
  const headers = [
    'Product ID',
    'SKU',
    'Barcode',
    'Item Name',
    'Category',
    'Subcategory',
    'Size / Capacity',
    'Unit of Measure',
    'Current Stock Quantity',
    'Min Stock Alert Threshold',
    'Stock Status',
    'Unit Cost Price (KSh)',
    'Unit Selling Price (KSh)',
    'Unit Profit Margin (KSh)',
    'Margin Percentage (%)',
    'Total Stock Valuation at Cost (KSh)',
    'Total Potential Retail Value (KSh)',
    'Units Sold (Lifetime / Filtered)',
    'Supplier Name',
    'Last Updated',
    'Description',
  ];

  const rows = products.map((p) => {
    const isOutOfStock = p.stockQuantity <= 0;
    const isLowStock = p.stockQuantity <= p.minStockAlert && !isOutOfStock;
    const stockStatus = isOutOfStock
      ? 'Out of Stock'
      : isLowStock
      ? 'Low Stock Alert'
      : 'In Stock';

    const profitUnit = Math.max(0, p.sellingPrice - p.costPrice);
    const marginPct = p.sellingPrice > 0 ? (profitUnit / p.sellingPrice) * 100 : 0;
    const valAtCost = p.stockQuantity * p.costPrice;
    const valAtRetail = p.stockQuantity * p.sellingPrice;
    const unitsSold = velocityMap[p.id] ?? 0;

    return [
      p.id,
      p.sku || '',
      p.barcode || '',
      p.name,
      p.category,
      p.subcategory || '',
      p.sizeCapacity || '',
      p.unit || 'pcs',
      p.stockQuantity,
      p.minStockAlert,
      stockStatus,
      p.costPrice.toFixed(2),
      p.sellingPrice.toFixed(2),
      profitUnit.toFixed(2),
      marginPct.toFixed(1),
      valAtCost.toFixed(2),
      valAtRetail.toFixed(2),
      unitsSold,
      p.supplierName || 'General Supplier',
      p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '',
      p.description || '',
    ];
  });

  const csv = buildCsvString(headers, rows);
  const filename = `Inventory_Stock_Archive_${formatDateStamp()}.csv`;
  triggerCsvDownload(csv, filename);
  return filename;
};

/**
 * 3. Exports current operating expenses data to archival CSV
 */
export const exportExpensesToCSV = (expenses: Expense[]): string => {
  const headers = [
    'Expense ID',
    'Date',
    'Category',
    'Description / Purpose',
    'Amount (KSh)',
    'Payment Method',
    'Status',
    'Recorded By',
    'Receipt / Invoice Ref',
    'Recurring Frequency',
    'Next Due Date',
  ];

  const rows = expenses.map((e) => {
    const expDate = new Date(e.date);
    const dateFormatted = !isNaN(expDate.getTime()) ? expDate.toLocaleDateString() : e.date;

    return [
      e.id,
      dateFormatted,
      e.category,
      e.description,
      e.amount.toFixed(2),
      (e.paymentMethod || 'cash').toUpperCase(),
      e.status || 'Paid',
      e.recordedBy || 'Admin',
      e.receiptNo || 'N/A',
      e.recurringType || (e.isRecurring ? 'Recurring' : 'One-time'),
      e.nextDueDate ? new Date(e.nextDueDate).toLocaleDateString() : 'N/A',
    ];
  });

  const csv = buildCsvString(headers, rows);
  const filename = `Expenses_Archive_${formatDateStamp()}.csv`;
  triggerCsvDownload(csv, filename);
  return filename;
};

/**
 * 4. Exports a complete consolidated archive containing Sales, Inventory, and Expenses
 * in a structured, multi-section CSV file for local cold storage or spreadsheet auditing.
 */
export const exportConsolidatedArchiveToCSV = (
  transactions: Transaction[],
  products: Product[],
  expenses: Expense[]
): string => {
  const lines: string[] = [];
  const stamp = new Date().toLocaleString();

  // Document metadata header
  lines.push(`ROFANI ELECTRONICS AND BOUTIQUE - MASTER CONSOLIDATED ARCHIVE`);
  lines.push(`Generated On: ${stamp}`);
  lines.push(`Summary: ${transactions.length} Sales Receipts | ${products.length} Inventory Products | ${expenses.length} Expense Logs`);
  lines.push('');

  // 1. SALES SECTION
  lines.push('=== SECTION 1: SALES TRANSACTIONS ===');
  const salesHeaders = [
    'Receipt Number',
    'Date',
    'Customer',
    'Items Count',
    'Grand Total (KSh)',
    'Amount Paid (KSh)',
    'Balance Due (KSh)',
    'Payment Status',
    'Payment Modes',
  ];
  lines.push(salesHeaders.map(escapeCsvCell).join(','));
  transactions.forEach((tx) => {
    const pm = tx.payments && tx.payments.length > 0
      ? tx.payments.map((p) => `${p.method.toUpperCase()}: ${p.amount}`).join('; ')
      : tx.paymentMethod || 'CASH';
    const row = [
      tx.receiptNumber,
      new Date(tx.date).toLocaleDateString(),
      tx.customerName || 'Walk-in',
      tx.items.length,
      tx.grandTotal.toFixed(2),
      tx.amountPaid.toFixed(2),
      tx.balanceDue.toFixed(2),
      tx.paymentStatus,
      pm,
    ];
    lines.push(row.map(escapeCsvCell).join(','));
  });

  lines.push('');
  lines.push('');

  // 2. INVENTORY SECTION
  lines.push('=== SECTION 2: INVENTORY STOCK & VALUATION ===');
  const invHeaders = [
    'SKU',
    'Barcode',
    'Product Name',
    'Category',
    'Current Stock',
    'Unit',
    'Cost Price (KSh)',
    'Selling Price (KSh)',
    'Total Valuation (Cost)',
    'Total Valuation (Retail)',
    'Supplier',
  ];
  lines.push(invHeaders.map(escapeCsvCell).join(','));
  products.forEach((p) => {
    const row = [
      p.sku || '',
      p.barcode || '',
      p.name,
      p.category,
      p.stockQuantity,
      p.unit,
      p.costPrice.toFixed(2),
      p.sellingPrice.toFixed(2),
      (p.stockQuantity * p.costPrice).toFixed(2),
      (p.stockQuantity * p.sellingPrice).toFixed(2),
      p.supplierName || 'General Supplier',
    ];
    lines.push(row.map(escapeCsvCell).join(','));
  });

  lines.push('');
  lines.push('');

  // 3. EXPENSES SECTION
  lines.push('=== SECTION 3: STORE OPERATING EXPENSES ===');
  const expHeaders = [
    'Expense ID',
    'Date',
    'Category',
    'Description',
    'Amount (KSh)',
    'Payment Method',
    'Status',
    'Recorded By',
  ];
  lines.push(expHeaders.map(escapeCsvCell).join(','));
  expenses.forEach((e) => {
    const row = [
      e.id,
      new Date(e.date).toLocaleDateString(),
      e.category,
      e.description,
      e.amount.toFixed(2),
      e.paymentMethod,
      e.status || 'Paid',
      e.recordedBy || 'Staff',
    ];
    lines.push(row.map(escapeCsvCell).join(','));
  });

  const fullContent = '\uFEFF' + lines.join('\r\n');
  const filename = `Master_Complete_Archive_${formatDateStamp()}.csv`;
  triggerCsvDownload(fullContent, filename);
  return filename;
};
