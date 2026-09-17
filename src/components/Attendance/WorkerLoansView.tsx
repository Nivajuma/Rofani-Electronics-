import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  FileText,
  Printer,
  X,
  TrendingDown,
  TrendingUp,
  Receipt,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { WorkerLoan, WorkerLoanRepayment, User as Employee, PaymentMethod } from '../../types';

interface WorkerLoansViewProps {
  loans: WorkerLoan[];
  allUsers: Employee[];
  currentUser: Employee;
  onIssueLoan: (loan: WorkerLoan) => void;
  onRepayLoan: (loanId: string, repayment: WorkerLoanRepayment) => void;
  onUpdateLoanStatus?: (loanId: string, status: WorkerLoan['status']) => void;
}

export const WorkerLoansView: React.FC<WorkerLoansViewProps> = ({
  loans,
  allUsers,
  currentUser,
  onIssueLoan,
  onRepayLoan,
  onUpdateLoanStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Fully Repaid' | 'Overdue' | 'Written Off'>('All');

  // Modal States
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [selectedLoanForRepay, setSelectedLoanForRepay] = useState<WorkerLoan | null>(null);
  const [selectedLoanForStatement, setSelectedLoanForStatement] = useState<WorkerLoan | null>(null);

  // New Loan Form State
  const [workerId, setWorkerId] = useState(allUsers[0]?.id || '');
  const [principalAmount, setPrincipalAmount] = useState<number | ''>('');
  const [purpose, setPurpose] = useState('Salary Advance / Emergency');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [disbursementMethod, setDisbursementMethod] = useState<PaymentMethod>('mpesa');
  const [disbursementRef, setDisbursementRef] = useState('');
  const [loanNotes, setLoanNotes] = useState('');

  // Repayment Form State
  const [repayAmount, setRepayAmount] = useState<number | ''>('');
  const [repayMethod, setRepayMethod] = useState<PaymentMethod | 'salary_deduction'>('salary_deduction');
  const [repayRef, setRepayRef] = useState('');
  const [repayNotes, setRepayNotes] = useState('');

  // Calculations
  const totalPrincipalIssued = loans.reduce((acc, l) => acc + l.principalAmount, 0);
  const totalRepaidAll = loans.reduce((acc, l) => acc + l.totalRepaid, 0);
  const totalOutstandingBalance = loans.reduce((acc, l) => acc + l.balanceDue, 0);
  const activeLoansCount = loans.filter((l) => l.status === 'Active' || l.status === 'Overdue').length;

  // Filtered Loans
  const filteredLoans = loans.filter((l) => {
    const matchesSearch =
      l.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.loanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle New Loan Submit
  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const worker = allUsers.find((u) => u.id === workerId);
    if (!worker || !principalAmount || principalAmount <= 0) return;

    const num = `WLN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newLoan: WorkerLoan = {
      id: `wln-${Date.now()}`,
      loanNumber: num,
      workerId: worker.id,
      workerName: worker.name,
      role: worker.role,
      principalAmount: Number(principalAmount),
      totalRepaid: 0,
      balanceDue: Number(principalAmount),
      issueDate,
      dueDate,
      disbursementMethod,
      disbursementRef,
      purpose,
      status: 'Active',
      approvedBy: currentUser.name,
      repayments: [],
      notes: loanNotes,
    };

    onIssueLoan(newLoan);
    setShowIssueModal(false);
    // Reset Form
    setPrincipalAmount('');
    setDisbursementRef('');
    setLoanNotes('');
  };

  // Handle Repayment Submit
  const handleRepaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForRepay || !repayAmount || repayAmount <= 0) return;

    const repayment: WorkerLoanRepayment = {
      id: `rep-${Date.now()}`,
      loanId: selectedLoanForRepay.id,
      amount: Number(repayAmount),
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: repayMethod,
      referenceNo: repayRef,
      recordedBy: currentUser.name,
      notes: repayNotes,
    };

    onRepayLoan(selectedLoanForRepay.id, repayment);
    setShowRepayModal(false);
    setSelectedLoanForRepay(null);
    setRepayAmount('');
    setRepayRef('');
    setRepayNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-xl">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-100 flex items-center gap-2">
              Worker Loan & Advance Management
              <span className="text-[10px] bg-emerald-900/80 text-emerald-300 px-2 py-0.5 rounded-md font-bold border border-emerald-700">
                Staff Payroll & Loans
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Lend salary advances, track worker repayments, manage installment schedules & print statements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setSelectedLoanForRepay(filteredLoans.find((l) => l.balanceDue > 0) || loans[0] || null);
              setShowRepayModal(true);
            }}
            className="bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-2 border border-emerald-800/60"
          >
            <Receipt className="w-4 h-4" />
            <span>Record Loan Payment</span>
          </button>

          <button
            onClick={() => setShowIssueModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Worker Loan / Advance</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Loans Issued</span>
            <span className="p-1 bg-sky-950 text-sky-400 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-slate-100">
            KSh {totalPrincipalIssued.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Cumulative principal advances</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Repayments Received</span>
            <span className="p-1 bg-emerald-950 text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-emerald-400">
            KSh {totalRepaidAll.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {totalPrincipalIssued > 0
              ? `${Math.round((totalRepaidAll / totalPrincipalIssued) * 100)}% total loan recovery`
              : 'No active loans'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Outstanding Owed Balance</span>
            <span className="p-1 bg-amber-950 text-amber-400 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-amber-400">
            KSh {totalOutstandingBalance.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Worker debt remaining to collect</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Active Worker Borrowers</span>
            <span className="p-1 bg-indigo-950 text-indigo-400 rounded-lg">
              <User className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-indigo-400">{activeLoansCount} Workers</div>
          <div className="text-[11px] text-slate-400 mt-1">With active or pending loans</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search worker name, loan #, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {(['All', 'Active', 'Fully Repaid', 'Overdue', 'Written Off'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                statusFilter === status
                  ? 'bg-emerald-600 text-slate-950'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Loans Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            Worker Loan & Advance Register ({filteredLoans.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Loan # & Date</th>
                <th className="p-3.5">Worker / Employee</th>
                <th className="p-3.5">Purpose / Reason</th>
                <th className="p-3.5 text-right">Principal</th>
                <th className="p-3.5 text-right">Repaid</th>
                <th className="p-3.5 text-right">Balance Due</th>
                <th className="p-3.5">Recovery Progress</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    No worker loans or advances found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => {
                  const pct =
                    loan.principalAmount > 0
                      ? Math.min(100, Math.round((loan.totalRepaid / loan.principalAmount) * 100))
                      : 100;

                  return (
                    <tr key={loan.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-semibold text-slate-200">
                        <div className="font-bold text-slate-100">{loan.loanNumber}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-500" /> {loan.issueDate}
                        </div>
                      </td>

                      <td className="p-3.5 font-medium text-slate-200">
                        <div className="font-bold text-emerald-300">{loan.workerName}</div>
                        <div className="text-[10px] text-slate-400">{loan.role}</div>
                      </td>

                      <td className="p-3.5 text-slate-300 max-w-xs truncate">
                        <div>{loan.purpose}</div>
                        {loan.disbursementRef && (
                          <div className="text-[10px] text-slate-500 font-mono">Ref: {loan.disbursementRef}</div>
                        )}
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold text-slate-200">
                        KSh {loan.principalAmount.toLocaleString()}
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                        KSh {loan.totalRepaid.toLocaleString()}
                      </td>

                      <td className="p-3.5 text-right font-mono font-extrabold">
                        {loan.balanceDue > 0 ? (
                          <span className="text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80">
                            KSh {loan.balanceDue.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-emerald-400">Cleared (0)</span>
                        )}
                      </td>

                      <td className="p-3.5 min-w-[120px]">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all ${
                              pct >= 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-indigo-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 w-fit border ${
                            loan.status === 'Fully Repaid'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : loan.status === 'Active'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : loan.status === 'Overdue'
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {loan.status === 'Fully Repaid' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                          {loan.status === 'Active' && <Clock className="w-3 h-3 text-amber-400" />}
                          {loan.status === 'Overdue' && <AlertCircle className="w-3 h-3 text-rose-400" />}
                          {loan.status}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {loan.balanceDue > 0 && (
                            <button
                              onClick={() => {
                                setSelectedLoanForRepay(loan);
                                setRepayAmount(loan.balanceDue);
                                setShowRepayModal(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-slate-950 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border border-emerald-700/60"
                              title="Record Repayment"
                            >
                              <CreditCard className="w-3 h-3" /> Pay
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedLoanForStatement(loan)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                            title="View Statement & History"
                          >
                            <FileText className="w-3 h-3 text-sky-400" /> Statement
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Issue Worker Loan */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 my-8">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-sm">Issue Worker Loan / Salary Advance</h3>
              </div>
              <button onClick={() => setShowIssueModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Select Worker / Staff Member *</label>
                <select
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2.5 font-medium"
                  required
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Loan Amount (KSh) *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 5000"
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2.5 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Disbursement Method</label>
                  <select
                    value={disbursementMethod}
                    onChange={(e) => setDisbursementMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2.5 font-medium"
                  >
                    <option value="mpesa">M-Pesa Mobile Money</option>
                    <option value="cash">Cash (Vault / Register)</option>
                    <option value="cheque">Cheque / Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Purpose / Reason *</label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2.5 font-medium"
                >
                  <option value="Salary Advance / Emergency">Salary Advance / Emergency</option>
                  <option value="Rent Advance Support">Rent Advance Support</option>
                  <option value="Medical Emergency">Medical Emergency</option>
                  <option value="School Fees Support">School Fees Support</option>
                  <option value="Personal Staff Loan">Personal Staff Loan</option>
                  <option value="Travel / Transport Support">Travel / Transport Support</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2.5"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Repayment Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2.5"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Reference Code / Transaction ID</label>
                <input
                  type="text"
                  placeholder="e.g. M-Pesa Code or Receipt #"
                  value={disbursementRef}
                  onChange={(e) => setDisbursementRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2.5 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Notes / Terms</label>
                <textarea
                  rows={2}
                  placeholder="Optional terms or deduction schedule details..."
                  value={loanNotes}
                  onChange={(e) => setLoanNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2.5"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-emerald-600/20"
                >
                  Approve & Issue Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Loan Repayment */}
      {showRepayModal && selectedLoanForRepay && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 my-8">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-sm">
                  Record Loan Repayment: {selectedLoanForRepay.workerName}
                </h3>
              </div>
              <button onClick={() => setShowRepayModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRepaySubmit} className="p-5 space-y-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-slate-400 text-[10px]">Loan #: {selectedLoanForRepay.loanNumber}</div>
                  <div className="font-bold text-slate-100 text-xs">{selectedLoanForRepay.purpose}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400 text-[10px]">Remaining Balance</div>
                  <div className="font-mono font-extrabold text-amber-400 text-sm">
                    KSh {selectedLoanForRepay.balanceDue.toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Repayment Amount (KSh) *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={selectedLoanForRepay.balanceDue}
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2.5 font-mono font-bold"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setRepayAmount(selectedLoanForRepay.balanceDue)}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold rounded-xl whitespace-nowrap"
                  >
                    Pay Full
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Repayment Channel / Method *</label>
                <select
                  value={repayMethod}
                  onChange={(e) => setRepayMethod(e.target.value as PaymentMethod | 'salary_deduction')}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2.5 font-medium"
                >
                  <option value="salary_deduction">Salary Deduction (Payroll Adjustment)</option>
                  <option value="mpesa">M-Pesa Direct Transfer</option>
                  <option value="cash">Cash Paid at Till / Vault</option>
                  <option value="cheque">Cheque / Bank Deposit</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Reference / Receipt Number</label>
                <input
                  type="text"
                  placeholder="e.g. M-Pesa Code or Payroll Ref"
                  value={repayRef}
                  onChange={(e) => setRepayRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2.5 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Payment Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional repayment notes..."
                  value={repayNotes}
                  onChange={(e) => setRepayNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2.5"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRepayModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-emerald-600/20"
                >
                  Save Repayment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Loan Statement & Agreement */}
      {selectedLoanForStatement && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 my-8 print:border-none print:shadow-none print:bg-white print:text-black">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-slate-100 text-sm">
                  Worker Loan Statement #{selectedLoanForStatement.loanNumber}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print Agreement
                </button>
                <button onClick={() => setSelectedLoanForStatement(null)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 text-xs font-sans">
              {/* Receipt Header */}
              <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
                <div>
                  <h2 className="font-black text-lg text-emerald-400 tracking-tight">ROFANI RETAIL & STORES</h2>
                  <p className="text-slate-400 text-[11px]">Worker Loan & Advance Official Statement</p>
                  <p className="text-slate-500 text-[10px]">Issued by: {selectedLoanForStatement.approvedBy}</p>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-200">{selectedLoanForStatement.loanNumber}</div>
                  <div className="text-slate-400 text-[10px]">Issue Date: {selectedLoanForStatement.issueDate}</div>
                  <div className="text-slate-400 text-[10px]">Due Date: {selectedLoanForStatement.dueDate || 'N/A'}</div>
                </div>
              </div>

              {/* Borrower Details */}
              <div className="grid grid-cols-2 gap-4 bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Worker / Borrower</div>
                  <div className="font-bold text-slate-100 text-sm">{selectedLoanForStatement.workerName}</div>
                  <div className="text-slate-400 text-[11px]">{selectedLoanForStatement.role}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Loan Purpose</div>
                  <div className="font-bold text-slate-200">{selectedLoanForStatement.purpose}</div>
                  <div className="text-slate-400 text-[11px]">Method: {selectedLoanForStatement.disbursementMethod.toUpperCase()}</div>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Principal Loan</div>
                  <div className="font-mono font-bold text-slate-100 text-sm">
                    KSh {selectedLoanForStatement.principalAmount.toLocaleString()}
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Total Repaid</div>
                  <div className="font-mono font-bold text-emerald-400 text-sm">
                    KSh {selectedLoanForStatement.totalRepaid.toLocaleString()}
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Balance Owed</div>
                  <div className="font-mono font-extrabold text-amber-400 text-sm">
                    KSh {selectedLoanForStatement.balanceDue.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Repayments History Ledger Table */}
              <div>
                <h4 className="font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  Repayment Transactions Ledger ({selectedLoanForStatement.repayments.length})
                </h4>

                <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
                  <thead className="bg-slate-950 text-slate-400 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Method</th>
                      <th className="p-2.5">Reference #</th>
                      <th className="p-2.5">Recorded By</th>
                      <th className="p-2.5 text-right">Amount (KSh)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {selectedLoanForStatement.repayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-500">
                          No repayment records logged yet.
                        </td>
                      </tr>
                    ) : (
                      selectedLoanForStatement.repayments.map((rep) => (
                        <tr key={rep.id}>
                          <td className="p-2.5 font-mono">{rep.date}</td>
                          <td className="p-2.5 capitalize">{rep.paymentMethod.replace('_', ' ')}</td>
                          <td className="p-2.5 font-mono text-slate-400">{rep.referenceNo || '-'}</td>
                          <td className="p-2.5 text-slate-400">{rep.recordedBy}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                            KSh {rep.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Signature Line for Loan Agreement */}
              <div className="pt-6 border-t border-slate-800 grid grid-cols-2 gap-8 text-[11px] text-slate-400">
                <div className="space-y-6">
                  <div>Worker Signature: _______________________</div>
                  <div>Name: {selectedLoanForStatement.workerName}</div>
                </div>
                <div className="space-y-6">
                  <div>Manager/Admin Signature: _______________________</div>
                  <div>Name: {selectedLoanForStatement.approvedBy}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
