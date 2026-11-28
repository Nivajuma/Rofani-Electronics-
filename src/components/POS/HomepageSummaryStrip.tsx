import React, { useMemo, useState } from 'react';
import {
  Wallet,
  CreditCard,
  TrendingUp,
  PackagePlus,
  DollarSign,
  Receipt,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  CashTransaction,
  Customer,
  Expense,
  OnlineOrder,
  PurchaseOrder,
  RestockRecord,
  Transaction,
} from '../../types';
import { HomepageSummaryCardToggles } from '../../utils/shopProtectionSettings';
import { useCurrency } from '../../utils/currency';

interface HomepageSummaryStripProps {
  toggles: HomepageSummaryCardToggles;
  transactions: Transaction[];
  customers: Customer[];
  expenses?: Expense[];
  restockRecords?: RestockRecord[];
  onlineOrders?: OnlineOrder[];
  purchaseOrders?: PurchaseOrder[];
  cashTransactions?: CashTransaction[];
  canViewProfit: boolean;
}

const getTodayIsoPrefix = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const isToday = (val: string | number | undefined, todayKey: string): boolean => {
  if (!val) return false;
  const d = new Date(val);
  if (isNaN(d.getTime())) return false;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}` === todayKey;
};

export const HomepageSummaryStrip: React.FC<HomepageSummaryStripProps> = ({
  toggles,
  transactions,
  customers,
  expenses = [],
  restockRecords = [],
  onlineOrders = [],
  purchaseOrders = [],
  cashTransactions = [],
  canViewProfit,
}) => {
  const { formatMoney } = useCurrency();
  const [collapsed, setCollapsed] = useState(false);

  const metrics = useMemo(() => {
    const todayKey = getTodayIsoPrefix();
    const todayTx = transactions.filter((t) => isToday(t.date || t.timestamp, todayKey));

    const todaysSales = todayTx.reduce((s, t) => s + (t.grandTotal || 0), 0);
    const todaysSalesCount = todayTx.length;

    let todayCashCollected = 0;
    let todaysCogs = 0;
    todayTx.forEach((tx) => {
      if (tx.payments && tx.payments.length > 0) {
        tx.payments.forEach((p) => {
          if (p.method === 'cash') todayCashCollected += p.amount || 0;
        });
      } else if ((tx as any).paymentMethod !== 'mpesa' && (tx as any).paymentMethod !== 'card') {
        todayCashCollected += tx.amountPaid || 0;
      }
      (tx.items || []).forEach((it) => {
        const cost = Number(it.product?.costPrice) || 0;
        const qty = (it.quantity || 0) + (it.freeQuantity || 0);
        todaysCogs += cost * qty;
      });
    });

    const todayExp = expenses.filter((e) => isToday(e.date, todayKey));
    const todaysExpenses = todayExp.reduce((s, e) => s + (e.amount || 0), 0);

    const drawerNet = cashTransactions.reduce((sum, c) => {
      return c.type === 'CASH_IN' ? sum + (c.amount || 0) : sum - (c.amount || 0);
    }, 0);
    const cashInHand = Math.max(0, todayCashCollected + drawerNet - todaysExpenses);

    const toReceiveCredit = customers.reduce(
      (s, c) => s + Math.max(0, c.currentBalanceDue || 0),
      0
    );

    const todayRestock = restockRecords.filter((r) => isToday(r.date, todayKey));
    const todaysStockInValue = todayRestock.reduce((s, r) => s + (r.totalCost || 0), 0);
    const todaysStockInUnits = todayRestock.reduce((s, r) => s + (r.quantityAdded || 0), 0);

    const todaysProfit = todaysSales - todaysCogs - todaysExpenses;

    const pendingOnline = onlineOrders.filter(
      (o) =>
        o.orderStatus === 'Pending' ||
        o.orderStatus === 'Confirmed' ||
        o.orderStatus === 'Preparing' ||
        o.orderStatus === 'Out for Delivery / Ready'
    ).length;
    const pendingPurchase = purchaseOrders.filter(
      (po) => po.status === 'Pending'
    ).length;
    const totalPendingOrders = pendingOnline + pendingPurchase;

    return {
      cashInHand,
      toReceiveCredit,
      todaysSales,
      todaysSalesCount,
      todaysStockInValue,
      todaysStockInUnits,
      todaysProfit,
      todaysExpenses,
      todayExpCount: todayExp.length,
      totalPendingOrders,
      pendingOnline,
      pendingPurchase,
    };
  }, [transactions, customers, expenses, restockRecords, onlineOrders, purchaseOrders, cashTransactions]);

  const visibleCards = [
    toggles.cashInHand && {
      key: 'cashInHand',
      label: 'Cash in Hand',
      value: formatMoney(metrics.cashInHand),
      sub: 'Live cash register',
      icon: Wallet,
      accent: 'text-emerald-400',
      border: 'border-emerald-500/25',
    },
    toggles.toReceiveCredit && {
      key: 'toReceiveCredit',
      label: 'To Receive',
      value: formatMoney(metrics.toReceiveCredit),
      sub: 'Customer credit',
      icon: CreditCard,
      accent: 'text-amber-400',
      border: 'border-amber-500/25',
    },
    toggles.todaysSales && {
      key: 'todaysSales',
      label: "Today's Sales",
      value: formatMoney(metrics.todaysSales),
      sub: `${metrics.todaysSalesCount} ${metrics.todaysSalesCount === 1 ? 'receipt' : 'receipts'}`,
      icon: TrendingUp,
      accent: 'text-sky-400',
      border: 'border-sky-500/25',
    },
    toggles.todaysStockIn && {
      key: 'todaysStockIn',
      label: "Today's Stock-In",
      value: formatMoney(metrics.todaysStockInValue),
      sub: `${metrics.todaysStockInUnits} units added`,
      icon: PackagePlus,
      accent: 'text-indigo-400',
      border: 'border-indigo-500/25',
    },
    toggles.todaysProfit && canViewProfit && {
      key: 'todaysProfit',
      label: "Today's Profit",
      value: formatMoney(metrics.todaysProfit),
      sub: 'Net est. today',
      icon: DollarSign,
      accent: metrics.todaysProfit >= 0 ? 'text-emerald-400' : 'text-rose-400',
      border: metrics.todaysProfit >= 0 ? 'border-emerald-500/25' : 'border-rose-500/25',
    },
    toggles.expenses && {
      key: 'expenses',
      label: 'Expenses',
      value: formatMoney(metrics.todaysExpenses),
      sub: `${metrics.todayExpCount} today`,
      icon: Receipt,
      accent: 'text-rose-400',
      border: 'border-rose-500/25',
    },
    toggles.orders && {
      key: 'orders',
      label: 'Orders',
      value: `${metrics.totalPendingOrders}`,
      sub:
        metrics.pendingOnline > 0 || metrics.pendingPurchase > 0
          ? `${metrics.pendingOnline} online • ${metrics.pendingPurchase} stock`
          : 'No open orders',
      icon: ShoppingBag,
      accent: 'text-cyan-400',
      border: 'border-cyan-500/25',
    },
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    value: string;
    sub: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
    border: string;
  }>;

  if (visibleCards.length === 0) return null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 shadow-md">
      <div className="flex items-center justify-between px-1 pb-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Live Shop Summary
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((p) => !p)}
          className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
        >
          <span>{collapsed ? 'Show Cards' : 'Hide'}</span>
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <div
          className={`grid gap-2 ${
            visibleCards.length <= 2
              ? 'grid-cols-2'
              : visibleCards.length <= 4
              ? 'grid-cols-2 sm:grid-cols-4'
              : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7'
          }`}
        >
          {visibleCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.key}
                className={`bg-slate-950/90 border ${card.border} rounded-xl px-2.5 py-2 flex flex-col justify-between min-w-0`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-semibold text-slate-400 truncate">
                    {card.label}
                  </span>
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${card.accent}`} />
                </div>
                <div className={`text-xs sm:text-sm font-black tabular-nums truncate mt-0.5 ${card.accent}`}>
                  {card.value}
                </div>
                <div className="text-[10px] text-slate-500 truncate">{card.sub}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
