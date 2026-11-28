import React, { useState } from 'react';
import {
  ArrowLeft,
  Search,
  X,
  Info,
  ShieldCheck,
  ShoppingCart,
  LayoutGrid,
  BellRing,
  QrCode,
  Clock,
  Check,
  Lock,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import {
  DEFAULT_HOMEPAGE_SUMMARY_CARDS,
  DEFAULT_SHOP_PROTECTION_SETTINGS,
  HomepageSummaryCardToggles,
  InactivityTimeoutMinutes,
  ShopProtectionSettingsState,
  useShopProtectionSettings,
} from '../../utils/shopProtectionSettings';
import { saveShopProtectionSettingsToCloud, saveItemSettingsToCloud } from '../../lib/cloudSync';
import { auth, isAuthorizedCloudUser } from '../../lib/firebase';
import { loadItemSettings, saveItemSettingsLocal, useItemSettings } from '../../utils/itemSettings';
import { useI18n } from '../../utils/i18n';

interface ShopControlsSettingsViewProps {
  onBack: () => void;
  activeStoreId?: string;
  activeStoreName?: string;
  onOpenShopQrShare: () => void;
  onPreview9PmSummary: () => void;
}

const TIMEOUT_OPTIONS: InactivityTimeoutMinutes[] = [2, 5, 10, 15, 30];

export const ShopControlsSettingsView: React.FC<ShopControlsSettingsViewProps> = ({
  onBack,
  activeStoreId,
  activeStoreName = 'Rofani POS',
  onOpenShopQrShare,
  onPreview9PmSummary,
}) => {
  const { dir } = useI18n();
  const [settings, setSettings] = useShopProtectionSettings(activeStoreId);
  const [itemSettings] = useItemSettings(activeStoreId);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openTooltipKey, setOpenTooltipKey] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const persistUpdate = (next: ShopProtectionSettingsState) => {
    setSettings(next);
    const currentItemSettings = loadItemSettings(activeStoreId);
    const nextItemSettings = saveItemSettingsLocal(
      {
        ...currentItemSettings,
        canSellBelowBuyingPrice: next.canSellBelowBuyingPrice,
        enableCacheOnCart: next.enableCacheOnCart,
        ...(next.enableExpiryAlerts !== settings.enableExpiryAlerts
          ? {
              trackExpiryDate: next.enableExpiryAlerts,
              enableExpiryDate: next.enableExpiryAlerts,
            }
          : {}),
      },
      activeStoreId
    );

    setSaveNotice('Saved for active shop');
    setTimeout(() => {
      setSaveNotice((c) => (c === 'Saved for active shop' ? null : c));
    }, 2000);

    if (activeStoreId && isAuthorizedCloudUser(auth.currentUser)) {
      saveShopProtectionSettingsToCloud(next, activeStoreId).catch((err) =>
        console.warn('Cloud shop controls sync notice:', err)
      );
      saveItemSettingsToCloud(nextItemSettings, activeStoreId).catch((err) =>
        console.warn('Cloud item settings sync notice:', err)
      );
    }
  };

  const toggleTopKey = (
    key:
      | 'enableCacheOnCart'
      | 'canSellBelowBuyingPrice'
      | 'enableExpiryAlerts'
      | 'enableInactivityLock'
      | 'alertOnSaleEditDelete'
      | 'alertOnAnySale'
      | 'enable9PmDailySummary'
  ) => {
    persistUpdate({
      ...settings,
      [key]: !settings[key],
    });
  };

  const toggleSummaryCard = (key: keyof HomepageSummaryCardToggles) => {
    persistUpdate({
      ...settings,
      homepageSummaryCards: {
        ...settings.homepageSummaryCards,
        [key]: !settings.homepageSummaryCards[key],
      },
    });
  };

  const matchesSearch = (label: string, desc: string, keywords = '') => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      label.toLowerCase().includes(q) ||
      desc.toLowerCase().includes(q) ||
      keywords.toLowerCase().includes(q)
    );
  };

  const renderToggleRow = (
    id: string,
    title: string,
    description: string,
    tooltipText: string,
    checked: boolean,
    onToggle: () => void,
    accent: 'blue' | 'emerald' = 'emerald',
    extraNode?: React.ReactNode
  ) => {
    const isTooltipOpen = openTooltipKey === id;
    return (
      <div key={id} className="p-4 space-y-2 hover:bg-slate-800/35 transition">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-slate-100">{title}</span>
              <button
                type="button"
                onClick={() => setOpenTooltipKey(isTooltipOpen ? null : id)}
                className="text-slate-400 hover:text-sky-400 p-0.5 rounded-full transition cursor-pointer"
                aria-label={`More info about ${title}`}
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
            {isTooltipOpen && (
              <div className="mt-1.5 p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-[11px] text-sky-200 leading-relaxed">
                {tooltipText}
              </div>
            )}
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition cursor-pointer ${
              checked
                ? accent === 'blue'
                  ? 'bg-blue-600 border-blue-500'
                  : 'bg-emerald-600 border-emerald-500'
                : 'bg-slate-700 border-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                checked ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {extraNode}
      </div>
    );
  };

  const summaryCardOptions: Array<{
    key: keyof HomepageSummaryCardToggles;
    label: string;
    desc: string;
  }> = [
    { key: 'cashInHand', label: 'Cash in Hand', desc: 'Live cash register position for today' },
    { key: 'toReceiveCredit', label: 'To Receive / Credit', desc: 'Total unpaid customer balances due' },
    { key: 'todaysSales', label: "Today's Sales", desc: 'Gross sales total and receipt count today' },
    { key: 'todaysStockIn', label: "Today's Stock-In", desc: 'Inventory restock value and units added today' },
    { key: 'todaysProfit', label: "Today's Profit", desc: 'Net profit estimate (auto-hidden for restricted cashiers)' },
    { key: 'expenses', label: 'Expenses', desc: 'Total recorded operating expenses for today' },
    { key: 'orders', label: 'Orders', desc: 'Pending online & supplier purchase orders' },
  ];

  const showCartAndPricing =
    matchesSearch('Enable Cache on Cart', 'Saves active cart customer discounts locally', 'cart cache draft') ||
    matchesSearch('Can Sell Below Buying Price', 'Allow cashiers to sell below cost price', 'cost buying margin pin') ||
    matchesSearch('Expiry Alerts', 'Track product expiry dates and warn before selling', 'expiry perishable alert');

  const showSummarySection = summaryCardOptions.some((opt) =>
    matchesSearch(opt.label, opt.desc, 'homepage summary dashboard card')
  );

  const showProtectionSection =
    matchesSearch('Enable Inactivity Lock', 'Auto-lock screen idle timeout PIN', 'lock idle security timeout') ||
    matchesSearch('Alert Me If Attendant Delete or Edit a Sale', 'Sale edited deleted notification', 'delete edit alert') ||
    matchesSearch('Alert Me On Any Sale Made', 'Instant alert when a sale completes', 'sale alert') ||
    matchesSearch('9:00 PM Daily Summary', 'End of day recap summary', '9pm 9:00 daily summary');

  const showQrSection = matchesSearch('Shop QR / Share Link', 'QR code store link share invite', 'qr link share');

  return (
    <div dir={dir} className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      {/* Top Bar */}
      <header dir="ltr" className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition cursor-pointer shrink-0"
              aria-label="Back to settings"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold text-white truncate">
                Shop Controls &amp; Protection
              </h1>
              <p className="text-[11px] text-slate-400 truncate">
                {activeStoreName} • Per-store preferences &amp; alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {saveNotice && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/35 px-2.5 py-1 rounded-lg">
                <Check className="w-3 h-3" />
                <span>{saveNotice}</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchOpen((prev) => !prev);
                if (searchOpen) setSearchQuery('');
              }}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              aria-label="Search shop controls"
            >
              {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="max-w-3xl mx-auto mt-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search toggles (e.g. Cart Cache, Below Cost, Expiry, Lock, 9 PM)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-5 space-y-5">
        {/* Section 1: Cart Cache, Pricing & Stock Guards */}
        {showCartAndPricing && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-sky-400" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                Cart Cache, Pricing &amp; Expiry Guards
              </h2>
            </div>

            <div className="divide-y divide-slate-800/80">
              {matchesSearch('Enable Cache on Cart', 'Saves active cart customer discounts locally', 'cart cache draft') &&
                renderToggleRow(
                  'enableCacheOnCart',
                  'Enable Cache on Cart',
                  'Keep active cart items, selected customer, and discounts saved locally if you leave or reload.',
                  'When ON, uncompleted sales are preserved across tab switches and page reloads. Turn OFF if shared counters should start with an empty cart on reload.',
                  settings.enableCacheOnCart,
                  () => toggleTopKey('enableCacheOnCart'),
                  'blue'
                )}

              {matchesSearch('Can Sell Below Buying Price', 'Allow cashiers to sell below cost price', 'cost buying margin pin') &&
                renderToggleRow(
                  'canSellBelowBuyingPrice',
                  'Can Sell Below Buying Price',
                  'When OFF, blocks or requires Manager/Admin PIN override whenever a rate or discount falls below buying cost.',
                  'Protects shop profit margins from accidental below-cost pricing or excessive discounting. Turn ON only during clearance sales.',
                  settings.canSellBelowBuyingPrice,
                  () => toggleTopKey('canSellBelowBuyingPrice'),
                  'emerald',
                  !settings.canSellBelowBuyingPrice ? (
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Cost Protection Active: Below-cost sales require Admin/Manager PIN</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 bg-amber-950/50 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Allowed: Staff may sell items below buying price</span>
                    </div>
                  )
                )}

              {matchesSearch('Expiry Alerts', 'Track product expiry dates and warn before selling', 'expiry perishable alert') &&
                renderToggleRow(
                  'enableExpiryAlerts',
                  'Product Expiry Tracking & Alerts',
                  `Highlight expired or expiring-soon items (within ${itemSettings.expiryAlertDays} days) across Inventory and POS checkout.`,
                  'Add optional Expiry Dates on any item inside Inventory and configure lead days in Item Settings -> Expiry Notifications.',
                  settings.enableExpiryAlerts,
                  () => toggleTopKey('enableExpiryAlerts'),
                  'emerald'
                )}
            </div>
          </section>
        )}

        {/* Section 2: Homepage Live Summary Toggles */}
        {showSummarySection && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                  Homepage Live Summary Cards
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    persistUpdate({
                      ...settings,
                      homepageSummaryCards: { ...DEFAULT_HOMEPAGE_SUMMARY_CARDS },
                    })
                  }
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 transition cursor-pointer"
                >
                  Enable All
                </button>
                <button
                  type="button"
                  onClick={() =>
                    persistUpdate({
                      ...settings,
                      homepageSummaryCards: {
                        cashInHand: true,
                        toReceiveCredit: false,
                        todaysSales: true,
                        todaysStockIn: false,
                        todaysProfit: false,
                        expenses: true,
                        orders: false,
                      },
                    })
                  }
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  Essential Only
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-800/80">
              {summaryCardOptions
                .filter((opt) => matchesSearch(opt.label, opt.desc, 'homepage summary dashboard card'))
                .map((opt) =>
                  renderToggleRow(
                    `summary_${opt.key}`,
                    opt.label,
                    opt.desc,
                    `Toggles visibility of the "${opt.label}" card on the POS & Home Live Summary strip.`,
                    settings.homepageSummaryCards[opt.key],
                    () => toggleSummaryCard(opt.key),
                    'blue'
                  )
                )}
            </div>
          </section>
        )}

        {/* Section 3: Shop Protection & Activity Alerts */}
        {showProtectionSection && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                Shop Protection &amp; Activity Alerts
              </h2>
            </div>

            <div className="divide-y divide-slate-800/80">
              {matchesSearch('Enable Inactivity Lock', 'Auto-lock screen idle timeout PIN', 'lock idle security timeout') &&
                renderToggleRow(
                  'enableInactivityLock',
                  'Enable Inactivity Lock',
                  'Automatically lock the POS screen after idle time and require staff/Admin PIN to unlock.',
                  'Protects your cash drawer and records whenever you step away from the counter.',
                  settings.enableInactivityLock,
                  () => toggleTopKey('enableInactivityLock'),
                  'blue',
                  settings.enableInactivityLock && (
                    <div className="pt-2 flex items-center justify-between gap-2 flex-wrap bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-sky-400" />
                        <span>Auto-lock after idle time:</span>
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {TIMEOUT_OPTIONS.map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() =>
                              persistUpdate({ ...settings, inactivityTimeoutMinutes: mins })
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              settings.inactivityTimeoutMinutes === mins
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {mins} min
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                )}

              {matchesSearch('Alert Me If Attendant Delete or Edit a Sale', 'Sale edited deleted notification', 'delete edit alert') &&
                renderToggleRow(
                  'alertOnSaleEditDelete',
                  'Alert Me If Attendant Delete or Edit a Sale',
                  'Show an immediate high-visibility alert banner whenever an existing receipt is modified or deleted.',
                  'Helps store owners spot voided or adjusted sales immediately across registers.',
                  settings.alertOnSaleEditDelete,
                  () => toggleTopKey('alertOnSaleEditDelete'),
                  'emerald'
                )}

              {matchesSearch('Alert Me On Any Sale Made', 'Instant alert when a sale completes', 'sale alert') &&
                renderToggleRow(
                  'alertOnAnySale',
                  'Alert Me On Any Sale Made',
                  'Display a live notification banner with receipt amount and attendant name after every checkout.',
                  'Useful for owners supervising active counters or monitoring live sales from a tablet.',
                  settings.alertOnAnySale,
                  () => toggleTopKey('alertOnAnySale'),
                  'emerald'
                )}

              {matchesSearch('9:00 PM Daily Summary', 'End of day recap summary', '9pm 9:00 daily summary') &&
                renderToggleRow(
                  'enable9PmDailySummary',
                  '9:00 PM Daily Summary',
                  'Prepare and show a full end-of-day sales, M-Pesa/cash, expenses, stock-in, and profit recap at 9:00 PM.',
                  'Automatically pops once per evening at 9:00 PM local time with Copy and WhatsApp Share buttons.',
                  settings.enable9PmDailySummary,
                  () => toggleTopKey('enable9PmDailySummary'),
                  'blue',
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={onPreview9PmSummary}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-amber-300 transition cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Preview 9:00 PM Daily Summary Now</span>
                    </button>
                  </div>
                )}
            </div>
          </section>
        )}

        {/* Section 4: Shareable Store Link & QR Card */}
        {showQrSection && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/35 text-sky-400 flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white">Shop QR / Share Link</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  View and share a scannable QR code badge and quick link for {activeStoreName}.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenShopQrShare}
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              <span>Open Shop QR</span>
            </button>
          </section>
        )}

        {/* Reset Defaults Footer */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => persistUpdate(DEFAULT_SHOP_PROTECTION_SETTINGS)}
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 underline cursor-pointer"
          >
            Reset Shop Controls to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};
