import React, { useMemo, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Check,
  Copy,
  Download,
  Filter,
  MessageCircle,
  Plus,
  Printer,
  Search,
  Share2,
  Users,
  Wallet,
  X,
  BadgeCheck,
  Banknote,
} from 'lucide-react';
import {
  Expense,
  PaymentMethod,
  StaffCommissionPayout,
  Transaction,
  User as Employee,
  WorkerSalaryPayout,
} from '../../types';

interface WorkersWagesCommissionsReportProps {
  allUsers: Employee[];
  transactions: Transaction[];
  expenses: Expense[];
  salaryPayouts?: WorkerSalaryPayout[];
  commissionPayouts?: StaffCommissionPayout[];
  storeName?: string;
  activeStoreId?: string;
  onAddExpense?: (expense: Expense) => void;
}

interface WageLogEntry {
  id: string;
  date: string;
  workerKey: string;
  workerName: string;
  amount: number;
  description: string;
  paymentMethod: string;
  source: 'expense' | 'payroll';
}

interface WorkerSummaryRow {
  workerKey: string;
  workerId?: string;
  workerName: string;
  role: string;
  wageEntriesCount: number;
  distinctWageDays: number;
  totalWages: number;
  salesCount: number;
  attributedSales: number;
  earnedCommission: number;
  commissionModelLabel: string;
  combinedTotalDue: number;
  commissionAlreadyPaid: number;
  wageEntries: WageLogEntry[];
  salesTransactions: Transaction[];
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Converts a date input to local YYYY-MM-DD without UTC midnight shift bugs.
 * Plain YYYY-MM-DD strings stay untouched; full ISO timestamps convert to local date.
 */
export function toLocalYmd(dateInput?: string | Date | null): string {
  if (!dateInput) {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  }
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(trimmed) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
    }
    return trimmed.slice(0, 10);
  }
  return `${dateInput.getFullYear()}-${pad2(dateInput.getMonth() + 1)}-${pad2(dateInput.getDate())}`;
}

function getDaysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function formatReadableDate(ymd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return ymd;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatKsh(val: number): string {
  return `KSh ${Math.round(val).toLocaleString()}`;
}

function computeCommissionForWorkerTx(worker: Employee | undefined, staffTx: Transaction[]): {
  earnedCommission: number;
  modelLabel: string;
} {
  if (staffTx.length === 0) {
    if (!worker) return { earnedCommission: 0, modelLabel: 'No sales' };
    const rate = worker.commissionRate !== undefined ? worker.commissionRate : 5;
    return { earnedCommission: 0, modelLabel: `${rate}% Volume` };
  }

  if (!worker) {
    const sumRecorded = staffTx.reduce((s, t) => s + (t.cashierCommissionAmount || 0), 0);
    return {
      earnedCommission: Math.round(sumRecorded),
      modelLabel: 'Recorded Rate',
    };
  }

  const totalSales = staffTx.reduce((s, t) => s + (t.grandTotal || 0), 0);
  const count = staffTx.length;
  const commType = worker.commissionType || 'percentage';

  if (commType === 'fixed_per_sale') {
    const fixed = worker.fixedCommissionPerSale || 50;
    return {
      earnedCommission: Math.round(count * fixed),
      modelLabel: `Fixed KSh ${fixed}/sale`,
    };
  }

  if (commType === 'tiered' && worker.commissionTiers && worker.commissionTiers.length > 0) {
    let activeTier = worker.commissionTiers[0];
    for (const tier of worker.commissionTiers) {
      if (totalSales >= tier.minSales && (tier.maxSales === undefined || totalSales <= tier.maxSales)) {
        activeTier = tier;
        break;
      }
    }
    if (totalSales > (worker.commissionTiers[worker.commissionTiers.length - 1].minSales || 0)) {
      activeTier = worker.commissionTiers[worker.commissionTiers.length - 1];
    }
    return {
      earnedCommission: Math.round(totalSales * (activeTier.rate / 100)),
      modelLabel: `Tiered (${activeTier.rate}%)`,
    };
  }

  if (commType === 'profit_share') {
    const profitRate = worker.profitShareRate || 15;
    let cumulativeProfit = 0;
    staffTx.forEach((tx) => {
      tx.items.forEach((item) => {
        const unitSell = item.product?.sellingPrice || item.unitPrice || 0;
        const unitCost = item.product?.costPrice || 0;
        cumulativeProfit += Math.max(0, (unitSell - unitCost) * item.quantity);
      });
    });
    return {
      earnedCommission: Math.round(cumulativeProfit * (profitRate / 100)),
      modelLabel: `${profitRate}% Margin`,
    };
  }

  const rate = worker.commissionRate !== undefined ? worker.commissionRate : 5;
  return {
    earnedCommission: Math.round(totalSales * (rate / 100)),
    modelLabel: `${rate}% Volume`,
  };
}

function parseWorkerNameFromWageDescription(desc: string): string | null {
  const cleaned = desc.trim();
  const patterns = [
    /^daily\s+wage\s*[-–:]\s*(.+)$/i,
    /^worker\s+wage\s*[-–:]\s*(.+)$/i,
    /^salary\s*\/\s*wage\s*:\s*(.+)$/i,
    /^salary\s*[-–:]\s*(.+)$/i,
    /^wage\s*[-–:]\s*(.+)$/i,
  ];
  for (const re of patterns) {
    const m = cleaned.match(re);
    if (m && m[1]) {
      const stripped = m[1]
        .replace(/\([^)]*\)/g, '')
        .split(/\s[-–|]\s/)[0]
        .trim();
      if (stripped.length >= 2) return stripped;
    }
  }
  return null;
}

