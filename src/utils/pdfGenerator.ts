import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, Product, Customer, Supplier, Expense, StaffCommissionPayout, User } from '../types';

/**
 * Common Header styling for reports
 */
const addReportHeader = (doc: jsPDF, title: string, subtitle: string) => {
  doc.setFillColor(15, 23, 42); // Dark slate header
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ROFANI ELECTRONICS AND BOUTIQUE', 14, 12);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 20);

  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${new Date().toLocaleString()} | ${subtitle}`, 200, 20, { align: 'right' });

  doc.setTextColor(15, 23, 42);
};

/**
 * 1. Export Sales Report PDF
 */
export const exportSalesReportPDF = (transactions: Transaction[], dateRangeStr: string) => {
  const doc = new jsPDF();
  addReportHeader(doc, 'SALES TRANSACTION REPORT', dateRangeStr);

  let totalRevenue = 0;
  let totalPaid = 0;
  let totalDue = 0;

  const tableData = transactions.map((tx) => {
    totalRevenue += tx.grandTotal;
    totalPaid += tx.amountPaid;
    totalDue += tx.balanceDue;

    const pm = tx.payments.map((p) => `${p.method.toUpperCase()} (KSh ${p.amount.toLocaleString()})`).join(', ');

    return [
      tx.receiptNumber,
      new Date(tx.date).toLocaleDateString(),
      tx.customerName || 'Walk-in',
      tx.items.length.toString(),
      `KSh ${tx.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `KSh ${tx.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      tx.balanceDue > 0 ? `KSh ${tx.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'KSh 0.00',
      tx.paymentStatus,
      pm || 'N/A'
    ];
  });

  autoTable(doc, {
    startY: 34,
    head: [['Receipt #', 'Date', 'Customer', 'Items', 'Total', 'Paid', 'Due', 'Status', 'Payment Modes']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
  });

  // Summary box
  const kraTaxTotal = totalRevenue * 0.015;
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, finalY, 182, 30, 3, 3, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Transactions: ${transactions.length}`, 20, finalY + 8);
  doc.text(`Total Gross Sales: KSh ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 20, finalY + 16);
  doc.setTextColor(217, 119, 6); // Amber tax color
  doc.text(`KRA Turnover Tax Payable (1.5% TOT): KSh ${kraTaxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 20, finalY + 24);

  doc.setTextColor(15, 23, 42);
  doc.text(`Total Collected: KSh ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 105, finalY + 8);
  doc.setTextColor(220, 38, 38);
  doc.text(`Total Credit / Balance Due: KSh ${totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 105, finalY + 16);

  doc.save(`Sales_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
};

/**
 * 2. Export Profit & Loss Financial Report PDF
 */
