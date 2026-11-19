import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Search,
  X,
  RefreshCw,
  CalendarPlus,
  Ban,
  Phone,
  Store,
  CheckCircle2,
  AlertTriangle,
  Users,
  Gift,
} from 'lucide-react';
import { StoreSubscriptionProfile } from '../../types';
import {
  fetchAllStoresForSuperAdmin,
  subscribeToAllStoresForSuperAdmin,
  superAdminUpdateStoreSubscription,
  reconcileIncomingReferralRewards,
} from '../../lib/cloudSync';
import { OWNER_PRIMARY_STORE_ID, OWNER_CLOUD_EMAIL } from '../../lib/firebase';

interface SuperAdminSubscribersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuperAdminSubscribersModal: React.FC<SuperAdminSubscribersModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [stores, setStores] = useState<StoreSubscriptionProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'expired'>('all');
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    let active = true;

    const unsubscribe = subscribeToAllStoresForSuperAdmin(
      (list) => {
        if (!active) return;
        setStores(list);
        setIsLoading(false);
      },
      (err) => {
        if (!active) return;
        setIsLoading(false);
        setFeedback({
          type: 'error',
          text: err?.message || 'Could not load subscriber stores.',
        });
      }
    );

    fetchAllStoresForSuperAdmin()
      .then((list) => {
        if (active && list.length > 0) {
          setStores(list);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [isOpen]);

  const enrichedStores = useMemo(() => {
    const now = Date.now();
    const referredByCounts: Record<string, number> = {};
    for (const s of stores) {
      if (s.referredBy) {
        referredByCounts[s.referredBy] = (referredByCounts[s.referredBy] || 0) + 1;
      }
    }

    return stores.map((s) => {
      const expMs = s.expiresAt ? Date.parse(s.expiresAt) : 0;
      const isPrimaryOwner =
        s.id === OWNER_PRIMARY_STORE_ID ||
        s.ownerEmail?.toLowerCase() === OWNER_CLOUD_EMAIL;
      const isExpired =
        !isPrimaryOwner &&
        (s.subscriptionStatus === 'expired' || (expMs > 0 && expMs <= now));
      const daysRemaining =
        expMs > now ? Math.ceil((expMs - now) / 86400000) : 0;
      const effectiveReferrals = Math.max(
        s.referralCount || 0,
        referredByCounts[s.id] || 0
      );
      return {
        ...s,
        liveStatus: (isExpired ? 'expired' : 'active') as 'active' | 'expired',
        daysRemaining,
        effectiveReferrals,
        hasPendingReconcile: (referredByCounts[s.id] || 0) > (s.referralCount || 0),
      };
    });
  }, [stores]);

  useEffect(() => {
    if (!isOpen || stores.length === 0) return;
    const pendingShops = enrichedStores.filter((s) => s.hasPendingReconcile);
    if (pendingShops.length === 0) return;
    pendingShops.forEach((s) => {
      reconcileIncomingReferralRewards(s.id).catch(() => {});
    });
  }, [isOpen, enrichedStores, stores.length]);

  const stats = useMemo(() => {
    const total = enrichedStores.length;
    const active = enrichedStores.filter((s) => s.liveStatus === 'active').length;
    const trial = enrichedStores.filter(
      (s) => s.liveStatus === 'active' && s.planType === 'trial'
    ).length;
    const expired = enrichedStores.filter((s) => s.liveStatus === 'expired').length;
    return { total, active, trial, expired };
  }, [enrichedStores]);

  const filteredStores = useMemo(() => {
    return enrichedStores.filter((s) => {
      if (statusFilter === 'active' && s.liveStatus !== 'active') return false;
      if (statusFilter === 'trial' && !(s.liveStatus === 'active' && s.planType === 'trial'))
        return false;
      if (statusFilter === 'expired' && s.liveStatus !== 'expired') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.storeName?.toLowerCase().includes(q) ||
          s.ownerEmail?.toLowerCase().includes(q) ||
          s.phone?.toLowerCase().includes(q) ||
          s.id?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enrichedStores, searchQuery, statusFilter]);

  if (!isOpen) return null;

  const handleAction = async (
    store: StoreSubscriptionProfile,
    action: 'extend_30d' | 'extend_1y' | 'suspend'
  ) => {
    setActionBusyId(store.id);
    setFeedback(null);
    try {
      await superAdminUpdateStoreSubscription(store.id, action, store);
      const label =
        action === 'extend_30d'
          ? 'extended by +30 Days'
          : action === 'extend_1y'
          ? 'extended by +1 Year'
          : 'suspended';
      setFeedback({
        type: 'success',
        text: `${store.storeName} subscription ${label}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Failed to update subscriber status.',
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const handleManualRefresh = async () => {
    setIsLoading(true);
    try {
      const list = await fetchAllStoresForSuperAdmin();
      setStores(list);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Refresh failed.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[210] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-5 font-sans"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#1e293b] border border-slate-700 rounded-3xl p-5 sm:p-6 text-slate-100 shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-700/70 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Super Admin: Manage Subscribers
              </h2>
              <p className="text-[11px] text-slate-400">
                Owner Console • Manage registered merchant stores, trials &amp; renewals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="p-2 rounded-xl bg-[#0f172a] hover:bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
              title="Refresh Subscribers"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-3.5 shrink-0">
          <div className="bg-[#0f172a] border border-slate-700/70 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Total Shops
            </p>
            <p className="text-lg font-extrabold text-white tabular-nums mt-0.5">{stats.total}</p>
          </div>
          <div className="bg-[#0f172a] border border-emerald-500/30 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
              Active
            </p>
            <p className="text-lg font-extrabold text-emerald-300 tabular-nums mt-0.5">
              {stats.active}
            </p>
          </div>
          <div className="bg-[#0f172a] border border-sky-500/30 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wider text-sky-400 font-semibold">
              Free Trials
            </p>
            <p className="text-lg font-extrabold text-sky-300 tabular-nums mt-0.5">
              {stats.trial}
            </p>
          </div>
          <div className="bg-[#0f172a] border border-rose-500/30 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold">
              Expired / Suspended
            </p>
            <p className="text-lg font-extrabold text-rose-300 tabular-nums mt-0.5">
              {stats.expired}
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-2.5 pb-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shop name, email, or phone..."
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div className="inline-flex bg-[#0f172a] border border-slate-700 rounded-xl p-1 gap-1 self-start">
            {(['all', 'active', 'trial', 'expired'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold capitalize cursor-pointer transition ${
                  statusFilter === tab
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Action Feedback */}
        {feedback && (
          <div
            className={`mb-3 rounded-xl p-3 text-xs flex items-center gap-2 shrink-0 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Subscribers List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {isLoading && stores.length === 0 ? (
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-400">
              Loading registered subscriber stores...
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-400 space-y-2">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No subscriber shops match this filter.</p>
            </div>
          ) : (
            filteredStores.map((shop) => {
              const isPrimaryOwnerStore = shop.id === OWNER_PRIMARY_STORE_ID;
              const isBusy = actionBusyId === shop.id;
              const formattedExpiry = shop.expiresAt
                ? new Date(shop.expiresAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'N/A';

              return (
                <div
                  key={shop.id}
                  className="bg-[#0f172a] border border-slate-700/70 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 font-bold text-sm text-white">
                        <Store className="w-4 h-4 text-sky-400 shrink-0" />
                        {shop.storeName || 'Unnamed Store'}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                          shop.liveStatus === 'active'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {shop.liveStatus === 'active' ? 'Active' : 'Expired'}
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-semibold uppercase">
                        {isPrimaryOwnerStore ? 'Owner Master' : shop.planType || 'trial'}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-bold inline-flex items-center gap-1 tabular-nums ${
                          shop.effectiveReferrals > 0
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                            : 'bg-slate-800/80 text-slate-400 border-slate-700'
                        }`}
                      >
                        <Gift className="w-3 h-3" />
                        Referrals: {shop.effectiveReferrals}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                      <span>{shop.ownerEmail}</span>
                      {shop.phone && (
                        <span className="inline-flex items-center gap-1 text-slate-300 font-mono">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {shop.phone}
                        </span>
                      )}
                      {shop.kraPin && <span>KRA: {shop.kraPin}</span>}
                      {shop.mpesaShortcode && (
                        <span>
                          {shop.mpesaShortcodeType?.toUpperCase() || 'TILL'}: {shop.mpesaShortcode}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                      <span className="text-slate-400">
                        Expires:{' '}
                        <strong className="text-slate-200 tabular-nums">{formattedExpiry}</strong>
                        {shop.liveStatus === 'active' && !isPrimaryOwnerStore && (
                          <span className="text-sky-400 ml-1">
                            ({shop.daysRemaining}d left)
                          </span>
                        )}
                      </span>
                      {shop.referralCode && (
                        <span className="text-slate-400">
                          Code: <strong className="text-amber-300 font-mono">{shop.referralCode}</strong>
                        </span>
                      )}
                      {shop.referredByStoreName && (
                        <span className="text-emerald-300/90">
                          Invited by: <strong>{shop.referredByStoreName}</strong>
                        </span>
                      )}
                      {shop.lastPaymentRef && (
                        <span className="text-slate-400">
                          Last Ref:{' '}
                          <strong className="text-emerald-300 font-mono">
                            {shop.lastPaymentRef}
                          </strong>
                          {shop.lastPaymentAmount
                            ? ` (KSh ${shop.lastPaymentAmount.toLocaleString()})`
                            : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick One-Tap Owner Actions */}
                  {!isPrimaryOwnerStore && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleAction(shop, 'extend_30d')}
                        className="px-3 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        Extend +30 Days
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleAction(shop, 'extend_1y')}
                        className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        Extend +1 Year
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleAction(shop, 'suspend')}
                        className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Suspend Access
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
