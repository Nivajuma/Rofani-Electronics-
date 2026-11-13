import React, { useState, useEffect } from 'react';
import {
  Cloud,
  RefreshCw,
  Smartphone,
  Share2,
  Users,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  UploadCloud,
  X,
  Radio,
  QrCode,
  Lock,
  Edit3,
  Eye,
  EyeOff,
  Shield,
  WifiOff,
  Download,
  RotateCcw,
  History,
  Clock
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  batchSaveProductsToCloud,
  batchSaveTransactionsToCloud,
  batchSaveCustomersToCloud,
  batchSaveSuppliersToCloud,
  batchSaveExpensesToCloud,
  bulkUploadUsersToCloud,
} from '../../lib/cloudSync';
import { FIREBASE_UPGRADE_URL } from '../../lib/firebase';
import { Product, User, Transaction, Customer, Supplier, Expense } from '../../types';
import { useNetworkStatus } from '../../utils/offlineSync';
import { findRecoverableBackups } from '../../utils/backupRecovery';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  allUsers?: User[];
  transactions?: Transaction[];
  customers?: Customer[];
  suppliers?: Supplier[];
  expenses?: Expense[];
  cloudSyncStatus?: 'synced' | 'syncing' | 'offline' | 'error' | 'quota_exceeded';
  isQuotaExceeded?: boolean;
  lastSyncedTime?: string | null;
  onTriggerSync?: () => void;
  onSyncCatalogComplete?: () => void;
  onSyncError?: () => void;
  onPullFromCloud?: () => Promise<{
    productsCount: number;
    salesCount: number;
    customersCount?: number;
    suppliersCount?: number;
    expensesCount?: number;
    usersCount?: number;
  } | void>;
  onEmergencyRestore?: (sourceKey?: string) => Promise<boolean> | boolean;
  masterPin?: string;
  requirePinOnStartup?: boolean;
  onLockNow?: () => void;
  recoveryEmail?: string;
  emergencyKey?: string;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  products,
  allUsers = [],
  transactions = [],
  customers = [],
  suppliers = [],
  expenses = [],
  cloudSyncStatus = 'synced',
  isQuotaExceeded = false,
  lastSyncedTime = null,
  onTriggerSync,
  onSyncCatalogComplete,
  onSyncError,
  onPullFromCloud,
  onEmergencyRestore,
  masterPin = '1234',
  requirePinOnStartup = true,
  onLockNow,
  recoveryEmail = 'NivaJuma@gmail.com',
}) => {
  const { isOnline, pendingCount, isSimulated, toggleSimulatedOffline, checkConnection } = useNetworkStatus();
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    title: string;
    details: string;
    timestamp: string;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    label: string;
    percent: number;
  } | null>(null);

  // Standalone app clean URL that works on mobile phones
  const getCleanShareUrl = () => {
    if (typeof window !== 'undefined' && window.location.href.startsWith('http')) {
      return `${window.location.origin}${window.location.pathname}`;
    }
    return 'https://ais-pre-agpwmbkm7pzkfhwvkrsqrv-987405654779.europe-west2.run.app';
  };

  const [shareUrl, setShareUrl] = useState<string>(getCleanShareUrl());
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState<string>(getCleanShareUrl());
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [showQrCode, setShowQrCode] = useState(true);
  const [showPinOnScreen, setShowPinOnScreen] = useState(false);
  const [includePinInWhatsApp, setIncludePinInWhatsApp] = useState(false);

  // Generate QR Code dynamically
  useEffect(() => {
    let isMounted = true;
    if (!shareUrl) return;

    QRCode.toDataURL(shareUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setQrCodeDataUrl(url);
      })
      .catch((err) => {
        console.warn('QR code generation error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [shareUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    let cleaned = urlInput.trim();
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = `https://${cleaned}`;
    }
    setShareUrl(cleaned);
    setIsEditingUrl(false);
  };

  const handleUploadAllToCloud = async () => {
    if (!isOnline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      setSyncFeedback({
        type: 'error',
        title: 'Sync Did Not Run — Device Offline',
        details: 'Your internet connection appears offline. Local changes are safely stored on this device. Reconnect to Wi-Fi/data and tap "Push to Cloud".',
        timestamp: new Date().toLocaleTimeString(),
      });
      return;
    }

    setIsUploading(true);
    setSyncFeedback(null);
    setUploadProgress({
      label: `Step 1/5: Preparing ${products.length} products for batch upload...`,
      percent: 5,
    });

    try {
      let prodCount = 0;
      if (products.length > 0) {
        prodCount = await batchSaveProductsToCloud(products, (uploaded, total, batch, totalBatches) => {
          const pct = Math.min(55, 5 + Math.round((uploaded / Math.max(total, 1)) * 50));
          setUploadProgress({
            label: `Step 1/5: Uploaded batch ${batch}/${totalBatches} (${uploaded}/${total} products)`,
            percent: pct,
          });
        });
      }

      let usersCount = 0;
      if (allUsers && allUsers.length > 0) {
        setUploadProgress({
          label: `Step 2/5: Syncing ${allUsers.length} staff accounts...`,
          percent: 62,
        });
        usersCount = await bulkUploadUsersToCloud(allUsers);
      }

      let salesCount = 0;
      const recentSales = transactions.slice(0, 200);
      if (recentSales.length > 0) {
        setUploadProgress({
          label: `Step 3/5: Syncing ${recentSales.length} sales transactions...`,
          percent: 70,
        });
        salesCount = await batchSaveTransactionsToCloud(recentSales, (uploaded, total, batch, totalBatches) => {
          setUploadProgress({
            label: `Step 3/5: Sales batch ${batch}/${totalBatches} (${uploaded}/${total})`,
            percent: 70 + Math.round((uploaded / Math.max(total, 1)) * 12),
          });
        });
      }

      let customersCount = 0;
      const recentCustomers = customers.slice(0, 200);
      if (recentCustomers.length > 0) {
        setUploadProgress({
          label: `Step 4/5: Syncing ${recentCustomers.length} customers & ${suppliers.length} suppliers...`,
          percent: 84,
        });
        customersCount = await batchSaveCustomersToCloud(recentCustomers);
      }

      let suppliersCount = 0;
      if (suppliers.length > 0) {
        suppliersCount = await batchSaveSuppliersToCloud(suppliers);
      }

      let expensesCount = 0;
      const recentExpenses = expenses.slice(0, 100);
      if (recentExpenses.length > 0) {
        setUploadProgress({
          label: `Step 5/5: Syncing ${recentExpenses.length} expense records...`,
          percent: 93,
        });
        expensesCount = await batchSaveExpensesToCloud(recentExpenses);
      }

      const parts: string[] = [`${prodCount} products`];
      if (usersCount > 0) parts.push(`${usersCount} staff`);
      if (salesCount > 0) parts.push(`${salesCount} sales`);
      if (customersCount > 0) parts.push(`${customersCount} customers`);
      if (suppliersCount > 0) parts.push(`${suppliersCount} suppliers`);
      if (expensesCount > 0) parts.push(`${expensesCount} expenses`);

      setSyncFeedback({
        type: 'success',
        title: 'Cloud Sync Confirmed & Completed',
        details: `Successfully uploaded ${parts.join(', ')} to Cloud Firestore. Connected devices can now pull these updates immediately.`,
        timestamp: new Date().toLocaleTimeString(),
      });
      if (onSyncCatalogComplete) onSyncCatalogComplete();
    } catch (err: any) {
      if (onSyncError) onSyncError();
      setSyncFeedback({
        type: 'error',
        title: 'Cloud Sync Failed or Timed Out',
        details: err?.message || 'Could not reach Cloud Firestore. Your local data is safe; check your internet connection and try again.',
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setUploadProgress(null);
      setIsUploading(false);
    }
  };

  const handlePullFromCloud = async () => {
    if (!onPullFromCloud) return;
    if (!isOnline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      setSyncFeedback({
        type: 'error',
        title: 'Pull Did Not Run — Device Offline',
        details: 'Your internet connection appears offline. Reconnect to Wi-Fi/data and tap "Pull from Cloud".',
        timestamp: new Date().toLocaleTimeString(),
      });
      return;
    }

    setIsPulling(true);
    setSyncFeedback(null);
    setUploadProgress({
      label: 'Downloading & merging inventory, sales, and contacts from Cloud Firestore...',
      percent: 45,
    });
    try {
      const res = await onPullFromCloud();
      if (res && typeof res === 'object') {
        if (res.productsCount === 0 && res.salesCount === 0 && (res.customersCount ?? 0) === 0) {
          setSyncFeedback({
            type: 'warning',
            title: 'Cloud Database Currently Empty (0 Items)',
            details: `No records were found in Cloud Firestore yet. Tap "Push to Cloud" to upload your ${products.length} local products now.`,
            timestamp: new Date().toLocaleTimeString(),
          });
        } else {
          setSyncFeedback({
            type: 'success',
            title: 'Cloud Pull Confirmed & Merged',
            details: `Pulled & safely merged ${res.productsCount} products, ${res.salesCount} sales, ${res.customersCount || 0} customers, ${res.suppliersCount || 0} suppliers, and ${res.expensesCount || 0} expenses.`,
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      } else {
        setSyncFeedback({
          type: 'success',
          title: 'Cloud Pull Completed',
          details: 'Data pulled and synchronized from Cloud Firestore.',
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } catch (err: any) {
      if (onSyncError) onSyncError();
      setSyncFeedback({
        type: 'error',
        title: 'Failed to Pull from Cloud',
        details: err?.message || 'Could not reach Cloud Firestore. Check your internet connection and try again.',
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setUploadProgress(null);
      setIsPulling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] my-auto">
        
        {/* Sticky Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-slate-100 text-sm sm:text-base flex items-center gap-2 truncate">
                <span className="truncate">Cloud Sync & Multi-Phone Share</span>
                <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-mono shrink-0">
                  Live
                </span>
              </h3>
              <p className="text-xs text-slate-400 truncate">
                Connect and sync inventory in real time across worker mobile devices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition shrink-0 ml-2"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Offline Visual Indicator Banner */}
          {!isOnline && (
            <div
              role="status"
              aria-live="polite"
              className="bg-amber-500/15 border-2 border-amber-500/60 p-4 rounded-2xl space-y-3 shadow-md animate-pulse"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
                  <WifiOff className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                      You are currently offline
                    </span>
                    {pendingCount > 0 && (
                      <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full font-mono">
                        {pendingCount} action{pendingCount === 1 ? '' : 's'} queued
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-amber-200/90 leading-relaxed font-semibold">
                    Any actions performed will only sync once a stable connection is re-established.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-amber-500/30 flex-wrap">
                <button
                  type="button"
                  onClick={async () => {
                    await checkConnection();
                    if (onTriggerSync) onTriggerSync();
                  }}
                  className="px-3 py-1.5 bg-slate-950 text-amber-300 hover:bg-slate-900 border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Check Connection Now</span>
                </button>
                <button
                  type="button"
                  onClick={toggleSimulatedOffline}
                  className="px-3 py-1.5 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {isSimulated ? 'Exit Simulated Offline' : 'Toggle Simulated Offline'}
                </button>
              </div>
            </div>
          )}

          {/* Quota Exceeded Alert Banner (if applicable) */}
          {(cloudSyncStatus === 'quota_exceeded' || isQuotaExceeded) && (
            <div className="bg-amber-950/80 border border-amber-700/80 p-3.5 sm:p-4 rounded-2xl space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="text-xs font-bold text-amber-200 flex items-center gap-2 flex-wrap">
                    <span>Firestore Daily Free Read Quota Reached</span>
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                      Offline Storage Safe
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    The Google Cloud free tier daily read limit (50,000 reads/day) has been reached for this project. <strong>Store POS terminal remains 100% active in Offline Local Storage Mode</strong>. All sales, receipts, worker loans, and inventory continue saving safely to this device.
                  </p>
                  <p className="text-[11px] text-amber-300/80">
                    Free quota resets automatically tomorrow at midnight UTC. To enable unlimited continuous sync now, upgrade to the Blaze pay-as-you-go plan in the Firebase Console.
                  </p>
                  <div className="pt-1">
                    <a
                      href={FIREBASE_UPGRADE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Upgrade Plan in Firebase Console</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Sync Status Banner */}
          <div className={`p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
            cloudSyncStatus === 'quota_exceeded' || isQuotaExceeded
              ? 'bg-amber-950/40 border-amber-800/60'
              : cloudSyncStatus === 'offline' || !isOnline
              ? 'bg-slate-950/80 border-slate-800'
              : cloudSyncStatus === 'error'
              ? 'bg-rose-950/40 border-rose-800/60'
              : 'bg-gradient-to-r from-sky-950/90 to-blue-950/90 border-sky-800/80'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full shrink-0 ${
                cloudSyncStatus === 'quota_exceeded' || isQuotaExceeded
                  ? 'bg-amber-400'
                  : cloudSyncStatus === 'offline' || !isOnline
                  ? 'bg-slate-500'
                  : cloudSyncStatus === 'error'
                  ? 'bg-rose-500'
                  : isUploading || isPulling || cloudSyncStatus === 'syncing'
                  ? 'bg-sky-400 animate-pulse'
                  : 'bg-emerald-400'
              }`} />
              <div>
                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5 flex-wrap">
                  <Radio className={`w-3.5 h-3.5 ${
                    cloudSyncStatus === 'quota_exceeded' || isQuotaExceeded
                      ? 'text-amber-400'
                      : cloudSyncStatus === 'offline' || !isOnline
                      ? 'text-slate-400'
                      : cloudSyncStatus === 'error'
                      ? 'text-rose-400'
                      : 'text-emerald-400'
                  }`} />
                  {cloudSyncStatus === 'quota_exceeded' || isQuotaExceeded
                    ? 'Firestore Quota Reached — Local Mode Active'
                    : cloudSyncStatus === 'offline' || !isOnline
                    ? 'Cloud Sync Offline — Local Cache Safe'
                    : isUploading || isPulling || cloudSyncStatus === 'syncing'
                    ? 'Syncing with Cloud Firestore...'
                    : cloudSyncStatus === 'error'
                    ? 'Last Cloud Sync Had an Error — Tap Push to Retry'
                    : 'Firebase Cloud Firestore Connected'}
                </div>
                <p className="text-[11px] text-slate-300 flex items-center gap-2 flex-wrap">
                  <span>{products.length} products locally ready.</span>
                  {lastSyncedTime && (
                    <span className="inline-flex items-center gap-1 text-emerald-300 font-mono text-[10px]">
                      <Clock className="w-3 h-3" />
                      Last synced: {lastSyncedTime}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {onPullFromCloud && (
                <button
                  type="button"
                  onClick={handlePullFromCloud}
                  disabled={isPulling || isUploading}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 shadow-md transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  <Download className={`w-4 h-4 ${isPulling ? 'animate-spin' : ''}`} />
                  <span>{isPulling ? 'Pulling...' : 'Pull from Cloud'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleUploadAllToCloud}
                disabled={isUploading || isPulling}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
              >
                <UploadCloud className={`w-4 h-4 ${isUploading ? 'animate-spin' : ''}`} />
                <span>{isUploading ? 'Uploading...' : 'Push to Cloud'}</span>
              </button>
            </div>
          </div>

          {uploadProgress && (
            <div className="bg-sky-950/80 border border-sky-500/60 text-sky-100 text-xs p-3.5 rounded-xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold min-w-0">
                  <RefreshCw className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                  <span className="truncate">{uploadProgress.label}</span>
                </div>
                <span className="font-mono font-bold text-sky-300 shrink-0">{uploadProgress.percent}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-sky-800/60">
                <div
                  className="bg-sky-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(4, uploadProgress.percent)}%` }}
                />
              </div>
            </div>
          )}

          {syncFeedback && (
            <div
              role="status"
              aria-live="polite"
              className={`text-xs p-3.5 rounded-xl border flex items-start gap-2.5 ${
                syncFeedback.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-600/80 text-emerald-100'
                  : syncFeedback.type === 'warning'
                  ? 'bg-amber-950/80 border-amber-600/80 text-amber-100'
                  : 'bg-rose-950/80 border-rose-600/80 text-rose-100'
              }`}
            >
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    syncFeedback.type === 'warning' ? 'text-amber-400' : 'text-rose-400'
                  }`}
                />
              )}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-extrabold">{syncFeedback.title}</span>
                  <span className="text-[10px] font-mono opacity-80">{syncFeedback.timestamp}</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-95">{syncFeedback.details}</p>
              </div>
            </div>
          )}

          {/* Emergency Backup Rollback inside CloudSyncModal */}
          {(() => {
            const backups = findRecoverableBackups();
            if (backups.length === 0) return null;
            const largest = backups[0];
            const hasMoreThanCurrent = largest.productsCount > products.length;

            return (
              <div
                className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                  hasMoreThanCurrent
                    ? 'bg-amber-950/60 border-amber-500/80 text-amber-100 shadow-lg shadow-amber-950/40'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <History
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      hasMoreThanCurrent ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                      <span>Emergency Inventory Rollback</span>
                      {hasMoreThanCurrent && (
                        <span className="bg-amber-500 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-black uppercase">
                          {largest.productsCount} Items Available
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      {hasMoreThanCurrent
                        ? `Found pre-pull snapshot "${largest.label}" with ${largest.productsCount} products from ${largest.formattedDate}. If pulling from cloud reduced your items to ${products.length}, click below to restore immediately.`
                        : `Stored local snapshots available (${backups.length} snapshots found). Current items: ${products.length}.`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-modal-restore-largest-snapshot"
                  onClick={async () => {
                    if (onEmergencyRestore) {
                      const ok = await onEmergencyRestore(largest.key);
                      if (ok) {
                        setSyncFeedback({
                          type: 'success',
                          title: `Restored ${largest.productsCount} Products`,
                          details: `Restored ${largest.productsCount} products from ${largest.label}! Now tap "Push to Cloud" to sync all items safely.`,
                          timestamp: new Date().toLocaleTimeString(),
                        });
                      }
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                    hasMoreThanCurrent
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm active:scale-95'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore {largest.productsCount} Items</span>
                </button>
              </div>
            );
          })()}

          {/* Quick Connect & Scan QR Code Section */}
          <div className="bg-slate-950 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-sky-400" />
                Connect Worker Phones & Sync
              </h4>
              <button
                onClick={() => setShowQrCode(!showQrCode)}
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{showQrCode ? 'Hide QR' : 'Show QR Code'}</span>
              </button>
            </div>

            {/* QR Code Card Display for instant mobile camera scanning */}
            {showQrCode && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                {qrCodeDataUrl ? (
                  <div className="p-2 bg-white rounded-xl shadow-md shrink-0">
                    <img
                      src={qrCodeDataUrl}
                      alt="Scan to open ROFANI POS on mobile phone"
                      className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 sm:w-36 sm:h-36 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
                    <QrCode className="w-10 h-10 animate-pulse" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-100 flex items-center justify-center sm:justify-start gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>Instant Phone Camera Scan</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Open your iPhone or Android camera and point it at this QR code. Tap the banner that pops up to open the live store terminal on your phone.
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-sky-300 font-mono">
                    <span>Master Passcode:</span>
                    <strong className="text-white font-bold bg-slate-800/90 px-1.5 py-0.5 rounded tracking-widest">
                      {showPinOnScreen ? masterPin : '••••'}
                    </strong>
                    <button
                      type="button"
                      onClick={() => setShowPinOnScreen(!showPinOnScreen)}
                      className="text-slate-400 hover:text-white p-0.5 transition cursor-pointer"
                      title={showPinOnScreen ? "Hide PIN" : "Reveal PIN"}
                      aria-label="Toggle Master PIN Visibility"
                    >
                      {showPinOnScreen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Share Link Copy & Customization Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Direct Web Link:</span>
                <button
                  onClick={() => {
                    setUrlInput(shareUrl);
                    setIsEditingUrl(!isEditingUrl);
                  }}
                  className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <Edit3 className="w-3 h-3 text-sky-400" />
                  <span>{isEditingUrl ? 'Cancel Edit' : 'Edit Domain / Vercel URL'}</span>
                </button>
              </div>

              {isEditingUrl ? (
                <form onSubmit={handleSaveCustomUrl} className="flex gap-2">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://your-store.vercel.app"
                    className="flex-1 bg-slate-900 border border-sky-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Update
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl p-2 font-mono text-xs text-sky-300">
                  <span className="truncate flex-1 pl-1 select-all">{shareUrl}</span>
                  <button
                    onClick={handleCopyLink}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-sans font-bold text-xs transition flex items-center gap-1 shrink-0 active:scale-95 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Share Buttons & Security Guard */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Master PIN hidden from WhatsApp</span>
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={includePinInWhatsApp}
                    onChange={(e) => setIncludePinInWhatsApp(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-[10px]">Include PIN (Not recommended)</span>
                </label>
              </div>

              {includePinInWhatsApp && (
                <div className="p-2 bg-amber-950/40 border border-amber-600/30 rounded-lg text-[10px] text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Security Warning: Sharing your Master PIN in WhatsApp chats gives full admin terminal access.</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    includePinInWhatsApp
                      ? `Here is our ROFANI POS store terminal link: ${shareUrl}\nStore Master PIN: ${masterPin}`
                      : `Here is our ROFANI POS store terminal link: ${shareUrl}\n\n(Protected POS Terminal. Please sign in with your assigned employee PIN.)`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-center py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share via WhatsApp</span>
                </a>

                <button
                  onClick={() => window.open(shareUrl, '_blank')}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-slate-700 active:scale-95 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test in New Tab</span>
                </button>
              </div>
            </div>

            {/* Security Lock Notice */}
            <div className="p-3 bg-purple-950/40 border border-purple-800/40 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-900/80 text-purple-300 flex items-center justify-center shrink-0">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-purple-200 flex items-center gap-1.5 truncate">
                    <span>Protected by Store Master Passcode</span>
                    <span className="font-mono bg-purple-900/60 text-purple-300 text-[10px] px-1.5 py-0.5 rounded">●●●●</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    {requirePinOnStartup ? 'App locks on load. Workers must enter PIN.' : 'PIN protection on load is optional.'}
                  </p>
                </div>
              </div>

              {onLockNow && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLockNow();
                  }}
                  className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-bold transition shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <Lock className="w-3 h-3" />
                  <span>Lock Terminal</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Real-Time Sync Guide */}
          <div className="bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-2xl space-y-2 text-xs text-slate-300">
            <div className="font-bold text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              Real-Time Stock Synchronization Features:
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-400 list-disc list-inside">
              <li>
                <strong className="text-slate-200">Instant Stock Decrement:</strong> Sales completed on any worker's phone immediately reduce inventory everywhere in real time.
              </li>
              <li>
                <strong className="text-slate-200">Live Item Updates:</strong> Adding products, restocking, or price changes synchronize automatically to all cashier devices.
              </li>
              <li>
                <strong className="text-slate-200">Worker Role & Attribution:</strong> Workers log in with their assigned PIN so sales and commissions are accurately tracked.
              </li>
              <li>
                <strong className="text-slate-200">Home Screen App (PWA):</strong> Workers can tap "Add to Home Screen" in their mobile browser to use it like a native phone app.
              </li>
            </ul>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5 truncate">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Firebase Cloud Firestore Active</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition cursor-pointer shrink-0 ml-2"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
