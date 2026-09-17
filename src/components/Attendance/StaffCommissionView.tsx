import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  CreditCard,
  Send,
  AlertCircle,
  FileSpreadsheet,
  Percent,
  Check,
  TrendingUp,
  Receipt,
  Search,
  Filter,
  Download,
  Printer,
  ChevronRight,
  Sparkles,
  Sliders,
  ArrowUpRight,
  ShieldCheck,
  Layers,
  Edit3,
  X,
  Target,
  BarChart3,
  Briefcase
} from 'lucide-react';
import {
  Transaction,
  User as Employee,
  StaffCommissionPayout,
  PaymentMethod,
  WorkerLoan,
  CommissionType,
  CommissionTier
} from '../../types';
import {
  exportCommissionStatementPDF,
  exportCommissionPayoutSlipPDF
} from '../../utils/pdfGenerator';

interface StaffCommissionViewProps {
  transactions: Transaction[];
  allUsers: Employee[];
  currentUser: Employee;
  commissionPayouts: StaffCommissionPayout[];
  workerLoans?: WorkerLoan[];
  onPayCommission: (payout: StaffCommissionPayout) => void;
  onUpdateUserCommissionRate?: (userId: string, rate: number) => void;
  onUpdateUserCommissionSettings?: (userId: string, settings: Partial<Employee>) => void;
  onReattributeSale?: (txId: string, salesRepId: string, salesRepName: string) => void;
}

