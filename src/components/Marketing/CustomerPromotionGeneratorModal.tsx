import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  MessageCircle,
  Smartphone,
  Mail,
  FileText,
  Copy,
  Check,
  Download,
  Printer,
  Users,
  Tag,
  Calendar,
  DollarSign,
  Send,
  RefreshCw,
  X,
  AlertTriangle,
  Gift,
  Flame,
  Zap,
  CheckCircle2,
  ExternalLink,
  History,
  ShieldAlert,
  ChevronDown
} from 'lucide-react';
import { Customer, Product, User } from '../../types';

interface CustomerPromotionGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  products: Product[];
  initialCustomer?: Customer | null;
  storeName?: string;
  storePhone?: string;
  currentUser?: User;
}

type AudienceType = 'all' | 'vip' | 'debtors' | 'wholesalers' | 'inactive' | 'single';
type CampaignGoal = 'flash_sale' | 'clearance' | 'retention' | 'holiday' | 'debt_incentive' | 'new_arrival';
type OfferType = 'percentage' | 'fixed_voucher' | 'bogo' | 'free_gift' | 'clearance';
type ToneType = 'friendly_sheng' | 'professional' | 'urgent_scarcity' | 'vip_exclusive';

interface GeneratedPromotion {
  headline: string;
  whatsappMessage: string;
  smsMessage: string;
  emailSubject: string;
  emailBody: string;
  socialFlyerCopy: string;
  suggestedCallToAction: string;
  marketingTip: string;
  createdAt?: string;
}

const CAMPAIGN_PRESETS: { id: CampaignGoal; label: string; icon: string; defaultOffer: OfferType; defaultVal: number }[] = [
  { id: 'flash_sale', label: 'Weekend Flash Sale', icon: '🔥', defaultOffer: 'percentage', defaultVal: 15 },
  { id: 'clearance', label: 'Stock Clearance', icon: '🏷️', defaultOffer: 'clearance', defaultVal: 25 },
  { id: 'retention', label: 'VIP Appreciation', icon: '💎', defaultOffer: 'fixed_voucher', defaultVal: 500 },
  { id: 'debt_incentive', label: 'Debt Payment Reward', icon: '💳', defaultOffer: 'percentage', defaultVal: 10 },
  { id: 'new_arrival', label: 'New Arrivals Showcase', icon: '🚀', defaultOffer: 'percentage', defaultVal: 10 },
  { id: 'holiday', label: 'Month-End Special', icon: '🎁', defaultOffer: 'percentage', defaultVal: 20 },
];

