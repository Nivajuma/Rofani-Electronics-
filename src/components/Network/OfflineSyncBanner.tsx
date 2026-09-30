import React, { useState, useEffect } from 'react';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  HardDrive,
  AlertTriangle,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
  Maximize2
} from 'lucide-react';
import {
  useNetworkStatus,
  PendingSyncItem
} from '../../utils/offlineSync';

interface OfflineSyncBannerProps {
  compact?: boolean;
  onTriggerSync?: () => Promise<void> | void;
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({
  compact = false,
  onTriggerSync,
}) => {
  const {
    isOnline,
    pendingCount,
    queuedItems,
    isSimulated,
    toggleSimulatedOffline,
    checkConnection
  } = useNetworkStatus();

  const [showReconnectedBanner, setShowReconnectedBanner] = useState<boolean>(false);
  const [wasOffline, setWasOffline] = useState<boolean>(!isOnline);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [showQueueDetails, setShowQueueDetails] = useState<boolean>(false);

  // Monitor network transitions to show reconnection success notification
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline && isOnline) {
      setShowReconnectedBanner(true);
      setWasOffline(false);
      setIsDismissed(false);

      if (onTriggerSync) {
        try {
          onTriggerSync();
        } catch (err) {
          console.warn('Auto-sync on reconnect error:', err);
        }
      }

      const timer = setTimeout(() => {
        setShowReconnectedBanner(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, onTriggerSync]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const recovered = await checkConnection();
      if (recovered && onTriggerSync) {
        onTriggerSync();
      }
    } finally {
      setTimeout(() => setIsChecking(false), 600);
    }
  };

  // Connection Restored Success Banner (Temporary)
  if (showReconnectedBanner) {
    return (
      <aside
        aria-live="polite"
        className={`bg-emerald-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-lg z-40 transition-all duration-300 animate-in fade-in slide-in-from-top-2 border-b border-emerald-500 ${
          compact ? 'rounded-xl my-1' : 'w-full'
        }`}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="flex items-center gap-1.5 bg-white/20 text-white px-2.5 py-1 rounded-full text-xs font-bold tracking-wide">
            <Wifi className="w-3.5 h-3.5 text-white animate-pulse" /> Connection Re-established
          </span>
          <span className="font-semibold text-white text-xs sm:text-sm">
            Stable connection re-established! Synchronizing local actions and inventory records to cloud...
          </span>
        </div>
        <button
          onClick={() => setShowReconnectedBanner(false)}
          className="text-white/80 hover:text-white p-1 font-bold text-xs cursor-pointer ml-3 rounded-lg hover:bg-emerald-700/50 transition"
          title="Dismiss"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  // If online, render nothing
  if (isOnline) {
    return null;
  }

  // When offline and user minimized the full top banner, show a persistent floating indicator
  if (isDismissed) {
    return (
      <div
        role="status"
        aria-live="polite"
        onClick={() => setIsDismissed(false)}
        className="fixed bottom-4 right-4 z-50 bg-slate-950/95 border-2 border-amber-500/90 text-amber-300 px-3.5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold cursor-pointer hover:bg-slate-900 transition group select-none backdrop-blur"
        title="You are currently offline. Click to expand full details."
      >
        <div className="relative">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider">Currently Offline</span>
          <span className="text-[10px] text-amber-200/90 font-medium">Actions will sync once re-connected</span>
        </div>
        {pendingCount > 0 && (
          <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full font-mono ml-1">
            {pendingCount}
          </span>
        )}
        <Maximize2 className="w-3.5 h-3.5 text-amber-400/80 group-hover:text-amber-300 ml-1 shrink-0" />
      </div>
    );
  }

  // Full, prominent Offline Warning & Sync Notification Banner
  return (
    <aside
      aria-live="assertive"
      className={`bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 shadow-lg z-40 transition-all border-b-2 border-amber-600/50 ${
        compact ? 'rounded-2xl p-3 my-1.5 border' : 'w-full px-4 py-2.5'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Side: Status Icon, Title & Explicit Sync Notification */}
        <div className="flex items-start md:items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 shadow-md border border-amber-400/50 animate-pulse">
            <WifiOff className="w-5 h-5 text-amber-400" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-slate-950 text-amber-300 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                Offline Mode
              </span>

              <h2 className="text-xs sm:text-sm font-black text-slate-950 leading-tight">
                You are currently offline.
              </h2>

              <span className="inline-flex items-center gap-1 bg-amber-600/25 text-slate-950 px-2 py-0.5 rounded-md text-[11px] font-bold border border-amber-700/30">
                <HardDrive className="w-3.5 h-3.5 text-slate-900" />
                Actions saved locally on this device
              </span>

              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowQueueDetails(!showQueueDetails)}
                  className="inline-flex items-center gap-1.5 bg-slate-950 text-amber-300 px-2.5 py-0.5 rounded-md text-[11px] font-bold border border-amber-400/40 hover:bg-slate-900 transition cursor-pointer shadow-sm"
                  title="View actions waiting to sync"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{pendingCount} action{pendingCount === 1 ? '' : 's'} queued to sync</span>
                  {showQueueDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}

              {isSimulated && (
                <span className="bg-purple-950 text-purple-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                  Simulated
                </span>
              )}
            </div>

            <p className="text-xs sm:text-xs font-semibold text-slate-950 mt-1 leading-snug">
              Any actions performed (sales, inventory edits, customer updates, expenses) will only sync once a stable connection is re-established.
            </p>
          </div>
        </div>

        {/* Right Side: Reconnect Check Button, Simulator Toggle & Minimize */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={isChecking}
            className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-amber-300 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-60 border border-amber-400/40"
            title="Test if network connection has recovered"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Testing...' : 'Check Connection'}</span>
          </button>

          {isSimulated ? (
            <button
              type="button"
              onClick={toggleSimulatedOffline}
              className="px-2.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              title="End simulated offline test and return to online state"
            >
              Go Online
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleSimulatedOffline}
              className="hidden sm:inline-flex px-2 py-1 bg-amber-600/30 hover:bg-amber-600/40 text-slate-900 rounded-lg text-[10px] font-bold transition border border-amber-700/20 cursor-pointer"
              title="Simulate offline state to test local queue and visual indicators"
            >
              Simulate Off
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1.5 text-slate-950 hover:text-black hover:bg-amber-600/40 rounded-xl transition font-black cursor-pointer"
            title="Minimize banner (floating offline indicator remains active)"
            aria-label="Minimize banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Sync Queue Details Drawer */}
      {showQueueDetails && queuedItems.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-amber-700/30 max-h-52 overflow-y-auto space-y-2 text-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-950">
            <span>Actions queued locally (will sync once connection is restored):</span>
            <span className="font-mono bg-slate-950 text-amber-300 px-2 py-0.5 rounded text-[10px]">
              Total: {queuedItems.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {queuedItems.slice(0, 9).map((item) => (
              <div
                key={item.id}
                className="bg-slate-950/95 text-slate-200 p-2.5 rounded-xl border border-amber-500/30 text-[11px] flex items-center justify-between gap-2 shadow-sm"
              >
                <div className="min-w-0">
                  <span className="font-bold text-amber-300 uppercase text-[9px] tracking-wider block">
                    {item.type}
                  </span>
                  <span className="truncate block font-medium text-slate-100">
                    {item.description}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 font-mono shrink-0">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
          {queuedItems.length > 9 && (
            <p className="text-[11px] text-slate-950 font-bold text-center pt-1">
              + {queuedItems.length - 9} more actions stored safely in local memory
            </p>
          )}
        </div>
      )}
    </aside>
  );
};

