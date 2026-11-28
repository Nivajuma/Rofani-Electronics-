import React from 'react';
import { Package, Plus, Star, AlertTriangle, Zap, Gem } from 'lucide-react';
import { Product } from '../../types';
import { ProductPerformanceInfo } from '../../utils/salesPerformance';
import { useCurrency } from '../../utils/currency';

interface POSProductItemProps {
  product: Product;
  perf?: ProductPerformanceInfo;
  inCartQty: number;
  isSelected: boolean;
  onAddToCart: (product: Product) => void;
  showImages?: boolean;
  showBarcode?: boolean;
}

const POSProductListRowComponent: React.FC<POSProductItemProps> = ({
  product: p,
  perf,
  inCartQty,
  isSelected,
  onAddToCart,
  showImages = true,
  showBarcode = true,
}) => {
  const { formatMoney } = useCurrency();
  const isLowStock = p.stockQuantity <= p.minStockAlert;
  const isOutOfStock = p.stockQuantity <= 0;
  const isInCart = inCartQty > 0;

  return (
    <tr
      onClick={() => onAddToCart(p)}
      className={`transition cursor-pointer group ${
        isSelected
          ? 'bg-sky-950/70 ring-2 ring-inset ring-sky-400 border-l-4 border-l-sky-400 shadow-md'
          : isInCart
          ? 'bg-emerald-950/25 border-l-4 border-l-emerald-500 hover:bg-emerald-950/40'
          : 'hover:bg-slate-800/70'
      } ${perf ? perf.accentBorderLeft : ''} ${perf && !isSelected && !isInCart ? perf.tableRowHighlight : ''}`}
    >
      <td className="p-3">
        <div className="flex items-center gap-2.5">
          {showImages && (p.imageUrl ? (
            <img
              src={p.imageUrl}
              alt={p.name}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0 shadow-sm"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 shrink-0">
              <Package className="w-5 h-5 text-slate-600" />
            </div>
          ))}
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`font-bold transition text-xs ${
                  isSelected ? 'text-sky-300 font-black' : 'text-slate-100 group-hover:text-sky-300'
                }`}
              >
                {p.name}
              </span>

              {isSelected && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-sky-500 text-slate-950 shadow-sm animate-pulse shrink-0">
                  ● Selected ({inCartQty})
                </span>
              )}
              {!isSelected && isInCart && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                  ✓ In Cart ({inCartQty})
                </span>
              )}

              {perf && perf.tier !== 'unranked_no_sales' && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border shadow-sm ${perf.badgeBg} ${perf.badgeText} ${perf.badgeBorder}`}
                  title={perf.description}
                >
                  {perf.tier === 'high_sales_high_profit' && (
                    <Star className="w-3 h-3 fill-emerald-400 text-emerald-400 shrink-0" />
                  )}
                  {perf.tier === 'low_sales_low_profit' && (
                    <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  )}
                  {perf.tier === 'high_sales_low_profit' && <Zap className="w-3 h-3 text-sky-400 shrink-0" />}
                  {perf.tier === 'low_sales_high_profit' && <Gem className="w-3 h-3 text-purple-400 shrink-0" />}
                  <span>{perf.tierLabel}</span>
                  <span className="font-mono opacity-85">
                    ({perf.unitsSold} sold • {perf.marginPercent.toFixed(0)}% profit)
                  </span>
                </span>
              )}
              {perf && perf.tier === 'unranked_no_sales' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-slate-800/80 text-slate-400 border border-slate-700">
                  0 sold
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              SKU: {p.sku}{showBarcode && p.barcode ? ` | Barcode: ${p.barcode}` : ''}
            </div>
          </div>
        </div>
      </td>

      <td className="p-3">
        <div className="text-sky-400 font-semibold text-[11px]">{p.category}</div>
        {p.sizeCapacity && (
          <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
            {p.sizeCapacity}
          </span>
        )}
      </td>

      <td className="p-3 text-right font-mono font-bold text-white text-sm">
        {formatMoney(p.sellingPrice, { showDecimals: true })}
      </td>

      <td className="p-3 text-center font-mono">
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
            isOutOfStock
              ? 'bg-red-950 text-red-400 border border-red-800'
              : isLowStock
              ? 'bg-amber-950 text-amber-400 border border-amber-800'
              : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
          }`}
        >
          {isOutOfStock ? '0 stock' : `${p.stockQuantity} ${p.unit}`}
        </span>
      </td>

      <td className="p-3 text-right">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(p);
          }}
          disabled={isOutOfStock}
          className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 ml-auto"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </td>
    </tr>
  );
};

