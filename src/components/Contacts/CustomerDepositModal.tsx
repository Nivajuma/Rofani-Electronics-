import React, { useMemo, useState, useEffect } from 'react';
import {
  X,
  Wallet,
  DollarSign,
  CheckCircle2,
  Phone,
  FileText,
  Smartphone,
  Receipt,
  CreditCard,
} from 'lucide-react';
import { Customer, PaymentMethod, Transaction, User } from '../../types';
import { MpesaPromptModal } from '../POS/MpesaPromptModal';
import { formatKSh } from '../../utils/currency';

interface CustomerDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  transactions: Transaction[];
  currentUser: User;
  initialMode?: 'deposit' | 'partial_payment';
  initialTransactionId?: string;
  onRecordDepositOrPayment: (params: {
    customerId: string;
    mode: 'deposit' | 'partial_payment';
    amount: number;
    paymentMethod: PaymentMethod | 'store_credit';
    linkedTransactionId?: string;
    referenceNo?: string;
    notes?: string;
  }) => void;
}

export const CustomerDepositModal: React.FC<CustomerDepositModalProps> = ({
  isOpen,
  onClose,
  customer,
  transactions,
  currentUser,
  initialMode = 'deposit',
  initialTransactionId,
  onRecordDepositOrPayment,
}) => {
  const [mode, setMode] = useState<'deposit' | 'partial_payment'>(initialMode);
  const [selectedTxId, setSelectedTxId] = useState<string>(initialTransactionId || '');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | 'store_credit'>('mpesa');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showMpesaPrompt, setShowMpesaPrompt] = useState<boolean>(false);

  const unpaidOrPartialInvoices = useMemo(() => {
    if (!customer) return [];
    return transactions.filter((t) => {
      const matchesCust =
        (t.customerId && t.customerId === customer.id) ||
        (t.customerName && t.customerName.toLowerCase() === customer.name.toLowerCase());
      return matchesCust && (t.balanceDue || 0) > 0;
    });
  }, [customer, transactions]);

  useEffect(() => {
    if (!isOpen || !customer) return;
    setMode(initialMode);
    setError('');
    setReferenceNo('');
    setNotes('');
    if (initialMode === 'partial_payment') {
      const targetTx =
        unpaidOrPartialInvoices.find((t) => t.id === initialTransactionId) ||
        unpaidOrPartialInvoices[0];
      setSelectedTxId(targetTx?.id || '');
      const suggested = targetTx?.balanceDue || customer.currentBalanceDue || 0;
      setAmount(suggested > 0 ? String(suggested) : '');
      setPaymentMethod('mpesa');
    } else {
      setSelectedTxId('');
      setAmount('');
      setPaymentMethod('mpesa');
    }
  }, [isOpen, customer, initialMode, initialTransactionId, unpaidOrPartialInvoices]);

  if (!isOpen || !customer) return null;

  const depositBalance = customer.depositBalance || 0;
  const currentDebt = customer.currentBalanceDue || 0;
  const selectedInvoice = unpaidOrPartialInvoices.find((t) => t.id === selectedTxId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount greater than 0.');
      return;
    }

    if (mode === 'partial_payment' && paymentMethod === 'store_credit') {
      if (depositBalance <= 0) {
        setError('This customer has no available advance deposit balance.');
        return;
      }
      if (parsedAmount > depositBalance) {
        setError(`Amount exceeds available deposit balance (${formatKSh(depositBalance)}).`);
        return;
      }
    }

    onRecordDepositOrPayment({
      customerId: customer.id,
      mode,
      amount: parsedAmount,
      paymentMethod,
      linkedTransactionId: mode === 'partial_payment' && selectedTxId ? selectedTxId : undefined,
      referenceNo: referenceNo.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Customer Deposit &amp; Partial Payment
              </h3>
              <p className="text-xs text-slate-400">
                Customer: <strong className="text-slate-200">{customer.name}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Account Balances Strip */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Advance Deposit Wallet
            </span>
            <span className="text-lg font-black font-mono text-emerald-400">
              {formatKSh(depositBalance, { showDecimals: true })}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Outstanding Credit Debt
            </span>
            <span className={`text-lg font-black font-mono ${currentDebt > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {formatKSh(currentDebt, { showDecimals: true })}
            </span>
          </div>
        </div>

        {/* Mode Switch */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('deposit');
              if (paymentMethod === 'store_credit') setPaymentMethod('mpesa');
              setError('');
            }}
            className={`py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'deposit'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Advance Deposit</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('partial_payment');
              setError('');
              if (unpaidOrPartialInvoices[0] && !selectedTxId) {
                setSelectedTxId(unpaidOrPartialInvoices[0].id);
                setAmount(String(unpaidOrPartialInvoices[0].balanceDue || ''));
              } else if (currentDebt > 0 && !amount) {
                setAmount(String(currentDebt));
              }
            }}
            className={`py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'partial_payment'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Partial / Invoice Pay</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {mode === 'partial_payment' && unpaidOrPartialInvoices.length > 0 && (
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Apply Toward Specific Sale / Partial Invoice
              </label>
              <select
                value={selectedTxId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedTxId(id);
                  const tx = unpaidOrPartialInvoices.find((item) => item.id === id);
                  if (tx) setAmount(String(tx.balanceDue || ''));
                }}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-100 outline-none"
              >
                <option value="">Auto-allocate across oldest open invoices (General Balance)</option>
                {unpaidOrPartialInvoices.map((tx) => (
                  <option key={tx.id} value={tx.id}>
                    {tx.receiptNumber} • {new Date(tx.date).toLocaleDateString()} • Due: {formatKSh(tx.balanceDue)} (Paid {formatKSh(tx.amountPaid)}/{formatKSh(tx.grandTotal)})
                  </option>
                ))}
              </select>
              {selectedInvoice && (
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-amber-300">
                  <span>Selected balance: {formatKSh(selectedInvoice.balanceDue, { showDecimals: true })}</span>
                  <button
                    type="button"
                    onClick={() => setAmount(String(Math.round(selectedInvoice.balanceDue / 2)))}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount(String(selectedInvoice.balanceDue))}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold"
                  >
                    Full
                  </button>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {mode === 'deposit' ? 'Advance Deposit Amount (KSh) *' : 'Partial / Settlement Amount (KSh) *'}
            </label>
            <input
              type="number"
              min="1"
              step="1"
              required
              placeholder="e.g. 2500"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
              }}
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-base font-black font-mono text-emerald-400 outline-none"
            />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {[500, 1000, 2000, 5000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setAmount(String(preset));
                    setError('');
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-mono font-bold cursor-pointer"
                >
                  +{formatKSh(preset)}
                </button>
              ))}
            </div>
            {error && <p className="text-rose-400 text-[11px] mt-1 font-semibold">{error}</p>}
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Payment Channel</label>
            <div className={`grid ${mode === 'partial_payment' && depositBalance > 0 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-2`}>
              <button
                type="button"
                onClick={() => setPaymentMethod('mpesa')}
                className={`py-2 px-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMethod === 'mpesa'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Phone className="w-3.5 h-3.5" /> M-Pesa
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" /> Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`py-2 px-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMethod === 'bank_transfer'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" /> Bank/Cheque
              </button>
              {mode === 'partial_payment' && depositBalance > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('store_credit');
                    if (!amount || parseFloat(amount) > depositBalance) {
                      setAmount(String(Math.min(depositBalance, selectedInvoice?.balanceDue || currentDebt || depositBalance)));
                    }
                  }}
                  className={`py-2 px-2.5 rounded-xl border font-bold flex items-center justify-center gap-1 cursor-pointer ${
                    paymentMethod === 'store_credit'
                      ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" /> Use Deposit
                </button>
              )}
            </div>
          </div>

          {paymentMethod === 'mpesa' && (
            <button
              type="button"
              onClick={() => setShowMpesaPrompt(true)}
              className="w-full py-2.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Prompt Customer M-Pesa Phone (STK Push)</span>
            </button>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Reference / M-Pesa Code</label>
              <input
                type="text"
                placeholder="e.g. UJK891PQ2"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Notes / Purpose</label>
              <input
                type="text"
                placeholder={mode === 'deposit' ? 'e.g. Prepayment / Layaway deposit' : 'e.g. 2nd installment'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 outline-none"
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div>
              Recorded by: <strong className="text-slate-200">{currentUser.name}</strong>
            </div>
            <div>
              {mode === 'deposit'
                ? 'Advance deposits credit the customer wallet immediately (can be used later at POS checkout or to offset credit debt) and log Cash In.'
                : 'Partial payments reduce invoice balance due & customer debt immediately and log Cash In (unless paid from existing Deposit Wallet).'}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-extrabold flex items-center gap-1.5 shadow-lg shadow-sky-600/25 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{mode === 'deposit' ? 'Save Advance Deposit' : 'Record Partial Payment'}</span>
            </button>
          </div>
        </form>

        <MpesaPromptModal
          isOpen={showMpesaPrompt}
          onClose={() => setShowMpesaPrompt(false)}
          amount={parseFloat(amount) || 0}
          initialPhone={customer.phone && customer.phone !== 'N/A' ? customer.phone : ''}
          customerName={customer.name}
          accountReference={customer.name}
          onPaymentSuccess={(receiptCode) => {
            setReferenceNo(receiptCode);
            setShowMpesaPrompt(false);
          }}
        />
      </div>
    </div>
  );
};
