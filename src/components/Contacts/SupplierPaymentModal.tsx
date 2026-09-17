import React, { useState } from 'react';
import { X, DollarSign, CheckCircle2, Building2, Phone, CreditCard, FileText } from 'lucide-react';
import { Supplier, PaymentMethod, User } from '../../types';

interface SupplierPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  currentUser: User;
  onRecordPayment: (
    supplierId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    reference?: string,
    notes?: string
  ) => void;
}

export const SupplierPaymentModal: React.FC<SupplierPaymentModalProps> = ({
  isOpen,
  onClose,
  supplier,
  currentUser,
  onRecordPayment,
}) => {
  if (!isOpen || !supplier) return null;

  const currentDebt = supplier.currentBalanceDue || 0;
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

    onRecordPayment(
      supplier.id,
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
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100">Pay Supplier / Vendor</h3>
              <p className="text-xs text-slate-400">
                Supplier: <span className="text-slate-200 font-semibold">{supplier.name}</span>
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
              Outstanding Accounts Payable
            </span>
            <div className="text-2xl font-black text-rose-400 font-mono">
              KSh {currentDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Total Lifetime Restock
            </span>
            <div className="text-sm font-bold text-slate-200 font-mono">
              KSh {supplier.totalSuppliedValue.toLocaleString()}
            </div>
          </div>
        </div>

        {supplier.bankDetails && (
          <div className="mt-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-300">
            <span className="text-slate-500 font-semibold block text-[10px] uppercase">Payment Destination</span>
            <span className="font-mono text-sky-400">{supplier.bankDetails}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Quick Pay Buttons */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Quick Payment Fill</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickAmount(currentDebt)}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 rounded-xl font-bold transition flex items-center justify-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Full Pay
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
                onClick={() => handleQuickAmount(10000)}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl font-semibold transition"
              >
                KSh 10,000
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
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-lg font-bold text-indigo-400 font-mono outline-none transition"
              />
            </div>
            {error && <p className="text-rose-400 text-[10px] mt-1">{error}</p>}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Payment Method / Source</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('mpesa')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  paymentMethod === 'mpesa'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Phone className="w-3.5 h-3.5" /> M-Pesa Till/Paybill
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  paymentMethod === 'bank_transfer'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" /> Bank EFT / RTGS
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  paymentMethod === 'cash'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" /> Cash / Cheque
              </button>
            </div>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Bank Ref / M-Pesa Transaction ID / Cheque #
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. QLK9028KLM or EFT-2026-90"
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 outline-none uppercase font-mono transition"
            />
          </div>

          {/* Notes / Invoice Ref */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Invoice Reference / Description</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Payment for Batch INV-2026-919 headphones restock..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition"
            />
          </div>

          <div className="pt-2 text-[10px] text-slate-500">
            Recorded by: <span className="text-slate-400 font-semibold">{currentUser.name}</span>. This will debit the cash ledger under 'Supplier Cash Payment'.
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
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition font-bold shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Supplier Payout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
