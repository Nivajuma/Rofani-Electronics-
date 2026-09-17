import React, { useState } from 'react';
import { Product, OfferDeal, OnlineOrder, StoreLocation, CartItem } from '../../types';
import {
  ShoppingBag,
  Tag,
  Search,
  Plus,
  Minus,
  Trash2,
  MapPin,
  Phone,
  User,
  CreditCard,
  Truck,
  Store,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Gift,
  Share2,
  ExternalLink,
  ShieldCheck,
  Zap,
  ShoppingBasket,
  MessageSquare
} from 'lucide-react';

interface OnlineStorefrontViewProps {
  products: Product[];
  offers: OfferDeal[];
  stores: StoreLocation[];
  onPlaceOrder: (order: Omit<OnlineOrder, 'id' | 'createdAt' | 'orderNumber'>) => void;
  activeStore: StoreLocation;
}

export const OnlineStorefrontView: React.FC<OnlineStorefrontViewProps> = ({
  products,
  offers,
  stores,
  onPlaceOrder,
  activeStore
}) => {
  // Shopping Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Checkout modal & Promo state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedOffer, setAppliedOffer] = useState<OfferDeal | null>(null);
  const [promoError, setPromoError] = useState('');

  // Checkout Form fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryType, setDeliveryType] = useState<'Delivery' | 'Store Pickup'>('Delivery');
  const [pickupStoreId, setPickupStoreId] = useState<string>(activeStore.id);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card' | 'cash_on_delivery'>('mpesa');
  const [orderNotes, setOrderNotes] = useState('');

  // Order Placement Success state
  const [createdOrder, setCreatedOrder] = useState<OnlineOrder | null>(null);

  // Categories
  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart operations
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: product.sellingPrice,
          discount: 0,
          total: product.sellingPrice
        }
      ];
    });
  };

  const handleUpdateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: newQty, total: newQty * item.unitPrice }
          : item
      )
    );
  };

  // Subtotal & Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);

  // Calculate promo discount
  let discountAmount = 0;
  if (appliedOffer) {
    if (appliedOffer.discountType === 'percentage') {
      discountAmount = Math.round(subtotal * (appliedOffer.discountValue / 100));
    } else if (appliedOffer.discountType === 'fixed') {
      discountAmount = Math.min(subtotal, appliedOffer.discountValue);
    } else if (appliedOffer.discountType === 'bogo') {
      discountAmount = Math.round(subtotal * 0.15); // Buy 1 Get 1 estimated incentive
    }
  }

  const deliveryFee = deliveryType === 'Delivery' ? (subtotal >= 3000 ? 0 : 300) : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + deliveryFee);

  // Apply promo code handle
  const handleApplyPromo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPromoError('');

    const found = offers.find(
      (o) => o.code.toUpperCase() === promoCodeInput.trim().toUpperCase() && o.active
    );

    if (!found) {
      setPromoError('Invalid or expired promotional code.');
      return;
    }

    if (found.minOrderAmount && subtotal < found.minOrderAmount) {
      setPromoError(`Requires a minimum order of KSh ${found.minOrderAmount.toLocaleString()}`);
      return;
    }

    setAppliedOffer(found);
    setPromoError('');
  };

  const handleApplyOfferDirect = (offer: OfferDeal) => {
    setPromoCodeInput(offer.code);
    if (subtotal < (offer.minOrderAmount || 0)) {
      setPromoError(`Add more items to reach min order KSh ${(offer.minOrderAmount || 0).toLocaleString()}`);
      setAppliedOffer(null);
    } else {
      setAppliedOffer(offer);
      setPromoError('');
    }
  };

  // Submit Order
  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!customerName || !customerPhone) return;

    const selectedStoreObj = stores.find((s) => s.id === pickupStoreId) || activeStore;

    const newOrderData = {
      storeId: selectedStoreObj.id,
      storeName: selectedStoreObj.name,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim() || undefined,
      deliveryAddress: deliveryType === 'Delivery' ? deliveryAddress.trim() : `Store Pickup at ${selectedStoreObj.name}`,
      deliveryType,
      items: [...cart],
      subtotal,
      promoCodeApplied: appliedOffer ? appliedOffer.code : undefined,
      discountAmount,
      deliveryFee,
      grandTotal,
      paymentMethod,
      paymentStatus: paymentMethod === 'cash_on_delivery' ? ('Pending Payment' as const) : ('Paid' as const),
      orderStatus: 'Pending' as const,
      notes: orderNotes.trim() || undefined
    };

    onPlaceOrder(newOrderData);

    const generatedNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    setCreatedOrder({
      ...newOrderData,
      id: `ord-${Date.now()}`,
      orderNumber: generatedNumber,
      createdAt: new Date().toISOString()
    });

    // Reset cart
    setCart([]);
    setShowCheckoutModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Top E-Store Banner Header */}
      <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 border-b border-slate-800 p-6 md:p-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Official Online Customer Storefront & Offers Portal
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
              Rofani General Merchant E-Store
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
              Shop online with instant discounts, special promo codes, and fast M-Pesa delivery or store pickup.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('E-Store link copied to clipboard!');
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition"
            >
              <Share2 className="w-4 h-4 text-sky-400" /> Share Store Link
            </button>
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
              <Store className="w-5 h-5 text-emerald-400" />
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block font-medium">Default Fulfillment Outlet</span>
                <span className="text-xs font-bold text-slate-200">{activeStore.name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Promotional Offers Carousel / Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wider">
            <Tag className="w-4 h-4 text-amber-400" /> Hot Customer Deals & Promo Offers
          </h2>
          <span className="text-xs text-slate-400">Apply promo codes at checkout</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {offers.filter((o) => o.active).map((offer) => (
            <div
              key={offer.id}
              onClick={() => handleApplyOfferDirect(offer)}
              className={`p-4 rounded-2xl border transition cursor-pointer relative overflow-hidden group ${
                appliedOffer?.id === offer.id
                  ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-950/40'
                  : 'bg-slate-900/80 border-slate-800 hover:border-amber-500/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                  {offer.bannerTag || 'SPECIAL OFFER'}
                </span>
                <span className="font-mono text-xs font-bold bg-slate-800 text-sky-300 px-2 py-0.5 rounded-md border border-slate-700">
                  {offer.code}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-300 transition">
                {offer.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{offer.description}</p>

              {offer.minOrderAmount && (
                <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80 font-mono">
                  Min Order: KSh {offer.minOrderAmount.toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Catalog & Shopping Cart Layout */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Product Catalog */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search & Category Filter Bar */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search online catalog by product name, SKU, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                    selectedCategory === cat
                      ? 'bg-sky-600 border-sky-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map((p) => {
              const inCart = cart.find((i) => i.product.id === p.id);
              return (
                <div
                  key={p.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition flex flex-col justify-between group"
                >
                  <div className="p-4 space-y-2">
                    <div className="aspect-video bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 relative">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-8 h-8 text-slate-700" />
                      )}
                      <span className="absolute top-2 right-2 bg-slate-900/90 backdrop-blur-sm text-slate-300 border border-slate-800 text-[10px] font-mono px-2 py-0.5 rounded-md">
                        {p.category}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-sky-400 transition line-clamp-1">
                        {p.name}
                      </h3>
                      {p.sizeCapacity && (
                        <p className="text-[11px] text-slate-400 font-mono">{p.sizeCapacity}</p>
                      )}
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">{p.description}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Online Price</span>
                      <span className="text-sm font-extrabold text-sky-400 font-mono">
                        KSh {p.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {inCart ? (
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl p-1">
                        <button
                          onClick={() => handleUpdateQuantity(p.id, inCart.quantity - 1)}
                          className="p-1 text-slate-300 hover:text-white"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-slate-100 px-2 font-mono">
                          {inCart.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(p.id, inCart.quantity + 1)}
                          className="p-1 text-slate-300 hover:text-white"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAddToCart(p)}
                          className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-2.5 py-2 rounded-xl transition flex items-center gap-1 shadow-lg shadow-sky-600/20"
                        >
                          <Plus className="w-3.5 h-3.5" /> Cart
                        </button>
                        <button
                          onClick={() => {
                            const waPhone = (activeStore.whatsappPhone || activeStore.phone || '+254700111222').replace(/\D/g, '');
                            const cleanPhone = waPhone.startsWith('0') ? '254' + waPhone.substring(1) : waPhone;
                            const msg = encodeURIComponent(`Hello ${activeStore.name}, I want to order: ${p.name} (KSh ${p.sellingPrice.toLocaleString()}) from your online store.`);
                            window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
                          }}
                          className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 text-xs font-bold px-2.5 py-2 rounded-xl transition flex items-center gap-1"
                          title="Order directly via WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 4 Cols: Shopping Cart & Order Summary */}
        <div className="lg:col-span-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sticky top-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ShoppingBasket className="w-4 h-4 text-sky-400" /> Online Basket ({cart.length})
              </h3>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-red-400 hover:text-red-300 transition"
                >
                  Clear All
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <ShoppingBag className="w-10 h-10 mx-auto text-slate-700 stroke-1" />
                <p className="text-xs">Your shopping basket is empty.</p>
                <p className="text-[11px] text-slate-600">Select products from the catalog to build your order.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-200 truncate">{item.product.name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        KSh {item.unitPrice.toLocaleString()} × {item.quantity}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-sky-400 font-mono">
                        KSh {item.total.toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.product.id, 0)}
                        className="text-slate-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Promo Code Input Box */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <label className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Tag className="w-3.5 h-3.5" /> Promo / Offer Code
              </label>
              <form onSubmit={handleApplyPromo} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter code (e.g. WELCOME10)"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-100 uppercase focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={!promoCodeInput.trim()}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs transition shrink-0"
                >
                  Apply
                </button>
              </form>

              {appliedOffer && (
                <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg text-xs text-amber-300">
                  <span className="font-bold">Applied: {appliedOffer.code} ({appliedOffer.title})</span>
                  <button
                    onClick={() => {
                      setAppliedOffer(null);
                      setPromoCodeInput('');
                    }}
                    className="text-slate-400 hover:text-amber-200"
                  >
                    ✕
                  </button>
                </div>
              )}

              {promoError && <p className="text-[11px] text-red-400 font-medium">{promoError}</p>}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Items Subtotal:</span>
                <span>KSh {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {appliedOffer && (
                <div className="flex justify-between text-amber-400">
                  <span>Offer Discount ({appliedOffer.code}):</span>
                  <span>- KSh {discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Delivery Fee:</span>
                <span>
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-400 font-bold">FREE</span>
                  ) : (
                    `KSh ${deliveryFee.toLocaleString()}`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-100 pt-2 border-t border-slate-800 font-mono">
                <span>Grand Total:</span>
                <span className="text-sky-400">
                  KSh {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={() => setShowCheckoutModal(true)}
              disabled={cart.length === 0}
              className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-extrabold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20"
            >
              <span>Proceed to Customer Checkout</span> <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-sky-400" /> Online Customer Order Checkout
                </h3>
                <p className="text-xs text-slate-400">Confirm delivery details & M-Pesa payment choice</p>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Delivery Type Option */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDeliveryType('Delivery')}
                  className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${
                    deliveryType === 'Delivery'
                      ? 'bg-sky-950/60 border-sky-500 text-sky-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Truck className="w-4 h-4" /> Express Home Delivery
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryType('Store Pickup')}
                  className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${
                    deliveryType === 'Store Pickup'
                      ? 'bg-sky-950/60 border-sky-500 text-sky-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Store className="w-4 h-4" /> Store Branch Pickup
                </button>
              </div>

              {/* Customer Info */}
              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Customer Contact & Shipping Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Kamau"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Phone Number (M-Pesa) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. +254 712 345678"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {deliveryType === 'Delivery' ? (
                  <div>
                    <label className="text-slate-400 block mb-1">Detailed Delivery Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apartment 3B, Kilimani Road, Nairobi"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-slate-400 block mb-1">Select Branch Outlet for Pickup</label>
                    <select
                      value={pickupStoreId}
                      onChange={(e) => setPickupStoreId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    >
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.city})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Select Payment Option
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mpesa')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition ${
                      paymentMethod === 'mpesa'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    M-Pesa Express
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition ${
                      paymentMethod === 'card'
                        ? 'bg-sky-950/60 border-sky-500 text-sky-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Credit/Debit Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash_on_delivery')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition ${
                      paymentMethod === 'cash_on_delivery'
                        ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Cash on Delivery
                  </button>
                </div>
              </div>

              {/* Order Notes */}
              <div>
                <label className="text-slate-400 block mb-1">Delivery Notes / Specific Instructions</label>
                <input
                  type="text"
                  placeholder="Optional delivery instructions or preferred time..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span>Payable Total:</span>
                  <span className="text-sky-400 font-bold">
                    KSh {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl text-xs transition shadow-lg shadow-emerald-600/20"
              >
                Submit Order Now
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Order Created Success Dialog */}
      {createdOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl w-full max-w-md p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-slate-100">Online Order Submitted!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Order Reference: <strong className="text-sky-400 font-mono">{createdOrder.orderNumber}</strong>
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left text-xs font-mono space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span>{createdOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Outlet:</span>
                <span>{createdOrder.storeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Type:</span>
                <span>{createdOrder.deliveryType}</span>
              </div>
              <div className="flex justify-between text-sky-400 font-bold pt-1 border-t border-slate-800">
                <span>Amount:</span>
                <span>KSh {createdOrder.grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Your order has been routed to the merchant dashboard and is currently being processed.
            </p>

            <button
              onClick={() => setCreatedOrder(null)}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 rounded-xl text-xs transition"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}
      {/* Floating Storefront WhatsApp Chat & Inquiry Widget */}
      <a
        href={`https://wa.me/${(activeStore.whatsappPhone || activeStore.phone || '+254700111222').replace(/\D/g, '').replace(/^0/, '254')}?text=${encodeURIComponent(`Hello ${activeStore.name}, I am visiting your online store and have a question!`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 left-5 z-40 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-extrabold px-4 py-3 rounded-full text-xs flex items-center gap-2 shadow-2xl shadow-emerald-600/40 border border-emerald-400/40 transition hover:scale-105"
        title="Chat on WhatsApp with store clerk"
      >
        <MessageSquare className="w-4 h-4" />
        <span>Chat on WhatsApp</span>
      </a>
    </div>
  );
};
