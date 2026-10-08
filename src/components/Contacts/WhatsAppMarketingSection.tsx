import React, { useState, useMemo, useEffect } from 'react';
import {
  MessageSquare,
  Share2,
  Send,
  Users,
  Filter,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  Tag,
  Flame,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  Download,
  Phone,
  ShoppingBag,
  Percent,
  RefreshCw,
  Search,
  DollarSign,
  AlertTriangle,
  Gift,
  HelpCircle,
  Eye,
  CheckSquare,
  Square
} from 'lucide-react';
import { Customer, Transaction, Product, OfferDeal, User } from '../../types';
import { INITIAL_OFFERS } from '../../data/initialData';
import { sanitizeWhatsAppPhone } from '../../utils/whatsappShare';

interface WhatsAppMarketingSectionProps {
  customers: Customer[];
  transactions: Transaction[];
  products: Product[];
  offers?: OfferDeal[];
  currentUser?: User;
  initialSelectedCustomerIds?: string[];
}

export type RecencyFilterOption =
  | 'all'
  | 'last_7_days'
  | 'last_14_days'
  | 'last_30_days'
  | 'dormant_30_plus'
  | 'vip_spenders'
  | 'frequent_buyers'
  | 'debtors'
  | 'custom_range';

interface CustomerMarketingProfile {
  customer: Customer;
  cleanPhone: string;
  hasValidPhone: boolean;
  transactionCount: number;
  totalSpent: number;
  lastPurchaseDate: string | null;
  daysSinceLastPurchase: number | null;
}

