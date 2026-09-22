import React, { useState, useEffect } from 'react';
import {
  Cloud,
  RefreshCw,
  Smartphone,
  Share2,
  Users,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  UploadCloud,
  X,
  Radio,
  QrCode,
  Lock,
  Edit3
} from 'lucide-react';
import QRCode from 'qrcode';
import { bulkUploadProductsToCloud, bulkUploadUsersToCloud } from '../../lib/cloudSync';
import { Product, User } from '../../types';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  allUsers?: User[];
  cloudSyncStatus?: 'synced' | 'syncing' | 'offline' | 'error' | 'quota_exceeded';
  isQuotaExceeded?: boolean;
  lastSyncedTime?: string | null;
  onTriggerSync?: () => void;
  onSyncCatalogComplete?: () => void;
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
  cloudSyncStatus = 'synced',
  isQuotaExceeded = false,
  lastSyncedTime = null,
  onTriggerSync,
  onSyncCatalogComplete,
  masterPin = '1234',
  requirePinOnStartup = true,
  onLockNow,
  recoveryEmail = 'NivaJuma@gmail.com',
}) => {
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

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
    setIsUploading(true);
    setUploadMsg(null);
    try {
      const count = await bulkUploadProductsToCloud(products);
      if (allUsers && allUsers.length > 0) {
        await bulkUploadUsersToCloud(allUsers);
      }
      setUploadMsg(`Successfully published ${count} products & ${allUsers.length} staff accounts to Cloud Firestore! All connected phones are now up to date.`);
      if (onTriggerSync) onTriggerSync();
      if (onSyncCatalogComplete) onSyncCatalogComplete();
    } catch (err) {
      setUploadMsg('Failed to sync to cloud. Please check network connection.');
    } finally {
      setIsUploading(false);
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
          {/* Quota Exceeded Alert Banner (if applicable) */}
          {(cloudSyncStatus === 'quota_exceeded' || isQuotaExceeded) && (
            <div className="bg-amber-950/80 border border-amber-700/80 p-3.5 sm:p-4 rounded-2xl space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-xs font-bold text-amber-200 flex items-center gap-2 flex-wrap">
                    <span>Firestore Daily Read Quota Reached</span>
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                      Offline Storage Safe
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    Store POS terminal remains 100% active in Offline / Local Storage Mode. All sales, receipts, worker loans, and inventory continue saving safely to this device.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Live Sync Status Banner */}
          <div className={`p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
            cloudSyncStatus === 'quota_exceeded' || isQuotaExceeded
              ? 'bg-amber-950/40 border-amber-800/60'
              : cloudSyncStatus === 'offline'
              ? 'bg-slate-950/80 border-slate-800'
              : 'bg-gradient-to-r from-sky-950/90 to-blue-950/90 border-sky-800/80'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full shrink-0 ${
                cloudSyncStatus === 'quota_exceeded' || isQuotaExceeded
                  ? 'bg-amber-400'
                  : cloudSyncStatus === 'offline'
                  ? 'bg-slate-500'
                  : 'bg-emerald-400 animate-ping'
              }`} />
              <div>
                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5 flex-wrap">
                  <Radio className={`w-3.5 h-3.5 ${
                    cloudSyncStatus === 'quota_exceeded' || isQuotaExceeded
                      ? 'text-amber-400'
                      : cloudSyncStatus === 'offline'
                      ? 'text-slate-400'
                      : 'text-emerald-400'
                  }`} />
                  {cloudSyncStatus === 'quota_exceeded' || isQuotaExceeded
                    ? 'Firestore Quota Reached — Local Mode Active'
                    : cloudSyncStatus === 'offline'
                    ? 'Cloud Sync Offline — Local Cache Safe'
                    : 'Firebase Cloud Firestore Connected'}
                </div>
                <p className="text-[11px] text-slate-300">
                  {products.length} products synced. Changes update live across all phones.
                </p>
              </div>
            </div>

            <button
              onClick={handleUploadAllToCloud}
              disabled={isUploading}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <UploadCloud className={`w-4 h-4 ${isUploading ? 'animate-spin' : ''}`} />
              <span>{isUploading ? 'Syncing...' : 'Sync Catalog Now'}</span>
            </button>
          </div>

          {uploadMsg && (
            <div className="bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-xs p-3 rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{uploadMsg}</span>
            </div>
          )}

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
                  <p className="text-[11px] text-sky-300 font-mono">
                    Master Passcode: <strong className="text-white font-bold">{masterPin}</strong>
                  </p>
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
                    className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition"
                  >
                    Update
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl p-2 font-mono text-xs text-sky-300">
                  <span className="truncate flex-1 pl-1 select-all">{shareUrl}</span>
                  <button
                    onClick={handleCopyLink}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-sans font-bold text-xs transition flex items-center gap-1 shrink-0 active:scale-95"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Share Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Here is our ROFANI POS store terminal link: ${shareUrl}\nStore Master PIN: ${masterPin}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-center py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
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
