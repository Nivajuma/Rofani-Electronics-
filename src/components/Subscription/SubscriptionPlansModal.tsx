import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  Clock,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Receipt,
  Gift,
  Copy,
  Share2,
  LayoutGrid,
  Calculator,
  X,
  Download,
  FileText,
} from 'lucide-react';
import { StoreSubscriptionProfile, SubscriptionPlanType } from '../../types';
import {
  PLATFORM_SUBSCRIPTION_MPESA_CONFIG,
  normalizeKenyanPhone,
  requestMpesaStkPush,
  queryMpesaStkStatus,
} from '../../utils/mpesa';
import { activateStoreSubscription, generateStoreReferralCode } from '../../lib/cloudSync';
import { signOutFromCloud } from '../../lib/firebase';
import { ROFANI_MASTER_KRA_PIN } from '../../utils/supportConfig';
import { exportSubscriptionInvoicePDF } from '../../utils/pdfGenerator';
import { CustomerCareSupportCard } from '../Common/CustomerCareSupportCard';

export type PaidSubscriptionPlanKey = Exclude<SubscriptionPlanType, 'trial'>;

interface PlanOption {
  id: PaidSubscriptionPlanKey;
  title: string;
  name: string;
  price: number;
  durationDays: number;
  subtitle: string;
  featured?: boolean;
  badge?: string;
}

const PLAN_LIST: PlanOption[] = [
  {
    id: 'monthly',
    title: '30 Days',
    name: '30 Days Unlimited',
    price: 500,
    durationDays: 30,
    subtitle: 'Unlimited Usage',
  },
  {
    id: 'quarterly',
    title: '3 Months',
    name: '3 Months Unlimited',
    price: 1350,
    durationDays: 90,
    subtitle: 'Unlimited Usage',
  },
  {
    id: 'biannual',
    title: '6 Months',
    name: '6 Months Unlimited',
    price: 2650,
    durationDays: 180,
    subtitle: 'Unlimited Usage',
    featured: true,
    badge: 'POPULAR',
  },
  {
    id: 'annual',
    title: '12 Months',
    name: '12 Months Unlimited',
    price: 5000,
    durationDays: 365,
    subtitle: 'Unlimited Usage',
  },
];

const PLAN_BY_ID: Record<PaidSubscriptionPlanKey, PlanOption> = {
  monthly: PLAN_LIST[0],
  quarterly: PLAN_LIST[1],
  biannual: PLAN_LIST[2],
  annual: PLAN_LIST[3],
};

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose?: () => void;
  storeProfile: StoreSubscriptionProfile | null;
  storeId: string;
  isOwnerAccount?: boolean;
  isExpiredLock?: boolean;
  onSubscriptionUpdated: (updated: StoreSubscriptionProfile) => void;
  onOpenAiAssistant?: () => void;
}

