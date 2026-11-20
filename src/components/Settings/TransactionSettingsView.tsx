import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Search,
  Info,
  Check,
  ChevronRight,
  ChevronDown,
  Pencil,
  Receipt,
  Package,
  Percent,
  Sliders,
  Hash,
  ShieldAlert,
  Share2,
  Truck,
  FileText,
  CalendarClock,
  PlusCircle,
  Cloud,
  X,
} from 'lucide-react';
import { StoreLocation } from '../../types';
import { safeGetJSON, safeSetJSON } from '../../utils/safeStorage';
import {
  TransactionSettingsState,
  ShareTransactionPreference,
  FirmPrefixSet,
  DEFAULT_FIRM_PREFIXES,
  loadTransactionSettings,
  saveTransactionSettingsLocal,
  formatDocumentNumberWithPrefix,
} from '../../utils/transactionSettings';
import { saveTransactionSettingsToCloud } from '../../lib/cloudSync';

interface TransactionSettingsViewProps {
  onBack: () => void;
  activeStoreId?: string;
  activeStoreName?: string;
  stores?: StoreLocation[];
  requirePinOnStartup?: boolean;
}

type ExpandableSectionKey =
  | 'dueDatesPaymentTerms'
  | 'termsAndConditions'
  | 'additionalFields'
  | 'transportationDetails'
  | 'additionalCharges';

const PREFIX_FIELDS: {
  key: keyof FirmPrefixSet;
  label: string;
  suggestions: string[];
}[] = [
  { key: 'saleInvoice', label: 'Sale invoices', suggestions: ['INV-', 'ROF-', 'BILL-', 'None'] },
  { key: 'creditNote', label: 'Credit Note', suggestions: ['CN-', 'RET-', 'None'] },
  { key: 'saleOrder', label: 'Sale Order', suggestions: ['SO-', 'ORD-', 'None'] },
  { key: 'purchaseOrder', label: 'Purchase Order', suggestions: ['PO-', 'PUR-', 'None'] },
  { key: 'estimate', label: 'Estimate', suggestions: ['EST-', 'QT-', 'None'] },
  { key: 'deliveryNote', label: 'Delivery Note', suggestions: ['DN-', 'DEL-', 'None'] },
  { key: 'paymentIn', label: 'Payment-In', suggestions: ['PAY-', 'RCPT-', 'None'] },
];

