import React from 'react';
import { Transaction } from '../../types';
import { exportReceiptPDF } from '../../utils/pdfGenerator';
import { X, Printer, Download, Share2, MessageSquare, CheckCircle2 } from 'lucide-react';

interface ReceiptModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, onClose }) => {
  // Format receipt message string for WhatsApp and SMS sharing
  const formatReceiptText = () => {
    let msg = `*RECEIPT #${transaction.receiptNumber}*\n`;
    msg += `Store: ROFANI ELECTRONICS AND BOUTIQUE\n`;
    msg += `Date: ${new Date(transaction.date).toLocaleDateString()}\n\n`;
    msg += `*Items Purchased:*\n`;
    transaction.items.forEach((it) => {
      msg += `• ${it.product.name} x${it.quantity} - KSh ${it.total.toLocaleString()}\n`;
    });
    msg += `\n*Total:* KSh ${transaction.grandTotal.toLocaleString()}\n`;
    msg += `(Incl. KRA TOT 1.5%: KSh ${(transaction.grandTotal * 0.015).toLocaleString()})\n`;
    msg += `Paid: KSh ${transaction.amountPaid.toLocaleString()}\n`;
    if (transaction.balanceDue > 0) {
      msg += `Balance Due: KSh ${transaction.balanceDue.toLocaleString()}\n`;
    }
    msg += `Status: ${transaction.paymentStatus}\n`;
    msg += `Thank you for shopping with us!`;
    return encodeURIComponent(msg);
  };

  const handleWhatsAppShare = () => {
    const text = formatReceiptText();
    const phone = transaction.customerPhone ? transaction.customerPhone.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleSMSShare = () => {
    const text = formatReceiptText();
    const phone = transaction.customerPhone || '';
    window.open(`sms:${phone}?body=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-slate-200">Transaction Complete</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Receipt Visual Preview Container */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950/40">
          <div className="bg-white text-slate-900 rounded-xl p-6 shadow-xl font-mono text-xs max-w-sm mx-auto space-y-3 border border-slate-200">
            {/* Store branding */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
              <div className="font-bold text-sm tracking-tight font-sans">ROFANI ELECTRONICS AND BOUTIQUE</div>
              <div className="text-[11px] text-slate-600">Electronics, Mobile Accessories & Fashion Boutique</div>
              <div className="text-[10px] text-slate-500">VAT Reg: 893021 | Tel: +1 800-555-0199</div>
            </div>

            {/* Receipt Info */}
            <div className="text-[11px] space-y-1 pb-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt #:</span>
                <span className="font-bold">{transaction.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span>{new Date(transaction.date).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cashier:</span>
                <span>{transaction.cashierName}</span>
              </div>
              {transaction.salesRepName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Sales Rep:</span>
                  <span className="font-semibold">{transaction.salesRepName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span>{transaction.customerName || 'Walk-in'}</span>
              </div>
            </div>

            {/* Item List Table */}
            <div className="space-y-2 py-2 border-b border-dashed border-slate-300">
              <div className="grid grid-cols-12 font-bold text-[11px] text-slate-700 pb-1 border-b border-slate-200">
                <span className="col-span-6">Item</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-4 text-right">Price</span>
              </div>

              {transaction.items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 text-[11px] items-center">
                  <div className="col-span-6 truncate font-sans font-medium text-slate-800">
                    {it.product.name}
                  </div>
                  <div className="col-span-2 text-center text-slate-600">{it.quantity}</div>
                  <div className="col-span-4 text-right font-bold text-slate-900">KSh {it.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
              ))}
            </div>

            {/* Totals Section */}
            <div className="space-y-1.5 pt-2 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>KSh {transaction.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {transaction.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount</span>
                  <span>-KSh {transaction.discountTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 text-[10px]">
                <span>KRA Turnover Tax (1.5% TOT)</span>
                <span>KSh {(transaction.grandTotal * 0.015).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-300">
                <span>Grand Total</span>
                <span>KSh {transaction.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Amount Paid</span>
                <span>KSh {transaction.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {transaction.balanceDue > 0 && (
                <div className="flex justify-between text-red-600 font-bold bg-red-50 p-1.5 rounded">
                  <span>Credit / Balance Due</span>
                  <span>KSh {transaction.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>

            {/* Payment Method Details */}
            <div className="pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-600">
              <div className="font-semibold mb-1 text-slate-700">Payment Breakdown:</div>
              {transaction.payments.map((p, i) => (
                <div key={i} className="flex justify-between">
                  <span className="capitalize">• {p.method} {p.reference ? `(${p.reference})` : ''}</span>
                  <span>KSh {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="text-center pt-3 text-[10px] text-slate-500 font-sans border-t border-slate-200">
              Thank you for shopping with us! Have a great day.
            </div>
          </div>
        </div>

        {/* Actions Toolbar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => exportReceiptPDF(transaction)}
              className="flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white py-2 px-3 rounded-xl text-xs font-semibold transition"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>

            <button
              onClick={() => exportReceiptPDF(transaction)}
              className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3 rounded-xl text-xs font-semibold transition border border-slate-700"
            >
              <Printer className="w-4 h-4" /> Print
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3 rounded-xl text-xs font-semibold transition"
            >
              <Share2 className="w-4 h-4" /> WhatsApp
            </button>

            <button
              onClick={handleSMSShare}
              className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-3 rounded-xl text-xs font-semibold transition"
            >
              <MessageSquare className="w-4 h-4" /> Send SMS
            </button>
          </div>

          <button
            id="btn-receipt-new-sale"
            onClick={onClose}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>+ Start New Sale (Next Customer)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
