import React from 'react';
import {
  Monitor,
  ShoppingBag,
  Package,
  LayoutDashboard,
  Settings,
  Menu,
  Bell,
  Cloud,
  AlertTriangle,
  Store
} from 'lucide-react';
import { User } from '../types';
import { TabKey } from '../utils/permissions';
import { OfflineSyncBanner } from './Network/OfflineSyncBanner';
import { SyncRetryResult } from '../utils/offlineSync';

interface PhoneDeviceFrameProps {
  children: React.ReactNode;
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  onSelectStockAlertFilter?: () => void;
  phoneOrientation: 'portrait' | 'landscape';
  phoneModel: 'iphone15pro' | 'galaxyS24' | 'pixel8';
  onToggleOrientation: () => void;
  onChangeModel: (model: 'iphone15pro' | 'galaxyS24' | 'pixel8') => void;
  onSwitchToComputer: () => void;
  currentUser: User;
  storeName?: string;
  todaySales: number;
  lowStockCount: number;
  onLockTerminal: () => void;
  onOpenStaffModal: () => void;
  onNewSale?: () => void;
  onOpenCloudSync?: () => void;
  onOpenStockAlerts?: () => void;
  cloudSyncStatus?: 'synced' | 'syncing' | 'offline' | 'error' | 'quota_exceeded';
  onTriggerSync?: () => Promise<SyncRetryResult | void> | void;
  conflictCount?: number;
  onOpenConflictAssistant?: () => void;
  hideBottomNav?: boolean;
  quickToolsBar?: React.ReactNode;
}

