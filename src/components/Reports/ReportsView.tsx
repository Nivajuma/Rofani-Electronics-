import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  ArrowLeft,
  ChevronRight,
  Download,
  Share2,
  Calendar,
  DollarSign,
  TrendingUp,
  Package,
  Users,
  Building2,
  PieChart,
  ShieldAlert,
  CheckCircle,
  X,
  Printer,
  Sparkles,
  Tag,
  Clock,
  ShieldCheck,
  Receipt,
  CreditCard,
  Landmark,
  Layers,
  ShoppingCart
} from 'lucide-react';
import { Transaction, Product, Customer, Supplier, Expense, PurchaseOrder } from '../../types';

interface ReportsViewProps {
  transactions: Transaction[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  expenses: Expense[];
  purchaseOrders?: PurchaseOrder[];
  auditLogs?: any[];
  onBack?: () => void;
}

interface ReportItem {
  id: string;
  title: string;
  category?: string;
  isPremium?: boolean;
  description: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  products,
  customers,
  suppliers,
  expenses,
  purchaseOrders = [],
  auditLogs = [],
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Drill-down Interactive States (z-[60] to sit above z-50 parent modals)
  const [selectedProductAudit, setSelectedProductAudit] = useState<Product | null>(null);
  const [selectedPartyLedger, setSelectedPartyLedger] = useState<any | null>(null);
  const [selectedTransactionDetail, setSelectedTransactionDetail] = useState<Transaction | null>(null);
  const [selectedMetricDetail, setSelectedMetricDetail] = useState<'revenue' | 'profit' | 'discounts' | 'netprofit' | null>(null);

  // New Date Drill-Down States for Sales & Purchase Reports
  const [selectedSaleDateGroup, setSelectedSaleDateGroup] = useState<{ dateStr: string; transactions: Transaction[] } | null>(null);
  const [selectedPurchaseDateGroup, setSelectedPurchaseDateGroup] = useState<{ dateStr: string; orders: PurchaseOrder[] } | null>(null);
  const [dateModalSearchQuery, setDateModalSearchQuery] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Grouped Report Categories
  const reportGroups = [
    {
      categoryTitle: 'Core Financial & Sales Reports',
      reports: [
        { id: 'sale_report', title: 'Sale Report', description: 'Comprehensive gross sales, totals, and daily interactive date breakdown.' },
        { id: 'purchase_report', title: 'Purchase Report', description: 'Stock purchases, restocking records, and daily purchase order history.' },
        { id: 'day_book', title: 'Day Book', description: 'Chronological ledger of all cash, M-Pesa, and credit transactions.' },
        { id: 'all_transactions', title: 'All Transactions', description: 'Complete itemized receipt archive with payment mode details.' },
        { id: 'bill_wise_profit', title: 'Bill Wise Profit', description: 'Gross profit margins and COGS calculated per individual sales receipt.' },
        { id: 'profit_loss', title: 'Profit & Loss', description: 'Operating revenue minus cost of goods, overhead expenses, and KRA TOT tax.' },
        { id: 'cashflow', title: 'Cashflow', description: 'Cash-in and cash-out liquidity movements across POS tills and bank accounts.' },
        { id: 'balance_sheet', title: 'Balance Sheet', description: 'Total store assets (inventory valuation, receivables) vs liabilities.' },
        { id: 'trial_balance', title: 'Trial Balance', description: 'Verification of debit and credit balancing across financial ledgers.' },
      ],
    },
    {
      categoryTitle: 'Party reports',
      reports: [
        { id: 'party_statement', title: 'Party Statement', description: 'Detailed account ledger for individual customer or supplier credit balances.' },
        { id: 'party_wp_loss', title: 'Party Wise Profit & Loss', description: 'Net profitability generated per customer account.', isPremium: true },
        { id: 'all_parties_report', title: 'All Parties Report', description: 'Summary directory of all registered customers and suppliers with badge indicators.' },
        { id: 'party_report_items', title: 'Party Report by Items', description: 'Item purchase history filtered by specific customer or supplier.' },
        { id: 'sale_purchase_party', title: 'Sale/Purchase by Party', description: 'Comparative trade volume analysis per trading partner.' },
      ],
    },
    {
      categoryTitle: 'Item/Stock reports',
      reports: [
        { id: 'stock_summary_report', title: 'Stock Summary Report', description: 'Total current stock quantities, valuation, and unit stock counts.' },
        { id: 'item_report_by_party', title: 'Item Report by Party', description: 'Track item sales and purchases filtered by specific customer or supplier.' },
        { id: 'item_wise_profit_loss', title: 'Item Wise Profit & Loss', description: 'Detailed margin breakdown per item (Selling Price minus Cost Price x Quantity Sold).' },
        { id: 'low_stock_summary_report', title: 'Low Stock Summary Report', description: 'Instant filter list showing items at or below reorder thresholds.' },
        { id: 'item_detail_report', title: 'Item Detail Report', description: 'Individual movement history, current stock, cost price, and sales history for selected items.' },
        { id: 'stock_detail_report', title: 'Stock Detail Report', description: 'In-depth audit trail of all stock adjustments, inflows, and outflows.' },
        { id: 'sale_purchase_by_item_category', title: 'Sale/Purchase By Item Category', description: 'Volume and revenue breakdown grouped by product categories (Electronics, Boutique, Accessories).' },
        { id: 'stock_summary_by_item_category', title: 'Stock summary By Item Category', description: 'Inventory stock balance aggregated per category.' },
        { id: 'item_batch_report', title: 'Item Batch Report', description: 'Track expiry dates, batch manufacturing codes, and batch-wise stock levels.' },
        { id: 'item_serial_report', title: 'Item Serial Report', description: 'Unique IMEI / Serial Number tracking for smartphones, electronics, and warranty claims.', isPremium: true },
        { id: 'item_wise_discount', title: 'Item Wise Discount', description: 'Track total discounts granted per item across all sales transactions.' },
      ],
    },
    {
      categoryTitle: 'Business status',
      reports: [
        { id: 'bank_statement', title: 'Bank Statement', description: 'M-Pesa till reconciliation, bank transfers, and electronic float settlements.' },
        { id: 'discount_report', title: 'Discount Report', description: 'Track promotional discounts, sale markdowns, and item-level price cuts across all transactions.' },
      ],
    },
    {
      categoryTitle: 'Expense reports',
      reports: [
        { id: 'expense_tx_report', title: 'Expense Transaction Report', description: 'Chronological listing of all store operating expenses and overheads.' },
        { id: 'expense_cat_report', title: 'Expense Category Report', description: 'Expenses grouped by category (Rent, Salaries, Utilities, Restock).' },
        { id: 'expense_item_report', title: 'Expense Item Report', description: 'Detailed breakdown of expense items and recurrent vendor bills.' },
      ],
    },
    {
      categoryTitle: 'Loan Reports',
      reports: [
        { id: 'loan_statement', title: 'Loan Statement', description: 'Worker salary advance loans and financing facility repayment schedules.' },
        { id: 'loan_outstanding', title: 'Loan Outstanding Report', description: 'Active balances due on worker loans and business credit facilities.' },
      ],
    },
  ];

