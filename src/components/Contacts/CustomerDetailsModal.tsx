import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  CreditCard,
  Calendar,
  ShoppingBag,
  Clock,
  Download,
  MessageCircle,
  ExternalLink,
  Receipt,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Users,
  Star,
  Wallet,
  RotateCcw,
  MessageSquareWarning,
  PackageCheck,
} from 'lucide-react';
import {
  Customer,
  CustomerComplaint,
  CustomerDepositRecord,
  CustomerReturnRecord,
  Transaction,
} from '../../types';
import {
  exportCustomerAccountStatementPDF,
  exportCustomerReturnPDF,
  exportReceiptPDF,
} from '../../utils/pdfGenerator';
import { formatKSh } from '../../utils/currency';

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  transactions: Transaction[];
  deposits?: CustomerDepositRecord[];
  returns?: CustomerReturnRecord[];
  complaints?: CustomerComplaint[];
  onOpenEdit: (customer: Customer) => void;
  onOpenRepayment: (customer: Customer) => void;
  onOpenDeposit?: (customer: Customer, mode?: 'deposit' | 'partial_payment', txId?: string) => void;
  onOpenReturn?: (customer: Customer, txId?: string) => void;
  onOpenComplaint?: (customer: Customer, existing?: CustomerComplaint) => void;
  onOpenContactsList?: (customer: Customer) => void;
}

