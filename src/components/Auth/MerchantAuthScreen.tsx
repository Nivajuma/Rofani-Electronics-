import React, { useState } from 'react';
import {
  Store,
  ShieldCheck,
  Cloud,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  LogIn,
  Lock,
} from 'lucide-react';
import {
  signInWithGoogleForCloud,
  signInWithGoogleRedirectForCloud,
  getFirebaseAuthConsoleUrl,
} from '../../lib/firebase';

interface MerchantAuthScreenProps {
  hasOfflineOwnerCache?: boolean;
  onContinueOfflineOwner?: () => void;
}

export const MerchantAuthScreen: React.FC<MerchantAuthScreenProps> = ({
  hasOfflineOwnerCache = false,
  onContinueOfflineOwner,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showRedirectFallback, setShowRedirectFallback] = useState(false);
  const [unauthorizedDomainInfo, setUnauthorizedDomainInfo] = useState<{
    hostname: string;
    consoleUrl: string;
  } | null>(null);

  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMsg(null);
    setUnauthorizedDomainInfo(null);
    try {
      await signInWithGoogleForCloud();
    } catch (err: any) {
      if (
        err?.isUnauthorizedDomain ||
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('unauthorized-domain')
      ) {
        setUnauthorizedDomainInfo({
          hostname:
            err?.hostname ||
            (typeof window !== 'undefined' ? window.location.hostname : 'vercel.app'),
          consoleUrl: err?.consoleUrl || getFirebaseAuthConsoleUrl(),
        });
      }
      if (
        err?.isPopupBlocked ||
        err?.code === 'auth/popup-blocked' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/popup-closed-by-user'
      ) {
        setShowRedirectFallback(true);
      }
      setErrorMsg(
        err?.message || 'Sign-in did not complete. Please allow popups or try Redirect Sign-In.'
      );
      setIsLoading(false);
    }
  };

  const handleRedirectSignIn = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogleRedirectForCloud();
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Could not start Google redirect sign-in.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-5 bg-[#1e293b] border border-slate-700/70 rounded-3xl overflow-hidden shadow-2xl">
        {/* Left Value Proposition */}
        <div className="lg:col-span-3 p-6 sm:p-8 flex flex-col justify-between bg-gradient-to-br from-[#0f172a] via-[#162033] to-[#1e293b] border-b lg:border-b-0 lg:border-r border-slate-700/70 space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-white tracking-tight">
                  Rofani POS Cloud
                </h1>
                <p className="text-[11px] text-slate-400">
                  Multi-Tenant Retail &amp; Boutique Management SaaS
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                7-Day Free Trial for New Shopkeepers
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                Run your shop inventory, M-Pesa sales &amp; KRA reports privately.
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Every business owner gets an isolated private cloud workspace under their own account — your stock, daily sales, expenses, and customer balances stay 100% private.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="bg-[#0f172a]/80 border border-slate-700/70 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Monthly Shop Plan</span>
                  <span className="text-xs font-extrabold text-sky-400">KSh 500/mo</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Full POS, Cloud Sync, Inventory &amp; KRA Turnover Tax Reports.
                </p>
              </div>
              <div className="bg-[#0f172a]/80 border border-emerald-500/30 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Annual Business</span>
                  <span className="text-xs font-extrabold text-emerald-400">KSh 5,000/yr</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Save KSh 1,000 per year + Priority Support.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              Strict Store Isolation
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              Real-Time Firestore Sync
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              M-Pesa STK Integration
            </span>
          </div>
        </div>

        {/* Right Sign-In Panel */}
        <div className="lg:col-span-2 p-6 sm:p-8 flex flex-col justify-center space-y-5 bg-[#1e293b]">
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white">Sign In or Register Shop</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sign in with your Google account to open your existing shop or create a brand-new private store with a 7-day free trial.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-rose-950/60 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-200 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
              {unauthorizedDomainInfo && (
                <a
                  href={unauthorizedDomainInfo.consoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-300 hover:underline"
                >
                  Open Firebase Authorized Domains ({unauthorizedDomainInfo.hostname})
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-sky-500/20 transition cursor-pointer"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>{isLoading ? 'Connecting Account...' : 'Continue with Google'}</span>
            </button>

            {(showRedirectFallback || errorMsg) && (
              <button
                type="button"
                onClick={handleRedirectSignIn}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0f172a] hover:bg-slate-900 border border-slate-700 text-slate-200 font-semibold text-xs transition cursor-pointer"
              >
                Popup blocked? Sign in via Redirect
              </button>
            )}
          </div>

          <div className="bg-[#0f172a]/70 border border-slate-700/60 rounded-2xl p-3.5 space-y-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>What happens next?</span>
            </div>
            <p className="leading-relaxed">
              • <strong className="text-white">New shopkeepers:</strong> Enter your Store Name, Phone, KRA PIN &amp; M-Pesa Till to start your 7-day free trial immediately.
            </p>
            <p className="leading-relaxed">
              • <strong className="text-white">Existing owners:</strong> Your private store catalog, sales &amp; settings load automatically.
            </p>
          </div>

          {hasOfflineOwnerCache && onContinueOfflineOwner && (
            <button
              type="button"
              onClick={onContinueOfflineOwner}
              className="w-full py-2 text-[11px] font-semibold text-slate-400 hover:text-sky-300 underline underline-offset-4 transition cursor-pointer"
            >
              Continue with cached Rofani Electronics offline terminal
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
