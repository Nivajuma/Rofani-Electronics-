import React, { useMemo, useState, useEffect } from 'react';
import {
  X,
  RotateCcw,
  PackageCheck,
  AlertOctagon,
  Banknote,
  Wallet,
  CheckCircle2,
  QrCode,
  ArrowRight,
  Download,
} from 'lucide-react';
import {
  Customer,
  CustomerReturnItem,
  CustomerReturnRecord,
  Product,
  ReturnRefundMode,
  ReturnRestockCondition,
  Transaction,
  User,
} from '../../types';
import { formatKSh } from '../../utils/currency';
import { exportCustomerReturnPDF } from '../../utils/pdfGenerator';

interface CustomerReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  transactions: Transaction[];
  products: Product[];
  existingReturns: CustomerReturnRecord[];
  currentUser: User;
  initialTransactionId?: string;
  storeName?: string;
  storeKraPin?: string;
  onProcessReturn: (params: {
    customer: Customer;
    transaction: Transaction;
    items: CustomerReturnItem[];
    refundMode: ReturnRefundMode;
    cashRefundAmount: number;
    cashRefundChannel?: 'cash' | 'mpesa';
    cashRefundRef?: string;
    reason: string;
    notes?: string;
  }) => CustomerReturnRecord | void;
}

