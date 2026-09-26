import React, { useState } from 'react';
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
  Landmark,
  ShieldAlert
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
import { AuditLogsView } from './AuditLogsView';

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
  const [activeReportTab, setActiveReportTab] = useState<
    'sales' | 'profit' | 'kra_tax' | 'item_movement' | 'customers' | 'suppliers' | 'audit_trail'
  >('sales');

  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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

        {/* Date Filter Buttons */}
        <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          {(['all', 'today', 'week', 'month'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setDateFilter(period)}
              className={`px-3 py-1.5 capitalize rounded-lg font-medium transition ${
                dateFilter === period
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {period}
            </button>
          ))}
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

      {/* 1. SALES REPORT */}
      {activeReportTab === 'sales' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-100">Sales Transactions & Payment Modes</h3>
              <p className="text-xs text-slate-400">Detailed transactions history and payment channels</p>
            </div>
            <button
              onClick={() => exportSalesReportPDF(filteredTransactions, `Filter: ${dateFilter.toUpperCase()}`)}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-sky-600/20"
            >
              <Download className="w-4 h-4" /> Export Sales Report PDF
            </button>
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
      )}

      {/* 2. PROFIT & LOSS STATEMENT */}
      {activeReportTab === 'profit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-100">Store Profit & Loss Statement</h3>
              <p className="text-xs text-slate-400">Financial summary comparing revenue, COGS, KRA tax, and operating expenses</p>
            </div>
            <button
              onClick={() => exportProfitReportPDF(filteredTransactions, expenses, `Period: ${dateFilter.toUpperCase()}`)}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-sky-600/20"
            >
              <Download className="w-4 h-4" /> Export P&L Report PDF
            </button>
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
            <button
              onClick={() => exportItemMovementPDF(products, filteredTransactions)}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-sky-600/20"
            >
              <Download className="w-4 h-4" /> Export Item Velocity PDF
            </button>
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