export const exportProfitReportPDF = (
  transactions: Transaction[],
  expenses: Expense[],
  periodLabel: string
) => {
  const doc = new jsPDF();
  addReportHeader(doc, 'PROFIT & LOSS STATEMENT', periodLabel);

  let grossSales = 0;
  let cogs = 0; // Cost of Goods Sold

  transactions.forEach((tx) => {
    grossSales += tx.grandTotal;
    tx.items.forEach((it) => {
      cogs += (it.product.costPrice || 0) * it.quantity;
    });
  });

  const grossProfit = grossSales - cogs;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const kraTax = grossSales * 0.015; // KRA Turnover Tax 1.5%
  const netProfit = grossProfit - totalExpenses - kraTax;

  const financialSummary = [
    ['Gross Sales Revenue', `KSh ${grossSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
    ['Less: Cost of Goods Sold (COGS)', `-KSh ${cogs.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
    ['Gross Operating Profit', `KSh ${grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
    ['Less: Operating Expenses', `-KSh ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
    ['Less: KRA Turnover Tax (1.5% of Gross Sales)', `-KSh ${kraTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
    ['NET PROFIT AFTER TAX', `KSh ${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`]
  ];

  autoTable(doc, {
    startY: 35,
    head: [['Financial Metric', 'Amount (KSh)']],
    body: financialSummary,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    styles: { fontSize: 10, cellPadding: 5 },
  });

  // Expense details breakdown
  let currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Expense Breakdown', 14, currentY);

  const expenseRows = expenses.map((exp) => [
    exp.date,
    exp.category,
    exp.description,
    exp.paymentMethod.toUpperCase(),
    `KSh ${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  ]);

  autoTable(doc, {
    startY: currentY + 5,
    head: [['Date', 'Category', 'Description', 'Method', 'Amount']],
    body: expenseRows,
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
    styles: { fontSize: 8, cellPadding: 3 },
  });

  doc.save(`Profit_Loss_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
};

/**
 * 3. Export Item Comparison & Movement Report (Fast vs Slow Moving Items)
 */
export const exportItemMovementPDF = (products: Product[], transactions: Transaction[]) => {
  const doc = new jsPDF();
  addReportHeader(doc, 'ITEM MOVEMENT & VELOCITY ANALYSIS', 'Fast vs Low Moving Inventory Report');

  // Map product sales
  const productSalesMap: Record<string, { qtySold: number; totalRevenue: number }> = {};
  transactions.forEach((tx) => {
    tx.items.forEach((it) => {
      if (!productSalesMap[it.product.id]) {
        productSalesMap[it.product.id] = { qtySold: 0, totalRevenue: 0 };
      }
      productSalesMap[it.product.id].qtySold += it.quantity;
      productSalesMap[it.product.id].totalRevenue += it.total;
    });
  });

  const analyzedProducts = products.map((p) => {
    const stats = productSalesMap[p.id] || { qtySold: 0, totalRevenue: 0 };
    return {
      ...p,
      qtySold: stats.qtySold,
      totalRevenue: stats.totalRevenue,
      velocity: stats.qtySold >= 5 ? 'Fast Moving' : stats.qtySold >= 1 ? 'Moderate' : 'Low / Slow Moving'
    };
  });

  // Sort by Qty Sold descending
  analyzedProducts.sort((a, b) => b.qtySold - a.qtySold);

  const tableData = analyzedProducts.map((p) => [
    p.name,
    p.category,
    p.sizeCapacity || '-',
    p.stockQuantity.toString(),
    p.qtySold.toString(),
    `KSh ${p.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    p.velocity
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['Product Name', 'Category', 'Size/Capacity', 'Current Stock', 'Qty Sold', 'Revenue', 'Velocity Status']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const val = data.cell.raw;
        if (val === 'Fast Moving') {
          data.cell.styles.textColor = [22, 163, 74];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'Low / Slow Moving') {
          data.cell.styles.textColor = [220, 38, 38];
        }
      }
    }
  });

  doc.save(`Item_Movement_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
};

/**
 * 4. Export Customer Ledger PDF
 */
export const exportCustomerReportPDF = (customers: Customer[]) => {
  const doc = new jsPDF();
  addReportHeader(doc, 'CUSTOMER LEDGER & CREDIT REPORT', 'Customer Balances & Lifetime Sales');

  const rows = customers.map((c) => [
    c.name,
    c.phone,
    c.email || 'N/A',
    `KSh ${c.totalPurchases.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    `KSh ${c.currentBalanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    c.currentBalanceDue > 0 ? 'CREDIT OUTSTANDING' : 'CLEAR'
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['Customer Name', 'Phone', 'Email', 'Lifetime Purchases', 'Balance Due', 'Status']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
  });

  doc.save(`Customer_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
};

/**
 * 5. Export Supplier Report PDF
 */
export const exportSupplierReportPDF = (suppliers: Supplier[]) => {
  const doc = new jsPDF();
  addReportHeader(doc, 'SUPPLIER DIRECTORY & RESTOCK EXPENDITURE', 'Suppliers List');

  const rows = suppliers.map((s) => [
    s.name,
    s.contactPerson,
    s.phone,
    s.email,
    s.address,
    `KSh ${s.totalSuppliedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['Supplier', 'Contact Person', 'Phone', 'Email', 'Address', 'Total Restock Value']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
  });

  doc.save(`Supplier_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
};

/**
 * 6. Export Monthly KRA Turnover Tax (TOT) Report PDF
 */
export const exportKRATaxReportPDF = (transactions: Transaction[], monthLabel: string) => {
  const doc = new jsPDF();
  addReportHeader(doc, 'KENYA REVENUE AUTHORITY (KRA) TURNOVER TAX REPORT', `Tax Filing Period: ${monthLabel}`);

  const totalSales = transactions.reduce((sum, tx) => sum + tx.grandTotal, 0);
  const totalTaxPayable = totalSales * 0.015; // 1.5% KRA Turnover Tax

  const summaryData = [
    ['Tax Type', 'KRA Turnover Tax (TOT)'],
    ['Tax Rate', '1.5% on Gross Sales'],
    ['Filing Period', monthLabel],
    ['Total Taxable Sales Volume', `KSh ${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
    ['Total KRA Tax Liability (1.5%)', `KSh ${totalTaxPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}`]
  ];

  autoTable(doc, {
    startY: 35,
    head: [['KRA Tax Compliance Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 1: { fontStyle: 'bold', halign: 'right' } },
    styles: { fontSize: 10, cellPadding: 4 }
  });

  const txRows = transactions.map((tx) => [
    tx.receiptNumber,
    new Date(tx.date).toLocaleDateString(),
    tx.customerName || 'Walk-in',
    `KSh ${tx.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    `KSh ${(tx.grandTotal * 0.015).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  ]);

  let nextY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Itemized Transaction Sales Tax Log', 14, nextY);

  autoTable(doc, {
    startY: nextY + 4,
    head: [['Receipt #', 'Date', 'Customer', 'Gross Amount (KSh)', 'KRA Tax 1.5% (KSh)']],
    body: txRows,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    styles: { fontSize: 8, cellPadding: 3 }
  });

  doc.save(`KRA_Turnover_Tax_Report_${monthLabel.replace(/\s+/g, '_')}.pdf`);
};

/**
 * 7. Export Sales Receipt PDF
 */
export const exportReceiptPDF = (tx: Transaction) => {
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 175 + tx.items.length * 10] // Thermal receipt style dimensions (80mm width)
  });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ROFANI ELECTRONICS & BOUTIQUE', 40, 10, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Main Mall, Nairobi, Kenya', 40, 15, { align: 'center' });
  doc.text('Tel: +254 700 000 000 | KRA PIN: P051234567X', 40, 19, { align: 'center' });

  doc.text('----------------------------------------------------', 40, 24, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`Receipt #: ${tx.receiptNumber}`, 6, 29);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date(tx.date).toLocaleString()}`, 6, 33);
  doc.text(`Cashier: ${tx.cashierName}`, 6, 37);
  doc.text(`Customer: ${tx.customerName || 'Walk-in'}`, 6, 41);
  doc.text('----------------------------------------------------', 40, 45, { align: 'center' });

  let y = 50;
  doc.setFont('helvetica', 'bold');
  doc.text('Item', 6, y);
  doc.text('Qty', 45, y);
  doc.text('Total', 74, y, { align: 'right' });

  y += 4;
  doc.setFont('helvetica', 'normal');

  tx.items.forEach((it) => {
    // Truncate long item names
    const shortName = it.product.name.length > 20 ? it.product.name.slice(0, 18) + '..' : it.product.name;
    doc.text(shortName, 6, y);
    doc.text(`${it.quantity} x KSh ${it.unitPrice.toLocaleString()}`, 45, y);
    doc.text(`KSh ${it.total.toLocaleString()}`, 74, y, { align: 'right' });
    y += 5;
  });

  doc.text('----------------------------------------------------', 40, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', 6, y);
  doc.text(`KSh ${tx.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 74, y, { align: 'right' });
  y += 4;

  if (tx.discountTotal > 0) {
    doc.text('Discount:', 6, y);
    doc.text(`-KSh ${tx.discountTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 74, y, { align: 'right' });
    y += 4;
  }

  doc.text('KRA Turnover Tax (1.5%):', 6, y);
  doc.text(`KSh ${(tx.grandTotal * 0.015).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 74, y, { align: 'right' });
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Grand Total:', 6, y);
  doc.text(`KSh ${tx.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 74, y, { align: 'right' });
  y += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Amount Paid:`, 6, y);
  doc.text(`KSh ${tx.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 74, y, { align: 'right' });
  y += 4;

  if (tx.balanceDue > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(`Balance Due (Credit):`, 6, y);
    doc.text(`KSh ${tx.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 74, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 4;
  }

  y += 3;
  doc.text('Payment Methods:', 6, y);
  y += 4;
  tx.payments.forEach((p) => {
    doc.text(`• ${p.method.toUpperCase()}: KSh ${p.amount.toLocaleString()} ${p.reference ? `(${p.reference})` : ''}`, 8, y);
    y += 4;
  });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Thank you for shopping with us!', 40, y, { align: 'center' });

  doc.save(`Receipt_${tx.receiptNumber}.pdf`);
};

/**
 * 9. Export Individual Customer Statement of Account PDF
 */
export const exportCustomerAccountStatementPDF = (customer: Customer, customerTransactions: Transaction[]) => {
  const doc = new jsPDF();
  addReportHeader(doc, 'STATEMENT OF CUSTOMER ACCOUNT & INVOICE HISTORY', `Account: ${customer.name}`);

  // Customer Details summary block
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER INFORMATION', 14, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Customer Name: ${customer.name}`, 14, 42);
  doc.text(`Phone Number: ${customer.phone}`, 14, 48);
  doc.text(`Email Address: ${customer.email || 'N/A'}`, 14, 54);
  doc.text(`Physical Address: ${customer.address || 'N/A'}`, 14, 60);

  doc.text(`KRA Tax PIN: ${customer.kraPin || 'N/A'}`, 110, 42);
  doc.text(`Customer Type: ${customer.customerType || 'Individual'}`, 110, 48);
  doc.text(`Credit Limit: ${customer.creditLimit ? `KSh ${customer.creditLimit.toLocaleString()}` : 'Standard'}`, 110, 54);
  
  doc.setFont('helvetica', 'bold');
  if (customer.currentBalanceDue > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text(`Current Outstanding Balance: KSh ${customer.currentBalanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 110, 60);
  } else {
    doc.setTextColor(22, 163, 74);
    doc.text(`Current Balance: KSh 0.00 (Account Fully Settled)`, 110, 60);
  }
  doc.setTextColor(15, 23, 42);

  // Purchases Table
  const rows = customerTransactions.map((tx) => {
    const itemsList = tx.items.map((i) => `${i.product.name} (x${i.quantity})`).join(', ');
    return [
      tx.receiptNumber,
      new Date(tx.date).toLocaleDateString(),
      itemsList,
      `KSh ${tx.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `KSh ${tx.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `KSh ${tx.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      tx.paymentStatus.toUpperCase()
    ];
  });

  autoTable(doc, {
    startY: 68,
    head: [['Receipt #', 'Date', 'Purchased Items', 'Total', 'Paid', 'Balance', 'Status']],
    body: rows.length > 0 ? rows : [['-', '-', 'No direct transaction history recorded', '0.00', '0.00', '0.00', '-']],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 100;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('Payment Remittance: M-Pesa Buy Goods Till #789012 or Paybill 247247 Acc 0180293. Thank you!', 14, finalY + 10);

  doc.save(`Statement_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
};

/**
 * 10. Export Supplier Statement & Catalog Summary PDF
 */
export const exportSupplierAccountStatementPDF = (supplier: Supplier, supplierProducts: Product[]) => {
  const doc = new jsPDF();
  addReportHeader(doc, 'SUPPLIER ACCOUNTS PAYABLE & CATALOG STATEMENT', `Supplier: ${supplier.name}`);

  // Supplier Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SUPPLIER VENDOR PROFILE', 14, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Company: ${supplier.name}`, 14, 42);
  doc.text(`Contact Person: ${supplier.contactPerson}`, 14, 48);
  doc.text(`Phone: ${supplier.phone}`, 14, 54);
  doc.text(`Email: ${supplier.email}`, 14, 60);

  doc.text(`Address: ${supplier.address}`, 110, 42);
  doc.text(`Tax PIN: ${supplier.kraPin || 'N/A'}`, 110, 48);
  doc.text(`Payment Terms: ${supplier.paymentTerms || 'Standard'}`, 110, 54);
  
  doc.setFont('helvetica', 'bold');
  if ((supplier.currentBalanceDue || 0) > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text(`Accounts Payable (Owed): KSh ${(supplier.currentBalanceDue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 110, 60);
  } else {
    doc.setTextColor(22, 163, 74);
    doc.text(`Payable Balance: KSh 0.00 (All Invoices Paid)`, 110, 60);
  }
  doc.setTextColor(15, 23, 42);

  // Supplied Products Catalog Table
  const rows = supplierProducts.map((p) => [
    p.sku,
    p.name,
    p.category,
    `KSh ${p.costPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    `KSh ${p.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    `${p.stockQuantity} ${p.unit}`,
    p.stockQuantity <= p.minStockAlert ? 'LOW STOCK - REORDER' : 'IN STOCK'
  ]);

  autoTable(doc, {
    startY: 68,
    head: [['SKU', 'Product Name', 'Category', 'Unit Cost', 'Selling Price', 'Current Stock', 'Status']],
    body: rows.length > 0 ? rows : [['-', 'No products currently mapped to this supplier', '-', '0.00', '0.00', '0', '-']],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 100;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Total Lifetime Restock Value from ${supplier.name}: KSh ${supplier.totalSuppliedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 14, finalY + 10);

  doc.save(`Supplier_Statement_${supplier.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
};

/**
 * 13. Export Staff Commission Statement PDF
 */
export const exportCommissionStatementPDF = (
  worker: User,
  transactions: Transaction[],
  periodLabel: string,
  summary: { totalSales: number; commissionEarned: number; commissionRate: number; modelName: string; count: number }
) => {
  const doc = new jsPDF();
  addReportHeader(doc, 'WORKER SALES COMMISSION STATEMENT', `Period: ${periodLabel}`);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('WORKER EARNINGS & ATTRIBUTED SALES BREAKDOWN', 14, 36);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Staff Name: ${worker.name}`, 14, 43);
  doc.text(`Role: ${worker.role}`, 14, 49);
  doc.text(`Email: ${worker.email}`, 14, 55);

  doc.text(`Commission Model: ${summary.modelName}`, 110, 43);
  doc.text(`Total Attributed Sales: KSh ${summary.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${summary.count} sales)`, 110, 49);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`Total Commission Earned: KSh ${summary.commissionEarned.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 110, 55);
  doc.setTextColor(15, 23, 42);

  const rows = transactions.map((tx) => {
    const commAmt = tx.cashierCommissionAmount || Math.round(tx.grandTotal * ((tx.cashierCommissionRate || 5) / 100));
    return [
      tx.receiptNumber,
      new Date(tx.date).toLocaleDateString() + ' ' + new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tx.customerName || 'Walk-in',
      tx.items.length.toString(),
      `KSh ${tx.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      tx.commissionModelApplied || `${tx.cashierCommissionRate || 5}%`,
      `KSh ${commAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    ];
  });

  autoTable(doc, {
    startY: 63,
    head: [['Receipt #', 'Date & Time', 'Customer', 'Items', 'Sale Total', 'Rate / Model', 'Comm. Earned']],
    body: rows.length > 0 ? rows : [['-', '-', 'No sales recorded in this period', '-', '0.00', '-', '0.00']],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 120;

  // Summary box
  doc.setFillColor(248, 250, 252);
  doc.rect(14, finalY + 6, 182, 32, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, finalY + 6, 182, 32, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('STATEMENT SUMMARY & AUTHORIZATION', 20, finalY + 14);

  doc.setFont('helvetica', 'normal');
  doc.text(`Total Attributed Revenue: KSh ${summary.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 20, finalY + 22);
  doc.text(`Net Commission Payable: KSh ${summary.commissionEarned.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 20, finalY + 28);

  doc.text('Staff Signature: _______________________', 110, finalY + 22);
  doc.text('Authorized By: ________________________', 110, finalY + 28);

  doc.save(`Commission_Statement_${worker.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
};

/**
 * 14. Export Commission Payout Slip / Voucher PDF
 */
export const exportCommissionPayoutSlipPDF = (payout: StaffCommissionPayout) => {
  const doc = new jsPDF();
  addReportHeader(doc, 'COMMISSION PAYMENT VOUCHER / PAYSLIP', `Voucher ID: ${payout.id}`);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('OFFICIAL COMMISSION DISBURSEMENT RECEIPT', 14, 36);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Employee Name: ${payout.employeeName}`, 14, 43);
  doc.text(`Date / Period: ${payout.date}`, 14, 49);
  doc.text(`Total Sales Base: KSh ${payout.totalSalesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${payout.salesCount} orders)`, 14, 55);

  doc.text(`Payment Method: ${(payout.paymentMethod || 'mpesa').toUpperCase()}`, 110, 43);
  doc.text(`Disbursed By: ${payout.paidBy || 'Admin'}`, 110, 49);
  doc.text(`Reference No: ${payout.referenceNo || 'N/A'}`, 110, 55);

  const rows = [
    ['Gross Attributed Sales', `KSh ${payout.totalSalesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
    ['Effective Commission Rate', `${payout.commissionRate}%`],
    ['Gross Commission Earned', `KSh ${payout.commissionEarned.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
    ['Worker Loan / Advance Deduction', payout.loanDeduction ? `- KSh ${payout.loanDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'KSh 0.00'],
    ['Net Amount Paid to Worker', `KSh ${payout.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
    ['Disbursement Status', payout.status],
    ['Payment Timestamp', payout.paidAt ? new Date(payout.paidAt).toLocaleString() : new Date().toLocaleString()],
    ['Audit Notes', payout.notes || 'Routine sales commission disbursement'],
  ];

  autoTable(doc, {
    startY: 63,
    head: [['Item / Parameter', 'Details / Amount']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 4 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 130;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('I hereby confirm receipt of the above sales commission disbursement.', 14, finalY + 14);

  doc.text('Employee Signature: ________________________', 14, finalY + 28);
  doc.text('Approving Manager Signature: ________________________', 110, finalY + 28);

  doc.save(`Commission_Voucher_${payout.employeeName.replace(/\s+/g, '_')}_${payout.id}.pdf`);
};

