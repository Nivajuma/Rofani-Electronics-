import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Package,
  RefreshCw
} from 'lucide-react';
import { Product } from '../../types';
import { safeGetJSON, safeSetJSON } from '../../utils/safeStorage';

export type LowStockScope = 'closest' | 'approaching' | 'breached';
export type StockThresholdStatus = 'out' | 'below' | 'near' | 'healthy';

export interface LowStockTrendsCardProps {
  products: Product[];
  onSelectProduct?: (product: Product) => void;
  onViewLowStockOnly?: () => void;
  onOpenRestockCenter?: () => void;
  activeLowStockFilter?: boolean;
}

interface ChartEntry {
  id: string;
  name: string;
  shortName: string;
  sku: string;
  category: string;
  currentStock: number;
  minThreshold: number;
  gapUnits: number;
  proximityRatio: number;
  status: StockThresholdStatus;
  statusLabel: string;
  product: Product;
}

const STATUS_COLORS: Record<StockThresholdStatus, string> = {
  out: '#f43f5e',
  below: '#f97316',
  near: '#f59e0b',
  healthy: '#38bdf8'
};

const STATUS_LABELS: Record<StockThresholdStatus, string> = {
  out: 'Out of Stock',
  below: 'At or Below Min',
  near: 'Approaching Min',
  healthy: 'Above Threshold'
};

function getThresholdStatus(currentStock: number, minThreshold: number): StockThresholdStatus {
  if (currentStock <= 0) return 'out';
  if (currentStock <= minThreshold) return 'below';
  const gap = currentStock - minThreshold;
  if (gap <= 5 || (minThreshold > 0 && currentStock <= minThreshold * 1.5)) {
    return 'near';
  }
  return 'healthy';
}

