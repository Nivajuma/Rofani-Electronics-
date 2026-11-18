import React, { useState } from 'react';
import {
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  DollarSign,
  Globe,
  FileText,
  Landmark,
  Wallet,
  Receipt,
  FileCheck,
  Cloud,
  Building2,
  Database,
  Wrench,
  Award,
  Monitor,
  TrendingUp,
  Settings,
  Bell,
  Store,
  Mail,
  X,
  HelpCircle,
  Star,
  Headphones,
  BookOpen,
  LifeBuoy,
  Share2,
  Check,
  Copy,
  RefreshCw,
  ShieldCheck,
  MessageCircle,
  ExternalLink,
  LogOut
} from 'lucide-react';
import { TabKey } from '../../utils/permissions';
import { User, StoreSubscriptionProfile } from '../../types';

export interface AppMenuViewProps {
  onSelectTab: (tab: TabKey) => void;
  onOpenCloudSync?: () => void;
  onOpenStoreManager?: () => void;
  onOpenInstallModal?: () => void;
  onOpenEmailBackup?: () => void;
  onOpenStockAlerts?: () => void;
  onOpenAiAssistant?: () => void;
  onOpenBarcodePrinter?: () => void;
  onTriggerSync?: () => Promise<any> | void;
  onSwitchToComputer: () => void;
  lowStockCount: number;
  storeName?: string;
  currentUser?: User;
  cloudSyncStatus?: 'synced' | 'syncing' | 'offline' | 'error' | 'quota_exceeded';
  inPhoneFrame?: boolean;
  isOwnerAccount?: boolean;
  storeProfile?: StoreSubscriptionProfile | null;
  onOpenPlansPricing?: () => void;
  onOpenSuperAdmin?: () => void;
  onSignOutCloud?: () => Promise<void> | void;
  cloudUserEmail?: string | null;
}

type InfoModalType =
  | null
  | 'plans'
  | 'customer_care'
  | 'share_app'
  | 'rate_app'
  | 'privacy';

