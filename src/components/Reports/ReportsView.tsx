import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  TrendingUp,
  DollarSign,
  Users,
  Truck,
  ArrowUpDown,
  Filter,
  CheckCircle,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Landmark,
  ShieldAlert,
  BarChart3,
  Package,
  Archive,
  X,
  Calendar
} from 'lucide-react';
import { Transaction, Product, Customer, Supplier, Expense, SensitiveActionLog } from '../../types';
import {
  exportSalesReportPDF,
  exportProfitReportPDF,
  exportItemMovementPDF,
  exportCustomerReportPDF,
  exportSupplierReportPDF,
  exportKRATaxReportPDF
} from '../../utils/pdfGenerator';
import {
  exportSalesToCSV,
  exportInventoryToCSV,
  exportExpensesToCSV,
  exportConsolidatedArchiveToCSV
} from '../../utils/csvArchiveExport';
import { AuditLogsView } from './AuditLogsView';
import { DailySalesPerformanceCard, DateRangePreset } from './DailySalesPerformanceCard';
import { TopSellingProductsCard } from './TopSellingProductsCard';
import { safeGetJSON, safeSetJSON } from '../../utils/safeStorage';

interface ReportsViewProps {
  transactions: Transaction[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  expenses: Expense[];
  auditLogs?: SensitiveActionLog[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  products,
  customers,
  suppliers,
  expenses,
  auditLogs = [],
}) => {
  const VALID_REPORT_TABS = [
    'sales',
    'daily_performance',
    'itemized_breakdown',
    'profit',
    'kra_tax',
    'item_movement',
    'customers',
    'suppliers',
    'audit_trail',
  ] as const;

  type ReportTab = (typeof VALID_REPORT_TABS)[number];

  const [activeReportTab, setActiveReportTab] = useState<ReportTab>(() =>
    safeGetJSON<ReportTab>('retail_pos_reports_tab', 'sales', (val) => VALID_REPORT_TABS.includes(val))
  );
  useEffect(() => {
    safeSetJSON('retail_pos_reports_tab', activeReportTab);
  }, [activeReportTab]);

  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>(() =>
    safeGetJSON<'all' | 'today' | 'week' | 'month'>('retail_pos_reports_date_filter', 'all', (val) =>
      ['all', 'today', 'week', 'month'].includes(val)
    )
  );
  useEffect(() => {
    safeSetJSON('retail_pos_reports_date_filter', dateFilter);
  }, [dateFilter]);

  // Synchronized date range for Daily Sales Performance and Top Selling Products
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedBreakdownDate, setSelectedBreakdownDate] = useState<string>(() =>
    safeGetJSON<string>('retail_pos_reports_breakdown_date', getLocalDateString(), (val) => typeof val === 'string' && val.length === 10) || getLocalDateString()
  );
  useEffect(() => {
    safeSetJSON('retail_pos_reports_breakdown_date', selectedBreakdownDate);
  }, [selectedBreakdownDate]);

  const dayTransactions = useMemo(() => {
    return (transactions || []).filter((tx) => {
      const txDateStr = (tx.date || '').slice(0, 10);
      return txDateStr === selectedBreakdownDate;
    });
  }, [transactions, selectedBreakdownDate]);