function truncateLabel(text: string, maxLen = 22): string {
  const clean = text.trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1)}…`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartEntry }>;
}

const LowStockTrendsTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0]?.payload;
  if (!entry) return null;

  const statusColor =
    entry.status === 'out'
      ? 'text-rose-400'
      : entry.status === 'below'
      ? 'text-orange-400'
      : entry.status === 'near'
      ? 'text-amber-300'
      : 'text-sky-300';

  const gapText =
    entry.gapUnits < 0
      ? `${Math.abs(entry.gapUnits)} below min`
      : entry.gapUnits === 0
      ? 'At exact min limit'
      : `+${entry.gapUnits} above min`;

  return (
    <div className="bg-slate-950/95 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs max-w-[260px] space-y-2 backdrop-blur-md">
      <div>
        <div className="font-bold text-white leading-snug">{entry.name}</div>
        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span>{entry.category || 'Uncategorized'}</span>
          {entry.sku && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-300">{entry.sku}</span>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-slate-800 pt-2 space-y-1 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400 font-sans">Current Stock</span>
          <span className={`font-bold ${statusColor}`}>{entry.currentStock} units</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400 font-sans">Min Alert Limit</span>
          <span className="font-semibold text-slate-200">{entry.minThreshold} units</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400 font-sans">Threshold Buffer</span>
          <span className={`font-bold ${statusColor}`}>{gapText}</span>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between text-[11px]">
        <span className={`font-semibold ${statusColor}`}>{entry.statusLabel}</span>
        <span className="text-slate-500">Click bar to edit</span>
      </div>
    </div>
  );
};

export const LowStockTrendsCard: React.FC<LowStockTrendsCardProps> = ({
  products,
  onSelectProduct,
  onViewLowStockOnly,
  onOpenRestockCenter,
  activeLowStockFilter = false
}) => {
  const [scope, setScope] = useState<LowStockScope>('closest');
  const [limitCount, setLimitCount] = useState<8 | 12 | 16>(8);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() =>
    safeGetJSON<boolean>('retail_pos_low_stock_trends_collapsed', false)
  );

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      safeSetJSON('retail_pos_low_stock_trends_collapsed', next);
      return next;
    });
  };

  const { allEntries, summaryCounts } = useMemo(() => {
    let outCount = 0;
    let belowCount = 0;
    let nearCount = 0;

    const mapped: ChartEntry[] = products.map((product) => {
      const currentStock =
        typeof product.stockQuantity === 'number' && !Number.isNaN(product.stockQuantity)
          ? product.stockQuantity
          : 0;
      const minThreshold =
        typeof product.minStockAlert === 'number' && !Number.isNaN(product.minStockAlert)
          ? Math.max(0, product.minStockAlert)
          : 5;

      const gapUnits = currentStock - minThreshold;
      const proximityRatio =
        minThreshold > 0 ? currentStock / minThreshold : currentStock <= 0 ? 0 : currentStock + 1;
      const status = getThresholdStatus(currentStock, minThreshold);

      if (status === 'out') outCount += 1;
      else if (status === 'below') belowCount += 1;
      else if (status === 'near') nearCount += 1;

      return {
        id: product.id,
        name: product.name,
        shortName: truncateLabel(product.name, 22),
        sku: product.sku || '',
        category: product.category || 'General',
        currentStock,
        minThreshold,
        gapUnits,
        proximityRatio,
        status,
        statusLabel: STATUS_LABELS[status],
        product
      };
    });

    // Sort closest to (and furthest below) the minimum alert threshold first
    mapped.sort((a, b) => {
      if (a.gapUnits !== b.gapUnits) return a.gapUnits - b.gapUnits;
      if (a.proximityRatio !== b.proximityRatio) return a.proximityRatio - b.proximityRatio;
      if (a.currentStock !== b.currentStock) return a.currentStock - b.currentStock;
      return a.name.localeCompare(b.name);
    });

    return {
      allEntries: mapped,
      summaryCounts: {
        outCount,
        belowCount,
        breachedTotal: outCount + belowCount,
        nearCount
      }
    };
  }, [products]);

  const scopedEntries = useMemo(() => {
    if (scope === 'breached') {
      return allEntries.filter((e) => e.currentStock <= e.minThreshold);
    }
    if (scope === 'approaching') {
      return allEntries.filter((e) => e.currentStock > e.minThreshold);
    }
    return allEntries;
  }, [allEntries, scope]);

  const chartData = useMemo(
    () => scopedEntries.slice(0, limitCount),
    [scopedEntries, limitCount]
  );

  const chartHeight = Math.max(250, chartData.length * 40 + 52);

  const handleBarSelect = (barEvent: any) => {
    const product: Product | undefined = barEvent?.payload?.product ?? barEvent?.product;
    if (product && onSelectProduct) {
      onSelectProduct(product);
    }
  };

  return (
    <section
      aria-label="Low Stock Trends"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4"
    >
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <BarChart3 className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Low Stock Trends
            </h3>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap font-mono tabular-nums">
            <span className={summaryCounts.outCount > 0 ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
              {summaryCounts.outCount} out of stock
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className={summaryCounts.belowCount > 0 ? 'text-orange-400 font-semibold' : 'text-slate-400'}>
              {summaryCounts.belowCount} at/below min
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className={summaryCounts.nearCount > 0 ? 'text-amber-300 font-semibold' : 'text-slate-400'}>
              {summaryCounts.nearCount} approaching limit
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="font-sans text-slate-500">
              {products.length} tracked products
            </span>
          </div>
        </div>

        {/* Actions & Collapse */}
        <div className="flex items-center gap-2 flex-wrap">
          {summaryCounts.breachedTotal > 0 && onOpenRestockCenter && (
            <button
              type="button"
              onClick={onOpenRestockCenter}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restock Center ({summaryCounts.breachedTotal})</span>
            </button>
          )}
          {onViewLowStockOnly && summaryCounts.breachedTotal > 0 && !activeLowStockFilter && (
            <button
              type="button"
              onClick={onViewLowStockOnly}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              Filter Catalog Low Stock
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleCollapse}
            aria-expanded={!isCollapsed}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Show Chart</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Hide Chart</span>
              </>
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Filter Controls & Legend Hairline Bar */}
          <div className="border-t border-slate-800 pt-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            {/* Segmented Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <div
                role="group"
                aria-label="Stock threshold scope"
                className="inline-flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg"
              >
                <button
                  type="button"
                  onClick={() => setScope('closest')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition whitespace-nowrap shrink-0 cursor-pointer ${
                    scope === 'closest'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Closest Overall
                </button>
                <button
                  type="button"
                  onClick={() => setScope('approaching')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition whitespace-nowrap shrink-0 cursor-pointer ${
                    scope === 'approaching'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Near Limit (&gt; Min)
                </button>
                <button
                  type="button"
                  onClick={() => setScope('breached')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition whitespace-nowrap shrink-0 cursor-pointer ${
                    scope === 'breached'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  At or Below Min
                </button>
              </div>

              <div
                role="group"
                aria-label="Number of products displayed"
                className="inline-flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg"
              >
                {([8, 12, 16] as const).map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setLimitCount(count)}
                    className={`px-2.5 py-1 text-xs font-mono tabular-nums font-medium rounded-md transition whitespace-nowrap shrink-0 cursor-pointer ${
                      limitCount === count
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Top {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Clean Color Key (Text + Swatch, Zero Pill Boxes) */}
            <div className="flex items-center gap-3.5 flex-wrap text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" aria-hidden="true" />
                Out of stock
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" aria-hidden="true" />
                At/Below min
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" aria-hidden="true" />
                Approaching
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 inline-block" aria-hidden="true" />
                Above min
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-600 inline-block" aria-hidden="true" />
                Min threshold
              </span>
            </div>
          </div>

          {/* Chart Viewport */}
          {products.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/60 p-6">
              <Package className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No Inventory Items Yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Add products to your inventory to track stock proximity against minimum alert thresholds.
              </p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/60 p-6 space-y-2.5">
              <AlertTriangle className="w-8 h-8 text-emerald-500/70" />
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {scope === 'breached'
                    ? 'All Products Are Above Their Minimum Threshold'
                    : 'No Products in This Threshold View'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Switch back to Closest Overall to inspect stock buffers across your catalog.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScope('closest')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition cursor-pointer"
              >
                Show Closest Overall
              </button>
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                <span>
                  Products ranked by smallest buffer to minimum alert limit
                </span>
                <span className="font-mono tabular-nums text-slate-500">
                  Showing {chartData.length} of {scopedEntries.length}
                </span>
              </div>

              <div className="w-full" style={{ height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 6, right: 24, left: 8, bottom: 6 }}
                    barGap={3}
                    barCategoryGap="24%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1e293b"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="shortName"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={142}
                    />
                    <Tooltip
                      content={<LowStockTrendsTooltip />}
                      cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                    />
                    <Bar
                      dataKey="currentStock"
                      name="Current Stock"
                      barSize={12}
                      radius={[0, 5, 5, 0]}
                      cursor={onSelectProduct ? 'pointer' : 'default'}
                      onClick={handleBarSelect}
                    >
                      {chartData.map((entry) => (
                        <Cell
                          key={`stock-${entry.id}`}
                          fill={STATUS_COLORS[entry.status]}
                        />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="minThreshold"
                      name="Min Alert Limit"
                      barSize={8}
                      radius={[0, 4, 4, 0]}
                      fill="#475569"
                      cursor={onSelectProduct ? 'pointer' : 'default'}
                      onClick={handleBarSelect}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="border-t border-slate-800/80 pt-2.5 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                <span>
                  Top colored bar = current units in stock · Lower slate bar = minimum alert threshold
                </span>
                {onSelectProduct && (
                  <span className="text-slate-400">
                    Click any bar to adjust stock or threshold
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};
