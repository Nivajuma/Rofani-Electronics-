import React, { useState, useEffect, useRef } from 'react';
import {
  Award,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  X,
  Clock,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { StoreSubscriptionProfile } from '../../types';
import {
  PLATFORM_SUBSCRIPTION_MPESA_CONFIG,
  normalizeKenyanPhone,
  requestMpesaStkPush,
  queryMpesaStkStatus,
} from '../../utils/mpesa';
import { activateStoreSubscription } from '../../lib/cloudSync';
import { signOutFromCloud } from '../../lib/firebase';

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose?: () => void;
  storeProfile: StoreSubscriptionProfile | null;
  storeId: string;
  isOwnerAccount?: boolean;
  isExpiredLock?: boolean;
  onSubscriptionUpdated: (updated: StoreSubscriptionProfile) => void;
}

const PLAN_OPTIONS = {
  monthly: {
    id: 'monthly' as const,
    name: 'Monthly Shop Plan',
    price: 500,
    periodLabel: 'month',
    durationDays: 30,
    badge: 'Flexible Monthly',
    features: [
      'Full POS Checkout & Barcode Scanner',
      'Real-Time Cloud Firestore Sync',
      'Inventory Alerts & Expense Tracking',
      'KRA eTIMS / Turnover Tax Reports',
    ],
  },
  annual: {
    id: 'annual' as const,
    name: 'Annual Business Plan',
    price: 5000,
    periodLabel: 'year',
    durationDays: 365,
    badge: 'Save KSh 1,000 + Priority Support',
    features: [
      'Everything in Monthly Shop Plan',
      'Save KSh 1,000 (2 Months Free)',
      'Priority WhatsApp & Remote Support',
      '365 Days Uninterrupted Cloud Sync',
    ],
  },
};

function extractMpesaReceiptCode(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return '';
  // Look for standard Safaricom 10-character alphanumeric code e.g. QHK78M32KL
  const match = trimmed.match(/\b([A-Z][A-Z0-9]{7,11})\b/);
  if (match && /\d/.test(match[1])) {
    return match[1];
  }
  return trimmed.replace(/[^A-Z0-9\-]/g, '').slice(0, 20);
}

