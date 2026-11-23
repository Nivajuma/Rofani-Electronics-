import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUp,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  Gift,
  Headphones,
  Mail,
  MessageCircle,
  Package,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  Lightbulb,
} from 'lucide-react';
import {
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_HREF,
  SUPPORT_PHONE_PRIMARY,
  SUPPORT_PHONE_PRIMARY_HREF,
  SUPPORT_PHONE_SECONDARY,
  SUPPORT_PHONE_SECONDARY_HREF,
  SUPPORT_WHATSAPP_NUMBER,
  SUPPORT_WHATSAPP_URL,
} from '../../utils/supportConfig';

export interface AboutUsViewProps {
  onBack: () => void;
  onOpenPlansPricing?: () => void;
  onOpenAiAssistant?: () => void;
  onOpenSuggestFeature?: () => void;
  inPhoneFrame?: boolean;
}

const FEATURE_CARDS = [
  {
    id: 'stock-manager',
    title: 'Stock Manager',
    icon: Package,
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-500/15 border-sky-500/30',
    description:
      'Track stock levels, product history, re-stocking, and inventory on the go with low-stock alerts and barcode support.',
  },
  {
    id: 'sales-payments',
    title: 'Sales & Payments',
    icon: ShoppingBag,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    description:
      'Fast checkout, receipt/invoice management, and flexible cash and M-Pesa workflows tailored for busy counters.',
  },
  {
    id: 'employee-management',
    title: 'Employee Management',
    icon: Users,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/15 border-amber-500/30',
    description:
      'Let attendants record sales while keeping profit, cost, and admin controls locked behind role-based PIN permissions.',
  },
  {
    id: 'multi-shop',
    title: 'Business Monitoring & Multi-Shop',
    icon: Building2,
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/15 border-indigo-500/30',
    description:
      'Manage one shop or multiple branches under a single account with private store isolation across every outlet.',
  },
  {
    id: 'expenses-backups',
    title: 'Expense Tracking & Backups',
    icon: Database,
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/15 border-cyan-500/30',
    description:
      'Log daily expenses and safeguard records with real-time cloud sync plus one-tap local device and email backups.',
  },
  {
    id: 'smart-ai',
    title: 'Smart AI Assistant',
    icon: Sparkles,
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-500/15 border-orange-500/30',
    description:
      'Step-by-step guidance, AI camera item scanning, and practical business tips available in English and Swahili.',
  },
];

const WHY_CHOOSE_ITEMS = [
  {
    id: 'trial',
    title: '7-Day Free Trial',
    icon: Clock,
    accent: 'text-sky-400 bg-sky-500/15 border-sky-500/30',
    description:
      'Start immediately with zero setup fees. Test POS sales, stock tracking, and M-Pesa options free for 7 days.',
  },
  {
    id: 'referral',
    title: '+30-Day Referral Rewards',
    icon: Gift,
    accent: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
    description:
      'Share your store referral code with other traders and automatically earn +30 extra days whenever they activate.',
  },
  {
    id: 'backups',
    title: 'Local & Email Backups',
    icon: ShieldCheck,
    accent: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
    description:
      'Keep working smoothly even when internet drops, and protect records with instant device downloads and daily email backups.',
  },
  {
    id: 'support',
    title: 'Direct Human Support',
    icon: Headphones,
    accent: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
    description:
      'Reach a real support team by WhatsApp, direct phone call, or email whenever your team needs fast hands-on help.',
  },
];

