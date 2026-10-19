import React, { useState } from 'react';
import {
  X,
  Building2,
  Clock,
  DollarSign,
  Phone,
  CreditCard,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Download,
  Calendar,
  Search
} from 'lucide-react';
import { Supplier, CashTransaction } from '../../types';
import { formatKSh } from '../../utils/currency';

interface SupplierPaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  cashTransactions: CashTransaction[];
  onOpenPayment?: (supplier: Supplier) => void;
}

export const SupplierPaymentHistoryModal: React.FC<SupplierPaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  supplier,
  cashTransactions,
  onOpenPayment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  if (!isOpen || !supplier) return null;

  // Filter cash transactions that correspond to payments made to this supplier
  const supplierNameLower = supplier.name.toLowerCase().trim();
  const paymentTransactions = cashTransactions.filter((tx) => {
    if (tx.type !== 'CASH_OUT') return false;
    const dest = (tx.sourceDestination || '').toLowerCase().trim();
    const desc = (tx.description || '').toLowerCase();
    const isSupplierCat = tx.category === 'Supplier Cash Payment' || dest.includes(supplierNameLower) || desc.includes(supplierNameLower);
    return isSupplierCat;
  });

  // Filter by search query if any
  const filteredPayments = paymentTransactions.filter((tx) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      tx.referenceNo.toLowerCase().includes(q) ||
      tx.description.toLowerCase().includes(q) ||
      tx.paymentMethod.toLowerCase().includes(q) ||
      tx.recordedBy.toLowerCase().includes(q) ||
      tx.amount.toString().includes(q)
    );
  });

  // Sort payments chronologically
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  const totalPaidAmount = paymentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const currentDebt = supplier.currentBalanceDue || 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-extrabold shadow-md shadow-sky-600/30">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-xl text-slate-100">Supplier Payment History</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {supplier.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Contact: <span className="text-slate-300 font-sans">{supplier.contactPerson || 'N/A'}</span> • {supplier.phone || 'No Phone'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metrics Overview Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-950 border-b border-slate-800">
          <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
              Total Payments Made
            </span>
            <div className="text-xl font-black text-emerald-400 font-mono mt-1">
              {formatKSh(totalPaidAmount, { showDecimals: true })}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">{paymentTransactions.length} recorded payouts</span>
          </div>

          <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
              Outstanding Payable Owed
            </span>
            <div className={`text-xl font-black font-mono mt-1 ${currentDebt > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {formatKSh(currentDebt, { showDecimals: true })}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">{currentDebt > 0 ? 'Balance due to vendor' : 'Fully settled'}</span>
          </div>

          <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                Quick Actions
              </span>
              <div className="text-xs text-slate-300 mt-1 font-medium truncate">
                {supplier.paymentTerms || 'Net 30 Days'}
              </div>
            </div>
            {currentDebt > 0 && onOpenPayment && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPayment(supplier);
                }}
                className="mt-2 w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5" /> Pay Balance
              </button>
            )}
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search payments by ref, note, method, amount..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Sort Order:</span>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-sky-400 border border-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>

        {/* Payments List / Table */}
        <div className="flex-1 overflow-y-auto p-4 max-h-[45vh]">
          {sortedPayments.length === 0 ? (
            <div className="py-16 text-center">
              <Clock className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-60" />
              <h4 className="font-bold text-slate-300 text-sm">No payment records found</h4>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery ? 'No payments match your search query.' : `No cash payout transactions have been recorded for ${supplier.name} yet.`}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sortedPayments.map((tx) => {
                const formattedDate = new Date(tx.date).toLocaleString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={tx.id}
                    className="p-4 bg-slate-950/85 hover:bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition shadow-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-extrabold text-sky-400 px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
                          {tx.referenceNo}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase">
                          {tx.paymentMethod.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formattedDate}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 font-medium">
                        {tx.description || `Accounts payable settlement to ${supplier.name}`}
                      </p>
                      {tx.notes && (
                        <p className="text-[11px] text-slate-400 italic">
                          Notes: "{tx.notes}"
                        </p>
                      )}
                    </div>

                    <div className="text-right sm:shrink-0">
                      <div className="text-base font-black text-emerald-400 font-mono">
                        -{formatKSh(tx.amount, { showDecimals: true })}
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        By {tx.recordedBy}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing <strong>{sortedPayments.length}</strong> of <strong>{paymentTransactions.length}</strong> total payment records</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition cursor-pointer"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};