export const WorkersWagesCommissionsReport: React.FC<WorkersWagesCommissionsReportProps> = ({
  allUsers,
  transactions,
  expenses,
  salaryPayouts = [],
  commissionPayouts = [],
  storeName = 'Rofani POS',
  activeStoreId,
  onAddExpense,
}) => {
  const currentMonthBounds = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const lastDay = getDaysInMonth(y, m);
    const ym = `${y}-${pad2(m + 1)}`;
    return {
      first: `${ym}-01`,
      last: `${ym}-${pad2(lastDay)}`,
      year: y,
      monthIndex0: m,
    };
  }, []);

  const [fromDate, setFromDate] = useState<string>(currentMonthBounds.first);
  const [toDate, setToDate] = useState<string>(currentMonthBounds.last);
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedWorkerKey, setExpandedWorkerKey] = useState<string | null>(null);
  const [showZeroActivityWorkers, setShowZeroActivityWorkers] = useState<boolean>(false);

  // Share Modal state
  const [shareModalState, setShareModalState] = useState<{
    title: string;
    text: string;
  } | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [copiedFlag, setCopiedFlag] = useState<boolean>(false);

  // Quick Daily Wage Modal state
  const [showWageModal, setShowWageModal] = useState<boolean>(false);
  const [wageWorkerId, setWageWorkerId] = useState<string>(allUsers[0]?.id || '');
  const [wageCustomWorkerName, setWageCustomWorkerName] = useState<string>('');
  const [wageDate, setWageDate] = useState<string>(toLocalYmd());
  const [wageAmount, setWageAmount] = useState<string>('');
  const [wageMethod, setWageMethod] = useState<PaymentMethod>('cash');
  const [wageNotes, setWageNotes] = useState<string>('');

  const showToast = (msg: string) => {
    setShareToast(msg);
    window.setTimeout(() => setShareToast(null), 3200);
  };

  // Determine anchor year/month from current fromDate (or current month if invalid)
  const anchorYm = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(fromDate);
    if (m) {
      return { year: Number(m[1]), monthIndex0: Number(m[2]) - 1 };
    }
    return { year: currentMonthBounds.year, monthIndex0: currentMonthBounds.monthIndex0 };
  }, [fromDate, currentMonthBounds]);

  const applyPreset = (preset: 'this_month' | '1_15' | '16_end' | '21_30') => {
    if (preset === 'this_month') {
      setFromDate(currentMonthBounds.first);
      setToDate(currentMonthBounds.last);
      return;
    }
    const { year, monthIndex0 } = anchorYm;
    const ym = `${year}-${pad2(monthIndex0 + 1)}`;
    const daysInMonth = getDaysInMonth(year, monthIndex0);
    if (preset === '1_15') {
      setFromDate(`${ym}-01`);
      setToDate(`${ym}-15`);
    } else if (preset === '16_end') {
      setFromDate(`${ym}-16`);
      setToDate(`${ym}-${pad2(daysInMonth)}`);
    } else if (preset === '21_30') {
      const endDay = Math.min(30, daysInMonth);
      setFromDate(`${ym}-21`);
      setToDate(`${ym}-${pad2(endDay)}`);
    }
  };

  const activePreset = useMemo(() => {
    if (fromDate === currentMonthBounds.first && toDate === currentMonthBounds.last) {
      return 'this_month';
    }
    const { year, monthIndex0 } = anchorYm;
    const ym = `${year}-${pad2(monthIndex0 + 1)}`;
    const daysInMonth = getDaysInMonth(year, monthIndex0);
    if (fromDate === `${ym}-01` && toDate === `${ym}-15`) return '1_15';
    if (fromDate === `${ym}-16` && toDate === `${ym}-${pad2(daysInMonth)}`) return '16_end';
    if (fromDate === `${ym}-21` && toDate === `${ym}-${pad2(Math.min(30, daysInMonth))}`) return '21_30';
    return 'custom';
  }, [fromDate, toDate, anchorYm, currentMonthBounds]);

  const sortedUsersForMatch = useMemo(
    () => [...allUsers].sort((a, b) => b.name.length - a.name.length),
    [allUsers]
  );

  // Normalized normalizedStart <= normalizedEnd so even inverted inputs work cleanly
  const [effectiveFrom, effectiveTo] = useMemo(() => {
    if (!fromDate && !toDate) return ['0000-00-00', '9999-99-99'];
    const f = fromDate || '0000-00-00';
    const t = toDate || '9999-99-99';
    return f <= t ? [f, t] : [t, f];
  }, [fromDate, toDate]);

  // Core aggregation across Wages (expenses + salaryPayouts) + Attributed Sales/Commissions
  const { workerRows, grandTotals } = useMemo(() => {
    const rowMap = new Map<
      string,
      {
        workerKey: string;
        worker?: Employee;
        workerName: string;
        role: string;
        wageEntries: WageLogEntry[];
        salesTransactions: Transaction[];
        commissionAlreadyPaid: number;
      }
    >();

    const ensureRow = (key: string, worker?: Employee, fallbackName?: string): NonNullable<ReturnType<typeof rowMap.get>> => {
      const existing = rowMap.get(key);
      if (existing) return existing;
      const created = {
        workerKey: key,
        worker,
        workerName: worker?.name || fallbackName || 'General Staff Wages',
        role: worker?.role || 'Staff',
        wageEntries: [] as WageLogEntry[],
        salesTransactions: [] as Transaction[],
        commissionAlreadyPaid: 0,
      };
      rowMap.set(key, created);
      return created;
    };

    // Pre-register known staff so worker dropdown & zero-activity option work smoothly
    allUsers.forEach((u) => {
      ensureRow(u.id, u, u.name);
    });

    const matchUserByExpense = (exp: Expense): { key: string; user?: Employee; displayName: string } => {
      if (exp.workerId) {
        const byId = allUsers.find((u) => u.id === exp.workerId);
        if (byId) return { key: byId.id, user: byId, displayName: byId.name };
      }
      if (exp.workerName) {
        const lower = exp.workerName.trim().toLowerCase();
        const byName = allUsers.find((u) => (u.name || '').trim().toLowerCase() === lower);
        if (byName) return { key: byName.id, user: byName, displayName: byName.name };
        return { key: `name:${lower}`, displayName: exp.workerName.trim() };
      }

      const descLower = (exp.description || '').toLowerCase();
      for (const u of sortedUsersForMatch) {
        if (u.name && descLower.includes(u.name.trim().toLowerCase())) {
          return { key: u.id, user: u, displayName: u.name };
        }
      }

      const parsed = parseWorkerNameFromWageDescription(exp.description || '');
      if (parsed) {
        const lower = parsed.toLowerCase();
        const exact = allUsers.find((u) => (u.name || '').trim().toLowerCase() === lower);
        if (exact) return { key: exact.id, user: exact, displayName: exact.name };
        return { key: `name:${lower}`, displayName: parsed };
      }

      return { key: 'general:staff-wages', displayName: 'General Staff Wages' };
    };

    // 1. Collect Wage Expenses strictly inside date range & active store
    const matchedSalaryExpenses: Expense[] = [];
    expenses.forEach((exp) => {
      if (activeStoreId && exp.storeId && exp.storeId !== activeStoreId) return;
      if (exp.category !== 'Salaries') return;

      const lowerDesc = (exp.description || '').toLowerCase();
      const isCommissionPayout =
        exp.id.startsWith('exp-comm-') ||
        exp.entryType === 'commission_payout' ||
        lowerDesc.includes('sales commission');
      const isLoanAdvance =
        exp.id.startsWith('exp-loan-') || lowerDesc.includes('worker loan advance');

      if (isCommissionPayout || isLoanAdvance) return;

      const expDate = toLocalYmd(exp.date);
      if (expDate < effectiveFrom || expDate > effectiveTo) return;

      matchedSalaryExpenses.push(exp);
      const matched = matchUserByExpense(exp);
      const bucket = ensureRow(matched.key, matched.user, matched.displayName);
      bucket.wageEntries.push({
        id: exp.id,
        date: expDate,
        workerKey: matched.key,
        workerName: matched.displayName,
        amount: Number(exp.amount) || 0,
        description: exp.description || 'Daily Wage',
        paymentMethod: exp.paymentMethod || 'cash',
        source: 'expense',
      });
    });

    // 2. Merge Salary Payouts not already mirrored by an exp-sal-* expense
    salaryPayouts.forEach((p) => {
      const pDate = toLocalYmd(p.paidAt || p.endDate);
      if (pDate < effectiveFrom || pDate > effectiveTo) return;

      const alreadyInExpenses = matchedSalaryExpenses.some((exp) => {
        if (exp.receiptNo && (exp.receiptNo === p.id || (p.referenceNo && exp.receiptNo === p.referenceNo))) {
          return true;
        }
        return (
          exp.id.startsWith('exp-sal-') &&
          toLocalYmd(exp.date) === pDate &&
          Math.abs((Number(exp.amount) || 0) - p.netPayPaid) < 1 &&
          (exp.description || '').toLowerCase().includes((p.employeeName || '').toLowerCase())
        );
      });
      if (alreadyInExpenses) return;

      const empNameLower = (p.employeeName || '').trim().toLowerCase();
      const userMatch =
        allUsers.find((u) => u.id === p.employeeId) ||
        allUsers.find((u) => (u.name || '').trim().toLowerCase() === empNameLower);
      const key = userMatch ? userMatch.id : `name:${empNameLower || 'staff'}`;
      const bucket = ensureRow(key, userMatch, p.employeeName || 'Staff Member');
      bucket.wageEntries.push({
        id: p.id,
        date: pDate,
        workerKey: key,
        workerName: userMatch?.name || p.employeeName,
        amount: Number(p.netPayPaid) || 0,
        description: `Payroll: ${p.payPeriodLabel}`,
        paymentMethod: p.paymentMethod || 'cash',
        source: 'payroll',
      });
    });

    // 3. Attribute Sales Transactions strictly inside date range & active store
    transactions.forEach((tx) => {
      if (activeStoreId && tx.storeId && tx.storeId !== activeStoreId) return;
      const txDate = toLocalYmd(tx.date);
      if (txDate < effectiveFrom || txDate > effectiveTo) return;

      let matchedUser: Employee | undefined;
      if (tx.salesRepId) {
        matchedUser = allUsers.find((u) => u.id === tx.salesRepId);
      }
      if (!matchedUser && tx.cashierId) {
        matchedUser = allUsers.find((u) => u.id === tx.cashierId);
      }
      const rawName = (tx.salesRepName || tx.cashierName || '').trim();
      if (!matchedUser && rawName) {
        matchedUser = allUsers.find((u) => (u.name || '').trim().toLowerCase() === rawName.toLowerCase());
      }

      if (matchedUser) {
        const bucket = ensureRow(matchedUser.id, matchedUser, matchedUser.name);
        bucket.salesTransactions.push(tx);
      } else if (rawName) {
        const key = `name:${rawName.toLowerCase()}`;
        const bucket = ensureRow(key, undefined, rawName);
        bucket.salesTransactions.push(tx);
      }
    });

    // 4. Track Commission Payouts already settled in this range (informational)
    commissionPayouts.forEach((cp) => {
      const cpDate = toLocalYmd(cp.endDate || cp.date);
      if (cpDate < effectiveFrom || cpDate > effectiveTo) return;
      if (cp.status !== 'Paid') return;
      const cpNameLower = (cp.employeeName || '').trim().toLowerCase();
      const userMatch =
        allUsers.find((u) => u.id === cp.employeeId) ||
        allUsers.find((u) => (u.name || '').trim().toLowerCase() === cpNameLower);
      const key = userMatch ? userMatch.id : `name:${cpNameLower || 'staff'}`;
      const bucket = rowMap.get(key);
      if (bucket) {
        bucket.commissionAlreadyPaid += Number(cp.commissionEarned || cp.paidAmount) || 0;
      }
    });

    // 5. Build final sorted worker summary rows
    const builtRows: WorkerSummaryRow[] = Array.from(rowMap.values())
      .map((b) => {
        const sortedWages = [...b.wageEntries].sort((x, y) => y.date.localeCompare(x.date));
        const totalWages = sortedWages.reduce((s, w) => s + w.amount, 0);
        const distinctDaysSet = new Set(sortedWages.map((w) => w.date));
        const attributedSales = b.salesTransactions.reduce((s, t) => s + (t.grandTotal || 0), 0);
        const { earnedCommission, modelLabel } = computeCommissionForWorkerTx(b.worker, b.salesTransactions);
        const combinedTotalDue = totalWages + earnedCommission;

        return {
          workerKey: b.workerKey,
          workerId: b.worker?.id,
          workerName: b.workerName,
          role: b.role,
          wageEntriesCount: sortedWages.length,
          distinctWageDays: distinctDaysSet.size,
          totalWages,
          salesCount: b.salesTransactions.length,
          attributedSales,
          earnedCommission,
          commissionModelLabel: modelLabel,
          combinedTotalDue,
          commissionAlreadyPaid: b.commissionAlreadyPaid,
          wageEntries: sortedWages,
          salesTransactions: [...b.salesTransactions].sort((x, y) => toLocalYmd(y.date).localeCompare(toLocalYmd(x.date))),
        };
      })
      .filter((r) => {
        const hasActivity = r.wageEntriesCount > 0 || r.salesCount > 0 || r.combinedTotalDue > 0;
        if (!showZeroActivityWorkers && !hasActivity) return false;
        if (selectedWorkerFilter !== 'All' && r.workerKey !== selectedWorkerFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          return (r.workerName || '').toLowerCase().includes(q) || (r.role || '').toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => b.combinedTotalDue - a.combinedTotalDue || b.attributedSales - a.attributedSales || a.workerName.localeCompare(b.workerName));

    const totals = builtRows.reduce(
      (acc, r) => {
        acc.totalWages += r.totalWages;
        acc.totalWageEntries += r.wageEntriesCount;
        acc.totalAttributedSales += r.attributedSales;
        acc.totalSalesCount += r.salesCount;
        acc.totalEarnedCommission += r.earnedCommission;
        acc.grandTotalDue += r.combinedTotalDue;
        return acc;
      },
      {
        totalWages: 0,
        totalWageEntries: 0,
        totalAttributedSales: 0,
        totalSalesCount: 0,
        totalEarnedCommission: 0,
        grandTotalDue: 0,
        workersCount: builtRows.length,
      }
    );

    return { workerRows: builtRows, grandTotals: totals };
  }, [
    allUsers,
    sortedUsersForMatch,
    expenses,
    salaryPayouts,
    transactions,
    commissionPayouts,
    activeStoreId,
    effectiveFrom,
    effectiveTo,
    selectedWorkerFilter,
    searchQuery,
    showZeroActivityWorkers,
  ]);

  const buildFullStatementText = (): string => {
    const lines: string[] = [
      `${(storeName || 'ROFANI POS').toUpperCase()} — WORKERS WAGES & COMMISSIONS STATEMENT`,
      `Period: ${formatReadableDate(effectiveFrom)} to ${formatReadableDate(effectiveTo)}`,
      `----------------------------------------`,
    ];

    if (workerRows.length === 0) {
      lines.push('No wages or commissions recorded for this date range.');
    } else {
      workerRows.forEach((r, idx) => {
        lines.push(
          `${idx + 1}. ${r.workerName} (${r.role})`,
          `   • Days/Entries: ${r.distinctWageDays} day(s) (${r.wageEntriesCount} logs) | Wages: ${formatKsh(r.totalWages)}`,
          `   • Sales (${r.salesCount}): ${formatKsh(r.attributedSales)} | Commission (${r.commissionModelLabel}): ${formatKsh(r.earnedCommission)}`,
          `   • TOTAL DUE: ${formatKsh(r.combinedTotalDue)}`
        );
      });
    }

    lines.push(
      `----------------------------------------`,
      `GRAND TOTALS (${grandTotals.workersCount} Workers):`,
      `• Total Wages: ${formatKsh(grandTotals.totalWages)}`,
      `• Total Commissions: ${formatKsh(grandTotals.totalEarnedCommission)}`,
      `• Attributed Sales: ${formatKsh(grandTotals.totalAttributedSales)}`,
      `• COMBINED TOTAL DUE: ${formatKsh(grandTotals.grandTotalDue)}`,
      `Generated via Rofani POS`
    );

    return lines.join('\n');
  };

  const buildWorkerStatementText = (r: WorkerSummaryRow): string => {
    const lines: string[] = [
      `${storeName} — WORKER PAY STATEMENT`,
      `Worker: ${r.workerName} (${r.role})`,
      `Period: ${formatReadableDate(effectiveFrom)} to ${formatReadableDate(effectiveTo)}`,
      `----------------------------------------`,
      `• Wage Entries: ${r.wageEntriesCount} (${r.distinctWageDays} day(s))`,
      `• Total Wages: ${formatKsh(r.totalWages)}`,
      `• Attributed Sales (${r.salesCount} orders): ${formatKsh(r.attributedSales)}`,
      `• Earned Commission (${r.commissionModelLabel}): ${formatKsh(r.earnedCommission)}`,
      `• COMBINED TOTAL DUE: ${formatKsh(r.combinedTotalDue)}`,
    ];

    if (r.wageEntries.length > 0) {
      lines.push('', 'Daily Wage Breakdown:');
      r.wageEntries.forEach((w) => {
        lines.push(`  - ${w.date}: ${formatKsh(w.amount)} (${w.description})`);
      });
    }

    return lines.join('\n');
  };

  const handleOpenShareStatement = () => {
    setCopiedFlag(false);
    setShareModalState({
      title: 'Share Wages & Commissions Statement',
      text: buildFullStatementText(),
    });
  };

  const handleOpenShareWorker = (row: WorkerSummaryRow) => {
    setCopiedFlag(false);
    setShareModalState({
      title: `Share Statement — ${row.workerName}`,
      text: buildWorkerStatementText(row),
    });
  };

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFlag(true);
      showToast('Statement copied to clipboard.');
      window.setTimeout(() => setCopiedFlag(false), 2500);
    } catch {
      showToast('Unable to copy automatically — please select text to copy.');
    }
  };

  const handleNativeShare = async (title: string, text: string) => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text });
        showToast('Statement shared.');
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }
    await handleCopyText(text);
  };

  const handlePrintStatement = () => {
    if (typeof document !== 'undefined') {
      document.body.classList.add('printing-wages-statement');
      const cleanup = () => {
        document.body.classList.remove('printing-wages-statement');
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);
      window.setTimeout(() => {
        window.print();
        window.setTimeout(cleanup, 1200);
      }, 60);
    } else {
      window.print();
    }
  };

  const handleExportCsv = () => {
    const header = [
      'Worker Name',
      'Role',
      'Wage Days',
      'Wage Entries',
      'Total Wages (KSh)',
      'Sales Count',
      'Attributed Sales (KSh)',
      'Commission Model',
      'Earned Commission (KSh)',
      'Combined Total Due (KSh)',
    ];
    const rows = workerRows.map((r) => [
      `"${r.workerName.replace(/"/g, '""')}"`,
      `"${r.role.replace(/"/g, '""')}"`,
      r.distinctWageDays,
      r.wageEntriesCount,
      r.totalWages,
      r.salesCount,
      r.attributedSales,
      `"${r.commissionModelLabel.replace(/"/g, '""')}"`,
      r.earnedCommission,
      r.combinedTotalDue,
    ]);
    rows.push([
      '"GRAND TOTAL"',
      `"${grandTotals.workersCount} Workers"`,
      '""',
      grandTotals.totalWageEntries,
      grandTotals.totalWages,
      grandTotals.totalSalesCount,
      grandTotals.totalAttributedSales,
      '""',
      grandTotals.totalEarnedCommission,
      grandTotals.grandTotalDue,
    ]);

    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workers-wages-commissions-${effectiveFrom}-to-${effectiveTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully.');
  };

  const handleSaveQuickWage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddExpense) return;
    const parsedAmt = parseFloat(wageAmount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) return;

    const selectedUser = allUsers.find((u) => u.id === wageWorkerId);
    const finalWorkerName = selectedUser?.name || wageCustomWorkerName.trim() || 'Shop Attendant';
    const finalDate = toLocalYmd(wageDate);
    const noteSuffix = wageNotes.trim() ? ` (${wageNotes.trim()})` : '';

    const exp: Expense = {
      id: `exp-wage-${Date.now()}`,
      date: finalDate,
      category: 'Salaries',
      description: `Daily Wage - ${finalWorkerName}${noteSuffix}`,
      amount: parsedAmt,
      paymentMethod: wageMethod,
      recordedBy: 'Admin',
      receiptNo: `WAGE-${finalDate.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      recurringType: 'One-Time',
      isRecurring: false,
      status: 'Paid',
      workerId: selectedUser?.id,
      workerName: finalWorkerName,
      entryType: 'daily_wage',
      storeId: activeStoreId,
    };

    onAddExpense(exp);
    setShowWageModal(false);
    setWageAmount('');
    setWageNotes('');
    setWageCustomWorkerName('');
    showToast(`Logged ${formatKsh(parsedAmt)} daily wage for ${finalWorkerName} (${finalDate}).`);
  };

  return (
    <div className="space-y-5 text-slate-100 print:text-slate-900 print:bg-white">
      {/* Toast Notification */}
      {shareToast && (
        <div className="print:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-[120] bg-slate-900 border border-emerald-500/50 text-emerald-200 px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{shareToast}</span>
        </div>
      )}

      {/* Print-Only Statement Header */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{storeName}</h1>
            <p className="text-sm font-bold text-slate-700 mt-0.5">
              Workers Wages &amp; Commissions Statement
            </p>
          </div>
          <div className="text-right text-xs text-slate-700 font-mono">
            <div>
              <strong>Period:</strong> {formatReadableDate(effectiveFrom)} – {formatReadableDate(effectiveTo)}
            </div>
            <div>
              <strong>Printed:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* Screen Header & Action Controls */}
      <div className="print:hidden bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-slate-800 border border-slate-700 text-sky-400 rounded-xl shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-100 leading-tight">
                Workers Wages &amp; Commissions Statement
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {storeName} · Filter custom pay periods (e.g. 21st–30th), review daily wages &amp; sales commissions, share, or print
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onAddExpense && (
              <button
                type="button"
                onClick={() => {
                  setWageDate(toLocalYmd());
                  setWageWorkerId(allUsers[0]?.id || '');
                  setShowWageModal(true);
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Daily Wage</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={handleOpenShareStatement}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={handlePrintStatement}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Statement</span>
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker + Quick Presets + Worker Filter */}
        <div className="pt-3 border-t border-slate-800 grid grid-cols-1 xl:grid-cols-12 gap-3 items-end">
          {/* Quick Presets */}
          <div className="xl:col-span-5 space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>Quick Period Presets</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(
                [
                  { id: 'this_month', label: 'This Month' },
                  { id: '1_15', label: '1st–15th' },
                  { id: '16_end', label: '16th–30th/31st' },
                  { id: '21_30', label: '21st–30th' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer text-center ${
                    activePreset === preset.id
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* From & To Custom Dates */}
          <div className="xl:col-span-4 grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="wage-report-from" className="block text-[11px] font-semibold text-slate-400 mb-1">
                From (Start Date)
              </label>
              <input
                id="wage-report-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-2.5 py-2 text-xs text-slate-100 font-mono focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="wage-report-to" className="block text-[11px] font-semibold text-slate-400 mb-1">
                To (End Date)
              </label>
              <input
                id="wage-report-to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-2.5 py-2 text-xs text-slate-100 font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* Worker Filter & Search */}
          <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search worker..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                />
              </div>
              <select
                value={selectedWorkerFilter}
                onChange={(e) => setSelectedWorkerFilter(e.target.value)}
                aria-label="Filter by worker"
                className="bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-2.5 py-2 text-xs text-slate-100 focus:outline-none max-w-[140px]"
              >
                <option value="All">All Workers</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Range info & zero-activity toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-sky-400" />
            <span>
              Showing <strong className="text-slate-200">{formatReadableDate(effectiveFrom)}</strong> to{' '}
              <strong className="text-slate-200">{formatReadableDate(effectiveTo)}</strong>
            </span>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-300">
            <input
              type="checkbox"
              checked={showZeroActivityWorkers}
              onChange={(e) => setShowZeroActivityWorkers(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-sky-500"
            />
            <span>Include workers with KSh 0 activity in period</span>
          </label>
        </div>
      </div>

      {/* Grand Total KPI Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4">
        <div className="bg-slate-900 border border-slate-800 print:bg-slate-50 print:border-slate-300 rounded-2xl p-4">
          <div className="text-[11px] font-semibold text-slate-400 print:text-slate-600 uppercase tracking-wider">
            Total Wages Paid/Logged
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-amber-300 print:text-slate-900 font-mono tabular-nums mt-1">
            {formatKsh(grandTotals.totalWages)}
          </div>
          <div className="text-[11px] text-slate-400 print:text-slate-600 mt-1">
            {grandTotals.totalWageEntries} wage log{grandTotals.totalWageEntries === 1 ? '' : 's'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 print:bg-slate-50 print:border-slate-300 rounded-2xl p-4">
          <div className="text-[11px] font-semibold text-slate-400 print:text-slate-600 uppercase tracking-wider">
            Attributed Sales
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-sky-300 print:text-slate-900 font-mono tabular-nums mt-1">
            {formatKsh(grandTotals.totalAttributedSales)}
          </div>
          <div className="text-[11px] text-slate-400 print:text-slate-600 mt-1">
            {grandTotals.totalSalesCount} sale receipt{grandTotals.totalSalesCount === 1 ? '' : 's'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 print:bg-slate-50 print:border-slate-300 rounded-2xl p-4">
          <div className="text-[11px] font-semibold text-slate-400 print:text-slate-600 uppercase tracking-wider">
            Earned Commissions
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-indigo-300 print:text-slate-900 font-mono tabular-nums mt-1">
            {formatKsh(grandTotals.totalEarnedCommission)}
          </div>
          <div className="text-[11px] text-slate-400 print:text-slate-600 mt-1">
            Across {grandTotals.workersCount} worker{grandTotals.workersCount === 1 ? '' : 's'}
          </div>
        </div>

        <div className="bg-slate-900 border border-emerald-700/60 print:bg-slate-100 print:border-slate-900 rounded-2xl p-4">
          <div className="text-[11px] font-semibold text-emerald-300 print:text-slate-700 uppercase tracking-wider">
            Grand Total Due
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-400 print:text-slate-900 font-mono tabular-nums mt-1">
            {formatKsh(grandTotals.grandTotalDue)}
          </div>
          <div className="text-[11px] text-slate-400 print:text-slate-600 mt-1">
            Wages + Commissions
          </div>
        </div>
      </div>

      {/* Worker-by-Worker Breakdown */}
      <div className="bg-slate-900 border border-slate-800 print:bg-white print:border-slate-300 rounded-2xl overflow-hidden shadow-xl print:shadow-none">
        <div className="px-4 py-3 border-b border-slate-800 print:border-slate-300 bg-slate-950/50 print:bg-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400 print:text-slate-700" />
            <h3 className="text-sm font-bold text-slate-100 print:text-slate-900">
              Worker-by-Worker Breakdown ({workerRows.length})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400 print:text-slate-600">
            {effectiveFrom} → {effectiveTo}
          </span>
        </div>

        {workerRows.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-bold text-slate-300 print:text-slate-800">
              No worker wages or sales commissions found for {formatReadableDate(effectiveFrom)} – {formatReadableDate(effectiveTo)}.
            </p>
            <p className="text-xs text-slate-400 print:text-slate-600 max-w-md mx-auto">
              Adjust your From / To dates, use a quick preset above, or tap &ldquo;Log Daily Wage&rdquo; to record daily worker pay for this period.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop / Print Table */}
            <div className="hidden md:block print:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200 print:text-slate-900 border-collapse">
                <thead className="bg-slate-950/80 print:bg-slate-100 text-slate-400 print:text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-800 print:border-slate-300">
                  <tr>
                    <th className="p-3.5">Worker / Attendant</th>
                    <th className="p-3.5 text-center">Days / Entries</th>
                    <th className="p-3.5 text-right">Total Wages</th>
                    <th className="p-3.5 text-right">Attributed Sales</th>
                    <th className="p-3.5 text-right">Earned Commission</th>
                    <th className="p-3.5 text-right">Combined Total Due</th>
                    <th className="p-3.5 text-right print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 print:divide-slate-300">
                  {workerRows.map((row) => {
                    const isExpanded = expandedWorkerKey === row.workerKey;
                    return (
                      <React.Fragment key={row.workerKey}>
                        <tr className="hover:bg-slate-800/40 print:hover:bg-transparent transition">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-100 print:text-slate-900 text-sm">
                              {row.workerName}
                            </div>
                            <div className="text-[11px] text-slate-400 print:text-slate-600">
                              {row.role} · {row.commissionModelLabel}
                            </div>
                          </td>
                          <td className="p-3.5 text-center font-mono tabular-nums">
                            <span className="font-bold text-slate-200 print:text-slate-900">
                              {row.distinctWageDays} day{row.distinctWageDays === 1 ? '' : 's'}
                            </span>
                            <div className="text-[10px] text-slate-400 print:text-slate-600">
                              {row.wageEntriesCount} wage entr{row.wageEntriesCount === 1 ? 'y' : 'ies'}
                            </div>
                          </td>
                          <td className="p-3.5 text-right font-mono tabular-nums font-bold text-amber-300 print:text-slate-900">
                            {formatKsh(row.totalWages)}
                          </td>
                          <td className="p-3.5 text-right font-mono tabular-nums">
                            <div className="font-semibold text-sky-300 print:text-slate-900">
                              {formatKsh(row.attributedSales)}
                            </div>
                            <div className="text-[10px] text-slate-400 print:text-slate-600">
                              {row.salesCount} sale{row.salesCount === 1 ? '' : 's'}
                            </div>
                          </td>
                          <td className="p-3.5 text-right font-mono tabular-nums font-bold text-indigo-300 print:text-slate-900">
                            {formatKsh(row.earnedCommission)}
                          </td>
                          <td className="p-3.5 text-right font-mono tabular-nums font-extrabold text-sm text-emerald-400 print:text-slate-900">
                            {formatKsh(row.combinedTotalDue)}
                          </td>
                          <td className="p-3.5 text-right print:hidden">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenShareWorker(row)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                                title={`Share statement for ${row.workerName}`}
                              >
                                <Share2 className="w-3 h-3" />
                                <span>Send</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setExpandedWorkerKey(isExpanded ? null : row.workerKey)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>{isExpanded ? 'Hide' : 'Details'}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-950/70 print:hidden">
                            <td colSpan={7} className="p-4">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Logged Daily Wages */}
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                                  <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center justify-between">
                                    <span>Wage Logs ({row.wageEntries.length})</span>
                                    <span className="font-mono">{formatKsh(row.totalWages)}</span>
                                  </div>
                                  {row.wageEntries.length === 0 ? (
                                    <p className="text-[11px] text-slate-500">No wage logs recorded for this period.</p>
                                  ) : (
                                    <div className="divide-y divide-slate-800 max-h-48 overflow-y-auto">
                                      {row.wageEntries.map((w) => (
                                        <div key={w.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                                          <div className="min-w-0">
                                            <div className="font-semibold text-slate-200 truncate">{w.description}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">
                                              {w.date} · {(w.paymentMethod || 'cash').toUpperCase()}
                                            </div>
                                          </div>
                                          <span className="font-mono tabular-nums font-bold text-amber-300 shrink-0">
                                            {formatKsh(w.amount)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Attributed Sales */}
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                                  <div className="text-[11px] font-bold text-sky-300 uppercase tracking-wider flex items-center justify-between">
                                    <span>Attributed Sales ({row.salesTransactions.length})</span>
                                    <span className="font-mono">{formatKsh(row.attributedSales)}</span>
                                  </div>
                                  {row.salesTransactions.length === 0 ? (
                                    <p className="text-[11px] text-slate-500">No sales attributed to this worker in this period.</p>
                                  ) : (
                                    <div className="divide-y divide-slate-800 max-h-48 overflow-y-auto">
                                      {row.salesTransactions.map((tx) => (
                                        <div key={tx.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                                          <div className="min-w-0">
                                            <div className="font-semibold text-slate-200 truncate">
                                              {tx.receiptNumber} · {tx.customerName || 'Walk-in'}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono">
                                              {toLocalYmd(tx.date)} ·{' '}
                                              {(
                                                tx.paymentMethod ||
                                                tx.payments
                                                  ?.map((p) => p.method)
                                                  .filter(Boolean)
                                                  .join(' + ') ||
                                                'cash'
                                              ).toUpperCase()}
                                            </div>
                                          </div>
                                          <span className="font-mono tabular-nums font-bold text-sky-300 shrink-0">
                                            {formatKsh(tx.grandTotal)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-950 print:bg-slate-200 border-t-2 border-slate-700 print:border-slate-900 font-extrabold text-slate-100 print:text-slate-900">
                  <tr>
                    <td className="p-3.5 text-sm">GRAND TOTAL ({grandTotals.workersCount} Workers)</td>
                    <td className="p-3.5 text-center font-mono tabular-nums">
                      {grandTotals.totalWageEntries} logs
                    </td>
                    <td className="p-3.5 text-right font-mono tabular-nums text-amber-300 print:text-slate-900">
                      {formatKsh(grandTotals.totalWages)}
                    </td>
                    <td className="p-3.5 text-right font-mono tabular-nums text-sky-300 print:text-slate-900">
                      {formatKsh(grandTotals.totalAttributedSales)}
                    </td>
                    <td className="p-3.5 text-right font-mono tabular-nums text-indigo-300 print:text-slate-900">
                      {formatKsh(grandTotals.totalEarnedCommission)}
                    </td>
                    <td className="p-3.5 text-right font-mono tabular-nums text-base text-emerald-400 print:text-slate-900">
                      {formatKsh(grandTotals.grandTotalDue)}
                    </td>
                    <td className="p-3.5 print:hidden" />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Cards View (hidden on desktop and hidden on print so print uses table cleanly) */}
            <div className="md:hidden print:hidden divide-y divide-slate-800">
              {workerRows.map((row) => {
                const isExpanded = expandedWorkerKey === row.workerKey;
                return (
                  <div key={row.workerKey} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm text-slate-100">{row.workerName}</div>
                        <div className="text-[11px] text-slate-400">
                          {row.role} · {row.commissionModelLabel}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Due</div>
                        <div className="text-sm font-extrabold text-emerald-400 font-mono tabular-nums">
                          {formatKsh(row.combinedTotalDue)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-[11px]">
                      <div>
                        <div className="text-slate-400">Wages ({row.distinctWageDays}d)</div>
                        <div className="font-bold text-amber-300 font-mono tabular-nums">{formatKsh(row.totalWages)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Sales ({row.salesCount})</div>
                        <div className="font-bold text-sky-300 font-mono tabular-nums">{formatKsh(row.attributedSales)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Commission</div>
                        <div className="font-bold text-indigo-300 font-mono tabular-nums">{formatKsh(row.earnedCommission)}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenShareWorker(row)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Send Summary</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedWorkerKey(isExpanded ? null : row.workerKey)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Logs' : 'View Logs'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                        <div className="font-bold text-amber-300 text-[11px] uppercase">
                          Wage Entries ({row.wageEntries.length})
                        </div>
                        {row.wageEntries.length === 0 ? (
                          <p className="text-[11px] text-slate-500">No wage logs in range.</p>
                        ) : (
                          row.wageEntries.map((w) => (
                            <div key={w.id} className="flex justify-between gap-2 text-[11px] border-t border-slate-800 pt-1.5">
                              <span className="text-slate-300 truncate">
                                {w.date} · {w.description}
                              </span>
                              <span className="font-mono font-bold text-amber-300 shrink-0">
                                {formatKsh(w.amount)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Mobile Grand Total Bar */}
              <div className="p-4 bg-slate-950 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span>Grand Total Wages ({grandTotals.totalWageEntries} entries)</span>
                  <span className="font-mono tabular-nums text-amber-300">{formatKsh(grandTotals.totalWages)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span>Grand Total Commissions ({grandTotals.totalSalesCount} sales)</span>
                  <span className="font-mono tabular-nums text-indigo-300">{formatKsh(grandTotals.totalEarnedCommission)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-emerald-400 border-t border-slate-800 pt-2">
                  <span>Combined Grand Total Due</span>
                  <span className="font-mono tabular-nums">{formatKsh(grandTotals.grandTotalDue)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Print-Only Approval / Signature Footer */}
      <div className="hidden print:grid grid-cols-3 gap-8 pt-8 mt-6 border-t border-slate-300 text-xs text-slate-700">
        <div>
          <div className="border-b border-slate-500 h-8 mb-1" />
          <div className="font-semibold">Prepared By (Manager / Cashier)</div>
        </div>
        <div>
          <div className="border-b border-slate-500 h-8 mb-1" />
          <div className="font-semibold">Approved By (Business Owner)</div>
        </div>
        <div>
          <div className="border-b border-slate-500 h-8 mb-1" />
          <div className="font-semibold">Date &amp; Stamp</div>
        </div>
      </div>

      {/* SHARE STATEMENT MODAL */}
      {shareModalState && (
        <div className="print:hidden fixed inset-0 z-[110] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-950 border border-sky-800 rounded-xl text-sky-400">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{shareModalState.title}</h3>
                  <p className="text-[11px] text-slate-400">
                    Formatted for WhatsApp, mobile share sheet, or clipboard
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareModalState(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                aria-label="Close share dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              <textarea
                value={shareModalState.text}
                onChange={(e) => setShareModalState({ ...shareModalState, text: e.target.value })}
                rows={12}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleCopyText(shareModalState.text)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedFlag ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedFlag ? 'Copied' : 'Copy Text'}</span>
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareModalState.text)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Send via WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => handleNativeShare(shareModalState.title, shareModalState.text)}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK LOG / BACKDATE DAILY WAGE MODAL */}
      {showWageModal && onAddExpense && (
        <div className="print:hidden fixed inset-0 z-[110] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-950 border border-emerald-800 rounded-xl text-emerald-400">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Log Worker Daily Wage</h3>
                  <p className="text-[11px] text-slate-400">Supports today or backdated entries (saved to Expenses)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWageModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickWage} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Worker / Attendant *</label>
                <select
                  value={wageWorkerId}
                  onChange={(e) => setWageWorkerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                  <option value="__custom__">Other / Casual Worker (Type Name)</option>
                </select>
              </div>

              {wageWorkerId === '__custom__' && (
                <div>
                  <label className="block text-slate-400 mb-1">Worker Name *</label>
                  <input
                    type="text"
                    required
                    value={wageCustomWorkerName}
                    onChange={(e) => setWageCustomWorkerName(e.target.value)}
                    placeholder="e.g. Brian Ochieng"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Wage Date (Backdate OK) *</label>
                  <input
                    type="date"
                    required
                    value={wageDate}
                    onChange={(e) => setWageDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Amount (KSh) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={wageAmount}
                    onChange={(e) => setWageAmount(e.target.value)}
                    placeholder="e.g. 800"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Payment Method</label>
                <select
                  value={wageMethod}
                  onChange={(e) => setWageMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="credit_card">Bank / Card</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Notes / Shift Particulars (Optional)</label>
                <input
                  type="text"
                  value={wageNotes}
                  onChange={(e) => setWageNotes(e.target.value)}
                  placeholder="e.g. Full day counter shift + stock offloading"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWageModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  Save Daily Wage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
