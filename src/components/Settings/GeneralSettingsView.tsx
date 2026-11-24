import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Info,
  Check,
  Globe,
  Shield,
  Building2,
  Truck,
  Database,
  FileText,
  ChevronRight,
  KeyRound,
  X,
  Wifi,
  BatteryCharging,
  RefreshCw,
  Download,
  Mail,
  Sliders,
  Cloud,
  Clock
} from 'lucide-react';
import { safeGetJSON, safeSetJSON } from '../../utils/safeStorage';
import { getIsOnline, useAggressiveAutoSync, useNetworkStatus } from '../../utils/offlineSync';
import { playButtonSound } from '../../utils/uiFeedback';
import { getLastBackupMeta, formatLastBackupTimestamp, formatBackupMethodLabel, LastBackupMeta } from '../../utils/storeBackup';
import { getBackupSettings } from '../../lib/gmailService';

interface GeneralSettingsViewProps {
  onBack: () => void;
  onOpenStoreManager?: () => void;
  onOpenCloudSync?: () => void;
  onOpenDataManagement?: () => void;
  onTriggerSync?: () => Promise<any> | void;
  onExportFullBackup?: () => void;
  onOpenEmailBackup?: () => void;
  displayTheme?: 'light' | 'dark' | 'contrast';
  onChangeDisplayTheme?: (theme: 'light' | 'dark' | 'contrast') => void;
  requirePinOnStartup?: boolean;
  onToggleRequirePinOnStartup?: (require: boolean) => void;
  masterPin?: string;
  onUpdateMasterPin?: (newPin: string) => void;
}

export interface GeneralSettingsState {
  appLanguage: string;
  businessCurrency: string;
  decimalPlaces: number;
  dateFormat: string;
  showUnsavedWarning: boolean;
  appTheme: string;
  passcodeFingerprint: boolean;
  multifirmSettings: boolean;
  stockTransferStores: boolean;
  backupSettings: boolean;
  estimateQuotation: boolean;
  proformaInvoice: boolean;
  otherIncome: boolean;
  salePurchaseOrder: boolean;
  fixedAssets: boolean;
  deliveryNote: boolean;
  goodsReturnOnDeliveryNote: boolean;
  printAmountOnNote: boolean;
}

export const GENERAL_SETTINGS_DEFAULT: GeneralSettingsState = {
  appLanguage: 'English',
  businessCurrency: 'KSh',
  decimalPlaces: 2,
  dateFormat: 'dd/MM/yyyy',
  showUnsavedWarning: true,
  appTheme: 'Dark Mode Pro',
  passcodeFingerprint: false,
  multifirmSettings: false,
  stockTransferStores: false,
  backupSettings: false,
  estimateQuotation: true,
  proformaInvoice: false,
  otherIncome: false,
  salePurchaseOrder: true,
  fixedAssets: false,
  deliveryNote: true,
  goodsReturnOnDeliveryNote: true,
  printAmountOnNote: false,
};

const DISPLAY_THEME_TO_APP_THEME: Record<'light' | 'dark' | 'contrast', string> = {
  light: 'Modern',
  dark: 'Dark Mode Pro',
  contrast: 'Executive Blue',
};

const APP_THEME_TO_DISPLAY_THEME: Record<string, 'light' | 'dark' | 'contrast'> = {
  Modern: 'light',
  'Dark Mode Pro': 'dark',
  'Executive Blue': 'contrast',
};