export const CustomerPromotionGeneratorModal: React.FC<CustomerPromotionGeneratorModalProps> = ({
  isOpen,
  onClose,
  customers,
  products,
  initialCustomer = null,
  storeName = 'ROFANI Electronics & Boutique',
  storePhone = '0700 000 000',
  currentUser
}) => {
  // Campaign Setup State
  const [audience, setAudience] = useState<AudienceType>(initialCustomer ? 'single' : 'all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomer?.id || '');
  const [campaignGoal, setCampaignGoal] = useState<CampaignGoal>('flash_sale');
  const [offerType, setOfferType] = useState<OfferType>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [promoCode, setPromoCode] = useState<string>('ROFANI15');
  const [validityDays, setValidityDays] = useState<number>(3);
  const [tone, setTone] = useState<ToneType>('friendly_sheng');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customNotes, setCustomNotes] = useState<string>('');

  // Results & View State
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'sms' | 'email' | 'flyer'>('whatsapp');
  const [isGenerating, setIsGenerating] = useState(false);
  const [promotion, setPromotion] = useState<GeneratedPromotion | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedCampaigns, setSavedCampaigns] = useState<GeneratedPromotion[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Sync initial customer when opened
  useEffect(() => {
    if (initialCustomer) {
      setAudience('single');
      setSelectedCustomerId(initialCustomer.id);
    }
  }, [initialCustomer, isOpen]);

  // Load saved campaigns from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rofani_ai_promotions_history');
      if (saved) {
        setSavedCampaigns(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not load promo history:', e);
    }
  }, []);

  if (!isOpen) return null;

  // Selected single customer object
  const targetCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Available unique categories
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

  // Generate random promo code
  const handleGenerateRandomCode = () => {
    const prefixes = ['ROFANI', 'DEAL', 'FLASH', 'SAVE', 'VIP', 'OKOA'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setPromoCode(`${prefix}${num}`);
  };

  // Preset selection handler
  const handleSelectPreset = (preset: typeof CAMPAIGN_PRESETS[0]) => {
    setCampaignGoal(preset.id);
    setOfferType(preset.defaultOffer);
    setDiscountValue(preset.defaultVal);
    if (preset.id === 'debt_incentive') {
      setAudience('debtors');
    } else if (preset.id === 'retention') {
      setAudience('vip');
    }
    setPromoCode(`ROFANI${preset.defaultVal}`);
  };

  // Call Gemini Backend API
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-promotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience,
          customerName: audience === 'single' ? targetCustomer?.name : undefined,
          customerType: audience === 'single' ? targetCustomer?.customerType : undefined,
          campaignGoal,
          offerType,
          discountValue,
          promoCode,
          selectedProducts: selectedCategories,
          tone,
          customNotes,
          storeName,
          storePhone,
          validityDays,
        }),
      });

      if (response.ok) {
        const data: GeneratedPromotion = await response.json();
        data.createdAt = new Date().toISOString();
        setPromotion(data);

        // Update history
        const updated = [data, ...savedCampaigns.slice(0, 9)];
        setSavedCampaigns(updated);
        try {
          localStorage.setItem('rofani_ai_promotions_history', JSON.stringify(updated));
        } catch (e) {
          // ignore storage error
        }
      }
    } catch (err) {
      console.error('Failed to generate promotion:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Open WhatsApp Web or App
  const handleOpenWhatsApp = () => {
    if (!promotion) return;
    const phone = audience === 'single' && targetCustomer?.phone ? targetCustomer.phone.replace(/[^0-9]/g, '') : '';
    // Format Kenyan phone (e.g. 0712345678 -> 254712345678)
    let cleanPhone = phone;
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '254' + cleanPhone.slice(1);
    }

    const encodedText = encodeURIComponent(promotion.whatsappMessage);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
    window.open(url, '_blank');
  };

  // Export Bulk SMS CSV for Gateway
  const handleExportBulkSmsCsv = () => {
    if (!promotion) return;

    let targetList: Customer[] = [];
    if (audience === 'single' && targetCustomer) {
      targetList = [targetCustomer];
    } else if (audience === 'vip') {
      targetList = customers.filter((c) => c.customerType === 'VIP');
    } else if (audience === 'debtors') {
      targetList = customers.filter((c) => (c.currentBalanceDue || 0) > 0);
    } else if (audience === 'wholesalers') {
      targetList = customers.filter((c) => c.customerType === 'Wholesaler');
    } else {
      targetList = customers;
    }

    const headers = ['Customer Name', 'Phone Number', 'Customer Type', 'SMS Message Content'];
    const rows = targetList
      .filter((c) => c.phone && c.phone !== 'N/A')
      .map((c) => {
        const personalizedSms = promotion.smsMessage.replace(/Valued Customer|Customer/g, c.name.split(' ')[0]);
        return [
          `"${c.name.replace(/"/g, '""')}"`,
          `"${c.phone}"`,
          `"${c.customerType || 'Retail'}"`,
          `"${personalizedSms.replace(/"/g, '""')}"`,
        ].join(',');
      });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Bulk_SMS_Campaign_${promoCode}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Flyer / Poster
  const handlePrintFlyer = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-purple-950/50 to-indigo-950/50 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 p-0.5 shadow-lg shadow-purple-600/30 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  AI Customer Promotion & Marketing Generator
                </h2>
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generate high-converting SMS, WhatsApp, and social marketing campaigns tailored for Kenya shoppers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {savedCampaigns.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                  showHistory
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="View recent generated campaigns"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">History ({savedCampaigns.length})</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split Layout */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* Left Column: Promotion Setup Controls (5 Cols) */}
          <div className="lg:col-span-5 p-4 sm:p-5 space-y-4 bg-slate-900/60 overflow-y-auto max-h-[75vh]">
            {/* Quick Campaign Presets */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                1. Campaign Goal Presets
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CAMPAIGN_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between text-xs ${
                      campaignGoal === preset.id
                        ? 'bg-purple-600/20 border-purple-500 text-white font-bold shadow-sm'
                        : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 text-slate-300'
                    }`}
                  >
                    <span className="text-base mb-1">{preset.icon}</span>
                    <span className="leading-tight line-clamp-1">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                2. Target Audience
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'all', label: `All Customers (${customers.length})` },
                  { id: 'vip', label: 'VIP Top Spenders' },
                  { id: 'debtors', label: 'Debtors (Debt Reward)' },
                  { id: 'wholesalers', label: 'Wholesale Clients' },
                  { id: 'inactive', label: 'Inactive / Win-back' },
                  { id: 'single', label: 'Single Specific Client' },
                ].map((aud) => (
                  <button
                    key={aud.id}
                    onClick={() => setAudience(aud.id as AudienceType)}
                    className={`px-3 py-2 rounded-xl text-left border transition font-medium ${
                      audience === aud.id
                        ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                        : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {aud.label}
                  </button>
                ))}
              </div>

              {/* Single Customer Picker */}
              {audience === 'single' && (
                <div className="mt-2.5 p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Select Customer to Personalize For:
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl p-2 focus:outline-none focus:border-purple-500"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone || 'No phone'}) - {c.customerType || 'Individual'}
                        {(c.currentBalanceDue || 0) > 0 ? ` [Owes KSh ${c.currentBalanceDue}]` : ''}
                      </option>
                    ))}
                  </select>

                  {targetCustomer && (
                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <span>Phone: <strong className="text-white">{targetCustomer.phone || 'N/A'}</strong></span>
                      <span>Total Spent: <strong className="text-emerald-400">KSh {(targetCustomer.totalPurchases || 0).toLocaleString()}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Offer Type & Value */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Offer Type
                </label>
                <select
                  value={offerType}
                  onChange={(e) => setOfferType(e.target.value as OfferType)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl p-2 focus:outline-none focus:border-purple-500"
                >
                  <option value="percentage">Percentage Discount (%)</option>
                  <option value="fixed_voucher">Fixed KSh Cash Voucher</option>
                  <option value="bogo">Buy 1 Get 1 (BOGO)</option>
                  <option value="clearance">Clearance Blowout</option>
                  <option value="free_gift">Discount + Free Gift/Delivery</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  {offerType === 'fixed_voucher' ? 'Voucher Amount (KSh)' : 'Discount Value (%)'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl p-2 focus:outline-none focus:border-purple-500 font-mono font-bold"
                />
              </div>
            </div>

            {/* Promo Code & Validity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Coupon / Code
                  </label>
                  <button
                    onClick={handleGenerateRandomCode}
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-bold"
                  >
                    Random
                  </button>
                </div>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl p-2 focus:outline-none focus:border-purple-500 font-mono font-bold uppercase tracking-wider"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Valid Duration
                </label>
                <select
                  value={validityDays}
                  onChange={(e) => setValidityDays(parseInt(e.target.value) || 3)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl p-2 focus:outline-none focus:border-purple-500"
                >
                  <option value={1}>24 Hours Only (Flash)</option>
                  <option value={3}>3 Days (Weekend)</option>
                  <option value={7}>7 Days (1 Week)</option>
                  <option value={14}>14 Days</option>
                  <option value={30}>End of Month (30 Days)</option>
                </select>
              </div>
            </div>

            {/* Tone of Voice */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Communication Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as ToneType)}
                className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl p-2 focus:outline-none focus:border-purple-500"
              >
                <option value="friendly_sheng">Kenyan Friendly + Touch of Sheng ("Ofa Kabambe! Okoa Pesa!")</option>
                <option value="urgent_scarcity">High Urgency & Scarcity ("Hurry! Only 48 Hours Left!")</option>
                <option value="professional">Professional & Corporate</option>
                <option value="vip_exclusive">VIP Luxury & Exclusive Invitation</option>
              </select>
            </div>

            {/* Target Catalog Categories */}
            {categories.length > 0 && (
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Featured Categories (Optional)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {categories.map((cat) => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCategories(selectedCategories.filter((c) => c !== cat));
                          } else {
                            setSelectedCategories([...selectedCategories, cat]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] transition font-medium border ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-500 font-bold'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Notes / Instructions */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Special Instructions for AI (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Mention free tempered glass with phone purchase..."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl p-2 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Primary Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold py-3 rounded-2xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xl shadow-purple-600/30 border border-white/20 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 text-amber-300 ${isGenerating ? 'animate-spin' : 'animate-pulse'}`} />
              <span>{isGenerating ? 'Generating with Gemini AI...' : 'Generate Customer Campaign'}</span>
            </button>
          </div>

          {/* Right Column: Multi-Channel Output & Previews (7 Cols) */}
          <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col justify-between bg-slate-950/40 min-h-[500px]">
            {isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 rounded-3xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center mb-4 animate-pulse">
                  <Sparkles className="w-8 h-8 text-purple-400 animate-spin" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  Crafting Your Campaign Copy...
                </h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Gemini 3.8 is analyzing audience context, optimizing SMS character counts, and drafting high-converting WhatsApp copy.
                </p>
              </div>
            ) : !promotion ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 rounded-3xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mb-4">
                  <Gift className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  Ready to Create Promotions
                </h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Select your audience and campaign parameters on the left, then click <strong>"Generate Customer Campaign"</strong> to produce ready-to-send copy.
                </p>
              </div>
            ) : (
              <div className="space-y-4 flex-1 flex flex-col">
                {/* Channel Switcher Tabs */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                      onClick={() => setActiveTab('whatsapp')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                        activeTab === 'whatsapp'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('sms')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                        activeTab === 'sms'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Bulk SMS</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('email')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                        activeTab === 'email'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('flyer')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                        activeTab === 'flyer'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Poster / Flyer</span>
                    </button>
                  </div>

                  {/* Channel Action Buttons */}
                  <div className="flex items-center gap-2">
                    {activeTab === 'whatsapp' && (
                      <button
                        onClick={handleOpenWhatsApp}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
                        title="Open WhatsApp Web or Mobile with this message"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Send WhatsApp</span>
                      </button>
                    )}

                    {activeTab === 'sms' && (
                      <button
                        onClick={handleExportBulkSmsCsv}
                        className="bg-sky-600 hover:bg-sky-500 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-sky-600/30 cursor-pointer"
                        title="Download CSV for Bulk SMS gateways"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Gateway CSV</span>
                      </button>
                    )}

                    {activeTab === 'flyer' && (
                      <button
                        onClick={handlePrintFlyer}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-purple-600/30 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Notice</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        const content =
                          activeTab === 'whatsapp'
                            ? promotion.whatsappMessage
                            : activeTab === 'sms'
                            ? promotion.smsMessage
                            : activeTab === 'email'
                            ? `Subject: ${promotion.emailSubject}\n\n${promotion.emailBody}`
                            : promotion.socialFlyerCopy;
                        copyToClipboard(content, activeTab);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1"
                    >
                      {copiedKey === activeTab ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Campaign Headline */}
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📢</span>
                    <span className="text-xs sm:text-sm font-black text-white">{promotion.headline}</span>
                  </div>
                  <span className="bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                    CODE: {promoCode}
                  </span>
                </div>

                {/* Channel Preview Content */}
                <div className="flex-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 overflow-y-auto max-h-[380px]">
                  {/* WhatsApp View: Phone Chat Bubble */}
                  {activeTab === 'whatsapp' && (
                    <div className="max-w-md mx-auto bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 mb-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                          RF
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{storeName}</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          </div>
                          <div className="text-[10px] text-slate-400">Official Store Broadcast</div>
                        </div>
                      </div>

                      <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-2xl p-3.5 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                        {promotion.whatsappMessage}
                        <div className="text-right text-[10px] text-emerald-400/60 mt-2 font-mono">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SMS View */}
                  {activeTab === 'sms' && (
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
                          <span>SMS Preview</span>
                          <span
                            className={
                              promotion.smsMessage.length <= 160
                                ? 'text-emerald-400 font-bold'
                                : 'text-amber-400 font-bold'
                            }
                          >
                            {promotion.smsMessage.length} / 160 chars (
                            {Math.ceil(promotion.smsMessage.length / 160)} SMS)
                          </span>
                        </div>
                        <div className="bg-sky-950/30 border border-sky-800/40 rounded-xl p-3 text-xs text-sky-100 font-mono leading-relaxed whitespace-pre-wrap">
                          {promotion.smsMessage}
                        </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex items-start gap-2">
                        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <span>
                          Formatted strictly to standard GSM character bounds. Ready for 1-click broadcast via Kenyan SMS gateways (Africa's Talking, Mobilesasa, Twilio).
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Email View */}
                  {activeTab === 'email' && (
                    <div className="space-y-3">
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Subject Line:
                        </span>
                        <div className="text-xs font-bold text-white">{promotion.emailSubject}</div>
                      </div>

                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                        {promotion.emailBody}
                      </div>
                    </div>
                  )}

                  {/* Poster / Flyer View */}
                  {activeTab === 'flyer' && (
                    <div className="bg-gradient-to-br from-purple-950/60 to-slate-950 border-2 border-purple-500/40 rounded-2xl p-6 text-center shadow-2xl space-y-4 max-w-lg mx-auto">
                      <div className="inline-block bg-purple-500 text-white font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                        {storeName}
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                        {promotion.headline}
                      </h3>
                      <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-3 font-mono text-sm font-black text-amber-300">
                        PROMO CODE: {promoCode}
                      </div>
                      <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap text-left bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                        {promotion.socialFlyerCopy}
                      </div>
                      <div className="text-[11px] text-slate-400 italic">
                        Valid for {validityDays} days only • Terms & Conditions apply • {storePhone}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tactical Marketing Recommendation */}
                {promotion.marketingTip && (
                  <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-xl text-xs flex items-start gap-2 text-slate-300">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-purple-300">Gemini Retail Strategy Tip:</strong>{' '}
                      {promotion.marketingTip}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span>Targeting:</span>
            <span className="font-bold text-white uppercase">
              {audience === 'single' ? targetCustomer?.name || 'Client' : audience}
            </span>
            <span>•</span>
            <span>Offer:</span>
            <span className="font-bold text-emerald-400">{promoCode} ({discountValue}%)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl transition"
            >
              Done / Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function Info(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
