import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import {
  Activity,
  Layers,
  AlertTriangle,
  Flame,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Package,
  Filter,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  Boxes,
  HelpCircle,
  SlidersHorizontal,
  Info,
  RefreshCw,
  Search,
  Tag,
  ArrowRight,
  Check,
  FolderTree,
  ListFilter
} from 'lucide-react';
import { Product, Transaction } from '../../types';

export interface StockDensityHeatmapProps {
  products: Product[];
  categories?: { id: string; name: string; subcategories?: string[] }[];
  transactions?: Transaction[];
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  onSelectProduct?: (product: Product) => void;
  onFilterCatalogCategory?: (category: string) => void;
  onSwitchToStandard?: (categoryFilter?: string) => void;
}

// Stock health status bins for the heatmap columns
export type StockHealthTier = 'depleted' | 'critical_low' | 'adequate' | 'surplus' | 'overstocked';

interface TierDefinition {
  id: StockHealthTier;
  label: string;
  sublabel: string;
  shortDesc: string;
  colorScheme: {
    bg: string;
    border: string;
    text: string;
    d3BaseColor: string;
    d3HighlightColor: string;
  };
}

export const STOCK_TIERS: TierDefinition[] = [
  {
    id: 'depleted',
    label: 'Out of Stock',
    sublabel: '0 units in stock',
    shortDesc: 'Stockout risk / Lost sales',
    colorScheme: {
      bg: 'bg-rose-950/60',
      border: 'border-rose-700/50',
      text: 'text-rose-400',
      d3BaseColor: '#e11d48', // rose-600
      d3HighlightColor: '#f43f5e'
    }
  },
  {
    id: 'critical_low',
    label: 'Critical Low',
    sublabel: '1 to Min Alert units',
    shortDesc: 'Replenishment urgent',
    colorScheme: {
      bg: 'bg-amber-950/60',
      border: 'border-amber-700/50',
      text: 'text-amber-400',
      d3BaseColor: '#f59e0b', // amber-500
      d3HighlightColor: '#fbbf24'
    }
  },
  {
    id: 'adequate',
    label: 'Optimal / Adequate',
    sublabel: 'Alert to 2.5x Min Alert',
    shortDesc: 'Healthy turnover sweet-spot',
    colorScheme: {
      bg: 'bg-emerald-950/60',
      border: 'border-emerald-700/50',
      text: 'text-emerald-400',
      d3BaseColor: '#10b981', // emerald-500
      d3HighlightColor: '#34d399'
    }
  },
  {
    id: 'surplus',
    label: 'Surplus Stock',
    sublabel: '2.5x to 5x Min Alert',
    shortDesc: 'Sufficient buffer inventory',
    colorScheme: {
      bg: 'bg-sky-950/60',
      border: 'border-sky-700/50',
      text: 'text-sky-400',
      d3BaseColor: '#0284c7', // sky-600
      d3HighlightColor: '#38bdf8'
    }
  },
  {
    id: 'overstocked',
    label: 'Excessive Overstock',
    sublabel: '> 5x Min Alert or > 50 units',
    shortDesc: 'Capital locked in shelf space',
    colorScheme: {
      bg: 'bg-purple-950/60',
      border: 'border-purple-700/50',
      text: 'text-purple-400',
      d3BaseColor: '#9333ea', // purple-600
      d3HighlightColor: '#c084fc'
    }
  }
];

export type DensityMetric = 'item_count' | 'stock_units' | 'inventory_value' | 'imbalance_risk';

export interface CategoryImbalanceSummary {
  category: string;
  isSubcategory?: boolean;
  parentCategory?: string;
  totalProducts: number;
  totalUnits: number;
  totalRetailValue: number;
  totalCostValue: number;
  // Breakdown by tiers
  tierCounts: Record<StockHealthTier, number>;
  tierUnits: Record<StockHealthTier, number>;
  tierValue: Record<StockHealthTier, number>;
  // Products list in each tier
  tierProducts: Record<StockHealthTier, Product[]>;
  // Imbalance assessment
  imbalanceScore: number; // -100 (severe depletion) to +100 (severe overstock)
  imbalanceSeverity: 'severe_understock' | 'mild_understock' | 'balanced' | 'mild_overstock' | 'severe_overstock';
  topRiskDescription: string;
  recommendedAction: string;
}