  const itemSummaryMap = useMemo(() => {
    const map = new Map<string, { name: string; sku?: string; category?: string; qty: number; revenue: number; unitPrice: number }>();
    dayTransactions.forEach((tx) => {
      (tx.items || []).forEach((item) => {
        const prodId = item.product?.id || item.product?.name || 'unknown';
        const name = item.product?.name || 'Unknown Product';
        const sku = item.product?.sku || 'N/A';
        const category = item.product?.category || 'General';
        const effectiveUnitPrice = item.unitPrice - (item.discount || 0);
        const lineTotal = item.total || effectiveUnitPrice * item.quantity;

        if (map.has(prodId)) {
          const existing = map.get(prodId)!;
          existing.qty += item.quantity;
          existing.revenue += lineTotal;
        } else {
          map.set(prodId, {
            name,
            sku,
            category,
            qty: item.quantity,
            revenue: lineTotal,
            unitPrice: effectiveUnitPrice,
          });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [dayTransactions]);

  const dayTotalRevenue = useMemo(() => {
    return dayTransactions.reduce((sum, tx) => sum + (tx.grandTotal || 0), 0);
  }, [dayTransactions]);

  const dayTotalUnits = useMemo(() => {
    return itemSummaryMap.reduce((sum, item) => sum + item.qty, 0);
  }, [itemSummaryMap]);

  const [performanceRange, setPerformanceRange] = useState<{
    startDate: string;
    endDate: string;
    preset: DateRangePreset;
  }>(() => ({
    startDate: todayStr,
    endDate: todayStr,
    preset: 'today',
  }));

  // Filter transactions by date range
  const filteredTransactions = transactions.filter((tx) => {
    if (dateFilter === 'all') return true;
    const txDate = new Date(tx.date);
    const now = new Date();

    if (dateFilter === 'today') {
      return txDate.toDateString() === now.toDateString();
    }
    if (dateFilter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return txDate >= oneWeekAgo;
    }
    if (dateFilter === 'month') {
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  // Financial Calculations
  const totalGrossSales = filteredTransactions.reduce((sum, tx) => sum + tx.grandTotal, 0);
  const totalCollected = filteredTransactions.reduce((sum, tx) => sum + tx.amountPaid, 0);
  const totalOutstandingCredit = filteredTransactions.reduce((sum, tx) => sum + tx.balanceDue, 0);

  let totalCOGS = 0;
  filteredTransactions.forEach((tx) => {
    tx.items.forEach((it) => {
      totalCOGS += (it.product.costPrice || 0) * it.quantity;
    });
  });

  const grossProfit = totalGrossSales - totalCOGS;
  const totalExpensesAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const kraTurnoverTax = totalGrossSales * 0.015; // 1.5% KRA TOT
  const netProfit = grossProfit - totalExpensesAmount - kraTurnoverTax;

  // Item Velocity Analysis (Fast vs Slow Moving)
  const productSalesMap: Record<string, { qtySold: number; totalRev: number }> = {};
  filteredTransactions.forEach((tx) => {
    tx.items.forEach((it) => {
      if (!productSalesMap[it.product.id]) {
        productSalesMap[it.product.id] = { qtySold: 0, totalRev: 0 };
      }
      productSalesMap[it.product.id].qtySold += it.quantity;
      productSalesMap[it.product.id].totalRev += it.total;
    });
  });

  const itemVelocityList = products.map((p) => {
    const stats = productSalesMap[p.id] || { qtySold: 0, totalRev: 0 };
    return {
      ...p,
      qtySold: stats.qtySold,
      totalRev: stats.totalRev,
      status: stats.qtySold >= 5 ? 'Fast Moving 🔥' : stats.qtySold >= 1 ? 'Moderate ⚡' : 'Low / Slow Moving 🐢'
    };
  });

  itemVelocityList.sort((a, b) => b.qtySold - a.qtySold);

  // CSV Archival States
  const [showCsvMenu, setShowCsvMenu] = useState(false);
  const [csvToast, setCsvToast] = useState<{ text: string; filename: string } | null>(null);

  // Map of product ID to units sold for inventory velocity
  const productVelocityMap = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions.forEach((tx) => {
      tx.items.forEach((it) => {
        map[it.product.id] = (map[it.product.id] || 0) + it.quantity;
      });
    });
    return map;
  }, [filteredTransactions]);

  const handleDownloadSalesCsv = () => {
    const filename = exportSalesToCSV(filteredTransactions, dateFilter);
    setCsvToast({
      text: `Exported ${filteredTransactions.length} sales records to CSV successfully!`,
      filename,
    });
    setShowCsvMenu(false);
    setTimeout(() => setCsvToast(null), 4000);
  };

  const handleDownloadInventoryCsv = () => {
    const filename = exportInventoryToCSV(products, productVelocityMap);
    setCsvToast({
      text: `Exported ${products.length} inventory products to CSV successfully!`,
      filename,
    });
    setShowCsvMenu(false);
    setTimeout(() => setCsvToast(null), 4000);
  };

  const handleDownloadExpensesCsv = () => {
    const filename = exportExpensesToCSV(expenses);
    setCsvToast({
      text: `Exported ${expenses.length} operating expenses to CSV successfully!`,
      filename,
    });
    setShowCsvMenu(false);
    setTimeout(() => setCsvToast(null), 4000);
  };

  const handleDownloadConsolidatedCsv = () => {
    const filename = exportConsolidatedArchiveToCSV(filteredTransactions, products, expenses);
    setCsvToast({
      text: `Exported master consolidated archive (Sales, Inventory & Expenses) to CSV!`,
      filename,
    });
    setShowCsvMenu(false);
    setTimeout(() => setCsvToast(null), 4000);
  };

  // Today's immediate business insights calculations
  const todayTransactionsList = useMemo(() => {
    const now = new Date();
    return transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d.toDateString() === now.toDateString();
    });
  }, [transactions]);

  const todayTotalTransactions = todayTransactionsList.length;
  const todayTotalRevenue = todayTransactionsList.reduce((sum, tx) => sum + tx.grandTotal, 0);

  const todayTopSellingCategory = useMemo(() => {
    const catRevenueMap: Record<string, number> = {};
    todayTransactionsList.forEach((tx) => {
      tx.items.forEach((it) => {
        const cat = it.product.category || 'General';
        catRevenueMap[cat] = (catRevenueMap[cat] || 0) + it.total;
      });
    });

    let topCat = 'None Yet';
    let maxRev = -1;
    Object.entries(catRevenueMap).forEach(([cat, rev]) => {
      if (rev > maxRev) {
        maxRev = rev;
        topCat = cat;
      }
    });
    return topCat;
  }, [todayTransactionsList]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* CSV Archival Download Toast Alert */}
      {csvToast && (
        <div className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-100 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold shadow-lg shadow-emerald-900/30 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p>{csvToast.text}</p>
              <p className="text-[10px] font-mono text-emerald-300/80 font-normal mt-0.5">
                Archival File: {csvToast.filename}
              </p>
            </div>
          </div>
          <button
            onClick={() => setCsvToast(null)}
            className="p-1 text-emerald-300 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-sky-950 border border-sky-800 text-sky-400 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-100">Financial, KRA Tax & Analytics Reports</h2>
            <p className="text-xs text-slate-400">
              Generate PDF sales statements, 1.5% KRA turnover tax reports, profit & loss, customer credit ledgers & inventory velocity
            </p>
          </div>
        </div>

        {/* Controls: Date Filter & CSV Download Action */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter Buttons */}
          <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {(['all', 'today', 'week', 'month'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setDateFilter(period)}
                className={`px-3 py-1.5 capitalize rounded-lg font-medium transition cursor-pointer ${
                  dateFilter === period
                    ? 'bg-sky-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {period}
              </button>
            ))}
          </div>

          {/* Download CSV Archival Action */}
          <div className="relative">
            <button
              type="button"
              id="btn-download-reports-csv"
              onClick={() => setShowCsvMenu((prev) => !prev)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/25 cursor-pointer active:scale-95 group"
              title="Download CSV of current sales, inventory, or expenses for local archival"
            >
              <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
              <span>Download CSV</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCsvMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showCsvMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowCsvMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                    <span>Local Archival CSV Exports</span>
                    <span className="text-[10px] text-emerald-400 font-mono">RFC 4180</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadSalesCsv}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition flex items-start gap-2.5 cursor-pointer group"
                  >
                    <TrendingUp className="w-4 h-4 text-sky-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-100 flex items-center justify-between">
                        <span>Current Sales CSV</span>
                        <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/60">
                          {filteredTransactions.length} receipts
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Receipts, items, totals, payment modes ({dateFilter.toUpperCase()})
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadInventoryCsv}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition flex items-start gap-2.5 cursor-pointer group"
                  >
                    <Package className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-100 flex items-center justify-between">
                        <span>Current Inventory CSV</span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
                          {products.length} items
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Stock counts, cost prices, retail values, profit margins
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadExpensesCsv}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition flex items-start gap-2.5 cursor-pointer group"
                  >
                    <DollarSign className="w-4 h-4 text-rose-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-100 flex items-center justify-between">
                        <span>Operating Expenses CSV</span>
                        <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/60">
                          {expenses.length} logs
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Expense categories, amounts, descriptions, payment status
                      </p>
                    </div>
                  </button>

                  <div className="border-t border-slate-800 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadConsolidatedCsv}
                      className="w-full text-left px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-850 text-slate-200 hover:text-white transition flex items-start gap-2.5 cursor-pointer group border border-slate-800"
                    >
                      <Archive className="w-4 h-4 text-purple-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold text-purple-300">
                          Master Consolidated Archive
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Complete package: Sales + Inventory + Expenses in one file
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* TODAY'S BUSINESS INSIGHTS SUMMARY CARD */}
      <div className="bg-gradient-to-r from-sky-950/80 via-slate-900 to-emerald-950/70 border border-sky-500/30 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-sky-500/20 border border-sky-500/40 text-sky-400 rounded-2xl">
            <Sparkles className="w-6 h-6 animate-pulse text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-white">Today's Business Insights</h3>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                LIVE SUMMARY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time snapshot for {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-6 shrink-0">
          <div className="bg-slate-950/80 border border-slate-800/80 px-4 py-2.5 rounded-2xl text-center">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Total Transactions</span>
            <span className="text-lg sm:text-xl font-black text-sky-400 font-mono">
              {todayTotalTransactions}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 px-4 py-2.5 rounded-2xl text-center">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Total Revenue</span>
            <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
              KSh {todayTotalRevenue.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 px-4 py-2.5 rounded-2xl text-center">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Top Selling Category</span>
            <span className="text-xs sm:text-sm font-black text-amber-300 font-sans truncate max-w-[130px] block mx-auto">
              {todayTopSellingCategory}
            </span>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Gross Sales Revenue</div>
          <div className="text-xl font-extrabold text-sky-400 font-mono truncate">
            KSh {totalGrossSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500">{filteredTransactions.length} receipts</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Gross Profit (Margin)</div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono truncate">
            KSh {grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500">COGS: KSh {totalCOGS.toLocaleString()}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-1">
          <div className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
            <Landmark className="w-3.5 h-3.5" /> KRA Tax (1.5% TOT)
          </div>
          <div className="text-xl font-extrabold text-amber-400 font-mono truncate">
            KSh {kraTurnoverTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-amber-500/80">Turnover Tax Liability</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Operating Expenses</div>
          <div className="text-xl font-extrabold text-rose-400 font-mono truncate">
            KSh {totalExpensesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500">{expenses.length} overhead logs</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Net Profit (After Tax)</div>
          <div className={`text-xl font-extrabold font-mono truncate ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            KSh {netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500">Net Business Profit</div>
        </div>
      </div>

      {/* Navigation Tabs for Reports */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => setActiveReportTab('sales')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeReportTab === 'sales'
              ? 'bg-sky-600 text-white shadow-md'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Sales Report
        </button>

        <button
          onClick={() => setActiveReportTab('daily_performance')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeReportTab === 'daily_performance'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-900 border border-slate-800 text-indigo-300 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Daily Performance (Hourly)
        </button>

        <button
          onClick={() => setActiveReportTab('itemized_breakdown')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeReportTab === 'itemized_breakdown'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 border border-slate-800 text-emerald-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" /> Date Itemized Breakdown
        </button>

        <button
          onClick={() => setActiveReportTab('profit')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeReportTab === 'profit'
              ? 'bg-sky-600 text-white shadow-md'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4" /> Profit & Loss
        </button>

        <button
          onClick={() => setActiveReportTab('kra_tax')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeReportTab === 'kra_tax'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-slate-900 border border-slate-800 text-amber-400 hover:text-white'
          }`}
        >
          <Landmark className="w-4 h-4" /> KRA Tax (1.5%)
        </button>

        <button
          onClick={() => setActiveReportTab('item_movement')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeReportTab === 'item_movement'
              ? 'bg-sky-600 text-white shadow-md'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <ArrowUpDown className="w-4 h-4" /> Fast vs Low Moving
        </button>

        <button
          onClick={() => setActiveReportTab('customers')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeReportTab === 'customers'
              ? 'bg-sky-600 text-white shadow-md'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> Customer Debt Ledger
        </button>

        <button
          onClick={() => setActiveReportTab('suppliers')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeReportTab === 'suppliers'
              ? 'bg-sky-600 text-white shadow-md'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" /> Supplier Directory
        </button>

        <button
          onClick={() => setActiveReportTab('audit_trail')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeReportTab === 'audit_trail'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-900 border border-purple-800/60 text-purple-300 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-purple-400" /> Worker Role Audit Trail
          {auditLogs.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-purple-950 text-purple-300 rounded-full border border-purple-700">
              {auditLogs.length}
            </span>
          )}
        </button>
      </div>

      {/* REPORT CONTENT PANEL */}

      {/* 0.5. DATE ITEMIZED BREAKDOWN TAB */}
      {activeReportTab === 'itemized_breakdown' && (
        <div className="space-y-6">
          {/* Interactive Date Selector Widget */}
          {(() => {
            const [yearStr, monthStr, dayStr] = selectedBreakdownDate.split('-');
            const currentYear = parseInt(yearStr, 10) || new Date().getFullYear();
            const currentMonth = parseInt(monthStr, 10) || (new Date().getMonth() + 1);
            const currentDay = parseInt(dayStr, 10) || new Date().getDate();

            const updateDateParts = (y: number, m: number, d: number) => {
              const maxD = new Date(y, m, 0).getDate();
              const safeD = Math.min(Math.max(1, d), maxD);
              setSelectedBreakdownDate(`${y}-${String(m).padStart(2, '0')}-${String(safeD).padStart(2, '0')}`);
            };

            const handlePreset = (offsetDays: number) => {
              const dt = new Date();
              dt.setDate(dt.getDate() - offsetDays);
              setSelectedBreakdownDate(getLocalDateString(dt));
            };

            const monthNames = [
              { val: 1, name: 'Jan' }, { val: 2, name: 'Feb' }, { val: 3, name: 'Mar' }, { val: 4, name: 'Apr' },
              { val: 5, name: 'May' }, { val: 6, name: 'Jun' }, { val: 7, name: 'Jul' }, { val: 8, name: 'Aug' },
              { val: 9, name: 'Sep' }, { val: 10, name: 'Oct' }, { val: 11, name: 'Nov' }, { val: 12, name: 'Dec' },
            ];
            const yearsList = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

            const formattedDisplay = (() => {
              try {
                const [y, m, d] = selectedBreakdownDate.split('-').map(Number);
                const dtObj = new Date(y, m - 1, d);
                if (isNaN(dtObj.getTime())) return selectedBreakdownDate;
                return dtObj.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
              } catch (_) {
                return selectedBreakdownDate;
              }
            })();

            return (
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-slate-100 text-sm">Select Target Date for Itemized Breakdown</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePreset(0)}
                      className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      🟢 Today
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreset(1)}
                      className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/80 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      🟡 Yesterday
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreset(2)}
                      className="px-2.5 py-1 bg-orange-950/80 hover:bg-orange-900 text-orange-300 border border-orange-800/80 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      🟠 2 Days Ago
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Day</span>
                    <select
                      value={currentDay}
                      onChange={(e) => updateDateParts(currentYear, currentMonth, parseInt(e.target.value, 10))}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-2 py-2 rounded-xl text-xs font-mono font-bold outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>{String(d).padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Month</span>
                    <select
                      value={currentMonth}
                      onChange={(e) => updateDateParts(currentYear, parseInt(e.target.value, 10), currentDay)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-2 py-2 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {monthNames.map((m) => (
                        <option key={m.val} value={m.val}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Year</span>
                    <select
                      value={currentYear}
                      onChange={(e) => updateDateParts(parseInt(e.target.value, 10), currentMonth, currentDay)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-2 py-2 rounded-xl text-xs font-mono font-bold outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {yearsList.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-emerald-950/40 border border-emerald-800/60 p-2.5 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Selected Target Date:</span>
                  <span className="font-bold text-emerald-300 font-mono">{formattedDisplay}</span>
                </div>
              </div>
            );
          })()}

          {/* Daily Totals Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
              <div className="text-xs text-slate-400 font-medium">Total Transactions</div>
              <div className="text-2xl font-extrabold font-mono text-slate-100">{dayTransactions.length}</div>
              <div className="text-[10px] text-slate-500">Sales recorded on this date</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
              <div className="text-xs text-slate-400 font-medium">Total Units Sold</div>
              <div className="text-2xl font-extrabold font-mono text-emerald-400">{dayTotalUnits} pcs</div>
              <div className="text-[10px] text-slate-500">Aggregate items quantity</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
              <div className="text-xs text-slate-400 font-medium">Total Gross Revenue</div>
              <div className="text-2xl font-extrabold font-mono text-sky-400">KSh {dayTotalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="text-[10px] text-slate-500">Total cash & M-Pesa inflow</div>
            </div>
          </div>

          {/* Aggregated Daily Item Summary Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>Aggregated Itemized Sales Summary ({itemSummaryMap.length} products)</span>
              </h3>
            </div>
            {itemSummaryMap.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No items sold on {selectedBreakdownDate}. Select another date above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                      <th className="p-3">Product Name & SKU</th>
                      <th className="p-3 text-center">Category</th>
                      <th className="p-3 text-center">Qty Sold</th>
                      <th className="p-3 text-right">Avg Unit Price</th>
                      <th className="p-3 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {itemSummaryMap.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-semibold text-slate-200">
                          <div>{item.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">SKU: {item.sku}</div>
                        </td>
                        <td className="p-3 text-center text-slate-400">{item.category}</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-400">{item.qty} pcs</td>
                        <td className="p-3 text-right font-mono text-slate-300">KSh {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-right font-mono font-bold text-sky-400">KSh {item.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Individual Transaction Breakdown (Receipt Level) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Receipts & Transactions Log ({dayTransactions.length})</span>
              </h3>
            </div>
            {dayTransactions.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                No transaction receipts recorded for this date.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
                {dayTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sky-400">{tx.receiptNumber}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-950 text-slate-300 border border-slate-800 rounded-md font-mono">
                          {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          tx.paymentStatus === 'Paid' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-800'
                        }`}>
                          {tx.paymentStatus}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Customer: <span className="font-semibold text-slate-100">{tx.customerName || 'Walk-in'}</span> • Cashier: {tx.cashierName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {(tx.items || []).map((i) => `${i.product.name} (x${i.quantity})`).join(', ')}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-extrabold text-slate-100 text-sm">
                        KSh {tx.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {(tx.payments || []).map((p) => p.method).join(', ') || 'Cash'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 0. DAILY PERFORMANCE DEDICATED TAB */}
      {activeReportTab === 'daily_performance' && (
        <div className="space-y-6">
          <DailySalesPerformanceCard
            transactions={transactions}
            startDate={performanceRange.startDate}
            endDate={performanceRange.endDate}
            rangePreset={performanceRange.preset}
            onRangeChange={(range) => setPerformanceRange(range)}
          />
          <TopSellingProductsCard
            transactions={transactions}
            products={products}
            startDate={performanceRange.startDate}
            endDate={performanceRange.endDate}
          />
        </div>
      )}

      {/* 1. SALES REPORT */}
      {activeReportTab === 'sales' && (
        <div className="space-y-6">
          {/* Daily Sales Performance Card with Recharts Hourly Breakdown */}
          <DailySalesPerformanceCard
            transactions={transactions}
            startDate={performanceRange.startDate}
            endDate={performanceRange.endDate}
            rangePreset={performanceRange.preset}
            onRangeChange={(range) => setPerformanceRange(range)}
          />

          {/* Top Selling Products Bar Chart placed below Daily Sales Performance */}
          <TopSellingProductsCard
            transactions={transactions}
            products={products}
            startDate={performanceRange.startDate}
            endDate={performanceRange.endDate}
          />

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-100">Sales Transactions & Payment Modes</h3>
                <p className="text-xs text-slate-400">Detailed transactions history and payment channels</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  id="btn-download-sales-tab-csv"
                  onClick={handleDownloadSalesCsv}
                  className="bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                  title="Download Current Sales Transactions as CSV"
                >
                  <Download className="w-4 h-4 text-sky-400" /> Download Sales CSV
                </button>
                <button
                  onClick={() => exportSalesReportPDF(filteredTransactions, `Filter: ${dateFilter.toUpperCase()}`)}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-sky-600/20 cursor-pointer active:scale-95"
                >
                  <Download className="w-4 h-4" /> Export Sales Report PDF
                </button>
              </div>
            </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Receipt #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3 text-right">Amount Paid</th>
                  <th className="p-3 text-right">Credit Due</th>
                  <th className="p-3">Payment Modes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-3 font-bold text-sky-400">{tx.receiptNumber}</td>
                    <td className="p-3 text-slate-400">{new Date(tx.date).toLocaleDateString()}</td>
                    <td className="p-3 font-sans text-slate-200">{tx.customerName || 'Walk-in'}</td>
                    <td className="p-3 text-right font-bold text-slate-100">KSh {tx.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-emerald-400">KSh {tx.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-rose-400">{tx.balanceDue > 0 ? `KSh ${tx.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'KSh 0.00'}</td>
                    <td className="p-3 font-sans capitalize text-slate-300">
                      {tx.payments.map((p) => `${p.method} (KSh ${p.amount.toLocaleString()})`).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

    {/* 2. PROFIT & LOSS STATEMENT */}
      {activeReportTab === 'profit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-100">Store Profit & Loss Statement</h3>
              <p className="text-xs text-slate-400">Financial summary comparing revenue, COGS, KRA tax, and operating expenses</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                id="btn-download-expenses-tab-csv"
                onClick={handleDownloadExpensesCsv}
                className="bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                title="Download Store Operating Expenses as CSV"
              >
                <Download className="w-4 h-4 text-rose-400" /> Download Expenses CSV
              </button>
              <button
                onClick={() => exportProfitReportPDF(filteredTransactions, expenses, `Period: ${dateFilter.toUpperCase()}`)}
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-sky-600/20 cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" /> Export P&L Report PDF
              </button>
            </div>
          </div>

          <div className="space-y-3 font-mono text-sm max-w-xl mx-auto bg-slate-950 p-6 rounded-2xl border border-slate-800">
            <div className="flex justify-between py-2 border-b border-slate-800 text-slate-300">
              <span>Gross Sales Revenue</span>
              <span className="font-bold text-sky-400">KSh {totalGrossSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800 text-slate-400">
              <span>Less: Cost of Goods Sold (COGS)</span>
              <span>-KSh {totalCOGS.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800 text-slate-200 font-bold bg-slate-900/60 px-3 rounded-lg">
              <span>Gross Operating Profit</span>
              <span className="text-emerald-400">KSh {grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800 text-slate-400">
              <span>Less: Store Operating Expenses</span>
              <span className="text-rose-400">-KSh {totalExpensesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800 text-amber-400">
              <span>Less: KRA Turnover Tax (1.5% TOT)</span>
              <span>-KSh {kraTurnoverTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-sky-500 text-base font-extrabold text-white bg-slate-900 px-3 rounded-xl">
              <span>NET PROFIT AFTER TAX</span>
              <span className={netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                KSh {netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. KRA TURNOVER TAX (1.5% TOT) REPORT */}
      {activeReportTab === 'kra_tax' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-slate-100">Kenya Revenue Authority (KRA) Turnover Tax Report</h3>
              </div>
              <p className="text-xs text-slate-400">Monthly 1.5% Turnover Tax (TOT) compliance breakdown on gross sales</p>
            </div>
            <button
              onClick={() => exportKRATaxReportPDF(filteredTransactions, `Filter: ${dateFilter.toUpperCase()}`)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-amber-600/20"
            >
              <Download className="w-4 h-4" /> Export KRA Tax PDF
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400">Tax Regime:</span>
              <p className="font-bold text-slate-200">KRA Turnover Tax (TOT)</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400">Standard Rate:</span>
              <p className="font-bold text-amber-400">1.5% on Gross Turnover</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400">Total Tax Payable ({dateFilter.toUpperCase()}):</span>
              <p className="font-mono font-extrabold text-amber-400 text-base">
                KSh {kraTurnoverTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-amber-400/90 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Receipt #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3 text-right">Gross Sale (KSh)</th>
                  <th className="p-3 text-right">KRA Tax 1.5% (KSh)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-3 font-bold text-sky-400">{tx.receiptNumber}</td>
                    <td className="p-3 text-slate-400">{new Date(tx.date).toLocaleDateString()}</td>
                    <td className="p-3 font-sans text-slate-200">{tx.customerName || 'Walk-in'}</td>
                    <td className="p-3 text-right font-bold text-slate-100">
                      KSh {tx.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-bold text-amber-400">
                      KSh {(tx.grandTotal * 0.015).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ITEM MOVEMENT & VELOCITY REPORT (Fast vs Slow Moving) */}
      {activeReportTab === 'item_movement' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-100">Item Comparison & Sales Velocity</h3>
              <p className="text-xs text-slate-400">Identify fast-moving top sellers vs low/slow-moving inventory</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                id="btn-download-inventory-tab-csv"
                onClick={handleDownloadInventoryCsv}
                className="bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                title="Download Current Inventory Stock & Valuation as CSV"
              >
                <Download className="w-4 h-4 text-emerald-400" /> Download Inventory CSV
              </button>
              <button
                onClick={() => exportItemMovementPDF(products, filteredTransactions)}
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-sky-600/20 cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" /> Export Item Velocity PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Rank & Product</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Size/Capacity</th>
                  <th className="p-3 text-center">Current Stock</th>
                  <th className="p-3 text-center">Units Sold</th>
                  <th className="p-3 text-right">Total Revenue</th>
                  <th className="p-3 text-center">Velocity Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {itemVelocityList.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-3 font-bold text-slate-100">
                      #{index + 1} {item.name}
                    </td>
                    <td className="p-3 text-sky-400 font-semibold">{item.category}</td>
                    <td className="p-3 font-mono text-slate-400">{item.sizeCapacity || '-'}</td>
                    <td className="p-3 text-center font-mono font-bold text-slate-200">
                      {item.stockQuantity} {item.unit}
                    </td>
                    <td className="p-3 text-center font-mono font-extrabold text-sky-400 text-sm">
                      {item.qtySold}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-100">
                      KSh {item.totalRev.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          item.qtySold >= 5
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : item.qtySold >= 1
                            ? 'bg-sky-950 text-sky-400 border border-sky-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. CUSTOMER REPORT */}
      {activeReportTab === 'customers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-100">Customer Ledgers & Store Credit Balances</h3>
              <p className="text-xs text-slate-400">Track lifetime purchases and outstanding unpaid balances</p>
            </div>
            <button
              onClick={() => exportCustomerReportPDF(customers)}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-sky-600/20"
            >
              <Download className="w-4 h-4" /> Export Customer PDF
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Email</th>
                  <th className="p-3 text-right">Lifetime Purchases</th>
                  <th className="p-3 text-right">Outstanding Credit Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-3 font-bold text-slate-100">{c.name}</td>
                    <td className="p-3 font-mono text-slate-400">{c.phone}</td>
                    <td className="p-3 text-slate-400">{c.email || 'N/A'}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-100">
                      KSh {c.totalPurchases.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-rose-400">
                      KSh {c.currentBalanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SUPPLIER REPORT */}
      {activeReportTab === 'suppliers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-100">Supplier Directory & Restock Values</h3>
              <p className="text-xs text-slate-400">Registered wholesalers and total inventory restock value</p>
            </div>
            <button
              onClick={() => exportSupplierReportPDF(suppliers)}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-sky-600/20"
            >
              <Download className="w-4 h-4" /> Export Supplier PDF
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Supplier Name</th>
                  <th className="p-3">Contact Person</th>
                  <th className="p-3">Phone & Email</th>
                  <th className="p-3">Address</th>
                  <th className="p-3 text-right">Total Restock Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-3 font-bold text-slate-100">{s.name}</td>
                    <td className="p-3 text-slate-300">{s.contactPerson}</td>
                    <td className="p-3 font-mono text-slate-400">
                      <div>{s.phone}</div>
                      <div className="text-[10px] text-slate-500">{s.email}</div>
                    </td>
                    <td className="p-3 text-slate-400">{s.address}</td>
                    <td className="p-3 text-right font-mono font-bold text-sky-400">
                      KSh {s.totalSuppliedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. SENSITIVE ROLE AUTHORIZATION AUDIT TRAIL */}
      {activeReportTab === 'audit_trail' && (
        <AuditLogsView logs={auditLogs} />
      )}
    </div>
  );
};