export const POSProductListRow = React.memo(POSProductListRowComponent);

const POSProductGridCardComponent: React.FC<POSProductItemProps> = ({
  product: p,
  perf,
  inCartQty,
  isSelected,
  onAddToCart,
  showImages = true,
}) => {
  const { formatMoney } = useCurrency();
  const isLowStock = p.stockQuantity <= p.minStockAlert;
  const isOutOfStock = p.stockQuantity <= 0;
  const isInCart = inCartQty > 0;

  return (
    <div
      onClick={() => onAddToCart(p)}
      className={`group border rounded-2xl p-3 transition flex flex-col justify-between cursor-pointer relative overflow-hidden ${
        isSelected
          ? 'border-2 border-sky-400 ring-2 ring-sky-400/70 shadow-lg shadow-sky-500/25 bg-sky-950/45 scale-[1.01]'
          : isInCart
          ? 'border-2 border-emerald-500 shadow-md shadow-emerald-500/20 bg-emerald-950/35 ring-1 ring-emerald-400/40'
          : perf
          ? perf.cardBorder
          : 'border-slate-800'
      } ${perf && !isInCart && !isSelected ? perf.cardGlow : ''} ${
        isOutOfStock
          ? 'opacity-60 bg-slate-950/40'
          : isLowStock
          ? 'bg-slate-900/90'
          : isSelected
          ? 'bg-sky-950/45'
          : isInCart
          ? 'bg-emerald-950/35'
          : 'bg-slate-900 hover:bg-slate-800/80'
      }`}
    >
      {isSelected ? (
        <div className="absolute top-2 right-2 z-10">
          <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-sky-400 text-slate-950 shadow-md border border-sky-200 flex items-center gap-1 animate-pulse">
            ● Selected ({inCartQty})
          </span>
        </div>
      ) : isInCart ? (
        <div className="absolute top-2 right-2 z-10">
          <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 shadow-md border border-emerald-300 flex items-center gap-1">
            ✓ In Cart ({inCartQty})
          </span>
        </div>
      ) : null}

      <div>
        {perf && !isInCart && (
          <div className="flex items-center justify-between gap-1 mb-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border tracking-wide shadow-sm ${perf.badgeBg} ${perf.badgeText} ${perf.badgeBorder}`}
              title={perf.description}
            >
              {perf.tier === 'high_sales_high_profit' && (
                <Star className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400 shrink-0" />
              )}
              {perf.tier === 'low_sales_low_profit' && <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
              {perf.tier === 'high_sales_low_profit' && <Zap className="w-2.5 h-2.5 text-sky-400 shrink-0" />}
              {perf.tier === 'low_sales_high_profit' && <Gem className="w-2.5 h-2.5 text-purple-400 shrink-0" />}
              {perf.tier === 'unranked_no_sales' && <Package className="w-2.5 h-2.5 text-slate-400 shrink-0" />}
              <span>{perf.tierShortLabel}</span>
            </span>

            <span className="text-[9px] font-mono font-bold text-slate-400">
              {perf.unitsSold > 0 ? `${perf.unitsSold} sold` : '0 sold'}
            </span>
          </div>
        )}

        {showImages && (
          <div className="w-full h-24 mb-2 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
            {p.imageUrl ? (
              <img
                src={p.imageUrl}
                alt={p.name}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-600 gap-1">
                <Package className="w-6 h-6 text-slate-600 group-hover:text-sky-400 transition" />
                <span className="text-[9px] font-mono text-slate-500">{p.unit}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-[10px] text-sky-400 font-mono uppercase font-semibold truncate">{p.category}</span>
          {p.sizeCapacity && (
            <span className="bg-slate-800 text-slate-300 text-[9px] px-1.5 py-0.5 rounded font-mono">
              {p.sizeCapacity}
            </span>
          )}
        </div>

        <h4 className="font-semibold text-xs text-slate-100 group-hover:text-sky-300 transition line-clamp-2">
          {p.name}
        </h4>

        <div className="text-[10px] text-slate-400 font-mono mt-1">SKU: {p.sku}</div>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-sm font-extrabold text-white">
          {formatMoney(p.sellingPrice, { showDecimals: true })}
        </span>

        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
            isOutOfStock
              ? 'bg-red-950 text-red-400 border border-red-800'
              : isLowStock
              ? 'bg-amber-950 text-amber-400 border border-amber-800'
              : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
          }`}
        >
          {isOutOfStock ? '0 in stock' : `${p.stockQuantity} ${p.unit}`}
        </span>
      </div>
    </div>
  );
};

export const POSProductGridCard = React.memo(POSProductGridCardComponent);
