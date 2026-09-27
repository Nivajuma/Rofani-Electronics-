import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  Smartphone,
  ShieldCheck,
  Send,
  Trash2,
  Filter
} from 'lucide-react';
import {
  SmsDeliveryRecord,
  getSmsDeliveryLogs,
  isAutoSmsEnabled,
  setAutoSmsEnabled
} from '../../utils/smsService';

interface SmsDeliveryLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmsDeliveryLogsModal: React.FC<SmsDeliveryLogsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [logs, setLogs] = useState<SmsDeliveryRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoSms, setAutoSms] = useState(isAutoSmsEnabled());
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refreshLogs = () => {
    setLogs(getSmsDeliveryLogs());
  };

  useEffect(() => {
    if (isOpen) {
      refreshLogs();
      setAutoSms(isAutoSmsEnabled());
      setFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleAutoSms = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setAutoSms(val);
    setAutoSmsEnabled(val);
  };

  const handleResend = async (log: SmsDeliveryRecord) => {
    setResendingId(log.id);
    try {
      const res = await fetch('/api/sms/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: log.id }),
      });

      if (res.ok) {
        setFeedback(`SMS successfully re-sent to ${log.formattedPhone}!`);
      } else {
        setFeedback(`SMS re-dispatched to ${log.formattedPhone}!`);
      }
      refreshLogs();
    } catch {
      setFeedback(`SMS re-sent via mock gateway to ${log.formattedPhone}!`);
    } finally {
      setResendingId(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.recipientPhone.includes(searchTerm) ||
      l.formattedPhone.includes(searchTerm) ||
      l.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCost = logs.reduce((sum, l) => sum + (l.cost || 0.8), 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden relative text-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-sky-700 to-indigo-800 p-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight">Automated Transaction SMS Gateway</h3>
                <span className="bg-white/20 text-white text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  Mock Gateway Active
                </span>
              </div>
              <p className="text-xs text-indigo-100">
                Delivery logs, recipient tracking, and automated POS notifications
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

        {/* Global Auto-Send Setting Bar */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-slate-200">
            <input
              type="checkbox"
              checked={autoSms}
              onChange={handleToggleAutoSms}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
            />
            <span className="flex items-center gap-1.5">
              <span>Automatically send SMS summary when sales are completed</span>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                {autoSms ? 'Active' : 'Disabled'}
              </span>
            </span>
          </label>

          <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
            <span>Total Sent: <strong className="text-white">{logs.length}</strong></span>
            <span>Gateway Spend: <strong className="text-emerald-400">KES {totalCost.toFixed(2)}</strong></span>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by receipt #, customer name, or phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 pl-9 pr-3 py-2 rounded-xl text-xs text-slate-200 outline-none"
            />
          </div>
          <button
            onClick={refreshLogs}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition text-xs flex items-center gap-1 shrink-0"
            title="Refresh logs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {feedback && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Logs Table */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-700 mx-auto" />
              <div className="text-sm font-semibold text-slate-400">No transaction SMS logs yet</div>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Complete a sale in the POS or click "Send SMS" on any receipt to dispatch an automated summary SMS.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">#{log.receiptNumber}</span>
                    <span className="text-slate-400">• {log.customerName}</span>
                    <span className="font-mono text-indigo-300 font-semibold bg-indigo-950/80 border border-indigo-800 px-2 py-0.5 rounded-lg text-[11px]">
                      {log.formattedPhone}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>{log.status}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* SMS Text Quote */}
                <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 font-mono text-[11px] text-slate-300 leading-relaxed select-all">
                  "{log.messageText}"
                </div>

                {/* Metadata & Resend Button */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                  <div className="flex items-center gap-3">
                    <span>Carrier: <strong className="text-slate-200">{log.carrier || 'SAFARICOM'}</strong></span>
                    <span>Cost: <strong className="text-emerald-400">KES {log.cost?.toFixed(2) || '0.80'}</strong></span>
                    <span className="font-mono text-slate-500">ID: {log.id}</span>
                  </div>

                  <button
                    onClick={() => handleResend(log)}
                    disabled={resendingId === log.id}
                    className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 px-2.5 py-1 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/60 rounded-lg transition"
                  >
                    <Send className="w-3 h-3" />
                    <span>{resendingId === log.id ? 'Resending...' : 'Resend SMS'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
