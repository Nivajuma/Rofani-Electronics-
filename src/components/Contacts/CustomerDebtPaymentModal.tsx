import React, { useState } from 'react';
import { X, CreditCard, DollarSign, CheckCircle2, AlertCircle, Phone, FileText } from 'lucide-react';
import { Customer, PaymentMethod, User } from '../../types';

interface CustomerDebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  currentUser: User;
  onRecordPayment: (
    customerId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    reference?: string,
    notes?: string
  ) => void;
}

export const CustomerDebtPaymentModal: React.FC<CustomerDebtPaymentModalProps> = ({
  isOpen,
  onClose,
  customer,
  currentUser,
  onRecordPayment,
}) => {
  if (!isOpen || !customer) return null;

  const currentDebt = customer.currentBalanceDue || 0;
  const [amount, setAmount] = useState(currentDebt > 0 ? currentDebt.toString() : '0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleQuickAmount = (val: number) => {
    setAmount(val.toString());
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid payment amount greater than 0');
      return;
    }

    if (parsedAmount > currentDebt && currentDebt > 0) {
      // allow partial or full settlement
      if (!window.confirm(`The amount (KSh ${parsedAmount.toLocaleString()}) exceeds the balance due (KSh ${currentDebt.toLocaleString()}). Do you wish to continue and record advance credit?`)) {
        return;
      }
    }

    onRecordPayment(
      customer.id,
      parsedAmount,
      paymentMethod,
      reference.trim() || undefined,
      notes.trim() || undefined
    );

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100">Collect Debt Repayment</h3>
              <p className="text-xs text-slate-400">
                Customer: <span className="text-slate-200 font-semibold">{customer.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Status Banner */}
        <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Outstanding Debt Balance
            </span>
            <div className="text-2xl font-black text-rose-400 font-mono">
              KSh {currentDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Lifetime Purchases
            </span>
            <div className="text-sm font-bold text-slate-200 font-mono">
              KSh {customer.totalPurchases.toLocaleString()}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Quick Pay Buttons */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Quick Payment Fill</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickAmount(currentDebt)}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl font-bold transition flex items-center justify-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Full (100%)
              </button>
              <button
                type="button"
                onClick={() => handleQuickAmount(Math.round(currentDebt / 2))}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-xl font-semibold transition"
              >
                50% (KSh {Math.round(currentDebt / 2).toLocaleString()})
              </button>
              <button
                type="button"
                onClick={() => handleQuickAmount(1000)}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl font-semibold transition"
              >
                KSh 1,000
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Payment Amount (KSh) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-lg font-bold text-emerald-400 font-mono outline-none transition"
              />
            </div>
            {error && <p className="text-rose-400 text-[10px] mt-1">{error}</p>}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('mpesa')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  paymentMethod === 'mpesa'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Phone className="w-3.5 h-3.5" /> M-Pesa
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" /> Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('cheque')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  paymentMethod === 'cheque'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Cheque / Bank
              </button>
            </div>
          </div>

          {/* Reference / M-Pesa Code */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Transaction Ref / M-Pesa Code / Cheque #
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. QGH798KLM or Cheque #00492"
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 outline-none uppercase font-mono transition"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Payment Memo / Receipt Note</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Part payment for suits invoice #RCP-2026-004..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition"
            />
          </div>

          <div className="pt-2 text-[10px] text-slate-500">
            Recorded by: <span className="text-slate-400 font-semibold">{currentUser.name}</span> ({currentUser.role}). This will automatically credit the cash ledger and deduct the debt.
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Repayment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
