import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useNetworkStatus } from '../../utils/offlineSync';

interface NetworkStatusBadgeProps {
  className?: string;
  showQueueCount?: boolean;
  onClick?: () => void;
}

export const NetworkStatusBadge: React.FC<NetworkStatusBadgeProps> = ({
  className = '',
  showQueueCount = true,
  onClick,
}) => {
  const { isOnline, pendingCount, isSimulated } = useNetworkStatus();

  if (!isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        onClick={onClick}
        title="You are currently offline. Any actions performed will only sync once a stable connection is re-established."
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 border-2 border-amber-500/60 text-amber-900 dark:text-amber-300 font-extrabold text-xs shadow-sm animate-pulse transition ${
          onClick ? 'cursor-pointer hover:bg-amber-500/25 active:scale-95' : ''
        } ${className}`}
      >
        <WifiOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span className="hidden sm:inline">Offline (Actions sync when re-connected)</span>
        <span className="sm:hidden">Offline</span>
        {isSimulated && (
          <span className="bg-purple-950 text-purple-200 text-[9px] px-1 py-0.2 rounded font-bold">
            Sim
          </span>
        )}
        {showQueueCount && pendingCount > 0 && (
          <span
            className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono ml-0.5"
            title={`${pendingCount} action(s) stored locally waiting for stable connection to sync`}
          >
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      role="status"
      onClick={onClick}
      title="Connected: Cloud synchronization active across devices"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition ${
        onClick ? 'cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/40' : ''
      } ${className}`}
    >
      <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <span className="hidden xl:inline">Online</span>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
    </div>
  );
};