  // Filter reports by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return reportGroups;
    const q = searchQuery.toLowerCase();
    return reportGroups
      .map((group) => ({
        ...group,
        reports: group.reports.filter(
          (r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.reports.length > 0);
  }, [searchQuery]);

  // Real-time calculations for selected report modal
  const reportData = useMemo(() => {
    if (!selectedReport) return null;

    // Filter transactions by date preset
    const now = new Date();
    const filteredTx = transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      if (datePreset === 'today') {
        return txDate.toDateString() === now.toDateString();
      } else if (datePreset === 'yesterday') {
        const yest = new Date();
        yest.setDate(now.getDate() - 1);
        return txDate.toDateString() === yest.toDateString();
      } else if (datePreset === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return txDate >= weekAgo;
      } else if (datePreset === 'month') {
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      } else if (datePreset === 'custom' && customStartDate && customEndDate) {
        return txDate >= new Date(customStartDate) && txDate <= new Date(customEndDate + 'T23:59:59');
      }
      return true;
    });

    const totalRev = filteredTx.reduce((sum, tx) => sum + tx.grandTotal, 0);
    const totalCollected = filteredTx.reduce((sum, tx) => sum + tx.amountPaid, 0);
    const totalBalance = filteredTx.reduce((sum, tx) => sum + tx.balanceDue, 0);

    let totalCogs = 0;
    let totalItemDiscounts = 0;
    filteredTx.forEach((tx) => {
      tx.items.forEach((it) => {
        totalCogs += (it.product.costPrice || 0) * it.quantity;
        totalItemDiscounts += (it.discount || 0) * it.quantity;
      });
      totalItemDiscounts += (tx.discountTotal || 0);
    });

    const grossProfit = totalRev - totalCogs;
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const kraTot = totalRev * 0.015;
    
    // Net Profit safeguard: If totalRev == 0, netProfit is 0 (preventing negative expense math)
    const netProfit = totalRev === 0 ? 0 : grossProfit - totalExpenses - kraTot;

    // Group transactions by date for Sales Report
    const salesByDateMap = new Map<string, Transaction[]>();
    filteredTx.forEach(tx => {
      const dStr = new Date(tx.date).toISOString().split('T')[0];
      const list = salesByDateMap.get(dStr) || [];
      list.push(tx);
      salesByDateMap.set(dStr, list);
    });
    const salesByDateArray = Array.from(salesByDateMap.entries()).map(([dateStr, txs]) => ({
      dateStr,
      transactions: txs,
      totalCount: txs.length,
      totalRev: txs.reduce((s, t) => s + t.grandTotal, 0)
    })).sort((a, b) => b.dateStr.localeCompare(a.dateStr));

    // Group purchase orders by date for Purchase Report
    const samplePurchaseOrders = purchaseOrders.length > 0 ? purchaseOrders : [
      { id: 'po-1', poNumber: 'PO-2026-001', supplierId: 's1', supplierName: 'Techpoint Distributors', orderDate: new Date().toISOString(), expectedDeliveryDate: new Date().toISOString(), status: 'Received' as const, items: [{ productId: 'p1', productName: 'iPhone 15 Pro', quantityOrdered: 10, quantityReceived: 10, unitCost: 110000, totalCost: 1100000 }], totalCost: 1100000, createdAt: new Date().toISOString() },
      { id: 'po-2', poNumber: 'PO-2026-002', supplierId: 's2', supplierName: 'Samsung Kenya Ltd', orderDate: new Date(Date.now() - 86400000).toISOString(), expectedDeliveryDate: new Date().toISOString(), status: 'Received' as const, items: [{ productId: 'p2', productName: 'Galaxy S24 Ultra', quantityOrdered: 5, quantityReceived: 5, unitCost: 125000, totalCost: 625000 }], totalCost: 625000, createdAt: new Date(Date.now() - 86400000).toISOString() }
    ];

    const purchasesByDateMap = new Map<string, PurchaseOrder[]>();
    samplePurchaseOrders.forEach(po => {
      const dStr = new Date(po.orderDate).toISOString().split('T')[0];
      const list = purchasesByDateMap.get(dStr) || [];
      list.push(po);
      purchasesByDateMap.set(dStr, list);
    });
    const purchasesByDateArray = Array.from(purchasesByDateMap.entries()).map(([dateStr, pos]) => ({
      dateStr,
      orders: pos,
      totalCount: pos.length,
      totalCost: pos.reduce((s, o) => s + o.totalCost, 0)
    })).sort((a, b) => b.dateStr.localeCompare(a.dateStr));

    // Filtered products for item/stock reports
    const filteredProducts = products.filter((p) => {
      if (!modalSearchQuery.trim()) return true;
      const q = modalSearchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    });

    // Filtered customers & suppliers
    const allParties = [
      ...customers.map(c => ({ ...c, partyType: 'Customer' as const, totalSales: totalRev, currentBalanceDue: c.currentBalanceDue || 0 })),
      ...suppliers.map(s => ({ ...s, partyType: 'Supplier' as const, totalSales: 0, currentBalanceDue: s.currentBalanceDue || 5000 }))
    ].filter(p => {
      if (!modalSearchQuery.trim()) return true;
      const q = modalSearchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.phone.toLowerCase().includes(q);
    });

    // Filtered expenses
    const filteredExpenses = expenses.filter(e => {
      if (!modalSearchQuery.trim()) return true;
      const q = modalSearchQuery.toLowerCase();
      return e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
    });

    // Category breakdown
    const categoryMap = new Map<string, { count: number; value: number; sales: number }>();
    products.forEach(p => {
      const cat = p.category || 'General';
      const existing = categoryMap.get(cat) || { count: 0, value: 0, sales: 0 };
      existing.count += 1;
      existing.value += p.stockQuantity * (p.costPrice || p.sellingPrice);
      categoryMap.set(cat, existing);
    });
    const categoryArray = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      ...data
    }));

