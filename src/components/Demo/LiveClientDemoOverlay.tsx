import React, { useState } from 'react';
import {
  Play,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  LogOut,
  Copy,
  Check,
  ShoppingCart,
  Tag,
  BarChart3,
  GitBranch,
  CreditCard,
  Compass,
  X,
  ArrowRight,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { TabKey } from '../../utils/permissions';

export interface LiveClientDemoOverlayProps {
  activeTab: TabKey;
  deviceFormat: 'phone' | 'computer';
  storeName: string;
  productsCount: number;
  transactionsCount: number;
  branchCount: number;
  isSignedInAccount: boolean;
  onSelectTab: (tab: TabKey) => void;
  onToggleDeviceFormat: () => void;
  onOpenBarcodePrinter: () => void;
  onOpenMultiBranch: () => void;
  onOpenBusinessCard: () => void;
  onResetDemo: () => void;
  onExitDemo: () => void;
}

interface DemoTourStep {
  id: string;
  title: string;
  headline: string;
  mechanism: string;
  outcome: string;
  ctaLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  tab: TabKey;
  actionType: 'tab' | 'barcode' | 'multibranch' | 'card';
}

const DEMO_TOUR_STEPS: DemoTourStep[] = [
  {
    id: 'pos-checkout',
    title: 'Fast Sell & M-Pesa Counter',
    headline: 'Complete cash, credit & M-Pesa Till sales in under 10 seconds.',
    mechanism:
      'Tap items or scan barcodes into the active cart, apply quick discounts, split Cash + M-Pesa payments, and issue itemized receipts or WhatsApp bills.',
    outcome: 'Eliminate queue bottlenecks and record every shilling automatically.',
    ctaLabel: 'Open Sell Counter',
    icon: ShoppingCart,
    tab: 'pos',
    actionType: 'tab',
  },
  {
    id: 'inventory-labels',
    title: 'Stock Control & A4 Barcode Labels',
    headline: 'Track 300+ products & print Small, Medium or Large A4 price tags.',
    mechanism:
      'Manage unit prices, wholesale rates, low-stock reorder alerts, and generate A4 sheets with 40 (2x1"), 10 (3x2"), or 8 (4x2.5") price tags per page.',
    outcome: 'Prevent dead stock, stop shrinkage, and shelf-tag new arrivals in minutes.',
    ctaLabel: 'Preview Barcode Printer',
    icon: Tag,
    tab: 'inventory',
    actionType: 'barcode',
  },
  {
    id: 'profit-payroll',
    title: 'Live Profit, Expenses & Commissions',
    headline: 'See true daily net profit after costs, expenses, and staff wages.',
    mechanism:
      'Every sale calculates gross margin against cost price while deducting logged shop expenses, worker salaries, advances, and sales commissions.',
    outcome: 'Know exactly how much the business earned today—not just till cash.',
    ctaLabel: 'Open Profit Reports',
    icon: BarChart3,
    tab: 'reports',
    actionType: 'tab',
  },
  {
    id: 'multi-branch',
    title: 'Multi-Branch Business Group',
    headline: 'Run multiple shops under one group with private stock per branch.',
    mechanism:
      'Switch cleanly between Rofani Demo Flagship and Westlands Branch while viewing combined group sales, staff transfers, and variance highlights.',
    outcome: 'Expand from one shop to a full chain without mixing branch inventory.',
    ctaLabel: 'Open Multi-Branch Hub',
    icon: GitBranch,
    tab: 'menu',
    actionType: 'multibranch',
  },
  {
    id: 'card-security',
    title: 'Digital Business Card & Shop Security',
    headline: 'Share a scannable store QR card and lock staff actions by PIN.',
    mechanism:
      'Generate a branded Digital Business Card with referral rewards, run 9:00 PM closing summaries, and restrict cost/profit visibility per role.',
    outcome: 'Win repeat customers and protect sensitive margins when you step away.',
    ctaLabel: 'Open Business Card',
    icon: CreditCard,
    tab: 'settings',
    actionType: 'card',
  },
];

export const LiveClientDemoOverlay: React.FC<LiveClientDemoOverlayProps> = ({
  deviceFormat,
  storeName,
  productsCount,
  transactionsCount,
  branchCount,
  isSignedInAccount,
  onSelectTab,
  onToggleDeviceFormat,
  onOpenBarcodePrinter,
  onOpenMultiBranch,
  onOpenBusinessCard,
  onResetDemo,
  onExitDemo,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [justReset, setJustReset] = useState(false);

  const currentStep = DEMO_TOUR_STEPS[stepIndex] || DEMO_TOUR_STEPS[0];

  const runStepAction = (step: DemoTourStep) => {
    if (step.actionType === 'barcode') {
      onSelectTab('inventory');
      onOpenBarcodePrinter();
    } else if (step.actionType === 'multibranch') {
      onOpenMultiBranch();
    } else if (step.actionType === 'card') {
      onOpenBusinessCard();
    } else {
      onSelectTab(step.tab);
    }
  };

  const handleGoToStep = (nextIdx: number, executeAction: boolean = true) => {
    const clamped =
      ((nextIdx % DEMO_TOUR_STEPS.length) + DEMO_TOUR_STEPS.length) %
      DEMO_TOUR_STEPS.length;
    setStepIndex(clamped);
    if (executeAction) {
      runStepAction(DEMO_TOUR_STEPS[clamped]);
    }
  };

  const handleCopyDemoLink = async () => {
    const demoUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/?demo=1`
        : 'https://rofani-electronics.vercel.app/?demo=1';
    try {
      await navigator.clipboard.writeText(demoUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      setCopiedLink(false);
    }
  };

  const handleTriggerReset = () => {
    onResetDemo();
    setJustReset(true);
    window.setTimeout(() => setJustReset(false), 2000);
  };

  return (
    <>
      {/* Compact Single-Row Presenter Strip (never overlaps header/bottom nav) */}
      <div className="shrink-0 w-full bg-slate-950 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between gap-2 text-xs z-40 print:hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-sky-500/15 border border-sky-500/35 text-sky-300 font-bold whitespace-nowrap">
            <Play className="w-3 h-3 fill-current" />
            <span>Client Demo</span>
          </div>
          <span className="hidden md:inline text-slate-300 font-medium truncate">
            {storeName}
          </span>
          <span className="hidden lg:inline text-slate-500 font-mono tabular-nums whitespace-nowrap">
            {productsCount} items · {transactionsCount} sales · {branchCount} branches
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsTourOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold whitespace-nowrap transition cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            <span>Guided Tour</span>
            <span className="font-mono tabular-nums text-sky-300 text-[11px]">
              {stepIndex + 1}/{DEMO_TOUR_STEPS.length}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCopyDemoLink}
            title="Copy shareable live client demo URL (?demo=1)"
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium whitespace-nowrap transition cursor-pointer"
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{copiedLink ? 'Link Copied' : 'Demo Link'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleDeviceFormat}
            title={
              deviceFormat === 'phone'
                ? 'Switch to Desktop Presenter View'
                : 'Switch to Mobile Phone View'
            }
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium whitespace-nowrap transition cursor-pointer"
          >
            {deviceFormat === 'phone' ? (
              <Monitor className="w-3.5 h-3.5 text-sky-400" />
            ) : (
              <Smartphone className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span>{deviceFormat === 'phone' ? 'Desktop' : 'Mobile'}</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerReset}
            title="Reset sandbox demo data back to original sample state"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium whitespace-nowrap transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{justReset ? 'Reset Done' : 'Reset'}</span>
          </button>

          <button
            type="button"
            onClick={onExitDemo}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold whitespace-nowrap transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isSignedInAccount ? 'Exit Demo' : 'Start Free Trial'}</span>
          </button>
        </div>
      </div>

      {/* Interactive 5-Step Guided Client Walkthrough Modal */}
      {isTourOpen && (
        <div
          className="fixed inset-0 z-[290] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsTourOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-sky-400">
                  <span>Live Client Walkthrough</span>
                  <span className="text-slate-500">·</span>
                  <span className="font-mono tabular-nums text-slate-300">
                    Step {stepIndex + 1} of {DEMO_TOUR_STEPS.length}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white truncate mt-0.5">
                  {currentStep.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTourOpen(false)}
                className="p-1.5 rounded-lg bg-slate-900/70 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
                aria-label="Close guided tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Progress Tabs */}
            <div className="px-5 pt-4 grid grid-cols-5 gap-1.5">
              {DEMO_TOUR_STEPS.map((step, idx) => {
                const isActive = idx === stepIndex;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleGoToStep(idx, false)}
                    className={`py-2 px-2 rounded-xl border text-left transition cursor-pointer ${
                      isActive
                        ? 'bg-sky-500/15 border-sky-500 text-white'
                        : 'bg-slate-800/60 border-slate-700/70 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-mono tabular-nums text-[10px] font-bold text-sky-400">
                      0{idx + 1}
                    </div>
                    <div className="text-[11px] font-semibold truncate mt-0.5">
                      {step.title.split(' ')[0]}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Step Body */}
            <div className="p-5 space-y-4">
              <div className="bg-slate-800 border border-slate-700/80 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
                    <currentStep.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm sm:text-base font-bold text-white leading-snug">
                      {currentStep.headline}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1.5">
                      {currentStep.mechanism}
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-700/70 flex items-center justify-between gap-2 text-xs">
                  <span className="text-emerald-300 font-semibold">
                    Outcome: {currentStep.outcome}
                  </span>
                </div>
              </div>

              {/* Quick Presenter Utilities */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleCopyDemoLink}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition cursor-pointer"
                >
                  {copiedLink ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  <span>{copiedLink ? 'Demo URL Copied' : 'Copy Client Link'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleTriggerReset}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>{justReset ? 'Sandbox Reset' : 'Reset Demo Data'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsTourOpen(false);
                    onToggleDeviceFormat();
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition cursor-pointer"
                >
                  {deviceFormat === 'phone' ? (
                    <Monitor className="w-3.5 h-3.5 text-sky-400" />
                  ) : (
                    <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  <span>
                    {deviceFormat === 'phone' ? 'Desktop Mode' : 'Mobile Mode'}
                  </span>
                </button>
              </div>
            </div>

            {/* Footer Controls */}
            <div className="px-5 py-3.5 bg-slate-800/60 border-t border-slate-700/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGoToStep(stepIndex - 1, false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap transition cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGoToStep(stepIndex + 1, false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap transition cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsTourOpen(false);
                  runStepAction(currentStep);
                }}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold inline-flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer"
              >
                <span>{currentStep.ctaLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
