import React, { useState, useMemo, useEffect } from 'react';
import {
  Wallet,
  Calendar,
  Search,
  Sliders,
  CheckCircle2,
  Printer,
  Download,
  X,
  CreditCard,
  Clock,
  FileSpreadsheet,
  DollarSign,
  Send
} from 'lucide-react';
import {
  User as Employee,
  AttendanceRecord,
  WorkerLoan,
  WorkerSalaryPayout,
  PayType,
  PayCycle,
  PaymentMethod
} from '../../types';
import { safeGetJSON, safeSetJSON } from '../../utils/safeStorage';
import {
  exportSalaryPayslipPDF,
  exportPayrollSummaryPDF
} from '../../utils/pdfGenerator';

interface WorkerPayrollViewProps {
  allUsers: Employee[];
  currentUser: Employee;
  attendanceRecords: AttendanceRecord[];
  workerLoans: WorkerLoan[];
  salaryPayouts: WorkerSalaryPayout[];
  onPaySalary: (payout: WorkerSalaryPayout) => void;
  onUpdateUserSalarySettings?: (userId: string, settings: Partial<Employee>) => void;
}

type PayrollPeriodPreset = 'this_month' | 'last_month' | 'this_week' | 'today' | 'custom';

function computePeriodDates(
  preset: PayrollPeriodPreset,
  customStart: string,
  customEnd: string
): { startDate: string; endDate: string; label: string } {
  const now = new Date();
  const toIsoDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (preset === 'today') {
    const t = toIsoDate(now);
    return { startDate: t, endDate: t, label: `Today (${t})` };
  }
  if (preset === 'this_week') {
    const dayOfWeek = now.getDay();
    const diffToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const start = new Date(now);
    start.setDate(now.getDate() - diffToMon);
    const s = toIsoDate(start);
    const e = toIsoDate(now);
    return { startDate: s, endDate: e, label: `This Week (${s} to ${e})` };
  }
  if (preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    const s = toIsoDate(start);
    const e = toIsoDate(end);
    const monthName = start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    return { startDate: s, endDate: e, label: monthName };
  }
  if (preset === 'custom') {
    const s = customStart || toIsoDate(now);
    const e = customEnd || s;
    return { startDate: s, endDate: e, label: `${s} to ${e}` };
  }

  // Default: this_month
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const s = toIsoDate(start);
  const e = toIsoDate(end);
  const monthName = start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return { startDate: s, endDate: e, label: monthName };
}

function calculateShiftHours(clockIn?: string, clockOut?: string): number {
  if (!clockIn || !clockIn.includes(':')) return 8;
  const [inH, inM] = clockIn.split(':').map(Number);
  if (Number.isNaN(inH) || Number.isNaN(inM)) return 8;
  if (!clockOut || !clockOut.includes(':')) return 8;
  const [outH, outM] = clockOut.split(':').map(Number);
  if (Number.isNaN(outH) || Number.isNaN(outM)) return 8;
  const diffMins = outH * 60 + outM - (inH * 60 + inM);
  if (diffMins <= 0) return 8;
  return Number((diffMins / 60).toFixed(2));
}

