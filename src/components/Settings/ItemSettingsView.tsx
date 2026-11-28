import React, { useState } from 'react';
import {
  ArrowLeft,
  Search,
  Info,
  Check,
  Layers,
  BellRing,
} from 'lucide-react';
import {
  ItemSettingsState,
  useItemSettings,
} from '../../utils/itemSettings';
import {
  loadShopProtectionSettings,
  saveShopProtectionSettingsLocal,
} from '../../utils/shopProtectionSettings';
import {
  loadTransactionSettings,
  saveTransactionSettingsLocal,
} from '../../utils/transactionSettings';
import {
  saveItemSettingsToCloud,
  saveShopProtectionSettingsToCloud,
  saveTransactionSettingsToCloud,
} from '../../lib/cloudSync';
import { auth, isAuthorizedCloudUser } from '../../lib/firebase';
import { useI18n } from '../../utils/i18n';

export type { ItemSettingsState };

interface ItemSettingsViewProps {
  onBack: () => void;
  onOpenCategoryManager?: () => void;
  activeStoreId?: string;
  activeStoreName?: string;
}

export const ItemSettingsView: React.FC<ItemSettingsViewProps> = ({
  onBack,
  onOpenCategoryManager,
  activeStoreId,
  activeStoreName = 'Rofani POS',
}) => {
  const { dir } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [settings, setSettings] = useItemSettings(activeStoreId);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const updateSetting = <K extends keyof ItemSettingsState>(key: K, value: ItemSettingsState[K]) => {
    const next: ItemSettingsState = {
      ...settings,
      [key]: value,
      ...(key === 'trackExpiryDate' || key === 'enableExpiryDate'
        ? {
            trackExpiryDate: Boolean(value),
            enableExpiryDate: Boolean(value),
          }
        : {}),
      updatedAt: new Date().toISOString(),
    };
    setSettings(next);

    const canCloud = Boolean(activeStoreId && isAuthorizedCloudUser(auth.currentUser));

    if (canCloud && activeStoreId) {
      saveItemSettingsToCloud(next, activeStoreId).catch((err) =>
        console.warn('Cloud item settings sync notice:', err)
      );
    }

    // Keep cross-module shared flags synchronized in real time under stores/{storeId}
    if (key === 'barcodeScanning') {
      const tx = loadTransactionSettings(activeStoreId);
      const nextTx = saveTransactionSettingsLocal(
        { ...tx, enableBarcodeScanning: Boolean(value) },
        activeStoreId
      );
      if (canCloud && activeStoreId) {
        saveTransactionSettingsToCloud(nextTx, activeStoreId).catch(() => {});
      }
    }

    if (
      key === 'canSellBelowBuyingPrice' ||
      key === 'enableCacheOnCart' ||
      key === 'trackExpiryDate' ||
      key === 'enableExpiryDate'
    ) {
      const sc = loadShopProtectionSettings(activeStoreId);
      const patch =
        key === 'canSellBelowBuyingPrice'
          ? { canSellBelowBuyingPrice: Boolean(value) }
          : key === 'enableCacheOnCart'
          ? { enableCacheOnCart: Boolean(value) }
          : { enableExpiryAlerts: Boolean(value) };
      const nextSc = saveShopProtectionSettingsLocal({ ...sc, ...patch }, activeStoreId);
      if (canCloud && activeStoreId) {
        saveShopProtectionSettingsToCloud(nextSc, activeStoreId).catch(() => {});
      }
    }

    triggerToast('Item settings updated for active shop!');
  };

  const settingItems: Array<{
    key: keyof ItemSettingsState;
    label: string;
    type: 'toggle' | 'select' | 'stepper' | 'percent';
    value: any;
    options?: string[];
    description: string;
  }> = [
    {
      key: 'enableItem',
      label: 'Enable Item',
      type: 'toggle',
      value: settings.enableItem,
      description: 'Global master toggle to enable or disable inventory item cataloging across sales.',
    },
    {
      key: 'itemType',
      label: 'Item Type',
      type: 'select',
      value: settings.itemType,
      options: ['Products and Services', 'Products Only', 'Services Only'],
      description: 'Set default inventory behavior and item classification.',
    },
    {
      key: 'enableProductImages',
      label: 'Product Images & Photos',
      type: 'toggle',
      value: settings.enableProductImages,
      description: 'Show product image upload, camera/AI photo picker, and thumbnails on Add/Edit Item, Stock-In, and POS.',
    },
    {
      key: 'barcodeScanning',
      label: 'Barcode Scanning & Lookup',
      type: 'toggle',
      value: settings.barcodeScanning,
      description: 'Show barcode/QR inputs, Quick Scan buttons, and barcode lookup across Add/Edit Item and POS checkout.',
    },
    {
      key: 'trackExpiryDate',
      label: 'Expiry Date Tracking',
      type: 'toggle',
      value: settings.trackExpiryDate,
      description: 'Show expiry date field on items and track near-expiry or expired stock',
    },
    {
      key: 'canSellBelowBuyingPrice',
      label: 'Can Sell Below Buying Price',
      type: 'toggle',
      value: settings.canSellBelowBuyingPrice,
      description: 'When OFF, blocks saving or selling below buying cost without Manager/Admin PIN and warns on negative profit.',
    },
    {
      key: 'autoSetSellingPriceZeroMargin',
      label: 'Auto-Set Selling Price To 0% More Than Buying Price',
      type: 'toggle',
      value: settings.autoSetSellingPriceZeroMargin,
      description: 'When ON, entering or restocking items automatically sets selling price equal to buying price (0% markup).',
    },
    {
      key: 'itemWiseDiscount',
      label: 'Item Wise Discount',
      type: 'toggle',
      value: settings.itemWiseDiscount,
      description: 'Enable per-item discounts during POS sales checkout.',
    },
    {
      key: 'enableGlobalItemDiscount',
      label: 'Enable Global Item Discount Rule',
      type: 'toggle',
      value: settings.enableGlobalItemDiscount,
      description: 'Automatically apply a default global percentage discount when items are added to the POS cart.',
    },
    ...(settings.enableGlobalItemDiscount
      ? [
          {
            key: 'globalItemDiscountPercent' as keyof ItemSettingsState,
            label: 'Global Item Discount (%)',
            type: 'percent' as const,
            value: settings.globalItemDiscountPercent,
            description: 'Percentage discount automatically applied to each item added to the POS cart (0% – 100%).',
          },
        ]
      : []),
    {
      key: 'enableCacheOnCart',
      label: 'Enable Cache On Cart',
      type: 'toggle',
      value: settings.enableCacheOnCart,
      description: 'Persist and restore active POS cart items, customer, and discounts per store across reloads.',
    },
    {
      key: 'stockMaintenance',
      label: 'Stock Maintenance',
      type: 'toggle',
      value: settings.stockMaintenance,
      description: 'Automatically track stock quantities on hand, reorder points, and low-stock alerts.',
    },
    {
      key: 'manufacturing',
      label: 'Manufacturing',
      type: 'toggle',
      value: settings.manufacturing,
      description: 'Track raw materials, bill of materials (BOM), and assembly production costs.',
    },
    {
      key: 'itemUnits',
      label: 'Item Units',
      type: 'toggle',
      value: settings.itemUnits,
      description: 'Enable multi-unit support (e.g., Pcs, Boxes, Kgs, Liters, Meters).',
    },
    {
      key: 'defaultUnit',
      label: 'Default Unit',
      type: 'toggle',
      value: settings.defaultUnit,
      description: 'Lock a single global default unit across all newly created inventory items.',
    },
    {
      key: 'itemCategory',
      label: 'Item Category',
      type: 'toggle',
      value: settings.itemCategory,
      description: 'Enable grouping products by category (Electronics, Boutique, Accessories, etc.).',
    },
    {
      key: 'partyWiseItemRate',
      label: 'Party Wise Item Rate',
      type: 'toggle',
      value: settings.partyWiseItemRate,
      description: 'Configure custom wholesale or special pricing per individual customer/party group.',
    },
    {
      key: 'wholesalePrice',
      label: 'Wholesale Price',
      type: 'toggle',
      value: settings.wholesalePrice,
      description: 'Enable a secondary wholesale price field on inventory items.',
    },
    {
      key: 'quantityDecimals',
      label: 'Quantity (Upto Decimal places)',
      type: 'stepper',
      value: settings.quantityDecimals,
      description: 'Set quantity decimal precision (0 for whole units, 2 for fractional quantities).',
    },
    {
      key: 'itemWiseTax',
      label: 'Item Wise Tax',
      type: 'toggle',
      value: settings.itemWiseTax,
      description: 'Enable individual tax rate assignment per item (overrides global shop tax rate).',
    },
  ];

  const filteredItems = settingItems.filter(
    (item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const showExpiryNotificationsSection =
    !normalizedQuery ||
    'expiry notifications near-expiry alert days advance warning threshold'.includes(normalizedQuery) ||
    'expiry notifications'.includes(normalizedQuery) ||
    'near-expiry'.includes(normalizedQuery) ||
    normalizedQuery.includes('expir') ||
    normalizedQuery.includes('notif') ||
    normalizedQuery.includes('day') ||
    normalizedQuery.includes('alert');

  return (
    <div dir={dir} className="min-h-screen bg-slate-950 text-slate-100 pb-16 font-sans">
      {/* Header */}
      <div dir="ltr" className="sticky top-0 z-30 bg-slate-900 text-white shadow-md px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-base sm:text-lg tracking-tight truncate">Item Settings</h1>
            <p className="text-[10px] text-slate-400 truncate">
              {activeStoreName} • Inventory Catalog &amp; Stock Configuration
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-44 sm:w-64 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search item settings..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-700 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{successToast}</span>
        </div>
      )}

      {/* Clean List with Info Badges */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {onOpenCategoryManager && (
          <div className="bg-sky-950/30 border border-sky-800/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 flex-1 pr-2">
              <div className="flex items-center gap-2 text-sky-300">
                <Layers className="w-4 h-4 shrink-0" />
                <span className="font-bold text-sm text-white">Manage Categories & Subcategories</span>
              </div>
              <p className="text-xs text-slate-400">
                Create, rename, reassign, or delete product categories and subcategories across your store catalog.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenCategoryManager}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-sky-600/20 shrink-0 cursor-pointer"
            >
              Open Category Manager
            </button>
          </div>
        )}

        {filteredItems.length === 0 && !showExpiryNotificationsSection ? (
          <div className="bg-slate-900 rounded-2xl p-12 text-center text-slate-400 shadow-sm border border-slate-800 text-xs">
            No item settings found matching "{searchQuery}".
          </div>
        ) : (
          <>
            {filteredItems.map((item) => (
            <div
              key={item.key}
              className="bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition"
            >
              <div className="space-y-1 flex-1 pr-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-100">{item.label}</span>
                  <div title={item.description} className="cursor-pointer text-slate-400 hover:text-blue-400 transition">
                    <Info className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
              </div>

              {/* Controls */}
              <div className="shrink-0 flex items-center justify-end">
                {item.type === 'toggle' && (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(item.value)}
                      onChange={(e) => updateSetting(item.key, e.target.checked as any)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                )}

                {item.type === 'select' && (
                  <select
                    value={String(item.value)}
                    onChange={(e) => updateSetting(item.key, e.target.value as any)}
                    className="bg-slate-950 border border-slate-700 text-slate-100 font-semibold text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {item.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {item.type === 'percent' && (
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={Number(item.value) === 0 ? '' : Number(item.value)}
                      placeholder="0"
                      onChange={(e) => {
                        const raw = parseFloat(e.target.value);
                        const clamped = isNaN(raw) ? 0 : Math.min(100, Math.max(0, raw));
                        updateSetting(item.key, clamped as any);
                      }}
                      className="w-16 bg-transparent text-right font-mono font-bold text-slate-100 text-xs focus:outline-none"
                    />
                    <span className="text-xs font-mono text-slate-400">%</span>
                  </div>
                )}

                {item.type === 'stepper' && (
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1">
                    <button
                      onClick={() =>
                        updateSetting(item.key, Math.max(0, Number(item.value) - 1) as any)
                      }
                      className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 font-bold shadow-xs hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-slate-100 text-sm">
                      {String(item.value)}
                    </span>
                    <button
                      onClick={() =>
                        updateSetting(item.key, Math.min(6, Number(item.value) + 1) as any)
                      }
                      className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 font-bold shadow-xs hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
            ))}

            {showExpiryNotificationsSection && (
              <section className="bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-400 flex items-center justify-center shrink-0">
                      <BellRing className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-bold text-sm text-slate-100">Expiry Notifications</h2>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Configure how many days in advance to trigger alerts for near-expiry products across Inventory and POS.
                      </p>
                    </div>
                  </div>
                  <span
                    className={`self-start sm:self-center text-[11px] font-bold px-2.5 py-1 rounded-lg border shrink-0 ${
                      settings.trackExpiryDate
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {settings.trackExpiryDate ? 'Tracking Active' : 'Tracking Off'}
                  </span>
                </div>

                {!settings.trackExpiryDate && (
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-400">
                      Expiry Date Tracking is currently off. Enable it to show Expiry Date fields on items and activate live near-expiry alerts.
                    </p>
                    <button
                      type="button"
                      onClick={() => updateSetting('trackExpiryDate', true)}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition shrink-0 cursor-pointer"
                    >
                      Enable Tracking
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <label
                      htmlFor="expiry-alert-days-input"
                      className="font-bold text-xs text-slate-200 block"
                    >
                      Near-Expiry Alert Lead Time (Days in Advance)
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Trigger an alert when an item expires within{' '}
                      <strong className="text-amber-300 font-mono">{settings.expiryAlertDays}</strong>{' '}
                      day{settings.expiryAlertDays === 1 ? '' : 's'} of today.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 shrink-0 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() =>
                        updateSetting('expiryAlertDays', Math.max(1, settings.expiryAlertDays - 1))
                      }
                      aria-label="Decrease expiry alert days"
                      className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 font-bold hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      id="expiry-alert-days-input"
                      type="number"
                      min={1}
                      max={365}
                      value={settings.expiryAlertDays}
                      onChange={(e) => {
                        const raw = parseInt(e.target.value, 10);
                        if (isNaN(raw)) return;
                        const clamped = Math.min(365, Math.max(1, raw));
                        updateSetting('expiryAlertDays', clamped);
                      }}
                      className="w-14 bg-transparent text-center font-mono font-bold text-amber-300 text-sm focus:outline-none"
                    />
                    <span className="text-[11px] font-semibold text-slate-400 pr-1">days</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateSetting('expiryAlertDays', Math.min(365, settings.expiryAlertDays + 1))
                      }
                      aria-label="Increase expiry alert days"
                      className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 font-bold hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[11px] text-slate-400 font-semibold mr-1">Quick presets:</span>
                  {[7, 14, 30, 60, 90].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => updateSetting('expiryAlertDays', days)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        settings.expiryAlertDays === days
                          ? 'bg-amber-600 border-amber-500 text-white shadow-sm'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};