export const CustomerReturnModal: React.FC<CustomerReturnModalProps> = ({
  isOpen,
  onClose,
  customer,
  transactions,
  products,
  existingReturns,
  currentUser,
  initialTransactionId,
  storeName,
  storeKraPin,
  onProcessReturn,
}) => {
  const customerTransactions = useMemo(() => {
    if (!customer) return transactions.slice(0, 30);
    const matched = transactions.filter(
      (t) =>
        (t.customerId && t.customerId === customer.id) ||
        (t.customerName && t.customerName.toLowerCase() === customer.name.toLowerCase()) ||
        (customer.phone !== 'N/A' && t.customerPhone === customer.phone)
    );
    return matched.length > 0 ? matched : transactions.slice(0, 20);
  }, [customer, transactions]);

  const [selectedTxId, setSelectedTxId] = useState<string>(initialTransactionId || '');
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [restockConditions, setRestockConditions] = useState<Record<string, ReturnRestockCondition>>({});
  const [refundMode, setRefundMode] = useState<ReturnRefundMode>('cash');
  const [cashChannel, setCashChannel] = useState<'cash' | 'mpesa'>('cash');
  const [cashRefundInput, setCashRefundInput] = useState<string>('');
  const [cashRefundRef, setCashRefundRef] = useState<string>('');
  const [reason, setReason] = useState<string>('Customer changed mind / partial return');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [completedReturn, setCompletedReturn] = useState<CustomerReturnRecord | null>(null);

  const selectedTx = useMemo(
    () => customerTransactions.find((t) => t.id === selectedTxId) || customerTransactions[0] || null,
    [customerTransactions, selectedTxId]
  );

  // Track quantities already returned against selectedTx
  const alreadyReturnedByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    if (!selectedTx) return map;
    existingReturns
      .filter((r) => r.originalTransactionId === selectedTx.id)
      .forEach((ret) => {
        ret.items.forEach((it) => {
          map[it.productId] = (map[it.productId] || 0) + it.quantityReturned;
        });
      });
    return map;
  }, [existingReturns, selectedTx]);

  useEffect(() => {
    if (!isOpen) return;
    setCompletedReturn(null);
    setError('');
    setCashRefundRef('');
    setNotes('');
    const firstTx =
      customerTransactions.find((t) => t.id === initialTransactionId) || customerTransactions[0];
    setSelectedTxId(firstTx?.id || '');
  }, [isOpen, initialTransactionId, customerTransactions]);

  useEffect(() => {
    if (!selectedTx) return;
    const initialQty: Record<string, number> = {};
    const initialCond: Record<string, ReturnRestockCondition> = {};
    selectedTx.items.forEach((item) => {
      initialQty[item.product.id] = 0;
      initialCond[item.product.id] = 'resellable';
    });
    setReturnQuantities(initialQty);
    setRestockConditions(initialCond);
    setCashRefundInput('');
  }, [selectedTx?.id]);

  if (!isOpen || !customer) return null;

  const lineCalculations = (selectedTx?.items || []).map((item) => {
    const pid = item.product.id;
    const prevRet = alreadyReturnedByProduct[pid] || 0;
    const returnableMax = Math.max(0, item.quantity - prevRet);
    const qtyRet = Math.min(returnableMax, Math.max(0, returnQuantities[pid] || 0));
    const netUnitPrice = Math.max(0, item.unitPrice - (item.discount || 0));
    const refundSubtotal = Number((qtyRet * netUnitPrice).toFixed(2));
    const cond: ReturnRestockCondition = restockConditions[pid] || 'resellable';
    const liveProduct = products.find((p) => p.id === pid);
    const currentStock = liveProduct ? liveProduct.stockQuantity : item.product.stockQuantity || 0;
    const stockAfter = cond === 'resellable' ? currentStock + qtyRet : currentStock;

    return {
      item,
      pid,
      prevRet,
      returnableMax,
      qtyRet,
      netUnitPrice,
      refundSubtotal,
      cond,
      currentStock,
      stockAfter,
    };
  });

  const totalReturnValue = Number(
    lineCalculations.reduce((sum, row) => sum + row.refundSubtotal, 0).toFixed(2)
  );
  const restockedUnits = lineCalculations.reduce(
    (sum, row) => sum + (row.cond === 'resellable' ? row.qtyRet : 0),
    0
  );
  const damagedUnits = lineCalculations.reduce(
    (sum, row) => sum + (row.cond === 'damaged' ? row.qtyRet : 0),
    0
  );

  // Financial split calculation
  const customerDebt = customer.currentBalanceDue || 0;
  let cashPaidOut = 0;
  let debtOffset = 0;
  let storeCreditAdded = 0;

  if (refundMode === 'cash' || refundMode === 'mpesa') {
    cashPaidOut = totalReturnValue;
  } else if (refundMode === 'store_deposit') {
    storeCreditAdded = totalReturnValue;
  } else if (refundMode === 'debt_offset') {
    debtOffset = Math.min(customerDebt, totalReturnValue);
    storeCreditAdded = Math.max(0, totalReturnValue - debtOffset);
  } else if (refundMode === 'partial_cash_and_credit') {
    const parsedCash = Math.min(totalReturnValue, Math.max(0, parseFloat(cashRefundInput) || 0));
    cashPaidOut = parsedCash;
    const remaining = Math.max(0, totalReturnValue - parsedCash);
    debtOffset = Math.min(customerDebt, remaining);
    storeCreditAdded = Math.max(0, remaining - debtOffset);
  }

  const handleConfirmReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) {
      setError('Please select a sales receipt to process a return against.');
      return;
    }

    const activeItems: CustomerReturnItem[] = lineCalculations
      .filter((row) => row.qtyRet > 0)
      .map((row) => ({
        productId: row.pid,
        productName: row.item.product.name,
        sku: row.item.product.sku,
        unit: row.item.product.unit || 'pcs',
        quantitySold: row.item.quantity,
        quantityReturned: row.qtyRet,
        unitPrice: row.netUnitPrice,
        refundSubtotal: row.refundSubtotal,
        restockCondition: row.cond,
        addedBackToStock: row.cond === 'resellable',
        stockBeforeReturn: row.currentStock,
        stockAfterReturn: row.stockAfter,
      }));

    if (activeItems.length === 0) {
      setError('Select at least 1 item quantity to return.');
      return;
    }

    const created = onProcessReturn({
      customer,
      transaction: selectedTx,
      items: activeItems,
      refundMode,
      cashRefundAmount: cashPaidOut,
      cashRefundChannel: cashPaidOut > 0 ? (refundMode === 'mpesa' ? 'mpesa' : cashChannel) : undefined,
      cashRefundRef: cashRefundRef.trim() || undefined,
      reason: reason.trim() || 'Customer Goods Return',
      notes: notes.trim() || undefined,
    });

    if (created) {
      setCompletedReturn(created);
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[93vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                Customer Goods Return &amp; Stock Restoration
              </h3>
              <p className="text-xs text-slate-400">
                Partial qty or full return • Cash/M-Pesa refund or Store Credit • Auto-Restock control
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

        {completedReturn ? (
          <div className="p-6 space-y-5 overflow-y-auto">
            <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <h4 className="font-extrabold text-sm text-emerald-300">
                  Return {completedReturn.returnNumber} &amp; Credit Note {completedReturn.creditNoteNumber} Processed!
                </h4>
                <p className="text-slate-300">
                  <strong className="text-white">{completedReturn.restockedTotalUnits} unit(s)</strong> were verified resellable and added straight back into active sellable stock.
                  {completedReturn.damagedTotalUnits > 0 && (
                    <> <strong className="text-amber-300">{completedReturn.damagedTotalUnits} unit(s)</strong> were marked Damaged/Defective and excluded from sellable inventory.</>
                  )}
                </p>
                {completedReturn.isEtimsCreditNote && (
                  <p className="text-amber-300 font-mono text-[11px] flex items-center gap-1.5 pt-1">
                    <QrCode className="w-3.5 h-3.5" />
                    KRA eTIMS Credit Note Ref: {completedReturn.creditNoteCuin} (Links to {completedReturn.originalCuin})
                  </p>
                )}
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
              <div className="font-bold text-slate-300 uppercase text-[10px] tracking-wider">
                Stock Quantity Impact Breakdown
              </div>
              {completedReturn.items.map((it) => (
                <div
                  key={it.productId}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-800/80 last:border-b-0"
                >
                  <div>
                    <div className="font-bold text-white">{it.productName}</div>
                    <div className="text-[11px] text-slate-400">
                      Returned: {it.quantityReturned} {it.unit || 'pcs'} ({formatKSh(it.refundSubtotal)})
                    </div>
                  </div>
                  {it.addedBackToStock ? (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 font-mono font-bold text-[11px] flex items-center gap-1.5">
                      <PackageCheck className="w-3.5 h-3.5" />
                      Stock {it.stockBeforeReturn ?? '?'} <ArrowRight className="w-3 h-3" /> {it.stockAfterReturn ?? '?'} (+{it.quantityReturned})
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 font-bold text-[11px]">
                      Damaged Write-Off (0 Restocked)
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-2.5">
              <button
                type="button"
                onClick={() =>
                  exportCustomerReturnPDF(completedReturn, {
                    storeName,
                    storeKraPin,
                  })
                }
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Return &amp; Credit Note PDF</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirmReturn} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
            {/* Step 1: Select Receipt */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  1. Original Sales Receipt *
                </label>
                <select
                  value={selectedTx?.id || ''}
                  onChange={(e) => setSelectedTxId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-slate-100 outline-none"
                >
                  {customerTransactions.length === 0 && (
                    <option value="">No recorded sales receipts found</option>
                  )}
                  {customerTransactions.map((tx) => (
                    <option key={tx.id} value={tx.id}>
                      {tx.receiptNumber} • {new Date(tx.date).toLocaleDateString()} • {formatKSh(tx.grandTotal)} ({tx.paymentStatus})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Return Reason *
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Defective seal, wrong size, partial order cancel"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-slate-100 outline-none"
                />
              </div>
            </div>

            {selectedTx?.isEtimsRequested && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 flex items-center gap-2 text-[11px]">
                <QrCode className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Original receipt <strong>{selectedTx.receiptNumber}</strong> has eTIMS CUIN{' '}
                  <strong className="font-mono">{selectedTx.cuin}</strong>. Confirming this return will automatically generate a linked <strong>KRA eTIMS Credit Note Reference</strong>.
                </span>
              </div>
            )}

            {/* Step 2: Select Partial/Full Quantities & How Items Return to Stock */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-200 font-extrabold text-xs">
                  2. Items to Return &amp; Stock Restoration Rule (Partial or Full Qty)
                </label>
                <span className="text-[11px] text-slate-400">
                  Choose per item whether returned units return to active inventory
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs text-slate-300 min-w-[640px]">
                  <thead className="bg-slate-900/90 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Item &amp; Unit Price</th>
                      <th className="p-3 text-center">Sold / Returnable</th>
                      <th className="p-3 text-center">Return Qty</th>
                      <th className="p-3">How Item Goes Back to Stock</th>
                      <th className="p-3 text-right">Refund Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {lineCalculations.map((row) => (
                      <tr key={row.pid}>
                        <td className="p-3">
                          <div className="font-bold text-white">{row.item.product.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            @ {formatKSh(row.netUnitPrice)} • Current stock: {row.currentStock} {row.item.product.unit || 'pcs'}
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className="text-slate-200 font-bold">{row.item.quantity}</span>
                          <span className="text-slate-500 block text-[10px]">
                            Max left: {row.returnableMax}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={row.returnableMax}
                              value={row.qtyRet}
                              onChange={(e) => {
                                const val = Math.min(
                                  row.returnableMax,
                                  Math.max(0, parseInt(e.target.value || '0', 10) || 0)
                                );
                                setReturnQuantities((prev) => ({ ...prev, [row.pid]: val }));
                                setError('');
                              }}
                              className="w-16 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg px-2 py-1 text-center font-mono font-bold text-amber-300 outline-none"
                            />
                            {row.returnableMax > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReturnQuantities((prev) => ({ ...prev, [row.pid]: row.returnableMax }));
                                  setError('');
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 rounded-lg cursor-pointer"
                              >
                                All
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            <select
                              value={row.cond}
                              onChange={(e) =>
                                setRestockConditions((prev) => ({
                                  ...prev,
                                  [row.pid]: e.target.value as ReturnRestockCondition,
                                }))
                              }
                              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold border outline-none ${
                                row.cond === 'resellable'
                                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                                  : 'bg-rose-950/60 border-rose-800 text-rose-300'
                              }`}
                            >
                              <option value="resellable">
                                ✓ Resellable — Add Back to Active Stock
                              </option>
                              <option value="damaged">
                                ✕ Damaged / Defective — Quarantine (No Restock)
                              </option>
                            </select>
                            {row.qtyRet > 0 && (
                              <span className="text-[10px] font-mono text-slate-400">
                                {row.cond === 'resellable'
                                  ? `Stock becomes ${row.currentStock} + ${row.qtyRet} = ${row.stockAfter}`
                                  : `Stock stays ${row.currentStock} (${row.qtyRet} written off)`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-extrabold text-amber-300">
                          {formatKSh(row.refundSubtotal, { showDecimals: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Step 3: Refund Settlement Mode */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="font-extrabold text-slate-200">
                3. How Should Customer Refund of{' '}
                <span className="text-amber-400 font-mono">
                  {formatKSh(totalReturnValue, { showDecimals: true })}
                </span>{' '}
                Be Settled?
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                {[
                  { id: 'cash', label: 'Cash Refund', icon: Banknote },
                  { id: 'mpesa', label: 'M-Pesa Refund', icon: Banknote },
                  { id: 'store_deposit', label: 'Store Deposit Credit', icon: Wallet },
                  { id: 'debt_offset', label: 'Reduce Customer Debt', icon: CheckCircle2 },
                  { id: 'partial_cash_and_credit', label: 'Partial Cash + Credit', icon: RotateCcw },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = refundMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setRefundMode(opt.id as ReturnRefundMode)}
                      className={`p-2.5 rounded-xl border font-bold text-left flex flex-col gap-1 transition cursor-pointer ${
                        active
                          ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {refundMode === 'partial_cash_and_credit' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Cash / M-Pesa Portion Paid Now (KSh)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={totalReturnValue}
                      value={cashRefundInput}
                      onChange={(e) => setCashRefundInput(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 font-mono font-bold text-emerald-300 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Payout Channel</label>
                    <select
                      value={cashChannel}
                      onChange={(e) => setCashChannel(e.target.value as 'cash' | 'mpesa')}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none"
                    >
                      <option value="cash">Cash Register Payout</option>
                      <option value="mpesa">M-Pesa Payout</option>
                    </select>
                  </div>
                </div>
              )}

              {(refundMode === 'mpesa' || (refundMode === 'partial_cash_and_credit' && cashChannel === 'mpesa')) && (
                <div>
                  <label className="block text-slate-400 mb-1">M-Pesa Reversal / Payout Reference</label>
                  <input
                    type="text"
                    value={cashRefundRef}
                    onChange={(e) => setCashRefundRef(e.target.value.toUpperCase())}
                    placeholder="e.g. UJK921REF"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-100 outline-none"
                  />
                </div>
              )}

              {/* Live Impact Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">Added Back to Stock</span>
                  <strong className="text-emerald-400 font-mono text-sm">+{restockedUnits} units</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">Cash/M-Pesa Paid Out</span>
                  <strong className="text-amber-300 font-mono text-sm">{formatKSh(cashPaidOut)}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">Debt Reduced</span>
                  <strong className="text-sky-400 font-mono text-sm">{formatKSh(debtOffset)}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">Store Deposit Issued</span>
                  <strong className="text-emerald-300 font-mono text-sm">{formatKSh(storeCreditAdded)}</strong>
                </div>
              </div>
              {damagedUnits > 0 && (
                <div className="text-[11px] text-rose-300 flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {damagedUnits} unit(s) marked Damaged/Defective will NOT increase sellable stock and will be logged in the return audit trail.
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Additional Inspection Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Packaging intact & sealed — approved for shelf restock"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-500">
                Processed by: <strong className="text-slate-300">{currentUser.name}</strong>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-600/25 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Return &amp; Update Stock</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