export const WorkerPayrollView: React.FC<WorkerPayrollViewProps> = ({
  allUsers,
  currentUser,
  attendanceRecords,
  workerLoans,
  salaryPayouts,
  onPaySalary,
  onUpdateUserSalarySettings,
}) => {
  const [subTab, setSubTab] = useState<'roster' | 'history'>(() =>
    safeGetJSON<'roster' | 'history'>('retail_pos_payroll_subtab', 'roster', (v) =>
      v === 'roster' || v === 'history'
    )
  );
  useEffect(() => {
    safeSetJSON('retail_pos_payroll_subtab', subTab);
  }, [subTab]);

  const [periodPreset, setPeriodPreset] = useState<PayrollPeriodPreset>(() =>
    safeGetJSON<PayrollPeriodPreset>('retail_pos_payroll_preset', 'this_month', (v) =>
      ['this_month', 'last_month', 'this_week', 'today', 'custom'].includes(v)
    )
  );
  useEffect(() => {
    safeSetJSON('retail_pos_payroll_preset', periodPreset);
  }, [periodPreset]);

  const [customStart, setCustomStart] = useState<string>(() =>
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [customEnd, setCustomEnd] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Configure Worker Rate Modal State
  const [editingWorker, setEditingWorker] = useState<Employee | null>(null);
  const [cfgPayType, setCfgPayType] = useState<PayType>('monthly');
  const [cfgPayCycle, setCfgPayCycle] = useState<PayCycle>('Monthly');
  const [cfgBaseRate, setCfgBaseRate] = useState<string>('0');
  const [cfgAllowance, setCfgAllowance] = useState<string>('0');

  // Pay Worker Salary Modal State
  const [payingWorkerRow, setPayingWorkerRow] = useState<{
    staff: Employee;
    payType: PayType;
    payCycle: PayCycle;
    baseRate: number;
    allowance: number;
    daysWorked: number;
    hoursWorked: number;
    activeLoans: WorkerLoan[];
  } | null>(null);

  const [payUnits, setPayUnits] = useState<string>('1');
  const [payAllowance, setPayAllowance] = useState<string>('0');
  const [payBonus, setPayBonus] = useState<string>('0');
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [payLoanDeduction, setPayLoanDeduction] = useState<string>('0');
  const [payOtherDeductions, setPayOtherDeductions] = useState<string>('0');
  const [payOtherDeductionReason, setPayOtherDeductionReason] = useState<string>('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('mpesa');
  const [payRefNo, setPayRefNo] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');

  // Payslip preview modal
  const [viewingPayslip, setViewingPayslip] = useState<WorkerSalaryPayout | null>(null);

  const period = useMemo(
    () => computePeriodDates(periodPreset, customStart, customEnd),
    [periodPreset, customStart, customEnd]
  );

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const workerRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allUsers
      .filter((u) => {
        if (!q) return true;
        return (
          u.name.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          (u.department || '').toLowerCase().includes(q)
        );
      })
      .map((u) => {
        const payType: PayType = u.payType || 'monthly';
        const payCycle: PayCycle = u.payCycle || 'Monthly';
        const baseRate = Number(u.basePayRate || 0);
        const allowance = Number(u.fixedAllowance || 0);

        const shiftRecs = attendanceRecords.filter(
          (r) =>
            r.employeeId === u.id &&
            r.date >= period.startDate &&
            r.date <= period.endDate &&
            r.status !== 'Absent'
        );
        const daysWorked = new Set(shiftRecs.map((r) => r.date)).size;
        const hoursWorked = Number(
          shiftRecs
            .reduce((sum, r) => sum + calculateShiftHours(r.clockInTime, r.clockOutTime), 0)
            .toFixed(1)
        );

        let estimatedBase = 0;
        if (payType === 'monthly') {
          estimatedBase = baseRate;
        } else if (payType === 'daily') {
          estimatedBase = daysWorked * baseRate;
        } else {
          estimatedBase = Number((hoursWorked * baseRate).toFixed(2));
        }

        const activeLoans = workerLoans.filter(
          (l) =>
            l.workerId === u.id &&
            (l.status === 'Active' || l.status === 'Overdue') &&
            l.balanceDue > 0
        );
        const totalLoanBalance = activeLoans.reduce((s, l) => s + l.balanceDue, 0);

        const periodPayouts = salaryPayouts.filter((p) => {
          if (p.employeeId !== u.id) return false;
          return p.startDate <= period.endDate && p.endDate >= period.startDate;
        });
        const totalPaidInPeriod = periodPayouts.reduce((s, p) => s + p.netPayPaid, 0);

        return {
          staff: u,
          payType,
          payCycle,
          baseRate,
          allowance,
          daysWorked,
          hoursWorked,
          estimatedBase,
          estimatedGross: estimatedBase + (baseRate > 0 ? allowance : 0),
          activeLoans,
          totalLoanBalance,
          periodPayouts,
          totalPaidInPeriod,
        };
      });
  }, [allUsers, searchQuery, attendanceRecords, workerLoans, salaryPayouts, period]);

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return salaryPayouts.filter((p) => {
      if (!q) return true;
      return (
        p.employeeName.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.payPeriodLabel.toLowerCase().includes(q) ||
        (p.referenceNo || '').toLowerCase().includes(q)
      );
    });
  }, [salaryPayouts, searchQuery]);

  const summary = useMemo(() => {
    const estimatedPayroll = workerRows.reduce((s, r) => s + r.estimatedGross, 0);
    const totalActiveLoans = workerRows.reduce((s, r) => s + r.totalLoanBalance, 0);
    const paidInPeriod = workerRows.reduce((s, r) => s + r.totalPaidInPeriod, 0);
    const paidWorkersCount = workerRows.filter((r) => r.periodPayouts.length > 0).length;
    const configuredCount = workerRows.filter((r) => r.baseRate > 0).length;
    return {
      estimatedPayroll,
      totalActiveLoans,
      paidInPeriod,
      paidWorkersCount,
      configuredCount,
    };
  }, [workerRows]);

  const openConfigureModal = (u: Employee) => {
    setEditingWorker(u);
    setCfgPayType(u.payType || 'monthly');
    setCfgPayCycle(u.payCycle || 'Monthly');
    setCfgBaseRate(String(u.basePayRate || 0));
    setCfgAllowance(String(u.fixedAllowance || 0));
  };

  const handleSavePayConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorker || !onUpdateUserSalarySettings) return;
    const parsedRate = Math.max(0, Number(cfgBaseRate) || 0);
    const parsedAllowance = Math.max(0, Number(cfgAllowance) || 0);
    onUpdateUserSalarySettings(editingWorker.id, {
      payType: cfgPayType,
      payCycle: cfgPayCycle,
      basePayRate: parsedRate,
      fixedAllowance: parsedAllowance,
    });
    triggerToast(`Saved salary rate for ${editingWorker.name} (KSh ${parsedRate.toLocaleString()})`);
    setEditingWorker(null);
  };

  const openPayModal = (row: (typeof workerRows)[number]) => {
    setPayingWorkerRow({
      staff: row.staff,
      payType: row.payType,
      payCycle: row.payCycle,
      baseRate: row.baseRate,
      allowance: row.allowance,
      daysWorked: row.daysWorked,
      hoursWorked: row.hoursWorked,
      activeLoans: row.activeLoans,
    });

    if (row.payType === 'monthly') {
      setPayUnits('1');
    } else if (row.payType === 'daily') {
      setPayUnits(String(row.daysWorked > 0 ? row.daysWorked : 1));
    } else {
      setPayUnits(String(row.hoursWorked > 0 ? row.hoursWorked : 8));
    }

    setPayAllowance(String(row.allowance || 0));
    setPayBonus('0');

    const firstLoan = row.activeLoans[0];
    setSelectedLoanId(firstLoan ? firstLoan.id : '');
    setPayLoanDeduction('0');
    setPayOtherDeductions('0');
    setPayOtherDeductionReason('');
    setPayMethod('mpesa');
    setPayRefNo('');
    setPayNotes(`${period.label} payroll payout`);
  };

  const payComputation = useMemo(() => {
    if (!payingWorkerRow) {
      return { baseEarned: 0, allowanceAmt: 0, bonusAmt: 0, gross: 0, loanDed: 0, otherDed: 0, net: 0, selectedLoan: undefined };
    }
    const units = Math.max(0, Number(payUnits) || 0);
    const baseEarned = Number((payingWorkerRow.baseRate * units).toFixed(2));
    const allowanceAmt = Math.max(0, Number(payAllowance) || 0);
    const bonusAmt = Math.max(0, Number(payBonus) || 0);
    const gross = Number((baseEarned + allowanceAmt + bonusAmt).toFixed(2));

    const selectedLoan = payingWorkerRow.activeLoans.find((l) => l.id === selectedLoanId);
    const maxLoanDed = selectedLoan ? selectedLoan.balanceDue : 0;
    const requestedLoanDed = Math.max(0, Number(payLoanDeduction) || 0);
    const loanDed = Math.min(requestedLoanDed, maxLoanDed, gross);

    const otherDed = Math.max(0, Number(payOtherDeductions) || 0);
    const net = Math.max(0, Number((gross - loanDed - otherDed).toFixed(2)));

    return { baseEarned, allowanceAmt, bonusAmt, gross, loanDed, otherDed, net, selectedLoan };
  }, [payingWorkerRow, payUnits, payAllowance, payBonus, selectedLoanId, payLoanDeduction, payOtherDeductions]);

  const handleConfirmPaySalary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingWorkerRow) return;

    const payout: WorkerSalaryPayout = {
      id: `PAY-${Date.now().toString().slice(-6)}`,
      employeeId: payingWorkerRow.staff.id,
      employeeName: payingWorkerRow.staff.name,
      role: payingWorkerRow.staff.role,
      payType: payingWorkerRow.payType,
      payCycle: payingWorkerRow.payCycle,
      payPeriodLabel: period.label,
      startDate: period.startDate,
      endDate: period.endDate,
      baseRate: payingWorkerRow.baseRate,
      unitsWorked: Math.max(0, Number(payUnits) || 0),
      basePayEarned: payComputation.baseEarned,
      allowances: payComputation.allowanceAmt,
      overtimeOrBonus: payComputation.bonusAmt,
      grossPay: payComputation.gross,
      loanDeduction: payComputation.loanDed,
      deductedLoanId: payComputation.loanDed > 0 ? selectedLoanId : undefined,
      otherDeductions: payComputation.otherDed,
      otherDeductionReason: payOtherDeductionReason.trim() || undefined,
      netPayPaid: payComputation.net,
      paymentMethod: payMethod,
      referenceNo: payRefNo.trim() || undefined,
      notes: payNotes.trim() || undefined,
      paidBy: `${currentUser.name} (${currentUser.role})`,
      paidAt: new Date().toISOString(),
      status: 'Paid',
    };

    onPaySalary(payout);
    setPayingWorkerRow(null);
    setViewingPayslip(payout);
    triggerToast(`Salary paid to ${payout.employeeName}: KSh ${payout.netPayPaid.toLocaleString()}`);
  };

  const handleExportCsv = () => {
    const headers = [
      'Payslip ID',
      'Paid Date',
      'Employee',
      'Role',
      'Pay Type',
      'Period',
      'Base Pay',
      'Allowances',
      'Bonus/Overtime',
      'Gross Pay',
      'Loan Deduction',
      'Other Deductions',
      'Net Paid',
      'Method',
      'Reference',
    ];
    const rows = filteredHistory.map((p) => [
      p.id,
      p.paidAt ? new Date(p.paidAt).toLocaleDateString() : p.endDate,
      `"${p.employeeName.replace(/"/g, '""')}"`,
      `"${p.role.replace(/"/g, '""')}"`,
      p.payType,
      `"${p.payPeriodLabel.replace(/"/g, '""')}"`,
      p.basePayEarned,
      p.allowances,
      p.overtimeOrBonus,
      p.grossPay,
      p.loanDeduction,
      p.otherDeductions,
      p.netPayPaid,
      p.paymentMethod,
      `"${(p.referenceNo || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payroll_History_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('Exported payroll ledger to CSV');
  };

  const formatPayType = (t: PayType) =>
    t === 'monthly' ? 'Monthly Salary' : t === 'daily' ? 'Daily Wage' : 'Hourly Rate';

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[70] bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Worker Salaries &amp; Wages Payroll</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Set monthly salaries, daily wages, or hourly rates per worker, deduct advances automatically, and print PDF payslips.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => exportPayrollSummaryPDF(filteredHistory, period.label)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            <span>Payroll PDF</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 4-Column Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium">Estimated Payroll ({period.label})</p>
          <p className="text-xl font-bold text-slate-100 font-mono tabular-nums mt-1">
            KSh {summary.estimatedPayroll.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {summary.configuredCount} of {allUsers.length} workers configured
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium">Net Paid in Selected Period</p>
          <p className="text-xl font-bold text-emerald-400 font-mono tabular-nums mt-1">
            KSh {summary.paidInPeriod.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {summary.paidWorkersCount} worker{summary.paidWorkersCount === 1 ? '' : 's'} settled
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium">Recoverable Worker Advances</p>
          <p className="text-xl font-bold text-amber-400 font-mono tabular-nums mt-1">
            KSh {summary.totalActiveLoans.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Deductible during salary disbursement
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium">Total Payslips Issued</p>
          <p className="text-xl font-bold text-sky-400 font-mono tabular-nums mt-1">
            {salaryPayouts.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Auto-synced to Expenses (Salaries)
          </p>
        </div>
      </div>

      {/* Period Filter & Sub-Tabs Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setSubTab('roster')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                subTab === 'roster' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Worker Salary Roster ({workerRows.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('history')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                subTab === 'history' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Payslips &amp; Payout History ({salaryPayouts.length})
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(
              [
                ['this_month', 'This Month'],
                ['last_month', 'Last Month'],
                ['this_week', 'This Week'],
                ['today', 'Today'],
                ['custom', 'Custom'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriodPreset(key)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  periodPreset === key
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {periodPreset === 'custom' && (
            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs"
              />
            </div>
          )}
        </div>

        <div className="relative w-full xl:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search worker, role, ref..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Main Content */}
      {subTab === 'roster' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {workerRows.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              No workers matched "{searchQuery}".
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                      <th className="py-3 px-4 font-semibold">Worker</th>
                      <th className="py-3 px-4 font-semibold">Pay Structure</th>
                      <th className="py-3 px-4 font-semibold text-right">Base Rate</th>
                      <th className="py-3 px-4 font-semibold text-right">Allowance</th>
                      <th className="py-3 px-4 font-semibold text-right">Shifts / Hrs</th>
                      <th className="py-3 px-4 font-semibold text-right">Est. Period Pay</th>
                      <th className="py-3 px-4 font-semibold text-right">Active Advance</th>
                      <th className="py-3 px-4 font-semibold text-right">Paid ({period.label})</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {workerRows.map((row) => (
                      <tr key={row.staff.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-100">{row.staff.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {row.staff.role}
                            {row.staff.department ? ` · ${row.staff.department}` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-200 font-medium">{formatPayType(row.payType)}</div>
                          <div className="text-[11px] text-slate-500">{row.payCycle} cycle</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-200">
                          {row.baseRate > 0 ? (
                            `KSh ${row.baseRate.toLocaleString()}`
                          ) : (
                            <span className="text-slate-500">Not set</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                          KSh {row.allowance.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                          {row.daysWorked}d · {row.hoursWorked}h
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-sky-300">
                          KSh {row.estimatedGross.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {row.totalLoanBalance > 0 ? (
                            <span className="text-amber-400 font-semibold">
                              KSh {row.totalLoanBalance.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-500">KSh 0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {row.totalPaidInPeriod > 0 ? (
                            <span className="text-emerald-400 font-semibold">
                              KSh {row.totalPaidInPeriod.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-500">Unpaid</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openConfigureModal(row.staff)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1"
                              title="Set salary or wage rate"
                            >
                              <Sliders className="w-3.5 h-3.5 text-sky-400" />
                              <span>Set Rate</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openPayModal(row)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Pay Salary</span>
                            </button>
                            {row.periodPayouts.length > 0 && (
                              <button
                                type="button"
                                onClick={() => exportSalaryPayslipPDF(row.periodPayouts[0])}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                                title="Download latest payslip PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-800">
                {workerRows.map((row) => (
                  <div key={row.staff.id} className="p-4 space-y-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-100 text-sm">{row.staff.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {row.staff.role} · {formatPayType(row.payType)} ({row.payCycle})
                        </div>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <div className="text-sky-300 font-bold">
                          Est. KSh {row.estimatedGross.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Rate: KSh {row.baseRate.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/70 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Attendance</span>
                        <span className="font-mono tabular-nums text-slate-200">
                          {row.daysWorked}d · {row.hoursWorked}h
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Advance Due</span>
                        <span className={`font-mono tabular-nums ${row.totalLoanBalance > 0 ? 'text-amber-400 font-semibold' : 'text-slate-400'}`}>
                          KSh {row.totalLoanBalance.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block">Paid</span>
                        <span className={`font-mono tabular-nums ${row.totalPaidInPeriod > 0 ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                          KSh {row.totalPaidInPeriod.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => openConfigureModal(row.staff)}
                        className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5 text-sky-400" />
                        <span>Set Rate</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openPayModal(row)}
                        className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Pay Salary</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        /* Payout History Ledger */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {filteredHistory.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-slate-300 font-medium">No salary or wage payouts recorded yet.</p>
              <p className="text-xs text-slate-500">
                Select any worker in the Salary Roster tab to set their pay rate and issue their first payslip.
              </p>
              <button
                type="button"
                onClick={() => setSubTab('roster')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Go to Worker Salary Roster
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                    <th className="py-3 px-4 font-semibold">Date &amp; ID</th>
                    <th className="py-3 px-4 font-semibold">Worker</th>
                    <th className="py-3 px-4 font-semibold">Period &amp; Structure</th>
                    <th className="py-3 px-4 font-semibold text-right">Gross Pay</th>
                    <th className="py-3 px-4 font-semibold text-right">Deductions</th>
                    <th className="py-3 px-4 font-semibold text-right">Net Paid</th>
                    <th className="py-3 px-4 font-semibold">Method / Ref</th>
                    <th className="py-3 px-4 font-semibold text-right">Payslip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredHistory.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-200">{new Date(p.paidAt).toLocaleDateString()}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{p.id}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100">{p.employeeName}</div>
                        <div className="text-[11px] text-slate-400">{p.role}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-200">{p.payPeriodLabel}</div>
                        <div className="text-[11px] text-slate-500">
                          {formatPayType(p.payType)} · {p.unitsWorked} unit(s)
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-200">
                        KSh {p.grossPay.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-400">
                        - KSh {(p.loanDeduction + p.otherDeductions).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-400">
                        KSh {p.netPayPaid.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="uppercase text-slate-200 font-medium">{p.paymentMethod}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{p.referenceNo || 'No ref'}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingPayslip(p)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => exportSalaryPayslipPDF(p)}
                            className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Configure Worker Salary / Wage Rate */}
      {editingWorker && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Configure Pay Rate</h3>
                <p className="text-xs text-slate-400">
                  {editingWorker.name} · {editingWorker.role}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingWorker(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePayConfig} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Pay Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['monthly', 'Monthly Salary'],
                      ['daily', 'Daily Wage'],
                      ['hourly', 'Hourly Rate'],
                    ] as const
                  ).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setCfgPayType(val);
                        if (val === 'monthly') setCfgPayCycle('Monthly');
                        if (val === 'daily') setCfgPayCycle('Weekly');
                      }}
                      className={`py-2 px-2 rounded-lg border font-semibold transition cursor-pointer ${
                        cfgPayType === val
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Pay Cycle</label>
                <select
                  value={cfgPayCycle}
                  onChange={(e) => setCfgPayCycle(e.target.value as PayCycle)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Bi-Weekly">Bi-Weekly (Every 2 Weeks)</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Daily">Daily</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  {cfgPayType === 'monthly'
                    ? 'Base Monthly Salary (KSh)'
                    : cfgPayType === 'daily'
                    ? 'Daily Shift Wage Rate (KSh / day)'
                    : 'Hourly Wage Rate (KSh / hour)'}
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  required
                  value={cfgBaseRate}
                  onChange={(e) => setCfgBaseRate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 25000"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Fixed Allowance per Period (KSh) — Transport / Lunch / Housing
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={cfgAllowance}
                  onChange={(e) => setCfgAllowance(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 3000"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingWorker(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
                >
                  Save Pay Setup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Process Salary / Wage Payout */}
      {payingWorkerRow && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-100 text-sm">
                  Pay Salary / Wage — {payingWorkerRow.staff.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {period.label} · {formatPayType(payingWorkerRow.payType)} (KSh {payingWorkerRow.baseRate.toLocaleString()})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayingWorkerRow(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPaySalary} className="p-5 space-y-4 text-xs max-h-[82vh] overflow-y-auto">
              {payingWorkerRow.baseRate <= 0 && (
                <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-700/60 text-amber-200 flex items-center justify-between gap-2">
                  <span>Base rate is currently KSh 0. Set a rate first or enter bonus/overtime below.</span>
                  <button
                    type="button"
                    onClick={() => {
                      const s = payingWorkerRow.staff;
                      setPayingWorkerRow(null);
                      openConfigureModal(s);
                    }}
                    className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded shrink-0 cursor-pointer"
                  >
                    Set Rate
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {payingWorkerRow.payType === 'monthly'
                      ? 'Months (1 = full)'
                      : payingWorkerRow.payType === 'daily'
                      ? `Days Worked (${payingWorkerRow.daysWorked} logged)`
                      : `Hours Worked (${payingWorkerRow.hoursWorked}h logged)`}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={payUnits}
                    onChange={(e) => setPayUnits(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Allowance (KSh)</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={payAllowance}
                    onChange={(e) => setPayAllowance(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Bonus / Overtime (KSh)</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={payBonus}
                    onChange={(e) => setPayBonus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Deductions Section */}
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="font-semibold text-slate-300">Deductions</div>

                {payingWorkerRow.activeLoans.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <div>
                      <label className="block text-amber-300 font-semibold mb-1">
                        Deduct Worker Loan / Advance
                      </label>
                      <select
                        value={selectedLoanId}
                        onChange={(e) => {
                          setSelectedLoanId(e.target.value);
                          setPayLoanDeduction('0');
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100"
                      >
                        {payingWorkerRow.activeLoans.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.loanNumber} (Bal: KSh {l.balanceDue.toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-300 font-semibold">Loan Deduction (KSh)</label>
                        {payComputation.selectedLoan && (
                          <button
                            type="button"
                            onClick={() =>
                              setPayLoanDeduction(
                                String(Math.min(payComputation.selectedLoan!.balanceDue, payComputation.gross))
                              )
                            }
                            className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                          >
                            Deduct Max
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={payComputation.selectedLoan?.balanceDue || 0}
                        step="any"
                        value={payLoanDeduction}
                        onChange={(e) => setPayLoanDeduction(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono tabular-nums"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Other Deductions (NSSF / SHA / PAYE)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={payOtherDeductions}
                      onChange={(e) => setPayOtherDeductions(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Deduction Reason</label>
                    <input
                      type="text"
                      value={payOtherDeductionReason}
                      onChange={(e) => setPayOtherDeductionReason(e.target.value)}
                      placeholder="e.g. NSSF + SHA"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-800 pt-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100"
                  >
                    <option value="mpesa">M-Pesa</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">Mobile / Wallet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Reference / M-Pesa Code</label>
                  <input
                    type="text"
                    value={payRefNo}
                    onChange={(e) => setPayRefNo(e.target.value)}
                    placeholder="e.g. QK82..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Payroll Notes</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              {/* Net Summary */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5 font-mono tabular-nums">
                <div className="flex justify-between text-slate-400">
                  <span>Base Pay ({payUnits || 0} unit × KSh {payingWorkerRow.baseRate.toLocaleString()})</span>
                  <span>KSh {payComputation.baseEarned.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Allowances + Bonus</span>
                  <span>KSh {(payComputation.allowanceAmt + payComputation.bonusAmt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-200 font-semibold border-t border-slate-800 pt-1">
                  <span>Gross Pay</span>
                  <span>KSh {payComputation.gross.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-amber-400">
                  <span>Total Deductions</span>
                  <span>- KSh {(payComputation.loanDed + payComputation.otherDed).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-400 text-sm font-bold border-t border-slate-800 pt-1.5">
                  <span>NET SALARY TO PAY</span>
                  <span>KSh {payComputation.net.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingWorkerRow(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirm &amp; Issue Payslip</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: View Official Payslip */}
      {viewingPayslip && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Worker Payslip #{viewingPayslip.id}</h3>
                <p className="text-xs text-slate-400">{viewingPayslip.payPeriodLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingPayslip(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Employee</span>
                <span className="font-semibold text-slate-100">
                  {viewingPayslip.employeeName} ({viewingPayslip.role})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pay Structure</span>
                <span className="text-slate-200">
                  {formatPayType(viewingPayslip.payType)} · {viewingPayslip.unitsWorked} unit(s)
                </span>
              </div>
              <div className="border-t border-slate-800 pt-2 space-y-1.5 font-mono tabular-nums">
                <div className="flex justify-between text-slate-300">
                  <span>Base Earned</span>
                  <span>KSh {viewingPayslip.basePayEarned.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Allowances &amp; Bonus</span>
                  <span>KSh {(viewingPayslip.allowances + viewingPayslip.overtimeOrBonus).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-amber-400">
                  <span>Loan / Advance Deduction</span>
                  <span>- KSh {viewingPayslip.loanDeduction.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-amber-400">
                  <span>Other Deductions</span>
                  <span>- KSh {viewingPayslip.otherDeductions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold text-sm border-t border-slate-800 pt-2">
                  <span>Net Paid ({viewingPayslip.paymentMethod.toUpperCase()})</span>
                  <span>KSh {viewingPayslip.netPayPaid.toLocaleString()}</span>
                </div>
              </div>
              {viewingPayslip.referenceNo && (
                <div className="flex justify-between text-slate-400">
                  <span>Reference</span>
                  <span className="font-mono text-slate-200">{viewingPayslip.referenceNo}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewingPayslip(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => exportSalaryPayslipPDF(viewingPayslip)}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Download PDF Payslip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
