import React, { useState, useMemo, useEffect } from 'react';
import {
  Transaction,
  CustomerReturnRecord,
  EtimsComplianceConfig,
  KraTaxClassification,
} from '../../types';
import { exportKRATaxReportPDF, exportCustomerReturnPDF } from '../../utils/pdfGenerator';
import { safeGetJSON, safeSetJSON } from '../../utils/safeStorage';
import {
  saveEtimsConfigToCloud,
  fetchEtimsConfigFromCloud,
} from '../../lib/cloudSync';
import { auth, isAuthorizedCloudUser } from '../../lib/firebase';
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
  Receipt,
  Settings2,
  AlertTriangle,
  FileJson,
  RotateCcw,
} from 'lucide-react';

interface KraTotComplianceCenterProps {
  transactions: Transaction[];
  customerReturns?: CustomerReturnRecord[];
  storeName?: string;
  storeKraPin?: string;
  activeStoreId?: string;
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
const ETIMS_CONFIG_STORAGE_KEY = 'rofani_kra_etims_config';

export const KraTotComplianceCenter: React.FC<KraTotComplianceCenterProps> = ({
  transactions,
  customerReturns = [],
  storeName: propStoreName,
  storeKraPin: propStoreKraPin,
  activeStoreId,
  onUpdateTransaction,
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'receipts' | 'etims' | 'guide'>('schedule');
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
  const resolvedInitialPin = propStoreKraPin || taxSettings?.kraPinNumber || 'P051234567X';

  // VSCU / OSCU eTIMS Config state
  const [etimsConfig, setEtimsConfig] = useState<EtimsComplianceConfig>(() =>
    safeGetJSON<EtimsComplianceConfig>(ETIMS_CONFIG_STORAGE_KEY, {
      taxpayerPin: resolvedInitialPin,
      branchId: '00',
      scuId: 'KRACU0300000001',
      vscuEndpointUrl: '',
      environment: 'sandbox',
      integrationMode: 'etims_ready_local',
      autoIssueEtimsOnVat: true,
      defaultTaxClassification: 'Turnover Tax / Non-VAT',
    })
  );
  const [isSavingEtimsConfig, setIsSavingEtimsConfig] = useState(false);

  useEffect(() => {
    if (!isAuthorizedCloudUser(auth.currentUser)) return;
    let active = true;
    fetchEtimsConfigFromCloud(activeStoreId)
      .then((remote) => {
        if (!active || !remote) return;
        setEtimsConfig(remote);
        safeSetJSON(ETIMS_CONFIG_STORAGE_KEY, remote);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [activeStoreId]);

  const storeKraPin = etimsConfig.taxpayerPin || resolvedInitialPin;

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
    setTimeout(() => setToastMessage(null), 3500);
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

      const grossTurnover = txs.reduce((sum, t) => sum + Math.max(0, (Number(t.grandTotal) || 0) - (Number(t.returnedAmount) || 0)), 0);
      const exemptTurnover = txs.reduce((sum, t) => sum + (Number(t.taxBreakdown?.exemptTotal) || 0), 0);
      const taxableTurnover = Math.max(0, grossTurnover - exemptTurnover);
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
    () => transactions.reduce((sum, t) => sum + Math.max(0, (Number(t.grandTotal) || 0) - (Number(t.returnedAmount) || 0)), 0),
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

  // Resolve store name cleanly
  const resolvedStoreName = useMemo(() => {
    if (propStoreName && propStoreName.trim()) return propStoreName.trim();
    const customShop = safeGetJSON<string>('rofani_settings_shop_name', '');
    const legacyNames = [
      'rofani electronic',
      'rofani electronics',
      'rofani electronic & boutique',
      'rofani electronic and boutique',
      'rofani electronics & boutique',
      'rofani electronics and boutique',
    ];
    return customShop && !legacyNames.includes(customShop.trim().toLowerCase())
      ? customShop.trim()
      : 'Rofani POS';
  }, [propStoreName]);

  // Export Official PDF Return
  const handleExportPdf = (monthItem: (typeof monthlyData)[0]) => {
    exportKRATaxReportPDF(monthItem.transactions, monthItem.monthLabel, {
      totRate,
      kraPin: storeKraPin,
      prnNumber: monthItem.prnNumber,
      storeName: resolvedStoreName,
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
      etimsComplianceMode:
        etimsConfig.integrationMode === 'vscu_connected' ? 'vscu_certified' : 'etims_ready',
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

    showToast(`Receipt ${tx.receiptNumber} tagged with e-TIMS fiscal ref (${cuin})!`);
  };

  // Save VSCU / OSCU Configuration
  const handleSaveEtimsConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEtimsConfig(true);
    const cleanedConfig: EtimsComplianceConfig = {
      ...etimsConfig,
      taxpayerPin: etimsConfig.taxpayerPin.trim().toUpperCase(),
      branchId: etimsConfig.branchId.trim() || '00',
      scuId: etimsConfig.scuId.trim().toUpperCase(),
      vscuEndpointUrl: etimsConfig.vscuEndpointUrl.trim(),
      integrationMode: etimsConfig.vscuEndpointUrl.trim() ? etimsConfig.integrationMode : 'etims_ready_local',
      updatedAt: new Date().toISOString(),
    };
    setEtimsConfig(cleanedConfig);
    safeSetJSON(ETIMS_CONFIG_STORAGE_KEY, cleanedConfig);
    try {
      if (isAuthorizedCloudUser(auth.currentUser)) {
        await saveEtimsConfigToCloud(cleanedConfig, activeStoreId);
      }
      showToast('KRA e-TIMS VSCU/OSCU configuration saved!');
    } catch {
      showToast('Saved e-TIMS configuration locally (offline fallback).');
    } finally {
      setIsSavingEtimsConfig(false);
    }
  };

  // Export KRA eTIMS JSON Payload (saveSales & creditNote schema)
  const handleExportEtimsJsonPayload = () => {
    const fiscalInvoices = transactions.filter(
      (tx) => tx.isEtimsRequested || (tx.cuin && tx.isEtimsRequested !== false)
    );
    const payload = {
      generatedAt: new Date().toISOString(),
      complianceMode: etimsConfig.integrationMode,
      tin: storeKraPin,
      bhfId: etimsConfig.branchId || '00',
      scuId: etimsConfig.scuId,
      environment: etimsConfig.environment,
      saveSales: fiscalInvoices.map((tx) => ({
        invcNo: tx.receiptNumber,
        orgInvcNo: 0,
        custTin: tx.customerKraPin || null,
        custNm: tx.customerName || 'Walk-in Customer',
        salesTyCd: 'N',
        rcptTyCd: 'S',
        pmtTyCd: tx.paymentMethod === 'mpesa' ? '06' : tx.paymentMethod === 'credit_card' ? '05' : '01',
        salesSttsCd: '02',
        cfmDt: tx.date,
        salesDt: tx.date.slice(0, 10).replace(/-/g, ''),
        totItemCnt: tx.items.length,
        taxblAmtB: tx.taxBreakdown?.vat16Total ? Number((tx.grandTotal / 1.16).toFixed(2)) : 0,
        taxAmtB: tx.taxBreakdown?.vat16Total || 0,
        totTaxAmt: (tx.taxBreakdown?.vat16Total || 0) + (tx.taxBreakdown?.totTotal || 0),
        totAmt: tx.grandTotal,
        localCuinRef: tx.cuin || null,
        itemList: tx.items.map((it, idx) => ({
          itemSeq: idx + 1,
          itemCd: it.product.sku || it.product.id,
          itemNm: it.product.name,
          qty: it.quantity,
          prc: it.unitPrice,
          splyAmt: it.total,
          dcAmt: it.discount * it.quantity,
          taxTyCd:
            it.product.kraTaxType === 'Standard VAT (16%)'
              ? 'B'
              : it.product.kraTaxType === 'Zero-Rated (0%)'
              ? 'C'
              : it.product.kraTaxType === 'Exempt'
              ? 'D'
              : 'A',
          totAmt: it.total,
        })),
      })),
      creditNotes: customerReturns.map((ret) => ({
        cnInvcNo: ret.creditNoteNumber,
        orgInvcNo: ret.originalReceiptNumber,
        orgCuin: ret.originalCuin || null,
        custTin: ret.customerKraPin || null,
        custNm: ret.customerName,
        rcptTyCd: 'R',
        salesTyCd: 'N',
        cfmDt: ret.date,
        totAmt: ret.totalRefundAmount,
        restockedUnits: ret.restockedTotalUnits,
        damagedUnits: ret.damagedTotalUnits,
        reason: ret.reason,
        itemList: ret.items.map((it, idx) => ({
          itemSeq: idx + 1,
          itemCd: it.sku || it.productId,
          itemNm: it.productName,
          qty: it.quantityReturned,
          prc: it.unitPrice,
          totAmt: it.refundSubtotal,
          restocked: it.addedBackToStock,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rofani_KRA_eTIMS_Payload_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported e-TIMS JSON payload (${fiscalInvoices.length} invoices, ${customerReturns.length} credit notes)!`);
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

  const isVscuConnected =
    etimsConfig.integrationMode === 'vscu_connected' && Boolean(etimsConfig.vscuEndpointUrl.trim());

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
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-white text-base">
                  KRA Turnover Tax (TOT) & e-TIMS Compliance Center
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isVscuConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {isVscuConnected ? 'VSCU/OSCU Configured' : 'e-TIMS Ready (Local Formatting)'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Taxpayer PIN: <span className="font-mono font-bold text-amber-300">{storeKraPin}</span> • Standard TOT Rate: <span className="font-bold text-white">{totRate}% on Gross Sales</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-[11px] text-slate-300 flex items-center gap-2">
            <ShieldCheck className={`w-4 h-4 ${isVscuConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>
              VSCU Link: <strong className="text-white">{isVscuConnected ? etimsConfig.environment.toUpperCase() : 'Offline / Local'}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span>TOT: <strong className="text-amber-300">Monthly iTax Ready</strong></span>
          </div>
        </div>

        <div className="pt-2 border-t border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
          💡 <strong>Compliance Transparency:</strong> Rofani POS computes KRA VAT (16%), Zero-Rated, Exempt &amp; TOT (1.5%), captures buyer/seller KRA PINs, generates iTax CSV/PDF returns, and formats KRA e-TIMS invoices &amp; Credit Notes. For <strong>live real-time KRA CUIN server signing</strong>, connect an accredited KRA VSCU/OSCU middleware URL in the <strong>e-TIMS &amp; Credit Notes</strong> tab.
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
            Across <strong className="text-slate-200">{currentMonthSummary.txCount}</strong> total retail sales (net of returns)
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

        {/* Card 3: e-TIMS Adoption Split & Credit Notes */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
            <span>e-TIMS Invoices &amp; Credit Notes</span>
            <QrCode className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {totalEtimsAll} <span className="text-xs font-normal text-slate-400">Invoices / {customerReturns.length} Credit Notes</span>
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
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
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
          <span>Monthly KRA TOT Schedule ({monthlyData.length} Months)</span>
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
          <span>Sales &amp; e-TIMS Archive ({transactions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('etims')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'etims'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>e-TIMS Readiness, VSCU &amp; Credit Notes ({customerReturns.length})</span>
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
          <span>KRA iTax Filing Guide</span>
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
                          <span className="text-[10px] text-emerald-400 font-semibold">
                            {tx.etimsComplianceMode === 'vscu_certified' ? 'VSCU Ready ✓' : 'e-TIMS Ref ✓'}
                          </span>
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

      {/* TAB 3: E-TIMS READINESS, VSCU/OSCU CONFIG & CREDIT NOTES */}
      {activeTab === 'etims' && (
        <div className="space-y-4">
          {/* Honest Compliance Readiness Checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Built-in KRA Tax &amp; e-TIMS Ready Features</span>
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
                  Active Today
                </span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Store &amp; Buyer KRA PIN Capture:</strong> Captures taxpayer PINs on invoices, customer profiles, and Credit Notes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Item Tax Classification:</strong> Tracks VAT 16%, Zero-Rated (0%), Exempt, and Turnover Tax (1.5%).</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>iTax Monthly TOT Returns &amp; PRN Ledger:</strong> Automatic gross/net turnover calculation and iTax CSV/PDF export.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Credit Notes &amp; e-TIMS JSON Schema Export:</strong> Links returns (<code className="text-amber-300">CN-...</code>) to original receipts &amp; exports KRA <code className="text-sky-300">saveSales</code> / <code className="text-sky-300">creditNote</code> JSON payloads.</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Live KRA Server Transmission Status</span>
                </h4>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isVscuConnected
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-amber-950 text-amber-300 border-amber-700'
                  }`}
                >
                  {isVscuConnected ? 'Endpoint Configured' : 'Local Mode Only'}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Rofani POS formats receipts, QR fiscal metadata, and Credit Notes in KRA e-TIMS structure out-of-the-box.
                However, <strong>live real-time CUIN signing by KRA servers</strong> is not active by default because KRA requires each merchant to onboard on{' '}
                <a href="https://etims.kra.go.ke" target="_blank" rel="noreferrer" className="text-amber-400 underline font-semibold">
                  etims.kra.go.ke
                </a>{' '}
                and link an accredited VSCU/OSCU control unit or middleware URL below.
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportEtimsJsonPayload}
                  className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-sky-600/20 cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>Export KRA e-TIMS JSON Payload</span>
                </button>
              </div>
            </div>
          </div>

          {/* VSCU / OSCU Control Unit Settings Form */}
          <form
            onSubmit={handleSaveEtimsConfig}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-amber-400" />
                  <span>KRA VSCU / OSCU Control Unit Configuration</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter your KRA GavaConnect / VSCU middleware details once onboarded with KRA.
                </p>
              </div>
              <button
                type="submit"
                disabled={isSavingEtimsConfig}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSavingEtimsConfig ? 'Saving...' : 'Save e-TIMS Config'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Taxpayer KRA PIN</label>
                <input
                  type="text"
                  value={etimsConfig.taxpayerPin}
                  onChange={(e) => setEtimsConfig((p) => ({ ...p, taxpayerPin: e.target.value.toUpperCase() }))}
                  placeholder="P051234567X"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Branch ID (bhfId)</label>
                <input
                  type="text"
                  value={etimsConfig.branchId}
                  onChange={(e) => setEtimsConfig((p) => ({ ...p, branchId: e.target.value }))}
                  placeholder="00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Control Unit Serial (SCU ID)</label>
                <input
                  type="text"
                  value={etimsConfig.scuId}
                  onChange={(e) => setEtimsConfig((p) => ({ ...p, scuId: e.target.value.toUpperCase() }))}
                  placeholder="KRACU0300000001"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-400 font-semibold mb-1">
                  Accredited VSCU / OSCU Middleware Endpoint URL (Optional)
                </label>
                <input
                  type="url"
                  value={etimsConfig.vscuEndpointUrl}
                  onChange={(e) =>
                    setEtimsConfig((p) => ({
                      ...p,
                      vscuEndpointUrl: e.target.value,
                      integrationMode: e.target.value.trim() ? 'vscu_connected' : 'etims_ready_local',
                    }))
                  }
                  placeholder="https://vscu-gateway.yourdomain.co.ke/etims/v1"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Default Tax Classification</label>
                <select
                  value={etimsConfig.defaultTaxClassification}
                  onChange={(e) =>
                    setEtimsConfig((p) => ({
                      ...p,
                      defaultTaxClassification: e.target.value as KraTaxClassification,
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="Turnover Tax / Non-VAT">Turnover Tax (TOT 1.5%)</option>
                  <option value="Standard VAT (16%)">Standard Rated VAT (16%)</option>
                  <option value="Zero-Rated (0%)">Zero-Rated (0%)</option>
                  <option value="Exempt">VAT Exempt</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={etimsConfig.autoIssueEtimsOnVat}
                    onChange={(e) =>
                      setEtimsConfig((p) => ({ ...p, autoIssueEtimsOnVat: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500"
                  />
                  <span>Auto-tag VAT/Corporate invoices for e-TIMS export</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Environment:</span>
                <button
                  type="button"
                  onClick={() => setEtimsConfig((p) => ({ ...p, environment: 'sandbox' }))}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                    etimsConfig.environment === 'sandbox'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Sandbox
                </button>
                <button
                  type="button"
                  onClick={() => setEtimsConfig((p) => ({ ...p, environment: 'production' }))}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                    etimsConfig.environment === 'production'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Production
                </button>
              </div>
            </div>
          </form>

          {/* KRA eTIMS Credit Notes Schedule (Linked to Customer Returns) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-rose-400" />
                  <span>KRA Credit Notes Issued on Goods Returns ({customerReturns.length})</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every customer return automatically creates a Credit Note referencing the original receipt &amp; CUIN so your net turnover stays accurate.
                </p>
              </div>
            </div>

            {customerReturns.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No customer returns or credit notes have been recorded yet. Process a return inside Customers Management to auto-generate a KRA Credit Note here.
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 min-w-[780px]">
                  <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Credit Note #</th>
                      <th className="p-3">Original Receipt / CUIN</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-center">Stock Restored / Damaged</th>
                      <th className="p-3 text-right">Refund Value</th>
                      <th className="p-3 text-center">PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                    {customerReturns.map((ret) => (
                      <tr key={ret.id} className="hover:bg-slate-800/60 transition">
                        <td className="p-3">
                          <div className="font-bold text-rose-300">{ret.creditNoteNumber}</div>
                          {ret.creditNoteCuin && (
                            <div className="text-[10px] text-amber-400">CN CUIN: {ret.creditNoteCuin}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="text-slate-200 font-semibold">{ret.originalReceiptNumber}</div>
                          {ret.originalCuin && (
                            <div className="text-[10px] text-slate-400">Orig: {ret.originalCuin}</div>
                          )}
                        </td>
                        <td className="p-3 font-sans">
                          <div className="text-slate-200 font-medium">{ret.customerName}</div>
                          {ret.customerKraPin && (
                            <div className="text-[10px] text-amber-400 font-mono">PIN: {ret.customerKraPin}</div>
                          )}
                        </td>
                        <td className="p-3 font-sans text-slate-400">
                          {new Date(ret.date).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-center font-sans">
                          <span className="text-emerald-400 font-bold">+{ret.restockedTotalUnits}</span>
                          <span className="text-slate-600 mx-1">/</span>
                          <span className="text-amber-400 font-bold">{ret.damagedTotalUnits} dmg</span>
                        </td>
                        <td className="p-3 text-right font-bold text-rose-300">
                          KSh {ret.totalRefundAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-center font-sans">
                          <button
                            type="button"
                            onClick={() =>
                              exportCustomerReturnPDF(ret, {
                                storeName: resolvedStoreName,
                                storeKraPin,
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" /> Credit Note
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: STEP-BY-STEP FILING GUIDE */}
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
