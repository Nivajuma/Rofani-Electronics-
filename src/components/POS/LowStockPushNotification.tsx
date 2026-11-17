import React, { useEffect, useState } from 'react';
import { AlertTriangle, Bell, BellRing, Package, X } from 'lucide-react';

export interface LowStockPushAlertItem {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  previousStock: number;
  remainingStock: number;
  minStockLimit: number;
  severity: 'out_of_stock' | 'low_stock';
}

export interface LowStockPushAlert {
  id: string;
  receiptNumber: string;
  triggeredAt: string;
  items: LowStockPushAlertItem[];
}

interface LowStockPushNotificationProps {
  alerts: LowStockPushAlert[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  onViewInventory: () => void;
  onOpenStockDigest: () => void;
}

const AUTO_DISMISS_MS = 14000;

interface PushAlertCardProps {
  alert: LowStockPushAlert;
  onDismiss: (id: string) => void;
  onViewInventory: () => void;
  onOpenStockDigest: () => void;
}

const PushAlertCard: React.FC<PushAlertCardProps> = ({
  alert,
  onDismiss,
  onViewInventory,
  onOpenStockDigest,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const timer = setTimeout(() => {
      onDismiss(alert.id);
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [alert.id, isHovered, onDismiss]);

  const hasOutOfStock = alert.items.some((it) => it.severity === 'out_of_stock');
  const visibleItems = alert.items.slice(0, 4);
  const extraCount = alert.items.length - visibleItems.length;

  return (
    <div
      role="alert"
      aria-live="assertive"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`pointer-events-auto rounded-2xl border-2 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 animate-in slide-in-from-right-5 fade-in ${
        hasOutOfStock
          ? 'bg-slate-950/95 border-rose-500/80 shadow-rose-950/50'
          : 'bg-slate-950/95 border-amber-500/80 shadow-amber-950/40'
      }`}
    >
      {/* Top Status Strip */}
      <div
        className={`px-3.5 py-2 flex items-center justify-between gap-2 border-b ${
          hasOutOfStock
            ? 'bg-gradient-to-r from-rose-600/25 via-rose-500/15 to-transparent border-rose-500/30'
            : 'bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-transparent border-amber-500/30'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
              hasOutOfStock
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/50'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/50'
            }`}
          >
            {hasOutOfStock ? (
              <AlertTriangle className="w-4 h-4 animate-pulse" />
            ) : (
              <BellRing className="w-4 h-4 animate-pulse" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black tracking-tight text-white">
                Low Stock Alert
              </span>
              <span
                className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                  hasOutOfStock
                    ? 'bg-rose-500 text-white'
                    : 'bg-amber-400 text-slate-950'
                }`}
              >
                {hasOutOfStock ? 'Stock Limit / 0 Left' : 'Min Limit Reached'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              Sale #{alert.receiptNumber} • {alert.triggeredAt}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDismiss(alert.id)}
          aria-label="Dismiss low stock alert"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Product Rows */}
      <div className="p-3 space-y-2 max-h-56 overflow-y-auto">
        {visibleItems.map((item) => {
          const isZero = item.severity === 'out_of_stock';
          return (
            <div
              key={item.productId}
              className={`rounded-xl px-3 py-2 border flex items-center justify-between gap-2.5 text-xs ${
                isZero
                  ? 'bg-rose-950/40 border-rose-500/35 text-rose-100'
                  : 'bg-amber-950/35 border-amber-500/30 text-amber-100'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-100 truncate">{item.name}</div>
                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                  {item.sku && <span>SKU: {item.sku}</span>}
                  <span>
                    {item.previousStock} &rarr; {item.remainingStock} {item.unit}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`inline-block font-mono font-extrabold text-[11px] px-2 py-0.5 rounded-lg ${
                    isZero
                      ? 'bg-rose-600 text-white'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {isZero ? 'OUT OF STOCK' : `${item.remainingStock} ${item.unit} left`}
                </span>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Min limit: {item.minStockLimit}
                </div>
              </div>
            </div>
          );
        })}

        {extraCount > 0 && (
          <div className="text-[11px] text-slate-400 font-semibold text-center pt-0.5">
            +{extraCount} more item{extraCount === 1 ? '' : 's'} reached minimum stock
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-3 pb-3 pt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            onViewInventory();
            onDismiss(alert.id);
          }}
          className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm ${
            hasOutOfStock
              ? 'bg-rose-600 hover:bg-rose-500 text-white'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Restock in Inventory</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenStockDigest();
            onDismiss(alert.id);
          }}
          className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-[11px] flex items-center gap-1.5 transition cursor-pointer shrink-0"
        >
          <Bell className="w-3.5 h-3.5 text-amber-400" />
          <span>All Alerts</span>
        </button>
      </div>
    </div>
  );
};

export const LowStockPushNotification: React.FC<LowStockPushNotificationProps> = ({
  alerts,
  onDismiss,
  onDismissAll,
  onViewInventory,
  onOpenStockDigest,
}) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div
      className="fixed top-3 right-3 left-3 sm:left-auto sm:w-[400px] z-[140] flex flex-col gap-2.5 pointer-events-none"
      data-testid="low-stock-push-stack"
    >
      {alerts.length > 1 && (
        <div className="flex justify-end pointer-events-auto">
          <button
            type="button"
            onClick={onDismissAll}
            className="px-3 py-1 bg-slate-900/95 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-full text-[10px] font-bold shadow-lg cursor-pointer transition"
          >
            Dismiss All ({alerts.length})
          </button>
        </div>
      )}

      {alerts.map((alert) => (
        <PushAlertCard
          key={alert.id}
          alert={alert}
          onDismiss={onDismiss}
          onViewInventory={onViewInventory}
          onOpenStockDigest={onOpenStockDigest}
        />
      ))}
    </div>
  );
};
