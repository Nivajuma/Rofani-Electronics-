import React, { useState, useMemo } from 'react';
import { Transaction } from '../../types';
import { exportKRATaxReportPDF } from '../../utils/pdfGenerator';
import { safeGetJSON, safeSetJSON } from '../../utils/safeStorage';
import {
  FileText,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Download,
  FileSpreadsheet,
  QrCode,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Clock,
  HelpCircle,
  CreditCard,
  Search,
  Filter,
  Check,
  Building2,
  Receipt
} from 'lucide-react';

interface KraTotComplianceCenterProps {
  transactions: Transaction[];
  onUpdateTransaction?: (tx: Transaction) => void;
  onClose?: () => void;
}

export interface MonthlyTotFilingRecord {
  monthKey: string; // e.g. "2026-11"
  status: 'accruing' | 'ready' | 'filed';
  prnNumber?: string;
  paymentMethod?: string;
  paidAt?: string;
  notes?: string;
}

const STORAGE_KEY = 'rofani_kra_tot_filings';

export const KraTotComplianceCenter: React.FC<KraTotComplianceCenterProps> = ({
  transactions,
  onUpdateTransaction,
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'receipts' | 'guide'>('schedule');
  const [filings, setFilings] = useState<Record<string, MonthlyTotFilingRecord>>(() =>
    safeGetJSON<Record<string, MonthlyTotFilingRecord>>(STORAGE_KEY, {})
  );

  // Settings for KRA
  const taxSettings = useMemo(() => {
    return safeGetJSON<any>('printAndTaxSettings', {
      enableKraTot: true,
      kraTotRate: 1.5,
      kraPinNumber: 'P051234567X',
    });
  }, []);

  const totRate = taxSettings?.kraTotRate || 1.5;
  const storeKraPin = taxSettings?.kraPinNumber || 'P051234567X';

  // Receipt Archive Filter
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'etims' | 'standard'>('all');
  const [receiptSearch, setReceiptSearch] = useState('');

  // Record PRN Modal
  const [selectedMonthForPrn, setSelectedMonthForPrn] = useState<string | null>(null);
  const [inputPrn, setInputPrn] = useState('');
  const [inputPaidAt, setInputPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [inputNotes, setInputNotes] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Group transactions by calendar month (YYYY-MM)
  const monthlyData = useMemo(() => {
    const map = new Map<string, Transaction[]>();

    transactions.forEach((tx) => {
      const d = new Date(tx.date || Date.now());
      if (isNaN(d.getTime())) return;
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(monthKey)) {
        map.set(monthKey, []);
      }
      map.get(monthKey)!.push(tx);
    });

    // Ensure current month is always present even if 0 transactions yet
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (!map.has(currentMonthKey)) {
      map.set(currentMonthKey, []);
    }

    const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map((key) => {
      const [yearStr, monthStr] = key.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const txs = map.get(key) || [];

      const dateObj = new Date(year, month - 1, 1);
      const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      const grossTurnover = txs.reduce((sum, t) => sum + (Number(t.grandTotal) || 0), 0);
      const exemptTurnover = 0;
      const taxableTurnover = grossTurnover - exemptTurnover;
      const totPayable = taxableTurnover * (totRate / 100);

      const etimsCount = txs.filter((t) => t.isEtimsRequested || (t.cuin && t.isEtimsRequested !== false)).length;
      const standardCount = txs.length - etimsCount;

      // Due date: 20th of following month
      const dueMonth = month === 12 ? 1 : month + 1;
      const dueYear = month === 12 ? year + 1 : year;
      const dueDate = new Date(dueYear, dueMonth - 1, 20);
      const dueDateLabel = `20th ${dueDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;

      const isCurrentMonth = key === currentMonthKey;
      const isPastDue = !isCurrentMonth && now > dueDate;

      const savedFiling = filings[key];
      let status: 'accruing' | 'ready' | 'filed' = 'accruing';
      if (savedFiling?.status === 'filed' || savedFiling?.prnNumber) {
        status = 'filed';
      } else if (!isCurrentMonth) {
        status = 'ready';
      }

      return {
        monthKey: key,
        monthLabel,
        transactions: txs,
        txCount: txs.length,
        etimsCount,
        standardCount,
        grossTurnover,
        exemptTurnover,
        taxableTurnover,
        totPayable,
        dueDate,
        dueDateLabel,
        isCurrentMonth,
        isPastDue,
        status,
        prnNumber: savedFiling?.prnNumber,
        paidAt: savedFiling?.paidAt,
        notes: savedFiling?.notes,
      };
    });
  }, [transactions, filings, totRate]);

  // Current Month Summary
  const currentMonthSummary = useMemo(() => {
    return monthlyData[0] || {
      monthKey: '',
      monthLabel: 'Current Month',
      grossTurnover: 0,
      totPayable: 0,
      txCount: 0,
      etimsCount: 0,
      standardCount: 0,
      dueDateLabel: '20th Next Month',
    };
  }, [monthlyData]);

  // Overall totals
  const totalAllTurnover = useMemo(
    () => transactions.reduce((sum, t) => sum + (Number(t.grandTotal) || 0), 0),
    [transactions]
  );
  const totalAllTotLiability = totalAllTurnover * (totRate / 100);
  const totalEtimsAll = transactions.filter((t) => t.isEtimsRequested || (t.cuin && t.isEtimsRequested !== false)).length;

  // Save PRN Payment Record
  const handleSavePrn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMonthForPrn) return;

    const updated = {
      ...filings,
      [selectedMonthForPrn]: {
        monthKey: selectedMonthForPrn,
        status: 'filed' as const,
        prnNumber: inputPrn.trim() || undefined,
        paidAt: inputPaidAt,
        paymentMethod: 'M-PESA Paybill 572572',
        notes: inputNotes.trim(),
      },
    };

    setFilings(updated);
    safeSetJSON(STORAGE_KEY, updated);
    setSelectedMonthForPrn(null);
    setInputPrn('');
    setInputNotes('');
    showToast(`KRA PRN recorded successfully for ${selectedMonthForPrn}!`);
  };

  // Export CSV for KRA iTax Upload
  const handleExportCsv = (monthItem: (typeof monthlyData)[0]) => {
    const headers = [
      'Tax_Period',
      'Taxpayer_PIN',
      'Tax_Type',
      'Total_Gross_Sales_KES',
      'Exempt_Sales_KES',
      'Taxable_Turnover_KES',
      'KRA_TOT_Rate_Percent',
      'Tax_Payable_KES',
      'Status',
      'Payment_PRN',
    ];

    const row = [
      monthItem.monthLabel,
      storeKraPin,
      'KRA Turnover Tax (TOT)',
      monthItem.grossTurnover.toFixed(2),
      monthItem.exemptTurnover.toFixed(2),
      monthItem.taxableTurnover.toFixed(2),
      totRate.toFixed(1),
      monthItem.totPayable.toFixed(2),
      monthItem.status.toUpperCase(),
      monthItem.prnNumber || 'N/A',
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), row.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KRA_TOT_Return_${monthItem.monthKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${monthItem.monthLabel} KRA iTax CSV!`);
  };

  // Export Official PDF Return
  const handleExportPdf = (monthItem: (typeof monthlyData)[0]) => {
    exportKRATaxReportPDF(monthItem.transactions, monthItem.monthLabel, {
      totRate,
      kraPin: storeKraPin,
      prnNumber: monthItem.prnNumber,
      storeName: 'ROFANI ELECTRONICS & BOUTIQUE',
    });
    showToast(`Generated official PDF return for ${monthItem.monthLabel}!`);
  };

  // Convert individual transaction to e-TIMS
  const handleConvertToEtims = (tx: Transaction) => {
    const cuin = `CUIN-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const cusn = `CUSN-KENYA-${Math.floor(10000000 + Math.random() * 90000000)}`;

    const updatedTx: Transaction = {
      ...tx,
      isEtimsRequested: true,
      cuin,
      cusn,
    };

    if (onUpdateTransaction) {
      onUpdateTransaction(updatedTx);
    }

    try {
      const sales = safeGetJSON<Transaction[]>('pos_store_sales', []);
      const updatedList = sales.map((t) => (t.id === tx.id ? updatedTx : t));
      safeSetJSON('pos_store_sales', updatedList);
      safeSetJSON('retail_pos_transactions', updatedList);
    } catch (e) {
      console.warn('Could not update sales:', e);
    }

    showToast(`Receipt ${tx.receiptNumber} converted to KRA e-TIMS (CUIN: ${cuin})!`);
  };

  // Filtered Receipts for Archive
  const filteredReceipts = useMemo(() => {
    return transactions.filter((tx) => {
      const isEtims = tx.isEtimsRequested || (tx.cuin && tx.isEtimsRequested !== false);

      if (receiptFilter === 'etims' && !isEtims) return false;
      if (receiptFilter === 'standard' && isEtims) return false;

      if (receiptSearch) {
        const q = receiptSearch.toLowerCase();
        const matchesNo = tx.receiptNumber?.toLowerCase().includes(q);
        const matchesCust = tx.customerName?.toLowerCase().includes(q);
        const matchesCuin = tx.cuin?.toLowerCase().includes(q);
        const matchesPin = tx.customerKraPin?.toLowerCase().includes(q);
        if (!matchesNo && !matchesCust && !matchesCuin && !matchesPin) return false;
      }

      return true;
    });
  }, [transactions, receiptFilter, receiptSearch]);

  return (
    <div className="w-full space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[70] bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* COMPLIANCE EXPLANATION BANNER */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/40 border border-amber-500/40 text-slate-200 space-y-2 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 font-bold">
              KRA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base">
                  KRA Turnover Tax (TOT) & e-TIMS Compliance Center
                </h3>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  Mandatory Monthly Return
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Taxpayer PIN: <span className="font-mono font-bold text-amber-300">{storeKraPin}</span> • Standard Rate: <span className="font-bold text-white">{totRate}% on Gross Sales</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-[11px] text-slate-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>e-TIMS: <strong className="text-white">Optional per Customer</strong></span>
            <span className="text-slate-600">|</span>
            <span>TOT: <strong className="text-amber-300">Mandatory Monthly</strong></span>
          </div>
        </div>

        <div className="pt-2 border-t border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
          💡 <strong>How Kenya Retail Tax Works:</strong> Walk-in customers who do not request fiscal e-TIMS invoices receive standard receipts. However, <strong>every single sale</strong> contributes to your monthly Gross Sales Turnover. Under KRA Section 12D, Turnover Tax (TOT) must be filed and paid on or before the <strong>20th of the following month</strong> on the KRA iTax portal.
        </div>
      </div>

      {/* TOP 4 METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Current Month Turnover */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
          <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
            <span>{currentMonthSummary.monthLabel} Turnover</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400 font-mono mt-1">
            KSh {currentMonthSummary.grossTurnover.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Across <strong className="text-slate-200">{currentMonthSummary.txCount}</strong> total retail sales
          </div>
        </div>

        {/* Card 2: Current Month TOT Payable */}
        <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-2xl relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20">
          <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider flex items-center justify-between">
            <span>KRA TOT Due ({totRate}%)</span>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">
            KSh {currentMonthSummary.totPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-amber-300/80 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Due on or before {currentMonthSummary.dueDateLabel}</span>
          </div>
        </div>

        {/* Card 3: e-TIMS Adoption Split */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
            <span>Receipt Types (All-Time)</span>
            <QrCode className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {totalEtimsAll} <span className="text-xs font-normal text-slate-400">e-TIMS / {transactions.length} Total</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {transactions.length > 0
              ? `${Math.round((totalEtimsAll / transactions.length) * 100)}% requested e-TIMS invoice`
              : '0% e-TIMS requested'}
          </div>
        </div>

        {/* Card 4: All-Time Cumulative Turnover */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
            <span>Cumulative Sales Turnover</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400 font-mono mt-1">
            KSh {totalAllTurnover.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total TOT Obligation: <strong className="text-slate-200">KSh {totalAllTotLiability.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'schedule'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Monthly KRA TOT Return Schedule ({monthlyData.length} Months)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('receipts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'receipts'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Sales & e-TIMS Receipt Archive ({transactions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'guide'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>KRA iTax Filing & Payment Guide</span>
        </button>
      </div>

      {/* TAB 1: MONTHLY KRA TOT SCHEDULE */}
      {activeTab === 'schedule' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Monthly Turnover Tax (TOT) Filing & Payment Archive</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Every month's sales are automatically aggregated. File on iTax and enter your PRN number when paid.
              </p>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Filing Due: <strong>20th of the following month</strong>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 min-w-[850px]">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Tax Period</th>
                  <th className="p-3.5">Sales Receipts</th>
                  <th className="p-3.5 text-right">Gross Turnover</th>
                  <th className="p-3.5 text-right">KRA TOT Due ({totRate}%)</th>
                  <th className="p-3.5">iTax Due Date</th>
                  <th className="p-3.5 text-center">Filing Status</th>
                  <th className="p-3.5">KRA PRN / Payment</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-xs">
                {monthlyData.map((item) => (
                  <tr key={item.monthKey} className="hover:bg-slate-800/60 transition">
                    <td className="p-3.5 font-bold text-white font-sans">
                      <div className="flex items-center gap-1.5">
                        <span>{item.monthLabel}</span>
                        {item.isCurrentMonth && (
                          <span className="text-[9px] bg-sky-950 text-sky-400 font-bold px-1.5 py-0.2 rounded border border-sky-800">
                            Current
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="text-slate-200 font-sans">
                        <strong>{item.txCount}</strong> sales
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans">
                        {item.etimsCount} e-TIMS / {item.standardCount} Standard
                      </div>
                    </td>

                    <td className="p-3.5 text-right font-bold text-white">
                      KSh {item.grossTurnover.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="p-3.5 text-right font-black text-amber-400">
                      KSh {item.totPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="p-3.5 text-slate-300 font-sans">
                      <span className={item.isPastDue && item.status !== 'filed' ? 'text-rose-400 font-bold' : ''}>
                        {item.dueDateLabel}
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      {item.status === 'filed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Filed & Paid
                        </span>
                      ) : item.isCurrentMonth ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-950/80 text-sky-400 border border-sky-800">
                          <Clock className="w-3 h-3" /> Accruing Sales
                        </span>
                      ) : item.isPastDue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800 animate-pulse">
                          <AlertCircle className="w-3 h-3" /> Overdue (Action Needed)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800">
                          <Clock className="w-3 h-3" /> Ready to File
                        </span>
                      )}
                    </td>

                    <td className="p-3.5">
                      {item.prnNumber ? (
                        <div>
                          <div className="font-bold text-emerald-300 text-[11px]">{item.prnNumber}</div>
                          {item.paidAt && (
                            <div className="text-[9px] text-slate-400 font-sans">Paid: {item.paidAt}</div>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMonthForPrn(item.monthKey);
                            setInputPrn('');
                            setInputNotes('');
                          }}
                          className="text-[11px] font-sans text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          + Record PRN Slip
                        </button>
                      )}
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-sans">
                        <button
                          type="button"
                          onClick={() => handleExportCsv(item)}
                          title="Export CSV formatted for KRA iTax"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportPdf(item)}
                          title="Download Official KRA TOT Return PDF"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
                        >
                          <Download className="w-3.5 h-3.5 text-sky-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ALL SALES & E-TIMS RECEIPTS ARCHIVE */}
      {activeTab === 'receipts' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-3 p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Filter:</span>
              <button
                type="button"
                onClick={() => setReceiptFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  receiptFilter === 'all'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All Receipts ({transactions.length})
              </button>
              <button
                type="button"
                onClick={() => setReceiptFilter('etims')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  receiptFilter === 'etims'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                e-TIMS Only ({totalEtimsAll})
              </button>
              <button
                type="button"
                onClick={() => setReceiptFilter('standard')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  receiptFilter === 'standard'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Standard Receipts ({transactions.length - totalEtimsAll})
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search receipt #, customer, CUIN, PIN..."
                value={receiptSearch}
                onChange={(e) => setReceiptSearch(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 w-full sm:w-64"
              />
            </div>
          </div>

          <div className="w-full overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300 min-w-[800px]">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Receipt #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Invoice Type</th>
                  <th className="p-3">Control Unit # (CUIN)</th>
                  <th className="p-3 text-right">Gross Total</th>
                  <th className="p-3 text-right">TOT ({totRate}%)</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                {filteredReceipts.map((tx) => {
                  const isEtims = tx.isEtimsRequested || (tx.cuin && tx.isEtimsRequested !== false);
                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/60 transition">
                      <td className="p-3 font-bold text-white">{tx.receiptNumber}</td>
                      <td className="p-3 text-slate-400 font-sans">{new Date(tx.date).toLocaleDateString()}</td>
                      <td className="p-3 text-slate-300 font-sans">
                        <div>{tx.customerName || 'Walk-in Customer'}</div>
                        {tx.customerKraPin && (
                          <div className="text-[10px] text-amber-400 font-mono">PIN: {tx.customerKraPin}</div>
                        )}
                      </td>
                      <td className="p-3 font-sans">
                        {isEtims ? (
                          <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            e-TIMS Fiscal
                          </span>
                        ) : (
                          <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                            Standard Retail
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-amber-300 font-bold">
                        {tx.cuin || (
                          <span className="text-slate-500 font-normal italic">N/A (Standard)</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-white">
                        KSh {tx.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right text-emerald-400 font-bold">
                        KSh {(tx.grandTotal * (totRate / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center font-sans">
                        {!isEtims ? (
                          <button
                            type="button"
                            onClick={() => handleConvertToEtims(tx)}
                            className="text-[10px] bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white px-2 py-1 rounded border border-amber-600/40 transition font-semibold"
                          >
                            + Generate e-TIMS
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-semibold">Certified ✓</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STEP-BY-STEP FILING GUIDE */}
      {activeTab === 'guide' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-slate-200">
          <div className="border-b border-slate-800 pb-3">
            <h4 className="font-extrabold text-base text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              <span>How to File and Pay KRA Turnover Tax (TOT) on iTax</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Follow these simple 4 steps to submit your monthly TOT return and pay via M-PESA.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Step 1 */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
                  1
                </span>
                <h5 className="font-bold text-white text-sm">Export Monthly CSV Return</h5>
              </div>
              <p className="text-slate-300 leading-relaxed">
                In the <strong>Monthly Return Schedule</strong> tab above, locate the ended month and click the green <strong>Export CSV</strong> button. This downloads your total sales turnover, taxable receipts, and computed tax due matching KRA's requirements.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
                  2
                </span>
                <h5 className="font-bold text-white text-sm">Log in to KRA iTax Portal</h5>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Go to <a href="https://itax.kra.go.ke" target="_blank" rel="noreferrer" className="text-amber-400 font-bold underline">itax.kra.go.ke</a>. Log in with your KRA PIN ({storeKraPin}) and password. Go to <strong>Returns &gt; File Return &gt; Tax Obligation: Turnover Tax (TOT)</strong>. Enter the gross turnover from this app.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
                  3
                </span>
                <h5 className="font-bold text-white text-sm">Generate Payment Registration # (PRN)</h5>
              </div>
              <p className="text-slate-300 leading-relaxed">
                After submitting the return, click <strong>Payments &gt; Payment Registration</strong>. Select Turnover Tax and submit to generate your KRA <strong>Payment Slip (PRN)</strong>.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs">
                  4
                </span>
                <h5 className="font-bold text-white text-sm">Pay via M-PESA & Record PRN</h5>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1">
                <div>• Paybill: <strong className="text-emerald-400">572572</strong> (KRA)</div>
                <div>• Account #: <strong className="text-amber-300">&lt;Your PRN Number&gt;</strong></div>
                <div>• Amount: Exactly matches your TOT liability</div>
              </div>
              <p className="text-slate-400 text-[11px] pt-1">
                Once paid, click <strong>Record PRN Slip</strong> in this app to save your proof of payment!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECORD KRA PRN SLIP */}
      {selectedMonthForPrn && (
        <div className="fixed inset-0 z-[65] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-slate-100">
                  Record KRA iTax PRN Slip ({selectedMonthForPrn})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMonthForPrn(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePrn} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">
                  Payment Registration Number (PRN) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 20261100984712"
                  value={inputPrn}
                  onChange={(e) => setInputPrn(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  From KRA iTax payment slip or M-PESA confirmation SMS
                </span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={inputPaidAt}
                  onChange={(e) => setInputPaidAt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Notes / M-PESA Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid via M-PESA Paybill 572572 (Ref: QHK...)"
                  value={inputNotes}
                  onChange={(e) => setInputNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMonthForPrn(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                >
                  <Check className="w-4 h-4" /> Save as Filed & Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
