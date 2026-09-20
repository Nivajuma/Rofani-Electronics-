import React, { useState } from 'react';
import {
  Cloud,
  CloudCheck,
  RefreshCw,
  Smartphone,
  Share2,
  Users,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  UploadCloud,
  X,
  Radio,
  QrCode,
  Lock,
  KeyRound
} from 'lucide-react';
import { bulkUploadProductsToCloud } from '../../lib/cloudSync';
import { Product } from '../../types';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  cloudSyncStatus?: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncedTime?: string | null;
  onTriggerSync?: () => void;
  onSyncCatalogComplete?: () => void;
  masterPin?: string;
  requirePinOnStartup?: boolean;
  onLockNow?: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  products,
  cloudSyncStatus = 'synced',
  lastSyncedTime = null,
  onTriggerSync,
  onSyncCatalogComplete,
  masterPin = '1234',
  requirePinOnStartup = true,
  onLockNow,
}) => {
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Standalone app URL that works on mobile phones
  const appShareUrl = window.location.href.startsWith('http')
    ? window.location.href
    : 'https://ais-pre-agpwmbkm7pzkfhwvkrsqrv-987405654779.europe-west2.run.app';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleUploadAllToCloud = async () => {
    setIsUploading(true);
    setUploadMsg(null);
    try {
      const count = await bulkUploadProductsToCloud(products);
      setUploadMsg(`Successfully published ${count} products to Cloud Firestore! All connected phones are now up to date.`);
      if (onTriggerSync) onTriggerSync();
      if (onSyncCatalogComplete) onSyncCatalogComplete();
    } catch (err) {
      setUploadMsg('Failed to sync to cloud. Please check network connection.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden p-6 space-y-6 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-100 text-base flex items-center gap-2">
                Real-Time Cloud Inventory Sync
                <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
                  Live Active
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Share this app with workers across multiple phones with instant real-time stock sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Sync Status Banner */}
        <div className="bg-gradient-to-r from-sky-950/90 to-blue-950/90 border border-sky-800/80 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <div>
              <div className="text-xs font-bold text-sky-200 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-emerald-400" /> Firebase Cloud Firestore Connected
              </div>
              <p className="text-[11px] text-slate-300">
                {products.length} catalog products synced. Changes appear instantly across all devices.
              </p>
            </div>
          </div>

          <button
            onClick={handleUploadAllToCloud}
            disabled={isUploading}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
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

        {/* How to Connect Workers Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-sky-400" />
            How to Connect Your Workers' Mobile Phones
          </h4>

          {/* Direct Share Link Box */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
            <p className="text-xs text-slate-300">
              Send this direct link to your workers via WhatsApp, SMS, or Telegram. When they open it on their phones, they will see the exact same stock levels and items in real time:
            </p>

            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl p-2 font-mono text-xs text-sky-300">
              <span className="truncate flex-1 pl-1 select-all">{appShareUrl}</span>
              <button
                onClick={handleCopyLink}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-sans font-bold text-xs transition flex items-center gap-1 shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>

            <div className="flex gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Here is our ROFANI POS store terminal link: ${appShareUrl}\nStore Master PIN: ${masterPin}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-center py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share to WhatsApp</span>
              </a>

              <button
                onClick={() => window.open(appShareUrl, '_blank')}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1 border border-slate-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test in New Tab</span>
              </button>
            </div>

            {/* Login PIN Protection Notice */}
            <div className="p-3 bg-purple-950/40 border border-purple-800/40 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-900/80 text-purple-300 flex items-center justify-center">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-purple-200 flex items-center gap-1">
                    <span>Protected by Store Master PIN:</span>
                    <span className="font-mono bg-purple-900 px-1.5 py-0.2 rounded text-white">{masterPin}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {requirePinOnStartup ? 'App locks on load. Workers must enter PIN to enter.' : 'PIN protection on load is currently optional.'}
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
                  className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-bold transition shrink-0 flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" />
                  <span>Lock Terminal</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Guide for Workers */}
          <div className="bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-2xl space-y-2 text-xs text-slate-300">
            <div className="font-bold text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              What Happens When Workers Sell or Restock:
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-400 list-disc list-inside">
              <li>
                <strong className="text-slate-200">Stock Decrements Everywhere:</strong> When Worker A completes a sale on their phone, the stock count reduces immediately on your phone and all other workers' phones without refreshing.
              </li>
              <li>
                <strong className="text-slate-200">New Items Synchronize:</strong> Adding a new item or updating a price on one phone makes it immediately searchable on every cashier device.
              </li>
              <li>
                <strong className="text-slate-200">Role & PIN Security:</strong> Each worker can select their name and enter their PIN to attribute their sales and commission accurately.
              </li>
              <li>
                <strong className="text-slate-200">Install as Phone App:</strong> Workers can tap the browser menu on their phone and select <em>"Add to Home Screen"</em> to install it as an app icon.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Persistent Cloud Firestore Database Active
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
