import React, { useState, useEffect } from 'react';
import {
  Home,
  ShoppingBag,
  PackagePlus,
  Receipt,
  ClipboardList,
  Boxes,
  Sparkles,
  Calculator,
  Store,
  X,
  ChevronDown,
  Check,
  Building2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StoreLocation } from '../../types';
import { TabKey } from '../../utils/permissions';
import { CalculatorConverterSuiteModal } from './CalculatorConverterSuiteModal';

export interface MobileCartSummary {
  itemCount: number;
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  hasCartItems: boolean;
}

interface MobileQuickToolsBarProps {
  placement: 'phoneFrame' | 'responsiveMobile';
  hidden?: boolean;
  activeTab: TabKey;
  onMakeSale: () => void;
  onNavigateTab?: (tab: TabKey) => void;
  onOpenAiAssistant?: () => void;
  onOpenStoreManager?: () => void;
  activeStoreName?: string;
  stores?: StoreLocation[];
  activeStoreId?: string;
  onSelectActiveStore?: (storeId: string) => void;
  onUseCalcAmountInPos?: (amount: number) => void;
  // Kept optional for backwards prop compatibility with callers
  onOpenBarcodeScanner?: () => void;
  onScanManualBarcode?: (code: string) => void;
  onOpenAiScanner?: () => void;
  onApplyQuickDiscount?: (payload: { mode: 'fixed' | 'percentage'; value: number }) => void;
  onClearQuickDiscount?: () => void;
  cartSummary?: MobileCartSummary;
  canGiveDiscounts?: boolean;
}