export const StockDensityHeatmap: React.FC<StockDensityHeatmapProps> = ({
  products,
  categories = [],
  transactions = [],
  selectedCategory,
  onCategoryChange,
  onSelectProduct,
  onFilterCatalogCategory,
  onSwitchToStandard
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Heatmap View Configuration
  const [metric, setMetric] = useState<DensityMetric>('item_count');
  const [sortBy, setSortBy] = useState<'imbalance' | 'units' | 'value' | 'alphabetical' | 'stockout'>('imbalance');
  const [selectedCell, setSelectedCell] = useState<{ category: string; tier: StockHealthTier } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    category: string;
    tier: StockHealthTier;
    count: number;
    units: number;
    value: number;
    pctOfCategory: number;
    x: number;
    y: number;
  } | null>(null);

  // Interactive Category Filter State
  // Empty array [] represents "All Categories selected"
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<string[]>(() => {
    if (selectedCategory && selectedCategory !== 'All') {
      return [selectedCategory];
    }
    return [];
  });

  // Toggle to break down a single selected category by its subcategories
  const [breakdownSubcategories, setBreakdownSubcategories] = useState<boolean>(false);

  // Search filter inside categories
  const [categorySearch, setCategorySearch] = useState('');
  const [imbalanceFilter, setImbalanceFilter] = useState<'all' | 'unbalanced_only' | 'stockout_only' | 'overstock_only'>('all');

  // Synchronize when parent selectedCategory changes
  useEffect(() => {
    if (selectedCategory && selectedCategory !== 'All') {
      setSelectedCategoryFilters([selectedCategory]);
    } else if (selectedCategory === 'All' && selectedCategoryFilters.length === 1) {
      setSelectedCategoryFilters([]);
      setBreakdownSubcategories(false);
    }
  }, [selectedCategory]);

  // Extract all unique category names from catalog products and definitions
  const allCategoryNames = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((c) => {
      if (c.name && c.name !== 'All') set.add(c.name.trim());
    });
    products.forEach((p) => {
      const cat = p.category?.trim();
      if (cat) set.add(cat);
      else set.add('Uncategorized');
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products, categories]);

  // Helper function to build summary for an array of items with a given label
  const buildSummary = (
    label: string,
    items: Product[],
    isSubcategory: boolean = false,
    parentCat?: string
  ): CategoryImbalanceSummary => {
    const tierCounts: Record<StockHealthTier, number> = {
      depleted: 0,
      critical_low: 0,
      adequate: 0,
      surplus: 0,
      overstocked: 0
    };
    const tierUnits: Record<StockHealthTier, number> = {
      depleted: 0,
      critical_low: 0,
      adequate: 0,
      surplus: 0,
      overstocked: 0
    };
    const tierValue: Record<StockHealthTier, number> = {
      depleted: 0,
      critical_low: 0,
      adequate: 0,
      surplus: 0,
      overstocked: 0
    };
    const tierProducts: Record<StockHealthTier, Product[]> = {
      depleted: [],
      critical_low: [],
      adequate: [],
      surplus: [],
      overstocked: []
    };

    let totalUnits = 0;
    let totalRetailValue = 0;
    let totalCostValue = 0;

    items.forEach((p) => {
      const qty = Number(p.stockQuantity ?? p.stock ?? 0);
      const minAlert = Math.max(1, Number(p.minStockAlert || 5));
      const price = Number(p.sellingPrice || 0);
      const cost = Number(p.costPrice || p.buyingPrice || price * 0.7);

      totalUnits += qty;
      totalRetailValue += qty * price;
      totalCostValue += qty * cost;

      let tier: StockHealthTier = 'adequate';
      if (qty <= 0) {
        tier = 'depleted';
      } else if (qty <= minAlert) {
        tier = 'critical_low';
      } else if (qty <= minAlert * 2.5) {
        tier = 'adequate';
      } else if (qty <= Math.max(minAlert * 5, 40)) {
        tier = 'surplus';
      } else {
        tier = 'overstocked';
      }

      tierCounts[tier] += 1;
      tierUnits[tier] += qty;
      tierValue[tier] += qty * price;
      tierProducts[tier].push(p);
    });

    const totalItems = items.length || 1;
    const depletedPct = (tierCounts.depleted / totalItems) * 100;
    const criticalPct = (tierCounts.critical_low / totalItems) * 100;
    const overstockedPct = (tierCounts.overstocked / totalItems) * 100;
    const surplusPct = (tierCounts.surplus / totalItems) * 100;

    const understockPressure = tierCounts.depleted * 2.5 + tierCounts.critical_low * 1.5;
    const overstockPressure = tierCounts.overstocked * 2.0 + tierCounts.surplus * 1.0;
    const rawScore = ((overstockPressure - understockPressure) / totalItems) * 50;
    const imbalanceScore = Math.max(-100, Math.min(100, Math.round(rawScore)));

    let imbalanceSeverity: CategoryImbalanceSummary['imbalanceSeverity'] = 'balanced';
    let topRiskDescription = 'Stock levels are aligned with alert thresholds.';
    let recommendedAction = 'Maintain current purchase cycles and monitor sales.';

    if (depletedPct + criticalPct >= 50 || depletedPct >= 35) {
      imbalanceSeverity = 'severe_understock';
      topRiskDescription = `High stockout risk! ${tierCounts.depleted} items depleted and ${tierCounts.critical_low} items near zero.`;
      recommendedAction = 'Urgent replenishment required to prevent immediate lost sales.';
    } else if (depletedPct + criticalPct >= 25) {
      imbalanceSeverity = 'mild_understock';
      topRiskDescription = `Inventory running lean. ${tierCounts.critical_low + tierCounts.depleted} items below minimum threshold.`;
      recommendedAction = 'Review supplier lead times and queue reorders.';
    } else if (overstockedPct >= 35 || (overstockedPct >= 20 && surplusPct >= 35)) {
      imbalanceSeverity = 'severe_overstock';
      topRiskDescription = `Excess inventory bottleneck. ${tierCounts.overstocked} items have 5x+ excess safety stock.`;
      recommendedAction = 'Launch flash bundle promotion or discount to free tied-up capital.';
    } else if (overstockedPct + surplusPct >= 45) {
      imbalanceSeverity = 'mild_overstock';
      topRiskDescription = `High stock density. Over ${tierCounts.overstocked + tierCounts.surplus} items exceed standard buffer.`;
      recommendedAction = 'Pause or decrease reorder quantities on slow-moving items.';
    }

    return {
      category: label,
      isSubcategory,
      parentCategory: parentCat,
      totalProducts: totalItems,
      totalUnits,
      totalRetailValue,
      totalCostValue,
      tierCounts,
      tierUnits,
      tierValue,
      tierProducts,
      imbalanceScore,
      imbalanceSeverity,
      topRiskDescription,
      recommendedAction
    };
  };

  // Base Category Summaries across ALL products
  const allCategorySummaries: CategoryImbalanceSummary[] = useMemo(() => {
    const map = new Map<string, Product[]>();

    products.forEach((p) => {
      const cat = p.category?.trim() || 'Uncategorized';
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(p);
    });

    const summaries: CategoryImbalanceSummary[] = [];
    map.forEach((items, cat) => {
      summaries.push(buildSummary(cat, items, false));
    });

    return summaries;
  }, [products]);

  // Subcategory breakdown summaries if a single category is isolated and breakdownSubcategories is toggled
  const singleCategorySubcategorySummaries: CategoryImbalanceSummary[] = useMemo(() => {
    if (selectedCategoryFilters.length !== 1 || !breakdownSubcategories) return [];

    const targetCat = selectedCategoryFilters[0];
    const targetProducts = products.filter((p) => (p.category?.trim() || 'Uncategorized') === targetCat);

    const subMap = new Map<string, Product[]>();
    targetProducts.forEach((p) => {
      const sub = p.subcategory?.trim() || 'General';
      if (!subMap.has(sub)) {
        subMap.set(sub, []);
      }
      subMap.get(sub)!.push(p);
    });

    const list: CategoryImbalanceSummary[] = [];
    subMap.forEach((items, subName) => {
      list.push(buildSummary(subName, items, true, targetCat));
    });

    return list;
  }, [selectedCategoryFilters, breakdownSubcategories, products]);

  // Selected & Filtered Category Summaries for display in D3 Heatmap
  const displayedCategories: CategoryImbalanceSummary[] = useMemo(() => {
    let list: CategoryImbalanceSummary[] = [];

    if (selectedCategoryFilters.length === 1 && breakdownSubcategories) {
      list = [...singleCategorySubcategorySummaries];
    } else if (selectedCategoryFilters.length > 0) {
      list = allCategorySummaries.filter((c) => selectedCategoryFilters.includes(c.category));
    } else {
      list = [...allCategorySummaries];
    }

    if (categorySearch.trim()) {
      const q = categorySearch.toLowerCase().trim();
      list = list.filter((c) => c.category.toLowerCase().includes(q));
    }

    if (imbalanceFilter === 'unbalanced_only') {
      list = list.filter((c) => c.imbalanceSeverity !== 'balanced');
    } else if (imbalanceFilter === 'stockout_only') {
      list = list.filter((c) => c.tierCounts.depleted > 0 || c.tierCounts.critical_low > 0);
    } else if (imbalanceFilter === 'overstock_only') {
      list = list.filter((c) => c.tierCounts.overstocked > 0);
    }

    list.sort((a, b) => {
      if (sortBy === 'imbalance') {
        return Math.abs(b.imbalanceScore) - Math.abs(a.imbalanceScore);
      }
      if (sortBy === 'stockout') {
        return (b.tierCounts.depleted * 2 + b.tierCounts.critical_low) - (a.tierCounts.depleted * 2 + a.tierCounts.critical_low);
      }
      if (sortBy === 'units') {
        return b.totalUnits - a.totalUnits;
      }
      if (sortBy === 'value') {
        return b.totalRetailValue - a.totalRetailValue;
      }
      return a.category.localeCompare(b.category);
    });

    return list;
  }, [
    allCategorySummaries,
    selectedCategoryFilters,
    breakdownSubcategories,
    singleCategorySubcategorySummaries,
    categorySearch,
    imbalanceFilter,
    sortBy
  ]);

  // Overall KPIs recalculated specifically for the active category filters
  const storeHealthMetrics = useMemo(() => {
    const sourceList = displayedCategories.length > 0 ? displayedCategories : allCategorySummaries;

    let totalItems = 0;
    let totalDepleted = 0;
    let totalCritical = 0;
    let totalOptimal = 0;
    let totalOverstocked = 0;
    let totalLockedCapital = 0;

    sourceList.forEach((c) => {
      totalItems += c.totalProducts;
      totalDepleted += c.tierCounts.depleted;
      totalCritical += c.tierCounts.critical_low;
      totalOptimal += c.tierCounts.adequate;
      totalOverstocked += c.tierCounts.overstocked;
      totalLockedCapital += c.tierValue.overstocked;
    });

    const safeTotal = totalItems || 1;
    const imbalanceIndex = Math.round(((totalDepleted + totalCritical + totalOverstocked) / safeTotal) * 100);
    const healthyRatio = Math.round((totalOptimal / safeTotal) * 100);

    return {
      displayedCategoryCount: displayedCategories.length,
      totalCatalogCategories: allCategorySummaries.length,
      isFiltered: selectedCategoryFilters.length > 0,
      totalItems,
      totalDepleted,
      totalCritical,
      totalOptimal,
      totalOverstocked,
      totalLockedCapital,
      imbalanceIndex,
      healthyRatio
    };
  }, [displayedCategories, allCategorySummaries, selectedCategoryFilters]);

  // Category filter handlers
  const handleToggleCategory = (catName: string) => {
    if (selectedCategoryFilters.includes(catName)) {
      const updated = selectedCategoryFilters.filter((c) => c !== catName);
      setSelectedCategoryFilters(updated);
      if (onCategoryChange) {
        onCategoryChange(updated.length === 1 ? updated[0] : 'All');
      }
      if (updated.length !== 1) {
        setBreakdownSubcategories(false);
      }
    } else {
      const updated = [...selectedCategoryFilters, catName];
      setSelectedCategoryFilters(updated);
      if (onCategoryChange) {
        onCategoryChange(updated.length === 1 ? updated[0] : 'All');
      }
    }
  };

  const handleSelectOnlyCategory = (catName: string) => {
    setSelectedCategoryFilters([catName]);
    if (onCategoryChange) {
      onCategoryChange(catName);
    }
  };

  const handleSelectAllCategories = () => {
    setSelectedCategoryFilters([]);
    setBreakdownSubcategories(false);
    if (onCategoryChange) {
      onCategoryChange('All');
    }
  };

  // D3 Heatmap SVG Rendering Engine
  useEffect(() => {
    if (!svgRef.current || displayedCategories.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Dimensions & responsive layout calculation
    const containerWidth = containerRef.current ? containerRef.current.clientWidth : 800;
    const width = Math.max(760, containerWidth - 32);

    // Dynamic row height: if user filtered to 1-3 categories, render taller cells for clear focus
    const rowHeight = displayedCategories.length <= 2 ? 60 : displayedCategories.length <= 5 ? 50 : 44;
    const margin = { top: 75, right: 180, bottom: 25, left: 200 };
    const chartHeight = displayedCategories.length * rowHeight;
    const height = chartHeight + margin.top + margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height);

    const chartWidth = width - margin.left - margin.right;
    const tiers = STOCK_TIERS.map((t) => t.id);

    // D3 Scales
    const xScale = d3.scaleBand<StockHealthTier>()
      .domain(tiers)
      .range([0, chartWidth])
      .padding(0.08);

    const yScale = d3.scaleBand<string>()
      .domain(displayedCategories.map((c) => c.category))
      .range([0, chartHeight])
      .padding(0.12);

    // Main Chart Group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Top X-Axis Header labels
    const headerGroup = svg.append('g')
      .attr('transform', `translate(${margin.left}, 0)`);

    STOCK_TIERS.forEach((tier) => {
      const xPos = (xScale(tier.id) ?? 0) + xScale.bandwidth() / 2;
      const th = headerGroup.append('g')
        .attr('transform', `translate(${xPos}, 20)`);

      // Colored status dot
      th.append('circle')
        .attr('cx', -35)
        .attr('cy', 8)
        .attr('r', 5)
        .attr('fill', tier.colorScheme.d3BaseColor);

      th.append('text')
        .attr('x', 0)
        .attr('y', 12)
        .attr('text-anchor', 'middle')
        .attr('fill', '#f1f5f9')
        .attr('font-size', '12px')
        .attr('font-weight', '700')
        .text(tier.label);

      th.append('text')
        .attr('x', 0)
        .attr('y', 27)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94a3b8')
        .attr('font-size', '10px')
        .attr('font-weight', '500')
        .text(tier.sublabel);

      th.append('text')
        .attr('x', 0)
        .attr('y', 40)
        .attr('text-anchor', 'middle')
        .attr('fill', tier.colorScheme.d3HighlightColor)
        .attr('font-size', '9px')
        .attr('font-weight', '600')
        .text(tier.shortDesc);
    });

    // Find maximum metric values across the filtered dataset for proportional intensity scales
    let maxMetricVal = 1;
    displayedCategories.forEach((cat) => {
      tiers.forEach((t) => {
        let val = 0;
        if (metric === 'item_count') val = cat.tierCounts[t];
        else if (metric === 'stock_units') val = cat.tierUnits[t];
        else if (metric === 'inventory_value') val = cat.tierValue[t];
        else if (metric === 'imbalance_risk') {
          val = t === 'depleted' ? cat.tierCounts.depleted * 2 : t === 'overstocked' ? cat.tierCounts.overstocked * 1.5 : cat.tierCounts[t];
        }
        if (val > maxMetricVal) maxMetricVal = val;
      });
    });

    // Draw Heatmap Rows & Background Tracks
    displayedCategories.forEach((catSummary) => {
      const yPos = yScale(catSummary.category) ?? 0;

      // Row background hover track
      g.append('rect')
        .attr('x', -margin.left + 10)
        .attr('y', yPos - 2)
        .attr('width', width - 20)
        .attr('height', yScale.bandwidth() + 4)
        .attr('rx', 8)
        .attr('fill', 'transparent')
        .attr('class', 'transition-colors hover:bg-slate-800/40 cursor-default');

      // Left Y-Axis Label: Category / Subcategory Name & Item Count
      const labelGroup = g.append('g')
        .attr('transform', `translate(-14, ${yPos + yScale.bandwidth() / 2})`)
        .style('cursor', 'pointer')
        .on('click', () => {
          if (catSummary.isSubcategory && catSummary.parentCategory) {
            if (onFilterCatalogCategory) onFilterCatalogCategory(catSummary.parentCategory);
          } else if (onFilterCatalogCategory) {
            onFilterCatalogCategory(catSummary.category);
          }
        });

      const maxChars = 22;
      const displayName = catSummary.category.length > maxChars
        ? catSummary.category.slice(0, maxChars) + '…'
        : catSummary.category;

      labelGroup.append('text')
        .attr('x', 0)
        .attr('y', -3)
        .attr('text-anchor', 'end')
        .attr('fill', catSummary.isSubcategory ? '#38bdf8' : '#f8fafc')
        .attr('font-size', '12px')
        .attr('font-weight', '700')
        .text(displayName)
        .append('title')
        .text(`${catSummary.isSubcategory ? `Subcategory: ${catSummary.category} (${catSummary.parentCategory})` : catSummary.category} · ${catSummary.totalProducts} items`);

      labelGroup.append('text')
        .attr('x', 0)
        .attr('y', 12)
        .attr('text-anchor', 'end')
        .attr('fill', '#64748b')
        .attr('font-size', '10px')
        .attr('font-family', 'ui-monospace, SFMono-Regular, monospace')
        .text(`${catSummary.totalProducts} items · ${catSummary.totalUnits} pcs`);

      // Right-side Imbalance Health Badge
      const rightGroup = g.append('g')
        .attr('transform', `translate(${chartWidth + 16}, ${yPos + yScale.bandwidth() / 2})`);

      let severityColor = '#10b981';
      let severityLabel = 'BALANCED';
      if (catSummary.imbalanceSeverity === 'severe_understock') {
        severityColor = '#f43f5e';
        severityLabel = 'DEPLETED RISK';
      } else if (catSummary.imbalanceSeverity === 'mild_understock') {
        severityColor = '#f59e0b';
        severityLabel = 'UNDERSTOCKED';
      } else if (catSummary.imbalanceSeverity === 'severe_overstock') {
        severityColor = '#a855f7';
        severityLabel = 'EXCESS SURPLUS';
      } else if (catSummary.imbalanceSeverity === 'mild_overstock') {
        severityColor = '#38bdf8';
        severityLabel = 'SLIGHT OVERSTOCK';
      }

      rightGroup.append('rect')
        .attr('x', 0)
        .attr('y', -10)
        .attr('width', 110)
        .attr('height', 20)
        .attr('rx', 6)
        .attr('fill', `${severityColor}22`)
        .attr('stroke', `${severityColor}66`)
        .attr('stroke-width', 1);

      rightGroup.append('text')
        .attr('x', 55)
        .attr('y', 3.5)
        .attr('text-anchor', 'middle')
        .attr('fill', severityColor)
        .attr('font-size', '9px')
        .attr('font-weight', '800')
        .attr('letter-spacing', '0.05em')
        .text(severityLabel);

      // Render Individual Heatmap Cells
      tiers.forEach((tierId) => {
        const xPos = xScale(tierId) ?? 0;
        const cellWidth = xScale.bandwidth();
        const cellHeight = yScale.bandwidth();

        const count = catSummary.tierCounts[tierId];
        const units = catSummary.tierUnits[tierId];
        const value = catSummary.tierValue[tierId];
        const pctOfCategory = catSummary.totalProducts > 0
          ? Math.round((count / catSummary.totalProducts) * 100)
          : 0;

        let metricVal = 0;
        if (metric === 'item_count') metricVal = count;
        else if (metric === 'stock_units') metricVal = units;
        else if (metric === 'inventory_value') metricVal = value;
        else if (metric === 'imbalance_risk') {
          metricVal = tierId === 'depleted' ? count * 2 : tierId === 'overstocked' ? count * 1.5 : count;
        }

        const tierInfo = STOCK_TIERS.find((t) => t.id === tierId)!;
        const intensity = metricVal > 0 ? Math.max(0.2, metricVal / maxMetricVal) : 0;

        const isSelected = selectedCell?.category === catSummary.category && selectedCell?.tier === tierId;

        const cellGroup = g.append('g')
          .attr('transform', `translate(${xPos}, ${yPos})`)
          .style('cursor', 'pointer');

        let fillColor = '#0f172a';
        let strokeColor = '#1e293b';

        if (count > 0) {
          const baseColor = d3.color(tierInfo.colorScheme.d3BaseColor);
          if (baseColor) {
            fillColor = d3.interpolateRgb('#1e293b', tierInfo.colorScheme.d3BaseColor)(Math.min(1, intensity * 0.95 + 0.15));
            strokeColor = tierInfo.colorScheme.d3HighlightColor;
          }
        }

        const rect = cellGroup.append('rect')
          .attr('width', cellWidth)
          .attr('height', cellHeight)
          .attr('rx', 7)
          .attr('fill', fillColor)
          .attr('stroke', isSelected ? '#ffffff' : count > 0 ? strokeColor : '#334155')
          .attr('stroke-width', isSelected ? 2.5 : count > 0 ? 1 : 0.5)
          .attr('stroke-opacity', count > 0 ? 0.7 : 0.3)
          .attr('class', 'transition-all duration-150');

        if (isSelected) {
          rect.attr('filter', 'drop-shadow(0px 0px 6px rgba(255,255,255,0.4))');
        }

        if (count > 0) {
          let primaryText = `${count}`;
          let secondaryText = `${pctOfCategory}%`;

          if (metric === 'stock_units') {
            primaryText = `${units}`;
            secondaryText = 'units';
          } else if (metric === 'inventory_value') {
            primaryText = `KSh ${Math.round(value).toLocaleString()}`;
            secondaryText = `${count} itm`;
          }

          cellGroup.append('text')
            .attr('x', cellWidth / 2)
            .attr('y', cellHeight / 2 - 2)
            .attr('text-anchor', 'middle')
            .attr('fill', '#ffffff')
            .attr('font-size', '12px')
            .attr('font-weight', '800')
            .attr('letter-spacing', '-0.02em')
            .text(primaryText);

          cellGroup.append('text')
            .attr('x', cellWidth / 2)
            .attr('y', cellHeight / 2 + 10)
            .attr('text-anchor', 'middle')
            .attr('fill', '#cbd5e1')
            .attr('font-size', '9px')
            .attr('font-weight', '600')
            .text(secondaryText);
        } else {
          cellGroup.append('text')
            .attr('x', cellWidth / 2)
            .attr('y', cellHeight / 2 + 3)
            .attr('text-anchor', 'middle')
            .attr('fill', '#475569')
            .attr('font-size', '12px')
            .text('—');
        }

        // Interactive mouse events
        cellGroup
          .on('mouseenter', (event: MouseEvent) => {
            rect.attr('stroke', '#ffffff')
              .attr('stroke-width', 2)
              .attr('stroke-opacity', 1);

            const bounds = containerRef.current?.getBoundingClientRect();
            const clientX = bounds ? event.clientX - bounds.left : event.clientX;
            const clientY = bounds ? event.clientY - bounds.top : event.clientY;

            setHoveredCell({
              category: catSummary.category,
              tier: tierId,
              count,
              units,
              value,
              pctOfCategory,
              x: clientX,
              y: clientY
            });
          })
          .on('mouseleave', () => {
            if (!isSelected) {
              rect.attr('stroke', count > 0 ? strokeColor : '#334155')
                .attr('stroke-width', count > 0 ? 1 : 0.5)
                .attr('stroke-opacity', count > 0 ? 0.7 : 0.3);
            }
            setHoveredCell(null);
          })
          .on('click', () => {
            if (selectedCell?.category === catSummary.category && selectedCell?.tier === tierId) {
              setSelectedCell(null);
            } else {
              setSelectedCell({
                category: catSummary.category,
                tier: tierId
              });
            }
          });
      });
    });
  }, [displayedCategories, metric, selectedCell, onFilterCatalogCategory]);

  // Selected cell products drill-down
  const drillDownData = useMemo(() => {
    if (!selectedCell) return null;
    const cat = displayedCategories.find((c) => c.category === selectedCell.category);
    if (!cat) return null;

    const tierInfo = STOCK_TIERS.find((t) => t.id === selectedCell.tier)!;
    const productsInTier = cat.tierProducts[selectedCell.tier] || [];

    return {
      category: cat,
      tier: tierInfo,
      products: productsInTier,
      totalCount: productsInTier.length,
      totalUnits: cat.tierUnits[selectedCell.tier],
      totalValuation: cat.tierValue[selectedCell.tier]
    };
  }, [selectedCell, displayedCategories]);

  return (
    <div className="space-y-6" ref={containerRef}>
      {/* 1. Header Banner & Executive Imbalance Metrics Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-32 bg-indigo-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-32 bg-rose-600/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-950/50">
                <Flame className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  Category Stock Density & Imbalance Heatmap
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-700/60 px-2 py-0.5 rounded-full">
                    D3 Visualization Engine
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pinpoint critical stockout risks, capital trapped in excess overstock, and distribution health across catalog categories.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex items-center gap-2">
            {onSwitchToStandard && (
              <button
                type="button"
                onClick={() => onSwitchToStandard(selectedCategoryFilters.length === 1 ? selectedCategoryFilters[0] : undefined)}
                className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Package className="w-4 h-4 text-sky-400" />
                <span>Standard Catalog</span>
              </button>
            )}
          </div>
        </div>

        {/* Imbalance KPI Matrix Cards (Filtered dynamically) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
          {/* Card 1: Catalog Imbalance Index */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                {storeHealthMetrics.isFiltered ? 'Filtered Imbalance Rate' : 'Catalog Imbalance Rate'}
              </span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-300 tracking-tight">
                {storeHealthMetrics.imbalanceIndex}%
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                of items skewed
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {storeHealthMetrics.totalDepleted + storeHealthMetrics.totalCritical} low stock vs {storeHealthMetrics.totalOverstocked} overstocked
            </p>
          </div>

          {/* Card 2: Stockout Hazard (Depleted items) */}
          <div className="bg-slate-950/80 border border-rose-900/30 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Stockout Risk Items</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-400 tracking-tight">
                {storeHealthMetrics.totalDepleted}
              </span>
              <span className="text-[10px] text-rose-300/80 font-medium">
                ({storeHealthMetrics.totalCritical} near empty)
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Immediate revenue loss on customer walkouts
            </p>
          </div>

          {/* Card 3: Capital Locked in Overstock */}
          <div className="bg-slate-950/80 border border-purple-900/30 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">Locked In Overstock</span>
              <DollarSign className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-purple-300 tracking-tight">
                ${storeHealthMetrics.totalLockedCapital.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] text-purple-300/80 font-medium">
                retail value
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {storeHealthMetrics.totalOverstocked} items with 5x+ excess safety inventory
            </p>
          </div>

          {/* Card 4: Healthy Balance Ratio */}
          <div className="bg-slate-950/80 border border-emerald-900/30 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Balanced Sweet Spot</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400 tracking-tight">
                {storeHealthMetrics.healthyRatio}%
              </span>
              <span className="text-[10px] text-emerald-300/80 font-medium">
                ({storeHealthMetrics.totalOptimal} items)
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Optimal buffer, zero deadstock hazard
            </p>
          </div>
        </div>
      </div>

      {/* 2. Interactive Category Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-950 flex items-center justify-center border border-indigo-800">
              <ListFilter className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                Filter Heatmap by Product Category
                {selectedCategoryFilters.length > 0 && (
                  <span className="text-[10px] font-extrabold text-indigo-300 bg-indigo-950 border border-indigo-700/60 px-2 py-0.5 rounded-full">
                    {selectedCategoryFilters.length} of {allCategoryNames.length} selected
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                Tap categories to toggle inclusion or isolate specific categories to inspect stock distribution.
              </p>
            </div>
          </div>

          {/* Bulk Selection Actions */}
          <div className="flex items-center gap-2 text-xs">
            {selectedCategoryFilters.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllCategories}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                <span>Show All Categories</span>
              </button>
            )}

            {/* Quick Dropdown Picker */}
            <select
              value={selectedCategoryFilters.length === 1 ? selectedCategoryFilters[0] : selectedCategoryFilters.length === 0 ? 'All' : 'custom'}
              onChange={(e) => {
                if (e.target.value === 'All') {
                  handleSelectAllCategories();
                } else if (e.target.value !== 'custom') {
                  handleSelectOnlyCategory(e.target.value);
                }
              }}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="All">All Categories ({allCategoryNames.length})</option>
              {selectedCategoryFilters.length > 1 && (
                <option value="custom">Multiple Selected ({selectedCategoryFilters.length})</option>
              )}
              {allCategoryNames.map((catName) => (
                <option key={catName} value={catName}>
                  {catName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Buttons Filter List */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* 'All Categories' Button */}
          <button
            type="button"
            onClick={handleSelectAllCategories}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              selectedCategoryFilters.length === 0
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Categories</span>
            <span className="text-[10px] font-mono opacity-80">({products.length})</span>
          </button>

          {/* Individual Category Filter Buttons */}
          {allCategoryNames.map((catName) => {
            const isSelected = selectedCategoryFilters.includes(catName);
            const catSummary = allCategorySummaries.find((c) => c.category === catName);
            const count = catSummary?.totalProducts || 0;

            // Health color dot
            let statusDot = 'bg-emerald-400';
            if (catSummary?.imbalanceSeverity === 'severe_understock') statusDot = 'bg-rose-500 animate-pulse';
            else if (catSummary?.imbalanceSeverity === 'mild_understock') statusDot = 'bg-amber-400';
            else if (catSummary?.imbalanceSeverity === 'severe_overstock') statusDot = 'bg-purple-400';
            else if (catSummary?.imbalanceSeverity === 'mild_overstock') statusDot = 'bg-sky-400';

            return (
              <div key={catName} className="inline-flex rounded-xl overflow-hidden group">
                <button
                  type="button"
                  onClick={() => handleToggleCategory(catName)}
                  className={`px-3 py-2 text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                  }`}
                  title={`Toggle "${catName}" in heatmap`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusDot}`} />
                  <span>{catName}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {count}
                  </span>
                  {isSelected && <Check className="w-3 h-3 text-indigo-200" />}
                </button>

                {/* "Only" button to quickly isolate this category */}
                <button
                  type="button"
                  onClick={() => handleSelectOnlyCategory(catName)}
                  className={`px-2 py-2 text-[10px] font-black uppercase tracking-wider transition cursor-pointer border-l ${
                    isSelected
                      ? 'bg-indigo-700 text-indigo-200 hover:bg-indigo-800 border-indigo-500'
                      : 'bg-slate-900 text-slate-500 hover:text-slate-200 border-slate-800'
                  }`}
                  title={`Show only "${catName}"`}
                >
                  Only
                </button>
              </div>
            );
          })}
        </div>

        {/* Subcategory Drill-Down Switcher (Active when a single category is isolated) */}
        {selectedCategoryFilters.length === 1 && (
          <div className="bg-slate-950/90 border border-indigo-900/50 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <FolderTree className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="text-xs font-bold text-white">
                  Break Down "{selectedCategoryFilters[0]}" by Subcategories
                </span>
                <p className="text-[11px] text-slate-400">
                  Render separate D3 density heatmap rows for each subcategory inside {selectedCategoryFilters[0]}.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBreakdownSubcategories(!breakdownSubcategories)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                breakdownSubcategories
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 ring-2 ring-sky-400'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>{breakdownSubcategories ? 'Subcategory Breakdown Active' : 'Enable Subcategory Breakdown'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Heatmap Display Settings & Metrics Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Metric Mode Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            Heatmap Metric:
          </span>
          <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setMetric('item_count')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                metric === 'item_count'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Item Count
            </button>
            <button
              type="button"
              onClick={() => setMetric('stock_units')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                metric === 'stock_units'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Stock Units (Qty)
            </button>
            <button
              type="button"
              onClick={() => setMetric('inventory_value')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                metric === 'inventory_value'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Valuation (KSh)
            </button>
            <button
              type="button"
              onClick={() => setMetric('imbalance_risk')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                metric === 'imbalance_risk'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Weighted stockout & deadstock risk intensity"
            >
              Risk Intensity
            </button>
          </div>
        </div>

        {/* Sort & Imbalance Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Category */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter names…"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-36 sm:w-44"
            />
            {categorySearch && (
              <button
                type="button"
                onClick={() => setCategorySearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Imbalance Filter */}
          <select
            value={imbalanceFilter}
            onChange={(e) => setImbalanceFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Statuses ({displayedCategories.length})</option>
            <option value="unbalanced_only">⚠️ Imbalanced Only</option>
            <option value="stockout_only">🔴 Stockout Risk</option>
            <option value="overstock_only">🟣 Excess Overstock</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="imbalance">Sort: Imbalance Severity</option>
            <option value="stockout">Sort: Depletion Risk</option>
            <option value="units">Sort: Total Units</option>
            <option value="value">Sort: Total Valuation</option>
            <option value="alphabetical">Sort: Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* 4. D3 SVG Heatmap Canvas Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-x-auto">
        {displayedCategories.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="font-bold text-sm text-slate-300">No categories matching current filters</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Try selecting different categories from the filter bar above.
            </p>
            <button
              type="button"
              onClick={handleSelectAllCategories}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-md"
            >
              Reset to All Categories
            </button>
          </div>
        ) : (
          <div className="min-w-[760px]">
            {/* Guide & Active Filter Indicator */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80 text-[11px] text-slate-400">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-400" />
                {selectedCategoryFilters.length > 0 ? (
                  <span>
                    Viewing {displayedCategories.length} {breakdownSubcategories ? 'subcategories in' : 'categories'}:{' '}
                    <strong className="text-white">
                      {selectedCategoryFilters.join(', ')}
                    </strong>
                  </span>
                ) : (
                  <span>Viewing all {displayedCategories.length} categories across store inventory</span>
                )}
              </span>
              <span className="text-[10px] text-slate-500">
                Tap cell to inspect items · Tap category name to jump to table
              </span>
            </div>

            {/* Rendered SVG */}
            <svg ref={svgRef} className="w-full select-none" />
          </div>
        )}

        {/* Hover Tooltip Overlay */}
        {hoveredCell && (
          <div
            className="pointer-events-none absolute z-50 bg-slate-950/95 border border-slate-700 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs w-64 transform -translate-x-1/2 -translate-y-full mb-3 transition-opacity"
            style={{
              left: `${hoveredCell.x}px`,
              top: `${hoveredCell.y}px`
            }}
          >
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
              <span className="font-extrabold text-white truncate max-w-[140px]">
                {hoveredCell.category}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                {STOCK_TIERS.find((t) => t.id === hoveredCell.tier)?.label}
              </span>
            </div>
            <div className="space-y-1 text-slate-300 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Products in this tier:</span>
                <span className="font-bold text-white font-mono">{hoveredCell.count} ({hoveredCell.pctOfCategory}% of segment)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total units available:</span>
                <span className="font-bold text-sky-400 font-mono">{hoveredCell.units} pcs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Inventory valuation:</span>
                <span className="font-bold text-emerald-400 font-mono">${hoveredCell.value.toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-indigo-300 font-semibold flex items-center gap-1">
              <span>👉 Click cell to inspect products</span>
            </div>
          </div>
        )}
      </div>

      {/* 5. Interactive Drill-Down Panel when a Cell or Category is Selected */}
      {drillDownData && (
        <div className="bg-slate-900 border-2 border-indigo-500/60 rounded-3xl p-6 shadow-2xl relative animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Inspecting Segment:
                </span>
                <span className="font-black text-white text-base">
                  {drillDownData.category.category}
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${drillDownData.tier.colorScheme.bg} ${drillDownData.tier.colorScheme.text} border ${drillDownData.tier.colorScheme.border}`}>
                  {drillDownData.tier.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {drillDownData.totalCount} products found in this stock tier ({drillDownData.totalUnits} physical units, ${drillDownData.totalValuation.toLocaleString()} retail valuation)
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onSwitchToStandard && (
                <button
                  type="button"
                  onClick={() => onSwitchToStandard(drillDownData.category.parentCategory || drillDownData.category.category)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Filter Catalog Table to "{drillDownData.category.category}"</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                title="Close drilldown panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Imbalance Diagnosis & Suggested Action Alert */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-700/60 flex items-center justify-center shrink-0 mt-0.5">
                <Activity className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-white">
                  Segment Health Diagnosis
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  {drillDownData.category.topRiskDescription}
                </p>
                <p className="text-xs text-amber-300/90 font-medium mt-0.5">
                  💡 Recommendation: {drillDownData.category.recommendedAction}
                </p>
              </div>
            </div>

            {selectedCell.tier === 'depleted' || selectedCell.tier === 'critical_low' ? (
              <span className="shrink-0 text-xs font-bold text-rose-400 bg-rose-950/80 border border-rose-800 px-3 py-1.5 rounded-xl">
                ⚠️ Reorder Priority
              </span>
            ) : selectedCell.tier === 'overstocked' ? (
              <span className="shrink-0 text-xs font-bold text-purple-400 bg-purple-950/80 border border-purple-800 px-3 py-1.5 rounded-xl">
                🏷️ Promo Recommended
              </span>
            ) : null}
          </div>

          {/* Table of Products in this Segment */}
          {drillDownData.products.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-medium">
              No products found in this stock tier for {drillDownData.category.category}.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-3">SKU / Barcode</th>
                    <th className="py-3 px-3 text-right">Selling Price</th>
                    <th className="py-3 px-3 text-center">Current Stock</th>
                    <th className="py-3 px-3 text-center">Min Alert</th>
                    <th className="py-3 px-3 text-right">Stock Valuation</th>
                    <th className="py-3 px-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-sans">
                  {drillDownData.products.map((p) => {
                    const qty = Number(p.stockQuantity ?? p.stock ?? 0);
                    const min = Number(p.minStockAlert || 5);
                    const val = qty * Number(p.sellingPrice || 0);

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2.5">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-8 h-8 rounded-lg object-cover bg-slate-950 border border-slate-800 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-100">{p.name}</div>
                            {p.subcategory && (
                              <div className="text-[10px] text-slate-500 font-normal">{p.subcategory}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                          {p.sku || p.barcode || '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-200">
                          ${Number(p.sellingPrice || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`font-mono font-black px-2 py-0.5 rounded text-xs ${
                              qty <= 0
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : qty <= min
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : qty > min * 5
                                ? 'bg-purple-950 text-purple-400 border border-purple-800'
                                : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            }`}
                          >
                            {qty} {p.unit || 'pcs'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-400">
                          {min}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                          ${val.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {onSelectProduct && (
                              <button
                                type="button"
                                onClick={() => onSelectProduct(p)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition"
                              >
                                Edit Stock
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. Inventory Imbalance Action Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Understocked / Out of Stock Action Box */}
        <div className="bg-slate-900 border border-rose-900/40 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-rose-950 flex items-center justify-center border border-rose-800">
              <TrendingDown className="w-4 h-4 text-rose-400" />
            </div>
            <h3 className="text-sm font-black text-rose-300">
              Action Plan: Replenish Stockout Deficits
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Categories with high red/amber density represent imminent lost revenues. Immediate action items:
          </p>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span>Prioritize purchase orders for suppliers connected to 0-stock products.</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span>Adjust minimum stock alert levels upward on fast-moving categories.</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span>Notify backorder customers via WhatsApp when inventory arrives.</span>
            </li>
          </ul>
        </div>

        {/* Overstocked Surplus Action Box */}
        <div className="bg-slate-900 border border-purple-900/40 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-purple-950 flex items-center justify-center border border-purple-800">
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-sm font-black text-purple-300">
              Action Plan: Liquidate Trapped Capital
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Categories with high purple density tie up retail working capital. Immediate action items:
          </p>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
              <span>Create discounted flash bundles in the Online Store & POS to stimulate velocity.</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
              <span>Broadcast WhatsApp marketing promotional deals to VIP and dormant customers.</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
              <span>Reduce future purchase order sizes until stock health tier normalizes to green.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
