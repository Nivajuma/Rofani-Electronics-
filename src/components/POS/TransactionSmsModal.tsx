import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  RotateCcw,
  Clock,
  Sparkles,
  ShieldCheck,
  Copy,
  Check,
  PhoneCall
} from 'lucide-react';
import { Transaction } from '../../types';
import {
  formatTransactionSummarySms,
  sendTransactionSummarySms,
  SmsDeliveryRecord,
  getSmsDeliveryLogs
} from '../../utils/smsService';
import { normalizeKenyanPhone } from '../../utils/mpesa';

interface TransactionSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  storeName?: string;
  onSmsSent?: (record: SmsDeliveryRecord) => void;
}

export const TransactionSmsModal: React.FC<TransactionSmsModalProps> = ({
  isOpen,
  onClose,
  transaction,
  storeName = 'ROFANI',
  onSmsSent,
}) => {
  const initialPhone = transaction.customerPhone && transaction.customerPhone !== 'N/A'
    ? transaction.customerPhone
    : '';

  const [phone, setPhone] = useState(initialPhone);
  const [customNote, setCustomNote] = useState('');
  const [includeItems, setIncludeItems] = useState(true);
  const [messageBody, setMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [deliveryResult, setDeliveryResult] = useState<SmsDeliveryRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Re-generate message text when transaction, options, or customNote change
  useEffect(() => {
    const formatted = formatTransactionSummarySms(transaction, storeName, {
      includeItemsList: includeItems,
      customNote: customNote.trim() || undefined,
    });
    setMessageBody(formatted);
  }, [transaction, storeName, includeItems, customNote]);

  // Sync phone when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhone(transaction.customerPhone && transaction.customerPhone !== 'N/A' ? transaction.customerPhone : '');
      setErrorMsg('');
      setDeliveryResult(null);

      // Check if this transaction already had an SMS sent
      const existingLogs = getSmsDeliveryLogs();
      const existing = existingLogs.find((log) => log.transactionId === transaction.id || log.receiptNumber === transaction.receiptNumber);
      if (existing) {
        setDeliveryResult(existing);
      }
    }
  }, [isOpen, transaction]);

  if (!isOpen) return null;

  const phoneInfo = normalizeKenyanPhone(phone);
  const charCount = messageBody.length;
  const segments = Math.ceil(charCount / 160) || 1;

  const handleSend = async () => {
    setErrorMsg('');
    if (!phone.trim()) {
      setErrorMsg('Please enter a recipient mobile phone number.');
      return;
    }

    if (!phoneInfo.isValid) {
      setErrorMsg('Invalid Kenyan mobile number. Please use formats like 0712345678, 0110123456, or +254712345678.');
      return;
    }

    setIsSending(true);
    try {
      const res = await sendTransactionSummarySms(transaction, phoneInfo.normalized, {
        storeName,
        customMessage: messageBody,
        senderId: 'ROFANI',
      });

      setDeliveryResult(res.record);
      if (onSmsSent) {
        onSmsSent(res.record);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch SMS through gateway.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative text-slate-100 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-sky-600 to-indigo-700 p-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base tracking-tight">Transaction Summary SMS</h3>
                <span className="bg-indigo-950/60 text-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-400/40 font-mono">
                  Mock Gateway API
                </span>
              </div>
              <p className="text-xs text-indigo-100 font-medium">
                Receipt #{transaction.receiptNumber} • KSh {transaction.grandTotal.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/90 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Delivered Banner if already sent */}
          {deliveryResult && (
            <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-extrabold flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>SMS Successfully Delivered!</span>
                </span>
                <span className="text-[10px] text-emerald-300 font-mono bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-700">
                  {deliveryResult.carrier || 'SAFARICOM'} BULK SMS
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-emerald-900/60 text-emerald-200/90">
                <div>
                  <span className="text-emerald-400/80">Message ID: </span>
                  <span className="font-mono font-bold">{deliveryResult.id}</span>
                </div>
                <div>
                  <span className="text-emerald-400/80">Delivered To: </span>
                  <span className="font-mono font-bold">{deliveryResult.formattedPhone}</span>
                </div>
                <div>
                  <span className="text-emerald-400/80">Gateway Cost: </span>
                  <span className="font-mono font-bold">KES {deliveryResult.cost.toFixed(2)} ({deliveryResult.segments} credit)</span>
                </div>
                <div>
                  <span className="text-emerald-400/80">Sent At: </span>
                  <span className="font-mono">{new Date(deliveryResult.sentAt).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Customer & Phone Form */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Recipient Customer
                </label>
                <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200">
                  {transaction.customerName || 'Walk-in Customer'}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between mb-1">
                  <span>Mobile Phone Number *</span>
                  {phoneInfo.isValid && (
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> Valid
                    </span>
                  )}
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 0712 345 678"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full bg-slate-950 border-2 border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-100 outline-none transition"
                />
              </div>
            </div>

            {/* Quick Phone Fill Options */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
              <span>Quick Fill:</span>
              {transaction.customerPhone && transaction.customerPhone !== 'N/A' && (
                <button
                  type="button"
                  onClick={() => setPhone(transaction.customerPhone || '')}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-[10px]"
                >
                  Customer Phone ({transaction.customerPhone})
                </button>
              )}
              <button
                type="button"
                onClick={() => setPhone('0712345678')}
                className="px-2 py-0.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800 font-mono text-[10px]"
              >
                Demo 0712 345 678
              </button>
              <button
                type="button"
                onClick={() => setPhone('0722000000')}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono text-[10px]"
              >
                0722 000 000
              </button>
            </div>

            {/* Options Toggle */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={includeItems}
                  onChange={(e) => setIncludeItems(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                />
                <span>Include purchased items in SMS summary</span>
              </label>

              <button
                type="button"
                onClick={handleCopy}
                className="text-indigo-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>

            {/* Optional Custom Note / Warranty Memo */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Optional Custom Note / Warranty Memo (Appended to SMS):
              </label>
              <input
                type="text"
                placeholder="e.g. 1-Year Warranty Included. Keep this SMS for proof..."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* SMS Handset Preview Bubble */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-bold uppercase tracking-wider flex items-center gap-1 text-slate-300">
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" /> Customer Handset SMS Preview
              </span>
              <span className="font-mono text-[10px] text-indigo-300">
                Sender ID: <strong>ROFANI</strong>
              </span>
            </div>

            {/* Simulated Handset SMS Message Bubble */}
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-3.5 text-xs font-sans text-indigo-100 leading-relaxed shadow-inner">
              <p className="whitespace-pre-wrap select-all font-mono text-[11px] text-slate-200">
                {messageBody}
              </p>
            </div>

            {/* SMS Metrics & Billing Status */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
              <span>
                Length: <strong className="text-white">{charCount}</strong> chars •{' '}
                <strong className={segments > 1 ? 'text-amber-400' : 'text-emerald-400'}>
                  {segments} SMS Segment{segments > 1 ? 's' : ''}
                </strong>
              </span>
              <span>Gateway Route: <strong className="text-emerald-400">Mock Africa's Talking / Safaricom</strong></span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl text-xs transition"
            >
              Close
            </button>

            <button
              type="button"
              id="btn-send-transaction-sms-submit"
              disabled={isSending}
              onClick={handleSend}
              className="flex-1 bg-gradient-to-r from-indigo-600 via-sky-600 to-indigo-700 hover:from-indigo-500 hover:to-sky-500 text-white font-extrabold py-3 px-4 rounded-2xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSending
                  ? 'Dispatching SMS via Gateway...'
                  : deliveryResult
                  ? 'Resend SMS Notification'
                  : 'Send Transaction Summary SMS'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
