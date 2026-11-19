import React, { useState, useEffect } from 'react';
import {
  Store,
  Phone,
  FileText,
  Smartphone,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Gift,
} from 'lucide-react';
import { signOutFromCloud } from '../../lib/firebase';
import { lookupReferralCode, normalizeReferralCode } from '../../lib/cloudSync';
import { ReferralCodeLookup } from '../../types';

interface StoreOnboardingModalProps {
  userEmail: string;
  userDisplayName?: string;
  initialReferralCode?: string;
  onCreateStore: (data: {
    storeName: string;
    phone: string;
    kraPin: string;
    mpesaShortcode: string;
    mpesaShortcodeType: 'till' | 'paybill';
    referralCode?: string;
  }) => Promise<void>;
}

export const StoreOnboardingModal: React.FC<StoreOnboardingModalProps> = ({
  userEmail,
  userDisplayName,
  initialReferralCode = '',
  onCreateStore,
}) => {
  const [storeName, setStoreName] = useState(
    userDisplayName ? `${userDisplayName}'s Shop` : ''
  );
  const [phone, setPhone] = useState('');
  const [kraPin, setKraPin] = useState('');
  const [mpesaShortcodeType, setMpesaShortcodeType] = useState<'till' | 'paybill'>('till');
  const [mpesaShortcode, setMpesaShortcode] = useState('');
  const [referralCode, setReferralCode] = useState(normalizeReferralCode(initialReferralCode));
  const [matchedReferrer, setMatchedReferrer] = useState<ReferralCodeLookup | null>(null);
  const [referralCheckStatus, setReferralCheckStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const clean = normalizeReferralCode(referralCode);
    if (!clean || clean.length < 4) {
      setMatchedReferrer(null);
      setReferralCheckStatus('idle');
      return;
    }

    let cancelled = false;
    setReferralCheckStatus('checking');
    const timer = setTimeout(() => {
      lookupReferralCode(clean)
        .then((res) => {
          if (cancelled) return;
          if (res) {
            setMatchedReferrer(res);
            setReferralCheckStatus('valid');
          } else {
            setMatchedReferrer(null);
            setReferralCheckStatus('invalid');
          }
        })
        .catch(() => {
          if (!cancelled) {
            setMatchedReferrer(null);
            setReferralCheckStatus('idle');
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [referralCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!storeName.trim()) {
      setErrorMsg('Please enter your Store Name.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 9) {
      setErrorMsg('Please enter a valid business Phone Number (e.g. 0712345678).');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateStore({
        storeName: storeName.trim(),
        phone: phone.trim(),
        kraPin: kraPin.trim().toUpperCase(),
        mpesaShortcode: mpesaShortcode.trim(),
        mpesaShortcodeType,
        referralCode: referralCode.trim() ? normalizeReferralCode(referralCode) : undefined,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not create your store profile. Please try again.');
      setIsSubmitting(false);
    }
  };

  const hasValidReferral = referralCheckStatus === 'valid' && Boolean(matchedReferrer);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg bg-[#1e293b] border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-3 border-b border-slate-700/70 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-white tracking-tight">
                Set Up Your Private Store
              </h1>
              <p className="text-[11px] text-slate-400 truncate max-w-[240px] sm:max-w-xs">
                Signed in as <span className="text-sky-300 font-semibold">{userEmail}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => signOutFromCloud()}
            className="px-2.5 py-1.5 rounded-xl bg-[#0f172a] hover:bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Switch
          </button>
        </div>

        <div
          className={`rounded-2xl p-3.5 flex items-start gap-2.5 text-xs border ${
            hasValidReferral
              ? 'bg-amber-500/10 border-amber-400/40 text-amber-100'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
          }`}
        >
          {hasValidReferral ? (
            <Gift className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-bold text-white">
              {hasValidReferral
                ? `45-Day Free Trial Unlocked (Referred by ${matchedReferrer?.storeName})!`
                : '30-Day Free Trial Activated Automatically'}
            </p>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
              {hasValidReferral
                ? `Your fellow merchant gave you +15 bonus days on top of the standard 30-day trial — and they will automatically earn +30 Days Free when you launch!`
                : 'Your store starts completely empty and 100% isolated in Cloud Firestore. Only your account can view or edit your products and sales.'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Store / Business Name <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. Kamau Smart Electronics"
                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Business Phone Number <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                KRA PIN (Optional)
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={kraPin}
                  onChange={(e) => setKraPin(e.target.value.toUpperCase())}
                  placeholder="P051234567X"
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white uppercase placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Referral Code (Optional) */}
          <div className="bg-[#0f172a]/70 border border-slate-700/70 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-amber-400" />
                Referral Code (Optional)
              </label>
              {referralCheckStatus === 'checking' && (
                <span className="text-[10px] text-sky-400 font-semibold">Checking code...</span>
              )}
              {hasValidReferral && (
                <span className="text-[10px] text-emerald-300 font-bold">
                  +15 Days Bonus Verified
                </span>
              )}
              {referralCheckStatus === 'invalid' && (
                <span className="text-[10px] text-amber-300 font-semibold">
                  Code not found (check spelling)
                </span>
              )}
            </div>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(normalizeReferralCode(e.target.value))}
              placeholder="Enter friend's code (e.g. ROFANI-NIVA78) for 45 Days Free"
              className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono uppercase placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="bg-[#0f172a]/70 border border-slate-700/70 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                M-Pesa Receiving Details (Optional)
              </span>
              <div className="inline-flex bg-[#1e293b] border border-slate-700 rounded-lg p-0.5">
                {(['till', 'paybill'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMpesaShortcodeType(type)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase cursor-pointer transition ${
                      mpesaShortcodeType === type
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-white border border-transparent'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={mpesaShortcode}
              onChange={(e) => setMpesaShortcode(e.target.value)}
              placeholder={
                mpesaShortcodeType === 'till'
                  ? 'Your Buy Goods Till Number (e.g. 5428109)'
                  : 'Your M-Pesa Paybill Number (e.g. 247247)'
              }
              className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition cursor-pointer"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>
              {isSubmitting
                ? 'Creating Private Store...'
                : hasValidReferral
                ? 'Launch My Store (45-Day Referral Trial)'
                : 'Launch My Store (30-Day Free Trial)'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