export const MobileQuickToolsBar: React.FC<MobileQuickToolsBarProps> = ({
  placement,
  hidden = false,
  onMakeSale,
  onNavigateTab,
  onOpenAiAssistant,
  onOpenStoreManager,
  activeStoreName = 'Rofani POS',
  stores = [],
  activeStoreId,
  onSelectActiveStore,
  onUseCalcAmountInPos,
  cartSummary,
}) => {
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isCalculatorSuiteOpen, setIsCalculatorSuiteOpen] = useState(false);
  const [showShopDropdown, setShowShopDropdown] = useState(false);

  // Automatically collapse bottom sheet if hidden (e.g. keyboard open / cart drawer open)
  useEffect(() => {
    if (hidden && isShortcutsOpen) {
      setIsShortcutsOpen(false);
      setShowShopDropdown(false);
    }
  }, [hidden, isShortcutsOpen]);

  const handleShortcutNavigate = (tab: TabKey) => {
    setIsShortcutsOpen(false);
    setShowShopDropdown(false);
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
  };

  const shortcutItems: {
    id: string;
    label: string;
    icon: React.ReactNode;
    accentClass: string;
    onClick: () => void;
  }[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home className="w-5 h-5" />,
      accentClass: 'text-blue-400',
      onClick: () => handleShortcutNavigate('reports'),
    },
    {
      id: 'sell',
      label: 'Sell',
      icon: <ShoppingBag className="w-5 h-5" />,
      accentClass: 'text-emerald-400',
      onClick: () => {
        setIsShortcutsOpen(false);
        setShowShopDropdown(false);
        onMakeSale();
      },
    },
    {
      id: 'restock',
      label: 'Re-Stock',
      icon: <PackagePlus className="w-5 h-5" />,
      accentClass: 'text-amber-400',
      onClick: () => handleShortcutNavigate('purchasing'),
    },
    {
      id: 'expenses',
      label: 'Expenses',
      icon: <Receipt className="w-5 h-5" />,
      accentClass: 'text-rose-400',
      onClick: () => handleShortcutNavigate('expenses'),
    },
    {
      id: 'sales-manager',
      label: 'Sales Manager',
      icon: <ClipboardList className="w-5 h-5" />,
      accentClass: 'text-sky-400',
      onClick: () => handleShortcutNavigate('reports'),
    },
    {
      id: 'stock-setup',
      label: 'Stock Setup',
      icon: <Boxes className="w-5 h-5" />,
      accentClass: 'text-teal-400',
      onClick: () => handleShortcutNavigate('inventory'),
    },
    {
      id: 'ai-assistant',
      label: 'AI Assistant',
      icon: <Sparkles className="w-5 h-5" />,
      accentClass: 'text-indigo-400',
      onClick: () => {
        setIsShortcutsOpen(false);
        setShowShopDropdown(false);
        onOpenAiAssistant?.();
      },
    },
    {
      id: 'calculator-tools',
      label: 'Calculator & Tools',
      icon: <Calculator className="w-5 h-5" />,
      accentClass: 'text-blue-300',
      onClick: () => {
        setIsShortcutsOpen(false);
        setShowShopDropdown(false);
        setIsCalculatorSuiteOpen(true);
      },
    },
    {
      id: 'add-shop',
      label: 'Add Shop',
      icon: <Store className="w-5 h-5" />,
      accentClass: 'text-orange-400',
      onClick: () => {
        setIsShortcutsOpen(false);
        setShowShopDropdown(false);
        if (onOpenStoreManager) {
          onOpenStoreManager();
        } else {
          handleShortcutNavigate('settings');
        }
      },
    },
  ];

  // Compact 9-dot circular trigger classes
  const triggerPositionClass =
    placement === 'phoneFrame'
      ? 'w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-2xl flex items-center justify-center absolute bottom-20 right-4 z-40 transition cursor-pointer'
      : 'w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-2xl flex items-center justify-center fixed bottom-20 right-4 lg:bottom-16 lg:right-6 z-40 transition cursor-pointer';

  const sheetPositionClass =
    placement === 'phoneFrame'
      ? 'absolute inset-0 z-[120]'
      : 'fixed inset-0 z-[120]';

  return (
    <>
      {/* Compact Circular 9-Dot Floating Action Button (NO text label) */}
      {!hidden && (
        <button
          type="button"
          id="btn-mobile-shortcuts-fab"
          aria-label="Open Shortcuts"
          aria-expanded={isShortcutsOpen}
          onClick={() => setIsShortcutsOpen(true)}
          className={triggerPositionClass}
        >
          <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, idx) => (
              <span key={idx} className="w-1.5 h-1.5 rounded-full bg-white block" />
            ))}
          </div>
        </button>
      )}

      {/* Dark-Mode "Shortcuts" Bottom-Sheet Drawer */}
      <AnimatePresence>
        {isShortcutsOpen && (
          <div className={`${sheetPositionClass} flex flex-col justify-end font-sans`}>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => {
                setIsShortcutsOpen(false);
                setShowShopDropdown(false);
              }}
              className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            />

            {/* Bottom Sheet Surface */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative w-full sm:max-w-lg sm:mx-auto bg-slate-900 border-t sm:border-x border-slate-700 rounded-t-3xl px-4 pt-3 pb-6 shadow-2xl text-slate-100 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle */}
              <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mb-3" />

              {/* Header & Store Switcher Pill */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-base font-bold text-white tracking-tight">Shortcuts</h2>
                <button
                  type="button"
                  onClick={() => {
                    setIsShortcutsOpen(false);
                    setShowShopDropdown(false);
                  }}
                  aria-label="Close Shortcuts"
                  className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Store Switcher Pill */}
              <div className="mb-4 relative">
                <button
                  type="button"
                  onClick={() => {
                    if (stores.length > 1 && onSelectActiveStore) {
                      setShowShopDropdown((prev) => !prev);
                    } else if (onOpenStoreManager) {
                      setIsShortcutsOpen(false);
                      onOpenStoreManager();
                    }
                  }}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-full bg-slate-800 hover:bg-slate-700/90 border border-slate-700/80 flex items-center justify-between gap-2 text-xs transition cursor-pointer"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-slate-400 shrink-0">Current Shop:</span>
                    <span className="font-bold text-white truncate">{activeStoreName}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                      showShopDropdown ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showShopDropdown && stores.length > 0 && onSelectActiveStore && (
                  <div className="mt-1.5 bg-slate-950 border border-slate-700 rounded-2xl p-1.5 space-y-1 shadow-xl">
                    {stores.map((s) => {
                      const isCurrent = s.id === activeStoreId;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            onSelectActiveStore(s.id);
                            setShowShopDropdown(false);
                          }}
                          className={`w-full min-h-[40px] px-3 py-1.5 rounded-xl flex items-center justify-between gap-2 text-xs font-semibold transition cursor-pointer ${
                            isCurrent
                              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                              : 'text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate">{s.name}</span>
                          {isCurrent && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                        </button>
                      );
                    })}
                    {onOpenStoreManager && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowShopDropdown(false);
                          setIsShortcutsOpen(false);
                          onOpenStoreManager();
                        }}
                        className="w-full min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold text-orange-400 hover:bg-slate-800 flex items-center justify-center gap-1.5 border-t border-slate-800 mt-1 pt-2 cursor-pointer"
                      >
                        <Store className="w-3.5 h-3.5" />
                        <span>Manage Shops &amp; Branches</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 3-Column Grid of Circular Shortcut Buttons */}
              <div className="grid grid-cols-3 gap-x-3 gap-y-4">
                {shortcutItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    id={`shortcut-btn-${item.id}`}
                    onClick={item.onClick}
                    className="flex flex-col items-center justify-start gap-2 py-1 group cursor-pointer"
                  >
                    <div
                      className={`w-14 h-14 rounded-full bg-slate-800 border border-slate-700/80 group-hover:border-blue-500/60 group-hover:bg-slate-700/80 group-active:scale-95 flex items-center justify-center shadow-md transition ${item.accentClass}`}
                    >
                      {item.icon}
                    </div>
                    <span className="text-[11px] font-medium text-slate-200 group-hover:text-white text-center leading-tight">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Complete Multi-Tab Calculator, Currency & Unit Converter Suite */}
      <CalculatorConverterSuiteModal
        isOpen={isCalculatorSuiteOpen}
        onClose={() => setIsCalculatorSuiteOpen(false)}
        onUseInPos={onUseCalcAmountInPos}
        cartGrandTotal={cartSummary?.grandTotal}
      />
    </>
  );
};