export const TransactionSettingsView: React.FC<TransactionSettingsViewProps> = ({
  onBack,
  activeStoreId,
  activeStoreName = 'Rofani POS',
  stores = [],
  requirePinOnStartup = true,
}) => {
  const effectiveStoreId = (activeStoreId || '').trim() || 'default';
  const [settings, setSettings] = useState<TransactionSettingsState>(() =>
    loadTransactionSettings(effectiveStoreId)
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [openInfoKey, setOpenInfoKey] = useState<string | null>(null);
  const [editingCountLabel, setEditingCountLabel] = useState(false);
  const [countLabelDraft, setCountLabelDraft] = useState(settings.customCountLabel || 'Count');
  const [expandedRow, setExpandedRow] = useState<ExpandableSectionKey | null>(null);

  const [taxMode, setTaxMode] = useState<'none' | 'tot' | 'vat'>(() =>
    safeGetJSON<'none' | 'tot' | 'vat'>('rofani_settings_tax_mode', 'none')
  );

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'local-only'>('idle');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const cloudSaveTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const loaded = loadTransactionSettings(effectiveStoreId);
    setSettings(loaded);
    setCountLabelDraft(loaded.customCountLabel || 'Count');
  }, [effectiveStoreId]);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
  }, [searchOpen]);

  useEffect(() => {
    return () => {
      if (cloudSaveTimerRef.current) window.clearTimeout(cloudSaveTimerRef.current);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 2600);
  };

  const commitSettings = (
    updater:
      | TransactionSettingsState
      | ((prev: TransactionSettingsState) => TransactionSettingsState),
    toastLabel?: string
  ) => {
    setSettings((prev) => {
      const candidate = typeof updater === 'function' ? updater(prev) : updater;
      const saved = saveTransactionSettingsLocal(candidate, effectiveStoreId);

      setSaveStatus('saving');
      if (cloudSaveTimerRef.current) window.clearTimeout(cloudSaveTimerRef.current);
      cloudSaveTimerRef.current = window.setTimeout(async () => {
        try {
          await saveTransactionSettingsToCloud(
            saved,
            effectiveStoreId !== 'default' ? effectiveStoreId : undefined
          );
          setSaveStatus('saved');
        } catch {
          setSaveStatus('local-only');
        }
      }, 350);

      return saved;
    });
    if (toastLabel) showToast(toastLabel);
  };

  const toggleBoolean = (key: keyof TransactionSettingsState, label: string) => {
    commitSettings(
      (prev) => ({
        ...prev,
        [key]: !prev[key],
      }),
      `${label} updated`
    );
  };

  const handleTaxModeChange = (nextMode: 'none' | 'tot' | 'vat') => {
    setTaxMode(nextMode);
    safeSetJSON('rofani_settings_tax_mode', nextMode);
    safeSetJSON('rofani_settings_enable_vat', nextMode === 'vat');
    if (nextMode === 'tot') safeSetJSON('rofani_settings_tot_rate', 1.5);
    showToast(
      nextMode === 'none'
        ? 'Tax mode set to No Tax (Exempt)'
        : nextMode === 'tot'
          ? 'Tax mode set to KRA Turnover Tax (1.5% TOT)'
          : 'Tax mode set to Standard VAT (16%)'
    );
  };

  const firmOptions = useMemo(() => {
    const map = new Map<string, string>();
    map.set(effectiveStoreId, activeStoreName || 'Active Store');
    stores.forEach((s) => {
      if (s.id && !map.has(s.id)) {
        map.set(s.id, s.name || s.id);
      }
    });
    if (!map.has('default')) {
      map.set('default', activeStoreName || 'Default Firm');
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [effectiveStoreId, activeStoreName, stores]);

  const selectedFirmId =
    firmOptions.some((f) => f.id === settings.activePrefixFirmId)
      ? settings.activePrefixFirmId
      : effectiveStoreId;

  const activePrefixes: FirmPrefixSet = {
    ...DEFAULT_FIRM_PREFIXES,
    ...(settings.prefixesByFirm[selectedFirmId] ||
      settings.prefixesByFirm['default'] ||
      {}),
  };

  const updateFirmPrefix = (fieldKey: keyof FirmPrefixSet, value: string) => {
    commitSettings((prev) => ({
      ...prev,
      activePrefixFirmId: selectedFirmId,
      prefixesByFirm: {
        ...prev.prefixesByFirm,
        [selectedFirmId]: {
          ...DEFAULT_FIRM_PREFIXES,
          ...(prev.prefixesByFirm[selectedFirmId] || {}),
          [fieldKey]: value,
        },
      },
    }));
  };

  const q = searchQuery.trim().toLowerCase();
  const matchesQuery = (...texts: string[]) => {
    if (!q) return true;
    return texts.some((t) => t.toLowerCase().includes(q));
  };

  const renderInfoButton = (id: string, description: string) => {
    const isOpen = openInfoKey === id;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpenInfoKey(isOpen ? null : id);
        }}
        title={description}
        aria-label={`Info: ${description}`}
        className={`w-5 h-5 rounded-full inline-flex items-center justify-center transition cursor-pointer shrink-0 ${
          isOpen
            ? 'bg-blue-600 text-white'
            : 'bg-slate-800 text-slate-400 hover:text-blue-400 hover:bg-slate-700'
        }`}
      >
        <Info className="w-3 h-3" />
      </button>
    );
  };

  const renderToggleRow = (opts: {
    id: string;
    title: string;
    info: string;
    checked: boolean;
    onToggle: () => void;
    accent?: 'blue' | 'emerald';
    badge?: React.ReactNode;
    extraControl?: React.ReactNode;
    subtext?: string;
    keywords?: string[];
  }) => {
    if (!matchesQuery(opts.title, opts.info, opts.subtext || '', ...(opts.keywords || []))) {
      return null;
    }
    const isInfoOpen = openInfoKey === opts.id;
    const accentBg = opts.accent === 'emerald' ? 'bg-emerald-600' : 'bg-blue-600';

    return (
      <div key={opts.id} className="px-4 py-3.5 transition hover:bg-slate-800/35">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-100">{opts.title}</span>
              {renderInfoButton(opts.id, opts.info)}
              {opts.extraControl}
              {opts.badge}
            </div>
            {opts.subtext && (
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{opts.subtext}</p>
            )}
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={opts.checked}
            onClick={opts.onToggle}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              opts.checked ? accentBg : 'bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ${
                opts.checked ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {isInfoOpen && (
          <div className="mt-2.5 px-3 py-2 rounded-xl bg-slate-950/90 border border-blue-500/30 text-[11px] text-slate-300 flex items-start justify-between gap-2">
            <span>{opts.info}</span>
            <button
              type="button"
              onClick={() => setOpenInfoKey(null)}
              className="text-slate-400 hover:text-white shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // Visibility checks for sections so empty sections collapse cleanly during search
  const s1Visible = matchesQuery(
    'transaction header',
    'invoice bill number',
    'cash sale by default',
    'billing name of parties',
    'po details customer',
    'add time on transactions'
  );
  const s2Visible = matchesQuery(
    'items table',
    'inclusive exclusive tax rate',
    'display purchase price cost',
    'show last 5 sale price',
    'free item quantity',
    'count label carton',
    'barcode scanning'
  );
  const s3Visible = matchesQuery(
    'taxes discount total',
    'transaction wise tax kra tot vat',
    'transaction wise discount',
    'round off transaction amount'
  );
  const s4Visible = matchesQuery(
    'more transaction features',
    'share transaction as pdf thermal whatsapp',
    'passcode for edit delete pin',
    'discount during payment',
    'link payments to invoices',
    'show profit while making sale invoice',
    'due dates payment terms',
    'set terms conditions',
    'additional fields',
    'transportation details boda matatu driver',
    'additional charges delivery packaging',
    'default payment method auto print sales rep'
  );
  const s5Visible = matchesQuery(
    'transaction prefixes firm store',
    'sale invoices credit note sale order purchase order estimate delivery note payment-in'
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 font-sans">
      {/* Sticky Dark Mode Header */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer shrink-0"
              title="Back to Settings"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg tracking-tight text-white truncate">
                  Transaction
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 hidden sm:inline-flex items-center gap-1">
                  <Cloud className="w-2.5 h-2.5" />
                  {saveStatus === 'saving'
                    ? 'Syncing…'
                    : saveStatus === 'local-only'
                      ? 'Saved Locally'
                      : 'Store Synced'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {activeStoreName} • POS Billing, Invoice Prefixes &amp; Checkout Rules
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (searchOpen) {
                  setSearchQuery('');
                  setSearchOpen(false);
                } else {
                  setSearchOpen(true);
                }
              }}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                searchOpen
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Search transaction settings"
              aria-label="Search transaction settings"
            >
              {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expandable Search Bar */}
        {searchOpen && (
          <div className="max-w-4xl mx-auto px-4 pb-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter transaction rules (e.g. Prefix, Barcode, Profit, Round Off, Passcode)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-9 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-950 border border-emerald-500/60 text-emerald-100 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        {/* SECTION 1: Transaction Header */}
        {s1Visible && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-800 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                  Transaction Header
                </h2>
                <p className="text-[10px] text-slate-400">
                  Controls invoice numbering, default cash workflow, party labels, and timestamps
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-800/80">
              {renderToggleRow({
                id: 'invoice_bill_number',
                title: 'Invoice/Bill Number',
                info: 'Generates and displays structured invoice/bill numbers on every POS sale and printed receipt.',
                checked: settings.enableInvoiceBillNumber,
                onToggle: () => toggleBoolean('enableInvoiceBillNumber', 'Invoice/Bill Number'),
                accent: 'blue',
                badge: (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                    ON by default
                  </span>
                ),
              })}

              {renderToggleRow({
                id: 'cash_sale_default',
                title: 'Cash Sale by default',
                info: 'Pre-selects Cash as the checkout payment method and marks Walk-in cash sales immediately settled.',
                checked: settings.cashSaleByDefault,
                onToggle: () => {
                  commitSettings((prev) => {
                    const nextVal = !prev.cashSaleByDefault;
                    return {
                      ...prev,
                      cashSaleByDefault: nextVal,
                      defaultPaymentMethod: nextVal ? 'cash' : prev.defaultPaymentMethod,
                    };
                  }, 'Cash Sale by default updated');
                },
                accent: 'emerald',
              })}

              {renderToggleRow({
                id: 'billing_party_name',
                title: 'Billing name of Parties',
                info: 'Adds an optional Billing Name / Company override field during checkout for wholesale, B2B, or credit invoices.',
                checked: settings.enableBillingPartyName,
                onToggle: () => toggleBoolean('enableBillingPartyName', 'Billing name of Parties'),
                subtext: 'Useful for wholesale, institutional, or credit customers',
              })}

              {renderToggleRow({
                id: 'customer_po_details',
                title: 'PO Details (of customer)',
                info: 'Shows Customer Purchase Order Number and PO Date fields on checkout and prints them on the receipt.',
                checked: settings.enableCustomerPoDetails,
                onToggle: () => toggleBoolean('enableCustomerPoDetails', 'PO Details (of customer)'),
              })}

              {renderToggleRow({
                id: 'add_time_transactions',
                title: 'Add Time On Transactions',
                info: 'Includes exact transaction timestamp (e.g. 14:32) alongside the date on receipts and sales reports.',
                checked: settings.addTimeOnTransactions,
                onToggle: () => toggleBoolean('addTimeOnTransactions', 'Add Time On Transactions'),
                accent: 'emerald',
              })}
            </div>
          </section>
        )}

        {/* SECTION 2: Items Table */}
        {s2Visible && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-800 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                  Items Table
                </h2>
                <p className="text-[10px] text-slate-400">
                  Customize cart line-item fields, cost visibility, wholesale rate lookup, and scanner tools
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-800/80">
              {renderToggleRow({
                id: 'tax_on_rate_mode',
                title: 'Allow Inclusive/Exclusive tax on Rate (Price/unit)',
                info: 'Lets cashiers toggle each cart line item between Tax-Inclusive and Tax-Exclusive unit pricing.',
                checked: settings.allowTaxInclusiveExclusiveOnRate,
                onToggle: () =>
                  toggleBoolean(
                    'allowTaxInclusiveExclusiveOnRate',
                    'Inclusive/Exclusive tax on Rate'
                  ),
              })}

              {renderToggleRow({
                id: 'display_purchase_price',
                title: 'Display Purchase Price',
                info: 'Shows unit cost/purchase price right inside the POS cart item row while billing. Automatically hidden when a non-Admin Cashier PIN lock session is active.',
                checked: settings.displayPurchasePrice,
                onToggle: () => toggleBoolean('displayPurchasePrice', 'Display Purchase Price'),
                subtext: requirePinOnStartup
                  ? 'PIN Lock active: automatically hidden from non-Admin Cashiers during billing'
                  : 'Visible on POS cart items while billing',
                badge: (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                    <ShieldAlert className="w-2.5 h-2.5" /> Owner/Admin Only
                  </span>
                ),
              })}

              {renderToggleRow({
                id: 'last_5_sale_prices',
                title: 'Show Last 5 Sale Price of Items',
                info: 'Displays a quick "Last 5 Prices" chip on each cart item so you can check recent customer/wholesale negotiated rates.',
                checked: settings.showLast5SalePrices,
                onToggle: () => toggleBoolean('showLast5SalePrices', 'Last 5 Sale Prices'),
                subtext: 'Helps negotiate wholesale prices with repeat customers',
              })}

              {renderToggleRow({
                id: 'free_item_qty',
                title: 'Free Item quantity',
                info: 'Adds a Free Qty input on each cart line item for bonus stock (e.g. Buy 10 Get 1 Free) without charging extra.',
                checked: settings.enableFreeItemQuantity,
                onToggle: () => toggleBoolean('enableFreeItemQuantity', 'Free Item quantity'),
                accent: 'emerald',
              })}

              {/* Count with inline rename pencil */}
              {matchesQuery(
                'Count',
                settings.customCountLabel,
                'custom count column bundle carton pack'
              ) && (
                <div className="px-4 py-3.5 transition hover:bg-slate-800/35">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-100">
                          {settings.customCountLabel || 'Count'}
                        </span>
                        {renderInfoButton(
                          'item_count_col',
                          'Adds a custom numeric count/pack column (e.g. Cartons, Bundles, Crates) to cart items and receipts. Tap the pencil icon to rename it.'
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setCountLabelDraft(settings.customCountLabel || 'Count');
                            setEditingCountLabel((v) => !v);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 text-[11px] font-semibold transition cursor-pointer"
                          title="Rename Count label"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Rename</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Adds a "{settings.customCountLabel || 'Count'}" quantity field to the items table &amp; receipts
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.enableItemCountColumn}
                      onClick={() =>
                        toggleBoolean('enableItemCountColumn', settings.customCountLabel || 'Count')
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                        settings.enableItemCountColumn ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ${
                          settings.enableItemCountColumn ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {editingCountLabel && (
                    <div className="mt-2.5 flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl p-2">
                      <input
                        type="text"
                        value={countLabelDraft}
                        onChange={(e) => setCountLabelDraft(e.target.value)}
                        placeholder="e.g. Count, Cartons, Bundles"
                        maxLength={24}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const clean = countLabelDraft.trim() || 'Count';
                          commitSettings(
                            (prev) => ({ ...prev, customCountLabel: clean }),
                            `Column renamed to "${clean}"`
                          );
                          setEditingCountLabel(false);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCountLabel(false)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {openInfoKey === 'item_count_col' && (
                    <div className="mt-2.5 px-3 py-2 rounded-xl bg-slate-950/90 border border-blue-500/30 text-[11px] text-slate-300 flex items-start justify-between gap-2">
                      <span>
                        Adds a custom numeric count/pack column (e.g. Cartons, Bundles, Crates) to cart items and receipts.
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenInfoKey(null)}
                        className="text-slate-400 hover:text-white shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {renderToggleRow({
                id: 'barcode_scanning_items',
                title: 'Barcode scanning for items',
                info: 'Shows instant camera & hardware barcode scanner triggers right inside the POS Sale terminal.',
                checked: settings.enableBarcodeScanning,
                onToggle: () => toggleBoolean('enableBarcodeScanning', 'Barcode scanning'),
                accent: 'emerald',
              })}
            </div>
          </section>
        )}

        {/* SECTION 3: Taxes, Discount & Total */}
        {s3Visible && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-800 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                <Percent className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                  Taxes, Discount &amp; Total
                </h2>
                <p className="text-[10px] text-slate-400">
                  Integrates with Rofani KRA TOT (1.5%), VAT (16%), cart discounts, and Shilling rounding
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-800/80">
              {renderToggleRow({
                id: 'tx_wise_tax',
                title: 'Transaction wise Tax',
                info: 'Applies store-wide KRA tax rules (No Tax, 1.5% KRA TOT, or 16% VAT) to the transaction summary during checkout.',
                checked: settings.enableTransactionWiseTax,
                onToggle: () => toggleBoolean('enableTransactionWiseTax', 'Transaction wise Tax'),
                accent: 'blue',
                subtext:
                  taxMode === 'none'
                    ? 'Active KRA Profile: No Tax (Exempt)'
                    : taxMode === 'tot'
                      ? 'Active KRA Profile: 1.5% Turnover Tax (TOT)'
                      : 'Active KRA Profile: 16% Standard VAT',
              })}

              {settings.enableTransactionWiseTax &&
                matchesQuery('Transaction wise Tax', 'No Tax', 'KRA TOT', '16% VAT') && (
                  <div className="px-4 py-3 bg-slate-950/60 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-300">
                      KRA Tax Profile Used at Checkout:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(
                        [
                          { id: 'none', label: 'No Tax (0%)' },
                          { id: 'tot', label: '1.5% KRA TOT' },
                          { id: 'vat', label: '16% VAT' },
                        ] as const
                      ).map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => handleTaxModeChange(mode.id)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                            taxMode === mode.id
                              ? 'bg-blue-600 text-white border-blue-500 shadow'
                              : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {renderToggleRow({
                id: 'tx_wise_discount',
                title: 'Transaction wise Discount',
                info: 'Allows entering a whole-invoice KES discount inside the POS cart summary.',
                checked: settings.enableTransactionWiseDiscount,
                onToggle: () =>
                  toggleBoolean('enableTransactionWiseDiscount', 'Transaction wise Discount'),
                accent: 'emerald',
              })}

              {renderToggleRow({
                id: 'round_off_amount',
                title: 'Round Off Transaction amount',
                info: 'Automatically rounds the final Payable Grand Total to the nearest whole Kenyan Shilling (KES) and shows the round-off delta on the receipt.',
                checked: settings.roundOffTransactionAmount,
                onToggle: () =>
                  toggleBoolean('roundOffTransactionAmount', 'Round Off Transaction amount'),
                accent: 'blue',
                subtext: 'Rounds grand total to nearest whole Shilling (e.g. KSh 1,249.60 → KSh 1,250)',
              })}
            </div>
          </section>
        )}

        {/* SECTION 4: More Transaction Features */}
        {s4Visible && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-800 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                  More Transaction Features
                </h2>
                <p className="text-[10px] text-slate-400">
                  Sharing preferences, PIN protection, live profit display, transport &amp; charges
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-800/80">
              {/* Share Transaction as dropdown */}
              {matchesQuery(
                'Share Transaction as',
                'Ask me Everytime',
                'PDF Receipt',
                'Thermal Image',
                'WhatsApp Text'
              ) && (
                <div className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-800/35">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-100">
                          Share Transaction as
                        </span>
                        {renderInfoButton(
                          'share_tx_as',
                          'Selects the default action when tapping Share on a completed receipt: Ask every time, Download PDF, Export Thermal Receipt Image, or Send WhatsApp Text.'
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Default format when sharing receipts with customers
                      </p>
                    </div>
                  </div>

                  <select
                    value={settings.shareTransactionAs}
                    onChange={(e) =>
                      commitSettings(
                        (prev) => ({
                          ...prev,
                          shareTransactionAs: e.target.value as ShareTransactionPreference,
                        }),
                        'Share Transaction format updated'
                      )
                    }
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="ask">Ask me Everytime</option>
                    <option value="pdf">PDF Receipt</option>
                    <option value="thermal">Thermal Image</option>
                    <option value="whatsapp">WhatsApp Text</option>
                  </select>
                </div>
              )}

              {openInfoKey === 'share_tx_as' && (
                <div className="px-4 py-2.5 bg-slate-950/90 text-[11px] text-slate-300 flex items-center justify-between gap-2">
                  <span>
                    Selects the default format used by Receipt Share: Ask every time, PDF Receipt, Thermal Image (.png), or WhatsApp Text.
                  </span>
                  <button type="button" onClick={() => setOpenInfoKey(null)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {renderToggleRow({
                id: 'passcode_edit_delete',
                title: 'Passcode for edit/delete',
                info: 'Requires the Store Admin/Master PIN before editing or deleting past receipts in Sales History & Reports.',
                checked: settings.passcodeForEditDelete,
                onToggle: () => toggleBoolean('passcodeForEditDelete', 'Passcode for edit/delete'),
                accent: 'blue',
                subtext: 'Requires Admin PIN before modifying or deleting past invoices',
              })}

              {renderToggleRow({
                id: 'discount_during_payment',
                title: 'Discount during Payment',
                info: 'Adds an extra Settlement / Payment-time Discount field inside the Checkout modal.',
                checked: settings.discountDuringPayment,
                onToggle: () => toggleBoolean('discountDuringPayment', 'Discount during Payment'),
              })}

              {renderToggleRow({
                id: 'link_payments_invoices',
                title: 'Link Payments to Invoices',
                info: 'Tracks invoice references and lets partial/credit customer settlements link directly to open invoices.',
                checked: settings.linkPaymentsToInvoices,
                onToggle: () =>
                  toggleBoolean('linkPaymentsToInvoices', 'Link Payments to Invoices'),
                accent: 'emerald',
              })}

              {renderToggleRow({
                id: 'show_profit_sale',
                title: 'Show Profit while making Sale Invoice',
                info: 'Displays live estimated profit & margin % on the POS cart footer for the shop owner. Automatically hidden for non-Admin Cashiers when PIN lock is active.',
                checked: settings.showProfitOnSaleInvoice,
                onToggle: () =>
                  toggleBoolean('showProfitOnSaleInvoice', 'Live Profit on Sale Invoice'),
                accent: 'emerald',
                subtext: requirePinOnStartup
                  ? 'PIN Lock active: visible to Owner/Admin only, hidden for Cashiers'
                  : 'Displays live profit margin on the cart screen',
                badge: (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                    <ShieldAlert className="w-2.5 h-2.5" /> Owner View
                  </span>
                ),
              })}

              {/* Expandable Sub-Menus (>) */}
              {/* 1. Due Dates and Payment terms */}
              {matchesQuery('Due Dates and Payment terms', 'credit due net days') && (
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedRow((prev) =>
                        prev === 'dueDatesPaymentTerms' ? null : 'dueDatesPaymentTerms'
                      )
                    }
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/35 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <CalendarClock className="w-4 h-4 text-sky-400 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-100">
                            Due Dates and Payment terms
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              settings.dueDatesPaymentTerms.enabled
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {settings.dueDatesPaymentTerms.enabled ? 'Enabled' : 'Off'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Default: {settings.dueDatesPaymentTerms.defaultTerms} (
                          {settings.dueDatesPaymentTerms.defaultDueDays} days)
                        </p>
                      </div>
                    </div>
                    {expandedRow === 'dueDatesPaymentTerms' ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {expandedRow === 'dueDatesPaymentTerms' && (
                    <div className="px-4 pb-4 pt-2 bg-slate-950/70 border-t border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200">
                          Include Due Date &amp; Terms on Invoices
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            commitSettings(
                              (prev) => ({
                                ...prev,
                                dueDatesPaymentTerms: {
                                  ...prev.dueDatesPaymentTerms,
                                  enabled: !prev.dueDatesPaymentTerms.enabled,
                                },
                              }),
                              'Due Dates & Payment Terms updated'
                            )
                          }
                          className={`relative inline-flex h-5 w-10 rounded-full border-2 border-transparent transition cursor-pointer ${
                            settings.dueDatesPaymentTerms.enabled ? 'bg-blue-600' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white transition ${
                              settings.dueDatesPaymentTerms.enabled
                                ? 'translate-x-5'
                                : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Default Payment Terms
                          </label>
                          <input
                            type="text"
                            value={settings.dueDatesPaymentTerms.defaultTerms}
                            onChange={(e) =>
                              commitSettings((prev) => ({
                                ...prev,
                                dueDatesPaymentTerms: {
                                  ...prev.dueDatesPaymentTerms,
                                  defaultTerms: e.target.value,
                                },
                              }))
                            }
                            placeholder="e.g. Net 15 Days / Due on Receipt"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Default Due Days
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={365}
                            value={settings.dueDatesPaymentTerms.defaultDueDays}
                            onChange={(e) =>
                              commitSettings((prev) => ({
                                ...prev,
                                dueDatesPaymentTerms: {
                                  ...prev.dueDatesPaymentTerms,
                                  defaultDueDays: Math.max(0, parseInt(e.target.value, 10) || 0),
                                },
                              }))
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. Set Terms & Conditions */}
              {matchesQuery('Set Terms & Conditions', 'receipt policy return warranty') && (
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedRow((prev) =>
                        prev === 'termsAndConditions' ? null : 'termsAndConditions'
                      )
                    }
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/35 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-100">
                            Set Terms &amp; Conditions
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              settings.termsAndConditions.enabled
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {settings.termsAndConditions.enabled ? 'Enabled' : 'Off'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {settings.termsAndConditions.text}
                        </p>
                      </div>
                    </div>
                    {expandedRow === 'termsAndConditions' ? (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {expandedRow === 'termsAndConditions' && (
                    <div className="px-4 pb-4 pt-2 bg-slate-950/70 border-t border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200">
                          Print Terms &amp; Conditions on Invoices/Receipts
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            commitSettings(
                              (prev) => ({
                                ...prev,
                                termsAndConditions: {
                                  ...prev.termsAndConditions,
                                  enabled: !prev.termsAndConditions.enabled,
                                },
                              }),
                              'Terms & Conditions setting updated'
                            )
                          }
                          className={`relative inline-flex h-5 w-10 rounded-full border-2 border-transparent transition cursor-pointer ${
                            settings.termsAndConditions.enabled ? 'bg-blue-600' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white transition ${
                              settings.termsAndConditions.enabled
                                ? 'translate-x-5'
                                : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        value={settings.termsAndConditions.text}
                        onChange={(e) =>
                          commitSettings((prev) => ({
                            ...prev,
                            termsAndConditions: {
                              ...prev.termsAndConditions,
                              text: e.target.value,
                            },
                          }))
                        }
                        placeholder="Enter invoice terms & conditions..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 3. Additional Fields */}
              {matchesQuery('Additional Fields', 'custom checkout metadata warranty job card') && (
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedRow((prev) =>
                        prev === 'additionalFields' ? null : 'additionalFields'
                      )
                    }
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/35 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <PlusCircle className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-100">
                            Additional Fields
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              settings.additionalFields.enabled
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {settings.additionalFields.enabled
                              ? `${settings.additionalFields.fields.filter((f) => f.enabled).length} Active`
                              : 'Off'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Custom extra fields shown during checkout &amp; printed on receipts
                        </p>
                      </div>
                    </div>
                    {expandedRow === 'additionalFields' ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {expandedRow === 'additionalFields' && (
                    <div className="px-4 pb-4 pt-2 bg-slate-950/70 border-t border-slate-800/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200">
                          Show Custom Additional Fields at Checkout
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            commitSettings(
                              (prev) => ({
                                ...prev,
                                additionalFields: {
                                  ...prev.additionalFields,
                                  enabled: !prev.additionalFields.enabled,
                                },
                              }),
                              'Additional Fields updated'
                            )
                          }
                          className={`relative inline-flex h-5 w-10 rounded-full border-2 border-transparent transition cursor-pointer ${
                            settings.additionalFields.enabled ? 'bg-blue-600' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white transition ${
                              settings.additionalFields.enabled
                                ? 'translate-x-5'
                                : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {settings.additionalFields.fields.map((field, idx) => (
                        <div
                          key={field.id}
                          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2.5"
                        >
                          <label className="flex items-center gap-2 text-xs text-slate-200 shrink-0 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.enabled}
                              onChange={() =>
                                commitSettings((prev) => ({
                                  ...prev,
                                  additionalFields: {
                                    ...prev.additionalFields,
                                    fields: prev.additionalFields.fields.map((f, i) =>
                                      i === idx ? { ...f, enabled: !f.enabled } : f
                                    ),
                                  },
                                }))
                              }
                              className="rounded border-slate-600 bg-slate-800 text-blue-600"
                            />
                            <span className="text-[11px] font-mono text-slate-400">#{idx + 1}</span>
                          </label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) =>
                              commitSettings((prev) => ({
                                ...prev,
                                additionalFields: {
                                  ...prev.additionalFields,
                                  fields: prev.additionalFields.fields.map((f, i) =>
                                    i === idx ? { ...f, label: e.target.value } : f
                                  ),
                                },
                              }))
                            }
                            placeholder="Field Label"
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                          <input
                            type="text"
                            value={field.defaultValue || ''}
                            onChange={(e) =>
                              commitSettings((prev) => ({
                                ...prev,
                                additionalFields: {
                                  ...prev.additionalFields,
                                  fields: prev.additionalFields.fields.map((f, i) =>
                                    i === idx ? { ...f, defaultValue: e.target.value } : f
                                  ),
                                },
                              }))
                            }
                            placeholder="Default value (optional)"
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 4. Transportation Details */}
              {matchesQuery('Transportation Details', 'Boda Matatu Driver Vehicle Delivery') && (
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedRow((prev) =>
                        prev === 'transportationDetails' ? null : 'transportationDetails'
                      )
                    }
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/35 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-100">
                            Transportation Details
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              settings.transportationDetails.enabled
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {settings.transportationDetails.enabled ? 'Enabled' : 'Off'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Capture Boda Boda, Matatu Parcel, Rider/Driver &amp; Plate/Waybill details
                        </p>
                      </div>
                    </div>
                    {expandedRow === 'transportationDetails' ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {expandedRow === 'transportationDetails' && (
                    <div className="px-4 pb-4 pt-2 bg-slate-950/70 border-t border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200">
                          Enable Transportation / Dispatch Section on Sale Checkout
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            commitSettings(
                              (prev) => ({
                                ...prev,
                                transportationDetails: {
                                  ...prev.transportationDetails,
                                  enabled: !prev.transportationDetails.enabled,
                                },
                              }),
                              'Transportation Details updated'
                            )
                          }
                          className={`relative inline-flex h-5 w-10 rounded-full border-2 border-transparent transition cursor-pointer ${
                            settings.transportationDetails.enabled ? 'bg-blue-600' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white transition ${
                              settings.transportationDetails.enabled
                                ? 'translate-x-5'
                                : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Default Transport Mode
                          </label>
                          <select
                            value={settings.transportationDetails.defaultMode}
                            onChange={(e) =>
                              commitSettings((prev) => ({
                                ...prev,
                                transportationDetails: {
                                  ...prev.transportationDetails,
                                  defaultMode: e.target.value,
                                },
                              }))
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white"
                          >
                            <option value="Boda Boda">Boda Boda</option>
                            <option value="Matatu Parcel">Matatu Parcel</option>
                            <option value="Pickup / Van">Pickup / Van</option>
                            <option value="Courier / G4S">Courier / G4S / Fargo</option>
                            <option value="Self Pickup">Customer Self Pickup</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Driver Field Label
                          </label>
                          <input
                            type="text"
                            value={settings.transportationDetails.driverLabel}
                            onChange={(e) =>
                              commitSettings((prev) => ({
                                ...prev,
                                transportationDetails: {
                                  ...prev.transportationDetails,
                                  driverLabel: e.target.value,
                                },
                              }))
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Vehicle / Waybill Label
                          </label>
                          <input
                            type="text"
                            value={settings.transportationDetails.vehicleLabel}
                            onChange={(e) =>
                              commitSettings((prev) => ({
                                ...prev,
                                transportationDetails: {
                                  ...prev.transportationDetails,
                                  vehicleLabel: e.target.value,
                                },
                              }))
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. Additional Charges */}
              {matchesQuery('Additional Charges', 'Delivery Fee Packaging Fee Handling') && (
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedRow((prev) =>
                        prev === 'additionalCharges' ? null : 'additionalCharges'
                      )
                    }
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/35 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <PlusCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-100">
                            Additional Charges
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              settings.additionalCharges.enabled
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {settings.additionalCharges.enabled ? 'Enabled' : 'Off'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {settings.additionalCharges.defaultLabel} (Default: KSh{' '}
                          {settings.additionalCharges.defaultAmount.toLocaleString()})
                        </p>
                      </div>
                    </div>
                    {expandedRow === 'additionalCharges' ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {expandedRow === 'additionalCharges' && (
                    <div className="px-4 pb-4 pt-2 bg-slate-950/70 border-t border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200">
                          Allow Delivery / Packaging Fee on Sale Cart
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            commitSettings(
                              (prev) => ({
                                ...prev,
                                additionalCharges: {
                                  ...prev.additionalCharges,
                                  enabled: !prev.additionalCharges.enabled,
                                },
                              }),
                              'Additional Charges updated'
                            )
                          }
                          className={`relative inline-flex h-5 w-10 rounded-full border-2 border-transparent transition cursor-pointer ${
                            settings.additionalCharges.enabled ? 'bg-blue-600' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white transition ${
                              settings.additionalCharges.enabled
                                ? 'translate-x-5'
                                : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Charge Label
                          </label>
                          <input
                            type="text"
                            value={settings.additionalCharges.defaultLabel}
                            onChange={(e) =>
                              commitSettings((prev) => ({
                                ...prev,
                                additionalCharges: {
                                  ...prev.additionalCharges,
                                  defaultLabel: e.target.value,
                                },
                              }))
                            }
                            placeholder="Delivery / Packaging Fee"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Default Charge Amount (KSh)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={settings.additionalCharges.defaultAmount}
                            onChange={(e) =>
                              commitSettings((prev) => ({
                                ...prev,
                                additionalCharges: {
                                  ...prev.additionalCharges,
                                  defaultAmount: Math.max(0, parseFloat(e.target.value) || 0),
                                },
                              }))
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Preserved POS Checkout Defaults */}
              {matchesQuery(
                'Default Payment Method Auto-Print Receipt Default Sales Representative',
                'mpesa cash card bank'
              ) && (
                <div className="px-4 py-3.5 bg-slate-950/40 space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Quick POS Terminal Defaults
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Default Payment Method
                      </label>
                      <select
                        value={settings.cashSaleByDefault ? 'cash' : settings.defaultPaymentMethod}
                        onChange={(e) => {
                          const method = e.target.value as TransactionSettingsState['defaultPaymentMethod'];
                          commitSettings(
                            (prev) => ({
                              ...prev,
                              defaultPaymentMethod: method,
                              cashSaleByDefault: method === 'cash' ? prev.cashSaleByDefault : false,
                            }),
                            'Default Payment Method updated'
                          );
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                      >
                        <option value="mpesa">M-PESA STK / Till</option>
                        <option value="cash">Cash</option>
                        <option value="credit_card">Credit Card / POS</option>
                        <option value="bank_transfer">Bank Transfer</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Default Sales Rep
                      </label>
                      <input
                        type="text"
                        value={settings.defaultSalesRep}
                        onChange={(e) =>
                          commitSettings((prev) => ({
                            ...prev,
                            defaultSalesRep: e.target.value,
                          }))
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                      />
                    </div>

                    <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-xl px-3 py-2">
                      <div>
                        <div className="text-xs font-semibold text-slate-200">Auto-Print Receipt</div>
                        <div className="text-[10px] text-slate-400">Open print view on sale</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleBoolean('autoPrintReceipt', 'Auto-Print Receipt')}
                        className={`relative inline-flex h-5 w-10 rounded-full border-2 border-transparent transition cursor-pointer ${
                          settings.autoPrintReceipt ? 'bg-emerald-600' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white transition ${
                            settings.autoPrintReceipt ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION 5: Transaction Prefixes (Per Store / Firm) */}
        {s5Visible && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                  <Hash className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                    Transaction Prefixes
                  </h2>
                  <p className="text-[10px] text-slate-400">
                    Configure per-store prefixes for invoices, notes, orders, and receipts
                  </p>
                </div>
              </div>

              {/* Firm / Store Selector Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-400">Firm / Store:</span>
                <select
                  value={selectedFirmId}
                  onChange={(e) =>
                    commitSettings((prev) => ({
                      ...prev,
                      activePrefixFirmId: e.target.value,
                    }))
                  }
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {firmOptions.map((firm) => (
                    <option key={firm.id} value={firm.id}>
                      {firm.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {PREFIX_FIELDS.map((field) => {
                  const val = activePrefixes[field.key] ?? '';
                  const isCustom = !field.suggestions.includes(val);
                  return (
                    <div
                      key={field.key}
                      className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-bold text-slate-200">{field.label}</label>
                        <span className="text-[10px] font-mono text-slate-400">
                          e.g. {formatDocumentNumberWithPrefix(val, new Date(), 408)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={isCustom ? '__custom__' : val || 'None'}
                          onChange={(e) => {
                            const chosen = e.target.value;
                            if (chosen === '__custom__') {
                              if (!isCustom) updateFirmPrefix(field.key, 'CUSTOM-');
                            } else {
                              updateFirmPrefix(field.key, chosen);
                            }
                          }}
                          className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {field.suggestions.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                          <option value="__custom__">Custom…</option>
                        </select>

                        <input
                          type="text"
                          value={val}
                          onChange={(e) => updateFirmPrefix(field.key, e.target.value.toUpperCase())}
                          placeholder="None or e.g. INV-"
                          maxLength={14}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Empty Search State */}
        {!s1Visible && !s2Visible && !s3Visible && !s4Visible && !s5Visible && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-2">
            <p className="text-sm font-bold text-slate-200">
              No Transaction settings matched "{searchQuery}"
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
            >
              Clear Search Filter
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