export const AppMenuView: React.FC<AppMenuViewProps> = ({
  onSelectTab,
  onOpenCloudSync,
  onOpenStoreManager,
  onOpenEmailBackup,
  onOpenStockAlerts,
  onOpenAiAssistant,
  onOpenBarcodePrinter,
  onTriggerSync,
  onSwitchToComputer,
  lowStockCount,
  storeName = 'Rofani Electronics',
  currentUser,
  cloudSyncStatus = 'synced',
  inPhoneFrame = false,
  isOwnerAccount = false,
  storeProfile = null,
  onOpenPlansPricing,
  onOpenSuperAdmin,
  onSignOutCloud,
  cloudUserEmail = null
}) => {
  const [accordions, setAccordions] = useState<Record<string, boolean>>({
    sale: false,
    purchase: false,
    backup: false,
    utilities: false,
    grow: false,
    help: false
  });

  const [activeModal, setActiveModal] = useState<InfoModalType>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const toggleAccordion = (key: string) => {
    setAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const showToast = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => {
      setStatusNotice((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  const handleManualSync = async () => {
    if (onTriggerSync) {
      try {
        setIsManualSyncing(true);
        await onTriggerSync();
        showToast('Cloud sync complete. All device records are up to date.');
      } catch {
        if (onOpenCloudSync) onOpenCloudSync();
      } finally {
        setIsManualSyncing(false);
      }
    } else if (onOpenCloudSync) {
      onOpenCloudSync();
    }
  };

  const liveAppUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://rofani-pos.vercel.app';

  const handleCopyShareInstructions = () => {
    const text = `Rofani Electronics POS — Live Web App:\n${liveAppUrl}\n\nWorker Sign-In: Open link, sign in with your store PIN or Google account, and tap Cloud Sync to stay synced across devices.`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2500);
  };

  const displayName = storeName || 'Rofani Electronics';

  const syncDotClass =
    cloudSyncStatus === 'quota_exceeded'
      ? 'bg-amber-400'
      : cloudSyncStatus === 'error'
      ? 'bg-rose-400'
      : cloudSyncStatus === 'offline'
      ? 'bg-slate-400'
      : cloudSyncStatus === 'syncing' || isManualSyncing
      ? 'bg-sky-400 animate-pulse'
      : 'bg-emerald-400';

  return (
    <div className="w-full min-h-full flex-1 flex flex-col bg-[#0f172a] text-slate-100 pb-2 font-sans">
      {/* 1. Single Compact Top Mobile Header (skipped when PhoneDeviceFrame renders it above) */}
      {!inPhoneFrame && (
        <header className="sticky top-0 z-20 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800 py-2 px-3 mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-[#1e293b] border border-slate-700/80 flex items-center justify-center text-sky-400 shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <h1 className="text-sm font-bold text-white truncate leading-tight">
              {displayName}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-nowrap pr-0.5">
            <button
              type="button"
              onClick={() => {
                if (onOpenCloudSync) onOpenCloudSync();
                else handleManualSync();
              }}
              className="w-8 h-8 rounded-xl bg-[#1e293b] hover:bg-slate-800 border border-slate-700/70 text-slate-300 hover:text-white transition relative flex items-center justify-center shrink-0 cursor-pointer"
              title="Cloud Sync Status"
              aria-label="Cloud Sync Status"
            >
              <Cloud className={`w-4 h-4 ${cloudSyncStatus === 'error' ? 'text-rose-400' : 'text-sky-400'}`} />
              <span className={`w-2 h-2 rounded-full absolute top-1 right-1 ${syncDotClass}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenStockAlerts) onOpenStockAlerts();
                else onSelectTab('inventory');
              }}
              className="w-8 h-8 rounded-xl bg-[#1e293b] hover:bg-slate-800 border border-slate-700/70 text-slate-300 hover:text-white transition relative flex items-center justify-center shrink-0 overflow-visible cursor-pointer"
              title="Stock Alert Notifications"
              aria-label="Stock Alert Notifications"
            >
              <Bell className={`w-4 h-4 ${lowStockCount > 0 ? 'text-amber-400' : 'text-slate-300'}`} />
              {lowStockCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold font-mono tabular-nums flex items-center justify-center ring-2 ring-[#0f172a]">
                  {lowStockCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('settings')}
              className="w-8 h-8 rounded-xl bg-[#1e293b] hover:bg-slate-800 border border-slate-700/70 text-slate-300 hover:text-white transition flex items-center justify-center shrink-0 cursor-pointer"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </header>
      )}

      {/* Inline Dark Toast Notice */}
      {statusNotice && (
        <div className={`max-w-xl mx-auto mb-3 ${inPhoneFrame ? '' : 'px-3 sm:px-4'}`}>
          <div className="bg-[#1e293b] border border-sky-500/40 text-sky-200 px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-2 text-xs">
            <span>{statusNotice}</span>
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
              aria-label="Dismiss notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Scrollable Grouped Dark Cards */}
      <div className={`max-w-xl mx-auto ${inPhoneFrame ? 'pb-4' : 'px-3 sm:px-4 pb-4'} space-y-3 text-xs`}>
        {/* Card 1: My Business */}
        <section className="bg-[#1e293b] rounded-2xl border border-slate-700/70 overflow-hidden divide-y divide-slate-700/70">
          <div className="px-4 py-3 text-xs font-bold text-slate-300 tracking-wide">
            My Business
          </div>

          {/* Sale Accordion */}
          <div>
            <button
              type="button"
              onClick={() => toggleAccordion('sale')}
              className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition text-left cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <ShoppingBag className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />
                <span className="text-[13px] font-semibold text-white">Sale</span>
              </div>
              {accordions.sale ? (
                <ChevronUp className="w-4 h-4 text-[#38bdf8] shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>
            {accordions.sale && (
              <div className="bg-[#0f172a]/70 border-t border-slate-700/60 divide-y divide-slate-800/80 pl-11 pr-4">
                <button
                  type="button"
                  onClick={() => onSelectTab('pos')}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-slate-200 hover:text-[#38bdf8] transition cursor-pointer"
                >
                  <span className="font-medium">POS Checkout</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTab('reports')}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-slate-200 hover:text-[#38bdf8] transition cursor-pointer"
                >
                  <span className="font-medium">Sales History</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTab('reports')}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-slate-200 hover:text-[#38bdf8] transition cursor-pointer"
                >
                  <span className="font-medium">Invoices / Receipts</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            )}
          </div>

          {/* Purchase Accordion */}
          <div>
            <button
              type="button"
              onClick={() => toggleAccordion('purchase')}
              className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition text-left cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <Receipt className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />
                <span className="text-[13px] font-semibold text-white">Purchase</span>
              </div>
              {accordions.purchase ? (
                <ChevronUp className="w-4 h-4 text-[#38bdf8] shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>
            {accordions.purchase && (
              <div className="bg-[#0f172a]/70 border-t border-slate-700/60 divide-y divide-slate-800/80 pl-11 pr-4">
                <button
                  type="button"
                  onClick={() => onSelectTab('purchasing')}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-slate-200 hover:text-[#38bdf8] transition cursor-pointer"
                >
                  <span className="font-medium">Stock Purchases</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTab('purchasing')}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-slate-200 hover:text-[#38bdf8] transition cursor-pointer"
                >
                  <span className="font-medium">Supplier Restocks</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            )}
          </div>

          {/* Expenses */}
          <button
            type="button"
            onClick={() => onSelectTab('expenses')}
            className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <DollarSign className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />
              <span className="text-[13px] font-semibold text-white">Expenses</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* My Online Store */}
          <button
            type="button"
            onClick={() => onSelectTab('onlinestore')}
            className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <Globe className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />
              <span className="text-[13px] font-semibold text-white">My Online Store</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* Reports */}
          <button
            type="button"
            onClick={() => onSelectTab('reports')}
            className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <FileText className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />
              <span className="text-[13px] font-semibold text-white">Reports</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </section>

        {/* Card 2: Cash & Bank */}
        <section className="bg-[#1e293b] rounded-2xl border border-slate-700/70 overflow-hidden divide-y divide-slate-700/70">
          <div className="px-4 py-3 text-xs font-bold text-slate-300 tracking-wide">
            Cash & Bank
          </div>

          <button
            type="button"
            onClick={() => onSelectTab('cashmanagement')}
            className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <Landmark className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />
              <span className="text-[13px] font-semibold text-white">Bank Accounts</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('cashmanagement')}
            className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <Wallet className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />
              <span className="text-[13px] font-semibold text-white">Cash In-Hand</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('cashmanagement')}
            className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <FileCheck className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />
              <span className="text-[13px] font-semibold text-white">Cheques</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('cashmanagement')}
            className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <DollarSign className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />
              <span className="text-[13px] font-semibold text-white">Loan Accounts</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </section>

        {/* Card 3: Important Utilities */}
        <section className="bg-[#1e293b] rounded-2xl border border-slate-700/70 overflow-hidden divide-y divide-slate-700/70">
          <div className="px-4 py-3 text-xs font-bold text-slate-300 tracking-wide">
            Important Utilities
          </div>

          <button
            type="button"
            onClick={() => {
              if (onOpenCloudSync) onOpenCloudSync();
              else handleManualSync();
            }}
            className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <Cloud className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />
              <span className="text-[13px] font-semibold text-white">Sync & Share</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenStoreManager) onOpenStoreManager();
              else onSelectTab('settings');
            }}
            className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <Building2 className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />
              <span className="text-[13px] font-semibold text-white">Manage Companies</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* Backup/Restore Accordion */}
          <div>
            <button
              type="button"
              onClick={() => toggleAccordion('backup')}
              className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition text-left cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <Database className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />
                <span className="text-[13px] font-semibold text-white">Backup/Restore</span>
              </div>
              {accordions.backup ? (
                <ChevronUp className="w-4 h-4 text-[#38bdf8] shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>
            {accordions.backup && (
              <div className="bg-[#0f172a]/70 border-t border-slate-700/60 divide-y divide-slate-800/80 pl-11 pr-4">
                <button
                  type="button"
                  onClick={handleManualSync}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-slate-200 hover:text-[#38bdf8] transition cursor-pointer"
                >
                  <span className="font-medium flex items-center gap-2">
                    <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isManualSyncing ? 'animate-spin' : ''}`} />
                    Cloud Firestore Backup
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenEmailBackup) onOpenEmailBackup();
                    else onSelectTab('settings');
                  }}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-slate-200 hover:text-[#38bdf8] transition cursor-pointer"
                >
                  <span className="font-medium flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    Daily Email Backup
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTab('settings')}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-slate-200 hover:text-[#38bdf8] transition cursor-pointer"
                >
                  <span className="font-medium">Export JSON / CSV Backup</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTab('settings')}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-slate-200 hover:text-[#38bdf8] transition cursor-pointer"
                >
                  <span className="font-medium">Restore Data</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            )}
          </div>

          {/* Utilities Accordion */}
          <div>
            <button
              type="button"
              onClick={() => toggleAccordion('utilities')}
              className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition text-left cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <Wrench className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />
                <span className="text-[13px] font-semibold text-white">Utilities</span>
              </div>
              {accordions.utilities ? (
                <ChevronUp className="w-4 h-4 text-[#38bdf8] shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>
            {accordions.utilities && (
              <div className="bg-[#0f172a]/70 border-t border-slate-700/60 divide-y divide-slate-800/80 pl-11 pr-4">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenBarcodePrinter) onOpenBarcodePrinter();
                    else onSelectTab('inventory');
                  }}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-slate-200 hover:text-[#38bdf8] transition cursor-pointer"
                >
                  <span className="font-medium">Barcode Label Generator</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTab('inventory')}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-slate-200 hover:text-[#38bdf8] transition cursor-pointer"
                >
                  <span className="font-medium">Import Items</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTab('inventory')}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-slate-200 hover:text-[#38bdf8] transition cursor-pointer"
                >
                  <span className="font-medium">Bulk Price Update</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Card 4: Others */}
        <section className="bg-[#1e293b] rounded-2xl border border-slate-700/70 overflow-hidden divide-y divide-slate-700/70">
          <div className="px-4 py-3 text-xs font-bold text-slate-300 tracking-wide">
            Others
          </div>

          <button
            type="button"
            onClick={() => {
              if (onOpenPlansPricing) {
                onOpenPlansPricing();
              } else {
                setActiveModal('plans');
              }
            }}
            className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <Award className="w-4 h-4 text-amber-400 shrink-0" strokeWidth={1.75} />
              <span className="text-[13px] font-semibold text-white truncate">Plans &amp; Pricing</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(() => {
                if (isOwnerAccount) {
                  return (
                    <span className="px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-[10px] font-bold text-sky-300">
                      Owner
                    </span>
                  );
                }
                if (storeProfile) {
                  const expMs = storeProfile.expiresAt ? Date.parse(storeProfile.expiresAt) : 0;
                  const daysLeft = expMs > 0 ? Math.max(0, Math.ceil((expMs - Date.now()) / 86400000)) : 0;
                  const isExpired = storeProfile.subscriptionStatus === 'expired' || (expMs > 0 && expMs <= Date.now());
                  return (
                    <span
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                        isExpired
                          ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                          : storeProfile.planType === 'trial'
                          ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      }`}
                    >
                      {isExpired
                        ? 'Expired'
                        : storeProfile.planType === 'trial'
                        ? `Trial · ${daysLeft}d`
                        : storeProfile.planType === 'annual'
                        ? 'Annual'
                        : 'Monthly'}
                    </span>
                  );
                }
                return null;
              })()}
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
          </button>

          {isOwnerAccount && onOpenSuperAdmin && (
            <button
              type="button"
              id="btn-menu-super-admin-subscribers"
              onClick={onOpenSuperAdmin}
              className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between bg-sky-950/25 hover:bg-sky-950/45 transition text-left cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <ShieldCheck className="w-4 h-4 text-[#38bdf8] shrink-0" strokeWidth={1.75} />
                <span className="text-[13px] font-semibold text-white truncate">
                  Super Admin: Manage Subscribers
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-500/40 text-[10px] font-extrabold text-sky-300 uppercase">
                  Owner
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={onSwitchToComputer}
            className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <Monitor className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />
              <span className="text-[13px] font-semibold text-white">Get Desktop Billing Software</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* Grow Your Business Accordion */}
          <div>
            <button
              type="button"
              onClick={() => toggleAccordion('grow')}
              className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition text-left cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <TrendingUp className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />
                <span className="text-[13px] font-semibold text-white">Grow Your Business</span>
              </div>
              {accordions.grow ? (
                <ChevronUp className="w-4 h-4 text-[#38bdf8] shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>
            {accordions.grow && (
              <div className="bg-[#0f172a]/70 border-t border-slate-700/60 divide-y divide-slate-800/80 pl-11 pr-4">
                <button
                  type="button"
                  onClick={() => onSelectTab('reports')}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-slate-200 hover:text-[#38bdf8] transition cursor-pointer"
                >
                  <span className="font-medium">WhatsApp Receipts</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTab('contacts')}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-slate-200 hover:text-[#38bdf8] transition cursor-pointer"
                >
                  <span className="font-medium">Promo Messages</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTab('contacts')}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-slate-200 hover:text-[#38bdf8] transition cursor-pointer"
                >
                  <span className="font-medium">Customer Loyalty</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onSelectTab('settings')}
            className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <Settings className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />
              <span className="text-[13px] font-semibold text-white">Settings</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* Help & Support Accordion */}
          <div>
            <button
              type="button"
              onClick={() => toggleAccordion('help')}
              className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition text-left cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <HelpCircle className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />
                <span className="text-[13px] font-semibold text-white">Help & Support</span>
              </div>
              {accordions.help ? (
                <ChevronUp className="w-4 h-4 text-[#38bdf8] shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>
            {accordions.help && (
              <div className="bg-[#0f172a]/70 border-t border-slate-700/60 divide-y divide-slate-800/80 pl-11 pr-4">
                <button
                  type="button"
                  onClick={() => setActiveModal('customer_care')}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-slate-200 hover:text-[#38bdf8] transition cursor-pointer"
                >
                  <span className="font-medium flex items-center gap-2.5">
                    <Headphones className="w-3.5 h-3.5 text-slate-400" />
                    Customer Care
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenAiAssistant) {
                      onOpenAiAssistant();
                    } else {
                      showToast('Quick-Start Guide: Use Home for POS checkout, Items for stock, and Sync & Share to connect worker phones.');
                    }
                  }}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-slate-200 hover:text-[#38bdf8] transition cursor-pointer"
                >
                  <span className="font-medium flex items-center gap-2.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    Tutorials
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenCloudSync) onOpenCloudSync();
                    else handleManualSync();
                  }}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-slate-200 hover:text-[#38bdf8] transition cursor-pointer"
                >
                  <span className="font-medium flex items-center gap-2.5">
                    <LifeBuoy className="w-3.5 h-3.5 text-slate-400" />
                    Remote Support
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('share_app')}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-slate-200 hover:text-[#38bdf8] transition cursor-pointer"
                >
                  <span className="font-medium flex items-center gap-2.5">
                    <Share2 className="w-3.5 h-3.5 text-slate-400" />
                    Share App Details
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setRatingSubmitted(false);
              setActiveModal('rate_app');
            }}
            className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-800/70 transition text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <Star className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />
              <span className="text-[13px] font-semibold text-white">Rate this app</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </section>

        {/* 3. Account & App Version Cards */}
        {cloudUserEmail && onSignOutCloud && (
          <section className="bg-[#1e293b] rounded-2xl border border-slate-700/70 px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400">Cloud Account</div>
              <div className="text-xs font-semibold text-white truncate">{cloudUserEmail}</div>
            </div>
            <button
              type="button"
              onClick={() => onSignOutCloud()}
              className="px-3 py-1.5 rounded-xl bg-[#0f172a] hover:bg-slate-900 border border-slate-700 text-rose-300 hover:text-rose-200 text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </section>
        )}

        <section className="bg-[#1e293b] rounded-2xl border border-slate-700/70 px-4 py-3.5 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-slate-200">App Version</span>
          <span className="text-[13px] font-mono tabular-nums font-bold text-[#38bdf8]">4.2.0</span>
        </section>

        <div className="pt-2 pb-4 flex flex-col items-center text-center space-y-3">
          <button
            type="button"
            onClick={() => setActiveModal('privacy')}
            className="text-xs text-slate-400 hover:text-white underline underline-offset-4 transition cursor-pointer"
          >
            Privacy Policy
          </button>

          <div className="pt-2 flex flex-col items-center space-y-1.5">
            <div className="w-10 h-10 rounded-2xl bg-[#1e293b] border border-slate-700/80 flex items-center justify-center text-[#38bdf8] font-black text-base">
              R
            </div>
            <div className="text-sm font-bold text-white tracking-tight">
              Rofani Electronics
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Crafted for Rofani Electronics &amp; Boutique
            </p>
          </div>
        </div>
      </div>

      {/* Dark Interactive Modals for Menu Utilities */}
      {activeModal && (
        <div
          className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md bg-[#1e293b] border border-slate-700 rounded-2xl p-5 text-slate-100 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {activeModal === 'plans' && (
              <>
                <div className="flex items-center justify-between border-b border-slate-700/70 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Award className="w-5 h-5 text-amber-400" />
                    <h3 className="text-base font-bold text-white">Plans &amp; Pricing</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="bg-[#0f172a] border border-slate-700/70 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">Rofani POS Enterprise</span>
                    <span className="text-[#38bdf8] font-mono font-bold">Active License</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Includes multi-device Firestore Cloud Sync, M-Pesa Daraja STK Push &amp; Till integration, KRA eTIMS / TOT reports, unlimited SKUs, and worker PIN access control.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2.5 rounded-xl bg-[#38bdf8] hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer transition"
                >
                  Done
                </button>
              </>
            )}

            {activeModal === 'customer_care' && (
              <>
                <div className="flex items-center justify-between border-b border-slate-700/70 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Headphones className="w-5 h-5 text-[#38bdf8]" />
                    <h3 className="text-base font-bold text-white">Customer Care</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2.5 text-xs">
                  <p className="text-slate-300">
                    Need help with inventory setup, M-Pesa Daraja keys, or multi-device sync? Contact Rofani POS technical support:
                  </p>
                  <div className="bg-[#0f172a] border border-slate-700/70 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Support Line</span>
                      <a
                        href="tel:+254700000000"
                        className="font-mono font-bold text-white hover:text-[#38bdf8]"
                      >
                        +254 700 000 000
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">WhatsApp Desk</span>
                      <a
                        href="https://wa.me/254700000000"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:underline"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Chat on WhatsApp
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs cursor-pointer transition"
                >
                  Close
                </button>
              </>
            )}

            {activeModal === 'share_app' && (
              <>
                <div className="flex items-center justify-between border-b border-slate-700/70 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Share2 className="w-5 h-5 text-[#38bdf8]" />
                    <h3 className="text-base font-bold text-white">Share App Details</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="bg-[#0f172a] border border-slate-700/70 rounded-xl p-3 space-y-1.5">
                    <div className="text-slate-400">Live App URL</div>
                    <div className="font-mono text-[#38bdf8] break-all">{liveAppUrl}</div>
                  </div>
                  <div className="bg-[#0f172a] border border-slate-700/70 rounded-xl p-3 space-y-1 text-slate-300">
                    <div className="font-semibold text-white">Store &amp; Staff Sign-In Instructions</div>
                    <p className="text-slate-400 leading-relaxed">
                      1. Open the link in Chrome or Safari on your mobile phone.
                      <br />
                      2. Shop owners: Sign in with your Google account to launch your own private store (7-day free trial).
                      <br />
                      3. Cashiers/staff: Sign in with the store Google account and enter your assigned worker PIN.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyShareInstructions}
                  className="w-full py-2.5 rounded-xl bg-[#38bdf8] hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  {copiedShareLink ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied Link &amp; Login Guide</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy App Link &amp; Instructions</span>
                    </>
                  )}
                </button>
              </>
            )}

            {activeModal === 'rate_app' && (
              <>
                <div className="flex items-center justify-between border-b border-slate-700/70 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <h3 className="text-base font-bold text-white">Rate Rofani POS</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {ratingSubmitted ? (
                  <div className="bg-[#0f172a] border border-emerald-500/40 rounded-xl p-4 text-center space-y-2">
                    <Check className="w-7 h-7 text-emerald-400 mx-auto" />
                    <p className="text-sm font-bold text-white">Thank you for your feedback!</p>
                    <p className="text-xs text-slate-400">
                      Your {ratingStars}-star rating helps improve Rofani Electronics POS.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-center gap-2 py-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingStars(star)}
                          className="p-1.5 cursor-pointer transition transform hover:scale-110"
                          aria-label={`Rate ${star} stars`}
                        >
                          <Star
                            className={`w-7 h-7 ${
                              star <= ratingStars
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-600'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={3}
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      placeholder="Share suggestions or feedback..."
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#38bdf8]"
                    />
                    <button
                      type="button"
                      onClick={() => setRatingSubmitted(true)}
                      className="w-full py-2.5 rounded-xl bg-[#38bdf8] hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer transition"
                    >
                      Submit Feedback
                    </button>
                  </div>
                )}
              </>
            )}

            {activeModal === 'privacy' && (
              <>
                <div className="flex items-center justify-between border-b border-slate-700/70 pb-3">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-base font-bold text-white">Privacy Policy</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="bg-[#0f172a] border border-slate-700/70 rounded-xl p-3.5 text-xs text-slate-300 space-y-2 leading-relaxed">
                  <p>
                    Rofani Electronics &amp; Boutique POS stores catalog items, transactions, and customer balances locally for offline continuity and syncs strictly to your authenticated Firebase Firestore workspace.
                  </p>
                  <p className="text-slate-400">
                    Access is protected by authenticated Google sign-in and staff terminal PIN permissions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs cursor-pointer transition"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