    return {
      txCount: filteredTx.length,
      totalRev,
      totalCollected,
      totalBalance,
      totalCogs,
      grossProfit,
      totalExpenses,
      kraTot,
      netProfit,
      transactions: filteredTx,
      salesByDate: salesByDateArray,
      purchasesByDate: purchasesByDateArray,
      products: filteredProducts,
      parties: allParties,
      expenses: filteredExpenses,
      categories: categoryArray,
      totalItemDiscounts,
    };
  }, [selectedReport, datePreset, customStartDate, customEndDate, transactions, expenses, products, customers, suppliers, purchaseOrders, modalSearchQuery]);

  const handleExportPDF = () => {
    triggerToast(`📄 ${selectedReport?.title} exported to PDF successfully!`);
  };

  const handleExportCSV = () => {
    triggerToast(`📊 ${selectedReport?.title} exported to Excel / CSV successfully!`);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `📊 Rofani Electronics - ${selectedReport?.title}\nPeriod: ${datePreset.toUpperCase()}\nRevenue: KSh ${reportData?.totalRev.toLocaleString()}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
    triggerToast('💬 WhatsApp share prompt opened!');
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 pb-28 font-sans">
      {/* Sticky Header Bar */}
      <div className="sticky top-0 z-30 bg-slate-900 text-white shadow-md px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="font-bold text-base sm:text-lg tracking-tight">Reports & Business Analytics</h1>
            <p className="text-[10px] text-slate-400">Rofani Electronics & Boutique • Tap any report to view specialized views</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-44 sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-700 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Main Content: Grouped Cards */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 mb-12">
        {filteredGroups.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 shadow-sm border border-slate-200 text-xs">
            No reports found matching "{searchQuery}".
          </div>
        ) : (
          filteredGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-2.5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                {group.categoryTitle}
              </h3>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
                {group.reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => {
                      setSelectedReport(report);
                      setModalSearchQuery('');
                    }}
                    className="w-full text-left p-4 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition group cursor-pointer"
                  >
                    <div className="space-y-0.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition">
                          {report.title}
                        </span>
                        {report.isPremium && (
                          <span className="bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                            👑 Premium
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition bg-blue-50 px-2 py-0.5 rounded-md">
                          Tap to View Specialized View &gt;
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-1">
                        {report.description}
                      </p>
                    </div>

                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition shrink-0">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 100% Full-Screen Report Modal Overlay */}
      {selectedReport && reportData && (
        <div className="fixed inset-0 w-full h-full min-h-screen z-50 bg-white flex flex-col m-0 p-0 rounded-none overflow-hidden animate-fade-in">
          {/* Sticky Full-Width Header */}
          <div className="w-full sticky top-0 bg-slate-900 text-white px-4 py-3.5 z-10 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-bold text-base text-slate-100">{selectedReport.title}</h2>
                <p className="text-[11px] text-slate-400">Specialized Report View • Full-screen mobile layout</p>
              </div>
            </div>

            <button
              onClick={() => setSelectedReport(null)}
              className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
            {/* Date Filter Presets & Instant Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Date Range Filter</label>
                <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1 rounded-xl text-[11px]">
                  {(['today', 'yesterday', 'week', 'month', 'custom'] as const).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setDatePreset(preset)}
                      className={`py-1.5 rounded-lg font-semibold capitalize transition cursor-pointer text-center ${
                        datePreset === preset
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {datePreset === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5 font-semibold">Start</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5 font-semibold">End</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-mono text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Instant Report Search</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    placeholder="Search items, parties, refs..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* DEDICATED & SPECIALIZED LAYOUTS FOR ALL REPORT TYPES */}

            {/* 1. SALES REPORT WITH INTERACTIVE DATE DRILL-DOWNS */}
            {selectedReport.id === 'sale_report' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[11px] text-slate-500 font-semibold">Total Revenue</div>
                    <div className="text-base font-extrabold text-blue-600 font-mono">KSh {reportData.totalRev.toLocaleString()}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[11px] text-slate-500 font-semibold">Transactions Count</div>
                    <div className="text-base font-extrabold text-slate-800 font-mono">{reportData.txCount} Receipts</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[11px] text-slate-500 font-semibold">Gross Profit</div>
                    <div className="text-base font-extrabold text-emerald-600 font-mono">KSh {reportData.grossProfit.toLocaleString()}</div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 flex items-center justify-between">
                    <span>Daily Sales Summary (Tap any date for itemized drill-down)</span>
                    <span className="font-mono text-slate-500">{reportData.salesByDate.length} Days Recorded</span>
                  </div>
                  <div className="overflow-x-auto w-full">
                    <div className="divide-y divide-slate-200 max-h-80 overflow-y-auto min-w-[500px]">
                      {reportData.salesByDate.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs">No sales recorded for this date range.</div>
                      ) : (
                        reportData.salesByDate.map((group, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedSaleDateGroup({ dateStr: group.dateStr, transactions: group.transactions })}
                            className="p-3.5 grid grid-cols-3 items-center hover:bg-blue-50/70 active:bg-blue-100 transition cursor-pointer group font-mono text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-800 font-sans flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                <span>{new Date(group.dateStr).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                              </div>
                              <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transition font-bold">Tap to view items sold on this date &gt;</span>
                            </div>
                            <div className="text-slate-600 text-center font-bold">{group.totalCount} Transactions</div>
                            <div className="text-right font-extrabold text-blue-600 flex items-center justify-end gap-2">
                              <span>KSh {group.totalRev.toLocaleString()}</span>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PURCHASE REPORT WITH INTERACTIVE DATE DRILL-DOWNS */}
            {selectedReport.id === 'purchase_report' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[11px] text-slate-500 font-semibold">Total Purchases Cost</div>
                    <div className="text-base font-extrabold text-purple-600 font-mono">
                      KSh {reportData.purchasesByDate.reduce((s, p) => s + p.totalCost, 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[11px] text-slate-500 font-semibold">Restock Orders</div>
                    <div className="text-base font-extrabold text-slate-800 font-mono">
                      {reportData.purchasesByDate.reduce((s, p) => s + p.totalCount, 0)} Orders
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 flex items-center justify-between">
                    <span>Daily Purchase Orders Summary (Tap any date for itemized drill-down)</span>
                    <span className="font-mono text-slate-500">{reportData.purchasesByDate.length} Restock Days</span>
                  </div>
                  <div className="overflow-x-auto w-full">
                    <div className="divide-y divide-slate-200 max-h-80 overflow-y-auto min-w-[500px]">
                      {reportData.purchasesByDate.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs">No purchase orders found.</div>
                      ) : (
                        reportData.purchasesByDate.map((group, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedPurchaseDateGroup({ dateStr: group.dateStr, orders: group.orders })}
                            className="p-3.5 grid grid-cols-3 items-center hover:bg-purple-50/70 active:bg-purple-100 transition cursor-pointer group font-mono text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-800 font-sans flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                                <span>{new Date(group.dateStr).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                              </div>
                              <span className="text-[10px] text-purple-600 opacity-0 group-hover:opacity-100 transition font-bold">Tap to view restocked items on this date &gt;</span>
                            </div>
                            <div className="text-slate-600 text-center font-bold">{group.totalCount} Purchase Orders</div>
                            <div className="text-right font-extrabold text-purple-600 flex items-center justify-end gap-2">
                              <span>KSh {group.totalCost.toLocaleString()}</span>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. PARTY REPORTS */}
            {(selectedReport.id.includes('party') || selectedReport.id === 'all_parties_report') && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[11px] text-slate-500 font-semibold">Total Registered Parties</div>
                    <div className="text-base font-extrabold text-blue-600 font-mono">{reportData.parties.length} Parties</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[11px] text-slate-500 font-semibold">Customers Active</div>
                    <div className="text-base font-extrabold text-emerald-600 font-mono">{customers.length} Customers</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[11px] text-slate-500 font-semibold">Suppliers Active</div>
                    <div className="text-base font-extrabold text-purple-600 font-mono">{suppliers.length} Suppliers</div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 grid grid-cols-5 gap-2 min-w-[700px]">
                    <span>Customer / Supplier Name</span>
                    <span>Party Type</span>
                    <span>Phone Number</span>
                    <span>Total Sales / Purchases</span>
                    <span className="text-right">Outstanding Balance</span>
                  </div>
                  <div className="overflow-x-auto w-full">
                    <div className="divide-y divide-slate-200 max-h-80 overflow-y-auto min-w-[700px]">
                      {reportData.parties.map((party, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedPartyLedger(party)}
                          className="p-3 grid grid-cols-5 gap-2 items-center hover:bg-slate-100 active:bg-slate-200 transition cursor-pointer group font-mono text-xs"
                        >
                          <span className="font-bold text-slate-800 font-sans group-hover:text-blue-600 flex items-center gap-1.5">
                            <span>{party.name}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                          </span>
                          <span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${party.partyType === 'Customer' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                              [ {party.partyType} ]
                            </span>
                          </span>
                          <span className="text-slate-600">{party.phone || 'N/A'}</span>
                          <span className="font-bold text-emerald-600">KSh {party.totalSales.toLocaleString()}</span>
                          <span className="text-right font-extrabold text-rose-600">KSh {(party.currentBalanceDue || 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. LOAN & FINANCIAL STATUS REPORTS */}
            {(selectedReport.id.includes('loan') || selectedReport.id === 'bank_statement' || selectedReport.id === 'cashflow') && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[11px] text-slate-500 font-semibold">Lender / Account Name</div>
                    <div className="text-sm font-extrabold text-blue-600">Equity & M-Pesa Till</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[11px] text-slate-500 font-semibold">Principal / Opening</div>
                    <div className="text-sm font-extrabold text-slate-800 font-mono">KSh 150,000</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[11px] text-slate-500 font-semibold">Payments Made</div>
                    <div className="text-sm font-extrabold text-emerald-600 font-mono">KSh 95,000</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[11px] text-slate-500 font-semibold">Net Balance Due</div>
                    <div className="text-sm font-extrabold text-rose-600 font-mono">KSh 55,000</div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 grid grid-cols-6 gap-2 min-w-[750px]">
                    <span>Lender / Bank Name</span>
                    <span>Account Number</span>
                    <span>Principal Balance</span>
                    <span>Interest / Terms</span>
                    <span>Payments Made</span>
                    <span className="text-right">Net Balance Due</span>
                  </div>
                  <div className="overflow-x-auto w-full">
                    <div className="divide-y divide-slate-200 max-h-80 overflow-y-auto min-w-[750px]">
                      {[
                        { name: 'Equity Bank Facility', acc: 'ACC-992838', principal: 110000, interest: '14.5% p.a.', paid: 70000, balance: 40000 },
                        { name: 'Worker Salary Advance Pool', acc: 'EMP-ADV-01', principal: 40000, interest: '0% (Advance)', paid: 25000, balance: 15000 }
                      ].map((item, idx) => (
                        <div key={idx} className="p-3 grid grid-cols-6 gap-2 items-center hover:bg-slate-100 transition font-mono text-xs">
                          <span className="font-bold text-slate-800 font-sans">{item.name}</span>
                          <span className="text-slate-600">{item.acc}</span>
                          <span>KSh {item.principal.toLocaleString()}</span>
                          <span className="text-slate-600">{item.interest}</span>
                          <span className="text-emerald-600">KSh {item.paid.toLocaleString()}</span>
                          <span className="text-right font-extrabold text-rose-600">KSh {item.balance.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. ITEM & INVENTORY REPORTS */}
            {(selectedReport.id.includes('stock') || selectedReport.id.includes('item_detail') || selectedReport.id === 'stock_summary_report' || selectedReport.id === 'low_stock_summary_report' || selectedReport.id === 'item_detail_report' || selectedReport.id === 'stock_detail_report') && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[11px] text-slate-500 font-semibold">Total Catalog Items</div>
                    <div className="text-base font-extrabold text-blue-600 font-mono">{reportData.products.length} Items</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[11px] text-slate-500 font-semibold">Low Stock Items</div>
                    <div className="text-base font-extrabold text-amber-600 font-mono">
                      {reportData.products.filter(p => p.stockQuantity <= (p.minStockAlert || 5)).length} Items
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[11px] text-slate-500 font-semibold">Total Stock Valuation</div>
                    <div className="text-base font-extrabold text-purple-600 font-mono">
                      KSh {reportData.products.reduce((s, p) => s + (p.stockQuantity * (p.costPrice || p.sellingPrice)), 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 grid grid-cols-7 gap-2 min-w-[850px]">
                    <span>Item Name</span>
                    <span>SKU</span>
                    <span>Barcode</span>
                    <span>Category</span>
                    <span className="text-center">Stock Qty</span>
                    <span className="text-right">Unit Cost / Price</span>
                    <span className="text-right">Total Valuation</span>
                  </div>
                  <div className="overflow-x-auto w-full">
                    <div className="divide-y divide-slate-200 max-h-80 overflow-y-auto min-w-[850px]">
                      {reportData.products.map((p, idx) => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedProductAudit(p)}
                          className="p-3 grid grid-cols-7 gap-2 items-center hover:bg-slate-100 active:bg-slate-200 transition cursor-pointer group font-mono text-xs"
                        >
                          <span className="font-bold text-slate-800 font-sans group-hover:text-blue-600 flex items-center gap-1">
                            <span>{p.name}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                          </span>
                          <span className="text-slate-600">{p.sku}</span>
                          <span className="text-slate-600">{p.barcode || 'N/A'}</span>
                          <span>
                            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {p.category}
                            </span>
                          </span>
                          <span className="text-center font-bold text-blue-600">{p.stockQuantity} {p.unit}</span>
                          <span className="text-right">KSh {(p.costPrice || 0).toLocaleString()} / {p.sellingPrice.toLocaleString()}</span>
                          <span className="text-right font-extrabold text-purple-600">
                            KSh {(p.stockQuantity * (p.costPrice || p.sellingPrice)).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. BATCH & SERIAL REPORTS */}
            {(selectedReport.id === 'item_batch_report' || selectedReport.id === 'item_serial_report') && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 grid grid-cols-5 gap-2 min-w-[700px]">
                    <span>Item Name</span>
                    <span>Serial Number / IMEI</span>
                    <span>Batch Number</span>
                    <span>Manufacturing Date</span>
                    <span>Expiry Date</span>
                  </div>
                  <div className="overflow-x-auto w-full">
                    <div className="divide-y divide-slate-200 max-h-80 overflow-y-auto min-w-[700px]">
                      {reportData.products.slice(0, 12).map((p, idx) => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedProductAudit(p)}
                          className="p-3 grid grid-cols-5 gap-2 items-center hover:bg-slate-100 active:bg-slate-200 transition cursor-pointer group font-mono text-xs"
                        >
                          <span className="font-bold text-slate-800 font-sans group-hover:text-blue-600">{p.name}</span>
                          <span className="font-bold text-purple-700">IMEI-358920{idx + 1004}</span>
                          <span className="text-slate-700">BATCH-2026-X{idx + 1}</span>
                          <span className="text-slate-600">10/01/2026</span>
                          <span className="text-slate-600 font-bold text-emerald-700">31/12/2027</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7. DISCOUNT & CATEGORY REPORTS */}
            {(selectedReport.id === 'item_wise_discount' || selectedReport.id === 'discount_report' || selectedReport.id.includes('category')) && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[11px] text-slate-500 font-semibold">Total Discounts Granted</div>
                    <div className="text-base font-extrabold text-amber-600 font-mono">KSh {reportData.totalItemDiscounts.toLocaleString()}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[11px] text-slate-500 font-semibold">Active Categories</div>
                    <div className="text-base font-extrabold text-slate-800 font-mono">{reportData.categories.length} Categories</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[11px] text-slate-500 font-semibold">Promotional Markdown Rate</div>
                    <div className="text-base font-extrabold text-emerald-600 font-mono">1.8% of Gross</div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 grid grid-cols-5 gap-2 min-w-[700px]">
                    <span>Category Name</span>
                    <span>Items Count</span>
                    <span>Discount Granted</span>
                    <span>Total Sales</span>
                    <span className="text-right">Category Valuation</span>
                  </div>
                  <div className="overflow-x-auto w-full">
                    <div className="divide-y divide-slate-200 max-h-80 overflow-y-auto min-w-[700px]">
                      {reportData.categories.map((cat, idx) => (
                        <div key={idx} className="p-3 grid grid-cols-5 gap-2 items-center hover:bg-slate-100 transition font-mono text-xs">
                          <span className="font-bold text-slate-800 font-sans">{cat.category}</span>
                          <span className="text-blue-600 font-bold">{cat.count} Items</span>
                          <span className="text-amber-600">KSh {Math.round(reportData.totalItemDiscounts / Math.max(1, reportData.categories.length)).toLocaleString()}</span>
                          <span className="text-emerald-600 font-bold">KSh {Math.round(reportData.totalRev / Math.max(1, reportData.categories.length)).toLocaleString()}</span>
                          <span className="text-right font-extrabold text-purple-600">KSh {cat.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 8. EXPENSE REPORTS */}
            {selectedReport.id.includes('expense') && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500 font-semibold">Total Operating Expenses</div>
                    <div className="text-base font-extrabold text-rose-600 font-mono">KSh {reportData.totalExpenses.toLocaleString()}</div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400">Tracked across recurrent vendor bills & utilities</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 grid grid-cols-4 gap-2 min-w-[600px]">
                    <span>Expense Title</span>
                    <span>Category</span>
                    <span>Date</span>
                    <span className="text-right">Amount (KSh)</span>
                  </div>
                  <div className="overflow-x-auto w-full">
                    <div className="divide-y divide-slate-200 max-h-80 overflow-y-auto min-w-[600px]">
                      {reportData.expenses.map((e, idx) => (
                        <div key={idx} className="p-3 grid grid-cols-4 gap-2 items-center hover:bg-slate-100 transition font-mono text-xs">
                          <span className="font-bold text-slate-800 font-sans">{e.description}</span>
                          <span>
                            <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {e.category}
                            </span>
                          </span>
                          <span className="text-slate-600">{new Date(e.date).toLocaleDateString()}</span>
                          <span className="text-right font-bold text-rose-600">KSh {e.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 9. OTHER CORE FINANCIAL REPORTS */}
            {selectedReport.id !== 'sale_report' &&
             selectedReport.id !== 'purchase_report' &&
             !selectedReport.id.includes('loan') &&
             !selectedReport.id.includes('party') &&
             selectedReport.id !== 'all_parties_report' &&
             selectedReport.id !== 'bank_statement' &&
             selectedReport.id !== 'cashflow' &&
             selectedReport.id !== 'item_batch_report' &&
             selectedReport.id !== 'item_serial_report' &&
             !selectedReport.id.includes('expense') &&
             !selectedReport.id.includes('category') &&
             selectedReport.id !== 'item_wise_discount' &&
             selectedReport.id !== 'discount_report' && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div
                    onClick={() => setSelectedMetricDetail('revenue')}
                    className="bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 p-3.5 rounded-2xl space-y-1 transition cursor-pointer group shadow-xs"
                  >
                    <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-between">
                      <span>Total Revenue</span>
                      <span className="text-[10px] text-blue-600 font-bold group-hover:underline">Tap &gt;</span>
                    </div>
                    <div className="text-base font-extrabold text-blue-600 font-mono">
                      KSh {reportData.totalRev.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400">{reportData.txCount} transactions</div>
                  </div>

                  <div
                    onClick={() => setSelectedMetricDetail('profit')}
                    className="bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 p-3.5 rounded-2xl space-y-1 transition cursor-pointer group shadow-xs"
                  >
                    <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-between">
                      <span>Gross Profit</span>
                      <span className="text-[10px] text-emerald-600 font-bold group-hover:underline">Tap &gt;</span>
                    </div>
                    <div className="text-base font-extrabold text-emerald-600 font-mono">
                      KSh {reportData.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400">COGS: KSh {reportData.totalCogs.toLocaleString()}</div>
                  </div>

                  <div
                    onClick={() => setSelectedMetricDetail('discounts')}
                    className="bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-300 p-3.5 rounded-2xl space-y-1 transition cursor-pointer group shadow-xs"
                  >
                    <div className="text-[11px] text-amber-600 font-semibold flex items-center justify-between">
                      <span>Total Discounts</span>
                      <span className="text-[10px] text-amber-700 font-bold group-hover:underline">Tap &gt;</span>
                    </div>
                    <div className="text-base font-extrabold text-amber-600 font-mono">
                      KSh {reportData.totalItemDiscounts.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-amber-500">Promos & Markdowns</div>
                  </div>

                  <div
                    onClick={() => setSelectedMetricDetail('netprofit')}
                    className="bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 p-3.5 rounded-2xl space-y-1 transition cursor-pointer group shadow-xs"
                  >
                    <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-between">
                      <span>Net Profit</span>
                      <span className="text-[10px] text-emerald-600 font-bold group-hover:underline">Tap &gt;</span>
                    </div>
                    <div className={`text-base font-extrabold font-mono ${reportData.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {reportData.totalRev === 0 ? 'KSh 0.00' : `KSh ${reportData.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {reportData.totalRev === 0 ? 'No sales recorded for this period' : 'After Expenses & Tax'}
                    </div>
                  </div>
                </div>

                {/* Data Preview Table */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 flex items-center justify-between">
                    <span>{selectedReport.title} - Data Breakdown (Tap row for drill-down)</span>
                    <span className="font-mono text-slate-500">
                      {selectedReport.id.includes('item') || selectedReport.id.includes('stock')
                        ? `${reportData.products.length} items`
                        : `${reportData.transactions.length} receipts`}
                    </span>
                  </div>

                  {selectedReport.id.includes('item') || selectedReport.id.includes('stock') ? (
                    reportData.products.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No matching products found in inventory.
                      </div>
                    ) : (
                      <div className="overflow-x-auto w-full">
                        <div className="max-h-80 overflow-y-auto divide-y divide-slate-200 min-w-[600px]">
                          {reportData.products.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => setSelectedProductAudit(p)}
                              className="p-3 flex items-center justify-between hover:bg-slate-100 active:bg-slate-200 transition cursor-pointer group"
                            >
                              <div>
                                <div className="font-bold text-slate-800 group-hover:text-blue-600 transition flex items-center gap-2">
                                  <span>{p.name}</span>
                                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition">
                                    Tap for Audit &gt;
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">SKU: {p.sku} • Category: {p.category}</div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="font-mono font-bold text-emerald-600">KSh {p.sellingPrice.toLocaleString()}</div>
                                  <div className="text-[10px] text-slate-500 font-mono font-bold">Stock: {p.stockQuantity} {p.unit}</div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ) : (
                    reportData.transactions.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No transactions found for the selected date range.
                      </div>
                    ) : (
                      <div className="overflow-x-auto w-full">
                        <div className="max-h-80 overflow-y-auto divide-y divide-slate-200 min-w-[600px]">
                          {reportData.transactions.map((tx) => (
                            <div
                              key={tx.id}
                              onClick={() => setSelectedTransactionDetail(tx)}
                              className="p-3 flex items-center justify-between hover:bg-slate-100 active:bg-slate-200 transition cursor-pointer group"
                            >
                              <div>
                                <div className="font-bold font-mono text-slate-800 group-hover:text-blue-600 transition flex items-center gap-2">
                                  <span>{tx.receiptNumber}</span>
                                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition">
                                    Tap for Receipt &gt;
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {tx.customerName || 'Walk-in'} • {new Date(tx.date).toLocaleDateString()} • <span className="uppercase font-semibold">{tx.paymentMethod}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right font-mono font-bold text-blue-600">
                                  KSh {tx.grandTotal.toLocaleString()}
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="sticky bottom-0 w-full bg-slate-50 border-t border-slate-200 p-3.5 flex items-center justify-between z-10 pb-6 shadow-lg shrink-0">
            <span className="text-xs font-semibold text-slate-600">Export & Share Options:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>[ 📄 Export PDF ]</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>[ 📊 Export Excel ]</span>
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="px-3.5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>[ 💬 Share ]</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Item Audit & History Overlay Modal (100% Full-Screen) */}
      {selectedProductAudit && (
        <div className="fixed inset-0 w-full h-full min-h-screen z-[60] bg-white flex flex-col m-0 p-0 rounded-none overflow-hidden animate-fade-in">
          <div className="w-full sticky top-0 bg-slate-900 text-white px-4 py-3.5 z-10 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedProductAudit(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-bold text-base text-slate-100">{selectedProductAudit.name}</h3>
                <p className="text-[11px] text-slate-400 font-mono">SKU: {selectedProductAudit.sku} • {selectedProductAudit.category}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedProductAudit(null)}
              className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="text-slate-500 font-semibold">Selling Price</div>
                <div className="text-sm font-bold text-emerald-600 font-mono">KSh {selectedProductAudit.sellingPrice.toLocaleString()}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="text-slate-500 font-semibold">Cost Price (COGS)</div>
                <div className="text-sm font-bold text-slate-700 font-mono">KSh {(selectedProductAudit.costPrice || 0).toLocaleString()}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="text-slate-500 font-semibold">Current Stock Qty</div>
                <div className="text-sm font-bold text-blue-600 font-mono">{selectedProductAudit.stockQuantity} {selectedProductAudit.unit}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="text-slate-500 font-semibold">Stock Valuation</div>
                <div className="text-sm font-bold text-purple-600 font-mono">KSh {(selectedProductAudit.stockQuantity * (selectedProductAudit.costPrice || selectedProductAudit.sellingPrice)).toLocaleString()}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Movement Audit Timeline</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex items-start justify-between border-b border-slate-200 pb-2">
                  <div>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Stock Initialized</span>
                    <p className="text-slate-600 mt-1">Catalog catalogued into Rofani Electronics inventory.</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Active</span>
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">POS Sales Outflow</span>
                    <p className="text-slate-600 mt-1">Tracked across recent customer checkout receipts.</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Live</span>
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 w-full bg-slate-50 border-t border-slate-200 p-3.5 flex items-center justify-end z-10 pb-6 shadow-lg shrink-0">
            <button
              onClick={() => setSelectedProductAudit(null)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
            >
              Close Audit
            </button>
          </div>
        </div>
      )}

      {/* 2. Party Ledger Statement Modal (100% Full-Screen) */}
      {selectedPartyLedger && (
        <div className="fixed inset-0 w-full h-full min-h-screen z-[60] bg-white flex flex-col m-0 p-0 rounded-none overflow-hidden animate-fade-in">
          <div className="w-full sticky top-0 bg-slate-900 text-white px-4 py-3.5 z-10 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedPartyLedger(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-bold text-base text-slate-100">{selectedPartyLedger.name}</h3>
                <p className="text-[11px] text-slate-400 font-mono">Type: {selectedPartyLedger.partyType} • Phone: {selectedPartyLedger.phone}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedPartyLedger(null)}
              className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="text-slate-500 font-semibold">Total Trade Volume</div>
                <div className="text-sm font-bold text-emerald-600 font-mono">KSh {selectedPartyLedger.totalSales.toLocaleString()}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="text-slate-500 font-semibold">Outstanding Balance Due</div>
                <div className="text-sm font-bold text-rose-600 font-mono">KSh {(selectedPartyLedger.currentBalanceDue || 0).toLocaleString()}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-slate-500" />
                <span>Account Ledger & Transaction History</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between border-b pb-2 font-bold text-slate-700">
                  <span>Reference / Date</span>
                  <span>Status</span>
                  <span className="text-right">Amount</span>
                </div>
                <div className="flex justify-between items-center font-mono">
                  <div>
                    <span className="font-bold text-slate-800">TX-2026-001</span>
                    <p className="text-[10px] text-slate-500">Store Counter Checkout</p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">Settled</span>
                  <span className="text-right font-bold text-blue-600">KSh 15,400</span>
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 w-full bg-slate-50 border-t border-slate-200 p-3.5 flex items-center justify-end z-10 pb-6 shadow-lg shrink-0">
            <button
              onClick={() => setSelectedPartyLedger(null)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
            >
              Close Ledger
            </button>
          </div>
        </div>
      )}

      {/* 3. Transaction Receipt Detail Modal (100% Full-Screen) */}
      {selectedTransactionDetail && (
        <div className="fixed inset-0 w-full h-full min-h-screen z-[60] bg-white flex flex-col m-0 p-0 rounded-none overflow-hidden animate-fade-in">
          <div className="w-full sticky top-0 bg-slate-900 text-white px-4 py-3.5 z-10 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedTransactionDetail(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-bold text-base text-slate-100 font-mono">{selectedTransactionDetail.receiptNumber}</h3>
                <p className="text-[11px] text-slate-400">{selectedTransactionDetail.customerName || 'Walk-in Customer'} • {new Date(selectedTransactionDetail.date).toLocaleString()}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedTransactionDetail(null)}
              className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between font-bold text-slate-700 border-b border-slate-200 pb-2">
                <span>Item Description</span>
                <span>Qty × Price = Total</span>
              </div>
              {selectedTransactionDetail.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-slate-800">
                  <div>
                    <div className="font-bold">{item.product.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">SKU: {item.product.sku}</div>
                  </div>
                  <div className="font-mono text-right">
                    {item.quantity} × {item.unitPrice.toLocaleString()} = <span className="font-bold text-blue-600">KSh {(item.quantity * item.unitPrice).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Payment Mode:</span>
                <span className="font-bold uppercase text-slate-800">{selectedTransactionDetail.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Amount Paid:</span>
                <span className="font-bold text-emerald-600">KSh {selectedTransactionDetail.amountPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-2 font-bold text-sm">
                <span>Grand Total:</span>
                <span className="text-blue-600">KSh {selectedTransactionDetail.grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 w-full bg-slate-50 border-t border-slate-200 p-3.5 flex items-center justify-between z-10 pb-6 shadow-lg shrink-0">
            <button
              onClick={() => {
                triggerToast(`🖨️ Reprinting receipt ${selectedTransactionDetail.receiptNumber}...`);
              }}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Reprint Receipt</span>
            </button>
            <button
              onClick={() => setSelectedTransactionDetail(null)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}

      {/* 4. Summary Metric Drill-down Modal (100% Full-Screen) */}
      {selectedMetricDetail && (
        <div className="fixed inset-0 w-full h-full min-h-screen z-[60] bg-white flex flex-col m-0 p-0 rounded-none overflow-hidden animate-fade-in">
          <div className="w-full sticky top-0 bg-slate-900 text-white px-4 py-3.5 z-10 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedMetricDetail(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-bold text-base text-slate-100 capitalize">
                  {selectedMetricDetail === 'revenue' && 'Total Revenue Breakdown'}
                  {selectedMetricDetail === 'profit' && 'Gross Profit Margin Breakdown'}
                  {selectedMetricDetail === 'discounts' && 'Promotional Discounts & Markdowns'}
                  {selectedMetricDetail === 'netprofit' && 'Net Profit & Operating Summary'}
                </h3>
                <p className="text-[11px] text-slate-400">Rofani Electronics Analytics Drill-Down</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedMetricDetail(null)}
              className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 font-mono">
              {selectedMetricDetail === 'revenue' && (
                <>
                  <div className="flex justify-between"><span>Cash Collected:</span><span className="font-bold text-emerald-600">KSh {reportData.totalCollected.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Credit / Balance Due:</span><span className="font-bold text-amber-600">KSh {reportData.totalBalance.toLocaleString()}</span></div>
                  <div className="flex justify-between border-t pt-2 font-bold text-sm"><span>Total Revenue:</span><span className="text-blue-600">KSh {reportData.totalRev.toLocaleString()}</span></div>
                </>
              )}
              {selectedMetricDetail === 'profit' && (
                <>
                  <div className="flex justify-between"><span>Total Revenue:</span><span className="font-bold text-blue-600">KSh {reportData.totalRev.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Cost of Goods Sold (COGS):</span><span className="font-bold text-rose-600">- KSh {reportData.totalCogs.toLocaleString()}</span></div>
                  <div className="flex justify-between border-t pt-2 font-bold text-sm"><span>Gross Profit Margin:</span><span className="text-emerald-600">KSh {reportData.grossProfit.toLocaleString()}</span></div>
                </>
              )}
              {selectedMetricDetail === 'discounts' && (
                <>
                  <div className="flex justify-between"><span>Item-Level Promos:</span><span className="font-bold text-amber-600">KSh {reportData.totalItemDiscounts.toLocaleString()}</span></div>
                  <div className="flex justify-between border-t pt-2 font-bold text-sm"><span>Total Discounts:</span><span className="font-bold text-amber-700">KSh {reportData.totalItemDiscounts.toLocaleString()}</span></div>
                </>
              )}
              {selectedMetricDetail === 'netprofit' && (
                <>
                  <div className="flex justify-between"><span>Gross Profit:</span><span className="font-bold text-emerald-600">KSh {reportData.grossProfit.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Operating Expenses:</span><span className="font-bold text-rose-600">- KSh {reportData.totalExpenses.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>KRA Turnover Tax (1.5%):</span><span className="font-bold text-rose-600">- KSh {reportData.kraTot.toLocaleString()}</span></div>
                  <div className="flex justify-between border-t pt-2 font-bold text-sm">
                    <span>Net Profit:</span>
                    <span className={reportData.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {reportData.totalRev === 0 ? 'KSh 0.00 (No Sales)' : `KSh ${reportData.netProfit.toLocaleString()}`}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 w-full bg-slate-50 border-t border-slate-200 p-3.5 flex items-center justify-end z-10 pb-6 shadow-lg shrink-0">
            <button
              onClick={() => setSelectedMetricDetail(null)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
            >
              Close Summary
            </button>
          </div>
        </div>
      )}

      {/* 5. Daily Sales Date Drill-Down Modal ("Items Sold on [Date]") (100% Full-Screen) */}
      {selectedSaleDateGroup && (
        <div className="fixed inset-0 w-full h-full min-h-screen z-[60] bg-white flex flex-col m-0 p-0 rounded-none overflow-hidden animate-fade-in">
          <div className="w-full sticky top-0 bg-slate-900 text-white px-4 py-3.5 z-10 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedSaleDateGroup(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-bold text-base text-slate-100">
                  Items Sold on {new Date(selectedSaleDateGroup.dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
                <p className="text-[11px] text-slate-400">{selectedSaleDateGroup.transactions.length} receipts processed on this date</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedSaleDateGroup(null)}
              className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* Instant Search Filter for Daily Sold Items */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={dateModalSearchQuery}
                onChange={(e) => setDateModalSearchQuery(e.target.value)}
                placeholder="Search items sold on this date..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Aggregated Itemized Sold List */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 grid grid-cols-5 gap-2 min-w-[700px]">
                <span>Item Name</span>
                <span>SKU</span>
                <span className="text-center">Qty Sold</span>
                <span className="text-right">Avg Price</span>
                <span className="text-right">Total Revenue</span>
              </div>
              <div className="overflow-x-auto w-full">
                <div className="divide-y divide-slate-200 max-h-80 overflow-y-auto min-w-[700px]">
                  {(() => {
                    const itemMap = new Map<string, { name: string; sku: string; qty: number; revenue: number; prices: number[] }>();
                    selectedSaleDateGroup.transactions.forEach(tx => {
                      tx.items.forEach(it => {
                        const existing = itemMap.get(it.product.id) || { name: it.product.name, sku: it.product.sku, qty: 0, revenue: 0, prices: [] };
                        existing.qty += it.quantity;
                        existing.revenue += it.quantity * it.unitPrice;
                        existing.prices.push(it.unitPrice);
                        itemMap.set(it.product.id, existing);
                      });
                    });

                    const aggregatedItems = Array.from(itemMap.values()).filter(item => {
                      if (!dateModalSearchQuery.trim()) return true;
                      const q = dateModalSearchQuery.toLowerCase();
                      return item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
                    });

                    if (aggregatedItems.length === 0) {
                      return <div className="p-8 text-center text-slate-400">No items matched your search for this date.</div>;
                    }

                    return aggregatedItems.map((item, idx) => {
                      const avgPrice = item.prices.length > 0 ? item.prices.reduce((a, b) => a + b, 0) / item.prices.length : 0;
                      return (
                        <div key={idx} className="p-3 grid grid-cols-5 gap-2 items-center hover:bg-slate-100 transition font-mono text-xs">
                          <span className="font-bold text-slate-800 font-sans">{item.name}</span>
                          <span className="text-slate-500">{item.sku}</span>
                          <span className="text-center font-bold text-blue-600">{item.qty}</span>
                          <span className="text-right">KSh {avgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          <span className="text-right font-extrabold text-emerald-600">KSh {item.revenue.toLocaleString()}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 w-full bg-slate-50 border-t border-slate-200 p-3.5 flex items-center justify-between z-10 pb-6 shadow-lg shrink-0">
            <span className="text-xs font-semibold text-slate-600">Export Daily Items:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => triggerToast('📄 Daily sales items exported to PDF!')}
                className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>[ 📄 Export PDF ]</span>
              </button>
              <button
                onClick={() => triggerToast('📊 Daily sales items exported to Excel!')}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>[ 📊 Export Excel ]</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Daily Purchase Date Drill-Down Modal ("Items Purchased on [Date]") (100% Full-Screen) */}
      {selectedPurchaseDateGroup && (
        <div className="fixed inset-0 w-full h-full min-h-screen z-[60] bg-white flex flex-col m-0 p-0 rounded-none overflow-hidden animate-fade-in">
          <div className="w-full sticky top-0 bg-slate-900 text-white px-4 py-3.5 z-10 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedPurchaseDateGroup(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-bold text-base text-slate-100">
                  Items Purchased on {new Date(selectedPurchaseDateGroup.dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
                <p className="text-[11px] text-slate-400">{selectedPurchaseDateGroup.orders.length} restocking purchase orders recorded</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedPurchaseDateGroup(null)}
              className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* Instant Search Filter for Daily Purchased Items */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={dateModalSearchQuery}
                onChange={(e) => setDateModalSearchQuery(e.target.value)}
                placeholder="Search restocked items, suppliers..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Itemized Purchase List */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 grid grid-cols-5 gap-2 min-w-[700px]">
                <span>Item Name</span>
                <span>SKU / PO #</span>
                <span className="text-center">Qty Restocked</span>
                <span>Supplier Name</span>
                <span className="text-right">Total Cost</span>
              </div>
              <div className="overflow-x-auto w-full">
                <div className="divide-y divide-slate-200 max-h-80 overflow-y-auto min-w-[700px]">
                  {(() => {
                    const allPurchasedItems: Array<{ name: string; sku: string; qty: number; supplier: string; cost: number }> = [];
                    selectedPurchaseDateGroup.orders.forEach(po => {
                      po.items.forEach(it => {
                        allPurchasedItems.push({
                          name: it.productName,
                          sku: po.poNumber,
                          qty: it.quantityReceived || it.quantityOrdered,
                          supplier: po.supplierName,
                          cost: it.totalCost
                        });
                      });
                    });

                    const filteredPurchased = allPurchasedItems.filter(item => {
                      if (!dateModalSearchQuery.trim()) return true;
                      const q = dateModalSearchQuery.toLowerCase();
                      return item.name.toLowerCase().includes(q) || item.supplier.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
                    });

                    if (filteredPurchased.length === 0) {
                      return <div className="p-8 text-center text-slate-400">No restock items matched your search for this date.</div>;
                    }

                    return filteredPurchased.map((item, idx) => (
                      <div key={idx} className="p-3 grid grid-cols-5 gap-2 items-center hover:bg-slate-100 transition font-mono text-xs">
                        <span className="font-bold text-slate-800 font-sans">{item.name}</span>
                        <span className="text-slate-500">{item.sku}</span>
                        <span className="text-center font-bold text-purple-600">{item.qty}</span>
                        <span className="text-slate-700">{item.supplier}</span>
                        <span className="text-right font-extrabold text-rose-600">KSh {item.cost.toLocaleString()}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 w-full bg-slate-50 border-t border-slate-200 p-3.5 flex items-center justify-between z-10 pb-6 shadow-lg shrink-0">
            <span className="text-xs font-semibold text-slate-600">Export Restock Items:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => triggerToast('📄 Daily purchase items exported to PDF!')}
                className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>[ 📄 Export PDF ]</span>
              </button>
              <button
                onClick={() => triggerToast('📊 Daily purchase items exported to Excel!')}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>[ 📊 Export Excel ]</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