export const PhoneDeviceFrame: React.FC<PhoneDeviceFrameProps> = ({
  children,
  activeTab,
  onSelectTab,
  onSelectStockAlertFilter,
  phoneOrientation,
  phoneModel,
  onSwitchToComputer,
  storeName = 'Rofani POS',
  lowStockCount,
  onLockTerminal: _onLockTerminal,
  onOpenStaffModal: _onOpenStaffModal,
  onNewSale: _onNewSale,
  onOpenCloudSync,
  onOpenStockAlerts,
  cloudSyncStatus = 'synced',
  onTriggerSync,
  conflictCount = 0,
  onOpenConflictAssistant,
  hideBottomNav = false,
  quickToolsBar,
}) => {
  const isLandscape = phoneOrientation === 'landscape';

  const getFrameDimensions = () => {
    if (phoneModel === 'galaxyS24') {
      return isLandscape
        ? 'w-full sm:w-[840px] sm:max-w-[96vw] flex-1 min-h-0 sm:flex-none sm:h-[400px] sm:max-h-[90dvh]'
        : 'w-full sm:w-[400px] sm:max-w-[96vw] flex-1 min-h-0 sm:flex-none sm:h-[820px] sm:max-h-[94dvh]';
    }
    if (phoneModel === 'pixel8') {
      return isLandscape
        ? 'w-full sm:w-[820px] sm:max-w-[96vw] flex-1 min-h-0 sm:flex-none sm:h-[390px] sm:max-h-[90dvh]'
        : 'w-full sm:w-[390px] sm:max-w-[96vw] flex-1 min-h-0 sm:flex-none sm:h-[800px] sm:max-h-[94dvh]';
    }
    // Default iPhone 15 Pro
    return isLandscape
      ? 'w-full sm:w-[860px] sm:max-w-[96vw] flex-1 min-h-0 sm:flex-none sm:h-[420px] sm:max-h-[90dvh]'
      : 'w-full sm:w-[420px] sm:max-w-[96vw] flex-1 min-h-0 sm:flex-none sm:h-[850px] sm:max-h-[94dvh]';
  };

  const syncDotClass =
    cloudSyncStatus === 'quota_exceeded'
      ? 'bg-amber-400'
      : cloudSyncStatus === 'offline'
      ? 'bg-slate-400'
      : cloudSyncStatus === 'error'
      ? 'bg-rose-400'
      : cloudSyncStatus === 'syncing'
      ? 'bg-sky-400 animate-pulse'
      : 'bg-emerald-400';

  const normalizedCustomStore =
    storeName &&
    ![
      'rofani pos',
      'rofani electronics',
      'rofani electronics & boutique',
      'rofani electronics and boutique',
    ].includes(storeName.trim().toLowerCase())
      ? storeName.trim()
      : '';

  return (
    <div className="min-h-dvh h-dvh sm:h-auto sm:min-h-dvh bg-slate-900 sm:bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-0 sm:py-4 sm:px-4 overflow-hidden sm:overflow-x-hidden selection:bg-blue-600 selection:text-white relative">
      {/* SMARTPHONE DEVICE CONTAINER FRAME */}
      <div
        className={`relative transition-all duration-300 ease-in-out bg-slate-900 border-0 sm:border-[12px] border-slate-800 rounded-none sm:rounded-[52px] shadow-2xl shadow-blue-900/30 overflow-hidden flex flex-col ${getFrameDimensions()}`}
        style={{
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), inset 0 0 0 2px rgba(255, 255, 255, 0.08)'
        }}
      >
        {/* SINGLE COMPACT MOBILE HEADER */}
        <header className="bg-slate-900 border-b border-slate-800 py-2 px-3 flex items-center justify-between gap-2 shrink-0 z-30">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-sky-400 shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold text-white truncate leading-tight">
                Rofani POS
              </h1>
              {normalizedCustomStore && (
                <p className="text-[10px] text-slate-400 truncate leading-tight">
                  {normalizedCustomStore}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-nowrap pr-0.5">
            {onOpenCloudSync && (
              <button
                type="button"
                onClick={onOpenCloudSync}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/70 text-slate-300 hover:text-white transition relative flex items-center justify-center shrink-0 cursor-pointer"
                title={
                  cloudSyncStatus === 'quota_exceeded'
                    ? 'Firestore Daily Quota Reached: Operating in Offline Local Storage Mode'
                    : cloudSyncStatus === 'error'
                    ? 'Last cloud sync had an error — tap to retry'
                    : 'Cloud Sync & Multi-Device Share'
                }
                aria-label="Cloud Sync Status"
              >
                <Cloud
                  className={`w-4 h-4 ${
                    cloudSyncStatus === 'quota_exceeded'
                      ? 'text-amber-400'
                      : cloudSyncStatus === 'error'
                      ? 'text-rose-400'
                      : 'text-sky-400'
                  }`}
                />
                <span className={`w-2 h-2 rounded-full absolute top-1 right-1 ${syncDotClass}`} />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (onOpenStockAlerts) {
                  onOpenStockAlerts();
                } else {
                  onSelectTab('inventory');
                  if (onSelectStockAlertFilter) onSelectStockAlertFilter();
                }
              }}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/70 text-slate-300 hover:text-white transition relative flex items-center justify-center shrink-0 overflow-visible cursor-pointer"
              title="Stock Alert Notifications"
              aria-label="Stock Alert Notifications"
            >
              <Bell className={`w-4 h-4 ${lowStockCount > 0 ? 'text-amber-400' : 'text-slate-300'}`} />
              {lowStockCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold font-mono tabular-nums flex items-center justify-center ring-2 ring-slate-900">
                  {lowStockCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('settings')}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/70 text-slate-300 hover:text-white transition flex items-center justify-center shrink-0 cursor-pointer"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </header>

        {/* Firestore Quota Notice for Mobile Workers */}
        {cloudSyncStatus === 'quota_exceeded' && onOpenCloudSync && (
          <div
            onClick={onOpenCloudSync}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 text-[11px] font-bold flex items-center justify-between shrink-0 cursor-pointer shadow-sm transition"
            title="Click to view Cloud Quota status & upgrade info"
          >
            <span className="flex items-center gap-1.5 truncate">
              <AlertTriangle className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              <span className="truncate">Cloud Quota Limit: Local Mode Active</span>
            </span>
            <span className="text-[10px] underline ml-1 shrink-0 font-black">Details</span>
          </div>
        )}

        {/* Sticky Offline Notification Banner (only renders space when offline/pending) */}
        <div className="empty:hidden bg-slate-950 px-3 pt-1.5 shrink-0 z-20">
          <OfflineSyncBanner
            compact
            onTriggerSync={onTriggerSync}
            onOpenCloudSync={onOpenCloudSync}
            conflictCount={conflictCount}
            onOpenConflictAssistant={onOpenConflictAssistant}
          />
        </div>

        {/* MOBILE MAIN VIEWPORT CONTENT CONTAINER */}
        <div
          className={`flex-1 min-h-0 overflow-y-auto bg-[#0f172a] text-slate-100 p-3 sm:p-4 scrollbar-thin scrollbar-thumb-slate-800 ${
            hideBottomNav ? 'pb-6' : 'pb-28'
          }`}
        >
          {children}
        </div>

        {/* FLOATING QUICK TOOLS & MAKE SALE BAR */}
        {!hideBottomNav && quickToolsBar}

        {/* PORTAL ROOT FOR POS FLOATING CART PILL & SLIDE-UP DRAWER */}
        <div id="phone-frame-overlay-root" className="pointer-events-none absolute inset-0 z-[105]" />

        {/* TOUCH-OPTIMIZED 5-TAB DARK MOBILE BOTTOM NAVIGATION BAR */}
        {!hideBottomNav && (
        <nav
          aria-label="Mobile Bottom Navigation"
          className="absolute bottom-0 left-0 right-0 z-50 min-h-16 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-1 pt-1 pb-safe grid grid-cols-5 items-center shrink-0"
        >
          <button
            type="button"
            onClick={() => onSelectTab('pos')}
            className={`min-h-[44px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'pos' ? 'text-[#38bdf8] font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold tracking-tight whitespace-nowrap">HOME</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('reports')}
            className={`min-h-[44px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'reports' ? 'text-[#38bdf8] font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold tracking-tight whitespace-nowrap">DASHBOARD</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('inventory')}
            className={`min-h-[44px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'inventory' ? 'text-[#38bdf8] font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold tracking-tight whitespace-nowrap">ITEMS</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('menu' as any)}
            className={`min-h-[44px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === ('menu' as any) ? 'text-[#38bdf8] font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold tracking-tight whitespace-nowrap">MENU</span>
          </button>

          <button
            type="button"
            onClick={onSwitchToComputer}
            className="min-h-[44px] flex flex-col items-center justify-center py-1 rounded-xl transition text-slate-400 hover:text-[#38bdf8] cursor-pointer"
            title="Get Desktop Billing Software"
          >
            <Monitor className="w-5 h-5 mb-0.5 text-[#38bdf8]" />
            <span className="text-[9px] font-bold tracking-tight whitespace-nowrap">GET DESKTOP</span>
          </button>
        </nav>
        )}
      </div>

      {/* FLOATING QUICK-SWITCH BUTTON ON DESKTOP SIMULATOR VIEWPORTS */}
      <div className="hidden sm:block fixed bottom-5 right-5 z-50">
        <button
          type="button"
          id="btn-floating-switch-to-computer"
          onClick={onSwitchToComputer}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black rounded-full shadow-2xl shadow-blue-900/80 border border-blue-400/50 flex items-center gap-2 transition-all transform active:scale-95 hover:scale-105 cursor-pointer ring-2 ring-blue-500/40"
          title="Switch to Desktop Version"
        >
          <Monitor className="w-4 h-4 text-blue-100" />
          <span>Switch to Desktop</span>
        </button>
      </div>
    </div>
  );
};
