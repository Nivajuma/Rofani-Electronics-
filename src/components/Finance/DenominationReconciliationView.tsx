import React, { useState } from 'react';
import {
  Coins,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Printer,
  FileCheck,
  Building,
  Calendar,
  Clock,
  User as UserIcon,
  ShieldCheck,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { User } from '../../types';

interface DenominationReconciliationViewProps {
  systemCashBalance: number;
  currentUser: User;
}

interface Denomination {
  label: string;
  value: number;
  type: 'note' | 'coin';
}

const DENOMINATIONS: Denomination[] = [
  { label: 'KSh 1,000 Note', value: 1000, type: 'note' },
  { label: 'KSh 500 Note', value: 500, type: 'note' },
  { label: 'KSh 200 Note', value: 200, type: 'note' },
  { label: 'KSh 100 Note', value: 100, type: 'note' },
  { label: 'KSh 50 Note', value: 50, type: 'note' },
  { label: 'KSh 40 Coin', value: 40, type: 'coin' },
  { label: 'KSh 20 Coin', value: 20, type: 'coin' },
  { label: 'KSh 10 Coin', value: 10, type: 'coin' },
  { label: 'KSh 5 Coin', value: 5, type: 'coin' },
  { label: 'KSh 1 Coin', value: 1, type: 'coin' },
];

export const DenominationReconciliationView: React.FC<DenominationReconciliationViewProps> = ({
  systemCashBalance,
  currentUser,
}) => {
  const [counts, setCounts] = useState<{ [key: number]: number }>({
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    40: 0,
    20: 0,
    10: 0,
    5: 0,
    1: 0,
  });

  const [registerLocation, setRegisterLocation] = useState('Main CBD Cash Vault & Drawer');
  const [supervisorName, setSupervisorName] = useState('Sarah Miller (Manager)');
  const [notes, setNotes] = useState('');
  const [showSlipModal, setShowSlipModal] = useState(false);

  // Handle count change
  const handleCountChange = (denomValue: number, quantity: string) => {
    const qty = parseInt(quantity, 10);
    setCounts((prev) => ({
      ...prev,
      [denomValue]: isNaN(qty) || qty < 0 ? 0 : qty,
    }));
  };

  // Reset counts
  const handleReset = () => {
    setCounts({
      1000: 0,
      500: 0,
      200: 0,
      100: 0,
      50: 0,
      40: 0,
      20: 0,
      10: 0,
      5: 0,
      1: 0,
    });
  };

  // Calculate Subtotals & Totals
  const notesTotal = DENOMINATIONS
    .filter((d) => d.type === 'note')
    .reduce((sum, d) => sum + (counts[d.value] || 0) * d.value, 0);

  const coinsTotal = DENOMINATIONS
    .filter((d) => d.type === 'coin')
    .reduce((sum, d) => sum + (counts[d.value] || 0) * d.value, 0);

  const physicalCashTotal = notesTotal + coinsTotal;
  const variance = physicalCashTotal - systemCashBalance;
  const isBalanced = Math.abs(variance) < 0.01;
  const isOverage = variance > 0.01;
  const isShortage = variance < -0.01;

  // Fill sample count matching system balance
  const handleAutoFillSample = () => {
    let remaining = Math.max(0, systemCashBalance);
    const newCounts: { [key: number]: number } = {};

    [1000, 500, 200, 100, 50, 40, 20, 10, 5, 1].forEach((val) => {
      const count = Math.floor(remaining / val);
      newCounts[val] = count;
      remaining -= count * val;
    });

    setCounts(newCounts);
  };

  return (
    <div className="space-y-6">
      {/* HEADER CARD */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider mb-1">
            <Coins className="w-4 h-4" /> Real-Time Till & Vault Reconciliation
          </div>
          <h3 className="text-2xl font-black text-slate-100">Kenyan Shillings Physical Denomination Counter</h3>
          <p className="text-xs text-slate-400 mt-1">
            Perform physical cash audits by counting notes & coins to verify physical drawer funds against System Vault Balance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoFillSample}
            className="bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1.5"
            title="Auto-fill physical counts matching current system cash"
          >
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>Match System Balance</span>
          </button>

          <button
            onClick={handleReset}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4 text-rose-400" />
            <span>Reset Counts</span>
          </button>

          <button
            onClick={() => setShowSlipModal(true)}
            disabled={physicalCashTotal <= 0}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/25"
          >
            <FileCheck className="w-4 h-4" />
            <span>Generate Audit Slip</span>
          </button>
        </div>
      </div>

      {/* THREE COMPARISON EXECUTIVE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* System Ledger Cash */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>System Ledger Vault Balance</span>
            <div className="p-2 bg-sky-950 border border-sky-800 text-sky-400 rounded-xl">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-100 font-mono tracking-tight">
            KSh {systemCashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400">
            Recorded Inflows minus Outflows
          </div>
        </div>

        {/* Physical Cash Counted */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Physical Cash Counted</span>
            <div className="p-2 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-xl">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
            KSh {physicalCashTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400">
            Notes: KSh {notesTotal.toLocaleString()} | Coins: KSh {coinsTotal.toLocaleString()}
          </div>
        </div>

        {/* Variance Status */}
        <div className={`p-5 rounded-3xl space-y-2 shadow-lg border ${
          isBalanced
            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
            : isOverage
            ? 'bg-sky-950/40 border-sky-800 text-sky-300'
            : 'bg-rose-950/40 border-rose-800 text-rose-300'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>Reconciliation Variance</span>
            <div className="p-2 bg-slate-950 rounded-xl">
              {isBalanced ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className={`w-4 h-4 ${isOverage ? 'text-sky-400' : 'text-rose-400'}`} />
              )}
            </div>
          </div>
          <div className="text-3xl font-black font-mono tracking-tight">
            {variance > 0 ? '+' : ''}KSh {variance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-bold">
            {isBalanced
              ? '✅ Perfect Match - Cash Drawer Reconciled'
              : isOverage
              ? '🟢 Cash Overage / Surplus in Drawer'
              : '🔴 Cash Shortage / Deficit Detected'}
          </div>
        </div>
      </div>

      {/* DENOMINATIONS COUNTING GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NOTES SECTION */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
              <span>Banknotes (Bank of Kenya Notes)</span>
            </h4>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-lg">
              Notes Total: KSh {notesTotal.toLocaleString()}
            </span>
          </div>

          <div className="space-y-3">
            {DENOMINATIONS.filter((d) => d.type === 'note').map((denom) => {
              const qty = counts[denom.value] || 0;
              const subtotal = qty * denom.value;

              return (
                <div
                  key={denom.value}
                  className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center font-mono font-extrabold text-xs text-slate-200 shadow-inner">
                      {denom.value}
                    </div>
                    <div>
                      <span className="font-bold text-slate-200 text-xs block">{denom.label}</span>
                      <span className="text-[10px] text-slate-400 font-mono">x {denom.value} KSh</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-24">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={qty === 0 ? '' : qty}
                        onChange={(e) => handleCountChange(denom.value, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-center text-slate-100 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="w-28 text-right font-mono font-bold text-xs text-slate-200">
                      KSh {subtotal.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COINS SECTION */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
              <span>Coins (Kenyan Shilling Coins)</span>
            </h4>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2.5 py-1 rounded-lg">
              Coins Total: KSh {coinsTotal.toLocaleString()}
            </span>
          </div>

          <div className="space-y-3">
            {DENOMINATIONS.filter((d) => d.type === 'coin').map((denom) => {
              const qty = counts[denom.value] || 0;
              const subtotal = qty * denom.value;

              return (
                <div
                  key={denom.value}
                  className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-mono font-extrabold text-xs text-amber-400 shadow-inner">
                      {denom.value}/=
                    </div>
                    <div>
                      <span className="font-bold text-slate-200 text-xs block">{denom.label}</span>
                      <span className="text-[10px] text-slate-400 font-mono">x {denom.value} KSh</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-24">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={qty === 0 ? '' : qty}
                        onChange={(e) => handleCountChange(denom.value, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-center text-slate-100 font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="w-28 text-right font-mono font-bold text-xs text-slate-200">
                      KSh {subtotal.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: PRINTABLE EOD RECONCILIATION SLIP */}
      {/* ========================================================= */}
      {showSlipModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                <FileCheck className="w-4 h-4" /> Official Cash Count & Reconciliation Audit Slip
              </div>
              <button
                onClick={() => setShowSlipModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* SLIP CONTENT */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 font-mono text-xs space-y-4 text-slate-300">
              <div className="text-center border-b border-slate-800 pb-3 space-y-1">
                <h4 className="text-base font-black text-slate-100 tracking-wider">ROFANI ELECTRONICS & BOUTIQUE</h4>
                <p className="text-[11px] text-slate-400 font-sans font-bold">END-OF-DAY TILL & VAULT AUDIT CERTIFICATE</p>
                <p className="text-[10px] text-slate-500">Date: {new Date().toLocaleString()}</p>
              </div>

              <div className="space-y-1.5 font-sans">
                <div className="flex justify-between">
                  <span className="text-slate-400">Vault Location:</span>
                  <span className="font-bold text-slate-200">{registerLocation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Audited / Counted By:</span>
                  <span className="font-bold text-slate-200">{currentUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Supervisor / Verified By:</span>
                  <span className="font-bold text-slate-200">{supervisorName}</span>
                </div>
              </div>

              {/* Denomination Breakdown */}
              <div className="pt-2 border-t border-slate-800 space-y-1">
                <div className="font-bold text-[10px] uppercase text-slate-400 pb-1">Denomination Breakdown:</div>
                {DENOMINATIONS.filter((d) => (counts[d.value] || 0) > 0).map((d) => (
                  <div key={d.value} className="flex justify-between text-[11px]">
                    <span>{d.label} × {counts[d.value]}</span>
                    <span className="text-slate-100 font-bold">KSh {((counts[d.value] || 0) * d.value).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Financial Totals */}
              <div className="pt-3 border-t-2 border-slate-800 space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Total Physical Cash Count:</span>
                  <strong className="text-emerald-400 font-bold text-sm">KSh {physicalCashTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>System Expected Balance:</span>
                  <span className="text-slate-200 font-bold">KSh {systemCashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between text-slate-200 pt-1 border-t border-slate-850">
                  <span>Variance (Shortage / Overage):</span>
                  <strong className={`font-black text-sm ${isBalanced ? 'text-emerald-400' : isOverage ? 'text-sky-400' : 'text-rose-400'}`}>
                    {variance > 0 ? '+' : ''}KSh {variance.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({isBalanced ? 'BALANCED' : isOverage ? 'OVERAGE' : 'SHORTAGE'})
                  </strong>
                </div>
              </div>

              {/* Signature Lines */}
              <div className="grid grid-cols-2 gap-4 pt-6 text-[10px] text-slate-400 font-sans border-t border-slate-800">
                <div className="space-y-4">
                  <div className="border-b border-slate-700 h-6"></div>
                  <span>Cashier / Auditor Signature</span>
                </div>
                <div className="space-y-4">
                  <div className="border-b border-slate-700 h-6"></div>
                  <span>Manager / Supervisor Stamp</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Audit Slip
              </button>
              <button
                onClick={() => setShowSlipModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