export const StaffCommissionView: React.FC<StaffCommissionViewProps> = ({
  transactions,
  allUsers,
  currentUser,
  commissionPayouts,
  workerLoans = [],
  onPayCommission,
  onUpdateUserCommissionRate,
  onUpdateUserCommissionSettings,
  onReattributeSale,
}) => {
  // Active Navigation Sub-tab
  const [subTab, setSubTab] = useState<'roster' | 'per_sale_log' | 'payout_history' | 'rules_simulator'>('roster');

  // Timeframe and Filters
  const [periodPreset, setPeriodPreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterEmployee, setFilterEmployee] = useState<string>('All');
  const [saleSearchQuery, setSaleSearchQuery] = useState('');

  // Modals State
  const [payoutModalItem, setPayoutModalItem] = useState<{
    staff: Employee;
    totalSales: number;
    count: number;
    rate: number;
    modelName: string;
    earnedCommission: number;
    activeLoan?: WorkerLoan;
  } | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | 'salary_addition'>('mpesa');
  const [payoutNotes, setPayoutNotes] = useState<string>('');
  const [payoutRefNo, setPayoutRefNo] = useState<string>('');
  const [deductLoanAmount, setDeductLoanAmount] = useState<number>(0);

  // Itemized Sales Modal State
  const [selectedStaffForSales, setSelectedStaffForSales] = useState<{
    staff: Employee;
    txList: Transaction[];
    totalSales: number;
    earnedCommission: number;
    modelName: string;
  } | null>(null);

  // Edit Commission Plan Modal State
  const [editingStaffPlan, setEditingStaffPlan] = useState<Employee | null>(null);
  const [planType, setPlanType] = useState<CommissionType>('percentage');
  const [planRate, setPlanRate] = useState<number>(5);
  const [planFixedAmount, setPlanFixedAmount] = useState<number>(50);
  const [planProfitShare, setPlanProfitShare] = useState<number>(15);
  const [planDailyTarget, setPlanDailyTarget] = useState<number>(30000);
  const [planTiers, setPlanTiers] = useState<CommissionTier[]>([
    { minSales: 0, maxSales: 30000, rate: 5 },
    { minSales: 30000, maxSales: 70000, rate: 7.5 },
    { minSales: 70000, rate: 10 }
  ]);

  // Re-attribute Sale Modal State
  const [reattributeTx, setReattributeTx] = useState<Transaction | null>(null);
  const [newSalesRepId, setNewSalesRepId] = useState<string>('');

  // Printable Payout Voucher Modal State
  const [activeVoucher, setActiveVoucher] = useState<StaffCommissionPayout | null>(null);

  // Simulator State
  const [simSalesVolume, setSimSalesVolume] = useState<number>(50000);

  // Date Range Calculation
  const { dateRangeStart, dateRangeEnd, periodLabel } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (periodPreset === 'today') {
      return { dateRangeStart: todayStr, dateRangeEnd: todayStr, periodLabel: `Today (${todayStr})` };
    }
    if (periodPreset === 'yesterday') {
      const yest = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
      return { dateRangeStart: yest, dateRangeEnd: yest, periodLabel: `Yesterday (${yest})` };
    }
    if (periodPreset === 'week') {
      const past7 = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
      return { dateRangeStart: past7, dateRangeEnd: todayStr, periodLabel: `Last 7 Days (${past7} to ${todayStr})` };
    }
    if (periodPreset === 'month') {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      return { dateRangeStart: firstOfMonth, dateRangeEnd: todayStr, periodLabel: `This Month (${firstOfMonth} to ${todayStr})` };
    }
    // Custom
    return {
      dateRangeStart: customStartDate,
      dateRangeEnd: customEndDate,
      periodLabel: `Custom Range (${customStartDate} to ${customEndDate})`
    };
  }, [periodPreset, customStartDate, customEndDate]);

  // Filtered Transactions in Period
  const periodTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const txDateStr = tx.date.slice(0, 10);
      return txDateStr >= dateRangeStart && txDateStr <= dateRangeEnd;
    });
  }, [transactions, dateRangeStart, dateRangeEnd]);

  // Helper to compute commission for a specific worker and transaction or batch
  const computeWorkerCommissionForTx = (worker: Employee, tx: Transaction) => {
    const commType = worker.commissionType || 'percentage';

    if (commType === 'fixed_per_sale') {
      const fixed = worker.fixedCommissionPerSale || 50;
      return {
        amount: fixed,
        rate: tx.grandTotal > 0 ? parseFloat(((fixed / tx.grandTotal) * 100).toFixed(2)) : 0,
        modelName: `Fixed KSh ${fixed}/sale`
      };
    }

    if (commType === 'profit_share') {
      const profitRate = worker.profitShareRate || 15;
      let totalProfit = 0;
      tx.items.forEach((item) => {
        const itemProfit = ((item.product.sellingPrice || item.unitPrice) - (item.product.costPrice || 0)) * item.quantity;
        totalProfit += Math.max(0, itemProfit);
      });
      const amount = Math.round(totalProfit * (profitRate / 100));
      return {
        amount,
        rate: tx.grandTotal > 0 ? parseFloat(((amount / tx.grandTotal) * 100).toFixed(2)) : 0,
        modelName: `${profitRate}% Margin Profit Share`
      };
    }

    if (commType === 'tiered' && worker.commissionTiers && worker.commissionTiers.length > 0) {
      // Find tier
      const tier = worker.commissionTiers.find((t) =>
        tx.grandTotal >= t.minSales && (t.maxSales === undefined || tx.grandTotal <= t.maxSales)
      ) || worker.commissionTiers[0];
      const rate = tier.rate;
      const amount = Math.round(tx.grandTotal * (rate / 100));
      return {
        amount,
        rate,
        modelName: `Tiered (${rate}%)`
      };
    }

    // Default: percentage
    const rate = worker.commissionRate !== undefined ? worker.commissionRate : 5;
    const amount = Math.round(tx.grandTotal * (rate / 100));
    return {
      amount,
      rate,
      modelName: `${rate}% Sales Volume`
    };
  };

  // Staff Roster Calculations
  const staffRosterData = useMemo(() => {
    const targetStaff = allUsers.filter((u) => (filterEmployee === 'All' ? true : u.id === filterEmployee));

    return targetStaff.map((staff) => {
      // Find transactions attributed to this worker
      const staffTx = periodTransactions.filter((tx) => {
        if (tx.salesRepId) {
          return tx.salesRepId === staff.id;
        }
        return tx.cashierId === staff.id || tx.cashierName === staff.name;
      });

      const totalSales = staffTx.reduce((sum, tx) => sum + tx.grandTotal, 0);
      const count = staffTx.length;

      // Calculate total commission earned
      let totalEarned = 0;
      const commType = staff.commissionType || 'percentage';
      let effectiveRate = staff.commissionRate || 5;
      let modelDescription = `${effectiveRate}% Sales Volume`;

      if (commType === 'fixed_per_sale') {
        const fixed = staff.fixedCommissionPerSale || 50;
        totalEarned = count * fixed;
        effectiveRate = totalSales > 0 ? parseFloat(((totalEarned / totalSales) * 100).toFixed(2)) : 0;
        modelDescription = `Fixed KSh ${fixed}/sale`;
      } else if (commType === 'tiered' && staff.commissionTiers && staff.commissionTiers.length > 0) {
        // Find tier matching cumulative sales
        let activeTier = staff.commissionTiers[0];
        for (const t of staff.commissionTiers) {
          if (totalSales >= t.minSales && (t.maxSales === undefined || totalSales <= t.maxSales)) {
            activeTier = t;
            break;
          }
        }
        if (totalSales > (staff.commissionTiers[staff.commissionTiers.length - 1].minSales || 0)) {
          activeTier = staff.commissionTiers[staff.commissionTiers.length - 1];
        }
        effectiveRate = activeTier.rate;
        totalEarned = Math.round(totalSales * (effectiveRate / 100));
        modelDescription = `Tiered (${effectiveRate}% on KSh ${totalSales.toLocaleString()})`;
      } else if (commType === 'profit_share') {
        const profitRate = staff.profitShareRate || 15;
        let cumulativeProfit = 0;
        staffTx.forEach((tx) => {
          tx.items.forEach((item) => {
            const itemProfit = ((item.product.sellingPrice || item.unitPrice) - (item.product.costPrice || 0)) * item.quantity;
            cumulativeProfit += Math.max(0, itemProfit);
          });
        });
        totalEarned = Math.round(cumulativeProfit * (profitRate / 100));
        effectiveRate = totalSales > 0 ? parseFloat(((totalEarned / totalSales) * 100).toFixed(2)) : 0;
        modelDescription = `${profitRate}% Profit Margin Share (Profit: KSh ${cumulativeProfit.toLocaleString()})`;
      } else {
        // Percentage
        effectiveRate = staff.commissionRate !== undefined ? staff.commissionRate : 5;
        totalEarned = Math.round(totalSales * (effectiveRate / 100));
        modelDescription = `${effectiveRate}% Sales Volume`;
      }

      // Check if payout exists for this period
      const existingPayout = commissionPayouts.find((p) => {
        if (p.employeeId !== staff.id) return false;
        if (p.date === dateRangeStart && p.date === dateRangeEnd) return true;
        if (p.startDate && p.endDate) {
          return p.startDate === dateRangeStart && p.endDate === dateRangeEnd;
        }
        return p.date === dateRangeStart;
      });

      // Active loans for this staff member
      const activeLoan = workerLoans.find((l) => l.workerId === staff.id && l.status === 'Active' && l.balanceDue > 0);

      // Target progress
      const target = staff.dailySalesTarget || 30000;
      const targetPercent = target > 0 ? Math.min(100, Math.round((totalSales / target) * 100)) : 0;

      return {
        staff,
        staffTx,
        totalSales,
        count,
        effectiveRate,
        modelDescription,
        earnedCommission: totalEarned,
        existingPayout,
        isPaid: existingPayout?.status === 'Paid',
        activeLoan,
        target,
        targetPercent
      };
    });
  }, [allUsers, filterEmployee, periodTransactions, dateRangeStart, dateRangeEnd, commissionPayouts, workerLoans]);

  // Overall Aggregated KPI Metrics
  const totalStoreSales = staffRosterData.reduce((sum, item) => sum + item.totalSales, 0);
  const totalCommissionPool = staffRosterData.reduce((sum, item) => sum + item.earnedCommission, 0);
  const totalPaidCommission = staffRosterData
    .filter((item) => item.isPaid)
    .reduce((sum, item) => sum + (item.existingPayout?.paidAmount || 0), 0);
  const totalPendingCommission = Math.max(0, totalCommissionPool - totalPaidCommission);

  // Top Performer
  const topPerformer = useMemo(() => {
    if (staffRosterData.length === 0) return null;
    const sorted = [...staffRosterData].sort((a, b) => b.totalSales - a.totalSales);
    return sorted[0]?.totalSales > 0 ? sorted[0] : null;
  }, [staffRosterData]);

  // Per-Sale Audit Log Data
  const perSaleAuditList = useMemo(() => {
    return periodTransactions
      .map((tx) => {
        const staffId = tx.salesRepId || tx.cashierId;
        const worker = allUsers.find((u) => u.id === staffId) || {
          id: tx.cashierId,
          name: tx.salesRepName || tx.cashierName,
          role: 'Cashier' as any,
          email: '',
          pin: '',
          commissionRate: tx.cashierCommissionRate || 5
        };

        const commDetails = computeWorkerCommissionForTx(worker, tx);
        const isPaid = commissionPayouts.some(
          (p) => p.employeeId === worker.id && p.date === tx.date.slice(0, 10) && p.status === 'Paid'
        );

        return {
          tx,
          worker,
          commDetails,
          isPaid
        };
      })
      .filter((item) => {
        if (!saleSearchQuery) return true;
        const q = saleSearchQuery.toLowerCase();
        return (
          item.tx.receiptNumber.toLowerCase().includes(q) ||
          item.worker.name.toLowerCase().includes(q) ||
          (item.tx.customerName || '').toLowerCase().includes(q)
        );
      });
  }, [periodTransactions, allUsers, commissionPayouts, saleSearchQuery]);

  // Open Payout Modal for single worker
  const handleOpenPayoutModal = (item: (typeof staffRosterData)[0]) => {
    setPayoutModalItem({
      staff: item.staff,
      totalSales: item.totalSales,
      count: item.count,
      rate: item.effectiveRate,
      modelName: item.modelDescription,
      earnedCommission: item.earnedCommission,
      activeLoan: item.activeLoan
    });
    setPaymentMethod('mpesa');
    setPayoutNotes(`Sales Commission for ${periodLabel} (${item.modelDescription})`);
    setPayoutRefNo(`COMM-${Date.now().toString().slice(-6)}`);
    setDeductLoanAmount(0);
  };

  // Submit Single Payout
  const handleConfirmPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutModalItem) return;

    const netPayable = Math.max(0, payoutModalItem.earnedCommission - deductLoanAmount);

    const payout: StaffCommissionPayout = {
      id: `payout-${Date.now()}`,
      employeeId: payoutModalItem.staff.id,
      employeeName: payoutModalItem.staff.name,
      date: dateRangeStart === dateRangeEnd ? dateRangeStart : `${dateRangeStart} to ${dateRangeEnd}`,
      period: periodPreset === 'today' ? 'daily' : periodPreset === 'week' ? 'weekly' : periodPreset === 'month' ? 'monthly' : 'custom',
      startDate: dateRangeStart,
      endDate: dateRangeEnd,
      totalSalesAmount: payoutModalItem.totalSales,
      salesCount: payoutModalItem.count,
      commissionRate: payoutModalItem.rate,
      commissionEarned: payoutModalItem.earnedCommission,
      loanDeduction: deductLoanAmount > 0 ? deductLoanAmount : undefined,
      deductedLoanId: deductLoanAmount > 0 && payoutModalItem.activeLoan ? payoutModalItem.activeLoan.id : undefined,
      paidAmount: netPayable,
      status: 'Paid',
      paidAt: new Date().toISOString(),
      paidBy: `${currentUser.name} (${currentUser.role})`,
      paymentMethod,
      referenceNo: payoutRefNo,
      notes: payoutNotes
    };

    onPayCommission(payout);
    setPayoutModalItem(null);
  };

  // Bulk Disburse All Unpaid Commissions
  const handleBulkDisburseAll = () => {
    const unpaidItems = staffRosterData.filter((it) => !it.isPaid && it.earnedCommission > 0);
    if (unpaidItems.length === 0) return;

    if (
      !window.confirm(
        `Disburse commissions for ${unpaidItems.length} workers totaling KSh ${totalPendingCommission.toLocaleString()}?`
      )
    ) {
      return;
    }

    unpaidItems.forEach((it) => {
      const payout: StaffCommissionPayout = {
        id: `payout-bulk-${Date.now()}-${it.staff.id.slice(-4)}`,
        employeeId: it.staff.id,
        employeeName: it.staff.name,
        date: dateRangeStart === dateRangeEnd ? dateRangeStart : `${dateRangeStart} to ${dateRangeEnd}`,
        period: periodPreset === 'today' ? 'daily' : periodPreset === 'week' ? 'weekly' : periodPreset === 'month' ? 'monthly' : 'custom',
        startDate: dateRangeStart,
        endDate: dateRangeEnd,
        totalSalesAmount: it.totalSales,
        salesCount: it.count,
        commissionRate: it.effectiveRate,
        commissionEarned: it.earnedCommission,
        paidAmount: it.earnedCommission,
        status: 'Paid',
        paidAt: new Date().toISOString(),
        paidBy: `${currentUser.name} (${currentUser.role})`,
        paymentMethod: 'mpesa',
        referenceNo: `BULK-COMM-${Date.now().toString().slice(-6)}`,
        notes: `Bulk Commission Disbursal for ${periodLabel}`
      };
      onPayCommission(payout);
    });
  };

  // Open Edit Commission Plan Modal
  const handleOpenEditPlanModal = (staff: Employee) => {
    setEditingStaffPlan(staff);
    setPlanType(staff.commissionType || 'percentage');
    setPlanRate(staff.commissionRate !== undefined ? staff.commissionRate : 5);
    setPlanFixedAmount(staff.fixedCommissionPerSale || 50);
    setPlanProfitShare(staff.profitShareRate || 15);
    setPlanDailyTarget(staff.dailySalesTarget || 30000);
    setPlanTiers(
      staff.commissionTiers && staff.commissionTiers.length > 0
        ? staff.commissionTiers
        : [
            { minSales: 0, maxSales: 30000, rate: 5 },
            { minSales: 30000, maxSales: 70000, rate: 7.5 },
            { minSales: 70000, rate: 10 }
          ]
    );
  };

  // Save Commission Plan Settings
  const handleSaveCommissionPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffPlan) return;

    if (onUpdateUserCommissionSettings) {
      onUpdateUserCommissionSettings(editingStaffPlan.id, {
        commissionType: planType,
        commissionRate: planRate,
        fixedCommissionPerSale: planFixedAmount,
        profitShareRate: planProfitShare,
        dailySalesTarget: planDailyTarget,
        commissionTiers: planTiers
      });
    } else if (onUpdateUserCommissionRate) {
      onUpdateUserCommissionRate(editingStaffPlan.id, planRate);
    }

    setEditingStaffPlan(null);
  };

  // Re-attribute Sale
  const handleConfirmReattribute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reattributeTx || !newSalesRepId) return;

    const rep = allUsers.find((u) => u.id === newSalesRepId);
    if (!rep) return;

    if (onReattributeSale) {
      onReattributeSale(reattributeTx.id, rep.id, rep.name);
    }
    setReattributeTx(null);
  };

  // Export CSV of Payouts
  const handleExportCSV = () => {
    const headers = [
      'Payout ID',
      'Date / Period',
      'Worker Name',
      'Total Sales Volume (KSh)',
      'Sales Count',
      'Commission Rate (%)',
      'Gross Commission (KSh)',
      'Loan Deduction (KSh)',
      'Net Paid (KSh)',
      'Payment Method',
      'Reference No',
      'Approved By',
      'Paid At'
    ];

    const rows = commissionPayouts.map((p) => [
      p.id,
      `"${p.date}"`,
      `"${p.employeeName}"`,
      p.totalSalesAmount,
      p.salesCount,
      p.commissionRate,
      p.commissionEarned,
      p.loanDeduction || 0,
      p.paidAmount,
      p.paymentMethod || 'mpesa',
      `"${p.referenceNo || ''}"`,
      `"${p.paidBy || ''}"`,
      `"${p.paidAt || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Commission_Payouts_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Switcher */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold font-mono uppercase tracking-wider">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Worker Performance & Sales Commission Engine</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Workers Commission & Payout Management
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Track per-sale commissions, configure flexible payout rules (percentage, tiered targets, fixed bonus per
            sale), and disburse verified earnings with automatic expense & loan integration.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {totalPendingCommission > 0 && (
            <button
              onClick={handleBulkDisburseAll}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl shadow-lg shadow-emerald-900/30 transition flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Disburse All Pending (KSh {totalPendingCommission.toLocaleString()})</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold px-3 py-2.5 rounded-xl transition flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-full sm:w-fit gap-2 shadow-md overflow-x-auto">
        <button
          onClick={() => setSubTab('roster')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            subTab === 'roster'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <User className="w-4 h-4 text-indigo-300" />
          <span>Worker Commission Roster</span>
        </button>

        <button
          onClick={() => setSubTab('per_sale_log')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            subTab === 'per_sale_log'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4 text-sky-300" />
          <span>Per-Sale Commission Audit Log</span>
        </button>

        <button
          onClick={() => setSubTab('payout_history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            subTab === 'payout_history'
              ? 'bg-emerald-600 text-slate-950 font-extrabold shadow-lg shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-950" />
          <span>Payouts & Vouchers Ledger ({commissionPayouts.length})</span>
        </button>

        <button
          onClick={() => setSubTab('rules_simulator')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            subTab === 'rules_simulator'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-300" />
          <span>Commission Models & Simulator</span>
        </button>
      </div>

      {/* Period Selector & Worker Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Preset Period Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-sky-400" /> Period:
          </span>

          {(['today', 'yesterday', 'week', 'month', 'custom'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => setPeriodPreset(preset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                periodPreset === preset
                  ? 'bg-sky-600 text-white font-bold shadow'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              {preset === 'week' ? 'Past 7 Days' : preset === 'month' ? 'This Month' : preset}
            </button>
          ))}
        </div>

        {/* Custom Date Inputs if 'custom' selected */}
        {periodPreset === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap text-xs bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="text-slate-400">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-transparent text-slate-100 font-mono font-bold focus:outline-none"
            />
            <span className="text-slate-400">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-transparent text-slate-100 font-mono font-bold focus:outline-none"
            />
          </div>
        )}

        {/* Worker Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Staff:</span>
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none font-semibold"
          >
            <option value="All">All Staff Members</option>
            {allUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Attributed Sales */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1 shadow">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Period Store Sales</span>
            <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400 font-mono">
            KSh {totalStoreSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {periodTransactions.length} total orders ({periodLabel})
          </div>
        </div>

        {/* Total Commission Earned Pool */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1 shadow">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-indigo-400" /> Commission Accrued
            </span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400 font-mono">
            KSh {totalCommissionPool.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400">
            Across {staffRosterData.length} staff on register
          </div>
        </div>

        {/* Commissions Disbursed */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1 shadow">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between text-emerald-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Disbursed Payouts
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            KSh {totalPaidCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500">
            Recorded in store expense ledgers
          </div>
        </div>

        {/* Pending Payout Liability */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1 shadow">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between text-amber-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Pending Commission Pool
            </span>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            KSh {totalPendingCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500">
            Ready for instant disbursal
          </div>
        </div>
      </div>

      {/* Top Performer Banner */}
      {topPerformer && (
        <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-sky-950/60 border border-indigo-800/40 p-4 rounded-2xl flex items-center justify-between gap-4 flex-wrap shadow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider font-mono">
                ⭐ Star Sales Rep of the Period
              </div>
              <div className="font-extrabold text-sm text-slate-100">
                {topPerformer.staff.name}{' '}
                <span className="text-xs font-normal text-slate-400 font-mono">
                  ({topPerformer.staff.role})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono text-xs">
            <div>
              <div className="text-[10px] text-slate-400">Attributed Sales</div>
              <div className="font-bold text-sky-400 text-sm">
                KSh {topPerformer.totalSales.toLocaleString()} ({topPerformer.count} orders)
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400">Commission Earned</div>
              <div className="font-bold text-emerald-400 text-sm">
                KSh {topPerformer.earnedCommission.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 1: WORKER COMMISSION ROSTER                                       */}
      {/* ========================================================================= */}
      {subTab === 'roster' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <span>Worker Performance & Earned Commission Breakdown ({periodLabel})</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {staffRosterData.length} workers registered
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staffRosterData.map((item) => (
              <div
                key={item.staff.id}
                className={`bg-slate-900 border rounded-2xl p-5 space-y-4 transition shadow-lg ${
                  item.isPaid
                    ? 'border-emerald-800/60 bg-slate-900/90'
                    : item.totalSales > 0
                    ? 'border-indigo-500/40 bg-slate-900'
                    : 'border-slate-800 opacity-85'
                }`}
              >
                {/* Header: Avatar, Name, Model & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-900 to-sky-900 border border-indigo-700/50 flex items-center justify-center font-black text-white text-lg shadow">
                      {item.staff.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                        <span>{item.staff.name}</span>
                        <button
                          onClick={() => handleOpenEditPlanModal(item.staff)}
                          title="Configure commission model & targets"
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 rounded transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {item.staff.role} • {item.staff.email || 'N/A'}
                      </p>
                      <span className="inline-block mt-1 bg-indigo-950/80 border border-indigo-800/70 text-indigo-300 text-[10px] px-2 py-0.5 rounded-md font-mono font-semibold">
                        {item.modelDescription}
                      </span>
                    </div>
                  </div>

                  <div>
                    {item.isPaid ? (
                      <span className="bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs px-2.5 py-1 rounded-full font-mono font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>PAID</span>
                      </span>
                    ) : item.totalSales > 0 ? (
                      <span className="bg-amber-950 border border-amber-800 text-amber-300 text-xs px-2.5 py-1 rounded-full font-mono font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>PENDING</span>
                      </span>
                    ) : (
                      <span className="bg-slate-800 text-slate-400 text-xs px-2.5 py-1 rounded-full font-mono">
                        NO SALES
                      </span>
                    )}
                  </div>
                </div>

                {/* Target Progress Bar */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 space-y-1 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Target className="w-3 h-3 text-sky-400" /> Sales Target: KSh{' '}
                      {item.target.toLocaleString()}
                    </span>
                    <span className="font-mono font-bold text-sky-400">{item.targetPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.targetPercent >= 100
                          ? 'bg-emerald-500'
                          : item.targetPercent >= 70
                          ? 'bg-sky-500'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${item.targetPercent}%` }}
                    />
                  </div>
                </div>

                {/* Sales & Commission Metrics Row */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Attributed Sales</div>
                    <div className="text-sm font-black text-sky-400 font-mono mt-0.5">
                      KSh {item.totalSales.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500">{item.count} orders</div>
                  </div>

                  <div className="border-x border-slate-800/80 px-2">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Effective Rate</div>
                    <div className="text-sm font-black text-indigo-400 font-mono mt-0.5">
                      {item.effectiveRate}%
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {item.count > 0 ? `~KSh ${Math.round(item.earnedCommission / item.count)}/sale` : '0/sale'}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Earned Comm.</div>
                    <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                      KSh {item.earnedCommission.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500">Gross Pool</div>
                  </div>
                </div>

                {/* Outstanding Loan Warning if any */}
                {item.activeLoan && (
                  <div className="bg-rose-950/30 border border-rose-900/50 p-2 rounded-xl flex items-center justify-between text-[11px] text-rose-300">
                    <span className="flex items-center gap-1 font-semibold">
                      <CreditCard className="w-3.5 h-3.5 text-rose-400" /> Active Loan Balance:
                    </span>
                    <span className="font-mono font-bold">KSh {item.activeLoan.balanceDue.toLocaleString()}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() =>
                      setSelectedStaffForSales({
                        staff: item.staff,
                        txList: item.staffTx,
                        totalSales: item.totalSales,
                        earnedCommission: item.earnedCommission,
                        modelName: item.modelDescription
                      })
                    }
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <Receipt className="w-3.5 h-3.5 text-sky-400" />
                    <span>View Sales ({item.count})</span>
                  </button>

                  <button
                    onClick={() =>
                      exportCommissionStatementPDF(
                        item.staff,
                        item.staffTx,
                        periodLabel,
                        {
                          totalSales: item.totalSales,
                          commissionEarned: item.earnedCommission,
                          commissionRate: item.effectiveRate,
                          modelName: item.modelDescription,
                          count: item.count
                        }
                      )
                    }
                    title="Export Worker PDF Statement"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                  >
                    <Printer className="w-4 h-4 text-slate-300" />
                  </button>

                  {item.isPaid ? (
                    <button
                      onClick={() => item.existingPayout && setActiveVoucher(item.existingPayout)}
                      className="flex-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Voucher</span>
                    </button>
                  ) : (
                    <button
                      disabled={item.totalSales === 0 || item.earnedCommission === 0}
                      onClick={() => handleOpenPayoutModal(item)}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-extrabold py-2 px-3 rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 text-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {item.totalSales === 0
                          ? 'No Sales'
                          : `Pay (KSh ${item.earnedCommission.toLocaleString()})`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: PER-SALE COMMISSION AUDIT LOG                                 */}
      {/* ========================================================================= */}
      {subTab === 'per_sale_log' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-3">
          {/* Header & Search */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-sky-400" />
                <span>Per-Sale Commission Attribution & Audit Log</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Detailed ledger of every POS sale, attributing worker, applied commission rule, and payout state
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Receipt # or Worker..."
                value={saleSearchQuery}
                onChange={(e) => setSaleSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3.5">Receipt #</th>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Items</th>
                  <th className="p-3.5">Total Sale</th>
                  <th className="p-3.5">Attributed Worker</th>
                  <th className="p-3.5">Rule / Rate</th>
                  <th className="p-3.5">Comm. Earned</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {perSaleAuditList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      No transactions found for the selected timeframe.
                    </td>
                  </tr>
                ) : (
                  perSaleAuditList.map(({ tx, worker, commDetails, isPaid }) => (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-bold text-sky-400">{tx.receiptNumber}</td>
                      <td className="p-3.5 text-slate-300">
                        {new Date(tx.date).toLocaleDateString()}{' '}
                        <span className="text-[10px] text-slate-500">
                          {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-200">{tx.customerName || 'Walk-in'}</td>
                      <td className="p-3.5 text-slate-400">{tx.items.length} items</td>
                      <td className="p-3.5 font-bold text-slate-100">
                        KSh {tx.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-indigo-300 font-sans">{worker.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {tx.salesRepId ? 'Assigned Sales Rep' : 'Cashier Direct'}
                        </div>
                      </td>
                      <td className="p-3.5 text-[11px] text-slate-300">
                        {commDetails.modelName}
                      </td>
                      <td className="p-3.5 font-bold text-emerald-400">
                        KSh {commDetails.amount.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setReattributeTx(tx);
                            setNewSalesRepId(tx.salesRepId || tx.cashierId);
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] px-2.5 py-1 rounded-lg transition"
                          title="Re-attribute sale to another worker"
                        >
                          Reassign Rep
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: PAYOUTS HISTORY & VOUCHERS LEDGER                             */}
      {/* ========================================================================= */}
      {subTab === 'payout_history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Commission Payout Audit Ledger & Official Receipts</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Official historical ledger of all settled worker commission disbursements and printable vouchers
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {commissionPayouts.length} total disbursements
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3.5">Date / Period</th>
                  <th className="p-3.5">Worker Name</th>
                  <th className="p-3.5">Sales Base</th>
                  <th className="p-3.5">Effective Rate</th>
                  <th className="p-3.5">Gross Earned</th>
                  <th className="p-3.5">Loan Deduction</th>
                  <th className="p-3.5">Net Disbursed</th>
                  <th className="p-3.5">Method & Ref</th>
                  <th className="p-3.5">Approved By</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {commissionPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500">
                      No commission payouts recorded yet.
                    </td>
                  </tr>
                ) : (
                  commissionPayouts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-slate-200">{p.date}</td>
                      <td className="p-3.5 font-bold text-sky-400">{p.employeeName}</td>
                      <td className="p-3.5">KSh {p.totalSalesAmount.toLocaleString()}</td>
                      <td className="p-3.5 font-bold text-indigo-400">{p.commissionRate}%</td>
                      <td className="p-3.5 font-bold text-slate-200">
                        KSh {p.commissionEarned.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-rose-400 font-bold">
                        {p.loanDeduction ? `- KSh ${p.loanDeduction.toLocaleString()}` : '—'}
                      </td>
                      <td className="p-3.5 font-black text-emerald-400">
                        KSh {p.paidAmount.toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <div className="uppercase text-[10px] font-bold text-slate-300">
                          {p.paymentMethod || 'mpesa'}
                        </div>
                        <div className="text-[10px] text-slate-500">{p.referenceNo || 'N/A'}</div>
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px]">{p.paidBy || 'Admin'}</td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveVoucher(p)}
                            className="bg-slate-800 hover:bg-slate-700 text-sky-300 p-1.5 rounded-lg transition"
                            title="View / Print Printable Voucher"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => exportCommissionPayoutSlipPDF(p)}
                            className="bg-slate-800 hover:bg-slate-700 text-emerald-300 p-1.5 rounded-lg transition"
                            title="Download PDF Voucher"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: COMMISSION MODELS & RULES SETUP + SIMULATOR                     */}
      {/* ========================================================================= */}
      {subTab === 'rules_simulator' && (
        <div className="space-y-6">
          {/* 4 Models Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-indigo-900/40 p-4 rounded-2xl space-y-2">
              <div className="p-2 bg-indigo-950 border border-indigo-800 text-indigo-400 rounded-xl w-fit">
                <Percent className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-100">1. Flat % of Sales Volume</h4>
              <p className="text-xs text-slate-400">
                Staff earns a fixed percentage (e.g. 5%, 7.5%) on the gross amount of every completed receipt.
              </p>
            </div>

            <div className="bg-slate-900 border border-sky-900/40 p-4 rounded-2xl space-y-2">
              <div className="p-2 bg-sky-950 border border-sky-800 text-sky-400 rounded-xl w-fit">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-100">2. Tiered Target Incentive</h4>
              <p className="text-xs text-slate-400">
                Scale commission rates dynamically as total volume grows: e.g. 5% up to 30k, 7.5% up to 70k, 10% above 70k.
              </p>
            </div>

            <div className="bg-slate-900 border border-amber-900/40 p-4 rounded-2xl space-y-2">
              <div className="p-2 bg-amber-950 border border-amber-800 text-amber-400 rounded-xl w-fit">
                <Receipt className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-100">3. Fixed Bonus per Sale</h4>
              <p className="text-xs text-slate-400">
                Workers receive a flat cash bonus (e.g. KSh 50, KSh 100) per order, irrespective of transaction size.
              </p>
            </div>

            <div className="bg-slate-900 border border-emerald-900/40 p-4 rounded-2xl space-y-2">
              <div className="p-2 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-xl w-fit">
                <Award className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-100">4. Gross Profit Share</h4>
              <p className="text-xs text-slate-400">
                Staff earns a percentage (e.g. 15%) of the actual gross profit margin (Selling Price − Cost Price) generated.
              </p>
            </div>
          </div>

          {/* Interactive Simulator */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  <span>Interactive Commission Earnings Simulator</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Simulate any sales volume to see projected earnings and effective payouts for all staff members
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-right">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Simulated Sales Base</div>
                <div className="text-xl font-black text-amber-400 font-mono">
                  KSh {simSalesVolume.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Slider Control */}
            <div className="space-y-2">
              <input
                type="range"
                min="5000"
                max="250000"
                step="5000"
                value={simSalesVolume}
                onChange={(e) => setSimSalesVolume(Number(e.target.value))}
                className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>KSh 5,000</span>
                <span>KSh 50,000</span>
                <span>KSh 100,000</span>
                <span>KSh 175,000</span>
                <span>KSh 250,000</span>
              </div>
            </div>

            {/* Simulator Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
                  <tr>
                    <th className="p-3.5">Staff Member</th>
                    <th className="p-3.5">Configured Model</th>
                    <th className="p-3.5">Simulated Sales</th>
                    <th className="p-3.5">Effective Rate</th>
                    <th className="p-3.5">Projected Commission</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {allUsers.map((u) => {
                    const commType = u.commissionType || 'percentage';
                    let simulatedEarned = 0;
                    let simulatedRate = u.commissionRate || 5;

                    if (commType === 'fixed_per_sale') {
                      const fixed = u.fixedCommissionPerSale || 50;
                      const estimatedOrders = Math.max(1, Math.round(simSalesVolume / 3000));
                      simulatedEarned = estimatedOrders * fixed;
                      simulatedRate = parseFloat(((simulatedEarned / simSalesVolume) * 100).toFixed(2));
                    } else if (commType === 'tiered' && u.commissionTiers && u.commissionTiers.length > 0) {
                      let activeTier = u.commissionTiers[0];
                      for (const t of u.commissionTiers) {
                        if (simSalesVolume >= t.minSales && (t.maxSales === undefined || simSalesVolume <= t.maxSales)) {
                          activeTier = t;
                          break;
                        }
                      }
                      if (simSalesVolume > (u.commissionTiers[u.commissionTiers.length - 1].minSales || 0)) {
                        activeTier = u.commissionTiers[u.commissionTiers.length - 1];
                      }
                      simulatedRate = activeTier.rate;
                      simulatedEarned = Math.round(simSalesVolume * (simulatedRate / 100));
                    } else if (commType === 'profit_share') {
                      const profitRate = u.profitShareRate || 15;
                      const estimatedProfit = simSalesVolume * 0.35; // 35% margin average
                      simulatedEarned = Math.round(estimatedProfit * (profitRate / 100));
                      simulatedRate = parseFloat(((simulatedEarned / simSalesVolume) * 100).toFixed(2));
                    } else {
                      simulatedRate = u.commissionRate !== undefined ? u.commissionRate : 5;
                      simulatedEarned = Math.round(simSalesVolume * (simulatedRate / 100));
                    }

                    return (
                      <tr key={u.id} className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-bold text-slate-100 font-sans">
                          {u.name}{' '}
                          <span className="text-[10px] text-slate-400 font-mono">({u.role})</span>
                        </td>
                        <td className="p-3.5 text-indigo-300">
                          {commType === 'fixed_per_sale'
                            ? `Fixed KSh ${u.fixedCommissionPerSale || 50}/sale`
                            : commType === 'tiered'
                            ? 'Tiered Volume Incentive'
                            : commType === 'profit_share'
                            ? `${u.profitShareRate || 15}% Profit Margin Share`
                            : `${u.commissionRate || 5}% Standard Volume`}
                        </td>
                        <td className="p-3.5 font-bold text-sky-400">
                          KSh {simSalesVolume.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-indigo-400 font-bold">{simulatedRate}%</td>
                        <td className="p-3.5 font-black text-emerald-400 text-sm">
                          KSh {simulatedEarned.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleOpenEditPlanModal(u)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded-lg transition"
                          >
                            Edit Plan
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: DISBURSE COMMISSION PAYOUT                                      */}
      {/* ========================================================================= */}
      {payoutModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-slate-100">Disburse Worker Sales Commission</h3>
              </div>
              <button
                onClick={() => setPayoutModalItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayout} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Earnings Breakdown */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Staff Member:</span>
                  <span className="font-bold text-slate-100">{payoutModalItem.staff.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sales Period:</span>
                  <span className="font-mono text-slate-200">{periodLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Attributed Sales:</span>
                  <span className="font-mono text-sky-400 font-bold">
                    KSh {payoutModalItem.totalSales.toLocaleString()} ({payoutModalItem.count} orders)
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2">
                  <span className="text-slate-400">Commission Rule:</span>
                  <span className="font-mono text-indigo-400 font-bold">{payoutModalItem.modelName}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-slate-200">
                  <span>Gross Commission Earned:</span>
                  <span className="font-mono text-emerald-400 text-sm">
                    KSh {payoutModalItem.earnedCommission.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Loan Deduction Option if worker has active loan */}
              {payoutModalItem.activeLoan && (
                <div className="bg-rose-950/30 border border-rose-900/60 p-3 rounded-xl space-y-2 text-xs text-rose-300">
                  <div className="flex justify-between font-bold">
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" /> Deduct Outstanding Loan Repayment?
                    </span>
                    <span>Bal: KSh {payoutModalItem.activeLoan.balanceDue.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Deduct (KSh):</span>
                    <input
                      type="number"
                      min="0"
                      max={Math.min(payoutModalItem.earnedCommission, payoutModalItem.activeLoan.balanceDue)}
                      value={deductLoanAmount}
                      onChange={(e) => setDeductLoanAmount(Number(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-rose-800/80 rounded-lg px-3 py-1.5 text-rose-200 font-mono font-bold text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Net Payout Summary Banner */}
              <div className="bg-emerald-950/40 border border-emerald-800/60 p-3 rounded-xl flex items-center justify-between text-emerald-300">
                <span className="text-xs font-bold uppercase tracking-wider">Net Amount to Disburse:</span>
                <span className="text-lg font-black font-mono">
                  KSh {Math.max(0, payoutModalItem.earnedCommission - deductLoanAmount).toLocaleString()}
                </span>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Disbursement Channel</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none font-semibold"
                >
                  <option value="mpesa">📱 M-Pesa Mobile Transfer</option>
                  <option value="cash">💵 Petty Cash Drawer</option>
                  <option value="credit_card">🏦 Bank Transfer / Wire</option>
                  <option value="salary_addition">📄 Add to Monthly Salary Slip</option>
                  <option value="cheque">📜 Cheque</option>
                </select>
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Transaction Ref / Voucher No.</label>
                <input
                  type="text"
                  value={payoutRefNo}
                  onChange={(e) => setPayoutRefNo(e.target.value)}
                  placeholder="e.g. MPESA-QZ9921 or CHQ-0021"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Audit Notes</label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              {/* Accounting sync alert */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-bold text-slate-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Automatic Financial Ledgers Sync:</span>
                </div>
                <p>
                  Confirming this payout will automatically log an expense of KSh{' '}
                  {Math.max(0, payoutModalItem.earnedCommission - deductLoanAmount).toLocaleString()} into store cash
                  management and generate a signed audit record.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayoutModalItem(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-600/30"
                >
                  Confirm & Disburse Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ITEMIZED SALES DRAWER / MODAL                                   */}
      {/* ========================================================================= */}
      {selectedStaffForSales && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-sky-400" />
                  <span>Sales Orders Attributed to {selectedStaffForSales.staff.name}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {selectedStaffForSales.txList.length} orders totaling KSh{' '}
                  {selectedStaffForSales.totalSales.toLocaleString()} ({periodLabel})
                </p>
              </div>
              <button
                onClick={() => setSelectedStaffForSales(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {selectedStaffForSales.txList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No sales recorded for this worker in the selected timeframe.
                </div>
              ) : (
                selectedStaffForSales.txList.map((tx) => {
                  const comm = computeWorkerCommissionForTx(selectedStaffForSales.staff, tx);
                  return (
                    <div
                      key={tx.id}
                      className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-xl space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-sky-400">{tx.receiptNumber}</span>
                        <span className="text-slate-400">
                          {new Date(tx.date).toLocaleDateString()}{' '}
                          {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">Customer: {tx.customerName || 'Walk-in'}</span>
                        <span className="text-slate-400">{tx.items.length} line items</span>
                      </div>

                      <div className="bg-slate-900 p-2 rounded-lg flex items-center justify-between font-mono">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Grand Total</span>
                          <span className="font-bold text-slate-100">
                            KSh {tx.grandTotal.toLocaleString()}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-indigo-400 block">
                            Earned Commission ({comm.modelName})
                          </span>
                          <span className="font-bold text-emerald-400 text-sm">
                            KSh {comm.amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
              <div className="font-mono">
                <span className="text-slate-400">Total Accrued: </span>
                <span className="font-bold text-emerald-400 text-sm">
                  KSh {selectedStaffForSales.earnedCommission.toLocaleString()}
                </span>
              </div>
              <button
                onClick={() =>
                  exportCommissionStatementPDF(
                    selectedStaffForSales.staff,
                    selectedStaffForSales.txList,
                    periodLabel,
                    {
                      totalSales: selectedStaffForSales.totalSales,
                      commissionEarned: selectedStaffForSales.earnedCommission,
                      commissionRate: selectedStaffForSales.staff.commissionRate || 5,
                      modelName: selectedStaffForSales.modelName,
                      count: selectedStaffForSales.txList.length
                    }
                  )
                }
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Export PDF Statement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT WORKER COMMISSION PLAN                                     */}
      {/* ========================================================================= */}
      {editingStaffPlan && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-slate-100">
                  Configure Commission Model: {editingStaffPlan.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingStaffPlan(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCommissionPlan} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Model Selector */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Select Commission Model</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'percentage', label: 'Flat % of Sales', desc: 'Standard % on total bill' },
                    { id: 'tiered', label: 'Tiered Volume Incentive', desc: 'Higher % for higher volume' },
                    { id: 'fixed_per_sale', label: 'Fixed Cash / Sale', desc: 'Flat KSh bonus per order' },
                    { id: 'profit_share', label: 'Gross Margin Share', desc: '% of item profit margin' }
                  ].map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setPlanType(m.id as any)}
                      className={`p-3 rounded-xl border text-left transition ${
                        planType === m.id
                          ? 'border-indigo-500 bg-indigo-950/60 text-white shadow'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-slate-200">{m.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Inputs Based on Plan Type */}
              {planType === 'percentage' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Daily Sales Commission Rate (% Pay)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={planRate}
                    onChange={(e) => setPlanRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              )}

              {planType === 'fixed_per_sale' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Fixed Cash Bonus per Sale (KSh)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={planFixedAmount}
                    onChange={(e) => setPlanFixedAmount(Number(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>
              )}

              {planType === 'profit_share' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Gross Profit Margin Share Rate (% of Profit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={planProfitShare}
                    onChange={(e) => setPlanProfitShare(Number(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-indigo-300 font-mono font-bold focus:outline-none focus:border-indigo-500 text-sm"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Calculated automatically from item selling price minus item cost price.
                  </p>
                </div>
              )}

              {planType === 'tiered' && (
                <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="block text-slate-300 font-semibold">Tiered Performance Thresholds</label>
                  {planTiers.map((tier, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-slate-400 w-12">Tier {idx + 1}:</span>
                      <span className="text-slate-400">Min KSh</span>
                      <input
                        type="number"
                        value={tier.minSales}
                        onChange={(e) => {
                          const copy = [...planTiers];
                          copy[idx].minSales = Number(e.target.value) || 0;
                          setPlanTiers(copy);
                        }}
                        className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                      />
                      <span className="text-slate-400">Rate %</span>
                      <input
                        type="number"
                        value={tier.rate}
                        onChange={(e) => {
                          const copy = [...planTiers];
                          copy[idx].rate = Number(e.target.value) || 0;
                          setPlanTiers(copy);
                        }}
                        className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-300 font-bold"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Target Sales */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Daily Sales Target Goal (KSh)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={planDailyTarget}
                  onChange={(e) => setPlanDailyTarget(Number(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sky-300 font-mono font-bold focus:outline-none focus:border-sky-500 text-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStaffPlan(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-indigo-600/30"
                >
                  Save Commission Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RE-ATTRIBUTE SALE                                               */}
      {/* ========================================================================= */}
      {reattributeTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-100">
                Reassign Sales Rep: {reattributeTx.receiptNumber}
              </h3>
              <button
                onClick={() => setReattributeTx(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReattribute} className="p-5 space-y-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Sale Total:</span>
                  <span className="font-bold text-sky-400">
                    KSh {reattributeTx.grandTotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Assigned:</span>
                  <span className="text-slate-200">
                    {reattributeTx.salesRepName || reattributeTx.cashierName}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Assign to New Sales Rep / Worker:
                </label>
                <select
                  value={newSalesRepId}
                  onChange={(e) => setNewSalesRepId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReattributeTx(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 rounded-xl text-xs transition"
                >
                  Save & Update Attribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: PRINTABLE VOUCHER MODAL                                         */}
      {/* ========================================================================= */}
      {activeVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-sm text-slate-100">Commission Payment Voucher</h3>
              </div>
              <button
                onClick={() => setActiveVoucher(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-950/40">
              <div className="bg-white text-slate-900 rounded-xl p-6 shadow-xl font-mono text-xs max-w-sm mx-auto space-y-3 border border-slate-200">
                {/* Header */}
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
                  <div className="font-bold text-sm font-sans">ROFANI ELECTRONICS AND BOUTIQUE</div>
                  <div className="text-[10px] text-slate-500">OFFICIAL COMMISSION VOUCHER</div>
                  <div className="text-[9px] text-slate-400">Voucher Ref: {activeVoucher.id}</div>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-[11px] pb-3 border-b border-dashed border-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Worker Name:</span>
                    <span className="font-bold">{activeVoucher.employeeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sales Period:</span>
                    <span>{activeVoucher.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sales Base:</span>
                    <span>
                      KSh {activeVoucher.totalSalesAmount.toLocaleString()} ({activeVoucher.salesCount} orders)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Effective Rate:</span>
                    <span>{activeVoucher.commissionRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gross Commission:</span>
                    <span>KSh {activeVoucher.commissionEarned.toLocaleString()}</span>
                  </div>
                  {activeVoucher.loanDeduction ? (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>Loan Repayment Deduction:</span>
                      <span>- KSh {activeVoucher.loanDeduction.toLocaleString()}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between font-bold text-emerald-700 text-xs border-t border-slate-200 pt-1.5">
                    <span>Net Paid to Worker:</span>
                    <span>KSh {activeVoucher.paidAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Payment Channel:</span>
                    <span className="uppercase">{activeVoucher.paymentMethod || 'mpesa'}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Reference / Code:</span>
                    <span>{activeVoucher.referenceNo || 'N/A'}</span>
                  </div>
                </div>

                {/* Signatures */}
                <div className="pt-2 text-[10px] text-slate-500 space-y-4">
                  <div>Worker Signature: ______________________</div>
                  <div>Approved By: {activeVoucher.paidBy || 'Admin'}</div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
              <button
                onClick={() => exportCommissionPayoutSlipPDF(activeVoucher)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
