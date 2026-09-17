import React, { useState } from 'react';
import { OnlineOrder, OfferDeal, StoreLocation, Customer, Product } from '../../types';
import {
  ShoppingBag,
  Tag,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle,
  XCircle,
  Phone,
  MapPin,
  Building2,
  Calendar,
  Filter,
  DollarSign,
  Gift,
  Trash2,
  Check,
  ChevronRight,
  Printer,
  MessageSquare,
  Share2
} from 'lucide-react';
import { WhatsAppMarketingHub } from './WhatsAppMarketingHub';

interface OnlineOrdersManagerViewProps {
  orders: OnlineOrder[];
  offers: OfferDeal[];
  stores: StoreLocation[];
  customers?: Customer[];
  products?: Product[];
  activeStore?: StoreLocation;
  onUpdateOrderStatus: (orderId: string, status: OnlineOrder['orderStatus']) => void;
  onAddOffer: (offer: Omit<OfferDeal, 'id'>) => void;
  onToggleOffer: (offerId: string) => void;
  onDeleteOffer: (offerId: string) => void;
  onUpdateStoreWhatsApp?: (storeId: string, whatsappNumber: string) => void;
}

export const OnlineOrdersManagerView: React.FC<OnlineOrdersManagerViewProps> = ({
  orders,
  offers,
  stores,
  customers = [],
  products = [],
  activeStore = stores[0],
  onUpdateOrderStatus,
  onAddOffer,
  onToggleOffer,
  onDeleteOffer,
  onUpdateStoreWhatsApp
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'offers' | 'whatsapp'>('orders');

  // Orders filters
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [orderStoreFilter, setOrderStoreFilter] = useState<string>('All');
  const [orderSearch, setOrderSearch] = useState('');

  // New Offer Form modal
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'percentage' | 'fixed' | 'bogo'>('percentage');
  const [newValue, setNewValue] = useState<number>(10);
  const [newMinOrder, setNewMinOrder] = useState<number>(0);
  const [newTag, setNewTag] = useState('');

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = orderStatusFilter === 'All' || o.orderStatus === orderStatusFilter;
    const matchesStore = orderStoreFilter === 'All' || o.storeId === orderStoreFilter;
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerPhone.includes(orderSearch);
    return matchesStatus && matchesStore && matchesSearch;
  });

  // Handle Add Offer
  const handleSaveOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newTitle.trim()) return;

    onAddOffer({
      code: newCode.trim().toUpperCase(),
      title: newTitle.trim(),
      description: newDesc.trim() || 'Special promotional deal for online shoppers',
      discountType: newType,
      discountValue: newValue,
      minOrderAmount: newMinOrder > 0 ? newMinOrder : undefined,
      bannerTag: newTag.trim() || '🎉 Special Offer',
      active: true,
      storeId: 'all'
    });

    setNewCode('');
    setNewTitle('');
    setNewDesc('');
    setNewType('percentage');
    setNewValue(10);
    setNewMinOrder(0);
    setNewTag('');
    setShowOfferModal(false);
  };

  const getStatusBadgeClass = (status: OnlineOrder['orderStatus']) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Confirmed':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'Preparing':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'Out for Delivery / Ready':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Cancelled':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-slate-800 text-slate-300';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-sky-400" /> Online Sales & Customer Deals Manager
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Process customer online web orders across branch outlets & configure promo discount codes
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Incoming Online Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('offers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'offers'
                ? 'bg-amber-600 text-slate-950 shadow-lg shadow-amber-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag className="w-4 h-4" /> Customer Offers & Deals ({offers.length})
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-600 text-slate-950 shadow-lg shadow-emerald-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" /> WhatsApp Marketing & Broadcast
          </button>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search order #, customer name or phone..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Filter className="w-3.5 h-3.5" /> Status:
              </div>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Preparing">Preparing</option>
                <option value="Out for Delivery / Ready">Out for Delivery / Ready</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <select
                value={orderStoreFilter}
                onChange={(e) => setOrderStoreFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value="All">All Store Outlets</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Orders Cards Grid */}
          <div className="space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                <ShoppingBag className="w-12 h-12 mx-auto stroke-1 text-slate-700 mb-2" />
                <p className="text-sm font-bold text-slate-400">No online customer orders found</p>
                <p className="text-xs text-slate-600 mt-1">
                  When customers place orders via the Online Storefront, they will appear here in real-time.
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-extrabold text-sky-400 font-mono">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusBadgeClass(
                          order.orderStatus
                        )}`}
                      >
                        {order.orderStatus}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(order.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Update Order Pipeline:</span>
                      <select
                        value={order.orderStatus}
                        onChange={(e) =>
                          onUpdateOrderStatus(order.id, e.target.value as OnlineOrder['orderStatus'])
                        }
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-bold focus:outline-none focus:border-sky-500"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Preparing">Preparing</option>
                        <option value="Out for Delivery / Ready">Out for Delivery / Ready</option>
                        <option value="Completed">Completed & Fulfill POS</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  {/* Customer & Location Detail */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Customer Contact</span>
                      <p className="font-bold text-slate-200">{order.customerName}</p>
                      <p className="text-slate-400 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-sky-400" /> {order.customerPhone}
                      </p>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">
                        Fulfillment & Address
                      </span>
                      <p className="font-bold text-slate-200">{order.deliveryType} ({order.storeName})</p>
                      <p className="text-slate-400 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-sky-400 shrink-0" /> {order.deliveryAddress}
                      </p>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Payment & Total</span>
                      <p className="font-bold text-emerald-400 font-mono text-sm">
                        KSh {order.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-slate-400 font-mono text-[11px]">
                        {order.paymentMethod.toUpperCase()} ({order.paymentStatus})
                      </p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Ordered Items ({order.items.length})</span>
                    <div className="flex flex-wrap gap-2">
                      {order.items.map((item, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-900 border border-slate-800 text-slate-200 px-2.5 py-1 rounded-lg font-mono text-[11px]"
                        >
                          {item.product.name} × <strong>{item.quantity}</strong> (KSh {item.total.toLocaleString()})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'offers' ? (
        /* Offers & Deals Management Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" /> Active Customer Offers & Discount Codes
              </h2>
              <p className="text-xs text-slate-400">Configure promotional coupons for online customers</p>
            </div>
            <button
              onClick={() => setShowOfferModal(true)}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-amber-600/20"
            >
              <Plus className="w-4 h-4" /> Create New Offer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                  offer.active
                    ? 'bg-slate-900 border-amber-500/40'
                    : 'bg-slate-900/40 border-slate-800 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                      {offer.bannerTag || 'SPECIAL OFFER'}
                    </span>
                    <span className="font-mono text-xs font-extrabold bg-slate-950 text-sky-400 px-2.5 py-1 rounded-lg border border-slate-800">
                      {offer.code}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100">{offer.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">{offer.description}</p>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 my-3 text-xs font-mono space-y-1 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Discount:</span>
                      <span className="text-amber-400 font-bold">
                        {offer.discountType === 'percentage'
                          ? `${offer.discountValue}% OFF`
                          : offer.discountType === 'fixed'
                          ? `KSh ${offer.discountValue.toLocaleString()} OFF`
                          : 'BOGO (Buy 1 Get 1)'}
                      </span>
                    </div>
                    {offer.minOrderAmount && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Min Purchase:</span>
                        <span>KSh {offer.minOrderAmount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-2">
                  <button
                    onClick={() => onToggleOffer(offer.id)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition ${
                      offer.active
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {offer.active ? 'Active on E-Store' : 'Inactive / Disabled'}
                  </button>

                  <button
                    onClick={() => onDeleteOffer(offer.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* WhatsApp Marketing & Broadcast Tab */
        <WhatsAppMarketingHub
          offers={offers}
          customers={customers}
          products={products}
          stores={stores}
          activeStore={activeStore}
          onUpdateStoreWhatsApp={onUpdateStoreWhatsApp}
        />
      )}

      {/* Create Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" /> Create Customer Offer & Promo Code
              </h3>
              <button
                onClick={() => setShowOfferModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOffer} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Promo Code (Uppercase) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SAVE20"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 uppercase font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Banner Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. 🔥 Flash Sale"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Offer Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 20% Off Weekend Special"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Offer Description</label>
                <input
                  type="text"
                  placeholder="e.g. Instant 20% discount on orders above KSh 2,000"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Discount Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (KSh)</option>
                    <option value="bogo">BOGO Deal</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Value Amount</label>
                  <input
                    type="number"
                    required
                    value={newValue}
                    onChange={(e) => setNewValue(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Min Order (KSh)</label>
                  <input
                    type="number"
                    value={newMinOrder}
                    onChange={(e) => setNewMinOrder(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowOfferModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-amber-600 text-slate-950 hover:bg-amber-500 shadow-lg shadow-amber-600/20"
                >
                  Save Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