export const GeneralSettingsView: React.FC<GeneralSettingsViewProps> = ({
  onBack,
  onOpenStoreManager,
  onOpenCloudSync,
  onOpenDataManagement,
  onTriggerSync,
  onExportFullBackup,
  onOpenEmailBackup,
  displayTheme,
  onChangeDisplayTheme,
  requirePinOnStartup,
  onToggleRequirePinOnStartup,
  masterPin,
  onUpdateMasterPin,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [aggressiveAutoSync, setAggressiveAutoSync] = useAggressiveAutoSync();
  const { pendingCount, isOnline } = useNetworkStatus();
  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const [lastBackupMeta, setLastBackupMeta] = useState<LastBackupMeta | null>(() => getLastBackupMeta());

  useEffect(() => {
    const onBackupRecorded = (e: Event) => {
      const detail = (e as CustomEvent<LastBackupMeta>).detail;
      setLastBackupMeta(detail || getLastBackupMeta());
    };
    window.addEventListener('rofani:backup-recorded', onBackupRecorded);
    return () => window.removeEventListener('rofani:backup-recorded', onBackupRecorded);
  }, []);

  const [settings, setSettings] = useState<GeneralSettingsState>(() => {
    const saved = safeGetJSON<GeneralSettingsState>('rofani_general_settings_v1', GENERAL_SETTINGS_DEFAULT);
    return {
      ...GENERAL_SETTINGS_DEFAULT,
      ...saved,
      ...(displayTheme ? { appTheme: DISPLAY_THEME_TO_APP_THEME[displayTheme] || saved.appTheme } : {}),
      ...(typeof requirePinOnStartup === 'boolean' ? { passcodeFingerprint: requirePinOnStartup } : {}),
    };
  });

  // Keep synced with App-level theme and startup PIN settings when props change
  useEffect(() => {
    if (displayTheme) {
      const mapped = DISPLAY_THEME_TO_APP_THEME[displayTheme];
      if (mapped && settings.appTheme !== mapped) {
        setSettings((prev) => ({ ...prev, appTheme: mapped }));
      }
    }
  }, [displayTheme, settings.appTheme]);

  useEffect(() => {
    if (typeof requirePinOnStartup === 'boolean' && settings.passcodeFingerprint !== requirePinOnStartup) {
      setSettings((prev) => ({ ...prev, passcodeFingerprint: requirePinOnStartup }));
    }
  }, [requirePinOnStartup, settings.passcodeFingerprint]);

  // PIN Setup Modal state
  const [showPinSetupModal, setShowPinSetupModal] = useState(false);
  const [pinInput, setPinInput] = useState(() => masterPin || safeGetJSON<string>('rofani_app_pin', '1234'));
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    if (masterPin) {
      setPinInput(masterPin);
    }
  }, [masterPin]);

  useEffect(() => {
    safeSetJSON('rofani_general_settings_v1', settings);
  }, [settings]);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3200);
  };

  const updateSetting = <K extends keyof GeneralSettingsState>(key: K, value: GeneralSettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));

    if (key === 'appTheme' && typeof value === 'string' && onChangeDisplayTheme) {
      const mappedTheme = APP_THEME_TO_DISPLAY_THEME[value] || 'dark';
      onChangeDisplayTheme(mappedTheme);
    }

    if (key === 'businessCurrency' && typeof value === 'string') {
      const currencyMap: Record<string, string> = {
        KSh: 'KES (KSh)',
        USD: 'USD ($)',
        EUR: 'EUR (€)',
      };
      safeSetJSON('rofani_settings_currency', currencyMap[value] || 'KES (KSh)');
    }

    triggerToast('General settings updated successfully!');
  };

  const handleSavePinSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput || pinInput.length < 4) {
      setPinError('Please enter a valid 4-digit PIN code.');
      return;
    }
    safeSetJSON('rofani_app_pin', pinInput);
    safeSetJSON('retail_pos_master_pin', pinInput);
    onUpdateMasterPin?.(pinInput);
    onToggleRequirePinOnStartup?.(true);
    setSettings((prev) => ({ ...prev, passcodeFingerprint: true }));
    setShowPinSetupModal(false);
    setPinError('');
    triggerToast('🔒 Register PIN passcode set successfully!');
  };

  const handleDisablePasscode = () => {
    onToggleRequirePinOnStartup?.(false);
    setSettings((prev) => ({ ...prev, passcodeFingerprint: false }));
    triggerToast('🔓 PIN passcode lock disabled.');
  };

  const handleToggleAggressiveAutoSync = () => {
    const nextVal = !aggressiveAutoSync;
    setAggressiveAutoSync(nextVal);
    playButtonSound('tap');
    triggerToast(
      nextVal
        ? 'Aggressive Auto-Sync enabled — queued changes will upload automatically when connected.'
        : 'Battery & Mobile Data Saver enabled — auto-sync paused until manually triggered.'
    );
  };

  const handleManualSyncNow = async () => {
    if (!getIsOnline()) {
      triggerToast('⚠️ Device is offline. Reconnect to sync queued data.');
      return;
    }
    if (!onTriggerSync) {
      if (onOpenCloudSync) {
        onOpenCloudSync();
      }
      return;
    }
    setIsRetryingSync(true);
    try {
      const res = await onTriggerSync();
      if (res && typeof res === 'object' && res.errorMessage) {
        triggerToast(`⚠️ ${res.errorMessage}`);
      } else if (res && typeof res === 'object' && typeof res.syncedCount === 'number') {
        triggerToast(
          res.syncedCount > 0
            ? `✅ Synced ${res.syncedCount} queued record(s) to cloud!`
            : '✅ Offline queue is already up to date.'
        );
      } else {
        triggerToast('✅ Offline queue & cloud sync completed!');
      }
    } catch {
      triggerToast('⚠️ Cloud sync failed. Open Cloud Sync Hub for details.');
    } finally {
      setIsRetryingSync(false);
    }
  };

  const handleOpenDataManagementTools = () => {
    if (onOpenDataManagement) {
      onOpenDataManagement();
    } else if (onOpenCloudSync) {
      onOpenCloudSync();
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesSearch = (...terms: string[]) => {
    if (!normalizedQuery) return true;
    return terms.some((t) => t.toLowerCase().includes(normalizedQuery));
  };

  const showAppPrefs = matchesSearch(
    'application preferences',
    'app language',
    'business currency',
    'decimal places',
    'date format',
    'unsaved changes',
    'app theme',
    'modern',
    'dark mode',
    'ksh',
    'usd',
    'eur'
  );
  const showSecurity = matchesSearch('security', 'authentication', 'passcode', 'fingerprint', 'pin', 'lock');
  const showMultifirm = matchesSearch('multifirm', 'companies', 'branches', 'outlets', 'store manager');
  const showLogistics = matchesSearch('inter-store', 'logistics', 'stock transfer', 'dispatch', 'stores');
  const showDataBackup = matchesSearch(
    'data',
    'backup',
    'cloud',
    'sync',
    'auto-sync',
    'aggressive',
    'offline',
    'json',
    'export',
    'import',
    'restore',
    'email',
    'google drive',
    'management'
  );
  const showDocFeatures = matchesSearch(
    'document',
    'transactions',
    'estimate',
    'quotation',
    'proforma',
    'invoice',
    'other income',
    'sale',
    'purchase order',
    'fixed assets',
    'delivery note',
    'goods return',
    'print amount'
  );

  const anySectionVisible =
    showAppPrefs || showSecurity || showMultifirm || showLogistics || showDataBackup || showDocFeatures;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 font-sans">
      {/* 1. Header Navigation */}
      <div className="sticky top-0 z-30 bg-slate-900 text-white shadow-md px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-base sm:text-lg tracking-tight">General Settings</h1>
            <p className="text-[10px] text-slate-400">Application, Security, Data Backup & Preferences</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-44 sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search general settings..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="max-w-3xl mx-auto px-4 mt-3">
          <div className="bg-emerald-900/90 border border-emerald-500/50 text-emerald-200 text-xs p-3 rounded-xl flex items-center gap-2 font-medium shadow-lg animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5 text-xs">
        {!anySectionVisible && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <p className="text-slate-300 font-semibold">
              No general settings matched &ldquo;{searchQuery}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Show All General Settings
            </button>
          </div>
        )}

        {/* Section 1: Application */}
        {showAppPrefs && (
          <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
            <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              <span>Section 1: Application Preferences</span>
            </div>
            <div className="divide-y divide-slate-800">
              {/* App Language */}
              {matchesSearch('app language', 'english', 'swahili', 'application preferences') && (
                <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>App Language</span>
                      <span title="Select primary UI display language"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                    </div>
                    <div className="text-[11px] text-slate-400">Choose preferred interface language</div>
                  </div>
                  <select
                    value={settings.appLanguage}
                    onChange={(e) => updateSetting('appLanguage', e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="English">English</option>
                    <option value="Swahili">Swahili (Kiswahili)</option>
                  </select>
                </div>
              )}

              {/* Business Currency */}
              {matchesSearch('business currency', 'ksh', 'usd', 'eur', 'application preferences') && (
                <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Business Currency</span>
                      <span title="Set default shop currency for sales and inventory valuation"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                    </div>
                    <div className="text-[11px] text-slate-400">Primary currency symbol and formatting</div>
                  </div>
                  <select
                    value={settings.businessCurrency}
                    onChange={(e) => updateSetting('businessCurrency', e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="KSh">KSh (Kenyan Shilling)</option>
                    <option value="USD">USD ($ US Dollar)</option>
                    <option value="EUR">EUR (€ Euro)</option>
                  </select>
                </div>
              )}

              {/* Decimal Places */}
              {matchesSearch('decimal places', 'precision', 'application preferences') && (
                <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Decimal Places</span>
                      <span title="Number of decimal digits for currency and quantity precision"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                    </div>
                    <div className="text-[11px] text-slate-400">Currency & quantity precision format</div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 font-bold text-slate-100">
                    <button
                      type="button"
                      onClick={() => updateSetting('decimalPlaces', Math.max(0, settings.decimalPlaces - 1))}
                      className="w-5 h-5 bg-slate-800 rounded-lg shadow-sm flex items-center justify-center hover:bg-slate-700 transition cursor-pointer text-slate-200"
                    >
                      -
                    </button>
                    <span className="w-4 text-center">{settings.decimalPlaces}</span>
                    <button
                      type="button"
                      onClick={() => updateSetting('decimalPlaces', Math.min(4, settings.decimalPlaces + 1))}
                      className="w-5 h-5 bg-slate-800 rounded-lg shadow-sm flex items-center justify-center hover:bg-slate-700 transition cursor-pointer text-slate-200"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Date Format */}
              {matchesSearch('date format', 'layout', 'application preferences') && (
                <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Date Format</span>
                      <span title="Date display format across reports and invoices"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                    </div>
                    <div className="text-[11px] text-slate-400">Transaction & report date layout</div>
                  </div>
                  <select
                    value={settings.dateFormat}
                    onChange={(e) => updateSetting('dateFormat', e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="dd/MM/yyyy">dd/MM/yyyy (31/12/2026)</option>
                    <option value="MM/dd/yyyy">MM/dd/yyyy (12/31/2026)</option>
                    <option value="yyyy-MM-dd">yyyy-MM-dd (2026-12-31)</option>
                  </select>
                </div>
              )}

              {/* Show warning for unsaved changes */}
              {matchesSearch('unsaved changes', 'warning', 'application preferences') && (
                <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Show warning for unsaved changes</span>
                      <span title="Alert cashiers before navigating away from active uncompleted sale"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                    </div>
                    <div className="text-[11px] text-slate-400">Alert cashiers before losing draft transactions</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showUnsavedWarning}
                      onChange={(e) => updateSetting('showUnsavedWarning', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              )}

              {/* Change App Theme */}
              {matchesSearch('app theme', 'modern', 'dark mode', 'executive blue', 'application preferences') && (
                <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Change App Theme</span>
                      <span title="Select visual skin and color profile"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                    </div>
                    <div className="text-[11px] text-slate-400">UI styling and visual appearance</div>
                  </div>
                  <select
                    value={settings.appTheme}
                    onChange={(e) => updateSetting('appTheme', e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Modern">Modern Light</option>
                    <option value="Dark Mode Pro">Dark Mode Pro (Active)</option>
                    <option value="Executive Blue">Executive Blue</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 2: Security */}
        {showSecurity && (
          <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
            <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Section 2: Security & Authentication</span>
            </div>
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Passcode / FingerPrint Lock</span>
                  <span title="Require 4-digit PIN verification on app startup"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Secure register access with a 4-digit PIN lock</div>
              </div>
              <div className="flex items-center gap-3">
                {settings.passcodeFingerprint && (
                  <button
                    type="button"
                    onClick={() => setShowPinSetupModal(true)}
                    className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-bold hover:bg-amber-500/30 transition cursor-pointer"
                  >
                    Change PIN
                  </button>
                )}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.passcodeFingerprint}
                    onChange={(e) => {
                      const val = e.target.checked;
                      if (val) {
                        setShowPinSetupModal(true);
                      } else {
                        handleDisablePasscode();
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Multifirm */}
        {showMultifirm && (
          <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
            <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span>Section 3: Multifirm & Companies</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onOpenStoreManager) {
                  onOpenStoreManager();
                } else {
                  triggerToast('⚠️ Store Manager is unavailable in this view.');
                }
              }}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-800/60 transition text-left cursor-pointer"
            >
              <div className="space-y-0.5 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Multifirm Settings</span>
                  <span title="Manage multiple store branches and distinct company ledgers"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Configure multi-branch or multi-company accounts</div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}

        {/* Section 4: Stock Transfer Between Stores */}
        {showLogistics && (
          <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
            <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>Section 4: Inter-Store Logistics</span>
            </div>
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
              <div className="space-y-0.5 flex-1 pr-4">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Store management & Stock transfer</span>
                  <span title="Enable inventory dispatches and stock transfers between store branches"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                </div>
                <div className="text-[11px] text-slate-400">Enable inter-store stock transfers & dispatches</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.stockTransferStores}
                  onChange={(e) => updateSetting('stockTransferStores', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        )}

        {/* Section 5: Data Settings, Backup & Cloud */}
        {showDataBackup && (
          <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
            <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-400" />
                <span>Section 5: Data Settings, Backup & Cloud</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isOnline
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                {isOnline ? 'Online' : 'Offline'}
                {pendingCount > 0 ? ` • ${pendingCount} Pending` : ''}
              </span>
            </div>

            <div className="divide-y divide-slate-800">
              {/* Cloud Sync & Backup Settings */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenCloudSync) {
                    onOpenCloudSync();
                  } else {
                    handleOpenDataManagementTools();
                  }
                }}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-800/60 transition text-left cursor-pointer"
              >
                <div className="flex items-start gap-3 pr-4">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Backup Settings & Cloud Sync Hub</span>
                      <span title="Manage Google Sign-In, worker device sharing, auto-backup, and cloud restore"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Open real-time Firebase sync, worker QR share & cloud backup controls
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>

              {/* Aggressive Auto-Sync Toggle */}
              <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition gap-3">
                <div className="flex items-start gap-3 flex-1 pr-2">
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                      aggressiveAutoSync
                        ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    }`}
                  >
                    {aggressiveAutoSync ? (
                      <Wifi className="w-4 h-4" />
                    ) : (
                      <BatteryCharging className="w-4 h-4" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                      <span>Aggressive Auto-Sync on Connection</span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          aggressiveAutoSync
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {aggressiveAutoSync ? 'Instant Sync' : 'Battery & Data Saver'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {aggressiveAutoSync
                        ? 'Automatically sync offline records as soon as internet is detected'
                        : 'Save mobile data & battery by pausing automatic reconnect uploads'}
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={aggressiveAutoSync}
                    onChange={handleToggleAggressiveAutoSync}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>

              {/* Manual Retry All Pending Syncs */}
              <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition gap-3">
                <div className="space-y-0.5 flex-1">
                  <div className="font-bold text-slate-100 flex items-center gap-2">
                    <span>Offline Sync Queue</span>
                    {pendingCount > 0 ? (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-orange-500 text-slate-950">
                        {pendingCount} Unsynced
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                        All Caught Up
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Manually push any queued offline sales and inventory edits to Cloud Firestore
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleManualSyncNow}
                  disabled={isRetryingSync}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-xl text-[11px] flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetryingSync ? 'animate-spin' : ''}`} />
                  <span>{isRetryingSync ? 'Syncing...' : 'Sync Queue Now'}</span>
                </button>
              </div>

              {/* Open Full Data Management, Export & Recovery Section */}
              <button
                type="button"
                onClick={handleOpenDataManagementTools}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-800/60 transition text-left cursor-pointer"
              >
                <div className="flex items-start gap-3 pr-4">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-100">Data Management, Import/Export & Recovery Tools</div>
                    <div className="text-[11px] text-slate-400">
                      Jump to JSON/CSV exports, restore from backup file, duplicate cleanup &amp; store profile
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>

              {/* Quick Actions Row: Last Backup Badge, Local Backup & Email Backup */}
              {(onExportFullBackup || onOpenEmailBackup) && (
                <div className="p-4 flex flex-wrap items-center justify-between gap-2.5 bg-slate-950/40">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {onExportFullBackup && (
                      <button
                        type="button"
                        onClick={() => {
                          onExportFullBackup();
                          setLastBackupMeta(getLastBackupMeta());
                          triggerToast('✅ Backup saved to your Downloads folder!');
                        }}
                        className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Backup to Phone</span>
                      </button>
                    )}
                    {onOpenEmailBackup && (
                      <button
                        type="button"
                        onClick={onOpenEmailBackup}
                        className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email Backup Copy</span>
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(() => {
                      const cfg = getBackupSettings();
                      if (!cfg.enabled || !cfg.recipientEmail) return null;
                      const todayIso = new Date().toISOString().slice(0, 10);
                      const statusLabel =
                        cfg.lastSentDate === todayIso
                          ? `Auto-Backup Sent (${cfg.recipientEmail})`
                          : cfg.lastQueuedDate === todayIso
                          ? `Auto-Backup Queued (${cfg.recipientEmail})`
                          : `Auto-Backup ON (${cfg.recipientEmail})`;
                      return (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full border bg-sky-500/10 text-sky-300 border-sky-500/30">
                          ● {statusLabel}
                        </span>
                      );
                    })()}
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full border ${
                        lastBackupMeta
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>
                        Last Backup:{' '}
                        {lastBackupMeta
                          ? `${formatLastBackupTimestamp(lastBackupMeta.timestamp)} (${formatBackupMethodLabel(lastBackupMeta.method)})`
                          : 'Never'}
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 6: More Transactions (Document Features) */}
        {showDocFeatures && (
          <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
            <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              <span>Section 6: Document Features & Transactions</span>
            </div>
            <div className="divide-y divide-slate-800">
              {/* Estimate/Quotation */}
              {matchesSearch('estimate', 'quotation', 'document', 'transactions') && (
                <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Estimate / Quotation</span>
                      <span title="Enable generating pro-forma price estimates for customers"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                    </div>
                    <div className="text-[11px] text-slate-400">Enable generating pro-forma price estimates</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.estimateQuotation}
                      onChange={(e) => updateSetting('estimateQuotation', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                  </label>
                </div>
              )}

              {/* Proforma Invoice */}
              {matchesSearch('proforma invoice', 'document', 'transactions') && (
                <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Proforma Invoice</span>
                      <span title="Enable formal proforma invoice generation before final sale"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                    </div>
                    <div className="text-[11px] text-slate-400">Enable formal proforma invoice generation</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.proformaInvoice}
                      onChange={(e) => updateSetting('proformaInvoice', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                  </label>
                </div>
              )}

              {/* Other Income */}
              {matchesSearch('other income', 'document', 'transactions') && (
                <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Other Income</span>
                      <span title="Track non-retail income sources like rent, service fees, and commissions"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                    </div>
                    <div className="text-[11px] text-slate-400">Track non-retail income sources (rent, services)</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.otherIncome}
                      onChange={(e) => updateSetting('otherIncome', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                  </label>
                </div>
              )}

              {/* Sale/Purchase Order */}
              {matchesSearch('sale', 'purchase order', 'document', 'transactions') && (
                <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Sale / Purchase Order</span>
                      <span title="Enable creation and tracking of SOs and POs"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                    </div>
                    <div className="text-[11px] text-slate-400">Enable creation and tracking of SOs and POs</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.salePurchaseOrder}
                      onChange={(e) => updateSetting('salePurchaseOrder', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                  </label>
                </div>
              )}

              {/* Fixed Assets (FA) */}
              {matchesSearch('fixed assets', 'depreciation', 'document', 'transactions') && (
                <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Fixed Assets (FA)</span>
                      <span title="Enable tracking shop equipment, computers, and asset depreciation"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                    </div>
                    <div className="text-[11px] text-slate-400">Track equipment, computers & asset depreciation</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.fixedAssets}
                      onChange={(e) => updateSetting('fixedAssets', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                  </label>
                </div>
              )}

              {/* Delivery Note */}
              {matchesSearch('delivery note', 'dispatch', 'document', 'transactions') && (
                <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Delivery Note</span>
                      <span title="Enable delivery note creation during dispatch"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                    </div>
                    <div className="text-[11px] text-slate-400">Enable delivery note creation during dispatch</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.deliveryNote}
                      onChange={(e) => updateSetting('deliveryNote', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                  </label>
                </div>
              )}

              {/* Goods Return on Delivery Note */}
              {matchesSearch('goods return', 'delivery note', 'document', 'transactions') && (
                <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Goods Return on Delivery Note</span>
                      <span title="Allow immediate returns against delivery notes"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                    </div>
                    <div className="text-[11px] text-slate-400">Allow immediate returns against delivery notes</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.goodsReturnOnDeliveryNote}
                      onChange={(e) => updateSetting('goodsReturnOnDeliveryNote', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                  </label>
                </div>
              )}

              {/* Print Amount on Note */}
              {matchesSearch('print amount', 'notes', 'document', 'transactions') && (
                <div className="p-4 flex items-center justify-between hover:bg-slate-800/60 transition">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Print Amount on Note</span>
                      <span title="Toggle printing item monetary values on delivery/dispatch notes"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
                    </div>
                    <div className="text-[11px] text-slate-400">Toggle printing item monetary values on notes</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.printAmountOnNote}
                      onChange={(e) => updateSetting('printAmountOnNote', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Set Your 4-Digit Register PIN Modal */}
      {showPinSetupModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-scale-up text-slate-100">
            <div className="p-5 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">Set Your 4-Digit Register PIN</h3>
                  <p className="text-[11px] text-slate-400">Secure register access with in-app PIN protection</p>
                </div>
              </div>
              <button
                onClick={() => setShowPinSetupModal(false)}
                className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePinSetup} className="p-6 space-y-4">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Enter 4-Digit PIN Code</label>
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-xl font-mono font-bold tracking-widest text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Cashiers will be required to enter this 4-digit PIN whenever unlocking the POS register.
                </p>
              </div>

              {pinError && (
                <div className="p-3 bg-rose-950/80 border border-rose-500/50 text-rose-200 rounded-xl text-xs font-medium">
                  {pinError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinSetupModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer"
                >
                  Save Register PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