export const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  isOpen,
  onClose,
  customer,
  transactions,
  deposits = [],
  returns = [],
  complaints = [],
  onOpenEdit,
  onOpenRepayment,
  onOpenDeposit,
  onOpenReturn,
  onOpenComplaint,
  onOpenContactsList,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'purchases' | 'deposits' | 'returns' | 'complaints' | 'profile'
  >('purchases');

  if (!isOpen || !customer) return null;

  // Filter transactions for this customer
  const customerTxs = transactions.filter(
    (t) =>
      (t.customerId && t.customerId === customer.id) ||
      (t.customerName && t.customerName.toLowerCase() === customer.name.toLowerCase()) ||
      (customer.phone !== 'N/A' && t.customerPhone === customer.phone)
  );

  const totalSpent = customerTxs.reduce((sum, tx) => sum + tx.grandTotal, 0) || customer.totalPurchases;
  const balanceDue = customer.currentBalanceDue || 0;
  const depositBalance = customer.depositBalance || 0;
  const creditLimit = customer.creditLimit || 20000;
  const creditUtilization = creditLimit > 0 ? Math.min(100, Math.round((balanceDue / creditLimit) * 100)) : 0;

  const customerDeposits = deposits.filter((d) => d.customerId === customer.id);
  const customerReturns = returns.filter((r) => r.customerId === customer.id);
  const customerComplaints = complaints.filter((c) => c.customerId === customer.id);
  const openComplaintsCount = customerComplaints.filter((c) => c.status !== 'Resolved').length;

  // Send WhatsApp Statement Reminder
  const handleSendWhatsAppReminder = () => {
    if (!customer.phone || customer.phone === 'N/A') {
      alert('This customer does not have a valid phone number recorded.');
      return;
    }
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Hello ${customer.name},\n\nThis is a friendly statement from *Rofani POS*.\n\n` +
      `Your current outstanding balance is: *${formatKSh(balanceDue, { showDecimals: true })}*.\n` +
      `Total Lifetime Purchases: ${formatKSh(totalSpent)}.\n\n` +
      `You may settle via:\n• *M-Pesa Buy Goods Till:* 789012\n• *Paybill:* 247247 (Acc: 0180293)\n\n` +
      `Thank you for being our valued customer!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleDownloadStatement = () => {
    exportCustomerAccountStatementPDF(customer, customerTxs);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-6 bg-slate-950/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-sky-600/30">
              {customer.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-xl text-slate-100">{customer.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {customer.customerType || 'Individual'}
                </span>
                {balanceDue > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Credit Due: {formatKSh(balanceDue)}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Account Clear
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3 font-mono">
                {customer.phone && customer.phone !== 'N/A' && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" /> {customer.phone}
                  </span>
                )}
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-500" /> {customer.email}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenDeposit && (
              <button
                onClick={() => {
                  onClose();
                  onOpenDeposit(customer, balanceDue > 0 ? 'partial_payment' : 'deposit');
                }}
                className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-sky-600/20 cursor-pointer"
              >
                <Wallet className="w-4 h-4" /> {balanceDue > 0 ? 'Partial Pay / Deposit' : '+ Deposit'}
              </button>
            )}

            {balanceDue > 0 && !onOpenDeposit && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRepayment(customer);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <DollarSign className="w-4 h-4" /> Collect Debt
              </button>
            )}

            {onOpenReturn && customerTxs.length > 0 && (
              <button
                onClick={() => {
                  onClose();
                  onOpenReturn(customer);
                }}
                className="px-3 py-2 bg-amber-600/20 hover:bg-amber-600/35 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Process Return
              </button>
            )}

            {onOpenComplaint && (
              <button
                onClick={() => {
                  onClose();
                  onOpenComplaint(customer);
                }}
                className="px-3 py-2 bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-700/60 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquareWarning className="w-4 h-4" /> Log Complaint
              </button>
            )}

            {customer.phone && customer.phone !== 'N/A' && (
              <button
                onClick={handleSendWhatsAppReminder}
                title="Send WhatsApp Statement / Balance Reminder"
                className="px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/80 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" /> WhatsApp
              </button>
            )}

            <button
              onClick={handleDownloadStatement}
              title="Download Statement of Account PDF"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-sky-400" /> Statement PDF
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenEdit(customer);
              }}
              title="Edit Profile"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Financial Metrics Cards */}
        <div className="p-5 bg-slate-900/60 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Total Sales
            </span>
            <div className="text-sm font-extrabold text-slate-100 font-mono mt-1">
              {formatKSh(totalSpent, { showDecimals: true })}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">{customerTxs.length} sales</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Deposit Credit
            </span>
            <div className="text-sm font-extrabold text-emerald-400 font-mono mt-1">
              {formatKSh(depositBalance, { showDecimals: true })}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Advance wallet</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Balance Due
            </span>
            <div className={`text-sm font-extrabold font-mono mt-1 ${balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formatKSh(balanceDue, { showDecimals: true })}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {creditUtilization}% of {formatKSh(creditLimit)} cap
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Goods Returns
            </span>
            <div className="text-sm font-bold text-amber-300 font-mono mt-1">
              {customerReturns.length} returns
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              +{customerReturns.reduce((s, r) => s + r.restockedTotalUnits, 0)} restocked
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Complaints
            </span>
            <div className={`text-sm font-bold font-mono mt-1 ${openComplaintsCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {openComplaintsCount} Open
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">{customerComplaints.length} total logged</span>
          </div>
        </div>

        {/* Sub-Tab Switcher */}
        <div className="px-6 pt-3 bg-slate-900 border-b border-slate-800 flex items-center gap-4 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('purchases')}
            className={`pb-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'purchases'
                ? 'border-sky-500 text-sky-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Sales &amp; Partial Pay ({customerTxs.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('deposits')}
            className={`pb-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'deposits'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Deposits &amp; Ledger ({customerDeposits.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('returns')}
            className={`pb-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'returns'
                ? 'border-amber-500 text-amber-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Returns &amp; Restock ({customerReturns.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('complaints')}
            className={`pb-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'complaints'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquareWarning className="w-3.5 h-3.5" />
            <span>Complaints ({customerComplaints.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('profile')}
            className={`pb-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'profile'
                ? 'border-sky-500 text-sky-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile &amp; Tax PIN</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {activeSubTab === 'purchases' && (
            <div>
              {customerTxs.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/80">
                  <ShoppingBag className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-300">No itemized invoices yet for this customer profile</p>
                  <p className="text-xs text-slate-500 mt-1">
                    When you select this customer in the POS during checkout, past transactions will automatically link here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">Receipt #</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Items Purchased</th>
                        <th className="p-3 text-right">Grand Total</th>
                        <th className="p-3 text-right">Paid</th>
                        <th className="p-3 text-right">Balance</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {customerTxs.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/50 transition">
                          <td className="p-3 font-bold text-sky-400">{tx.receiptNumber}</td>
                          <td className="p-3 text-slate-400">
                            {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-3 font-sans text-xs text-slate-200 max-w-xs truncate">
                            {tx.items.map((i) => `${i.product.name} (x${i.quantity})`).join(', ')}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-100">
                            {formatKSh(tx.grandTotal, { showDecimals: true })}
                          </td>
                          <td className="p-3 text-right text-emerald-400">
                            {formatKSh(tx.amountPaid, { showDecimals: true })}
                          </td>
                          <td className={`p-3 text-right font-bold ${tx.balanceDue > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                            {formatKSh(tx.balanceDue, { showDecimals: true })}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                tx.paymentStatus === 'Paid'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : tx.paymentStatus === 'Partial'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {tx.paymentStatus}
                            </span>
                          </td>
                          <td className="p-3 text-center font-sans">
                            <div className="flex items-center justify-center gap-1">
                              {tx.balanceDue > 0 && onOpenDeposit && (
                                <button
                                  onClick={() => {
                                    onClose();
                                    onOpenDeposit(customer, 'partial_payment', tx.id);
                                  }}
                                  title="Record Partial / Full Payment on this Invoice"
                                  className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-[10px] font-bold cursor-pointer"
                                >
                                  Pay
                                </button>
                              )}
                              {onOpenReturn && tx.returnStatus !== 'Full Return' && (
                                <button
                                  onClick={() => {
                                    onClose();
                                    onOpenReturn(customer, tx.id);
                                  }}
                                  title="Process Goods Return & Restock"
                                  className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg text-[10px] font-bold cursor-pointer"
                                >
                                  Return
                                </button>
                              )}
                              <button
                                onClick={() => exportReceiptPDF(tx)}
                                title="Download Thermal Receipt PDF"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                              >
                                <Receipt className="w-3.5 h-3.5 text-sky-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'deposits' && (
            <div className="space-y-3 text-xs">
              {customerDeposits.length === 0 ? (
                <div className="p-10 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                  <Wallet className="w-9 h-9 mx-auto text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-300">No deposits or partial payments logged yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customerDeposits.map((dep) => (
                    <div
                      key={dep.id}
                      className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sky-400">{dep.receiptRef}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 uppercase">
                            {dep.type.replace(/_/g, ' ')}
                          </span>
                          {dep.linkedReceiptNumber && (
                            <span className="text-[11px] font-mono text-amber-300">
                              → {dep.linkedReceiptNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {new Date(dep.date).toLocaleString()} • {dep.paymentMethod.toUpperCase()}
                          {dep.referenceNo ? ` (${dep.referenceNo})` : ''} • By {dep.recordedBy}
                        </div>
                        {dep.notes && <div className="text-[11px] text-slate-300 mt-0.5">{dep.notes}</div>}
                      </div>
                      <div className="text-right font-mono font-extrabold text-sm text-emerald-400">
                        {formatKSh(dep.amount, { showDecimals: true })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'returns' && (
            <div className="space-y-3 text-xs">
              {customerReturns.length === 0 ? (
                <div className="p-10 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                  <RotateCcw className="w-9 h-9 mx-auto text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-300">No goods returns recorded for this customer</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {customerReturns.map((ret) => (
                    <div key={ret.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-300">{ret.returnNumber}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-200 font-mono">
                            CN: {ret.creditNoteNumber}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Orig: {ret.originalReceiptNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-amber-300">
                            {formatKSh(ret.totalRefundAmount, { showDecimals: true })}
                          </span>
                          <button
                            type="button"
                            onClick={() => exportCustomerReturnPDF(ret)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            Credit Note PDF
                          </button>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(ret.date).toLocaleString()} • Reason: <strong className="text-slate-200">{ret.reason}</strong>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {ret.items.map((it) => (
                          <span
                            key={it.productId}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold border flex items-center gap-1 ${
                              it.addedBackToStock
                                ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                                : 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                            }`}
                          >
                            <PackageCheck className="w-3 h-3" />
                            {it.productName} x{it.quantityReturned}:{' '}
                            {it.addedBackToStock ? 'Added Back to Stock' : 'Damaged Write-Off'}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'complaints' && (
            <div className="space-y-3 text-xs">
              {customerComplaints.length === 0 ? (
                <div className="p-10 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                  <MessageSquareWarning className="w-9 h-9 mx-auto text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-300">No complaints logged for this customer</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {customerComplaints.map((cmp) => (
                    <div key={cmp.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-rose-400">{cmp.complaintNumber}</span>
                          <span className="font-bold text-white">{cmp.subject}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cmp.status === 'Resolved'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {cmp.status}
                          </span>
                          {onOpenComplaint && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenComplaint(customer, cmp);
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              Update
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-300 text-[11px]">{cmp.description}</p>
                      {cmp.resolutionNotes && (
                        <p className="text-emerald-300 text-[11px] bg-emerald-950/40 p-2 rounded-xl border border-emerald-800/40">
                          Resolution: {cmp.resolutionNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] text-sky-400">
                      Primary Contact & Location
                    </h4>
                    {onOpenContactsList && (
                      <button
                        type="button"
                        onClick={() => onOpenContactsList(customer)}
                        className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold underline cursor-pointer"
                      >
                        Manage Contacts
                      </button>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Full Name</span>
                    <span className="text-slate-200 font-semibold">{customer.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Primary Phone</span>
                    <span className="text-slate-200 font-mono font-bold text-emerald-400">{customer.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Email Address</span>
                    <span className="text-slate-200">{customer.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Physical Address / Delivery Area</span>
                    <span className="text-slate-200">{customer.address || 'N/A'}</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] text-sky-400">
                    Tax & Account Terms
                  </h4>
                  <div>
                    <span className="text-slate-500 block text-[10px]">KRA Tax PIN</span>
                    <span className="text-slate-200 font-mono font-bold">{customer.kraPin || 'Not Specified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Customer Classification</span>
                    <span className="text-slate-200 font-semibold">{customer.customerType || 'Individual'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Credit Facility Ceiling</span>
                    <span className="text-slate-200 font-mono">
                      {customer.creditLimit ? `KSh ${customer.creditLimit.toLocaleString()}` : 'Standard (KSh 20,000)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Internal Notes</span>
                    <span className="text-slate-300 italic">{customer.notes || 'No special notes recorded.'}</span>
                  </div>
                </div>
              </div>

              {/* Associated Contacts List */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-400" />
                    <h4 className="font-bold text-slate-200 text-xs">
                      Customer Contacts & Phone Numbers (contactsList)
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {customer.contactsList?.length || (customer.phone && customer.phone !== 'N/A' ? 1 : 0)}
                    </span>
                  </div>
                  {onOpenContactsList && (
                    <button
                      type="button"
                      onClick={() => onOpenContactsList(customer)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit & Manage Contacts</span>
                    </button>
                  )}
                </div>

                {customer.contactsList && customer.contactsList.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {customer.contactsList.map((contact) => {
                      const cleanPhone = contact.phone.replace(/[^0-9]/g, '');
                      return (
                        <div
                          key={contact.id}
                          className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-2.5 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {contact.isPrimary && (
                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                              )}
                              <span className="font-bold text-slate-200 truncate">{contact.name}</span>
                              {contact.role && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-950 text-slate-400 border border-slate-800">
                                  {contact.role}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400 mt-1">
                              <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span>{contact.phone}</span>
                            </div>
                            {contact.email && (
                              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                {contact.email}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Chat on WhatsApp"
                              className="p-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 rounded-lg transition"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`tel:${cleanPhone}`}
                              title="Call phone"
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/60 text-xs">
                    <p>Primary Phone: <strong className="text-emerald-400 font-mono">{customer.phone || 'N/A'}</strong></p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      No additional contacts saved yet. Tap "Edit & Manage Contacts" to add alternative numbers or branch contacts.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