export const AboutUsView: React.FC<AboutUsViewProps> = ({
  onBack,
  onOpenPlansPricing,
  onOpenAiAssistant,
  onOpenSuggestFeature,
  inPhoneFrame = false,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;

    const findScrollParent = (): HTMLElement | null => {
      let current: HTMLElement | null = rootEl.parentElement;
      while (current) {
        const style = window.getComputedStyle(current);
        if (/(auto|scroll)/.test(style.overflowY)) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    };

    const scrollParent = findScrollParent();

    const handleScroll = () => {
      const parentTop = scrollParent ? scrollParent.scrollTop : 0;
      const winTop = window.scrollY || document.documentElement.scrollTop || 0;
      setShowScrollTop(parentTop > 180 || winTop > 180);
    };

    if (scrollParent) {
      scrollParent.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      if (scrollParent) {
        scrollParent.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleScrollToTop = () => {
    const rootEl = rootRef.current;
    if (rootEl) {
      let current: HTMLElement | null = rootEl.parentElement;
      while (current) {
        const style = window.getComputedStyle(current);
        if (/(auto|scroll)/.test(style.overflowY) && current.scrollTop > 0) {
          current.scrollTo({ top: 0, behavior: 'smooth' });
        }
        current = current.parentElement;
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      ref={rootRef}
      className="min-h-full bg-slate-900 text-slate-100 pb-24"
    >
      {/* Top Sticky Navigation Bar */}
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 flex items-center justify-center shrink-0 transition cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-white truncate">
              About Us &amp; Why Choose Rofani POS
            </h1>
            <p className="text-[11px] text-slate-400 truncate">
              Shop management built for speed, accuracy &amp; growth
            </p>
          </div>
        </div>
        {onOpenPlansPricing && (
          <button
            type="button"
            onClick={onOpenPlansPricing}
            className="px-3 py-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-300 text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer"
          >
            7-Day Free Trial
          </button>
        )}
      </header>

      <div className={`mx-auto px-4 sm:px-6 pt-6 space-y-8 ${inPhoneFrame ? 'max-w-md' : 'max-w-5xl'}`}>
        {/* Hero Section */}
        <section className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 sm:p-7 space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-block w-8 border-b-2 border-orange-500" />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange-400">
              ABOUT US
            </span>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl sm:text-3xl font-extrabold text-white leading-tight [text-wrap:balance]">
              Rofani POS — Empowering Shops, Market Traders &amp; Growing Businesses
            </h2>
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-1 w-16 rounded-full bg-blue-500" />
              <span className="h-1 w-10 rounded-full bg-orange-500" />
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
            Rofani POS brings inventory control, counter checkout, staff accountability, expense logging,
            and multi-branch visibility together inside one clean system designed for busy retail shops,
            hardware stores, boutiques, electronics dealers, and wholesale counters.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {onOpenPlansPricing && (
              <button
                type="button"
                onClick={onOpenPlansPricing}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer"
              >
                Explore Plans &amp; 7-Day Trial
              </button>
            )}
            {onOpenAiAssistant && (
              <button
                type="button"
                onClick={onOpenAiAssistant}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span>Ask Smart AI Assistant</span>
              </button>
            )}
            {onOpenSuggestFeature && (
              <button
                type="button"
                onClick={onOpenSuggestFeature}
                className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Suggest a Feature</span>
              </button>
            )}
          </div>
        </section>

        {/* Core Capabilities Feature Cards */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Core Capabilities for Daily Operations
              </h3>
              <p className="text-xs text-slate-400">
                Practical tools engineered to save time at the counter and protect your stock
              </p>
            </div>
          </div>

          <div className={`grid gap-3.5 ${inPhoneFrame ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {FEATURE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.id}
                  className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 space-y-2.5 hover:border-slate-600 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${card.iconBg}`}>
                      <Icon className={`w-5 h-5 ${card.iconColor}`} />
                    </div>
                    <h4 className="text-sm font-bold text-orange-400 leading-snug">
                      {card.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {card.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-block w-8 border-b-2 border-orange-500" />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange-400">
                WHY CHOOSE US
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white [text-wrap:balance]">
              Built for Real Shop Operations — Simple, Fast &amp; Reliable
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              Every detail of Rofani POS focuses on everyday clarity so shop owners and attendants can serve customers smoothly without complexity.
            </p>
          </div>

          <div className={`grid gap-3.5 ${inPhoneFrame ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {WHY_CHOOSE_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 flex items-start gap-3"
                >
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${item.accent}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <h4 className="text-xs sm:text-sm font-bold text-orange-400">
                        {item.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact & Support Card */}
        <section className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Contact &amp; Support
              </h3>
              <p className="text-xs text-slate-400">
                Direct onboarding help, branch setup assistance &amp; customer care
              </p>
            </div>
          </div>

          <div className={`grid gap-3 ${inPhoneFrame ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
            <a
              href={SUPPORT_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 bg-emerald-950/50 hover:bg-emerald-950/80 border border-emerald-700/50 rounded-xl p-3.5 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <MessageCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-emerald-300">WhatsApp Support</div>
                  <div className="text-xs sm:text-sm font-bold font-mono tabular-nums text-white truncate">
                    {SUPPORT_WHATSAPP_NUMBER}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-300 whitespace-nowrap shrink-0">
                Chat Now
              </span>
            </a>

            <a
              href={SUPPORT_PHONE_PRIMARY_HREF}
              className="flex items-center justify-between gap-3 bg-slate-900/90 hover:bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Phone className="w-5 h-5 text-sky-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-slate-400">Direct Call Line 1</div>
                  <div className="text-xs sm:text-sm font-bold font-mono tabular-nums text-white truncate">
                    {SUPPORT_PHONE_PRIMARY}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-sky-400 whitespace-nowrap shrink-0">
                Call
              </span>
            </a>

            <a
              href={SUPPORT_PHONE_SECONDARY_HREF}
              className="flex items-center justify-between gap-3 bg-slate-900/90 hover:bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Phone className="w-5 h-5 text-sky-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-slate-400">Direct Call Line 2</div>
                  <div className="text-xs sm:text-sm font-bold font-mono tabular-nums text-white truncate">
                    {SUPPORT_PHONE_SECONDARY}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-sky-400 whitespace-nowrap shrink-0">
                Call
              </span>
            </a>

            <a
              href={SUPPORT_EMAIL_HREF}
              className="flex items-center justify-between gap-3 bg-slate-900/90 hover:bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Mail className="w-5 h-5 text-orange-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-slate-400">Email Support</div>
                  <div className="text-xs sm:text-sm font-bold text-white truncate">
                    {SUPPORT_EMAIL}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-orange-400 whitespace-nowrap shrink-0">
                Email
              </span>
            </a>
          </div>
        </section>
      </div>

      {/* Floating Scroll-to-Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={handleScrollToTop}
          aria-label="Scroll to top"
          title="Back to top"
          className="fixed bottom-20 sm:bottom-6 right-5 z-40 w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/60 border border-blue-400/50 flex items-center justify-center transition cursor-pointer"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