function extractMpesaReceiptCode(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return '';
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
  onOpenAiAssistant,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<PaidSubscriptionPlanKey>('biannual');
  const [mpesaPhone, setMpesaPhone] = useState<string>(storeProfile?.phone || '');
  const [manualReceiptInput, setManualReceiptInput] = useState<string>('');
  const [isSendingStk, setIsSendingStk] = useState(false);
  const [isVerifyingManual, setIsVerifyingManual] = useState(false);
  const [stkStatusMessage, setStkStatusMessage] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [showQuickTools, setShowQuickTools] = useState(false);
  const [copiedTill, setCopiedTill] = useState(false);
  const [calcInput, setCalcInput] = useState('');
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkoutRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (storeProfile?.phone && !mpesaPhone) {
      setMpesaPhone(storeProfile.phone);
    }
  }, [storeProfile?.phone, mpesaPhone]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const plan = PLAN_BY_ID[selectedPlan];
  const expiresMs = storeProfile?.expiresAt ? Date.parse(storeProfile.expiresAt) : 0;
  const daysLeft = expiresMs > 0 ? Math.max(0, Math.ceil((expiresMs - Date.now()) / 86400000)) : 0;
  const isCurrentlyExpired =
    !isOwnerAccount &&
    (storeProfile?.subscriptionStatus === 'expired' || (expiresMs > 0 && expiresMs <= Date.now()));

  const referralCode =
    storeProfile?.referralCode ||
    generateStoreReferralCode(storeProfile?.storeName || 'SHOP', storeId);
  const referralCount = storeProfile?.referralCount || 0;
  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?ref=${encodeURIComponent(referralCode)}`
      : `https://rofani-pos.vercel.app/?ref=${encodeURIComponent(referralCode)}`;

  const handleSelectPlan = (planId: PaidSubscriptionPlanKey) => {
    setSelectedPlan(planId);
    setPaymentError(null);
    setTimeout(() => {
      checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  };

  const handleCopyReferralCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(referralCode).catch(() => {});
    }
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2200);
  };

  const handleCopyTill = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('1833804').catch(() => {});
    }
    setCopiedTill(true);
    setTimeout(() => setCopiedTill(false), 2000);
  };

  const handleShareInviteLink = async () => {
    const shareText = `Run your shop with Rofani POS — fast sales, live stock tracking, M-Pesa options, multi-shop support & local/email backups! Use my referral code ${referralCode} for 22 Days Free (7-day standard free trial + 15 bonus days):\n${inviteUrl}`;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Join Rofani POS — Get 22 Days Free!',
          text: shareText,
          url: inviteUrl,
        });
        setShareFeedback('Invite shared!');
        setTimeout(() => setShareFeedback(null), 2500);
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareText).catch(() => {});
    }
    setShareFeedback('Invite link & code copied!');
    setTimeout(() => setShareFeedback(null), 2500);
  };

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
          storeName: 'Rofani POS',
        },
        PLATFORM_SUBSCRIPTION_MPESA_CONFIG
      );

      setStkStatusMessage(
        `STK Push sent to ${displayFormatted}. Enter your M-Pesa PIN for KE ${plan.price.toLocaleString()}...`
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
              `Payment confirmed (${receiptCode})! ${plan.title} plan is now active.`
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
        `Receipt ${extracted} recorded! ${plan.title} plan activated until ${new Date(
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

  const evaluateMiniCalc = (expr: string): string => {
    const cleaned = expr.replace(/[^0-9+\-*/().]/g, '');
    if (!cleaned) return '0';
    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${cleaned})`)();
      if (typeof result === 'number' && Number.isFinite(result)) {
        return result.toLocaleString(undefined, { maximumFractionDigits: 2 });
      }
      return 'Error';
    } catch {
      return '—';
    }
  };

  const formattedExpiry = storeProfile?.expiresAt
    ? new Date(storeProfile.expiresAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';

  const currentPlanLabel = isOwnerAccount
    ? 'Platform Owner License (Unlimited)'
    : storeProfile?.planType === 'annual'
    ? '12 Months Unlimited'
    : storeProfile?.planType === 'biannual'
    ? '6 Months Unlimited'
    : storeProfile?.planType === 'quarterly'
    ? '3 Months Unlimited'
    : storeProfile?.planType === 'monthly'
    ? '30 Days Unlimited'
    : storeProfile?.referredBy || (storeProfile?.trialDaysGranted && storeProfile.trialDaysGranted >= 22)
    ? '22-Day Referral Trial'
    : '7-Day Free Trial';

  const activeStoreTitle = (storeProfile?.storeName || 'Rofani POS').trim();

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Structured Dark Top Header */}
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-700/80 px-3 sm:px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (!isExpiredLock && onClose) {
                  onClose();
                } else {
                  signOutFromCloud();
                }
              }}
              aria-label={isExpiredLock ? 'Sign out' : 'Back'}
              className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 flex items-center justify-center text-slate-200 transition cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
                Extend Usage
              </h1>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider truncate">
                {activeStoreTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isExpiredLock ? (
              <button
                type="button"
                onClick={() => signOutFromCloud()}
                className="min-h-[44px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            ) : (
              <span
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wide whitespace-nowrap ${
                  isOwnerAccount || !isCurrentlyExpired
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {isOwnerAccount ? 'Owner Active' : isCurrentlyExpired ? 'Expired' : `${daysLeft}d Left`}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-28">
        <div className="max-w-2xl mx-auto">
          {/* Compact Current Plan Status Strip */}
          <div
            className={`rounded-2xl p-3.5 mb-5 border flex flex-wrap items-center justify-between gap-2 text-xs ${
              isOwnerAccount
                ? 'bg-slate-800 border-sky-500/30 text-sky-200'
                : isCurrentlyExpired
                ? 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                : 'bg-slate-800/80 border-slate-700/80 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Clock
                className={`w-4 h-4 shrink-0 ${
                  isOwnerAccount
                    ? 'text-sky-400'
                    : isCurrentlyExpired
                    ? 'text-rose-400'
                    : 'text-orange-400'
                }`}
              />
              <div className="min-w-0">
                <span className="font-bold text-white block truncate">{currentPlanLabel}</span>
                {!isOwnerAccount && (
                  <p className="text-[11px] text-slate-400">
                    {isCurrentlyExpired
                      ? `Expired on ${formattedExpiry}. Choose a plan below to renew.`
                      : `Active until ${formattedExpiry} (${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining)`}
                  </p>
                )}
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
              Till <strong className="text-slate-200 font-mono">1833804</strong>
            </span>
          </div>

          <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl px-4 py-3 mb-4 text-[11px] text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span>• Fast POS Sales</span>
            <span>• Live Stock Tracking</span>
            <span>• M-Pesa STK &amp; Till</span>
            <span>• Multi-Shop Support</span>
            <span>• Local &amp; Email Backups</span>
            <span>• 7-Day Free Trial</span>
          </div>

          {/* Stacked Subscription Plan Cards */}
          <div className="space-y-0">
            {PLAN_LIST.map((item) => {
              const isSelected = selectedPlan === item.id;
              const isFeatured = Boolean(item.featured);

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectPlan(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectPlan(item.id);
                    }
                  }}
                  className={`rounded-2xl p-4 mb-4 shadow-lg border transition cursor-pointer flex items-center justify-between gap-3 ${
                    isFeatured
                      ? `bg-gradient-to-r from-orange-600 to-amber-600 border-orange-500 text-white ${
                          isSelected ? 'ring-2 ring-white/80' : 'hover:brightness-105'
                        }`
                      : `bg-slate-800 ${
                          isSelected
                            ? 'border-orange-400 ring-2 ring-orange-500/30'
                            : 'border-slate-700/80 hover:border-slate-500'
                        }`
                  }`}
                >
                  {/* Left: Calendar Icon + Duration / Price / Unlimited Usage */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        isFeatured
                          ? 'bg-white/15 border border-white/25 text-white'
                          : 'bg-slate-900/90 border border-slate-700/80 text-orange-400'
                      }`}
                    >
                      <Calendar className="w-6 h-6" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2
                          className={`text-base sm:text-lg font-bold tracking-tight ${
                            isFeatured ? 'text-white' : 'text-slate-100'
                          }`}
                        >
                          {item.title}
                        </h2>
                        {item.badge && (
                          <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[10px] font-extrabold tracking-wider uppercase whitespace-nowrap">
                            {item.badge}
                          </span>
                        )}
                      </div>

                      <div
                        className={`text-base sm:text-lg font-extrabold tabular-nums leading-snug ${
                          isFeatured ? 'text-white' : 'text-orange-400'
                        }`}
                      >
                        KE {item.price.toLocaleString()}
                      </div>

                      <p
                        className={`text-xs font-medium ${
                          isFeatured ? 'text-orange-100' : 'text-slate-400'
                        }`}
                      >
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Right: Select / Selected Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPlan(item.id);
                    }}
                    className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium inline-flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap ${
                      isFeatured
                        ? isSelected
                          ? 'bg-white text-orange-700 border border-white font-bold shadow-sm'
                          : 'border border-white/75 bg-white/10 text-white hover:bg-white/20'
                        : isSelected
                        ? 'bg-orange-500 text-slate-950 border border-orange-400 font-bold shadow-sm'
                        : 'border border-orange-400/60 text-orange-400 hover:bg-orange-500/10'
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4 shrink-0" />}
                    <span>{isSelected ? 'Selected' : 'Select'}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* M-Pesa Payment Panel */}
          <div ref={checkoutRef} id="mpesa-checkout-panel" className="space-y-4 pt-2">
            {/* Feedback Banners */}
            {paymentError && (
              <div className="bg-rose-950/60 border border-rose-500/40 rounded-2xl p-3.5 text-xs text-rose-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{paymentError}</span>
              </div>
            )}

            {stkStatusMessage && (
              <div className="bg-sky-950/60 border border-sky-500/40 rounded-2xl p-3.5 text-xs text-sky-200 flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                <span>{stkStatusMessage}</span>
              </div>
            )}

            {paymentSuccess && (
              <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-3.5 text-xs text-emerald-200 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{paymentSuccess}</span>
              </div>
            )}

            {/* Instant M-Pesa STK Push */}
            <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <h3 className="text-sm font-bold text-white truncate">
                    Pay {plan.title} via M-Pesa
                  </h3>
                </div>
                <span className="text-sm font-extrabold text-orange-400 tabular-nums whitespace-nowrap">
                  KE {plan.price.toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="tel"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="M-Pesa Number (07... or 2547...)"
                  className="flex-1 min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={handleStkPushPayment}
                  disabled={isSendingStk || isVerifyingManual}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-extrabold text-sm inline-flex items-center justify-center gap-2 cursor-pointer transition shrink-0 whitespace-nowrap"
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

            {/* Manual M-Pesa Receipt Code Fallback */}
            <form
              onSubmit={handleVerifyManualReceipt}
              className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg space-y-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-orange-400 shrink-0" />
                  <span className="font-bold text-white text-sm">
                    Already Paid? Enter M-Pesa Code
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Buy Goods Till: <strong className="text-orange-300 font-mono">1833804</strong>
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Paid manually via Lipa na M-Pesa Till <strong className="text-slate-200">1833804</strong> (Rofani POS)? Paste your M-Pesa confirmation code or SMS below to extend usage immediately:
              </p>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={manualReceiptInput}
                  onChange={(e) => setManualReceiptInput(e.target.value)}
                  placeholder="e.g. QHK78M32KL or paste M-Pesa SMS"
                  className="flex-1 min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 uppercase focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  disabled={isVerifyingManual || isSendingStk || !manualReceiptInput.trim()}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-slate-950 font-bold text-sm inline-flex items-center justify-center gap-1.5 cursor-pointer transition shrink-0 whitespace-nowrap"
                >
                  {isVerifyingManual ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>{isVerifyingManual ? 'Activating...' : 'Confirm Payment'}</span>
                </button>
              </div>
            </form>

            {/* Referral Reward Card */}
            <div className="bg-slate-800/80 border border-orange-500/30 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Gift className="w-4 h-4 text-orange-400 shrink-0" />
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      Refer a Friend · Earn +30 Days Free!
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Your friend gets <strong className="text-emerald-300">22 Days Free</strong> and you automatically earn <strong className="text-orange-300">+1 Month Free</strong> on signup.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-300 text-[11px] font-bold tabular-nums whitespace-nowrap">
                  {referralCount} Referral{referralCount === 1 ? '' : 's'} ({referralCount * 30}d earned)
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                      Your Referral Code
                    </span>
                    <span className="font-mono font-extrabold text-sm text-orange-300 tracking-wide">
                      {referralCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyReferralCode}
                    className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    {copiedReferral ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleShareInviteLink}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-extrabold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition shrink-0 whitespace-nowrap"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{shareFeedback || 'Share Invite Link'}</span>
                </button>
              </div>
            </div>

            {/* Official Rofani POS Subscription Invoice & Master KRA PIN */}
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 space-y-3 text-xs shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      Subscription Tax Invoice
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Issued by Rofani POS • KRA PIN:{' '}
                      <strong className="font-mono text-sky-300">{ROFANI_MASTER_KRA_PIN}</strong>
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 font-mono text-[11px] font-bold">
                  PIN: {ROFANI_MASTER_KRA_PIN}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 bg-slate-900/90 border border-slate-700/70 rounded-xl p-3 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Billed To Store</span>
                  <span className="font-bold text-white truncate block">{activeStoreTitle}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Selected / Active Plan</span>
                  <span className="font-bold text-orange-300">
                    {storeProfile?.lastPaymentAmount
                      ? `${currentPlanLabel} (KE ${storeProfile.lastPaymentAmount.toLocaleString()})`
                      : `${plan.name} (KE ${plan.price.toLocaleString()})`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Store Tax PIN (Optional)</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {storeProfile?.kraPin || 'Not Required'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Payment Ref / Till</span>
                  <span className="font-mono font-semibold text-emerald-300">
                    {storeProfile?.lastPaymentRef || 'Till 1833804'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const invNo = storeProfile?.lastPaymentRef
                    ? `ROF-${storeProfile.lastPaymentRef}`
                    : `ROF-${Date.now().toString().slice(-6)}`;
                  exportSubscriptionInvoicePDF({
                    invoiceNumber: invNo,
                    storeName: activeStoreTitle,
                    storeEmail: storeProfile?.ownerEmail,
                    storePhone: storeProfile?.phone || mpesaPhone,
                    customerKraPin: storeProfile?.kraPin,
                    planName: storeProfile?.lastPaymentAmount ? currentPlanLabel : plan.name,
                    durationDays: plan.durationDays,
                    amount: storeProfile?.lastPaymentAmount || plan.price,
                    paymentRef: storeProfile?.lastPaymentRef || `TILL-1833804-${selectedPlan.toUpperCase()}`,
                    paymentMethod: storeProfile?.lastPaymentMethod || 'mpesa_till',
                    issuedAt: storeProfile?.lastPaymentAt || new Date().toISOString(),
                    expiresAt: storeProfile?.expiresAt,
                  });
                }}
                className="w-full min-h-[42px] px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs inline-flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Download Subscription Invoice (PDF · KRA PIN {ROFANI_MASTER_KRA_PIN})</span>
              </button>
            </div>

            {/* Rofani POS Customer Care */}
            <CustomerCareSupportCard
              title="Need Help Extending Usage or Setting Up M-Pesa?"
              subtitle="Reach Rofani POS support directly via WhatsApp, phone call, or email"
            />
          </div>
        </div>
      </main>

      {/* Quick Tools Compact Popover (above bottom-right FABs) */}
      {showQuickTools && (
        <div className="fixed bottom-20 right-5 z-[220] w-72 bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-2xl space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <Calculator className="w-4 h-4 text-orange-400" />
              <span>Quick Tools</span>
            </div>
            <button
              type="button"
              onClick={() => setShowQuickTools(false)}
              aria-label="Close Quick Tools"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 block">Quick Calculator</label>
            <input
              type="text"
              value={calcInput}
              onChange={(e) => setCalcInput(e.target.value)}
              placeholder="e.g. 2650 / 6"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <div className="flex items-center justify-between text-[11px] px-1">
              <span className="text-slate-400">Result:</span>
              <span className="font-bold text-orange-400 tabular-nums">
                {evaluateMiniCalc(calcInput)}
              </span>
            </div>
          </div>

          <div className="pt-1 border-t border-slate-700/80 flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] text-slate-400 block">Buy Goods Till</span>
              <span className="font-mono font-bold text-sm text-white">1833804</span>
            </div>
            <button
              type="button"
              onClick={handleCopyTill}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-700 border border-slate-600 text-orange-400 font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {copiedTill ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Till</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Floating AI & Quick Tools Action Buttons (Bottom-Right) */}
      <div className="fixed bottom-5 right-5 z-[220] flex items-center gap-2.5">
        {onOpenAiAssistant && (
          <button
            type="button"
            onClick={onOpenAiAssistant}
            aria-label="Open AI Assistant"
            className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-extrabold text-sm tracking-tight shadow-xl flex items-center justify-center transition cursor-pointer"
          >
            ai
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowQuickTools((prev) => !prev)}
          aria-label="Quick Tools"
          className={`w-12 h-12 rounded-full border shadow-xl flex items-center justify-center transition cursor-pointer ${
            showQuickTools
              ? 'bg-orange-500 border-orange-400 text-slate-950'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-orange-400'
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
