import React, { useState, useEffect } from 'react';
import { Transaction } from '../../types';
import { exportReceiptPDF } from '../../utils/pdfGenerator';
import {
  X,
  Printer,
  Download,
  Share2,
  MessageSquare,
  CheckCircle2,
  Smartphone,
  QrCode,
  Image as ImageIcon,
} from 'lucide-react';
import { TransactionSmsModal } from './TransactionSmsModal';
import { getSmsDeliveryLogs, SmsDeliveryRecord } from '../../utils/smsService';
import { safeGetJSON, safeSetJSON } from '../../utils/safeStorage';
import { useTransactionSettings } from '../../utils/transactionSettings';
import { resolveActiveStoreKraPin } from '../../utils/supportConfig';
import { useCurrency } from '../../utils/currency';

interface ReceiptModalProps {
  transaction: Transaction;
  storeName?: string;
  activeStoreId?: string;
  storeKraPin?: string;
  onClose: () => void;
}

const isLegacyStoreBrand = (val?: string): boolean => {
  if (!val || !val.trim()) return true;
  const norm = val.trim().toLowerCase();
  return (
    norm === 'rofani electronic' ||
    norm === 'rofani electronics' ||
    norm === 'rofani electronic & boutique' ||
    norm === 'rofani electronic and boutique' ||
    norm === 'rofani electronics & boutique' ||
    norm === 'rofani electronics and boutique'
  );
};

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  storeName,
  activeStoreId,
  storeKraPin,
  onClose,
}) => {
  const { formatMoney } = useCurrency();
  const [txSettings] = useTransactionSettings(activeStoreId);
  const [currentTx, setCurrentTx] = useState<Transaction>(transaction);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [latestSms, setLatestSms] = useState<SmsDeliveryRecord | null>(null);
  const [showSharePicker, setShowSharePicker] = useState(false);
  const [receiptToast, setReceiptToast] = useState<string | null>(null);

  const resolvedStoreKraPin = resolveActiveStoreKraPin(storeKraPin);

  const customShopName = safeGetJSON<string>('rofani_settings_shop_name', '');
  const resolvedStoreName = (() => {
    if (
      customShopName &&
      !isLegacyStoreBrand(customShopName) &&
      customShopName.trim().toLowerCase() !== 'rofani pos'
    ) {
      return customShopName.trim();
    }
    if (storeName && !isLegacyStoreBrand(storeName)) {
      return storeName.trim();
    }
    return 'Rofani POS';
  })();

  useEffect(() => {
    setCurrentTx(transaction);
  }, [transaction]);

  const showTime =
    currentTx.showTimeOnReceipt !== undefined
      ? currentTx.showTimeOnReceipt
      : txSettings.addTimeOnTransactions;
  const showInvoiceNumber =
    !currentTx.hideInvoiceNumber && txSettings.enableInvoiceBillNumber;

  const isEtims =
    currentTx.isEtimsRequested === true ||
    (Boolean(currentTx.cuin) && currentTx.isEtimsRequested !== false);

  const showToast = (msg: string) => {
    setReceiptToast(msg);
    window.setTimeout(() => setReceiptToast(null), 2600);
  };

  const handleConvertToEtims = () => {
    const cuin = `CUIN-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const cusn = `CUSN-KENYA-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const updated = {
      ...currentTx,
      isEtimsRequested: true,
      cuin,
      cusn,
    };
    setCurrentTx(updated);

    try {
      const sales = safeGetJSON<Transaction[]>('pos_store_sales', []);
      const updatedList = sales.map((t) => (t.id === currentTx.id ? updated : t));
      safeSetJSON('pos_store_sales', updatedList);
      safeSetJSON('retail_pos_transactions', updatedList);
    } catch (err) {
      console.warn('Could not update sales:', err);
    }
  };

  useEffect(() => {
    const logs = getSmsDeliveryLogs();
    const match = logs.find(
      (l) => l.transactionId === currentTx.id || l.receiptNumber === currentTx.receiptNumber
    );
    if (match) {
      setLatestSms(match);
    }
  }, [currentTx]);

  const formattedDateDisplay = showTime
    ? new Date(currentTx.date).toLocaleString()
    : new Date(currentTx.date).toLocaleDateString();

  // Format receipt message string for WhatsApp and SMS sharing
  const formatReceiptText = () => {
    let msg = showInvoiceNumber
      ? `*RECEIPT #${currentTx.receiptNumber}*\n`
      : `*OFFICIAL RECEIPT*\n`;
    msg += `Store: ${resolvedStoreName}\n`;
    msg += `Date: ${formattedDateDisplay}\n`;
    if (currentTx.billingPartyName) {
      msg += `Billing Name: ${currentTx.billingPartyName}\n`;
    }
    if (currentTx.customerPoNumber) {
      msg += `Customer PO: ${currentTx.customerPoNumber}\n`;
    }
    msg += `\n*Items Purchased:*\n`;
    currentTx.items.forEach((it) => {
      const freeLabel = it.freeQuantity ? ` (+${it.freeQuantity} free)` : '';
      msg += `• ${it.product.name} x${it.quantity}${freeLabel} - ${formatMoney(it.total)}\n`;
    });
    if ((currentTx.additionalChargeAmount || 0) > 0) {
      msg += `\n${currentTx.additionalChargeLabel || 'Additional Charge'}: +${formatMoney(
        Number(currentTx.additionalChargeAmount)
      )}\n`;
    }
    if (currentTx.roundOffAmount) {
      msg += `Round Off: ${currentTx.roundOffAmount > 0 ? '+' : ''}${formatMoney(currentTx.roundOffAmount, { showDecimals: true })}\n`;
    }
    msg += `\n*Total:* ${formatMoney(currentTx.grandTotal)}\n`;
    msg += `Paid: ${formatMoney(currentTx.amountPaid)}\n`;
    if (currentTx.balanceDue > 0) {
      msg += `Balance Due: ${formatMoney(currentTx.balanceDue)}\n`;
    }
    msg += `Status: ${currentTx.paymentStatus}\n`;
    msg += currentTx.termsAndConditionsText || `Thank you for shopping with us!`;
    return encodeURIComponent(msg);
  };

  const triggerExternalHref = (href: string) => {
    const link = document.createElement('a');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWhatsAppShare = () => {
    const text = formatReceiptText();
    const phone = currentTx.customerPhone ? currentTx.customerPhone.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    triggerExternalHref(url);
  };

  const handleDownloadThermalImage = async () => {
    try {
      const lines: string[] = [
        resolvedStoreName.toUpperCase(),
        'Official Customer Receipt',
        '--------------------------------',
        ...(showInvoiceNumber ? [`Receipt: ${currentTx.receiptNumber}`] : []),
        `Date: ${formattedDateDisplay}`,
        `Cashier: ${currentTx.cashierName}`,
        `Customer: ${currentTx.billingPartyName || currentTx.customerName || 'Walk-in'}`,
        ...(currentTx.customerPoNumber ? [`PO #: ${currentTx.customerPoNumber}`] : []),
        '--------------------------------',
        ...currentTx.items.map(
          (it) =>
            `${it.product.name.slice(0, 18).padEnd(18, ' ')} x${it.quantity} ${formatMoney(it.total)}`
        ),
        '--------------------------------',
        `Subtotal:   ${formatMoney(currentTx.subtotal)}`,
        ...(currentTx.discountTotal > 0
          ? [`Discount:  -${formatMoney(currentTx.discountTotal)}`]
          : []),
        ...((currentTx.additionalChargeAmount || 0) > 0
          ? [
              `${currentTx.additionalChargeLabel || 'Extra'}: +${formatMoney(
                Number(currentTx.additionalChargeAmount)
              )}`,
            ]
          : []),
        ...(currentTx.roundOffAmount
          ? [
              `Round Off: ${currentTx.roundOffAmount > 0 ? '+' : ''}${formatMoney(currentTx.roundOffAmount, { showDecimals: true })}`,
            ]
          : []),
        `GRAND TOTAL: ${formatMoney(currentTx.grandTotal)}`,
        `Paid:        ${formatMoney(currentTx.amountPaid)}`,
        ...(currentTx.balanceDue > 0
          ? [`Balance Due: ${formatMoney(currentTx.balanceDue)}`]
          : []),
        '--------------------------------',
        currentTx.termsAndConditionsText || 'Thank you for shopping with us!',
      ];

      const canvas = document.createElement('canvas');
      const lineHeight = 22;
      canvas.width = 420;
      canvas.height = Math.max(320, lines.length * lineHeight + 60);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px monospace';

      lines.forEach((line, idx) => {
        ctx.font = idx === 0 || line.startsWith('GRAND TOTAL') ? 'bold 15px monospace' : '13px monospace';
        ctx.fillText(line, 20, 34 + idx * lineHeight);
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) return;

      const fileName = `${currentTx.receiptNumber || 'Receipt'}_Thermal.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      const nav: any = typeof navigator !== 'undefined' ? navigator : null;
      if (nav && typeof nav.canShare === 'function' && nav.canShare({ files: [file] })) {
        await nav.share({
          title: `${resolvedStoreName} Receipt ${currentTx.receiptNumber}`,
          files: [file],
        });
        showToast('Thermal receipt image shared!');
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Thermal receipt saved (${fileName})`);
    } catch (err) {
      console.warn('Thermal image generation notice:', err);
    }
  };

  const handleSmartShare = () => {
    const mode = txSettings.shareTransactionAs || 'ask';
    if (mode === 'pdf') {
      exportReceiptPDF(currentTx, { storeName: resolvedStoreName, storeKraPin: resolvedStoreKraPin });
    } else if (mode === 'thermal') {
      handleDownloadThermalImage();
    } else if (mode === 'whatsapp') {
      handleWhatsAppShare();
    } else {
      setShowSharePicker((v) => !v);
    }
  };

  return (
    <div className="fixed inset-0 z-[145] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
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

        {/* Automated Transaction Summary SMS Banner */}
        <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                latestSms ? 'bg-emerald-400 animate-pulse' : 'bg-indigo-400'
              }`}
            ></div>
            {latestSms ? (
              <span className="text-emerald-300 font-medium">
                Summary SMS sent to <strong className="text-white font-mono">{latestSms.formattedPhone}</strong>{' '}
                <span className="text-[10px] text-emerald-400 font-mono">
                  ({latestSms.status} • {latestSms.id})
                </span>
              </span>
            ) : (
              <span className="text-slate-300">
                Customer: <strong className="text-white">{currentTx.customerName || 'Walk-in'}</strong>{' '}
                <span className="font-mono text-indigo-300">
                  ({currentTx.customerPhone || 'No phone set'})
                </span>
              </span>
            )}
          </div>
          <button
            id="btn-receipt-open-sms-modal"
            onClick={() => setShowSmsModal(true)}
            className="px-2.5 py-1 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{latestSms ? 'View / Resend SMS' : '📱 Send Summary SMS'}</span>
          </button>
        </div>

        {/* Thermal Receipt Visual Preview Container */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950/40">
          {receiptToast && (
            <div className="mb-3 bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs px-3 py-2 rounded-xl text-center font-semibold">
              {receiptToast}
            </div>
          )}

          <div className="bg-white text-slate-900 rounded-xl p-6 shadow-xl font-mono text-xs max-w-sm mx-auto space-y-3 border border-slate-200">
            {/* Store branding */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
              <div className="font-bold text-sm tracking-tight font-sans">{resolvedStoreName}</div>
              <div className="text-[11px] text-slate-600">Retail &amp; Wholesale Point of Sale</div>
              <div className="text-[10px] text-slate-500">Official Customer Receipt</div>
            </div>

            {/* Receipt Info */}
            <div className="text-[11px] space-y-1 pb-3 border-b border-dashed border-slate-300">
              {showInvoiceNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt #:</span>
                  <span className="font-bold">{currentTx.receiptNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span>{formattedDateDisplay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cashier:</span>
                <span>{currentTx.cashierName}</span>
              </div>
              {currentTx.salesRepName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Sales Rep:</span>
                  <span className="font-semibold">{currentTx.salesRepName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span>{currentTx.customerName || 'Walk-in'}</span>
              </div>
              {currentTx.billingPartyName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Billing Party:</span>
                  <span className="font-bold">{currentTx.billingPartyName}</span>
                </div>
              )}
              {currentTx.customerPoNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer PO #:</span>
                  <span className="font-semibold">
                    {currentTx.customerPoNumber}
                    {currentTx.customerPoDate ? ` (${currentTx.customerPoDate})` : ''}
                  </span>
                </div>
              )}
              {currentTx.linkedInvoiceRef && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Linked Invoice:</span>
                  <span className="font-semibold">{currentTx.linkedInvoiceRef}</span>
                </div>
              )}
              {currentTx.dueDate && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Due / Terms:</span>
                  <span>
                    {currentTx.paymentTerms ? `${currentTx.paymentTerms} • ` : ''}
                    {currentTx.dueDate}
                  </span>
                </div>
              )}
            </div>

            {/* Item List Table */}
            <div className="space-y-2 py-2 border-b border-dashed border-slate-300">
              <div className="grid grid-cols-12 font-bold text-[11px] text-slate-700 pb-1 border-b border-slate-200">
                <span className="col-span-6">Item</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-4 text-right">Price</span>
              </div>

              {currentTx.items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 text-[11px] items-center">
                  <div className="col-span-6 font-sans font-medium text-slate-800">
                    <div className="truncate">{it.product.name}</div>
                    {it.discount > 0 && (
                      <div className="text-[9px] text-emerald-600 font-mono">
                        (Disc: -{formatMoney(it.discount)} ea • Saved{' '}
                        {formatMoney(it.discount * it.quantity)})
                      </div>
                    )}
                    {(it.freeQuantity || 0) > 0 && (
                      <div className="text-[9px] text-blue-600 font-mono font-bold">
                        +{it.freeQuantity} FREE BONUS
                      </div>
                    )}
                    {(txSettings.enableItemCountColumn || currentTx.customCountLabel) &&
                      typeof it.customCount === 'number' && (
                        <div className="text-[9px] text-slate-500 font-mono">
                          {currentTx.customCountLabel || txSettings.customCountLabel || 'Count'}:{' '}
                          {it.customCount}
                        </div>
                      )}
                  </div>
                  <div className="col-span-2 text-center text-slate-600">{it.quantity}</div>
                  <div className="col-span-4 text-right font-bold text-slate-900">
                    {formatMoney(it.total, { showDecimals: true })}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Section */}
            <div className="space-y-1.5 pt-2 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>
                  {formatMoney(currentTx.subtotal, { showDecimals: true })}
                </span>
              </div>
              {currentTx.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span className="flex items-center gap-1">
                    <span>Discount</span>
                    {currentTx.discountAuthorizedBy && (
                      <span className="text-[9px] text-slate-500 font-normal">
                        ({currentTx.discountAuthorizedBy})
                      </span>
                    )}
                  </span>
                  <span>
                    -{formatMoney(currentTx.discountTotal, { showDecimals: true })}
                  </span>
                </div>
              )}
              {(currentTx.additionalChargeAmount || 0) > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>{currentTx.additionalChargeLabel || 'Additional Charge'}</span>
                  <span>
                    +{formatMoney(Number(currentTx.additionalChargeAmount), { showDecimals: true })}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 text-[10px]">
                <span>KRA Turnover Tax (1.5% TOT)</span>
                <span>
                  {formatMoney(currentTx.grandTotal * 0.015, { showDecimals: true })}
                </span>
              </div>
              {currentTx.roundOffAmount !== undefined && currentTx.roundOffAmount !== 0 && (
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>Round Off</span>
                  <span>
                    {currentTx.roundOffAmount > 0 ? '+' : ''}
                    {formatMoney(currentTx.roundOffAmount, { showDecimals: true })}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-300">
                <span>Grand Total</span>
                <span>
                  {formatMoney(currentTx.grandTotal, { showDecimals: true })}
                </span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Amount Paid</span>
                <span>
                  {formatMoney(currentTx.amountPaid, { showDecimals: true })}
                </span>
              </div>
              {currentTx.balanceDue > 0 && (
                <div className="flex justify-between text-red-600 font-bold bg-red-50 p-1.5 rounded">
                  <span>Credit / Balance Due</span>
                  <span>
                    {formatMoney(currentTx.balanceDue, { showDecimals: true })}
                  </span>
                </div>
              )}
            </div>

            {/* Payment Method Details */}
            <div className="pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-600">
              <div className="font-semibold mb-1 text-slate-700">Payment Breakdown:</div>
              {currentTx.payments.map((p, i) => (
                <div key={i} className="flex justify-between">
                  <span className="capitalize">
                    • {p.method} {p.reference ? `(${p.reference})` : ''}
                  </span>
                  <span>{formatMoney(p.amount, { showDecimals: true })}</span>
                </div>
              ))}
            </div>

            {/* Dispatch & Custom Additional Fields */}
            {(currentTx.transportationDetails ||
              (currentTx.additionalFieldsValues && currentTx.additionalFieldsValues.length > 0)) && (
              <div className="pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-600 space-y-0.5">
                {currentTx.transportationDetails && (
                  <div>
                    <span className="font-bold text-slate-700">Dispatch:</span>{' '}
                    {currentTx.transportationDetails.deliveryMode}
                    {currentTx.transportationDetails.driverName
                      ? ` • ${currentTx.transportationDetails.driverName}`
                      : ''}
                    {currentTx.transportationDetails.vehicleNumber
                      ? ` • ${currentTx.transportationDetails.vehicleNumber}`
                      : ''}
                  </div>
                )}
                {currentTx.additionalFieldsValues?.map((af, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-slate-500">{af.label}:</span>
                    <span className="font-semibold text-slate-800">{af.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Optional Tax Invoice vs Standard Retail Receipt Section */}
            {isEtims ? (
              <div className="pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-700 space-y-1 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200">
                <div className="font-extrabold text-amber-900 flex items-center justify-between">
                  <span>Tax Invoice Details</span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                    Verified ✓
                  </span>
                </div>
                <div className="flex justify-between font-mono text-[9px]">
                  <span className="text-slate-500">CUIN:</span>
                  <span className="font-bold text-slate-900">
                    {currentTx.cuin || 'CUIN-2026-984712'}
                  </span>
                </div>
                <div className="flex justify-between font-mono text-[9px]">
                  <span className="text-slate-500">CUSN:</span>
                  <span className="font-bold text-slate-900">
                    {currentTx.cusn || 'CUSN-KENYA-44910293'}
                  </span>
                </div>
                {resolvedStoreKraPin && (
                  <div className="flex justify-between font-mono text-[9px]">
                    <span className="text-slate-500">Store Tax PIN:</span>
                    <span className="font-bold text-slate-900">{resolvedStoreKraPin}</span>
                  </div>
                )}
                {currentTx.customerKraPin && (
                  <div className="flex justify-between font-mono text-[9px]">
                    <span className="text-slate-500">Buyer Tax PIN:</span>
                    <span className="font-bold text-amber-900">{currentTx.customerKraPin}</span>
                  </div>
                )}
                <div className="pt-1 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-slate-900 text-white rounded-lg flex flex-col items-center justify-center p-1 font-mono text-[8px] space-y-0.5 shadow-inner">
                    <div className="w-12 h-12 bg-white text-slate-950 p-0.5 flex items-center justify-center font-bold text-[7px] select-all">
                      QR: {currentTx.receiptNumber}
                    </div>
                    <span className="text-[7px] text-amber-300">Scan to Verify</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-500 space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-700">
                  <span>Standard Retail Receipt</span>
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                    Paid &amp; Verified
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleConvertToEtims}
                  className="w-full text-center py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-semibold text-[10px] transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <QrCode className="w-3.5 h-3.5 text-slate-600" />
                  <span>Add Tax Invoice Details (Optional)</span>
                </button>
              </div>
            )}

            {/* Footer / Custom Terms & Conditions */}
            <div className="text-center pt-3 text-[10px] text-slate-500 font-sans border-t border-slate-200 space-y-1">
              {currentTx.termsAndConditionsText ? (
                <div className="text-[9px] text-slate-600 leading-snug">
                  {currentTx.termsAndConditionsText}
                </div>
              ) : (
                <div>Thank you for shopping with us! Have a great day.</div>
              )}
            </div>
          </div>
        </div>

        {/* Ask Me Everytime Share Format Picker */}
        {showSharePicker && (
          <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <span>Choose Receipt Share Format:</span>
              <button
                type="button"
                onClick={() => setShowSharePicker(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSharePicker(false);
                  exportReceiptPDF(currentTx, { storeName: resolvedStoreName, storeKraPin: resolvedStoreKraPin });
                }}
                className="py-2 px-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> PDF Receipt
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSharePicker(false);
                  handleDownloadThermalImage();
                }}
                className="py-2 px-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Thermal Image
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSharePicker(false);
                  handleWhatsAppShare();
                }}
                className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" /> WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* Actions Toolbar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => exportReceiptPDF(currentTx, { storeName: resolvedStoreName, storeKraPin: resolvedStoreKraPin })}
              className="flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <Download className="w-4 h-4" /> PDF
            </button>

            <button
              onClick={handleDownloadThermalImage}
              className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3 rounded-xl text-xs font-semibold transition border border-slate-700 cursor-pointer"
              title="Download / share Thermal Receipt Image"
            >
              <Printer className="w-4 h-4" /> Thermal
            </button>

            <button
              onClick={handleSmartShare}
              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <Share2 className="w-4 h-4" />{' '}
              {txSettings.shareTransactionAs === 'pdf'
                ? 'Share PDF'
                : txSettings.shareTransactionAs === 'thermal'
                  ? 'Share Image'
                  : txSettings.shareTransactionAs === 'whatsapp'
                    ? 'WhatsApp'
                    : 'Share'}
            </button>

            <button
              onClick={() => setShowSmsModal(true)}
              className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" /> {latestSms ? 'Resend SMS' : 'Send SMS'}
            </button>
          </div>

          <button
            id="btn-receipt-new-sale"
            onClick={onClose}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>+ Start New Sale (Next Customer)</span>
          </button>
        </div>
      </div>

      {/* Transaction Summary SMS Modal */}
      <TransactionSmsModal
        isOpen={showSmsModal}
        onClose={() => setShowSmsModal(false)}
        transaction={currentTx}
        storeName={resolvedStoreName}
        onSmsSent={(rec) => setLatestSms(rec)}
      />
    </div>
  );
};