export const SubscriptionPlansModal: React.FC<SubscriptionPlansModalProps> = ({
  isOpen,
  onClose,
  storeProfile,
  storeId,
  isOwnerAccount = false,
  isExpiredLock = false,
  onSubscriptionUpdated,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [mpesaPhone, setMpesaPhone] = useState<string>(storeProfile?.phone || '');
  const [manualReceiptInput, setManualReceiptInput] = useState<string>('');
  const [isSendingStk, setIsSendingStk] = useState(false);
  const [isVerifyingManual, setIsVerifyingManual] = useState(false);
  const [stkStatusMessage, setStkStatusMessage] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (storeProfile?.phone && !mpesaPhone) {
      setMpesaPhone(storeProfile.phone);
    }
  }, [storeProfile?.phone]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const plan = PLAN_OPTIONS[selectedPlan];
  const expiresMs = storeProfile?.expiresAt ? Date.parse(storeProfile.expiresAt) : 0;
  const daysLeft = expiresMs > 0 ? Math.max(0, Math.ceil((expiresMs - Date.now()) / 86400000)) : 0;
  const isCurrentlyExpired =
    !isOwnerAccount &&
    (storeProfile?.subscriptionStatus === 'expired' || (expiresMs > 0 && expiresMs <= Date.now()));

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const handleStkPushPayment = async () => {
    if (isSendingStk || isVerifyingManual) return;
    setPaymentError(null);
    setPaymentSuccess(null);
    setStkStatusMessage(null);

    const { isValid, displayFormatted, normalized } = normalizeKenyanPhone(mpesaPhone);
    if (!isValid) {
      setPaymentError('Enter a valid M-Pesa phone number (e.g. 0712345678 or 254712345678).');
      return;
    }

    setIsSendingStk(true);
    try {
      const stkRes = await requestMpesaStkPush(
        {
          phoneNumber: normalized,
          amount: plan.price,
          accountReference: `SAAS-${selectedPlan.toUpperCase()}`,
          transactionDesc: `Rofani POS ${plan.name}`,
          storeName: 'ROFANI ELECTRONICS & BOUTIQUE',
        },
        PLATFORM_SUBSCRIPTION_MPESA_CONFIG
      );

      setStkStatusMessage(
        `STK Push sent to ${displayFormatted}. Enter your M-Pesa PIN for KSh ${plan.price.toLocaleString()}...`
      );

      let attempts = 0;
      const maxAttempts = 30;
      stopPolling();

      pollTimerRef.current = setInterval(async () => {
        attempts += 1;
        try {
          const status = await queryMpesaStkStatus(
            stkRes.checkoutRequestId,
            PLATFORM_SUBSCRIPTION_MPESA_CONFIG,
            plan.price
          );

          if (status?.status === 'COMPLETED') {
            stopPolling();
            const receiptCode = status.mpesaReceiptNumber || `STK${Date.now().toString().slice(-7)}`;
            const updated = await activateStoreSubscription(storeId, {
              planType: selectedPlan,
              durationDays: plan.durationDays,
              paymentRef: receiptCode,
              amount: plan.price,
              phone: normalized,
              paymentMethod: 'stk_push',
              currentExpiresAt: storeProfile?.expiresAt,
              recordedByEmail: storeProfile?.ownerEmail,
            });
            setIsSendingStk(false);
            setStkStatusMessage(null);
            setPaymentSuccess(
              `Payment confirmed (${receiptCode})! ${plan.name} is now active.`
            );
            onSubscriptionUpdated(updated);
          } else if (
            status?.status === 'CANCELLED' ||
            status?.status === 'FAILED' ||
            status?.status === 'TIMEOUT'
          ) {
            stopPolling();
            setIsSendingStk(false);
            setStkStatusMessage(null);
            setPaymentError(
              status?.errorMessage ||
                status?.resultDesc ||
                'M-Pesa payment was cancelled or failed. You can retry or enter your M-Pesa receipt code below.'
            );
          } else if (attempts >= maxAttempts) {
            stopPolling();
            setIsSendingStk(false);
            setStkStatusMessage(null);
            setPaymentError(
              'STK Push confirmation timed out. If you completed the payment on your phone, paste your M-Pesa Receipt Code below to activate.'
            );
          }
        } catch {
          if (attempts >= maxAttempts) {
            stopPolling();
            setIsSendingStk(false);
            setStkStatusMessage(null);
          }
        }
      }, 2500);
    } catch (err: any) {
      setIsSendingStk(false);
      setStkStatusMessage(null);
      setPaymentError(
        err?.message ||
          'Could not dispatch M-Pesa STK Push right now. Pay manually to Till 1833804 and paste the receipt code below.'
      );
    }
  };

  const handleVerifyManualReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifyingManual || isSendingStk) return;
    setPaymentError(null);
    setPaymentSuccess(null);

    const extracted = extractMpesaReceiptCode(manualReceiptInput);
    if (!extracted || extracted.length < 6) {
      setPaymentError('Please enter a valid M-Pesa Confirmation / Receipt Code (e.g. QHK78M32KL).');
      return;
    }

    setIsVerifyingManual(true);
    try {
      const updated = await activateStoreSubscription(storeId, {
        planType: selectedPlan,
        durationDays: plan.durationDays,
        paymentRef: extracted,
        amount: plan.price,
        phone: mpesaPhone.trim() || storeProfile?.phone || '',
        paymentMethod: 'manual_receipt',
        currentExpiresAt: storeProfile?.expiresAt,
        recordedByEmail: storeProfile?.ownerEmail,
      });
      setManualReceiptInput('');
      setPaymentSuccess(
        `Receipt ${extracted} recorded! ${plan.name} activated until ${new Date(
          updated.expiresAt
        ).toLocaleDateString()}.`
      );
      onSubscriptionUpdated(updated);
    } catch (err: any) {
      setPaymentError(err?.message || 'Failed to activate subscription. Please try again.');
    } finally {
      setIsVerifyingManual(false);
    }
  };

  const formattedExpiry = storeProfile?.expiresAt
    ? new Date(storeProfile.expiresAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans"
      onClick={() => {
        if (!isExpiredLock && onClose) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl bg-[#1e293b] border border-slate-700 rounded-3xl p-5 sm:p-6 text-slate-100 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-700/70 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 ${
                isCurrentlyExpired
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
              }`}
            >
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                {isExpiredLock ? 'Renew Store Subscription' : 'Plans & Pricing'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {storeProfile?.storeName || 'Your Store'} • Choose a plan to keep cloud sync &amp; POS active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isExpiredLock && (
              <button
                type="button"
                onClick={() => signOutFromCloud()}
                className="px-2.5 py-1.5 rounded-xl bg-[#0f172a] hover:bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            )}
            {!isExpiredLock && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Current Plan Status Banner */}
        <div
          className={`rounded-2xl p-3.5 border flex flex-wrap items-center justify-between gap-2 text-xs ${
            isOwnerAccount
              ? 'bg-sky-500/10 border-sky-500/30 text-sky-200'
              : isCurrentlyExpired
              ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
              : 'bg-[#0f172a] border-slate-700/80 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Clock
              className={`w-4 h-4 shrink-0 ${
                isOwnerAccount
                  ? 'text-sky-400'
                  : isCurrentlyExpired
                  ? 'text-rose-400'
                  : 'text-emerald-400'
              }`}
            />
            <div>
              <span className="font-bold text-white">
                {isOwnerAccount
                  ? 'Platform Owner License (Unlimited)'
                  : storeProfile?.planType === 'annual'
                  ? 'Annual Business Plan'
                  : storeProfile?.planType === 'monthly'
                  ? 'Monthly Shop Plan'
                  : '7-Day Free Trial'}
              </span>
              {!isOwnerAccount && (
                <p className="text-[11px] text-slate-400">
                  {isCurrentlyExpired
                    ? `Expired on ${formattedExpiry}. Renew below to unlock POS & Cloud Sync.`
                    : `Active • Expires ${formattedExpiry} (${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining)`}
                </p>
              )}
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase ${
              isOwnerAccount || !isCurrentlyExpired
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            {isOwnerAccount ? 'Owner Active' : isCurrentlyExpired ? 'Expired' : 'Active'}
          </span>
        </div>

        {/* Two Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {(['monthly', 'annual'] as const).map((key) => {
            const item = PLAN_OPTIONS[key];
            const isSelected = selectedPlan === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedPlan(key)}
                className={`text-left rounded-2xl p-4 border transition cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#0f172a] border-sky-400 ring-2 ring-sky-500/30'
                    : 'bg-[#0f172a]/70 border-slate-700/80 hover:border-slate-500'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white">{item.name}</span>
                    {key === 'annual' ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Save KSh 1,000
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-semibold">
                        Monthly
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-white tabular-nums">
                      KSh {item.price.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400">/ {item.periodLabel}</span>
                  </div>

                  <ul className="space-y-1.5 pt-1 text-[11px] text-slate-300">
                    {item.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  className={`text-center py-2 rounded-xl text-xs font-bold transition ${
                    isSelected
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {isSelected ? `Selected: KSh ${item.price.toLocaleString()}` : 'Select Plan'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Feedback Banners */}
        {paymentError && (
          <div className="bg-rose-950/60 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{paymentError}</span>
          </div>
        )}

        {stkStatusMessage && (
          <div className="bg-sky-950/60 border border-sky-500/40 rounded-xl p-3 text-xs text-sky-200 flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
            <span>{stkStatusMessage}</span>
          </div>
        )}

        {paymentSuccess && (
          <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{paymentSuccess}</span>
          </div>
        )}

        {/* M-Pesa STK Push Section */}
        <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white">
                Instant M-Pesa STK Push Payment
              </h3>
            </div>
            <span className="text-[11px] font-bold text-emerald-300 tabular-nums">
              KSh {plan.price.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="tel"
              value={mpesaPhone}
              onChange={(e) => setMpesaPhone(e.target.value)}
              placeholder="M-Pesa Number (07... or 2547...)"
              className="flex-1 bg-[#1e293b] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={handleStkPushPayment}
              disabled={isSendingStk || isVerifyingManual}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer transition shrink-0"
            >
              {isSendingStk ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Smartphone className="w-4 h-4" />
              )}
              <span>{isSendingStk ? 'Waiting for PIN...' : 'Pay via M-Pesa'}</span>
            </button>
          </div>
        </div>

        {/* Manual Receipt Code Fallback Box */}
        <form
          onSubmit={handleVerifyManualReceipt}
          className="bg-[#0f172a]/70 border border-slate-700/70 rounded-2xl p-4 space-y-3 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-white">
                Confirm Payment / Enter M-Pesa Receipt Code
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Buy Goods Till: <strong className="text-sky-300 font-mono">1833804</strong>
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Paid manually via Lipa na M-Pesa Till <strong className="text-slate-200">1833804</strong> (Rofani Electronics)? Paste your M-Pesa confirmation code or SMS below to activate immediately:
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={manualReceiptInput}
              onChange={(e) => setManualReceiptInput(e.target.value)}
              placeholder="e.g. QHK78M32KL or paste M-Pesa SMS"
              className="flex-1 bg-[#1e293b] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 uppercase focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="submit"
              disabled={isVerifyingManual || isSendingStk || !manualReceiptInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition shrink-0"
            >
              {isVerifyingManual ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              <span>{isVerifyingManual ? 'Activating...' : 'Confirm Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