export const WhatsAppMarketingSection: React.FC<WhatsAppMarketingSectionProps> = ({
  customers,
  transactions,
  products,
  offers = INITIAL_OFFERS,
  currentUser,
  initialSelectedCustomerIds
}) => {
  // ----------------------------------------------------
  // 1. Customer Intelligence & Recency Aggregation
  // ----------------------------------------------------
  const customerProfiles = useMemo<CustomerMarketingProfile[]>(() => {
    // Group transactions by customer
    const txByCustomer: Record<string, Transaction[]> = {};
    const txByCleanPhone: Record<string, Transaction[]> = {};

    transactions.forEach((tx) => {
      if (tx.customerId) {
        if (!txByCustomer[tx.customerId]) txByCustomer[tx.customerId] = [];
        txByCustomer[tx.customerId].push(tx);
      }
      if (tx.customerPhone) {
        const clean = sanitizeWhatsAppPhone(tx.customerPhone);
        if (clean) {
          if (!txByCleanPhone[clean]) txByCleanPhone[clean] = [];
          txByCleanPhone[clean].push(tx);
        }
      }
    });

    const now = Date.now();

    return customers.map((c) => {
      const cleanPhone = sanitizeWhatsAppPhone(c.phone);
      const hasValidPhone = cleanPhone.length >= 9;

      // Find matching transactions by ID or phone
      const matchedById = txByCustomer[c.id] || [];
      const matchedByPhone = cleanPhone ? (txByCleanPhone[cleanPhone] || []) : [];
      
      // Combine and deduplicate transactions
      const seenTxIds = new Set<string>();
      const combinedTxs: Transaction[] = [];
      [...matchedById, ...matchedByPhone].forEach((tx) => {
        if (!seenTxIds.has(tx.id)) {
          seenTxIds.add(tx.id);
          combinedTxs.push(tx);
        }
      });

      // Sort newest first
      combinedTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const transactionCount = combinedTxs.length;
      const totalSpentFromTxs = combinedTxs.reduce((sum, tx) => sum + (tx.grandTotal || tx.total || 0), 0);
      const totalSpent = Math.max(totalSpentFromTxs, c.totalPurchases || 0);

      const lastTx = combinedTxs[0];
      const lastPurchaseDate = lastTx ? lastTx.date : null;
      const daysSinceLastPurchase = lastPurchaseDate
        ? Math.max(0, Math.floor((now - new Date(lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24)))
        : null;

      return {
        customer: c,
        cleanPhone,
        hasValidPhone,
        transactionCount,
        totalSpent,
        lastPurchaseDate,
        daysSinceLastPurchase
      };
    });
  }, [customers, transactions]);

  // ----------------------------------------------------
  // 2. Segmentation & Filtering Controls
  // ----------------------------------------------------
  const [recencyFilter, setRecencyFilter] = useState<RecencyFilterOption>('last_30_days');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [tierFilter, setTierFilter] = useState<'all' | 'retail' | 'wholesale' | 'vip' | 'corporate'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [minSpendThreshold, setMinSpendThreshold] = useState<number>(0);
  const [onlyValidPhones, setOnlyValidPhones] = useState<boolean>(true);

  // Filtered customer list
  const filteredProfiles = useMemo(() => {
    return customerProfiles.filter((item) => {
      // Must have valid phone if checked
      if (onlyValidPhones && !item.hasValidPhone) return false;

      // Tier filter
      if (tierFilter !== 'all') {
        const cType = (item.customer.customerType || 'Individual').toLowerCase();
        if (cType !== tierFilter.toLowerCase()) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.customer.name.toLowerCase().includes(q);
        const matchesPhone = item.customer.phone.toLowerCase().includes(q);
        const matchesAddress = item.customer.address?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesPhone && !matchesAddress) return false;
      }

      // Minimum Spend Threshold
      if (minSpendThreshold > 0 && item.totalSpent < minSpendThreshold) return false;

      // Recency / Purchase History Filter
      switch (recencyFilter) {
        case 'last_7_days':
          return item.daysSinceLastPurchase !== null && item.daysSinceLastPurchase <= 7;
        case 'last_14_days':
          return item.daysSinceLastPurchase !== null && item.daysSinceLastPurchase <= 14;
        case 'last_30_days':
          return item.daysSinceLastPurchase !== null && item.daysSinceLastPurchase <= 30;
        case 'dormant_30_plus':
          return item.daysSinceLastPurchase === null || item.daysSinceLastPurchase > 30;
        case 'vip_spenders':
          return item.totalSpent >= 10000 || item.customer.customerType?.toLowerCase() === 'vip';
        case 'frequent_buyers':
          return item.transactionCount >= 3;
        case 'debtors':
          return (item.customer.currentBalanceDue || item.customer.debtBalance || 0) > 0;
        case 'custom_range':
          if (!item.lastPurchaseDate) return false;
          const txDate = item.lastPurchaseDate.split('T')[0];
          return txDate >= customStartDate && txDate <= customEndDate;
        case 'all':
        default:
          return true;
      }
    });
  }, [
    customerProfiles,
    onlyValidPhones,
    tierFilter,
    searchQuery,
    minSpendThreshold,
    recencyFilter,
    customStartDate,
    customEndDate
  ]);

  // Selected customer IDs for the marketing broadcast
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(() => {
    if (initialSelectedCustomerIds && initialSelectedCustomerIds.length > 0) {
      return new Set(initialSelectedCustomerIds);
    }
    return new Set();
  });
  const [initialApplied, setInitialApplied] = useState<boolean>(false);

  // Automatically select all filtered customers whenever filteredProfiles changes or filter switches
  useEffect(() => {
    if (initialSelectedCustomerIds && initialSelectedCustomerIds.length > 0 && !initialApplied) {
      setRecencyFilter('all');
      setSelectedCustomerIds(new Set(initialSelectedCustomerIds));
      setInitialApplied(true);
      return;
    }
    const newSet = new Set<string>();
    filteredProfiles.forEach((p) => newSet.add(p.customer.id));
    setSelectedCustomerIds(newSet);
  }, [filteredProfiles, initialSelectedCustomerIds, initialApplied]);

  const toggleSelectCustomer = (id: string) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const all = new Set<string>();
    filteredProfiles.forEach((p) => all.add(p.customer.id));
    setSelectedCustomerIds(all);
  };

  const handleDeselectAll = () => {
    setSelectedCustomerIds(new Set());
  };

  // ----------------------------------------------------
  // 3. Active Offer Deal Configuration
  // ----------------------------------------------------
  const [dealSourceMode, setDealSourceMode] = useState<'store_offer' | 'feature_product' | 'custom'>('store_offer');

  // Active Store Offers
  const availableOffers = offers && offers.length > 0 ? offers : INITIAL_OFFERS;
  const [selectedOfferId, setSelectedOfferId] = useState<string>(
    availableOffers.find((o) => o.active)?.id || availableOffers[0]?.id || ''
  );

  // Featured Product
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  // Form parameters
  const [campaignTitle, setCampaignTitle] = useState<string>('Weekend Mega Deals');
  const [promoCode, setPromoCode] = useState<string>('WEEKEND20');
  const [discountSummary, setDiscountSummary] = useState<string>('20% OFF Entire Order');
  const [originalPrice, setOriginalPrice] = useState<string>('');
  const [dealPrice, setDealPrice] = useState<string>('');
  const [expiryText, setExpiryText] = useState<string>('This Sunday at 9:00 PM');
  const [minOrderText, setMinOrderText] = useState<string>('KSh 1,500');
  const [callToAction, setCallToAction] = useState<string>('Show this message at the counter or reply to reserve now!');
  const [storeBrandName, setStoreBrandName] = useState<string>('ROFANI Retail & Boutique');

  // When picking a store offer, auto-fill fields
  useEffect(() => {
    if (dealSourceMode === 'store_offer') {
      const off = availableOffers.find((o) => o.id === selectedOfferId);
      if (off) {
        setCampaignTitle(off.title);
        setPromoCode(off.code);
        setDiscountSummary(
          off.discountType === 'percentage'
            ? `${off.discountValue}% OFF`
            : `KSh ${off.discountValue.toLocaleString()} OFF`
        );
        setMinOrderText(off.minOrderAmount ? `KSh ${off.minOrderAmount.toLocaleString()}` : '');
        setExpiryText(off.validUntil || 'While Stock Lasts');
      }
    }
  }, [dealSourceMode, selectedOfferId, availableOffers]);

  // When picking a featured product, auto-fill prices
  useEffect(() => {
    if (dealSourceMode === 'feature_product' && selectedProduct) {
      setCampaignTitle(`Special Deal: ${selectedProduct.name}`);
      setOriginalPrice(selectedProduct.sellingPrice.toString());
      const discounted = Math.round(selectedProduct.sellingPrice * 0.85); // 15% discount recommendation
      setDealPrice(discounted.toString());
      setDiscountSummary(`Special Price: KSh ${discounted.toLocaleString()}`);
      setPromoCode('VIP15');
      setExpiryText('This Weekend Only');
    }
  }, [dealSourceMode, selectedProduct]);

  // ----------------------------------------------------
  // 4. WhatsApp Message Generator & Live Formatting
  // ----------------------------------------------------
  const [isManualMessageEdit, setIsManualMessageEdit] = useState<boolean>(false);
  const [customMessageText, setCustomMessageText] = useState<string>('');

  const autoGeneratedMessage = useMemo(() => {
    const lines: string[] = [];

    lines.push(`🔥 *SPECIAL OFFER ALERT* 🔥`);
    lines.push(`Hello Valued Customer! 👋`);
    if (storeBrandName) {
      lines.push(`Greetings from *${storeBrandName}*!`);
    }
    lines.push('');

    // Campaign Title
    lines.push(`🎁 *${campaignTitle.toUpperCase()}*`);

    // Featured Product / Discount
    if (dealSourceMode === 'feature_product' && selectedProduct) {
      lines.push(`🛍️ *Item:* ${selectedProduct.name}`);
      if (originalPrice && dealPrice) {
        const orig = Number(originalPrice).toLocaleString();
        const deal = Number(dealPrice).toLocaleString();
        lines.push(`💰 *Price:* ~KSh ${orig}~ ➡️ *KSh ${deal}* (Instant Savings!)`);
      } else {
        lines.push(`💰 *Deal Price:* *KSh ${Number(dealPrice || selectedProduct.sellingPrice).toLocaleString()}*`);
      }
    } else {
      lines.push(`✨ *Offer:* ${discountSummary}`);
    }

    if (promoCode.trim()) {
      lines.push(`🎟️ *Promo Code:* \`${promoCode.trim()}\``);
    }

    if (minOrderText.trim()) {
      lines.push(`📌 *Min Purchase:* ${minOrderText.trim()}`);
    }

    if (expiryText.trim()) {
      lines.push(`⏳ *Valid Until:* ${expiryText.trim()}`);
    }

    lines.push('');
    lines.push(`👉 _${callToAction.trim()}_`);

    return lines.join('\n');
  }, [
    campaignTitle,
    storeBrandName,
    dealSourceMode,
    selectedProduct,
    originalPrice,
    dealPrice,
    discountSummary,
    promoCode,
    minOrderText,
    expiryText,
    callToAction
  ]);

  const activeMessageText = isManualMessageEdit ? customMessageText : autoGeneratedMessage;

  // Sync custom message when auto changes and user isn't overriding
  useEffect(() => {
    if (!isManualMessageEdit) {
      setCustomMessageText(autoGeneratedMessage);
    }
  }, [autoGeneratedMessage, isManualMessageEdit]);

  // ----------------------------------------------------
  // 5. The Single Bulk-Ready WhatsApp URL (wa.me)
  // ----------------------------------------------------
  const bulkReadyWhatsAppUrl = useMemo(() => {
    const encoded = encodeURIComponent(activeMessageText.trim());
    // Single bulk-ready URL: opens WhatsApp contact/group/broadcast picker
    return `https://wa.me/?text=${encoded}`;
  }, [activeMessageText]);

  // Copy feedback state
  const [copiedBulkUrl, setCopiedBulkUrl] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedPhones, setCopiedPhones] = useState(false);

  const handleCopyBulkUrl = () => {
    navigator.clipboard.writeText(bulkReadyWhatsAppUrl).then(() => {
      setCopiedBulkUrl(true);
      setTimeout(() => setCopiedBulkUrl(false), 2200);
    });
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(activeMessageText).then(() => {
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2200);
    });
  };

  const handleOpenBulkWhatsApp = () => {
    window.open(bulkReadyWhatsAppUrl, '_blank', 'noopener,noreferrer');
  };

  // Selected phone numbers list
  const selectedProfiles = useMemo(() => {
    return filteredProfiles.filter((p) => selectedCustomerIds.has(p.customer.id));
  }, [filteredProfiles, selectedCustomerIds]);

  const handleCopyAllPhones = () => {
    const phones = selectedProfiles
      .map((p) => p.cleanPhone)
      .filter(Boolean)
      .join(', ');
    navigator.clipboard.writeText(phones).then(() => {
      setCopiedPhones(true);
      setTimeout(() => setCopiedPhones(false), 2200);
    });
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Phone', 'Customer Type', 'Last Purchase Date', 'Days Ago', 'Total Spend (KSh)'];
    const rows = selectedProfiles.map((p) => [
      `"${p.customer.name.replace(/"/g, '""')}"`,
      `"${p.customer.phone}"`,
      `"${p.customer.customerType || 'retail'}"`,
      `"${p.lastPurchaseDate ? p.lastPurchaseDate.split('T')[0] : 'None'}"`,
      `"${p.daysSinceLastPurchase !== null ? p.daysSinceLastPurchase : 'N/A'}"`,
      `"${p.totalSpent}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `whatsapp_campaign_audience_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Track dispatched status per customer
  const [dispatchedCustomerIds, setDispatchedCustomerIds] = useState<Set<string>>(() => new Set());

  const handleSendIndividualWhatsApp = (profile: CustomerMarketingProfile) => {
    // Generate personalized link
    const personalizedMessage = activeMessageText.replace(
      'Hello Valued Customer! 👋',
      `Hello *${profile.customer.name.trim()}*! 👋`
    );
    const url = `https://wa.me/${profile.cleanPhone}?text=${encodeURIComponent(personalizedMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');

    // Mark as sent
    setDispatchedCustomerIds((prev) => {
      const next = new Set(prev);
      next.add(profile.customer.id);
      return next;
    });
  };

  // ----------------------------------------------------
  // Summary Metrics of the Filtered Audience
  // ----------------------------------------------------
  const audienceMetrics = useMemo(() => {
    const totalSelected = selectedProfiles.length;
    const totalPotentialSpend = selectedProfiles.reduce((sum, p) => sum + p.totalSpent, 0);
    const avgSpend = totalSelected > 0 ? Math.round(totalPotentialSpend / totalSelected) : 0;
    const recentBuyersCount = selectedProfiles.filter(
      (p) => p.daysSinceLastPurchase !== null && p.daysSinceLastPurchase <= 14
    ).length;
    const dormantCount = selectedProfiles.filter(
      (p) => p.daysSinceLastPurchase === null || p.daysSinceLastPurchase > 30
    ).length;

    return {
      totalSelected,
      totalPotentialSpend,
      avgSpend,
      recentBuyersCount,
      dormantCount
    };
  }, [selectedProfiles]);

  return (
    <div className="space-y-6">
      {/* -------------------------------------------------- */}
      {/* Header Banner */}
      {/* -------------------------------------------------- */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-600/30 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Direct Marketing & CRM Hub</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              WhatsApp Deal Broadcast & Customer Segmentation
            </h2>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Filter customer contact lists by purchase recency, select an active store Offer Deal or featured item,
              and generate a single, bulk-ready WhatsApp broadcast URL to notify shoppers in one tap.
            </p>
          </div>

          {/* Quick Audience Counter */}
          <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl shrink-0">
            <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Targeted Audience</div>
              <div className="text-xl font-black text-white font-mono">
                {audienceMetrics.totalSelected}{' '}
                <span className="text-xs font-normal text-slate-400">/ {customers.length}</span>
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold">
                KSh {audienceMetrics.totalPotentialSpend.toLocaleString()} Lifetime Spend
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* 2-Column Main Workspace */}
      {/* -------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ================================================ */}
        {/* LEFT COLUMN: Customer Recency Filters (5 Cols)   */}
        {/* ================================================ */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-sm text-slate-100">1. Customer Audience Filter</h3>
              </div>
              <span className="text-xs text-sky-400 font-mono font-bold bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-800/60">
                {filteredProfiles.length} Found
              </span>
            </div>

            {/* Recency Quick Buttons */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Filter by Purchase Recency</span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRecencyFilter('last_7_days')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    recencyFilter === 'last_7_days'
                      ? 'bg-sky-600/20 border-sky-500 text-sky-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>⚡ Last 7 Days</span>
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">Hot</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">Recent active buyers</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecencyFilter('last_14_days')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    recencyFilter === 'last_14_days'
                      ? 'bg-sky-600/20 border-sky-500 text-sky-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>📅 Last 14 Days</span>
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">Active</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">Bi-weekly regulars</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecencyFilter('last_30_days')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    recencyFilter === 'last_30_days'
                      ? 'bg-sky-600/20 border-sky-500 text-sky-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>🗓️ Last 30 Days</span>
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">Monthly</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">Past month visitors</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecencyFilter('dormant_30_plus')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    recencyFilter === 'dormant_30_plus'
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>💤 Dormant 30+ Days</span>
                    <span className="text-[10px] bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800/60">
                      Win-back
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">Inactive or lapsed</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecencyFilter('vip_spenders')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    recencyFilter === 'vip_spenders'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>💎 VIP Spenders</span>
                    <span className="text-[10px] bg-purple-950/80 text-purple-300 px-1.5 py-0.5 rounded border border-purple-800/60">
                      High LTV
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">&ge; KSh 10k lifetime</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecencyFilter('frequent_buyers')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    recencyFilter === 'frequent_buyers'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>🔁 Repeat Buyers</span>
                    <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800/60">
                      3+ visits
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">Loyal customers</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecencyFilter('debtors')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    recencyFilter === 'debtors'
                      ? 'bg-rose-600/20 border-rose-500 text-rose-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>⚠️ Credit Debtors</span>
                    <span className="text-[10px] bg-rose-950/80 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800/60">
                      Balance Due
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">Outstanding credit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecencyFilter('all')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    recencyFilter === 'all'
                      ? 'bg-slate-700 border-slate-500 text-white font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>🌐 All Contacts</span>
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">All</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">Entire contact book</span>
                </button>
              </div>
            </div>

            {/* Custom Date Range Toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setRecencyFilter('custom_range')}
                className={`w-full p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition ${
                  recencyFilter === 'custom_range'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Custom Purchase Date Range</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Specific Dates</span>
              </button>

              {recencyFilter === 'custom_range' && (
                <div className="mt-2.5 grid grid-cols-2 gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Purchased From</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 text-xs outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Purchased To</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 text-xs outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Secondary Search & Tier Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Customer Tier</label>
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-500"
                >
                  <option value="all">All Customer Types</option>
                  <option value="retail">Retail Regulars</option>
                  <option value="wholesale">Wholesalers</option>
                  <option value="vip">VIP Shoppers</option>
                  <option value="corporate">Corporate Accounts</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Min Spend (KSh)</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={minSpendThreshold || ''}
                  onChange={(e) => setMinSpendThreshold(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0 (Any spend)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search filtered by name or phone..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none"
              />
            </div>

            {/* Valid Phones Only Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 pt-1">
              <input
                type="checkbox"
                checked={onlyValidPhones}
                onChange={(e) => setOnlyValidPhones(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0"
              />
              <span>Only include contacts with valid WhatsApp phone numbers</span>
            </label>
          </div>

          {/* Customer Selection Table & Multi-Select Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-xs text-slate-200">
                  Targeted Recipients ({selectedCustomerIds.size} of {filteredProfiles.length} selected)
                </h4>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/60"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-[11px] font-semibold text-slate-400 hover:text-slate-300 px-2 py-0.5 rounded bg-slate-800"
                >
                  Deselect
                </button>
              </div>
            </div>

            {/* Scrollable Customer List */}
            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {filteredProfiles.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  <Users className="w-8 h-8 mx-auto opacity-30 mb-2" />
                  <p>No customers match the selected purchase recency filter.</p>
                  <p className="text-[10px] text-slate-600 mt-1">Try toggling to "All Contacts" or clearing search.</p>
                </div>
              ) : (
                filteredProfiles.map((p) => {
                  const isChecked = selectedCustomerIds.has(p.customer.id);
                  const isDispatched = dispatchedCustomerIds.has(p.customer.id);

                  return (
                    <div
                      key={p.customer.id}
                      onClick={() => toggleSelectCustomer(p.customer.id)}
                      className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                        isChecked
                          ? 'bg-slate-950 border-emerald-500/40'
                          : 'bg-slate-950/50 border-slate-800/80 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectCustomer(p.customer.id);
                          }}
                          className="text-slate-400 hover:text-white shrink-0"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                        <div className="truncate">
                          <div className="font-semibold text-slate-200 truncate flex items-center gap-1.5">
                            <span>{p.customer.name}</span>
                            {p.customer.customerType && (
                              <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                                {p.customer.customerType}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                            <span>{p.customer.phone || 'No phone'}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-400">
                              {p.daysSinceLastPurchase !== null
                                ? p.daysSinceLastPurchase === 0
                                  ? 'Bought today'
                                  : `${p.daysSinceLastPurchase}d ago`
                                : 'No orders'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-mono font-bold text-emerald-400">
                          KSh {p.totalSpent.toLocaleString()}
                        </div>
                        {isDispatched ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Sent
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Pending</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Contact Export & Quick Actions */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCopyAllPhones}
                disabled={selectedProfiles.length === 0}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition flex items-center gap-1.5 disabled:opacity-50"
                title="Copy all formatted phone numbers to paste into a WhatsApp Broadcast list"
              >
                {copiedPhones ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPhones ? 'Copied Phones!' : 'Copy Numbers'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                disabled={selectedProfiles.length === 0}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition flex items-center gap-1.5 disabled:opacity-50"
                title="Download selected contacts list as CSV"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* ================================================ */}
        {/* RIGHT COLUMN: Deal Config & Bulk WhatsApp (7 Cols)*/}
        {/* ================================================ */}
        <div className="lg:col-span-7 space-y-4">
          {/* Active Offer Deal Selection / Setup */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-slate-100">2. Active Offer Deal Setup</h3>
              </div>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setDealSourceMode('store_offer')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    dealSourceMode === 'store_offer'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Store Offer
                </button>
                <button
                  type="button"
                  onClick={() => setDealSourceMode('feature_product')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    dealSourceMode === 'feature_product'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Featured Item
                </button>
                <button
                  type="button"
                  onClick={() => setDealSourceMode('custom')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    dealSourceMode === 'custom'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Custom Deal
                </button>
              </div>
            </div>

            {/* Mode A: Store Offers Selector */}
            {dealSourceMode === 'store_offer' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">Select Active Store Offer Deal</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableOffers.map((off) => {
                    const isSelected = selectedOfferId === off.id;
                    return (
                      <div
                        key={off.id}
                        onClick={() => setSelectedOfferId(off.id)}
                        className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-bold text-xs text-slate-100">{off.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-400">
                            {off.code}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{off.description}</p>
                        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                          <span>
                            {off.discountType === 'percentage'
                              ? `${off.discountValue}% Discount`
                              : `KSh ${off.discountValue.toLocaleString()} Flat`}
                          </span>
                          <span className="text-emerald-400 font-semibold">{off.bannerTag || 'Active'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode B: Feature an Inventory Product */}
            {dealSourceMode === 'feature_product' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">Choose Inventory Item to Feature</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — Regular: KSh {p.sellingPrice.toLocaleString()} (Stock: {p.stockQuantity ?? p.stock ?? 0})
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Original Price (KSh)</label>
                    <input
                      type="number"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-emerald-400 mb-1">
                      Promotional Deal Price (KSh)
                    </label>
                    <input
                      type="number"
                      value={dealPrice}
                      onChange={(e) => setDealPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-emerald-600/50 rounded-xl px-3 py-1.5 text-xs text-emerald-300 font-mono font-bold outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Campaign Parameters Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Campaign Headline</label>
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  placeholder="e.g. Flash Weekend Sale"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Promo Code</label>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="e.g. FLASH20"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Offer Expiry / Validity</label>
                <input
                  type="text"
                  value={expiryText}
                  onChange={(e) => setExpiryText(e.target.value)}
                  placeholder="e.g. Valid this Sunday 9 PM"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Store / Brand Name</label>
                <input
                  type="text"
                  value={storeBrandName}
                  onChange={(e) => setStoreBrandName(e.target.value)}
                  placeholder="e.g. ROFANI Store"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none"
                />
              </div>
            </div>
          </div>

          {/* -------------------------------------------------- */}
          {/* THE BULK-READY WHATSAPP URL CARD (Core Deliverable)*/}
          {/* -------------------------------------------------- */}
          <div className="bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-900 border-2 border-emerald-500/40 rounded-3xl p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#25D366] text-slate-950 rounded-lg">
                  <MessageSquare className="w-4 h-4 fill-current" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-white">3. Single Bulk-Ready WhatsApp URL</h3>
                  <span className="text-[10px] text-emerald-400">
                    Targeting {selectedCustomerIds.size} filtered customer{selectedCustomerIds.size !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualMessageEdit(!isManualMessageEdit)}
                  className="text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
                >
                  {isManualMessageEdit ? 'Auto-Generate' : 'Custom Edit'}
                </button>
              </div>
            </div>

            {/* Generated Message Editor or Preview */}
            <div className="mt-4 space-y-3">
              {isManualMessageEdit ? (
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Edit WhatsApp Message Draft:</span>
                    <span>Supports *bold*, _italic_, ~strike~</span>
                  </div>
                  <textarea
                    rows={7}
                    value={customMessageText}
                    onChange={(e) => setCustomMessageText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl p-3 text-xs text-slate-100 font-mono leading-relaxed outline-none resize-none"
                  />
                </div>
              ) : (
                /* WhatsApp Message Bubble Simulation */
                <div className="bg-[#0b141a] p-3.5 rounded-2xl border border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
                    <span>WhatsApp Chat Preview</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Format: wa.me/?text=...</span>
                  </div>
                  <div className="bg-[#005c4b] text-white p-3.5 rounded-xl rounded-tl-none max-w-lg shadow text-xs whitespace-pre-wrap font-sans leading-relaxed">
                    {activeMessageText}
                    <div className="text-right text-[10px] text-emerald-200 mt-2 font-mono">
                      Just now ✓✓
                    </div>
                  </div>
                </div>
              )}

              {/* URL Display Box */}
              <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 flex items-center gap-2">
                <span className="text-[10px] text-emerald-400 font-mono font-bold shrink-0 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80">
                  URL
                </span>
                <input
                  type="text"
                  readOnly
                  value={bulkReadyWhatsAppUrl}
                  className="bg-transparent text-[11px] text-slate-300 font-mono w-full truncate outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyBulkUrl}
                  className="shrink-0 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  title="Copy full WhatsApp link"
                >
                  {copiedBulkUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Primary Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleOpenBulkWhatsApp}
                  className="flex-1 px-5 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black text-sm transition shadow-lg shadow-[#25D366]/20 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Launch WhatsApp (Bulk Share / Forward)</span>
                  <ExternalLink className="w-4 h-4 opacity-75" />
                </button>

                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  {copiedMessage ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedMessage ? 'Message Copied!' : 'Copy Text'}</span>
                </button>
              </div>

              {/* Practical Guidance */}
              <div className="p-3 bg-emerald-950/30 border border-emerald-600/20 rounded-2xl flex items-start gap-2.5 text-xs text-slate-300">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed text-[11px]">
                  <strong className="text-white block font-semibold mb-0.5">
                    How Bulk WhatsApp Notification Works:
                  </strong>
                  Clicking <strong>Launch WhatsApp</strong> opens WhatsApp directly with your Offer Deal message pre-loaded.
                  From WhatsApp's native contact selector, tap <strong>Forward / Send to</strong> to select your
                  customer broadcast lists, status, or multiple individual chats at once without requiring third-party plugins.
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------- */}
          {/* Individual Recipient Quick Dispatch Queue          */}
          {/* -------------------------------------------------- */}
          {selectedProfiles.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-sky-400" />
                  <h4 className="font-bold text-xs text-slate-200">
                    Direct Send Roster ({selectedProfiles.length} Customers)
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400">
                  {dispatchedCustomerIds.size} of {selectedProfiles.length} Dispatched
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 text-xs">
                {selectedProfiles.map((p) => {
                  const isSent = dispatchedCustomerIds.has(p.customer.id);
                  return (
                    <div
                      key={p.customer.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-2"
                    >
                      <div className="truncate min-w-0">
                        <div className="font-semibold text-slate-200 truncate flex items-center gap-1.5">
                          <span>{p.customer.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">({p.customer.phone})</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {p.daysSinceLastPurchase !== null
                            ? `Last order: ${p.daysSinceLastPurchase} days ago`
                            : 'No recorded orders'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isSent ? (
                          <span className="px-2 py-1 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Sent
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Not Sent</span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSendIndividualWhatsApp(p)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition flex items-center gap-1 shadow-sm active:scale-95"
                          title={`Send personalized deal message to ${p.customer.name} on WhatsApp`}
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Direct Send</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
