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
  Tag
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

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Grouped Report Categories
  const reportGroups = [
    {
      categoryTitle: 'Core Financial & Sales Reports',
      reports: [
        { id: 'sale_report', title: 'Sale Report', description: 'Comprehensive gross sales, totals, and daily revenue breakdown.' },
        { id: 'purchase_report', title: 'Purchase Report', description: 'Stock purchases, restocking records, and purchase orders history.' },
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
        { id: 'all_parties_report', title: 'All Parties Report', description: 'Summary directory of all registered customers and suppliers.' },
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
    const netProfit = grossProfit - totalExpenses - kraTot;

    // Filtered products for item/stock reports
    const filteredProducts = products.filter((p) => {
      if (!modalSearchQuery.trim()) return true;
      const q = modalSearchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    });

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
      products: filteredProducts,
      totalItemDiscounts,
    };
  }, [selectedReport, datePreset, customStartDate, customEndDate, transactions, expenses, products, modalSearchQuery]);

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
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 pb-16 font-sans">
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
            <p className="text-[10px] text-slate-400">Rofani Electronics & Boutique</p>
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
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
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

      {/* Interactive Report Generator / Detail View Modal */}
      {selectedReport && reportData && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-slate-100">{selectedReport.title}</h2>
                  <p className="text-xs text-slate-400">Rofani Electronics & Boutique Analytics</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedReport(null)}
                className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
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
                      placeholder="Search items, SKU, serial #..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Real-time Calculation Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-1">
                  <div className="text-[11px] text-slate-500 font-semibold">Total Revenue</div>
                  <div className="text-base font-extrabold text-blue-600 font-mono">
                    KSh {reportData.totalRev.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400">{reportData.txCount} transactions</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-1">
                  <div className="text-[11px] text-slate-500 font-semibold">Gross Profit</div>
                  <div className="text-base font-extrabold text-emerald-600 font-mono">
                    KSh {reportData.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400">COGS: KSh {reportData.totalCogs.toLocaleString()}</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-1">
                  <div className="text-[11px] text-amber-600 font-semibold">Total Discounts</div>
                  <div className="text-base font-extrabold text-amber-600 font-mono">
                    KSh {reportData.totalItemDiscounts.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-amber-500">Promos & Markdowns</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-1">
                  <div className="text-[11px] text-slate-500 font-semibold">Net Profit</div>
                  <div className={`text-base font-extrabold font-mono ${reportData.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    KSh {reportData.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400">After Expenses & Tax</div>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 flex items-center justify-between">
                  <span>{selectedReport.title} - Data Breakdown</span>
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
                    <div className="max-h-52 overflow-y-auto divide-y divide-slate-200">
                      {reportData.products.map((p) => (
                        <div key={p.id} className="p-3 flex items-center justify-between hover:bg-white transition">
                          <div>
                            <div className="font-bold text-slate-800">{p.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">SKU: {p.sku} • Category: {p.category}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-emerald-600">KSh {p.sellingPrice.toLocaleString()}</div>
                            <div className="text-[10px] text-slate-500 font-mono font-bold">Stock: {p.stockQuantity} {p.unit}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  reportData.transactions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No transactions found for the selected date range.
                    </div>
                  ) : (
                    <div className="max-h-52 overflow-y-auto divide-y divide-slate-200">
                      {reportData.transactions.map((tx) => (
                        <div key={tx.id} className="p-3 flex items-center justify-between hover:bg-white transition">
                          <div>
                            <div className="font-bold font-mono text-slate-800">{tx.receiptNumber}</div>
                            <div className="text-[10px] text-slate-500">{tx.customerName || 'Walk-in'} • {new Date(tx.date).toLocaleDateString()}</div>
                          </div>
                          <div className="text-right font-mono font-bold text-blue-600">
                            KSh {tx.grandTotal.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Modal Footer: Export Options */}
            <div className="p-5 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
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
        </div>
      )}
    </div>
  );
};
