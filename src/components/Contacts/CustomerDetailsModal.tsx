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
  Send
} from 'lucide-react';
import { Customer, Transaction } from '../../types';
import { exportCustomerAccountStatementPDF, exportReceiptPDF } from '../../utils/pdfGenerator';

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  transactions: Transaction[];
  onOpenEdit: (customer: Customer) => void;
  onOpenRepayment: (customer: Customer) => void;
}

export const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  isOpen,
  onClose,
  customer,
  transactions,
  onOpenEdit,
  onOpenRepayment,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'purchases' | 'profile'>('purchases');
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<Transaction | null>(null);

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
  const creditLimit = customer.creditLimit || 20000;
  const creditUtilization = creditLimit > 0 ? Math.min(100, Math.round((balanceDue / creditLimit) * 100)) : 0;

  // Send WhatsApp Statement Reminder
  const handleSendWhatsAppReminder = () => {
    if (!customer.phone || customer.phone === 'N/A') {
      alert('This customer does not have a valid phone number recorded.');
      return;
    }
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Hello ${customer.name},\n\nThis is a friendly statement from *ROFANI Electronics & Boutique*.\n\n` +
      `Your current outstanding balance is: *KSh ${balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}*.\n` +
      `Total Lifetime Purchases: KSh ${totalSpent.toLocaleString()}.\n\n` +
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
                    <AlertTriangle className="w-3 h-3" /> Credit Due: KSh {balanceDue.toLocaleString()}
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
            {balanceDue > 0 && (
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
        <div className="p-6 bg-slate-900/60 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Total Purchases
            </span>
            <div className="text-base font-extrabold text-slate-100 font-mono mt-1">
              KSh {totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">{customerTxs.length} recorded sales</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Balance Due (Debt)
            </span>
            <div className={`text-base font-extrabold font-mono mt-1 ${balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              KSh {balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {balanceDue > 0 ? 'Payment pending' : 'Zero outstanding'}
            </span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Credit Limit Used
            </span>
            <div className="text-base font-bold text-slate-200 font-mono mt-1 flex items-center justify-between">
              <span>{creditUtilization}%</span>
              <span className="text-[10px] text-slate-400 font-normal">Cap: KSh {creditLimit.toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className={`h-full rounded-full ${
                  creditUtilization > 80 ? 'bg-rose-500' : creditUtilization > 50 ? 'bg-amber-500' : 'bg-sky-500'
                }`}
                style={{ width: `${creditUtilization}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Average Order Value
            </span>
            <div className="text-base font-bold text-sky-400 font-mono mt-1">
              KSh {customerTxs.length > 0 ? Math.round(totalSpent / customerTxs.length).toLocaleString() : totalSpent.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Per transaction</span>
          </div>
        </div>

        {/* Sub-Tab Switcher */}
        <div className="px-6 pt-4 bg-slate-900 border-b border-slate-800 flex items-center gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('purchases')}
            className={`pb-3 border-b-2 transition flex items-center gap-2 ${
              activeSubTab === 'purchases'
                ? 'border-sky-500 text-sky-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Transaction & Invoice History ({customerTxs.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('profile')}
            className={`pb-3 border-b-2 transition flex items-center gap-2 ${
              activeSubTab === 'profile'
                ? 'border-sky-500 text-sky-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Customer Profile & Tax Info</span>
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
                            KSh {tx.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right text-emerald-400">
                            KSh {tx.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`p-3 text-right font-bold ${tx.balanceDue > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                            KSh {tx.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                            <button
                              onClick={() => exportReceiptPDF(tx)}
                              title="Download Thermal Receipt PDF"
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                            >
                              <Receipt className="w-3.5 h-3.5 text-sky-400" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'profile' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] text-sky-400">
                  Contact & Location
                </h4>
                <div>
                  <span className="text-slate-500 block text-[10px]">Full Name</span>
                  <span className="text-slate-200 font-semibold">{customer.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Phone Number</span>
                  <span className="text-slate-200 font-mono">{customer.phone || 'N/A'}</span>
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
          )}
        </div>
      </div>
    </div>
  );
};
