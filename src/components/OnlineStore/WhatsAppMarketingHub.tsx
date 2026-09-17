import React, { useState } from 'react';
import { OfferDeal, Customer, StoreLocation, Product } from '../../types';
import {
  MessageSquare,
  Share2,
  Phone,
  Tag,
  Copy,
  Check,
  ExternalLink,
  Send,
  Users,
  Sparkles,
  Zap,
  ShoppingBag,
  HelpCircle,
  QrCode,
  Smartphone,
  CheckCircle2,
  DollarSign,
  Gift,
  Building2,
  Search
} from 'lucide-react';

interface WhatsAppMarketingHubProps {
  offers: OfferDeal[];
  customers: Customer[];
  products: Product[];
  stores: StoreLocation[];
  activeStore: StoreLocation;
  onUpdateStoreWhatsApp?: (storeId: string, whatsappNumber: string) => void;
}

export const WhatsAppMarketingHub: React.FC<WhatsAppMarketingHubProps> = ({
  offers,
  customers,
  products,
  stores,
  activeStore,
  onUpdateStoreWhatsApp
}) => {
  // WhatsApp Number Config
  const [businessWhatsApp, setBusinessWhatsApp] = useState(
    activeStore.whatsappPhone || activeStore.phone || '+254 700 111 222'
  );
  const [isSavedNumber, setIsSavedNumber] = useState(false);

  // Selected Offer to Advertise
  const [selectedOfferId, setSelectedOfferId] = useState<string>(
    offers.find((o) => o.active)?.id || offers[0]?.id || ''
  );

  // Selected Customer to Message
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [customPhone, setCustomPhone] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');

  // Template Type
  const [templateType, setTemplateType] = useState<
    'offer_promo' | 'new_arrival' | 'debt_reminder' | 'storefront_invite'
  >('offer_promo');

  // Custom Message Editor
  const selectedOffer = offers.find((o) => o.id === selectedOfferId);
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Initial generated message
  const generateInitialMessage = () => {
    const storeName = activeStore.name || 'ROFANI Electronics & Boutique';
    const storeLink = 'https://rofani-store.co.ke';

    if (templateType === 'offer_promo' && selectedOffer) {
      const discountTxt =
        selectedOffer.discountType === 'percentage'
          ? `${selectedOffer.discountValue}% OFF`
          : `KSh ${selectedOffer.discountValue.toLocaleString()} OFF`;

      return `🔥 *SPECIAL OFFER FROM ${storeName.toUpperCase()}!* 🔥\n\n` +
        `Hey there! We have an exclusive deal for you:\n\n` +
        `🎁 *${selectedOffer.title}*\n` +
        `💰 *Discount:* ${discountTxt}\n` +
        `🎟️ *Use Promo Code:* \`${selectedOffer.code}\`\n` +
        `${selectedOffer.minOrderAmount ? `📌 Min Order: KSh ${selectedOffer.minOrderAmount.toLocaleString()}\n` : ''}\n` +
        `🛍️ *Shop & Apply Online:* ${storeLink}\n\n` +
        `Hurry while stock lasts! Reply to this WhatsApp message or call us at ${businessWhatsApp} to order directly!`;
    }

    if (templateType === 'new_arrival') {
      const topProducts = products.slice(0, 3).map(p => `• *${p.name}* - KSh ${p.sellingPrice.toLocaleString()}`).join('\n');
      return `✨ *NEW STOCK ARRIVALS AT ${storeName.toUpperCase()}!* ✨\n\n` +
        `Check out our latest premium items in stock:\n\n` +
        `${topProducts}\n\n` +
        `🚚 We deliver countrywide! Order now via WhatsApp or visit our online store: ${storeLink}\n\n` +
        `Contact us: ${businessWhatsApp}`;
    }

    if (templateType === 'debt_reminder' && selectedCustomer) {
      return `👋 *Hello ${selectedCustomer.name},*\n\n` +
        `This is a friendly statement update from *${storeName}*.\n\n` +
        `💰 *Current Balance Due:* KSh ${selectedCustomer.currentBalanceDue.toLocaleString()}\n\n` +
        `You can conveniently settle via M-Pesa Buy Goods / Till Number or visit our store branch. Reply here if you need any assistance!\n\n` +
        `Thank you for shopping with us! 🙏`;
    }

    return `🛍️ *SHOP ONLINE WITH ${storeName.toUpperCase()}!* 🛍️\n\n` +
      `Hello! Browse our full catalog of electronics, smartphones, and boutique wear from your phone:\n\n` +
      `🌐 *Online Store:* ${storeLink}\n` +
      `📱 *Direct WhatsApp Orders:* ${businessWhatsApp}\n\n` +
      `Fast delivery & KRA eTIMS compliant receipts with every purchase!`;
  };

  const [customMessage, setCustomMessage] = useState(generateInitialMessage());
  const [copiedMsg, setCopiedMsg] = useState(false);

  // Update message when parameters change
  const handleRegenerateMessage = (newType?: typeof templateType, newOfferId?: string) => {
    const typeToUse = newType || templateType;
    const offerIdToUse = newOfferId || selectedOfferId;
    const offerObj = offers.find((o) => o.id === offerIdToUse);

    const storeName = activeStore.name || 'ROFANI Electronics & Boutique';
    const storeLink = 'https://rofani-store.co.ke';

    let msg = '';
    if (typeToUse === 'offer_promo' && offerObj) {
      const discountTxt =
        offerObj.discountType === 'percentage'
          ? `${offerObj.discountValue}% OFF`
          : `KSh ${offerObj.discountValue.toLocaleString()} OFF`;

      msg = `🔥 *SPECIAL OFFER FROM ${storeName.toUpperCase()}!* 🔥\n\n` +
        `Hey there! We have an exclusive deal for you:\n\n` +
        `🎁 *${offerObj.title}*\n` +
        `💰 *Discount:* ${discountTxt}\n` +
        `🎟️ *Use Promo Code:* *${offerObj.code}*\n` +
        `${offerObj.minOrderAmount ? `📌 Min Order: KSh ${offerObj.minOrderAmount.toLocaleString()}\n` : ''}\n` +
        `🛍️ *Shop & Apply Online:* ${storeLink}\n\n` +
        `Hurry while stock lasts! Reply to this WhatsApp message or call us at ${businessWhatsApp} to order directly!`;
    } else if (typeToUse === 'new_arrival') {
      const topProducts = products.slice(0, 3).map(p => `• *${p.name}* - KSh ${p.sellingPrice.toLocaleString()}`).join('\n');
      msg = `✨ *NEW STOCK ARRIVALS AT ${storeName.toUpperCase()}!* ✨\n\n` +
        `Check out our latest premium items in stock:\n\n` +
        `${topProducts}\n\n` +
        `🚚 We deliver countrywide! Order now via WhatsApp or visit our online store: ${storeLink}\n\n` +
        `Contact us: ${businessWhatsApp}`;
    } else if (typeToUse === 'debt_reminder') {
      const custObj = customers.find((c) => c.id === selectedCustomerId);
      const custName = custObj ? custObj.name : 'Valued Customer';
      const balance = custObj ? custObj.currentBalanceDue : 0;

      msg = `👋 *Hello ${custName},*\n\n` +
        `This is a friendly statement update from *${storeName}*.\n\n` +
        `💰 *Current Balance Due:* KSh ${balance.toLocaleString()}\n\n` +
        `You can conveniently settle via M-Pesa Buy Goods / Till Number or visit our store branch. Reply here if you need any assistance!\n\n` +
        `Thank you for shopping with us! 🙏`;
    } else {
      msg = `🛍️ *SHOP ONLINE WITH ${storeName.toUpperCase()}!* 🛍️\n\n` +
        `Hello! Browse our full catalog of electronics, smartphones, and boutique wear from your phone:\n\n` +
        `🌐 *Online Store:* ${storeLink}\n` +
        `📱 *Direct WhatsApp Orders:* ${businessWhatsApp}\n\n` +
        `Fast delivery & KRA eTIMS compliant receipts with every purchase!`;
    }

    setCustomMessage(msg);
  };

  // Clean phone number for wa.me API
  const formatPhoneForWhatsApp = (phoneStr: string) => {
    let cleaned = phoneStr.replace(/\D/g, ''); // strip non-digits
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1); // convert Kenya 07xx to 2547xx
    } else if (!cleaned.startsWith('254') && cleaned.length === 9) {
      cleaned = '254' + cleaned;
    }
    return cleaned;
  };

  // Open WhatsApp with message
  const handleOpenWhatsApp = (phoneOverride?: string) => {
    const rawPhone = phoneOverride || (selectedCustomer ? selectedCustomer.phone : customPhone) || businessWhatsApp;
    const cleanPhone = formatPhoneForWhatsApp(rawPhone);
    const encodedMsg = encodeURIComponent(customMessage);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
    window.open(waUrl, '_blank');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(customMessage);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  const handleSaveNumber = () => {
    if (onUpdateStoreWhatsApp) {
      onUpdateStoreWhatsApp(activeStore.id, businessWhatsApp);
    }
    setIsSavedNumber(true);
    setTimeout(() => setIsSavedNumber(false), 2000);
  };

  // Filtered customers
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-emerald-800/60 p-5 md:p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <MessageSquare className="w-6 h-6" />
            </span>
            <h2 className="text-lg md:text-xl font-extrabold text-white flex items-center gap-2">
              WhatsApp Marketing & Customer Broadcast Hub
            </h2>
          </div>
          <p className="text-xs text-slate-300">
            Advertise promotional offers, discount codes, and new arrivals directly to customer WhatsApp numbers in 1-click.
          </p>
        </div>

        {/* Store Business WhatsApp Config */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center gap-2 w-full md:w-auto">
          <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Business WhatsApp Phone</span>
            <input
              type="text"
              value={businessWhatsApp}
              onChange={(e) => setBusinessWhatsApp(e.target.value)}
              placeholder="+254 700 000 000"
              className="bg-transparent text-xs font-mono font-bold text-emerald-300 focus:outline-none w-36"
            />
          </div>
          <button
            onClick={handleSaveNumber}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-extrabold rounded-lg transition shrink-0 flex items-center gap-1"
          >
            {isSavedNumber ? <Check className="w-3.5 h-3.5" /> : null}
            {isSavedNumber ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Template Selection & Settings */}
        <div className="lg:col-span-5 space-y-4">
          {/* Campaign Template Picker */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" /> 1. Select Campaign Type
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setTemplateType('offer_promo');
                  handleRegenerateMessage('offer_promo');
                }}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition flex flex-col gap-1 ${
                  templateType === 'offer_promo'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Tag className="w-4 h-4 text-amber-400" />
                <span>Offer & Coupon Code</span>
              </button>

              <button
                onClick={() => {
                  setTemplateType('new_arrival');
                  handleRegenerateMessage('new_arrival');
                }}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition flex flex-col gap-1 ${
                  templateType === 'new_arrival'
                    ? 'bg-sky-500/10 border-sky-500 text-sky-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShoppingBag className="w-4 h-4 text-sky-400" />
                <span>New Arrival Catalog</span>
              </button>

              <button
                onClick={() => {
                  setTemplateType('storefront_invite');
                  handleRegenerateMessage('storefront_invite');
                }}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition flex flex-col gap-1 ${
                  templateType === 'storefront_invite'
                    ? 'bg-purple-500/10 border-purple-500 text-purple-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Share2 className="w-4 h-4 text-purple-400" />
                <span>Online Store Link</span>
              </button>

              <button
                onClick={() => {
                  setTemplateType('debt_reminder');
                  handleRegenerateMessage('debt_reminder');
                }}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition flex flex-col gap-1 ${
                  templateType === 'debt_reminder'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Debt / Credit Update</span>
              </button>
            </div>
          </div>

          {/* Select Specific Offer (If offer_promo selected) */}
          {templateType === 'offer_promo' && (
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-400" /> 2. Choose Offer to Advertise
              </h3>

              <div className="space-y-2">
                {offers.map((offer) => (
                  <div
                    key={offer.id}
                    onClick={() => {
                      setSelectedOfferId(offer.id);
                      handleRegenerateMessage('offer_promo', offer.id);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      selectedOfferId === offer.id
                        ? 'bg-amber-500/10 border-amber-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <span className="font-mono font-bold text-xs text-sky-400 block">{offer.code}</span>
                      <span className="text-xs font-semibold">{offer.title}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-slate-900 px-2 py-1 rounded-md">
                      {offer.discountType === 'percentage'
                        ? `${offer.discountValue}% OFF`
                        : `KSh ${offer.discountValue}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recipient Customer Selection */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" /> 3. Target Customer Recipient
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Select Customer from POS Database:</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    if (templateType === 'debt_reminder') {
                      setTimeout(() => handleRegenerateMessage('debt_reminder'), 50);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">📢 General Broadcast / Any Contact</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) {c.currentBalanceDue > 0 ? `- Debt: KSh ${c.currentBalanceDue}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomerId === 'all' && (
                <div>
                  <label className="text-slate-400 block mb-1">Or Enter Direct Phone Number:</label>
                  <input
                    type="text"
                    placeholder="e.g. 0712 345 678 or 254712345678"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live WhatsApp Message Composer & Actions */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" /> WhatsApp Message Live Composer
              </h3>
              <button
                onClick={() => handleRegenerateMessage()}
                className="text-xs text-sky-400 hover:underline font-medium"
              >
                Reset to Template
              </button>
            </div>

            {/* Custom Message Text Area */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                Editable Message Content (Use *bold*, _italics_, and emojis):
              </label>
              <textarea
                rows={11}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-sans focus:outline-none focus:border-emerald-500 leading-relaxed"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={handleCopyText}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-2"
              >
                {copiedMsg ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedMsg ? 'Copied to Clipboard!' : 'Copy Text'}
              </button>

              <button
                onClick={() => handleOpenWhatsApp()}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 text-xs font-extrabold rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-600/30"
              >
                <Send className="w-4 h-4" /> Send via WhatsApp App / Web
              </button>
            </div>
          </div>

          {/* Quick Customer Broadcast Directory */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" /> Registered Customer Directory ({customers.length})
              </h3>

              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search customer name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {filteredCustomers.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-200 block">{c.name}</span>
                    <span className="text-slate-400 font-mono text-[11px]">{c.phone}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {c.currentBalanceDue > 0 && (
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono px-2 py-0.5 rounded-md">
                        Due: KSh {c.currentBalanceDue.toLocaleString()}
                      </span>
                    )}

                    <button
                      onClick={() => handleOpenWhatsApp(c.phone)}
                      className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 rounded-lg font-bold text-[11px] transition flex items-center gap-1 shrink-0"
                    >
                      <MessageSquare className="w-3 h-3" /> WhatsApp
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
