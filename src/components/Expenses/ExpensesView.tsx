import React, { useState } from 'react';
import { DollarSign, Plus, Calendar, Tag, CreditCard, Trash2, X, TrendingDown, RefreshCw, Clock, Repeat, Sparkles, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Expense, PaymentMethod, User, RecurringFrequency } from '../../types';
import { detectDuplicateExpenses, deduplicateExpenses, processDueRecurringExpenses, computeNextDueDate } from '../../utils/deduplicate';
import { hasWorkerPermission } from '../../utils/permissions';

interface ExpensesViewProps {
  expenses: Expense[];
  currentUser: User;
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onBatchUpdateExpenses?: (expenses: Expense[]) => void;
  onOpenAuditLogs?: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  currentUser,
  onAddExpense,
  onDeleteExpense,
  onBatchUpdateExpenses,
  onOpenAuditLogs,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterRecurring, setFilterRecurring] = useState<'All' | 'Recurring' | 'One-Time'>('All');
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Auto Deduplicate Repeated Expenses Modal State
  const [showDeduplicateModal, setShowDeduplicateModal] = useState<boolean>(false);

  // Form state
  const [category, setCategory] = useState<Expense['category']>('Utilities');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [receiptNo, setReceiptNo] = useState('');
  const [recurringType, setRecurringType] = useState<RecurringFrequency>('One-Time');

  const todayStr = new Date().toISOString().slice(0, 10);

  // Duplicate expenses detection
  const duplicateExpenseGroups = detectDuplicateExpenses(expenses);
  const totalDuplicateExpensesCount = duplicateExpenseGroups.reduce((acc, g) => acc + g.duplicateExpenses.length, 0);

  // Due recurring expenses detection
  const dueRecurringExpenses = expenses.filter(
    (e) => e.recurringType && e.recurringType !== 'One-Time' && e.nextDueDate && e.nextDueDate <= todayStr
  );

  const handleConfirmDeduplicate = () => {
    const result = deduplicateExpenses(expenses);
    if (onBatchUpdateExpenses) {
      onBatchUpdateExpenses(result.cleanedExpenses);
    } else {
      // Fallback: delete duplicate expense IDs one by one
      result.groups.forEach((g) => {
        g.duplicateExpenses.forEach((dup) => onDeleteExpense(dup.id));
      });
    }
    setShowDeduplicateModal(false);
    setActionToast(`✨ Auto-deleted ${result.removedExpensesCount} repeated expense records! Catalog cleaned.`);
  };

  const handleAutoProcessDueRecurring = () => {
    const { newExpenses, processedCount } = processDueRecurringExpenses(expenses, currentUser.name);
    if (processedCount > 0 && onBatchUpdateExpenses) {
      onBatchUpdateExpenses(newExpenses);
      setActionToast(`✨ Auto-processed ${processedCount} due recurring expense cycles and updated schedule dates!`);
    } else {
      setActionToast(`No due recurring expenses were pending processing.`);
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesCat = filterCategory === 'All' || e.category === filterCategory;
    const matchesRec =
      filterRecurring === 'All' ||
      (filterRecurring === 'Recurring' && e.recurringType && e.recurringType !== 'One-Time') ||
      (filterRecurring === 'One-Time' && (!e.recurringType || e.recurringType === 'One-Time'));
    return matchesCat && matchesRec;
  });

  const totalExpenseAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Recurring stats
  const recurringExpensesList = expenses.filter((e) => e.recurringType && e.recurringType !== 'One-Time');
  const totalRecurringMonthlyEst = recurringExpensesList.reduce((sum, e) => {
    if (e.recurringType === 'Daily') return sum + e.amount * 30;
    if (e.recurringType === 'Monthly') return sum + e.amount;
    if (e.recurringType === 'Yearly') return sum + e.amount / 12;
    return sum;
  }, 0);

  // Expense breakdown by category
  const categoryTotals: Record<string, number> = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const categoryEntries: [string, number][] = Object.entries(categoryTotals);
  const sortedCategories = categoryEntries.sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories.length > 0 ? sortedCategories[0] : null;

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseFloat(amount);
    if (!description.trim() || isNaN(parsedAmt) || parsedAmt <= 0) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const isRec = recurringType !== 'One-Time';
    const nextDue = isRec ? computeNextDueDate(todayStr, recurringType) : undefined;

    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      date: todayStr,
      category,
      description: description.trim(),
      amount: parsedAmt,
      paymentMethod,
      recordedBy: currentUser.name,
      receiptNo: receiptNo.trim() || `REC-${Math.floor(100 + Math.random() * 900)}`,
      recurringType,
      isRecurring: isRec,
      nextDueDate: nextDue,
      status: 'Paid'
    };

    onAddExpense(newExp);
    setShowModal(false);
    setDescription('');
    setAmount('');
    setReceiptNo('');
    setRecurringType('One-Time');
  };

  const handleProcessNextCycle = (exp: Expense) => {
    if (!exp.recurringType || exp.recurringType === 'One-Time') return;
    const processDate = exp.nextDueDate || new Date().toISOString().slice(0, 10);
    const newNextDue = computeNextDueDate(processDate, exp.recurringType);

    const nextCycleExp: Expense = {
      id: `exp-${Date.now()}`,
      date: processDate,
      category: exp.category,
      description: `${exp.description} (${exp.recurringType} Renewal)`,
      amount: exp.amount,
      paymentMethod: exp.paymentMethod,
      recordedBy: currentUser.name,
      receiptNo: `RNW-${Math.floor(1000 + Math.random() * 9000)}`,
      recurringType: exp.recurringType,
      isRecurring: true,
      nextDueDate: newNextDue,
      status: 'Paid'
    };

    onAddExpense(nextCycleExp);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-sky-950 border border-sky-800 text-sky-400 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-100">Store Expense Management</h2>
            <p className="text-xs text-slate-400">
              Log utilities, rent, transport, salaries, and operating overheads for P&L net profit accounting
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-auto-delete-duplicate-expenses"
            onClick={() => setShowDeduplicateModal(true)}
            className="bg-amber-950/80 hover:bg-amber-900 border border-amber-600/80 text-amber-200 font-extrabold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg relative"
            title="Scan expense logs for duplicate/repeated records and auto-delete redundant entries"
          >
            <Trash2 className="w-4 h-4 text-amber-400" />
            <span>Auto Delete Repeated</span>
            {duplicateExpenseGroups.length > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono">
                {duplicateExpenseGroups.length}
              </span>
            )}
          </button>

          {dueRecurringExpenses.length > 0 && (
            <button
              id="btn-auto-process-due-recurring"
              onClick={handleAutoProcessDueRecurring}
              className="bg-indigo-950 hover:bg-indigo-900 border border-indigo-600/80 text-indigo-200 font-extrabold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg relative"
              title="Auto process due recurring expenses for the current cycle"
            >
              <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
              <span>Auto Process Due ({dueRecurringExpenses.length})</span>
            </button>
          )}

          {hasWorkerPermission(currentUser, 'canAddExpenses') && (
            <button
              id="btn-add-expense"
              onClick={() => setShowModal(true)}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-sky-600/20"
            >
              <Plus className="w-4 h-4" /> Log Expense
            </button>
          )}

          {onOpenAuditLogs && (
            <button
              type="button"
              onClick={onOpenAuditLogs}
              className="bg-purple-950/80 hover:bg-purple-900 border border-purple-700/80 text-purple-300 font-bold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg cursor-pointer"
              title="View Role Authorization Audit Ledger"
            >
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              <span>Audit Trail</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Toast Notification */}
      {actionToast && (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-emerald-500/80 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 text-emerald-300 font-extrabold text-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{actionToast}</span>
          </div>
          <button onClick={() => setActionToast(null)} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Alert Banner: Due Recurring Overheads */}
      {dueRecurringExpenses.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/90 border border-indigo-500/80 p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-indigo-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/40 shrink-0">
              <Clock className="w-5 h-5 animate-pulse text-indigo-400" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-indigo-100 flex items-center gap-2">
                <span>Due Recurring Overheads Pending Processing</span>
                <span className="bg-indigo-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {dueRecurringExpenses.length} pending
                </span>
              </h4>
              <p className="text-xs text-indigo-300/80 mt-0.5">
                Recurring schedules (e.g. Rent, Utilities, Transport, Fibre) are due for renewal. Process them in 1-click!
              </p>
            </div>
          </div>

          <button
            onClick={handleAutoProcessDueRecurring}
            className="bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 shrink-0"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Auto Process Due Overheads ({dueRecurringExpenses.length})</span>
          </button>
        </div>
      )}

      {/* Alert Banner: Duplicate / Repeated Expense Records */}
      {duplicateExpenseGroups.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/90 border border-amber-500/80 p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse text-amber-400" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-100 flex items-center gap-2">
                <span>Repeated / Duplicate Expense Records Detected</span>
                <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {duplicateExpenseGroups.length} {duplicateExpenseGroups.length === 1 ? 'group' : 'groups'} ({totalDuplicateExpensesCount} repeated logs)
                </span>
              </h4>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Found duplicate expense entries with matching receipt numbers or identical date, category, and amount.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDeduplicateModal(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20 shrink-0"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Auto Delete Repeated Expenses ({totalDuplicateExpensesCount})</span>
          </button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400 font-medium">Total Recorded Expenses</div>
          <div className="text-2xl font-extrabold text-rose-400 font-mono">
            KSh {totalExpenseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500">{filteredExpenses.length} transaction entries</div>
        </div>

        {/* Recurring Overheads Est */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Repeat className="w-3.5 h-3.5 text-indigo-400" />
            <span>Est. Monthly Recurring</span>
          </div>
          <div className="text-2xl font-extrabold text-indigo-400 font-mono">
            KSh {totalRecurringMonthlyEst.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400">{recurringExpensesList.length} active recurring schedules</div>
        </div>

        {/* Highest Category */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400 font-medium">Top Expense Category</div>
          <div className="text-lg font-bold text-slate-100 truncate">
            {topCategory ? topCategory[0] : 'None'}
          </div>
          <div className="text-xs font-mono text-amber-400">
            KSh {topCategory ? topCategory[1].toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
          </div>
        </div>

        {/* Category Breakdown list */}
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center overflow-x-auto">
          <div className="space-y-1 text-xs w-full">
            <div className="text-slate-400 font-semibold mb-1">Categories Breakdown</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
              {categoryEntries.slice(0, 4).map(([cat, total]) => (
                <div key={cat} className="flex justify-between">
                  <span className="text-slate-400 truncate">{cat}:</span>
                  <span className="font-mono text-slate-200 ml-1">KSh {total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Expense Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-950/40">
          <div>
            <h3 className="font-bold text-sm text-slate-200">Expense Audit Records</h3>
            <p className="text-[11px] text-slate-400">Track standard operating costs & recurring scheduled expenses</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setFilterRecurring('All')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  filterRecurring === 'All' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterRecurring('Recurring')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                  filterRecurring === 'Recurring' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Repeat className="w-3 h-3" /> Recurring
              </button>
              <button
                onClick={() => setFilterRecurring('One-Time')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  filterRecurring === 'One-Time' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                One-Time
              </button>
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-xl focus:outline-none"
            >
              <option value="All">All Categories</option>
              <option value="Rent">Rent</option>
              <option value="Utilities">Utilities</option>
              <option value="Salaries">Salaries</option>
              <option value="Transport">Transport</option>
              <option value="Restock">Restock</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5">Date & Receipt #</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Frequency / Cycle</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5">Payment Method</th>
                <th className="p-3.5">Recorded By</th>
                <th className="p-3.5 text-right">Amount (KSh)</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-3.5 font-mono">
                      <div className="text-slate-200 font-semibold">{exp.date}</div>
                      <div className="text-[10px] text-slate-500">{exp.receiptNo || 'N/A'}</div>
                    </td>

                    <td className="p-3.5">
                      <span className="bg-slate-800 border border-slate-700 text-sky-400 font-medium px-2.5 py-1 rounded-lg text-[11px]">
                        {exp.category}
                      </span>
                    </td>

                    <td className="p-3.5">
                      {exp.recurringType && exp.recurringType !== 'One-Time' ? (
                        <div className="space-y-0.5">
                          <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] border ${
                            exp.recurringType === 'Daily' ? 'bg-amber-950/80 border-amber-800 text-amber-400' :
                            exp.recurringType === 'Monthly' ? 'bg-indigo-950/80 border-indigo-800 text-indigo-400' :
                            'bg-purple-950/80 border-purple-800 text-purple-400'
                          }`}>
                            <Repeat className="w-2.5 h-2.5" />
                            {exp.recurringType}
                          </span>
                          {exp.nextDueDate && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Next Due: <span className="text-slate-200">{exp.nextDueDate}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">One-Time</span>
                      )}
                    </td>

                    <td className="p-3.5 font-medium text-slate-200">{exp.description}</td>

                    <td className="p-3.5 uppercase text-[11px] font-mono text-slate-400">
                      {exp.paymentMethod}
                    </td>

                    <td className="p-3.5 text-slate-400">{exp.recordedBy}</td>

                    <td className="p-3.5 text-right font-mono font-bold text-rose-400 text-sm">
                      KSh {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="p-3.5 text-right flex items-center justify-end gap-1.5">
                      {exp.recurringType && exp.recurringType !== 'One-Time' && (
                        <button
                          onClick={() => handleProcessNextCycle(exp)}
                          className="px-2.5 py-1 bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                          title={`Process next ${exp.recurringType} cycle`}
                        >
                          <RefreshCw className="w-3 h-3 text-indigo-400" />
                          <span>Renew</span>
                        </button>
                      )}
                      {hasWorkerPermission(currentUser, 'canDeleteDailyEntries') && (
                        <button
                          onClick={() => onDeleteExpense(exp.id)}
                          className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded-lg transition"
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: LOG EXPENSE */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-200">Log Store Expense</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Expense Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                >
                  <option value="Rent">Rent</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Salaries">Salaries</option>
                  <option value="Transport">Transport</option>
                  <option value="Restock">Restock</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Recurring Schedule / Frequency *</label>
                <select
                  value={recurringType}
                  onChange={(e) => setRecurringType(e.target.value as RecurringFrequency)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                >
                  <option value="One-Time">One-Time Expense (Standard)</option>
                  <option value="Daily">Daily Recurring (e.g. Daily Transport Float / Rider Allowance)</option>
                  <option value="Monthly">Monthly Recurring (e.g. Rent, Power, Salaries, Fibre)</option>
                  <option value="Yearly">Yearly Recurring (e.g. Business Permit, License, ETR Maintenance)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description / Particulars *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. July shop electricity & water bill"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Amount (KSh) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none capitalize"
                >
                  <option value="cash">Cash</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="cheque">Cheque</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="upi">UPI</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Receipt / Voucher Number</label>
                <input
                  type="text"
                  placeholder="e.g. REC-9921 (Optional)"
                  value={receiptNo}
                  onChange={(e) => setReceiptNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-5 py-2 rounded-xl">
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AUTO DELETE REPEATED EXPENSES */}
      {showDeduplicateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Trash2 className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Auto-Delete Repeated Expenses
                  </h3>
                  <p className="text-xs text-slate-400">
                    Identifies and cleans duplicate expense entries logged on the same cycle or with identical receipt numbers
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeduplicateModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {duplicateExpenseGroups.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-white">No Duplicate Expense Records!</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    All expense records in your audit log are unique. No repeated receipts or duplicate entries found.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-200">
                    <div>
                      <span className="font-extrabold text-amber-300 text-sm block">Expense Deduplication Summary</span>
                      <span>
                        Found <strong className="text-white">{duplicateExpenseGroups.length} duplicate groups</strong> containing{' '}
                        <strong className="text-amber-300">{totalDuplicateExpensesCount} repeated logs</strong>.
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Detected Duplicate Expense Clusters ({duplicateExpenseGroups.length})
                    </h5>

                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {duplicateExpenseGroups.map((group) => (
                        <div key={group.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                            <span className="font-bold text-white flex items-center gap-2">
                              <span>{group.primaryExpense.description}</span>
                              <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-sky-300">
                                {group.matchReason}
                              </span>
                            </span>
                            <span className="text-amber-400 font-extrabold font-mono text-[11px]">
                              KSh {group.primaryExpense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          {/* Primary Kept */}
                          <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-2.5 text-xs text-emerald-200">
                            <div className="flex items-center gap-2">
                              <span className="bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] px-2 py-0.5 rounded">
                                KEEP (Original)
                              </span>
                              <span className="font-semibold">{group.primaryExpense.date}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({group.primaryExpense.receiptNo || 'N/A'})</span>
                            </div>
                            <span className="font-bold font-mono text-emerald-400">
                              KSh {group.primaryExpense.amount.toLocaleString()}
                            </span>
                          </div>

                          {/* Repeated Duplicates to Delete */}
                          <div className="space-y-1.5 pl-3 border-l-2 border-amber-500/40">
                            {group.duplicateExpenses.map((dup) => (
                              <div key={dup.id} className="flex items-center justify-between bg-rose-950/20 border border-rose-900/40 rounded-xl p-2 text-xs text-rose-300">
                                <div className="flex items-center gap-2">
                                  <span className="bg-rose-500/20 text-rose-400 font-bold text-[10px] px-2 py-0.5 rounded">
                                    DELETE (Repeated)
                                  </span>
                                  <span>{dup.date}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">({dup.receiptNo || 'N/A'})</span>
                                </div>
                                <span className="font-bold font-mono text-rose-400">
                                  KSh {dup.amount.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeduplicateModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs transition"
              >
                Close
              </button>

              {duplicateExpenseGroups.length > 0 && (
                <button
                  type="button"
                  onClick={handleConfirmDeduplicate}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-xs transition shadow-lg shadow-amber-500/20 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Confirm & Auto-Delete Repeated Expenses ({totalDuplicateExpensesCount})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
