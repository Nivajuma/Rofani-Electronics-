import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Info,
  Check,
  Save,
  Package,
  Sliders
} from 'lucide-react';
import { safeGetJSON, safeSetJSON } from '../../utils/safeStorage';

interface ItemSettingsViewProps {
  onBack: () => void;
}

export interface ItemSettingsState {
  enableItem: boolean;
  itemType: string;
  barcodeScanning: boolean;
  stockMaintenance: boolean;
  manufacturing: boolean;
  itemUnits: boolean;
  defaultUnit: boolean;
  itemCategory: boolean;
  partyWiseItemRate: boolean;
  wholesalePrice: boolean;
  quantityDecimals: number;
  itemWiseTax: boolean;
  itemWiseDiscount: boolean;
}

export const ItemSettingsView: React.FC<ItemSettingsViewProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [settings, setSettings] = useState<ItemSettingsState>(() =>
    safeGetJSON<ItemSettingsState>('rofani_item_settings_v1', {
      enableItem: true,
      itemType: 'Products and Services',
      barcodeScanning: false,
      stockMaintenance: true,
      manufacturing: false,
      itemUnits: true,
      defaultUnit: false,
      itemCategory: true,
      partyWiseItemRate: false,
      wholesalePrice: true,
      quantityDecimals: 2,
      itemWiseTax: false,
      itemWiseDiscount: false,
    })
  );

  useEffect(() => {
    safeSetJSON('rofani_item_settings_v1', settings);
  }, [settings]);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const updateSetting = <K extends keyof ItemSettingsState>(key: K, value: ItemSettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    triggerToast('Item settings updated successfully!');
  };

  const settingItems = [
    {
      key: 'enableItem' as keyof ItemSettingsState,
      label: 'Enable Item',
      type: 'toggle',
      value: settings.enableItem,
      description: 'Global master toggle to enable or disable inventory item cataloging across sales.',
    },
    {
      key: 'itemType' as keyof ItemSettingsState,
      label: 'Item Type',
      type: 'select',
      value: settings.itemType,
      options: ['Products and Services', 'Products Only', 'Services Only'],
      description: 'Set default inventory behavior and item classification.',
    },
    {
      key: 'barcodeScanning' as keyof ItemSettingsState,
      label: 'Barcode Scanning for Items',
      type: 'toggle',
      value: settings.barcodeScanning,
      description: 'Enable camera or hardware barcode scanner integration during stock entry & sales checkout.',
    },
    {
      key: 'stockMaintenance' as keyof ItemSettingsState,
      label: 'Stock Maintenance',
      type: 'toggle',
      value: settings.stockMaintenance,
      description: 'Automatically track stock quantities on hand, reorder points, and low-stock alerts.',
    },
    {
      key: 'manufacturing' as keyof ItemSettingsState,
      label: 'Manufacturing',
      type: 'toggle',
      value: settings.manufacturing,
      description: 'Track raw materials, bill of materials (BOM), and assembly production costs.',
    },
    {
      key: 'itemUnits' as keyof ItemSettingsState,
      label: 'Item Units',
      type: 'toggle',
      value: settings.itemUnits,
      description: 'Enable multi-unit support (e.g., Pcs, Boxes, Kgs, Liters, Meters).',
    },
    {
      key: 'defaultUnit' as keyof ItemSettingsState,
      label: 'Default Unit',
      type: 'toggle',
      value: settings.defaultUnit,
      description: 'Lock a single global default unit across all newly created inventory items.',
    },
    {
      key: 'itemCategory' as keyof ItemSettingsState,
      label: 'Item Category',
      type: 'toggle',
      value: settings.itemCategory,
      description: 'Enable grouping products by category (Electronics, Boutique, Accessories, etc.).',
    },
    {
      key: 'partyWiseItemRate' as keyof ItemSettingsState,
      label: 'Party Wise Item Rate',
      type: 'toggle',
      value: settings.partyWiseItemRate,
      description: 'Configure custom wholesale or special pricing per individual customer/party group.',
    },
    {
      key: 'wholesalePrice' as keyof ItemSettingsState,
      label: 'Wholesale Price',
      type: 'toggle',
      value: settings.wholesalePrice,
      description: 'Enable a secondary wholesale price field on inventory items.',
    },
    {
      key: 'quantityDecimals' as keyof ItemSettingsState,
      label: 'Quantity (Upto Decimal places)',
      type: 'stepper',
      value: settings.quantityDecimals,
      description: 'Set quantity decimal precision (0 for whole units, 2 for fractional quantities).',
    },
    {
      key: 'itemWiseTax' as keyof ItemSettingsState,
      label: 'Item Wise Tax',
      type: 'toggle',
      value: settings.itemWiseTax,
      description: 'Enable individual tax rate assignment per item (overrides global shop tax rate).',
    },
    {
      key: 'itemWiseDiscount' as keyof ItemSettingsState,
      label: 'Item Wise Discount',
      type: 'toggle',
      value: settings.itemWiseDiscount,
      description: 'Enable per-item maximum discount rules and thresholds during sales checkout.',
    },
  ];

  const filteredItems = settingItems.filter(
    (item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-900 text-white shadow-md px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-base sm:text-lg tracking-tight">Item Settings</h1>
            <p className="text-[10px] text-slate-400">Inventory Catalog & Stock Configuration</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-44 sm:w-64">
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
        {filteredItems.length === 0 ? (
          <div className="bg-slate-900 rounded-2xl p-12 text-center text-slate-400 shadow-sm border border-slate-800 text-xs">
            No item settings found matching "{searchQuery}".
          </div>
        ) : (
          filteredItems.map((item) => (
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
          ))
        )}
      </div>
    </div>
  );
};
