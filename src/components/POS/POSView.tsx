import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Scan,
  QrCode,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  DollarSign,
  Smartphone,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Percent,
  Banknote,
  Tag,
  Coins,
  X,
  WifiOff,
  Wifi,
  UserPlus,
  LayoutGrid,
  List,
  ShieldCheck,
  Lock,
  Award,
  Calendar,
  Package,
  RotateCcw,
  Sparkles,
  Image as ImageIcon,
  Star,
  MoreVertical,
  Zap,
  Gem,
  AlertTriangle,
  TrendingUp,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Flame,
  Clock,
  SlidersHorizontal,
  Truck,
  ReceiptText,
  FileSpreadsheet,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { Product, CartItem, Customer, PaymentMethod, PaymentBreakdown, Transaction, User as Employee, BarcodeScanLog } from '../../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { AiReceiptScannerModal } from './AiReceiptScannerModal';
import { ReceiptModal } from './ReceiptModal';
import { MpesaPromptModal } from './MpesaPromptModal';
import { SmsDeliveryLogsModal } from './SmsDeliveryLogsModal';
import { KraTotComplianceCenter } from '../Reports/KraTotComplianceCenter';
import { isAutoSmsEnabled, setAutoSmsEnabled, sendTransactionSummarySms } from '../../utils/smsService';
import { computeProductsPerformance, ProductPerformanceInfo } from '../../utils/salesPerformance';
import { hasWorkerPermission } from '../../utils/permissions';
import { isContactPickerSupported, pickFromDevicePhonebook, parseContactFile } from '../../utils/phoneContacts';
import { useNetworkStatus } from '../../utils/offlineSync';
import { safeGetJSON, safeSetJSON, safeRemove } from '../../utils/safeStorage';
import { refreshFirestoreConnection } from '../../lib/firebase';
import { POSProductListRow, POSProductGridCard } from './POSProductItem';
import {
  useTransactionSettings,
  getActiveFirmPrefixes,
  formatDocumentNumberWithPrefix,
  getLast5SalePricesForProduct,
} from '../../utils/transactionSettings';

const SEARCH_RESULT_PAGE_SIZE = 25;
const ACTIVE_SALE_DRAFT_KEY = 'retail_pos_active_sale_draft';

interface ActiveSaleDraft {
  cart: CartItem[];
  selectedCustomer: Customer | null;
  selectedCartItemId: string | null;
  mobileTab: 'catalog' | 'cart';
  discountAmount: number;
  discountMode: 'fixed' | 'percentage';
  discountInputVal: string;
  saleMarkupAmount: number;
  saleMarkupInputVal: string;
  taxRate: number;
  saleNotes: string;
  saleDate: string;
  selectedSalesRepId: string;
  updatedAt: number;
}

interface POSViewProps {
  products: Product[];
  categories: any[];
  customers: Customer[];
  currentUser: Employee;
  allUsers?: Employee[];
  transactions?: Transaction[];
  onCompleteSale: (transaction: Transaction, updatedProducts: Product[], updatedCustomers: Customer[]) => void;
  onAddCustomer: (customer: Customer) => void;
  onRecordScanLog?: (log: BarcodeScanLog) => void;
  newSaleTrigger?: number;
  onNewSaleStarted?: () => void;
  onSaveProduct?: (product: Product) => void;
  onBatchImportProducts?: (products: Product[], replaceExisting: boolean) => void;
  inPhoneFrame?: boolean;
  onMobileSearchActiveChange?: (active: boolean) => void;
  onMobileCartOpenChange?: (isOpen: boolean) => void;
  onMobileCartSummaryChange?: (summary: {
    itemCount: number;
    subtotal: number;
    discountTotal: number;
    grandTotal: number;
    hasCartItems: boolean;
  }) => void;
  externalScanTrigger?: number;
  externalAiScanTrigger?: number;
  externalManualBarcodeRequest?: { code: string; nonce: number } | null;
  externalQuickDiscountRequest?: { mode: 'fixed' | 'percentage'; value: number; nonce: number } | null;
  externalClearDiscountTrigger?: number;
  storeName?: string;
  activeStoreId?: string;
  storeKraPin?: string;
  requirePinOnStartup?: boolean;
}

export const POSView: React.FC<POSViewProps> = ({
  products,
  categories,
  customers,
  currentUser,
  allUsers = [],
  transactions = [],
  onCompleteSale,
  onAddCustomer,
  onRecordScanLog,
  newSaleTrigger,
  onNewSaleStarted,
  onSaveProduct,
  onBatchImportProducts,
  inPhoneFrame = false,
  onMobileSearchActiveChange,
  onMobileCartOpenChange,
  onMobileCartSummaryChange,
  externalScanTrigger,
  externalAiScanTrigger,
  externalManualBarcodeRequest,
  externalQuickDiscountRequest,
  externalClearDiscountTrigger,
  storeName = 'Rofani POS',
  activeStoreId,
  storeKraPin,
  requirePinOnStartup = true,
}) => {
  const [txSettings] = useTransactionSettings(activeStoreId);
  const isNonAdminCashierLocked =
    currentUser.role !== 'Admin' && (requirePinOnStartup || currentUser.role === 'Cashier');
  const canViewCostAndProfit = !isNonAdminCashierLocked;

  const [kraTaxModeSetting, setKraTaxModeSetting] = useState<'none' | 'tot' | 'vat'>(() =>
    safeGetJSON<'none' | 'tot' | 'vat'>('rofani_settings_tax_mode', 'none')
  );
  useEffect(() => {
    const syncTaxMode = () => {
      setKraTaxModeSetting(safeGetJSON<'none' | 'tot' | 'vat'>('rofani_settings_tax_mode', 'none'));
    };
    window.addEventListener('rofani:transaction-settings-updated', syncTaxMode);
    window.addEventListener('storage', syncTaxMode);
    return () => {
      window.removeEventListener('rofani:transaction-settings-updated', syncTaxMode);
      window.removeEventListener('storage', syncTaxMode);
    };
  }, []);

  const customSettingsShopName = safeGetJSON<string>('rofani_settings_shop_name', '');
  const resolvedStoreName = (() => {
    const legacy = ['rofani electronics', 'rofani electronics & boutique', 'rofani electronics and boutique'];
    if (customSettingsShopName && !legacy.includes(customSettingsShopName.trim().toLowerCase()) && customSettingsShopName.trim().toLowerCase() !== 'rofani pos') {
      return customSettingsShopName.trim();
    }
    if (storeName && !legacy.includes(storeName.trim().toLowerCase())) {
      return storeName.trim();
    }
    return 'Rofani POS';
  })();
  // Network Connectivity Status
  const { isOnline } = useNetworkStatus();

  // Search & Filter State (Immediate input text + 200ms debounced catalog query)
  const [searchTerm, setSearchTerm] = useState(() =>
    safeGetJSON<string>('retail_pos_pos_search', '', (val) => typeof val === 'string')
  );
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>(searchTerm);

  useEffect(() => {
    if (searchTerm === '') {
      setDebouncedSearchTerm('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    safeSetJSON('retail_pos_pos_search', debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  const [selectedCategory, setSelectedCategory] = useState<string>(() =>
    safeGetJSON<string>('retail_pos_pos_category', 'All', (val) => typeof val === 'string')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_pos_category', selectedCategory);
  }, [selectedCategory]);

  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() =>
    safeGetJSON<'list' | 'grid'>('retail_pos_pos_view_mode', 'list', (val) => val === 'list' || val === 'grid')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_pos_view_mode', viewMode);
  }, [viewMode]);

  const [performanceFilter, setPerformanceFilter] = useState<'All' | 'high_sales_high_profit' | 'low_sales' | 'high_sales_low_profit' | 'low_sales_high_profit'>(() =>
    safeGetJSON('retail_pos_pos_perf_filter', 'All')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_pos_perf_filter', performanceFilter);
  }, [performanceFilter]);

  const initialSavedDraftRef = useRef<ActiveSaleDraft | null>(null);
  if (initialSavedDraftRef.current === null) {
    initialSavedDraftRef.current = safeGetJSON<ActiveSaleDraft | null>(
      ACTIVE_SALE_DRAFT_KEY,
      null,
      (val) => Boolean(val && typeof val === 'object' && Array.isArray(val.cart))
    ) || {
      cart: safeGetJSON<CartItem[]>('retail_pos_active_cart', [], (val) => Array.isArray(val)),
      selectedCustomer: safeGetJSON<Customer | null>('retail_pos_active_pos_customer', null, (val) => Boolean(val && val.id)),
      selectedCartItemId: null,
      mobileTab: safeGetJSON<'catalog' | 'cart'>('retail_pos_pos_mobile_tab', 'catalog', (val) => val === 'catalog' || val === 'cart'),
      discountAmount: safeGetJSON<number>('retail_pos_pos_discount_amount', 0, (val) => typeof val === 'number'),
      discountMode: safeGetJSON<'fixed' | 'percentage'>('retail_pos_pos_discount_mode', 'fixed', (val) => val === 'fixed' || val === 'percentage'),
      discountInputVal: safeGetJSON<string>('retail_pos_pos_discount_input', '', (val) => typeof val === 'string'),
      saleMarkupAmount: safeGetJSON<number>('retail_pos_pos_markup_amount', 0, (val) => typeof val === 'number'),
      saleMarkupInputVal: safeGetJSON<string>('retail_pos_pos_markup_input', '', (val) => typeof val === 'string'),
      taxRate: safeGetJSON<number>('retail_pos_pos_tax_rate', 0, (val) => typeof val === 'number'),
      saleNotes: safeGetJSON<string>('retail_pos_pos_sale_notes', '', (val) => typeof val === 'string'),
      saleDate: '',
      selectedSalesRepId: safeGetJSON<string>('retail_pos_pos_sales_rep_id', currentUser.id, (val) => typeof val === 'string'),
      updatedAt: Date.now(),
    };
  }

  // Mobile responsive view mode ('catalog' or 'cart') for effortless mobile POS operation
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>(() =>
    initialSavedDraftRef.current?.mobileTab === 'cart' ? 'cart' : 'catalog'
  );
  useEffect(() => {
    safeSetJSON('retail_pos_pos_mobile_tab', mobileTab);
  }, [mobileTab]);

  const [isKeyboardActive, setIsKeyboardActive] = useState<boolean>(false);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [visibleResultsLimit, setVisibleResultsLimit] = useState<number>(SEARCH_RESULT_PAGE_SIZE);
  const [phoneOverlayRoot, setPhoneOverlayRoot] = useState<HTMLElement | null>(null);
  const searchBarContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasAutoScrolledOnFocusRef = useRef<boolean>(false);
  const [showSalesInfo, setShowSalesInfo] = useState<boolean>(false);
  const [showRepModal, setShowRepModal] = useState<boolean>(false);
  const [showTopRightMenu, setShowTopRightMenu] = useState<boolean>(false);

  const isMobileSearchActive = isSearchFocused || searchTerm.trim().length > 0;

  useEffect(() => {
    onMobileSearchActiveChange?.(isMobileSearchActive);
  }, [isMobileSearchActive, onMobileSearchActiveChange]);

  useEffect(() => {
    return () => {
      onMobileSearchActiveChange?.(false);
    };
  }, [onMobileSearchActiveChange]);

  useLayoutEffect(() => {
    if (inPhoneFrame && typeof document !== 'undefined') {
      setPhoneOverlayRoot(document.getElementById('phone-frame-overlay-root'));
    } else {
      setPhoneOverlayRoot(null);
    }
  }, [inPhoneFrame]);

  // Trigger scrollIntoView only ONCE when the input first receives focus, and only if not already scrolled to the top
  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    setIsKeyboardActive(true);
    if (hasAutoScrolledOnFocusRef.current) return;
    hasAutoScrolledOnFocusRef.current = true;

    setTimeout(() => {
      const target = searchBarContainerRef.current;
      if (!target) return;

      let scrollParent: HTMLElement | null = target.parentElement;
      while (scrollParent) {
        const style = window.getComputedStyle(scrollParent);
        const canScrollY =
          (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
          scrollParent.scrollHeight > scrollParent.clientHeight;
        if (canScrollY) break;
        scrollParent = scrollParent.parentElement;
      }

      if (scrollParent) {
        if (scrollParent.scrollTop <= 12) return;
      } else if (window.scrollY <= 12) {
        return;
      }

      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleSearchBlur = () => {
    setIsKeyboardActive(false);
    setTimeout(() => {
      if (document.activeElement !== searchInputRef.current) {
        setIsSearchFocused(false);
        hasAutoScrolledOnFocusRef.current = false;
      }
    }, 140);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setIsSearchFocused(false);
    setIsKeyboardActive(false);
    hasAutoScrolledOnFocusRef.current = false;
    searchInputRef.current?.blur();
  };

  const [selectedSupplier, setSelectedSupplier] = useState<string>(() =>
    safeGetJSON<string>('retail_pos_pos_supplier', 'All', (val) => typeof val === 'string')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_pos_supplier', selectedSupplier);
  }, [selectedSupplier]);

  const [priceRange, setPriceRange] = useState<string>(() =>
    safeGetJSON<string>('retail_pos_pos_price_range', 'all', (val) => typeof val === 'string')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_pos_price_range', priceRange);
  }, [priceRange]);

  const [productAge, setProductAge] = useState<string>(() =>
    safeGetJSON<string>('retail_pos_pos_product_age', 'all', (val) => typeof val === 'string')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_pos_product_age', productAge);
  }, [productAge]);

  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const posItemListRef = useRef<HTMLDivElement>(null);

  const handleScrollPosListDown = () => {
    const el = posItemListRef.current;
    if (!el) return;
    el.scrollBy({ top: 380, behavior: 'smooth' });
  };

  const handleScrollPosListBottom = () => {
    const el = posItemListRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  const handleScrollPosListTop = () => {
    const el = posItemListRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const allSuppliers = React.useMemo(() => {
    const set = new Set<string>();
    (products || []).forEach((p) => {
      if (p.supplierName && p.supplierName.trim()) {
        set.add(p.supplierName.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const activeAdvancedCount =
    (selectedSupplier !== 'All' ? 1 : 0) +
    (priceRange !== 'all' ? 1 : 0) +
    (productAge !== 'all' ? 1 : 0);

  // Sales Velocity and Margin Performance Map
  const performanceMap = React.useMemo(() => {
    return computeProductsPerformance(products, transactions);
  }, [products, transactions]);

  // Performance Tally Counts
  const performanceCounts = React.useMemo(() => {
    let highSalesHighProfit = 0;
    let lowSales = 0;
    let highVolume = 0;
    let highMargin = 0;

    Object.values(performanceMap).forEach((p) => {
      if (p.tier === 'high_sales_high_profit') highSalesHighProfit++;
      if (p.tier === 'low_sales_low_profit' || p.tier === 'low_sales_high_profit') lowSales++;
      if (p.tier === 'high_sales_low_profit') highVolume++;
      if (p.tier === 'low_sales_high_profit') highMargin++;
    });

    return { highSalesHighProfit, lowSales, highVolume, highMargin };
  }, [performanceMap]);

  // Favorites Grid Visibility State - Persisted to LocalStorage
  const [showFavoritesGrid, setShowFavoritesGrid] = useState<boolean>(() =>
    safeGetJSON<boolean>('retail_pos_pos_show_favorites', true, (val) => typeof val === 'boolean')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_pos_show_favorites', showFavoritesGrid);
  }, [showFavoritesGrid]);

  // Aggregate item frequency and units sold from transactions
  const salesCountMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    (transactions || []).forEach((tx) => {
      (tx.items || []).forEach((item) => {
        const pId = item.product?.id;
        if (pId) {
          map[pId] = (map[pId] || 0) + (Number(item.quantity) || 1);
        }
      });
    });
    return map;
  }, [transactions]);

  // Top 10 Most Frequently Sold Items ("Favorites") for one-click selection
  const favoriteProducts = React.useMemo(() => {
    const sorted = [...products].sort((a, b) => {
      const soldA = salesCountMap[a.id] ?? (performanceMap[a.id]?.unitsSold ?? 0);
      const soldB = salesCountMap[b.id] ?? (performanceMap[b.id]?.unitsSold ?? 0);
      if (soldB !== soldA) return soldB - soldA;
      // In-stock items prioritized
      return (b.stockQuantity || 0) - (a.stockQuantity || 0);
    });

    return sorted.slice(0, 10);
  }, [products, salesCountMap, performanceMap]);

  const favoriteProductIds = React.useMemo(() => {
    return new Set(favoriteProducts.map((p) => p.id));
  }, [favoriteProducts]);

  // 5 Most Recently Created Products for faster access to new inventory
  const recentlyAddedProducts = React.useMemo(() => {
    const sorted = [...products].sort((a, b) => {
      // Prioritize createdAt timestamp
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (!isNaN(timeA) && !isNaN(timeB) && timeB !== timeA) {
        return timeB - timeA;
      }
      // If timestamps are equal or missing, check updatedAt
      const updatedA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const updatedB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      if (!isNaN(updatedA) && !isNaN(updatedB) && updatedB !== updatedA) {
        return updatedB - updatedA;
      }
      return b.id.localeCompare(a.id);
    });
    return sorted.slice(0, 5);
  }, [products]);

  const recentlyAddedProductIds = React.useMemo(() => {
    return new Set(recentlyAddedProducts.map((p) => p.id));
  }, [recentlyAddedProducts]);

  // Favorites Grid Section Selector: 'all' (Both Top 10 & Recently Added) vs 'top_selling' vs 'recently_added'
  const [favoritesSectionView, setFavoritesSectionView] = useState<'all' | 'top_selling' | 'recently_added'>(() =>
    safeGetJSON<'all' | 'top_selling' | 'recently_added'>('retail_pos_pos_fav_view', 'all', (val) =>
      ['all', 'top_selling', 'recently_added'].includes(val)
    )
  );
  useEffect(() => {
    safeSetJSON('retail_pos_pos_fav_view', favoritesSectionView);
  }, [favoritesSectionView]);

  // Cart State - Restored from unified active sale draft / localStorage so active order & custom prices survive sleep
  const [cart, setCart] = useState<CartItem[]>(() =>
    Array.isArray(initialSavedDraftRef.current?.cart) ? initialSavedDraftRef.current.cart : []
  );
  useEffect(() => {
    safeSetJSON('retail_pos_active_cart', cart);
  }, [cart]);

  // Selected item ID during sale for visual highlight & auditory cue
  const [selectedCartItemId, setSelectedCartItemId] = useState<string | null>(
    () => initialSavedDraftRef.current?.selectedCartItemId || null
  );

  // Subtle audio cue whenever an item is selected or added during sales
  const playItemSelectAudioCue = React.useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Subtle, crisp pleasant tap (sine wave glides 880Hz -> 1100Hz in 35ms)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.035);

        // Soft, non-intrusive volume (0.09 gain) with quick smooth decay
        gain.gain.setValueAtTime(0.09, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.075);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.075);
      }
    } catch (_) {
      // Audio playback suppressed if browser prevents autoplay
    }

    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(20);
      } catch (_) {}
    }
  }, []);

  // Sync selectedCartItemId if item is no longer in cart
  useEffect(() => {
    if (cart.length === 0) {
      setSelectedCartItemId(null);
    } else if (selectedCartItemId && !cart.some((item) => item.product.id === selectedCartItemId)) {
      setSelectedCartItemId(cart[cart.length - 1]?.product.id || null);
    }
  }, [cart, selectedCartItemId]);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(() => {
    const defaultCust = customers[0] || { id: 'cust-1', name: 'Walk-in Customer', phone: 'N/A', totalPurchases: 0, currentBalanceDue: 0 };
    const saved = initialSavedDraftRef.current?.selectedCustomer;
    if (saved && saved.id) {
      const fresh = customers.find((c) => c.id === saved.id);
      return fresh || saved;
    }
    return defaultCust;
  });
  useEffect(() => {
    safeSetJSON('retail_pos_active_pos_customer', selectedCustomer);
  }, [selectedCustomer]);

  const [discountAmount, setDiscountAmount] = useState<number>(
    () => initialSavedDraftRef.current?.discountAmount ?? 0
  );
  useEffect(() => {
    safeSetJSON('retail_pos_pos_discount_amount', discountAmount);
  }, [discountAmount]);

  const [discountMode, setDiscountMode] = useState<'fixed' | 'percentage'>(
    () => initialSavedDraftRef.current?.discountMode ?? 'fixed'
  );
  useEffect(() => {
    safeSetJSON('retail_pos_pos_discount_mode', discountMode);
  }, [discountMode]);

  const [discountInputVal, setDiscountInputVal] = useState<string>(
    () => initialSavedDraftRef.current?.discountInputVal ?? ''
  );
  useEffect(() => {
    safeSetJSON('retail_pos_pos_discount_input', discountInputVal);
  }, [discountInputVal]);

  const [saleMarkupInputVal, setSaleMarkupInputVal] = useState<string>(
    () => initialSavedDraftRef.current?.saleMarkupInputVal ?? ''
  );
  useEffect(() => {
    safeSetJSON('retail_pos_pos_markup_input', saleMarkupInputVal);
  }, [saleMarkupInputVal]);

  const [saleMarkupAmount, setSaleMarkupAmount] = useState<number>(
    () => initialSavedDraftRef.current?.saleMarkupAmount ?? 0
  );
  useEffect(() => {
    safeSetJSON('retail_pos_pos_markup_amount', saleMarkupAmount);
  }, [saleMarkupAmount]);

  const [taxRate, setTaxRate] = useState<number>(
    () => initialSavedDraftRef.current?.taxRate ?? 0
  );
  useEffect(() => {
    safeSetJSON('retail_pos_pos_tax_rate', taxRate);
  }, [taxRate]);

  // Item-Level Manual Discount State
  const [editingItemDiscountId, setEditingItemDiscountId] = useState<string | null>(null);
  const [itemDiscountMode, setItemDiscountMode] = useState<'fixed' | 'percentage'>('fixed');
  const [itemDiscountInputVal, setItemDiscountInputVal] = useState<string>('');

  // Admin Discount Authorization State ("Only admin can give discount")
  const adminUsers = allUsers.filter((u) => u.role === 'Admin');
  const [discountAuthorizedBy, setDiscountAuthorizedBy] = useState<string | null>(
    currentUser.role === 'Admin' ? `${currentUser.name} (Admin)` : null
  );
  const [showAdminDiscountAuthModal, setShowAdminDiscountAuthModal] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string>(adminUsers[0]?.id || '');
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [adminAuthError, setAdminAuthError] = useState<string>('');
  const [supervisorDiscountMode, setSupervisorDiscountMode] = useState<'fixed' | 'percentage'>('fixed');
  const [tempDiscountVal, setTempDiscountVal] = useState<number>(100);

  // Sales Representative Attributed to this Sale (defaults to current logged-in user)
  const [selectedSalesRepId, setSelectedSalesRepId] = useState<string>(
    () => initialSavedDraftRef.current?.selectedSalesRepId || currentUser.id
  );
  useEffect(() => {
    safeSetJSON('retail_pos_pos_sales_rep_id', selectedSalesRepId);
  }, [selectedSalesRepId]);

  const selectedSalesRep = (allUsers || []).find((u) => u.id === selectedSalesRepId) || currentUser;

  // Active Sales Rep Today's Commission Stats
  const todayStr = new Date().toISOString().slice(0, 10);
  const repTodayTx = transactions.filter(
    (tx) => (tx.salesRepId === selectedSalesRep.id || (!tx.salesRepId && (tx.cashierId === selectedSalesRep.id || tx.cashierName === selectedSalesRep.name))) &&
      tx.date.slice(0, 10) === todayStr
  );
  const repTodaySales = repTodayTx.reduce((sum, tx) => sum + tx.grandTotal, 0);

  // Helper to compute commission dynamically based on worker model
  const calculateWorkerCommission = (worker: Employee, saleAmount: number, itemsList: CartItem[]) => {
    const commType = worker.commissionType || 'percentage';

    if (commType === 'fixed_per_sale') {
      const fixed = worker.fixedCommissionPerSale || 50;
      const rate = saleAmount > 0 ? parseFloat(((fixed / saleAmount) * 100).toFixed(2)) : 0;
      return {
        amount: fixed,
        rate,
        modelDescription: `Fixed KSh ${fixed}/sale`
      };
    }

    if (commType === 'profit_share') {
      const profitRate = worker.profitShareRate || 15;
      let totalProfit = 0;
      itemsList.forEach((item) => {
        const itemProfit = ((item.unitPrice - item.discount) - (item.product.costPrice || 0)) * item.quantity;
        totalProfit += Math.max(0, itemProfit);
      });
      const amount = Math.round(totalProfit * (profitRate / 100));
      const rate = saleAmount > 0 ? parseFloat(((amount / saleAmount) * 100).toFixed(2)) : 0;
      return {
        amount,
        rate,
        modelDescription: `${profitRate}% Margin Profit Share`
      };
    }

    if (commType === 'tiered' && worker.commissionTiers && worker.commissionTiers.length > 0) {
      const projected = repTodaySales + saleAmount;
      let activeTier = worker.commissionTiers[0];
      for (const t of worker.commissionTiers) {
        if (projected >= t.minSales && (t.maxSales === undefined || projected <= t.maxSales)) {
          activeTier = t;
          break;
        }
      }
      if (projected > (worker.commissionTiers[worker.commissionTiers.length - 1].minSales || 0)) {
        activeTier = worker.commissionTiers[worker.commissionTiers.length - 1];
      }
      const rate = activeTier.rate;
      const amount = Math.round(saleAmount * (rate / 100));
      return {
        amount,
        rate,
        modelDescription: `Tiered (${rate}%)`
      };
    }

    // Default: percentage
    const rate = worker.commissionRate !== undefined ? worker.commissionRate : 5;
    const amount = Math.round(saleAmount * (rate / 100));
    return {
      amount,
      rate,
      modelDescription: `${rate}% Sales Volume`
    };
  };

  // Modals State
  const [showScanner, setShowScanner] = useState(false);
  const [showAiReceiptScanner, setShowAiReceiptScanner] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(() =>
    safeGetJSON<boolean>('retail_pos_pos_show_checkout', false, (val) => typeof val === 'boolean')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_pos_show_checkout', showCheckoutModal);
  }, [showCheckoutModal]);

  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showNewSaleConfirmModal, setShowNewSaleConfirmModal] = useState(false);
  const [posNotice, setPosNotice] = useState<{ message: string; type: 'success' | 'warning' | 'info' } | null>(null);

  // M-PESA STK Push Modal State
  const [showMpesaPromptModal, setShowMpesaPromptModal] = useState(false);
  const [mpesaPromptAmount, setMpesaPromptAmount] = useState<number>(0);
  const [mpesaActiveRowIndex, setMpesaActiveRowIndex] = useState<number | null>(null);
  const [isDirectMpesaCheckout, setIsDirectMpesaCheckout] = useState(false);

  // Automated Transaction Summary SMS State
  const [showSmsLogsModal, setShowSmsLogsModal] = useState(false);
  const [autoSmsSummary, setAutoSmsSummary] = useState(isAutoSmsEnabled());

  // KRA e-TIMS (Optional per Customer) & KRA TOT Compliance States
  const [isEtimsRequested, setIsEtimsRequested] = useState<boolean>(() => {
    try {
      const saved = safeGetJSON<any>('printAndTaxSettings', null);
      return saved?.defaultEtimsPolicy === 'always';
    } catch {
      return false;
    }
  });
  const [customerKraPin, setCustomerKraPin] = useState<string>('');
  const [showKraTotModal, setShowKraTotModal] = useState(false);

  // Extended Transaction Settings Checkout & Cart States
  const [last5RatesItemId, setLast5RatesItemId] = useState<string | null>(null);
  const [billingPartyName, setBillingPartyName] = useState<string>('');
  const [customerPoNumber, setCustomerPoNumber] = useState<string>('');
  const [customerPoDate, setCustomerPoDate] = useState<string>('');
  const [paymentDiscountAmount, setPaymentDiscountAmount] = useState<number>(0);
  const [linkedInvoiceRef, setLinkedInvoiceRef] = useState<string>('');
  const [dueDateInput, setDueDateInput] = useState<string>('');
  const [paymentTermsInput, setPaymentTermsInput] = useState<string>(
    () => txSettings.dueDatesPaymentTerms.defaultTerms || 'Net 15 Days'
  );
  const [transportMode, setTransportMode] = useState<string>(
    () => txSettings.transportationDetails.defaultMode || 'Boda Boda'
  );
  const [transportDriverName, setTransportDriverName] = useState<string>('');
  const [transportVehicleRef, setTransportVehicleRef] = useState<string>('');
  const [additionalChargeLabel, setAdditionalChargeLabel] = useState<string>(
    () => txSettings.additionalCharges.defaultLabel || 'Delivery / Packaging Fee'
  );
  const [additionalChargeAmount, setAdditionalChargeAmount] = useState<number>(
    () => txSettings.additionalCharges.defaultAmount || 0
  );
  const [additionalFieldsValues, setAdditionalFieldsValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setPaymentTermsInput(txSettings.dueDatesPaymentTerms.defaultTerms || 'Net 15 Days');
    if (txSettings.dueDatesPaymentTerms.enabled && txSettings.dueDatesPaymentTerms.defaultDueDays > 0 && !dueDateInput) {
      const d = new Date();
      d.setDate(d.getDate() + txSettings.dueDatesPaymentTerms.defaultDueDays);
      setDueDateInput(d.toISOString().slice(0, 10));
    }
    setTransportMode(txSettings.transportationDetails.defaultMode || 'Boda Boda');
    setAdditionalChargeLabel(txSettings.additionalCharges.defaultLabel || 'Delivery / Packaging Fee');
    setAdditionalChargeAmount(txSettings.additionalCharges.enabled ? (txSettings.additionalCharges.defaultAmount || 0) : 0);
  }, [
    txSettings.dueDatesPaymentTerms.enabled,
    txSettings.dueDatesPaymentTerms.defaultTerms,
    txSettings.dueDatesPaymentTerms.defaultDueDays,
    txSettings.transportationDetails.defaultMode,
    txSettings.additionalCharges.enabled,
    txSettings.additionalCharges.defaultLabel,
    txSettings.additionalCharges.defaultAmount,
  ]);

  // Add multiple items to cart (e.g. from AI vision scanner)
  const handleAddMultipleToCart = (itemsToAdd: { product: Product; quantity: number }[]) => {
    if (!itemsToAdd || itemsToAdd.length === 0) return;

    setCart((prev) => {
      let updated = [...prev];
      itemsToAdd.forEach(({ product, quantity }) => {
        const existingIdx = updated.findIndex((item) => item.product.id === product.id);
        if (existingIdx > -1) {
          const existing = updated[existingIdx];
          const newQty = Math.min(existing.quantity + quantity, product.stockQuantity);
          updated[existingIdx] = {
            ...existing,
            quantity: newQty,
            total: (existing.unitPrice - existing.discount) * newQty,
          };
        } else {
          const qty = Math.min(quantity, Math.max(1, product.stockQuantity));
          updated.push({
            product,
            quantity: qty,
            unitPrice: product.sellingPrice,
            discount: 0,
            total: product.sellingPrice * qty,
          });
        }
      });
      return updated;
    });

    if (itemsToAdd.length > 0) {
      setSelectedCartItemId(itemsToAdd[itemsToAdd.length - 1].product.id);
      playItemSelectAudioCue();
    }

    const totalQty = itemsToAdd.reduce((sum, item) => sum + item.quantity, 0);
    setPosNotice({
      type: 'success',
      message: `✨ AI identified & added ${totalQty} item(s) directly to the receipt!`,
    });
    setTimeout(() => setPosNotice(null), 3500);
  };

  // Handle adding a brand new product detected by AI Receipt Scanner
  const handleAddNewProductFromAiReceipt = (
    newProduct: Product,
    andAddToCart: boolean = true,
    quantity: number = 1
  ) => {
    const rawName = (newProduct.name || '').trim();
    const cleanName = (!rawName || /^scanned\s*item$/i.test(rawName) || /^unknown\s*product$/i.test(rawName))
      ? `${newProduct.category || 'General'} Item #${newProduct.sku?.slice(-4) || '101'}`
      : rawName;

    const rawDesc = (newProduct.description || '').trim();
    const cleanDesc = (!rawDesc || rawDesc.toLowerCase() === cleanName.toLowerCase())
      ? `${cleanName} (${newProduct.category || 'General'}). Added via AI scanner.`
      : rawDesc;

    const sanitizedProduct: Product = {
      ...newProduct,
      name: cleanName,
      description: cleanDesc,
      imageUrl: newProduct.imageUrl || '',
    };

    // 1. Save new product to store catalog & cloud sync
    if (onSaveProduct) {
      onSaveProduct(sanitizedProduct);
    }

    // 2. Add to sales receipt cart if requested
    if (andAddToCart) {
      handleAddMultipleToCart([{ product: sanitizedProduct, quantity }]);
    }

    setPosNotice({
      type: 'success',
      message: `✨ Added "${sanitizedProduct.name}" to store inventory${andAddToCart ? ' & sales receipt' : ''}!`,
    });
    setTimeout(() => setPosNotice(null), 3500);
  };

  // Handle batch adding multiple new products detected by AI Receipt Scanner
  const handleBatchAddNewProductsFromAiReceipt = (
    newItems: { product: Product; quantity: number }[],
    andAddToCart: boolean = true
  ) => {
    if (!newItems || newItems.length === 0) return;

    const sanitizedItems = newItems.map((item, idx) => {
      const p = item.product;
      const rawName = (p.name || '').trim();
      const cleanName = (!rawName || /^scanned\s*item$/i.test(rawName) || /^unknown\s*product$/i.test(rawName))
        ? `${p.category || 'General'} Item #${idx + 1}`
        : rawName;

      const rawDesc = (p.description || '').trim();
      const cleanDesc = (!rawDesc || rawDesc.toLowerCase() === cleanName.toLowerCase())
        ? `${cleanName} (${p.category || 'General'}). Added via AI scanner.`
        : rawDesc;

      return {
        quantity: item.quantity,
        product: {
          ...p,
          name: cleanName,
          description: cleanDesc,
          imageUrl: p.imageUrl || '',
        },
      };
    });

    const productsToSave = sanitizedItems.map((item) => item.product);
    if (onBatchImportProducts) {
      onBatchImportProducts(productsToSave, false);
    } else if (onSaveProduct) {
      productsToSave.forEach((p) => onSaveProduct(p));
    }

    if (andAddToCart) {
      handleAddMultipleToCart(sanitizedItems);
    }

    setPosNotice({
      type: 'success',
      message: `✨ Added ${sanitizedItems.length} new product(s) to store catalog${andAddToCart ? ' & sales receipt' : ''}!`,
    });
    setTimeout(() => setPosNotice(null), 3500);
  };

  // Core New Sale Action Execution
  const executeNewSale = () => {
    setCart([]);
    setSelectedCartItemId(null);
    setSelectedCustomer(customers[0] || { id: 'cust-1', name: 'Walk-in Customer', phone: 'N/A', totalPurchases: 0, currentBalanceDue: 0 });
    setDiscountAmount(0);
    setDiscountInputVal('');
    setDiscountMode('fixed');
    setEditingItemDiscountId(null);
    setItemDiscountInputVal('');
    if (currentUser.role !== 'Admin') {
      setDiscountAuthorizedBy(null);
    }
    setSearchTerm('');
    setIsSearchFocused(false);
    setSelectedCategory('All');
    setShowCheckoutModal(false);
    setShowMpesaPromptModal(false);
    setShowNewSaleConfirmModal(false);
    setPaymentEntries([{ method: txSettings.cashSaleByDefault ? 'cash' : (txSettings.defaultPaymentMethod || 'mpesa'), amount: 0, reference: '' }]);
    setSaleNotes('');
    setBillingPartyName('');
    setCustomerPoNumber('');
    setCustomerPoDate('');
    setPaymentDiscountAmount(0);
    setLinkedInvoiceRef('');
    setTransportDriverName('');
    setTransportVehicleRef('');
    setAdditionalFieldsValues({});
    setAdditionalChargeAmount(txSettings.additionalCharges.enabled ? (txSettings.additionalCharges.defaultAmount || 0) : 0);
    setLast5RatesItemId(null);
    setSaleDate(getLocalDateString());
    setMobileTab('catalog');
    safeRemove(ACTIVE_SALE_DRAFT_KEY);
    setPosNotice({ message: 'New sale initialized! Register is fresh and ready for items.', type: 'success' });
    setTimeout(() => {
      setPosNotice(null);
    }, 3500);
    if (onNewSaleStarted) {
      onNewSaleStarted();
    }
  };

  // Trigger New Sale with guard if cart already contains items
  const handleTriggerNewSale = () => {
    if (cart.length > 0) {
      setShowNewSaleConfirmModal(true);
    } else {
      executeNewSale();
    }
  };

  // Sync with external new sale trigger (from top header or sidebar)
  useEffect(() => {
    if (newSaleTrigger && newSaleTrigger > 0) {
      if (cart.length > 0) {
        setShowNewSaleConfirmModal(true);
      } else {
        executeNewSale();
      }
    }
  }, [newSaleTrigger]);

  // New Customer Form State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [custPhonebookNotice, setCustPhonebookNotice] = useState('');
  const posCustVcfInputRef = React.useRef<HTMLInputElement>(null);

  const handlePickPhoneContactForPOS = async () => {
    setCustPhonebookNotice('');
    if (isContactPickerSupported()) {
      try {
        const picked = await pickFromDevicePhonebook(false);
        if (picked.length > 0) {
          const c = picked[0];
          setNewCustName(c.name || '');
          if (c.phone && c.phone !== 'N/A') setNewCustPhone(c.phone);
          if (c.email) setNewCustEmail(c.email);
          setCustPhonebookNotice(`✨ Auto-filled ${c.name} from phone book!`);
          setTimeout(() => setCustPhonebookNotice(''), 4000);
        }
      } catch {
        setCustPhonebookNotice('📱 Select your phone contacts file (.vcf / .csv) to auto-fill.');
        posCustVcfInputRef.current?.click();
      }
    } else {
      setCustPhonebookNotice('📱 Select your phone contacts file (.vcf / .csv) to auto-fill.');
      posCustVcfInputRef.current?.click();
    }
  };

  const handlePOSVcfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseContactFile(text);
      if (parsed.length > 0) {
        const c = parsed[0];
        setNewCustName(c.name || '');
        if (c.phone && c.phone !== 'N/A') setNewCustPhone(c.phone);
        if (c.email) setNewCustEmail(c.email);
        setCustPhonebookNotice(`✨ Imported ${c.name} from contact card file!`);
        setTimeout(() => setCustPhonebookNotice(''), 4000);
      } else {
        setCustPhonebookNotice('No valid contact found in this file.');
      }
    };
    reader.readAsText(file);
    if (posCustVcfInputRef.current) posCustVcfInputRef.current.value = '';
  };

  // Payment Breakdown State for Partial Payments
  const [paymentEntries, setPaymentEntries] = useState<PaymentBreakdown[]>(() =>
    safeGetJSON<PaymentBreakdown[]>(
      'retail_pos_pos_payment_entries',
      [{ method: 'cash', amount: 0, reference: '' }],
      (val) => Array.isArray(val) && val.length > 0
    )
  );
  useEffect(() => {
    safeSetJSON('retail_pos_pos_payment_entries', paymentEntries);
  }, [paymentEntries]);

  useEffect(() => {
    if (cart.length === 0 && !showCheckoutModal) {
      const preferred: PaymentMethod = txSettings.cashSaleByDefault
        ? 'cash'
        : ((txSettings.defaultPaymentMethod as PaymentMethod) || 'mpesa');
      setPaymentEntries((prev) => {
        if (prev.length === 1 && prev[0].amount === 0 && prev[0].method !== preferred) {
          return [{ ...prev[0], method: preferred }];
        }
        return prev;
      });
    }
  }, [txSettings.cashSaleByDefault, txSettings.defaultPaymentMethod, cart.length, showCheckoutModal]);

  const [saleNotes, setSaleNotes] = useState<string>(
    () => initialSavedDraftRef.current?.saleNotes ?? ''
  );
  useEffect(() => {
    safeSetJSON('retail_pos_pos_sale_notes', saleNotes);
  }, [saleNotes]);

  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [saleDate, setSaleDate] = useState<string>(() => {
    const draftDate = initialSavedDraftRef.current?.saleDate;
    if (typeof draftDate === 'string' && draftDate.length === 10) return draftDate;
    return (
      safeGetJSON<string>(
        'retail_pos_pos_sale_date',
        getLocalDateString(),
        (val) => typeof val === 'string' && val.length === 10
      ) || getLocalDateString()
    );
  });
  useEffect(() => {
    safeSetJSON('retail_pos_pos_sale_date', saleDate);
  }, [saleDate]);

  // Unified Sale Draft Auto-Save & Visibility Change Recovery (prevents loss on mobile sleep/background)
  const cartRef = useRef<CartItem[]>(cart);
  cartRef.current = cart;

  const latestDraftRef = useRef<ActiveSaleDraft>({
    cart,
    selectedCustomer,
    selectedCartItemId,
    mobileTab,
    discountAmount,
    discountMode,
    discountInputVal,
    saleMarkupAmount,
    saleMarkupInputVal,
    taxRate,
    saleNotes,
    saleDate,
    selectedSalesRepId,
    updatedAt: Date.now(),
  });
  latestDraftRef.current = {
    cart,
    selectedCustomer,
    selectedCartItemId,
    mobileTab,
    discountAmount,
    discountMode,
    discountInputVal,
    saleMarkupAmount,
    saleMarkupInputVal,
    taxRate,
    saleNotes,
    saleDate,
    selectedSalesRepId,
    updatedAt: Date.now(),
  };

  // Persist unified draft immediately whenever any cart item, custom price, customer, or active tab state changes
  useEffect(() => {
    safeSetJSON(ACTIVE_SALE_DRAFT_KEY, {
      cart,
      selectedCustomer,
      selectedCartItemId,
      mobileTab,
      discountAmount,
      discountMode,
      discountInputVal,
      saleMarkupAmount,
      saleMarkupInputVal,
      taxRate,
      saleNotes,
      saleDate,
      selectedSalesRepId,
      updatedAt: Date.now(),
    } satisfies ActiveSaleDraft);
  }, [
    cart,
    selectedCustomer,
    selectedCartItemId,
    mobileTab,
    discountAmount,
    discountMode,
    discountInputVal,
    saleMarkupAmount,
    saleMarkupInputVal,
    taxRate,
    saleNotes,
    saleDate,
    selectedSalesRepId,
  ]);

  // Flush unsaved draft on sleep/background (`visibilityState === 'hidden'`) & refresh Firestore on wake (`visible`)
  useEffect(() => {
    const flushActiveDraftToStorage = () => {
      try {
        const snapshot = {
          ...latestDraftRef.current,
          updatedAt: Date.now(),
        };
        safeSetJSON(ACTIVE_SALE_DRAFT_KEY, snapshot);
        safeSetJSON('retail_pos_active_cart', snapshot.cart);
        safeSetJSON('retail_pos_active_pos_customer', snapshot.selectedCustomer);
        safeSetJSON('retail_pos_pos_mobile_tab', snapshot.mobileTab);
      } catch {}
    };

    const handlePosVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushActiveDraftToStorage();
      } else if (document.visibilityState === 'visible') {
        // Guard: if browser somehow suspended and dropped in-memory cart while saved draft exists, restore without wiping
        if (cartRef.current.length === 0) {
          const savedDraft = safeGetJSON<ActiveSaleDraft | null>(
            ACTIVE_SALE_DRAFT_KEY,
            null,
            (val) => Boolean(val && Array.isArray(val.cart) && val.cart.length > 0)
          );
          if (savedDraft && savedDraft.cart.length > 0) {
            setCart(savedDraft.cart);
            if (savedDraft.selectedCustomer) {
              setSelectedCustomer(savedDraft.selectedCustomer);
            }
            if (savedDraft.mobileTab) {
              setMobileTab(savedDraft.mobileTab);
            }
          }
        }
        // Silently wake Firestore network channel without touching local cart state
        refreshFirestoreConnection().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handlePosVisibilityChange);
    window.addEventListener('pagehide', flushActiveDraftToStorage);
    return () => {
      document.removeEventListener('visibilitychange', handlePosVisibilityChange);
      window.removeEventListener('pagehide', flushActiveDraftToStorage);
    };
  }, []);

  const mainDateInputRef = useRef<HTMLInputElement>(null);
  const modalDateInputRef = useRef<HTMLInputElement>(null);

  const handleSetToday = () => {
    setSaleDate(getLocalDateString());
  };

  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSaleDate(getLocalDateString(d));
  };

  const buildFinalTxDate = (dateVal: string): { isoDate: string; timestamp: number } => {
    const now = new Date();
    if (!dateVal || !dateVal.trim()) {
      return { isoDate: now.toISOString(), timestamp: now.getTime() };
    }
    const clean = dateVal.trim();
    // Format: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const [y, m, d] = clean.split('-').map(Number);
      const target = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
      return { isoDate: target.toISOString(), timestamp: target.getTime() };
    }
    // Format: YYYY-MM-DDTHH:mm
    if (clean.includes('T')) {
      const target = new Date(clean);
      if (!isNaN(target.getTime())) {
        return { isoDate: target.toISOString(), timestamp: target.getTime() };
      }
    }
    const target = new Date(clean);
    if (!isNaN(target.getTime())) {
      return { isoDate: target.toISOString(), timestamp: target.getTime() };
    }
    return { isoDate: now.toISOString(), timestamp: now.getTime() };
  };

  // Consolidate categories from categories prop and all unique categories in products
  const allCategoryNames = React.useMemo(() => {
    const namesSet = new Set<string>();
    (categories || []).forEach((c) => {
      if (c.name) namesSet.add(c.name.trim());
    });
    (products || []).forEach((p) => {
      if (p.category) namesSet.add(p.category.trim());
    });
    return Array.from(namesSet).sort((a, b) => a.localeCompare(b));
  }, [categories, products]);

  // Reset pagination cap to top 25 whenever search query or catalog filters change
  useEffect(() => {
    setVisibleResultsLimit(SEARCH_RESULT_PAGE_SIZE);
  }, [debouncedSearchTerm, selectedCategory, selectedSupplier, priceRange, productAge, performanceFilter]);

  // Memoized Filtered Products using 200ms debounced search query
  const filteredProducts = React.useMemo(() => {
    const normalizedQuery = debouncedSearchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !normalizedQuery ||
        p.name.toLowerCase().includes(normalizedQuery) ||
        p.sku.toLowerCase().includes(normalizedQuery) ||
        p.barcode.toLowerCase().includes(normalizedQuery) ||
        p.category.toLowerCase().includes(normalizedQuery) ||
        (p.supplierName && p.supplierName.toLowerCase().includes(normalizedQuery));

      const matchesCat =
        selectedCategory === 'All'
          ? true
          : selectedCategory === 'Favorites'
          ? favoriteProductIds.has(p.id)
          : selectedCategory === 'Recently Added'
          ? recentlyAddedProductIds.has(p.id)
          : p.category === selectedCategory;

      const matchesSupplier =
        selectedSupplier === 'All' || (p.supplierName && p.supplierName.trim() === selectedSupplier.trim());

      let matchesPrice = true;
      if (priceRange === 'under_500') matchesPrice = p.sellingPrice < 500;
      else if (priceRange === '500_2000') matchesPrice = p.sellingPrice >= 500 && p.sellingPrice <= 2000;
      else if (priceRange === '2000_10000') matchesPrice = p.sellingPrice > 2000 && p.sellingPrice <= 10000;
      else if (priceRange === 'over_10000') matchesPrice = p.sellingPrice > 10000;

      let matchesAge = true;
      if (productAge !== 'all' && p.createdAt) {
        const createdTime = new Date(p.createdAt).getTime();
        const diffMs = Date.now() - createdTime;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (productAge === 'today') matchesAge = diffDays <= 1;
        else if (productAge === '7_days') matchesAge = diffDays <= 7;
        else if (productAge === '30_days') matchesAge = diffDays <= 30;
        else if (productAge === '90_days') matchesAge = diffDays <= 90;
        else if (productAge === 'older_90') matchesAge = diffDays > 90;
      }

      let matchesPerf = true;
      const perf = performanceMap[p.id];
      if (performanceFilter === 'high_sales_high_profit') {
        matchesPerf = perf?.tier === 'high_sales_high_profit';
      } else if (performanceFilter === 'low_sales') {
        matchesPerf = perf?.tier === 'low_sales_low_profit' || perf?.tier === 'low_sales_high_profit';
      } else if (performanceFilter === 'high_sales_low_profit') {
        matchesPerf = perf?.tier === 'high_sales_low_profit';
      } else if (performanceFilter === 'low_sales_high_profit') {
        matchesPerf = perf?.tier === 'low_sales_high_profit';
      }

      return matchesSearch && matchesCat && matchesSupplier && matchesPrice && matchesAge && matchesPerf;
    });
  }, [
    products,
    debouncedSearchTerm,
    selectedCategory,
    favoriteProductIds,
    recentlyAddedProductIds,
    selectedSupplier,
    priceRange,
    productAge,
    performanceFilter,
    performanceMap,
  ]);

  // Cap rendered DOM nodes to top 25 items (+ Show more) for instant mobile rendering
  const visibleProducts = React.useMemo(
    () => filteredProducts.slice(0, visibleResultsLimit),
    [filteredProducts, visibleResultsLimit]
  );

  // O(1) lookup map so React.memo product rows only re-render when their own quantity changes
  const cartQtyMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cart) {
      map.set(item.product.id, item.quantity);
    }
    return map;
  }, [cart]);

  // Add Item to Cart (stable callback identity so React.memo rows skip re-renders while typing)
  const handleAddToCart = React.useCallback(
    (product: Product) => {
      if (product.stockQuantity <= 0) {
        setPosNotice({
          type: 'info',
          message: `Out of stock: ${product.name} currently has 0 items available.`,
        });
        return;
      }

      setSelectedCartItemId(product.id);
      playItemSelectAudioCue();

      setCart((prev) => {
        const existingIndex = prev.findIndex((item) => item.product.id === product.id);
        if (existingIndex > -1) {
          const existing = prev[existingIndex];
          if (existing.quantity >= product.stockQuantity) {
            setPosNotice({
              type: 'info',
              message: `Stock limit reached: Only ${product.stockQuantity} ${product.unit} available for ${product.name}.`,
            });
            return prev;
          }
          const updated = [...prev];
          const newQty = existing.quantity + 1;
          updated[existingIndex] = {
            ...existing,
            quantity: newQty,
            total: (existing.unitPrice - existing.discount) * newQty,
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              product,
              quantity: 1,
              unitPrice: product.sellingPrice,
              discount: 0,
              total: product.sellingPrice,
            },
          ];
        }
      });
    },
    [playItemSelectAudioCue]
  );

  // Barcode Scanned Handler with smart normalization (trim, leading zeros, UPC/EAN, and QR audit links)
  const handleBarcodeScan = (barcodeRaw: string) => {
    let barcode = (barcodeRaw || '').trim();
    if (!barcode) return;

    if (barcode.includes('itemAudit=')) {
      try {
        const urlObj = new URL(barcode, window.location.origin);
        const auditParam = urlObj.searchParams.get('itemAudit');
        if (auditParam) barcode = auditParam;
      } catch (_) {}
    }

    const norm = (s?: string) => (s || '').trim().toLowerCase();
    const strip0 = (s?: string) => norm(s).replace(/^0+/, '');

    const found = products.find((p) => {
      const pId = norm(p.id);
      const pCode = norm(p.barcode);
      const pSku = norm(p.sku);
      const bCode = norm(barcode);
      if (pId === bCode || pCode === bCode || pSku === bCode) return true;
      if (strip0(pCode) && strip0(pCode) === strip0(bCode)) return true;
      if (pCode.length === 12 && '0' + pCode === bCode) return true;
      if (bCode.length === 12 && '0' + bCode === pCode) return true;
      return false;
    });

    if (onRecordScanLog) {
      onRecordScanLog({
        id: `scan-pos-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        barcode,
        productId: found?.id,
        productName: found ? found.name : `Unregistered Barcode (${barcode})`,
        category: found?.category || 'General',
        sku: found?.sku,
        sellingPrice: found?.sellingPrice,
        costPrice: found?.costPrice,
        stockQuantity: found?.stockQuantity,
        imageUrl: found?.imageUrl,
        scannedAt: new Date().toISOString(),
        userId: (selectedSalesRep || currentUser).id,
        userName: (selectedSalesRep || currentUser).name,
        userRole: (selectedSalesRep || currentUser).role,
        scanLocation: 'pos',
        deviceType: 'camera',
        actionTaken: found ? 'added_to_cart' : 'lookup_failed',
        notes: found ? `Scanned at POS checkout: added to cart` : `Barcode not found in catalog`,
      });
    }

    if (found) {
      handleAddToCart(found);
      setPosNotice({
        type: 'success',
        message: `Added "${found.name}" (KSh ${found.sellingPrice.toLocaleString()}) to cart!`
      });
      setTimeout(() => setPosNotice(null), 3500);
    } else {
      setPosNotice({
        type: 'info',
        message: `Scanned code "${barcode}" is not registered in your catalog.`
      });
      setTimeout(() => setPosNotice(null), 4000);
    }
  };

  // Quick Enter key handler in search input: auto-adds if exact barcode/SKU or single match (bypasses 200ms debounce for barcode guns)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmed = e.currentTarget.value.trim().toLowerCase();
      if (!trimmed) return;

      const exactMatch = products.find(
        (p) => p.barcode.toLowerCase() === trimmed || p.sku.toLowerCase() === trimmed
      );
      if (exactMatch) {
        handleAddToCart(exactMatch);
        setSearchTerm('');
        setDebouncedSearchTerm('');
        return;
      }

      const instantMatches = products.filter(
        (p) =>
          p.name.toLowerCase().includes(trimmed) ||
          p.sku.toLowerCase().includes(trimmed) ||
          p.barcode.toLowerCase().includes(trimmed)
      );
      if (instantMatches.length === 1) {
        handleAddToCart(instantMatches[0]);
        setSearchTerm('');
        setDebouncedSearchTerm('');
      }
    }
  };

  // Cart Qty updates
  const updateCartQty = (productId: string, delta: number) => {
    setSelectedCartItemId(productId);
    playItemSelectAudioCue();
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.stockQuantity) {
              setPosNotice({
                type: 'info',
                message: `Stock limit reached: Only ${item.product.stockQuantity} available for this item.`
              });
              return item;
            }
            if (newQty <= 0) return null; // remove
            return {
              ...item,
              quantity: newQty,
              total: (item.unitPrice - item.discount) * newQty
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    if (editingItemDiscountId === productId) {
      setEditingItemDiscountId(null);
    }
    if (selectedCartItemId === productId) {
      setSelectedCartItemId(null);
    }
  };

  // Item-level manual discount updater
  const handleUpdateItemDiscount = (productId: string, discountPerUnit: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const safeDiscount = Math.max(0, Math.min(item.unitPrice, discountPerUnit));
          return {
            ...item,
            discount: safeDiscount,
            total: (item.unitPrice - safeDiscount) * item.quantity,
          };
        }
        return item;
      })
    );
  };

  // Item-level manual custom unit price override (supports higher/negotiated prices or markdowns)
  const handleUpdateItemUnitPrice = (productId: string, newUnitPrice: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const safePrice = Math.max(0, newUnitPrice);
          const safeDiscount = Math.min(safePrice, item.discount);
          return {
            ...item,
            unitPrice: safePrice,
            discount: safeDiscount,
            total: (safePrice - safeDiscount) * item.quantity,
          };
        }
        return item;
      })
    );
  };

  // Item-level custom fields updaters (Free Qty, Count, Tax Mode)
  const handleUpdateItemMeta = (
    productId: string,
    patch: Partial<Pick<CartItem, 'freeQuantity' | 'customCount' | 'taxModeOnRate'>>
  ) => {
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, ...patch } : item))
    );
  };

  // Calculate Subtotals & Totals
  const grossSubtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const itemDiscountsTotal = cart.reduce((sum, item) => sum + (item.discount || 0) * item.quantity, 0);
  const itemsSubtotal = cart.reduce((sum, item) => sum + item.total, 0);

  // Compute sale-level manual or percentage discount (when Transaction wise Discount is enabled)
  let numDiscount = 0;
  const parsedSaleInput = parseFloat(discountInputVal);
  if (!isNaN(parsedSaleInput) && parsedSaleInput > 0) {
    if (discountMode === 'percentage') {
      numDiscount = Math.round((parsedSaleInput / 100) * itemsSubtotal);
    } else {
      numDiscount = Math.min(itemsSubtotal, parsedSaleInput);
    }
  } else if (discountAmount > 0 && !discountInputVal) {
    numDiscount = Math.min(itemsSubtotal, discountAmount);
  }

  const totalDiscount = itemDiscountsTotal + numDiscount;
  const subtotal = grossSubtotal; // Gross subtotal
  const afterDiscountAmount = Math.max(0, itemsSubtotal - numDiscount);

  const activeAdditionalCharge =
    txSettings.additionalCharges.enabled ? Math.max(0, Number(additionalChargeAmount) || 0) : 0;
  const activePaymentDiscount =
    txSettings.discountDuringPayment ? Math.max(0, Number(paymentDiscountAmount) || 0) : 0;

  // Transaction-wise Tax & Exclusive Line Tax Math
  const exclusiveVatAddOn =
    txSettings.enableTransactionWiseTax && kraTaxModeSetting === 'vat'
      ? cart.reduce((sum, item) => {
          if (txSettings.allowTaxInclusiveExclusiveOnRate && item.taxModeOnRate === 'exclusive') {
            return sum + item.total * 0.16;
          }
          return sum;
        }, 0)
      : 0;

  const baseTxRate = txSettings.enableTransactionWiseTax
    ? (taxRate > 0 ? taxRate : 0)
    : 0;
  const taxTotal = Math.max(0, afterDiscountAmount * (baseTxRate / 100) + exclusiveVatAddOn);

  const rawGrandTotal = Math.max(
    0,
    afterDiscountAmount + taxTotal + activeAdditionalCharge - activePaymentDiscount
  );
  const grandTotal = txSettings.roundOffTransactionAmount
    ? Math.round(rawGrandTotal)
    : rawGrandTotal;
  const roundOffAmount = Number((grandTotal - rawGrandTotal).toFixed(2));

  // Owner-only live profit estimation (hidden for non-Admin Cashiers when PIN lock active)
  const cartCostTotal = cart.reduce(
    (sum, item) =>
      sum + (Number(item.product.costPrice) || 0) * (item.quantity + (item.freeQuantity || 0)),
    0
  );
  const estimatedCartProfit = Number(
    (afterDiscountAmount - activePaymentDiscount - cartCostTotal).toFixed(2)
  );
  const estimatedProfitMarginPct =
    afterDiscountAmount > 0 ? Math.round((estimatedCartProfit / afterDiscountAmount) * 100) : 0;

  const isAnyCheckoutSheetOpen = mobileTab === 'cart' || showCheckoutModal || showMpesaPromptModal;

  useEffect(() => {
    onMobileCartOpenChange?.(isAnyCheckoutSheetOpen);
  }, [isAnyCheckoutSheetOpen, onMobileCartOpenChange]);

  useEffect(() => {
    return () => {
      onMobileCartOpenChange?.(false);
    };
  }, [onMobileCartOpenChange]);

  useEffect(() => {
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    onMobileCartSummaryChange?.({
      itemCount,
      subtotal: itemsSubtotal,
      discountTotal: totalDiscount,
      grandTotal,
      hasCartItems: cart.length > 0,
    });
  }, [cart, itemsSubtotal, totalDiscount, grandTotal, onMobileCartSummaryChange]);

  const handledScanNonceRef = useRef<number>(0);
  useEffect(() => {
    if (externalScanTrigger && externalScanTrigger !== handledScanNonceRef.current) {
      handledScanNonceRef.current = externalScanTrigger;
      setShowScanner(true);
    }
  }, [externalScanTrigger]);

  const handledAiScanNonceRef = useRef<number>(0);
  useEffect(() => {
    if (externalAiScanTrigger && externalAiScanTrigger !== handledAiScanNonceRef.current) {
      handledAiScanNonceRef.current = externalAiScanTrigger;
      setShowAiReceiptScanner(true);
    }
  }, [externalAiScanTrigger]);

  const handledManualBarcodeNonceRef = useRef<number>(0);
  useEffect(() => {
    if (
      externalManualBarcodeRequest &&
      externalManualBarcodeRequest.code &&
      externalManualBarcodeRequest.nonce !== handledManualBarcodeNonceRef.current
    ) {
      handledManualBarcodeNonceRef.current = externalManualBarcodeRequest.nonce;
      handleBarcodeScan(externalManualBarcodeRequest.code);
    }
  }, [externalManualBarcodeRequest]);

  const handledDiscountNonceRef = useRef<number>(0);
  useEffect(() => {
    if (
      externalQuickDiscountRequest &&
      externalQuickDiscountRequest.nonce !== handledDiscountNonceRef.current
    ) {
      handledDiscountNonceRef.current = externalQuickDiscountRequest.nonce;
      const { mode, value } = externalQuickDiscountRequest;
      if (hasWorkerPermission(currentUser, 'canGiveDiscounts')) {
        setDiscountMode(mode);
        setDiscountInputVal(String(value));
        const computed =
          mode === 'percentage'
            ? Math.round((Math.min(100, value) / 100) * itemsSubtotal)
            : Math.min(itemsSubtotal, value);
        setDiscountAmount(computed);
        setPosNotice({
          type: 'success',
          message:
            mode === 'percentage'
              ? `Quick Discount applied: ${value}% off (KSh ${computed.toLocaleString()})`
              : `Quick Discount applied: -KSh ${computed.toLocaleString()}`,
        });
        setTimeout(() => setPosNotice(null), 3500);
      } else {
        setSupervisorDiscountMode(mode);
        setTempDiscountVal(value);
        setAdminPinInput('');
        setAdminAuthError('');
        setShowAdminDiscountAuthModal(true);
      }
    }
  }, [externalQuickDiscountRequest, currentUser, itemsSubtotal]);

  const handledClearDiscountNonceRef = useRef<number>(0);
  useEffect(() => {
    if (
      externalClearDiscountTrigger &&
      externalClearDiscountTrigger !== handledClearDiscountNonceRef.current
    ) {
      handledClearDiscountNonceRef.current = externalClearDiscountTrigger;
      setDiscountAmount(0);
      setDiscountInputVal('');
      setDiscountMode('fixed');
      if (currentUser.role !== 'Admin') {
        setDiscountAuthorizedBy(null);
      }
    }
  }, [externalClearDiscountTrigger, currentUser.role]);

  const currentCartComm = calculateWorkerCommission(selectedSalesRep, grandTotal, cart);
  const repTodayComm = repTodayTx.reduce((sum, tx) => {
    return sum + (tx.cashierCommissionAmount || Math.round(tx.grandTotal * ((tx.cashierCommissionRate || 5) / 100)));
  }, 0);

  // Open Checkout Modal
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    const preferredMethod: PaymentMethod = txSettings.cashSaleByDefault
      ? 'cash'
      : ((txSettings.defaultPaymentMethod as PaymentMethod) || 'mpesa');
    setPaymentEntries([{ method: preferredMethod, amount: grandTotal, reference: '' }]);
    // IMPORTANT: Preserve existing backdated saleDate if selected; only default if empty
    if (!saleDate) {
      setSaleDate(getLocalDateString());
    }
    setShowCheckoutModal(true);
  };

  // Add Payment Entry row (Multi / Split payment)
  const addPaymentRow = () => {
    const currentPaidSum = paymentEntries.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remaining = Math.max(0, grandTotal - currentPaidSum);
    setPaymentEntries((prev) => [...prev, { method: 'mpesa', amount: remaining, reference: '' }]);
  };

  const removePaymentRow = (index: number) => {
    setPaymentEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePaymentRow = (index: number, field: keyof PaymentBreakdown, value: any) => {
    setPaymentEntries((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Direct 1-Tap M-PESA STK Push Prompt for Current Cart
  const handleOpenMpesaStkPushDirect = () => {
    if (cart.length === 0) return;
    setMpesaPromptAmount(grandTotal);
    setMpesaActiveRowIndex(null);
    setIsDirectMpesaCheckout(true);
    setShowMpesaPromptModal(true);
  };

  // Callback when customer finishes PIN on phone
  const handleMpesaPromptSuccess = (receiptCode: string, phone: string, paidAmount: number, sms?: string) => {
    if (mpesaActiveRowIndex !== null) {
      // Update specific row in checkout modal
      setPaymentEntries((prev) =>
        prev.map((row, idx) => {
          if (idx === mpesaActiveRowIndex) {
            return {
              ...row,
              method: 'mpesa',
              amount: paidAmount,
              reference: receiptCode,
            };
          }
          return row;
        })
      );
      setPosNotice({
        message: `M-PESA prompt verified! Code: ${receiptCode} (KSh ${paidAmount.toLocaleString()})`,
        type: 'success',
      });
    } else {
      // Direct M-Pesa sale
      setPaymentEntries([
        {
          method: 'mpesa',
          amount: paidAmount,
          reference: receiptCode,
        },
      ]);
      setPosNotice({
        message: `M-PESA STK payment confirmed for ${phone}! Code: ${receiptCode}`,
        type: 'success',
      });
    }
  };

  // Instant finalize sale directly after customer enters M-Pesa PIN
  const handleMpesaDirectFinalize = (receiptCode: string, phone: string) => {
    const { isoDate: finalTxDate, timestamp: finalTxTimestamp } = buildFinalTxDate(saleDate);

    const txDateObj = new Date(finalTxDate);
    const activePrefixes = getActiveFirmPrefixes(txSettings, activeStoreId);
    const receiptNo = formatDocumentNumberWithPrefix(activePrefixes.saleInvoice, txDateObj);

    const cuin = isEtimsRequested ? `CUIN-2026-${Math.floor(100000 + Math.random() * 900000)}` : undefined;
    const cusn = isEtimsRequested ? `CUSN-KENYA-${Math.floor(10000000 + Math.random() * 90000000)}` : undefined;
    const isTaxEnabled = txSettings.enableTransactionWiseTax && kraTaxModeSetting !== 'none';
    const taxBreakdown = {
      vat16Total:
        isTaxEnabled && kraTaxModeSetting === 'vat'
          ? Number((grandTotal - grandTotal / 1.16).toFixed(2))
          : 0,
      zeroRatedTotal: 0,
      exemptTotal: !isTaxEnabled ? grandTotal : 0,
      totTotal: isTaxEnabled && kraTaxModeSetting === 'tot' ? Number((grandTotal * 0.015).toFixed(2)) : 0,
    };

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      receiptNumber: receiptNo,
      date: finalTxDate,
      timestamp: finalTxTimestamp,
      items: [...cart],
      subtotal,
      discountTotal: totalDiscount,
      discountAuthorizedBy: totalDiscount > 0 ? (discountAuthorizedBy || `${currentUser.name} (Admin)`) : undefined,
      taxTotal,
      grandTotal,
      amountPaid: grandTotal,
      balanceDue: 0,
      paymentStatus: 'Paid',
      payments: [
        {
          method: 'mpesa',
          amount: grandTotal,
          reference: receiptCode,
        },
      ],
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: phone || selectedCustomer.phone,
      cashierName: currentUser.name,
      cashierId: currentUser.id,
      salesRepId: selectedSalesRep.id,
      salesRepName: selectedSalesRep.name,
      cashierCommissionRate: currentCartComm.rate,
      cashierCommissionAmount: currentCartComm.amount,
      commissionModelApplied: currentCartComm.modelDescription,
      notes: `Lipa Na M-PESA STK Push (${receiptCode}) - Customer: ${phone}`,
      isEtimsRequested,
      customerKraPin: isEtimsRequested && customerKraPin ? customerKraPin.trim() : undefined,
      cuin,
      cusn,
      taxBreakdown,
      billingPartyName: txSettings.enableBillingPartyName && billingPartyName.trim() ? billingPartyName.trim() : undefined,
      customerPoNumber: txSettings.enableCustomerPoDetails && customerPoNumber.trim() ? customerPoNumber.trim() : undefined,
      customerPoDate: txSettings.enableCustomerPoDetails && customerPoDate ? customerPoDate : undefined,
      roundOffAmount: roundOffAmount !== 0 ? roundOffAmount : undefined,
      additionalChargeLabel: activeAdditionalCharge > 0 ? additionalChargeLabel : undefined,
      additionalChargeAmount: activeAdditionalCharge > 0 ? activeAdditionalCharge : undefined,
      termsAndConditionsText: txSettings.termsAndConditions.enabled ? txSettings.termsAndConditions.text : undefined,
      showTimeOnReceipt: txSettings.addTimeOnTransactions,
      hideInvoiceNumber: !txSettings.enableInvoiceBillNumber,
      customCountLabel: txSettings.enableItemCountColumn ? txSettings.customCountLabel : undefined,
    };

    // Update Product Stock Levels (including free bonus quantities)
    const updatedProducts = products.map((prod) => {
      const cartMatch = cart.find((c) => c.product.id === prod.id);
      if (cartMatch) {
        const totalDeducted = cartMatch.quantity + (cartMatch.freeQuantity || 0);
        return {
          ...prod,
          stockQuantity: Math.max(0, prod.stockQuantity - totalDeducted),
          updatedAt: new Date().toISOString().slice(0, 10),
        };
      }
      return prod;
    });

    // Update Customer Purchases
    const updatedCustomers = customers.map((cust) => {
      if (cust.id === selectedCustomer.id) {
        return {
          ...cust,
          totalPurchases: cust.totalPurchases + grandTotal,
        };
      }
      return cust;
    });

    onCompleteSale(newTx, updatedProducts, updatedCustomers);

    // Automated Transaction Summary SMS Notification via Mock Gateway
    const targetPhone = phone || selectedCustomer.phone;
    if (autoSmsSummary && targetPhone && targetPhone !== 'N/A') {
      sendTransactionSummarySms(newTx, targetPhone, { storeName: resolvedStoreName })
        .then((res) => {
          setPosNotice({
            type: 'success',
            message: `Sale ${newTx.receiptNumber} completed! 📱 Automated summary SMS delivered to ${res.record.formattedPhone} (${res.record.id}).`,
          });
        })
        .catch((err) => {
          console.warn('Automated SMS notification warning:', err);
        });
    }

    setShowCheckoutModal(false);
    setMobileTab('catalog');
    setCart([]);
    setDiscountAmount(0);
    safeRemove(ACTIVE_SALE_DRAFT_KEY);
    if (!hasWorkerPermission(currentUser, 'canGiveDiscounts')) {
      setDiscountAuthorizedBy(null);
    }
    if (hasWorkerPermission(currentUser, 'canPreviewReceipt')) {
      setCompletedTx(newTx);
    } else {
      setPosNotice({
        type: 'success',
        message: `Sale ${newTx.receiptNumber} completed via M-PESA (${receiptCode})!`,
      });
      executeNewSale();
    }
  };

  // Supervisor / Admin Discount PIN verification handler
  const handleVerifyAdminPinForDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError('');

    // Check if entered pin matches any user with discount authorization
    const matchedSupervisor = allUsers.find(
      (u) => hasWorkerPermission(u, 'canGiveDiscounts') && u.pin === adminPinInput.trim()
    );

    if (matchedSupervisor) {
      setDiscountAuthorizedBy(`${matchedSupervisor.name} (${matchedSupervisor.customRoleTitle || matchedSupervisor.role})`);
      const val = Math.max(0, tempDiscountVal);
      if (supervisorDiscountMode === 'percentage') {
        setDiscountMode('percentage');
        setDiscountInputVal(String(val));
        const computedAmt = Math.round((val / 100) * itemsSubtotal);
        setDiscountAmount(computedAmt);
      } else {
        setDiscountMode('fixed');
        setDiscountInputVal(String(val));
        setDiscountAmount(val);
      }
      setShowAdminDiscountAuthModal(false);
      setAdminPinInput('');
    } else {
      setAdminAuthError('Invalid Security PIN! Manager or authorized staff permission required to grant discounts.');
    }
  };

  // Process Final Sale (supports optional direct override payments e.g. 1-tap Mobile Cash checkout)
  const handleFinalizeSale = (overridePayments?: PaymentBreakdown[] | unknown) => {
    if (!cart || cart.length === 0) {
      setPosNotice({ message: 'Cannot complete sale: Receipt cart is empty. Please add items first.', type: 'warning' });
      setShowCheckoutModal(false);
      return;
    }

    const activePayments = Array.isArray(overridePayments)
      ? (overridePayments as PaymentBreakdown[])
      : paymentEntries;

    const totalPaid = activePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const balanceDue = Math.max(0, grandTotal - totalPaid);
    let paymentStatus: 'Paid' | 'Partial' | 'Unpaid' = 'Paid';

    if (totalPaid === 0) {
      paymentStatus = 'Unpaid';
    } else if (balanceDue > 0) {
      paymentStatus = 'Partial';
    }

    const { isoDate: finalTxDate, timestamp: finalTxTimestamp } = buildFinalTxDate(saleDate);

    const txDateObj = new Date(finalTxDate);
    const activePrefixes = getActiveFirmPrefixes(txSettings, activeStoreId);
    const receiptNo = formatDocumentNumberWithPrefix(activePrefixes.saleInvoice, txDateObj);

    const currentCommRate = currentCartComm.rate;
    const currentCommAmount = currentCartComm.amount;

    const cuin = isEtimsRequested ? `CUIN-2026-${Math.floor(100000 + Math.random() * 900000)}` : undefined;
    const cusn = isEtimsRequested ? `CUSN-KENYA-${Math.floor(10000000 + Math.random() * 90000000)}` : undefined;
    const isTaxEnabled = txSettings.enableTransactionWiseTax && kraTaxModeSetting !== 'none';
    const taxBreakdown = {
      vat16Total:
        isTaxEnabled && kraTaxModeSetting === 'vat'
          ? Number((grandTotal - grandTotal / 1.16).toFixed(2))
          : 0,
      zeroRatedTotal: 0,
      exemptTotal: !isTaxEnabled ? grandTotal : 0,
      totTotal: isTaxEnabled && kraTaxModeSetting === 'tot' ? Number((grandTotal * 0.015).toFixed(2)) : 0,
    };

    const effectiveCustomerName = selectedCustomer.name;
    const effectiveCustomerPhone = selectedCustomer.phone;

    const enabledCustomFieldPairs = txSettings.additionalFields.enabled
      ? txSettings.additionalFields.fields
          .filter((f) => f.enabled)
          .map((f) => ({
            label: f.label,
            value: (additionalFieldsValues[f.id] ?? f.defaultValue ?? '').trim(),
          }))
          .filter((f) => f.value.length > 0)
      : [];

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      receiptNumber: receiptNo,
      date: finalTxDate,
      timestamp: finalTxTimestamp,
      items: [...cart],
      subtotal,
      discountTotal: totalDiscount + activePaymentDiscount,
      discountAuthorizedBy:
        totalDiscount + activePaymentDiscount > 0
          ? (discountAuthorizedBy || `${currentUser.name} (Admin)`)
          : undefined,
      taxTotal,
      grandTotal,
      totalAmount: grandTotal,
      amountPaid: totalPaid,
      balanceDue,
      paymentStatus,
      payments: activePayments
        .map((p) => ({ ...p, amount: Number(p.amount) || 0 }))
        .filter((p) => p.amount > 0),
      paymentMethod: activePayments[0]?.method || 'cash',
      customerId: selectedCustomer.id,
      customerName: effectiveCustomerName,
      customerPhone: effectiveCustomerPhone,
      cashierName: currentUser.name,
      cashierId: currentUser.id,
      salesRepId: selectedSalesRep.id,
      salesRepName: selectedSalesRep.name,
      cashierCommissionRate: currentCommRate,
      cashierCommissionAmount: currentCommAmount,
      commissionModelApplied: currentCartComm.modelDescription,
      notes: saleNotes,
      isEtimsRequested,
      customerKraPin: isEtimsRequested && customerKraPin ? customerKraPin.trim() : undefined,
      cuin,
      cusn,
      taxBreakdown,
      billingPartyName: txSettings.enableBillingPartyName && billingPartyName.trim() ? billingPartyName.trim() : undefined,
      customerPoNumber: txSettings.enableCustomerPoDetails && customerPoNumber.trim() ? customerPoNumber.trim() : undefined,
      customerPoDate: txSettings.enableCustomerPoDetails && customerPoDate ? customerPoDate : undefined,
      roundOffAmount: roundOffAmount !== 0 ? roundOffAmount : undefined,
      paymentDiscount: activePaymentDiscount > 0 ? activePaymentDiscount : undefined,
      linkedInvoiceRef: txSettings.linkPaymentsToInvoices && linkedInvoiceRef.trim() ? linkedInvoiceRef.trim() : undefined,
      dueDate: txSettings.dueDatesPaymentTerms.enabled && dueDateInput ? dueDateInput : undefined,
      paymentTerms: txSettings.dueDatesPaymentTerms.enabled && paymentTermsInput.trim() ? paymentTermsInput.trim() : undefined,
      termsAndConditionsText: txSettings.termsAndConditions.enabled ? txSettings.termsAndConditions.text : undefined,
      additionalFieldsValues: enabledCustomFieldPairs.length > 0 ? enabledCustomFieldPairs : undefined,
      transportationDetails:
        txSettings.transportationDetails.enabled && (transportDriverName.trim() || transportVehicleRef.trim())
          ? {
              deliveryMode: transportMode,
              driverName: transportDriverName.trim() || undefined,
              vehicleNumber: transportVehicleRef.trim() || undefined,
            }
          : undefined,
      additionalChargeLabel: activeAdditionalCharge > 0 ? additionalChargeLabel : undefined,
      additionalChargeAmount: activeAdditionalCharge > 0 ? activeAdditionalCharge : undefined,
      showTimeOnReceipt: txSettings.addTimeOnTransactions,
      hideInvoiceNumber: !txSettings.enableInvoiceBillNumber,
      customCountLabel: txSettings.enableItemCountColumn ? txSettings.customCountLabel : undefined,
    };

    // Save directly to localStorage keys pos_store_sales & retail_pos_transactions immediately
    try {
      const existingSales = safeGetJSON<Transaction[]>('pos_store_sales', safeGetJSON<Transaction[]>('retail_pos_transactions', []));
      const updatedSales = [newTx, ...existingSales.filter((t) => t.id !== newTx.id)];
      safeSetJSON('pos_store_sales', updatedSales);
      safeSetJSON('retail_pos_transactions', updatedSales);
    } catch (err) {
      console.warn('Could not update localStorage sales:', err);
    }

    // Update Product Stock Levels (including free bonus quantities)
    const updatedProducts = products.map((prod) => {
      const cartMatch = cart.find((c) => c.product.id === prod.id);
      if (cartMatch) {
        const totalDeducted = cartMatch.quantity + (cartMatch.freeQuantity || 0);
        return {
          ...prod,
          stockQuantity: Math.max(0, prod.stockQuantity - totalDeducted),
          updatedAt: new Date().toISOString().slice(0, 10)
        };
      }
      return prod;
    });

    // Update Customer Purchase History & Credit Balance
    const updatedCustomers = customers.map((cust) => {
      if (cust.id === selectedCustomer.id) {
        return {
          ...cust,
          totalPurchases: cust.totalPurchases + grandTotal,
          currentBalanceDue: cust.currentBalanceDue + balanceDue
        };
      }
      return cust;
    });

    try {
      onCompleteSale(newTx, updatedProducts, updatedCustomers);
    } catch (err) {
      console.error('Error invoking onCompleteSale callback:', err);
      setPosNotice({ message: 'Error recording sale transaction. Please check inputs and retry.', type: 'warning' });
      return;
    }

    // Automated Transaction Summary SMS Notification via Mock Gateway
    if (autoSmsSummary && newTx.customerPhone && newTx.customerPhone !== 'N/A') {
      sendTransactionSummarySms(newTx, newTx.customerPhone, { storeName: resolvedStoreName })
        .then((res) => {
          setPosNotice({
            type: 'success',
            message: `Sale ${newTx.receiptNumber} completed! 📱 Automated summary SMS delivered to ${res.record.formattedPhone} (${res.record.id}).`,
          });
        })
        .catch((err) => {
          console.warn('Automated SMS notification warning:', err);
        });
    }

    setShowCheckoutModal(false);
    setMobileTab('catalog');
    setCart([]);
    setDiscountAmount(0);
    safeRemove(ACTIVE_SALE_DRAFT_KEY);
    if (!hasWorkerPermission(currentUser, 'canGiveDiscounts')) {
      setDiscountAuthorizedBy(null);
    }
    if (hasWorkerPermission(currentUser, 'canPreviewReceipt')) {
      setCompletedTx(newTx);
    } else {
      setPosNotice({
        type: 'success',
        message: `Sale ${newTx.receiptNumber} completed and recorded successfully!`
      });
      executeNewSale();
    }
  };

  // Create new customer submit
  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const created: Customer = {
      id: `cust-${Date.now()}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim() || 'N/A',
      email: newCustEmail.trim() || undefined,
      totalPurchases: 0,
      currentBalanceDue: 0
    };
    onAddCustomer(created);
    setSelectedCustomer(created);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustEmail('');
  };

  const renderCartPanel = () => (
    <div className="space-y-4">
      {/* Single Consolidated Top Cart Header Row (Mobile Drawer & Compact Viewports) */}
      <div className={`${inPhoneFrame ? 'flex' : 'lg:hidden flex'} items-center justify-between gap-2 pb-2.5 border-b border-slate-800`}>
        <button
          type="button"
          onClick={() => setMobileTab('catalog')}
          className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-sky-950/60 border border-sky-900/60 cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
          <span>Back to Catalog</span>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleTriggerNewSale}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-emerald-950/60 border border-emerald-900/60 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span>Reset / New Sale</span>
          </button>
          <button
            type="button"
            id="btn-mobile-drawer-minimize"
            onClick={() => setMobileTab('catalog')}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Minimize / Close Cart"
            aria-label="Close Cart Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Header & Customer Picker */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 relative">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-sky-400" />
          <h3 className="font-bold text-sm text-slate-100">Receipt Order Cart</h3>
        </div>
        <div className="flex items-center gap-1.5 relative">
          <button
            id="btn-pos-ai-scan-cart"
            type="button"
            onClick={() => setShowAiReceiptScanner(true)}
            className="bg-purple-950/80 hover:bg-purple-900 border border-purple-700/80 text-purple-300 font-bold px-2 py-1 rounded-lg text-xs transition flex items-center gap-1 shadow-sm cursor-pointer"
            title="Scan items with AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">AI Add</span>
          </button>

          <span className="bg-sky-950 border border-sky-800 text-sky-300 text-xs px-2 py-1 rounded-lg font-mono font-bold">
            {cart.reduce((sum, item) => sum + item.quantity, 0)}
          </span>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTopRightMenu(!showTopRightMenu)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
              title="Quick Tools & Utilities"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showTopRightMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-1.5 space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowTopRightMenu(false);
                    handleTriggerNewSale();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-lg text-slate-200 flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>New Sale (Reset)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTopRightMenu(false);
                    setShowAiReceiptScanner(true);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-lg text-slate-200 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>AI Camera Scan</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTopRightMenu(false);
                    setShowRepModal(true);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-lg text-slate-200 flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  <span>Change Sales Rep</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer Selection Row */}
      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <User className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCustomer.id}
            onChange={(e) => {
              const cust = customers.find((c) => c.id === e.target.value);
              if (cust) setSelectedCustomer(cust);
            }}
            className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none w-full truncate cursor-pointer"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                {c.name} {c.currentBalanceDue > 0 ? `(Debt: KSh ${c.currentBalanceDue.toLocaleString()})` : ''}
              </option>
            ))}
          </select>
        </div>

        {hasWorkerPermission(currentUser, 'canViewManageCustomers') && (
          <button
            onClick={() => setShowAddCustomerModal(true)}
            title="Add New Customer"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Cart Itemized List */}
      <div className={`space-y-2 ${inPhoneFrame ? '' : 'lg:max-h-96 lg:overflow-y-auto'} pr-1`}>
        {cart.length === 0 ? (
          <div className="text-center py-10 space-y-3 border-2 border-dashed border-slate-800 rounded-2xl">
            <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto" />
            <div>
              <p className="text-xs text-slate-400 font-medium">Cart is empty</p>
              <p className="text-[11px] text-slate-500">Scan barcode, tap products, or use AI camera scan to build receipt</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAiReceiptScanner(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold shadow-md shadow-purple-600/25 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>AI Scan & Auto-Add Items</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileTab('catalog')}
                className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                <Package className="w-3.5 h-3.5" />
                <span>Browse Products Catalog</span>
              </button>
            </div>
          </div>
        ) : (
          cart.map((item) => {
            const isSelected = selectedCartItemId === item.product.id;
            return (
              <div
                key={item.product.id}
                onClick={() => {
                  setSelectedCartItemId(item.product.id);
                  playItemSelectAudioCue();
                }}
                className={`p-2.5 rounded-xl space-y-2 text-xs shadow-md transition-all duration-200 cursor-pointer relative border ${
                  isSelected
                    ? 'bg-sky-950/50 border-sky-400 ring-2 ring-sky-400/60 shadow-lg shadow-sky-950/80'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-sky-500 text-slate-950 shadow-sm shrink-0 animate-pulse">
                        ● Selected
                      </span>
                    )}
                    <h4 className={`font-bold text-xs sm:text-sm leading-snug break-words truncate ${isSelected ? 'text-sky-200 font-black' : 'text-slate-100'}`}>
                      {item.product.name}
                    </h4>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromCart(item.product.id);
                    }}
                    className="p-1 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 rounded transition shrink-0 border border-slate-800 cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-900 flex-wrap">
                <div className="flex items-center gap-1.5 bg-slate-900 border border-sky-800/80 px-2 py-1 rounded-lg">
                  <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">Price (KSh):</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={item.unitPrice === 0 ? '' : item.unitPrice}
                    onFocus={(e) => {
                      e.target.select();
                      setIsKeyboardActive(true);
                      setTimeout(() => {
                        e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 300);
                    }}
                    onBlur={() => setIsKeyboardActive(false)}
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = val === '' ? 0 : parseFloat(val);
                      handleUpdateItemUnitPrice(item.product.id, isNaN(num) ? 0 : num);
                    }}
                    className="w-20 bg-slate-950 border border-sky-700/60 text-sky-300 font-extrabold px-1.5 py-0.5 rounded text-xs outline-none font-mono focus:border-sky-400"
                    title="Selling Unit Price"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-800">
                    <button
                      onClick={() => updateCartQty(item.product.id, -1)}
                      className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold font-mono text-slate-100 px-1 text-xs">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQty(item.product.id, 1)}
                      className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right font-extrabold text-emerald-400 font-mono text-xs min-w-[70px]">
                    KSh {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Dynamic Transaction Settings Item Controls (Tax Mode, Cost Price, Last 5 Rates, Free Qty, Count) */}
              {(txSettings.allowTaxInclusiveExclusiveOnRate ||
                (txSettings.displayPurchasePrice && canViewCostAndProfit) ||
                txSettings.showLast5SalePrices ||
                txSettings.enableFreeItemQuantity ||
                txSettings.enableItemCountColumn) && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-900/90 text-[10px]"
                >
                  {txSettings.allowTaxInclusiveExclusiveOnRate && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateItemMeta(item.product.id, {
                          taxModeOnRate:
                            item.taxModeOnRate === 'exclusive' ? 'inclusive' : 'exclusive',
                        })
                      }
                      className={`px-2 py-0.5 rounded-md font-bold border transition cursor-pointer ${
                        item.taxModeOnRate === 'exclusive'
                          ? 'bg-amber-950/70 text-amber-300 border-amber-700'
                          : 'bg-slate-900 text-sky-300 border-slate-700'
                      }`}
                      title="Toggle Inclusive vs Exclusive tax on this item's rate"
                    >
                      {item.taxModeOnRate === 'exclusive' ? 'Tax Excl.' : 'Tax Incl.'}
                    </button>
                  )}

                  {txSettings.displayPurchasePrice && canViewCostAndProfit && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 font-mono">
                      Cost: KSh {(item.product.costPrice || 0).toLocaleString()}
                    </span>
                  )}

                  {txSettings.showLast5SalePrices && (
                    <button
                      type="button"
                      onClick={() =>
                        setLast5RatesItemId((prev) =>
                          prev === item.product.id ? null : item.product.id
                        )
                      }
                      className="px-2 py-0.5 rounded-md bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/70 font-semibold transition cursor-pointer"
                    >
                      Last 5 Rates ▾
                    </button>
                  )}

                  {txSettings.enableFreeItemQuantity && (
                    <label className="inline-flex items-center gap-1 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded-md">
                      <span className="text-emerald-400 font-bold">Free Qty:</span>
                      <input
                        type="number"
                        min={0}
                        value={item.freeQuantity ?? 0}
                        onChange={(e) =>
                          handleUpdateItemMeta(item.product.id, {
                            freeQuantity: Math.max(0, parseInt(e.target.value, 10) || 0),
                          })
                        }
                        className="w-10 bg-slate-950 border border-slate-700 rounded px-1 text-center font-mono text-white"
                      />
                    </label>
                  )}

                  {txSettings.enableItemCountColumn && (
                    <label className="inline-flex items-center gap-1 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded-md">
                      <span className="text-sky-300 font-bold">
                        {txSettings.customCountLabel || 'Count'}:
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={item.customCount ?? 1}
                        onChange={(e) =>
                          handleUpdateItemMeta(item.product.id, {
                            customCount: Math.max(0, parseInt(e.target.value, 10) || 0),
                          })
                        }
                        className="w-10 bg-slate-950 border border-slate-700 rounded px-1 text-center font-mono text-white"
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Last 5 Sale Prices Negotiation Lookup Popover */}
              {txSettings.showLast5SalePrices && last5RatesItemId === item.product.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 bg-slate-900 border border-indigo-700/60 rounded-xl space-y-1 text-[10px]"
                >
                  <div className="flex items-center justify-between text-indigo-300 font-bold">
                    <span>Recent Sale Prices ({item.product.name})</span>
                    <button
                      type="button"
                      onClick={() => setLast5RatesItemId(null)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {(() => {
                    const historyRates = getLast5SalePricesForProduct(
                      item.product.id,
                      transactions,
                      selectedCustomer.id
                    );
                    if (historyRates.length === 0) {
                      return (
                        <div className="text-slate-400 italic">
                          No previous recorded sales found for this item yet.
                        </div>
                      );
                    }
                    return (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {historyRates.map((hr, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              handleUpdateItemUnitPrice(item.product.id, hr.unitPrice);
                              setLast5RatesItemId(null);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-indigo-950 border border-slate-700 hover:border-indigo-500 text-slate-200 font-mono cursor-pointer transition"
                            title={`Sold to ${hr.customerName} on ${new Date(hr.date).toLocaleDateString()} (${hr.receiptNumber})`}
                          >
                            <span className="font-bold text-emerald-400">
                              KSh {hr.unitPrice.toLocaleString()}
                            </span>{' '}
                            <span className="text-slate-400">({hr.customerName.split(' ')[0]})</span>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Item Discount Action Bar */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[11px]">
                <div className="flex items-center gap-2">
                  {hasWorkerPermission(currentUser, 'canGiveDiscounts') ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (editingItemDiscountId === item.product.id) {
                          setEditingItemDiscountId(null);
                        } else {
                          setEditingItemDiscountId(item.product.id);
                          setItemDiscountMode('fixed');
                          setItemDiscountInputVal(item.discount > 0 ? String(item.discount) : '');
                        }
                      }}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                        item.discount > 0
                          ? 'bg-amber-950/70 border border-amber-800 text-amber-300 hover:bg-amber-900'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                      title="Set manual cash or % discount for this specific item"
                    >
                      <Tag className="w-3 h-3 text-amber-400" />
                      <span>{item.discount > 0 ? `Item Disc: -KSh ${(item.discount * item.quantity).toLocaleString()}` : 'Give Item Discount'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAdminDiscountAuthModal(true)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-amber-950/40 border border-amber-900/60 text-amber-400 hover:bg-amber-900/60 transition cursor-pointer"
                      title="Manager permission required to give item discounts"
                    >
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>🔒 Request Manager Discount PIN</span>
                    </button>
                  )}
                  {item.discount > 0 && hasWorkerPermission(currentUser, 'canGiveDiscounts') && (
                    <button
                      type="button"
                      onClick={() => handleUpdateItemDiscount(item.product.id, 0)}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {item.discount > 0 && (
                  <span className="text-[10px] text-emerald-400 font-mono">
                    Saved KSh {(item.discount * item.quantity).toLocaleString()}
                  </span>
                )}
              </div>

              {/* Inline Item Discount Popover/Editor */}
              {editingItemDiscountId === item.product.id && hasWorkerPermission(currentUser, 'canGiveDiscounts') && (
                <div className="p-2.5 bg-slate-900/90 rounded-xl border border-amber-800/60 space-y-2 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 text-[11px] flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Manual Item Discount: {item.product.name}
                    </span>
                    <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setItemDiscountMode('fixed')}
                        className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                          itemDiscountMode === 'fixed' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Manual KSh
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemDiscountMode('percentage')}
                        className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                          itemDiscountMode === 'percentage' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        % Off
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-mono font-bold">
                        {itemDiscountMode === 'fixed' ? 'KSh' : '%'}
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={itemDiscountMode === 'fixed' ? item.unitPrice : 100}
                        value={itemDiscountInputVal === '0' || itemDiscountInputVal === '' ? '' : itemDiscountInputVal}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setItemDiscountInputVal(e.target.value)}
                        placeholder={itemDiscountMode === 'fixed' ? 'e.g. 50' : 'e.g. 10'}
                        className="w-full bg-slate-950 border border-slate-700 pl-9 pr-2 py-1 rounded-lg text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const val = parseFloat(itemDiscountInputVal) || 0;
                        let discPerUnit = 0;
                        if (itemDiscountMode === 'percentage') {
                          discPerUnit = Math.round((val / 100) * item.unitPrice);
                        } else {
                          discPerUnit = Math.min(item.unitPrice, val);
                        }
                        handleUpdateItemDiscount(item.product.id, discPerUnit);
                        setEditingItemDiscountId(null);
                      }}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition cursor-pointer"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItemDiscountId(null)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Quick Chips for Item Discount */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-slate-500">Quick:</span>
                    {itemDiscountMode === 'fixed' ? (
                      [20, 50, 100, 200, 500].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setItemDiscountInputVal(String(amt));
                            handleUpdateItemDiscount(item.product.id, Math.min(item.unitPrice, amt));
                            setEditingItemDiscountId(null);
                          }}
                          className="px-1.5 py-0.5 bg-slate-950 hover:bg-amber-950 border border-slate-800 hover:border-amber-700 text-slate-300 hover:text-amber-300 text-[10px] rounded font-mono transition cursor-pointer"
                        >
                          -KSh {amt}
                        </button>
                      ))
                    ) : (
                      [5, 10, 15, 20, 50].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            setItemDiscountInputVal(String(pct));
                            const disc = Math.round((pct / 100) * item.unitPrice);
                            handleUpdateItemDiscount(item.product.id, disc);
                            setEditingItemDiscountId(null);
                          }}
                          className="px-1.5 py-0.5 bg-slate-950 hover:bg-amber-950 border border-slate-800 hover:border-amber-700 text-slate-300 hover:text-amber-300 text-[10px] rounded font-mono transition cursor-pointer"
                        >
                          {pct}% off
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })
        )}
      </div>

      {/* Compact Sales Rep Chip */}
      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs">
        <button
          type="button"
          onClick={() => setShowRepModal(true)}
          className="w-full flex items-center justify-between text-slate-300 hover:text-white transition cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-sky-400" />
            <span>Rep: <strong className="text-white">{selectedSalesRep.name}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-emerald-400 font-bold">+KSh {currentCartComm.amount.toLocaleString()}</span>
            <span className="text-[10px] bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-sky-400">Change ▾</span>
          </div>
        </button>
      </div>

      {/* Financial Summary */}
      <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
        {/* Transaction-wise Discount Control */}
        {txSettings.enableTransactionWiseDiscount && hasWorkerPermission(currentUser, 'canGiveDiscounts') && cart.length > 0 && (
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-300">Invoice Discount:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDiscountMode((m) => (m === 'fixed' ? 'percentage' : 'fixed'))}
                className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-amber-300 cursor-pointer"
              >
                {discountMode === 'percentage' ? '%' : 'KSh'}
              </button>
              <input
                type="number"
                min={0}
                value={discountInputVal}
                onChange={(e) => {
                  const val = e.target.value;
                  setDiscountInputVal(val);
                  const num = parseFloat(val) || 0;
                  setDiscountAmount(
                    discountMode === 'percentage'
                      ? Math.round((Math.min(100, num) / 100) * itemsSubtotal)
                      : Math.min(itemsSubtotal, num)
                  );
                }}
                placeholder="0"
                className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-amber-300 text-right focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}

        {/* Additional Charges Control */}
        {txSettings.additionalCharges.enabled && cart.length > 0 && (
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
            <input
              type="text"
              value={additionalChargeLabel}
              onChange={(e) => setAdditionalChargeLabel(e.target.value)}
              className="flex-1 min-w-0 bg-transparent border-b border-slate-800 text-[11px] font-semibold text-slate-300 focus:outline-none focus:border-blue-500"
            />
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-slate-400 font-mono">+KSh</span>
              <input
                type="number"
                min={0}
                value={additionalChargeAmount === 0 ? '' : additionalChargeAmount}
                onChange={(e) => setAdditionalChargeAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0"
                className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-sky-300 text-right focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5 font-mono pt-1 text-slate-300">
          <div className="flex justify-between text-slate-400">
            <span>Items Subtotal:</span>
            <span>KSh {itemsSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          {totalDiscount > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Customer Savings:</span>
              <span>-KSh {totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}

          {activeAdditionalCharge > 0 && (
            <div className="flex justify-between text-sky-300">
              <span>{additionalChargeLabel}:</span>
              <span>+KSh {activeAdditionalCharge.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}

          {txSettings.enableTransactionWiseTax && (
            <div className="flex justify-between items-center text-amber-400/90 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span>
                  {kraTaxModeSetting === 'vat'
                    ? 'Standard Tax (16%):'
                    : kraTaxModeSetting === 'none'
                      ? 'Tax (Off):'
                      : 'Turnover Levy (1.5%):'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowKraTotModal(true)}
                  className="text-[10px] text-amber-300 hover:text-white font-bold underline cursor-pointer"
                  title="View Optional Sales Tax & Levy Summary"
                >
                  Tax Summary ↗
                </button>
              </span>
              <span className="font-mono font-bold">
                {kraTaxModeSetting === 'vat'
                  ? `KSh ${(exclusiveVatAddOn > 0 ? exclusiveVatAddOn : grandTotal - grandTotal / 1.16).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : kraTaxModeSetting === 'none'
                    ? 'KSh 0.00'
                    : `KSh ${(grandTotal * 0.015).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              </span>
            </div>
          )}

          {txSettings.roundOffTransactionAmount && roundOffAmount !== 0 && (
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Round Off:</span>
              <span>{roundOffAmount > 0 ? '+' : ''}KSh {roundOffAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-white font-sans">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Grand Total:</span>
            <span className="text-2xl font-black text-sky-400 font-mono">
              KSh {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {txSettings.showProfitOnSaleInvoice && canViewCostAndProfit && cart.length > 0 && (
            <div className="mt-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-700/50 flex items-center justify-between text-[11px]">
              <span className="font-sans font-semibold text-emerald-300">
                Est. Owner Profit ({estimatedProfitMarginPct}%):
              </span>
              <span className={`font-mono font-extrabold ${estimatedCartProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                KSh {estimatedCartProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Action Buttons */}
      <div className="space-y-2">
        {!isOnline && (
          <div className="flex items-center gap-2 p-2 bg-amber-500/15 border border-amber-500/40 text-amber-300 rounded-xl text-xs">
            <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Offline Mode (Syncs upon reconnect)</span>
          </div>
        )}

        {renderMobileDateSelector()}

        <div className="grid grid-cols-2 gap-2">
          <button
            id="btn-pos-mpesa-fast-prompt"
            type="button"
            disabled={cart.length === 0 || !hasWorkerPermission(currentUser, 'canMakeSales')}
            onClick={handleOpenMpesaStkPushDirect}
            className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-40 text-white font-bold py-2.5 px-3 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 text-xs sm:text-sm border border-emerald-400/40 cursor-pointer"
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            <span className="truncate">M-Pesa Push</span>
          </button>

          <button
            id="btn-pos-checkout"
            type="button"
            disabled={cart.length === 0 || !hasWorkerPermission(currentUser, 'canMakeSales')}
            onClick={handleOpenCheckout}
            className="bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 active:scale-95 disabled:opacity-50 text-white font-bold py-2.5 px-3 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 text-xs sm:text-sm cursor-pointer"
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span className="truncate">Complete Sale</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderMobileDateSelector = () => {
    const [yearStr, monthStr, dayStr] = (saleDate || getLocalDateString()).split('-');
    const currentYear = parseInt(yearStr, 10) || new Date().getFullYear();
    const currentMonth = parseInt(monthStr, 10) || (new Date().getMonth() + 1);
    const currentDay = parseInt(dayStr, 10) || new Date().getDate();

    const updateDateParts = (y: number, m: number, d: number) => {
      const maxD = new Date(y, m, 0).getDate();
      const safeD = Math.min(Math.max(1, d), maxD);
      const yS = String(y);
      const mS = String(m).padStart(2, '0');
      const dS = String(safeD).padStart(2, '0');
      setSaleDate(`${yS}-${mS}-${dS}`);
    };

    const handlePreset = (offsetDays: number) => {
      const d = new Date();
      d.setDate(d.getDate() - offsetDays);
      setSaleDate(getLocalDateString(d));
    };

    const monthNames = [
      { val: 1, name: 'Jan' },
      { val: 2, name: 'Feb' },
      { val: 3, name: 'Mar' },
      { val: 4, name: 'Apr' },
      { val: 5, name: 'May' },
      { val: 6, name: 'Jun' },
      { val: 7, name: 'Jul' },
      { val: 8, name: 'Aug' },
      { val: 9, name: 'Sep' },
      { val: 10, name: 'Oct' },
      { val: 11, name: 'Nov' },
      { val: 12, name: 'Dec' },
    ];

    const yearsList = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

    const displayFormatted = (() => {
      try {
        const [y, m, d] = (saleDate || '').split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        if (isNaN(dt.getTime())) return saleDate;
        return dt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      } catch (_) {
        return saleDate;
      }
    })();

    return (
      <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span>Sale Date / Backdate Mode</span>
          </label>
          <span className="text-[10px] text-slate-400 font-mono">Mobile Touch Picker</span>
        </div>

        {/* 1-Tap Preset Buttons */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => handlePreset(0)}
            className="py-1.5 px-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>🟢 Today</span>
          </button>
          <button
            type="button"
            onClick={() => handlePreset(1)}
            className="py-1.5 px-2 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/80 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>🟡 Yesterday</span>
          </button>
          <button
            type="button"
            onClick={() => handlePreset(2)}
            className="py-1.5 px-2 bg-orange-950/80 hover:bg-orange-900 text-orange-300 border border-orange-800/80 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>🟠 2 Days Ago</span>
          </button>
        </div>

        {/* 3 Native Mobile Dropdowns (Day, Month, Year) */}
        <div className="grid grid-cols-3 gap-2">
          {/* Day */}
          <div>
            <span className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Day</span>
            <select
              disabled={!hasWorkerPermission(currentUser, 'canBackdateEntries')}
              value={currentDay}
              onChange={(e) => updateDateParts(currentYear, currentMonth, parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-2 py-2 rounded-xl text-xs font-mono font-bold outline-none focus:border-sky-500 cursor-pointer"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {String(d).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div>
            <span className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Month</span>
            <select
              disabled={!hasWorkerPermission(currentUser, 'canBackdateEntries')}
              value={currentMonth}
              onChange={(e) => updateDateParts(currentYear, parseInt(e.target.value, 10), currentDay)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-2 py-2 rounded-xl text-xs font-semibold outline-none focus:border-sky-500 cursor-pointer"
            >
              {monthNames.map((m) => (
                <option key={m.val} value={m.val}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <span className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Year</span>
            <select
              disabled={!hasWorkerPermission(currentUser, 'canBackdateEntries')}
              value={currentYear}
              onChange={(e) => updateDateParts(parseInt(e.target.value, 10), currentMonth, currentDay)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-2 py-2 rounded-xl text-xs font-mono font-bold outline-none focus:border-sky-500 cursor-pointer"
            >
              {yearsList.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Date Display Confirmation Badge */}
        <div className="bg-sky-950/40 border border-sky-800/60 p-2.5 rounded-xl flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">Selected Sale Date:</span>
          <span className="font-bold text-sky-300 font-mono">{displayFormatted}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-1 sm:px-6 lg:px-8 py-2 sm:py-6 space-y-3 lg:space-y-4 flex flex-col pb-4 lg:pb-6">
      {/* Toast Notice Banner (New Sale / Feedback) */}
      {posNotice && (
        <div
          className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-lg transition-all animate-fade-in ${
            posNotice.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-800 text-emerald-300'
              : 'bg-sky-950/90 border-sky-800 text-sky-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{posNotice.message}</span>
          </div>
          <button onClick={() => setPosNotice(null)} className="text-slate-400 hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* POS Offline Visual Indicator Banner */}
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-500/15 border-2 border-amber-500/60 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs text-amber-200 shadow-md animate-pulse"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
              <WifiOff className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-amber-300 text-xs sm:text-sm block leading-tight">
                You are currently offline
              </span>
              <span className="text-[11px] sm:text-xs text-amber-200/90 leading-tight block mt-0.5">
                Any actions performed will only sync once a stable connection is re-established.
              </span>
            </div>
          </div>
          <span className="bg-amber-500 text-slate-950 px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 uppercase tracking-wider hidden sm:inline-block shadow-sm">
            Local Safe Mode
          </span>
        </div>
      )}

      {/* MOBILE SEGMENTED VIEW SWITCHER: CATALOG VS CART/CHECKOUT (Hidden while compact mobile search is active) */}
      {!isMobileSearchActive && (
      <div className={`${inPhoneFrame ? 'flex' : 'lg:hidden flex'} items-center p-1 bg-slate-900 border border-slate-800 rounded-xl gap-1 shadow-sm`}>
        <button
          type="button"
          id="btn-mobile-tab-catalog"
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'catalog'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Catalog ({filteredProducts.length})</span>
        </button>

        <button
          type="button"
          id="btn-mobile-tab-cart"
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 relative cursor-pointer ${
            mobileTab === 'cart'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Cart & Sale ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
          {cart.length > 0 && (
            <span className="font-mono text-emerald-400 font-extrabold ml-1">
              • KSh {grandTotal.toLocaleString()}
            </span>
          )}
        </button>
      </div>
      )}

      <div className={inPhoneFrame ? 'flex flex-col gap-3' : 'flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-6 lg:items-start'}>
        {/* LEFT 7 COLS: PRODUCT CATALOG & SEARCH */}
        <div
          className={
            inPhoneFrame
              ? 'space-y-3 flex flex-col'
              : `lg:col-span-7 space-y-3 lg:space-y-4 ${mobileTab === 'catalog' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'}`
          }
        >
          {/* SEARCH BAR, STATUS BAR, & COMPACT ACTION ROW */}
          <div
            ref={searchBarContainerRef}
            className={`order-1 relative shrink-0 overflow-visible z-30 bg-slate-900/95 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-slate-800 shadow-2xl space-y-2.5 ${
              inPhoneFrame ? '' : 'lg:sticky lg:top-2'
            }`}
          >
            {/* Dedicated Full-Width Search Input Bar with Scroll-to-Top Focus & Quick Scan Button */}
            <div className="w-full flex items-center gap-2">
              <div className="relative flex-1 min-w-0 flex items-center">
                <Search className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search products by Name, SKU, or Barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full bg-slate-950 border border-slate-700/80 text-white placeholder-slate-400 text-base sm:text-xs pl-10 pr-9 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition shadow-inner font-medium"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {(searchTerm || isSearchFocused) && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleClearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                    title="Clear search & close keyboard"
                    aria-label="Clear search query"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {txSettings.enableBarcodeScanning && (
                <button
                  id="btn-pos-quick-scan"
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-sky-600/25 whitespace-nowrap shrink-0 cursor-pointer"
                  title="Open barcode & QR camera scanner to add items to the current transaction"
                  aria-label="Quick Scan barcode or QR code"
                >
                  <Scan className="w-4 h-4 shrink-0" />
                  <span>Quick Scan</span>
                </button>
              )}
            </div>

            {/* Active search pill right below search bar — full height, zero clipping */}
            {searchTerm && (
              <div className="flex items-center justify-between gap-2 text-xs bg-sky-950/70 border border-sky-700/60 px-3 py-2 rounded-xl text-sky-300 shrink-0 overflow-visible">
                <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
                  <Search className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="text-slate-300 text-[11px] shrink-0">Searching:</span>
                  <span className="font-bold text-white truncate max-w-[140px] sm:max-w-xs">"{searchTerm}"</span>
                  <span className="text-sky-300 font-mono font-bold text-[11px] shrink-0">
                    ({filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        handleClearSearch();
                        setMobileTab('cart');
                      }}
                      className="text-[11px] font-bold text-emerald-300 hover:text-white flex items-center gap-1 bg-emerald-950/90 px-2.5 py-1 rounded-lg border border-emerald-600/60 cursor-pointer"
                    >
                      <span>Cart ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleClearSearch}
                    className="text-[11px] font-bold text-sky-300 hover:text-white flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            )}

            {/* Single compact action row right below the search bar: + New Sale & AI Scan to Receipt (hidden during mobile compact search) */}
            <div
              className={`items-center justify-between gap-1.5 flex-nowrap overflow-x-auto no-scrollbar shrink-0 ${
                isMobileSearchActive ? (inPhoneFrame ? 'hidden' : 'hidden lg:flex') : 'flex'
              }`}
            >
              <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
                {/* Prominent New Sale Button */}
                <button
                  id="btn-pos-new-sale-catalog"
                  onClick={handleTriggerNewSale}
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold px-2.5 sm:px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1 shadow-md shadow-emerald-600/25 whitespace-nowrap shrink-0 cursor-pointer"
                  title="Start a fresh new sale (clears cart)"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>New Sale</span>
                </button>

                {/* AI Camera Scan to Receipt Button */}
                <button
                  id="btn-pos-ai-scan-receipt"
                  type="button"
                  onClick={() => setShowAiReceiptScanner(true)}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white font-extrabold px-2.5 sm:px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1 shadow-md shadow-purple-600/25 whitespace-nowrap shrink-0 cursor-pointer"
                  title="AI Visual Scanner: Point camera at counter items or order sheet to automatically add to receipt"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />
                  <span>AI Scan to Receipt</span>
                </button>

                {/* Scan QR Code (Tablet/Desktop) */}
                {txSettings.enableBarcodeScanning && (
                  <button
                    id="btn-pos-scan-barcode"
                    onClick={() => setShowScanner(true)}
                    className="hidden sm:flex bg-sky-600 hover:bg-sky-500 text-white font-semibold px-3 py-1.5 rounded-xl text-xs transition items-center gap-1.5 shadow-md shadow-sky-600/20 whitespace-nowrap shrink-0 cursor-pointer"
                    title="Scan QR Code"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Scan QR</span>
                  </button>
                )}

                {/* Transaction SMS Logs Button */}
                <button
                  id="btn-pos-view-sms-logs"
                  onClick={() => setShowSmsLogsModal(true)}
                  className="bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 font-bold px-2 sm:px-2.5 py-1.5 rounded-xl text-xs transition flex items-center gap-1 shrink-0 shadow-sm cursor-pointer"
                  title="View Automated Transaction Summary SMS Delivery Logs"
                >
                  <Smartphone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="hidden sm:inline">SMS Logs</span>
                </button>
              </div>

              {/* Grid / List View Toggle */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 ml-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  title="List Form View (Compact table for 300+ items)"
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === 'list' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Grid Cards View"
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === 'grid' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Compact Top Sellers Horizontal Scrollable Chips Bar (hidden during mobile compact search) */}
            {favoriteProducts.length > 0 && (
              <div
                className={`items-center gap-1.5 overflow-x-auto pb-0.5 pt-0.5 no-scrollbar text-xs shrink-0 ${
                  isMobileSearchActive ? (inPhoneFrame ? 'hidden' : 'hidden lg:flex') : 'flex'
                }`}
              >
                <span className="text-[10px] font-extrabold text-amber-400 shrink-0 flex items-center gap-1 bg-amber-950/70 border border-amber-800 px-2 py-1 rounded-xl">
                  <Flame className="w-3 h-3 text-amber-400" /> Top Sellers:
                </span>
                {favoriteProducts.slice(0, 10).map((p, index) => {
                  const cartItem = cart.find((item) => item.product.id === p.id);
                  const inCartQty = cartItem ? cartItem.quantity : 0;
                  const isSelected = selectedCartItemId === p.id;
                  return (
                    <button
                      key={`top-chip-${p.id}`}
                      type="button"
                      onClick={() => handleAddToCart(p)}
                      className={`px-2 py-1 rounded-xl whitespace-nowrap text-xs font-bold transition flex items-center gap-1 border cursor-pointer select-none shrink-0 ${
                        isSelected
                          ? 'bg-sky-500 text-slate-950 border-sky-300 font-black shadow-md ring-2 ring-sky-400/70 scale-105'
                          : inCartQty > 0
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                          : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200 hover:text-white'
                      }`}
                      title={`Add 1x ${p.name} (KSh ${p.sellingPrice})`}
                    >
                      <span className="text-[9px] font-mono opacity-70">#{index + 1}</span>
                      <span className="max-w-[100px] truncate">{p.name}</span>
                      <span className={`font-mono font-bold ${isSelected ? 'text-slate-950' : 'text-emerald-400'}`}>KSh {p.sellingPrice}</span>
                      {isSelected ? (
                        <span className="ml-0.5 px-1 bg-slate-950 text-sky-300 rounded text-[9px] font-mono font-bold">
                          ●{inCartQty}
                        </span>
                      ) : inCartQty > 0 ? (
                        <span className="ml-0.5 px-1 bg-slate-950 text-amber-300 rounded text-[9px] font-mono">
                          ✓{inCartQty}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Advanced Filters Toggle & Collapsible Panel (hidden during mobile compact search) */}
            <div
              className={`pt-0.5 shrink-0 ${
                isMobileSearchActive ? (inPhoneFrame ? 'hidden' : 'hidden lg:block') : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                    activeAdvancedCount > 0
                      ? 'bg-sky-950 text-sky-300 border-sky-700/80 shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                  <span>Advanced Filters</span>
                  {activeAdvancedCount > 0 && (
                    <span className="bg-sky-500 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold">
                      {activeAdvancedCount}
                    </span>
                  )}
                </button>

                {activeAdvancedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSupplier('All');
                      setPriceRange('all');
                      setProductAge('all');
                    }}
                    className="text-[11px] text-slate-400 hover:text-white underline transition"
                  >
                    Reset Advanced
                  </button>
                )}
              </div>

              {showAdvancedFilters && (
                <div className="mt-2.5 p-3 bg-slate-950 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                      <Truck className="w-3 h-3 text-sky-400" />
                      <span>Supplier Name</span>
                    </label>
                    <select
                      value={selectedSupplier}
                      onChange={(e) => setSelectedSupplier(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-sky-500"
                    >
                      <option value="All">All Suppliers ({allSuppliers.length})</option>
                      {allSuppliers.map((sup) => (
                        <option key={sup} value={sup}>
                          {sup}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-emerald-400" />
                      <span>Price Range (KSh)</span>
                    </label>
                    <select
                      value={priceRange}
                      onChange={(e) => setPriceRange(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-sky-500"
                    >
                      <option value="all">All Prices</option>
                      <option value="under_500">Under KSh 500</option>
                      <option value="500_2000">KSh 500 - 2,000</option>
                      <option value="2000_10000">KSh 2,000 - 10,000</option>
                      <option value="over_10000">Over KSh 10,000</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      <span>Product Age</span>
                    </label>
                    <select
                      value={productAge}
                      onChange={(e) => setProductAge(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-sky-500"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Added Today (24h)</option>
                      <option value="7_days">Last 7 Days</option>
                      <option value="30_days">Last 30 Days</option>
                      <option value="90_days">Last 90 Days</option>
                      <option value="older_90">Older than 90 Days</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Velocity Filters, Category Pills & Favorites & Quick Access (hidden on mobile during compact search so results snap directly under search bar) */}
          <div
            className={`${searchTerm.trim() ? 'order-3' : 'order-2'} space-y-3 shrink-0 ${
              isMobileSearchActive ? (inPhoneFrame ? 'hidden' : 'hidden lg:block') : ''
            }`}
          >
          {/* Sales & Profit Velocity Performance Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <span className="text-[11px] font-bold text-slate-400 mr-1 shrink-0 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" /> Sales & Profit:
            </span>
            <button
              type="button"
              onClick={() => setPerformanceFilter('All')}
              className={`px-2.5 py-1 rounded-xl whitespace-nowrap font-bold text-[11px] transition ${
                performanceFilter === 'All'
                  ? 'bg-slate-200 text-slate-900 font-extrabold shadow-sm'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All Items ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setPerformanceFilter(performanceFilter === 'high_sales_high_profit' ? 'All' : 'high_sales_high_profit')}
              className={`px-2.5 py-1 rounded-xl whitespace-nowrap font-extrabold text-[11px] flex items-center gap-1 transition shadow-sm ${
                performanceFilter === 'high_sales_high_profit'
                  ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400'
                  : 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/70 hover:bg-emerald-900/80'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>⭐ High Sales & High Profit ({performanceCounts.highSalesHighProfit})</span>
            </button>
            <button
              type="button"
              onClick={() => setPerformanceFilter(performanceFilter === 'low_sales' ? 'All' : 'low_sales')}
              className={`px-2.5 py-1 rounded-xl whitespace-nowrap font-extrabold text-[11px] flex items-center gap-1 transition shadow-sm ${
                performanceFilter === 'low_sales'
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400'
                  : 'bg-amber-950/90 text-amber-300 border border-amber-500/70 hover:bg-amber-900/80'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>⚠️ Lower Sold Items ({performanceCounts.lowSales})</span>
            </button>
            {performanceCounts.highVolume > 0 && (
              <button
                type="button"
                onClick={() => setPerformanceFilter(performanceFilter === 'high_sales_low_profit' ? 'All' : 'high_sales_low_profit')}
                className={`px-2.5 py-1 rounded-xl whitespace-nowrap font-extrabold text-[11px] flex items-center gap-1 transition ${
                  performanceFilter === 'high_sales_low_profit'
                    ? 'bg-sky-500 text-slate-950 ring-2 ring-sky-400'
                    : 'bg-sky-950/90 text-sky-300 border border-sky-500/70 hover:bg-sky-900/80'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>⚡ High Volume ({performanceCounts.highVolume})</span>
              </button>
            )}
            {performanceCounts.highMargin > 0 && (
              <button
                type="button"
                onClick={() => setPerformanceFilter(performanceFilter === 'low_sales_high_profit' ? 'All' : 'low_sales_high_profit')}
                className={`px-2.5 py-1 rounded-xl whitespace-nowrap font-extrabold text-[11px] flex items-center gap-1 transition ${
                  performanceFilter === 'low_sales_high_profit'
                    ? 'bg-purple-500 text-slate-950 ring-2 ring-purple-400'
                    : 'bg-purple-950/90 text-purple-300 border border-purple-500/70 hover:bg-purple-900/80'
                }`}
              >
                <Gem className="w-3 h-3" />
                <span>💎 High Margin ({performanceCounts.highMargin})</span>
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              id="btn-pos-category-all"
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition ${
                selectedCategory === 'All'
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              All Items ({products.length})
            </button>

            {/* Favorites Category Filter Pill */}
            {favoriteProducts.length > 0 && (
              <button
                id="btn-pos-category-favorites"
                onClick={() => setSelectedCategory('Favorites')}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition flex items-center gap-1.5 ${
                  selectedCategory === 'Favorites'
                    ? 'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-400 shadow-md'
                    : 'bg-amber-950/80 border border-amber-600/60 text-amber-300 hover:bg-amber-900/80'
                }`}
                title="Filter catalog to top 10 most frequently sold items"
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>⭐ Favorites ({favoriteProducts.length})</span>
              </button>
            )}

            {/* Recently Added Category Filter Pill */}
            {recentlyAddedProducts.length > 0 && (
              <button
                id="btn-pos-category-recently-added"
                onClick={() => setSelectedCategory('Recently Added')}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition flex items-center gap-1.5 ${
                  selectedCategory === 'Recently Added'
                    ? 'bg-sky-500 text-slate-950 font-black ring-2 ring-sky-400 shadow-md'
                    : 'bg-sky-950/80 border border-sky-600/60 text-sky-300 hover:bg-sky-900/80'
                }`}
                title="Filter catalog to 5 most recently created products"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>✨ Recently Added ({recentlyAddedProducts.length})</span>
              </button>
            )}

            {allCategoryNames.map((catName) => (
              <button
                key={catName}
                onClick={() => setSelectedCategory(catName)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition ${
                  selectedCategory === catName
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {catName}
              </button>
            ))}
          </div>

          {/* FAVORITES & QUICK-ACCESS GRID: Top 10 Most Frequently Sold Items & 5 Most Recently Created Products */}
          {(favoriteProducts.length > 0 || recentlyAddedProducts.length > 0) && (
            <div
              id="pos-favorites-grid-container"
              className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-md space-y-3"
            >
              {/* Header with Title, Section Switcher, and Collapse/Expand Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
                        Favorites & Quick Access
                      </h4>
                      <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                        <button
                          type="button"
                          id="btn-fav-view-all"
                          onClick={() => setFavoritesSectionView('all')}
                          className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                            favoritesSectionView === 'all'
                              ? 'bg-slate-800 text-white shadow-xs'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Show Both
                        </button>
                        <button
                          type="button"
                          id="btn-fav-view-top"
                          onClick={() => setFavoritesSectionView('top_selling')}
                          className={`px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                            favoritesSectionView === 'top_selling'
                              ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                              : 'text-amber-300 hover:text-white'
                          }`}
                        >
                          <Flame className="w-2.5 h-2.5" />
                          Top 10 Sellers
                        </button>
                        <button
                          type="button"
                          id="btn-fav-view-recent"
                          onClick={() => setFavoritesSectionView('recently_added')}
                          className={`px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                            favoritesSectionView === 'recently_added'
                              ? 'bg-sky-500 text-slate-950 font-black shadow-xs'
                              : 'text-sky-300 hover:text-white'
                          }`}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          Recently Added (5)
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      One-click instant selection: tap any item below to add it directly to cart
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                    One-click add +1
                  </span>
                  <button
                    type="button"
                    id="btn-toggle-favorites-grid"
                    onClick={() => setShowFavoritesGrid(!showFavoritesGrid)}
                    className="p-1.5 px-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                    title={showFavoritesGrid ? 'Collapse Favorites Grid' : 'Expand Favorites Grid'}
                  >
                    <span>{showFavoritesGrid ? 'Hide' : 'Show Grid'}</span>
                    {showFavoritesGrid ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Content */}
              {showFavoritesGrid && (
                <div className="space-y-4">
                  {/* SECTION 1: TOP 10 FREQUENTLY SOLD ITEMS */}
                  {(favoritesSectionView === 'all' || favoritesSectionView === 'top_selling') && favoriteProducts.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs font-bold text-slate-200">
                            Top 10 Fast-Selling Items
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            (Ranked by Sales Frequency)
                          </span>
                        </div>
                        {favoritesSectionView === 'all' && recentlyAddedProducts.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setFavoritesSectionView('recently_added')}
                            className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Jump to Recently Added (5)</span>
                            <Clock className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* 10 Items Cards Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {favoriteProducts.map((p, index) => {
                          const isOutOfStock = p.stockQuantity <= 0;
                          const isLowStock = p.stockQuantity <= p.minStockAlert;
                          const unitsSold = salesCountMap[p.id] ?? (performanceMap[p.id]?.unitsSold ?? 0);
                          const cartItem = cart.find((item) => item.product.id === p.id);
                          const inCartQty = cartItem ? cartItem.quantity : 0;
                          const isSelected = selectedCartItemId === p.id;

                          return (
                            <button
                              key={`fav-card-${p.id}`}
                              type="button"
                              onClick={() => handleAddToCart(p)}
                              className={`text-left p-2.5 rounded-xl border transition flex flex-col justify-between group relative overflow-hidden active:scale-95 cursor-pointer shadow-sm select-none ${
                                isOutOfStock
                                  ? 'bg-slate-950/60 border-slate-800 opacity-60'
                                  : isSelected
                                  ? 'bg-sky-950/70 border-2 border-sky-400 ring-2 ring-sky-400/60 shadow-md shadow-sky-500/20'
                                  : inCartQty > 0
                                  ? 'bg-slate-950 border-amber-500/70 hover:border-amber-400 shadow-amber-500/5 ring-1 ring-amber-500/40'
                                  : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                              }`}
                              title={`Click to add 1x ${p.name} (${unitsSold} sold)`}
                            >
                              {/* Top Ribbon: Rank Badge (#1 - #10) & In-Cart Status */}
                              <div className="flex items-center justify-between gap-1 w-full mb-1">
                                <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                                  <span>#{index + 1}</span>
                                  {unitsSold > 0 && <span className="opacity-80 font-normal truncate max-w-[55px]">• {unitsSold} sold</span>}
                                </span>

                                {isSelected ? (
                                  <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded-full bg-sky-400 text-slate-950 border border-sky-200 shrink-0 animate-pulse">
                                    ● {inCartQty}
                                  </span>
                                ) : inCartQty > 0 ? (
                                  <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                                    ✓ {inCartQty}
                                  </span>
                                ) : isOutOfStock ? (
                                  <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 shrink-0">
                                    Out
                                  </span>
                                ) : isLowStock ? (
                                  <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 shrink-0">
                                    Low
                                  </span>
                                ) : null}
                              </div>

                              {/* Middle: Thumbnail & Product Name */}
                              <div className="flex items-center gap-2 my-1">
                                {p.imageUrl ? (
                                  <img
                                    src={p.imageUrl}
                                    alt={p.name}
                                    referrerPolicy="no-referrer"
                                    className="w-8 h-8 rounded-lg object-cover border border-slate-700/80 shrink-0"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                    <Package className="w-4 h-4 text-slate-500" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-white text-[11px] truncate leading-tight group-hover:text-amber-300 transition">
                                    {p.name}
                                  </p>
                                  <p className="text-[9px] text-slate-400 font-mono truncate">
                                    {p.category}
                                  </p>
                                </div>
                              </div>

                              {/* Bottom: Price in KSh & One-Click Add Indicator */}
                              <div className="flex items-center justify-between gap-1 mt-1 pt-1.5 border-t border-slate-800/80 w-full">
                                <span className="font-mono font-extrabold text-emerald-400 text-xs">
                                  KSh {p.sellingPrice.toLocaleString()}
                                </span>

                                <span className="text-[9px] font-bold text-slate-400 group-hover:text-white flex items-center gap-0.5 bg-slate-900 group-hover:bg-amber-500 group-hover:text-slate-950 px-1.5 py-0.5 rounded transition shadow-sm">
                                  <Plus className="w-2.5 h-2.5" /> Add
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SECTION 2: RECENTLY ADDED (5 Most Recently Created Products for Fast Access to New Inventory) */}
                  {(favoritesSectionView === 'all' || favoritesSectionView === 'recently_added') && recentlyAddedProducts.length > 0 && (
                    <div
                      id="pos-favorites-recently-added-section"
                      className="space-y-2 pt-2 border-t border-slate-800/80"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-white">
                              Recently Added
                            </span>
                            <span className="ml-2 text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1.5 py-0.2 rounded-full">
                              5 Newest Products
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                          Fast one-click access to new inventory
                        </span>
                      </div>

                      {/* 5 Recently Added Cards Grid: Responsive 2 on mobile, 3 on tablet, 5 on desktop */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {recentlyAddedProducts.map((p, index) => {
                          const isOutOfStock = p.stockQuantity <= 0;
                          const isLowStock = p.stockQuantity <= p.minStockAlert;
                          const cartItem = cart.find((item) => item.product.id === p.id);
                          const inCartQty = cartItem ? cartItem.quantity : 0;
                          const isSelected = selectedCartItemId === p.id;
                          const formattedDate = p.createdAt ? p.createdAt.slice(0, 10) : 'New Stock';

                          return (
                            <button
                              key={`recent-card-${p.id}`}
                              type="button"
                              onClick={() => handleAddToCart(p)}
                              className={`text-left p-2.5 rounded-xl border transition flex flex-col justify-between group relative overflow-hidden active:scale-95 cursor-pointer shadow-sm select-none ${
                                isOutOfStock
                                  ? 'bg-slate-950/60 border-slate-800 opacity-60'
                                  : isSelected
                                  ? 'bg-sky-950/70 border-2 border-sky-400 ring-2 ring-sky-400/60 shadow-md shadow-sky-500/20'
                                  : inCartQty > 0
                                  ? 'bg-slate-950 border-sky-500/70 hover:border-sky-400 shadow-sky-500/5 ring-1 ring-sky-500/40'
                                  : 'bg-slate-950 border-slate-800 hover:border-sky-500/50 hover:bg-slate-800/60'
                              }`}
                              title={`Click to add recently added item: ${p.name}`}
                            >
                              {/* Top Ribbon: NEW Badge with Date & In-Cart Status */}
                              <div className="flex items-center justify-between gap-1 w-full mb-1">
                                <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5 text-sky-400 animate-pulse" />
                                  <span>NEW #{index + 1}</span>
                                </span>

                                {isSelected ? (
                                  <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded-full bg-sky-400 text-slate-950 border border-sky-200 shrink-0 animate-pulse">
                                    ● {inCartQty}
                                  </span>
                                ) : inCartQty > 0 ? (
                                  <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                                    ✓ {inCartQty}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-mono text-slate-500 truncate max-w-[65px]">
                                    {formattedDate}
                                  </span>
                                )}
                              </div>

                              {/* Middle: Thumbnail & Product Name */}
                              <div className="flex items-center gap-2 my-1">
                                {p.imageUrl ? (
                                  <img
                                    src={p.imageUrl}
                                    alt={p.name}
                                    referrerPolicy="no-referrer"
                                    className="w-8 h-8 rounded-lg object-cover border border-slate-700/80 shrink-0"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                    <Package className="w-4 h-4 text-slate-500" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-white text-[11px] truncate leading-tight group-hover:text-sky-300 transition">
                                    {p.name}
                                  </p>
                                  <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono truncate">
                                    <span className="truncate">{p.category}</span>
                                    <span>•</span>
                                    <span className="text-slate-300">{p.stockQuantity} {p.unit}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Bottom: Price in KSh & One-Click Add Indicator */}
                              <div className="flex items-center justify-between gap-1 mt-1 pt-1.5 border-t border-slate-800/80 w-full">
                                <span className="font-mono font-extrabold text-emerald-400 text-xs">
                                  KSh {p.sellingPrice.toLocaleString()}
                                </span>

                                <span className="text-[9px] font-bold text-slate-400 group-hover:text-white flex items-center gap-0.5 bg-slate-900 group-hover:bg-sky-500 group-hover:text-slate-950 px-1.5 py-0.5 rounded transition shadow-sm">
                                  <Plus className="w-2.5 h-2.5" /> Add
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          </div>

          {/* Item List / Search Results Section (appears immediately below search bar when searching) */}
          <div className={`${searchTerm.trim() ? 'order-2' : 'order-3'} space-y-3`}>
          {/* Item List Quick Downward-Arrow Navigation Bar */}
          <div className="bg-slate-900/90 border border-slate-800 px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-bold">
              <Package className="w-3.5 h-3.5 text-sky-400" />
              <span>
                Item List ({filteredProducts.length}
                {filteredProducts.length > visibleProducts.length ? ` • showing top ${visibleProducts.length}` : ''})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleScrollPosListDown}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/35 text-sky-300 hover:text-white border border-sky-500/40 font-bold text-[11px] transition cursor-pointer"
                title="Scroll down item list"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Down</span>
              </button>
              <button
                type="button"
                onClick={handleScrollPosListBottom}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 font-bold text-[11px] transition cursor-pointer"
                title="Jump to bottom of item list"
              >
                <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Bottom</span>
              </button>
              <button
                type="button"
                onClick={handleScrollPosListTop}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 font-bold text-[11px] transition cursor-pointer"
                title="Back to top of item list"
              >
                <ArrowUp className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Top</span>
              </button>
            </div>
          </div>

          {/* Product Items Display (List Form vs Grid) — Capped to 25 rendered nodes + Show more */}
          {viewMode === 'list' ? (
            <div ref={posItemListRef} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-lg lg:flex-1 lg:min-h-0 lg:max-h-[calc(100vh-280px)] lg:overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="p-3">Item Name & SKU</th>
                    <th className="p-3">Category / Size</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-center">Stock</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {visibleProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">
                        {debouncedSearchTerm !== searchTerm
                          ? `Searching "${searchTerm}"...`
                          : `No items matching "${debouncedSearchTerm}".`}
                      </td>
                    </tr>
                  ) : (
                    visibleProducts.map((p) => (
                      <POSProductListRow
                        key={p.id}
                        product={p}
                        perf={performanceMap[p.id]}
                        inCartQty={cartQtyMap.get(p.id) || 0}
                        isSelected={selectedCartItemId === p.id}
                        onAddToCart={handleAddToCart}
                      />
                    ))
                  )}
                </tbody>
              </table>

              {filteredProducts.length > visibleProducts.length && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2.5 bg-slate-950/90 border-t border-slate-800 text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">
                    Showing <span className="text-white font-bold">{visibleProducts.length}</span> of{' '}
                    <span className="text-sky-400 font-bold">{filteredProducts.length}</span> matching items
                  </span>
                  <button
                    type="button"
                    id="btn-pos-show-more-results"
                    onClick={() => setVisibleResultsLimit((prev) => prev + SEARCH_RESULT_PAGE_SIZE)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span>
                      Show more ({Math.min(SEARCH_RESULT_PAGE_SIZE, filteredProducts.length - visibleProducts.length)} more)
                    </span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Product Cards Grid */
            <div ref={posItemListRef} className="grid grid-cols-2 sm:grid-cols-3 gap-3 content-start lg:flex-1 lg:max-h-[calc(100vh-280px)] lg:overflow-y-auto lg:pr-1">
              {visibleProducts.length === 0 ? (
                <div className="col-span-full py-10 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 p-6 space-y-2">
                  <Search className="w-7 h-7 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">
                    {debouncedSearchTerm !== searchTerm
                      ? `Searching "${searchTerm}"...`
                      : `No items matching "${debouncedSearchTerm}"`}
                  </p>
                  {debouncedSearchTerm === searchTerm && (
                    <p className="text-xs text-slate-500">Check spelling or try searching by SKU or Barcode</p>
                  )}
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-sky-400 hover:text-sky-300 bg-sky-950/60 border border-sky-900/60 px-3 py-1 rounded-lg"
                    >
                      <X className="w-3 h-3" />
                      <span>Clear Search</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {visibleProducts.map((p) => (
                    <POSProductGridCard
                      key={p.id}
                      product={p}
                      perf={performanceMap[p.id]}
                      inCartQty={cartQtyMap.get(p.id) || 0}
                      isSelected={selectedCartItemId === p.id}
                      onAddToCart={handleAddToCart}
                    />
                  ))}

                  {filteredProducts.length > visibleProducts.length && (
                    <div className="col-span-full flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs">
                      <span className="text-slate-400 font-mono text-[11px]">
                        Showing <span className="text-white font-bold">{visibleProducts.length}</span> of{' '}
                        <span className="text-sky-400 font-bold">{filteredProducts.length}</span> matching items
                      </span>
                      <button
                        type="button"
                        id="btn-pos-show-more-results-grid"
                        onClick={() => setVisibleResultsLimit((prev) => prev + SEARCH_RESULT_PAGE_SIZE)}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <span>
                          Show more ({Math.min(SEARCH_RESULT_PAGE_SIZE, filteredProducts.length - visibleProducts.length)} more)
                        </span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          </div>

        </div>

        {/* RIGHT 5 COLS: POS RECEIPT CART & CHECKOUT PANEL (DESKTOP ONLY) */}
        <div
          className={
            inPhoneFrame
              ? 'hidden'
              : 'lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4 hidden lg:block'
          }
        >
          {renderCartPanel()}
        </div>
      </div>

      {/* COMPACT FLOATING CART PILL (COLLAPSED STATE): Hidden when cart is empty OR during active mobile search */}
      {(() => {
        if (cart.length === 0 || isMobileSearchActive || mobileTab === 'cart') return null;
        const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
        const pillMarkup = (
          <div
            className={
              inPhoneFrame
                ? 'pointer-events-auto absolute bottom-[7.5rem] left-3 right-3 z-40'
                : 'lg:hidden fixed bottom-[7.5rem] left-3 right-3 z-40'
            }
          >
            <button
              type="button"
              id="btn-mobile-floating-cart-pill"
              onClick={() => setMobileTab('cart')}
              className="w-full bg-slate-800/95 hover:bg-slate-800 backdrop-blur-md border border-slate-700 hover:border-sky-500/70 rounded-2xl px-3.5 py-2.5 shadow-2xl shadow-black/80 flex items-center justify-between gap-2 transition active:scale-[0.99] cursor-pointer"
            >
              {/* Left: Cart icon + item count badge */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span className="bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded-lg text-xs font-mono font-black">
                  {totalUnits} {totalUnits === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Center: Total amount in bold cyan/green */}
              <div className="text-sm font-black font-mono text-emerald-400 truncate px-1">
                KSh {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>

              {/* Right: View Cart ^ expand button */}
              <span className="inline-flex items-center gap-1 bg-sky-600 text-white text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-sm shrink-0">
                <span>View Cart</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </span>
            </button>
          </div>
        );

        return inPhoneFrame && phoneOverlayRoot ? createPortal(pillMarkup, phoneOverlayRoot) : pillMarkup;
      })()}

      {/* EXPANDABLE SLIDE-UP MOBILE SELLING CART BOTTOM SHEET (EXPANDED STATE) */}
      {(() => {
        if (mobileTab !== 'cart') return null;
        const drawerMarkup = (
          <div
            className={
              inPhoneFrame
                ? 'pointer-events-auto absolute inset-0 z-[110] flex flex-col justify-end bg-slate-950/75 backdrop-blur-sm animate-fade-in'
                : 'lg:hidden fixed inset-0 z-[110] flex flex-col justify-end bg-slate-950/75 backdrop-blur-sm animate-fade-in'
            }
            onClick={() => setMobileTab('catalog')}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="rounded-t-2xl bg-slate-900 border-t border-slate-700 shadow-2xl w-full max-h-[90dvh] flex flex-col text-slate-100 overflow-hidden"
            >
              {/* Drag indicator handle */}
              <div className="pt-2 pb-1 flex justify-center shrink-0">
                <span className="w-10 h-1 rounded-full bg-slate-700" />
              </div>

              {/* Scrollable Receipt Order Cart Body */}
              <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-1.5 pb-6">
                {renderCartPanel()}
              </div>
            </div>
          </div>
        );

        return inPhoneFrame && phoneOverlayRoot ? createPortal(drawerMarkup, phoneOverlayRoot) : drawerMarkup;
      })()}

      {/* MODAL 1: CHECKOUT & MULTI-PAYMENT / PARTIAL PAYMENT */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-200 text-base">Complete Payment</h3>
                <p className="text-xs text-slate-400">Multi-payment mode & partial payments allowed</p>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Offline Checkout Notice */}
            {!isOnline && (
              <div
                role="status"
                aria-live="polite"
                className="bg-amber-500/15 border-b-2 border-amber-500/40 px-4 py-2.5 text-amber-300 text-xs font-semibold flex items-center gap-2.5"
              >
                <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                <div>
                  <span className="font-extrabold text-amber-200 mr-1.5">You are currently offline:</span>
                  <span>
                    Any actions performed will only sync once a stable connection is re-established.
                  </span>
                </div>
              </div>
            )}

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Grand Total Summary Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Total Bill Amount</div>
                  <div className="text-2xl font-extrabold text-sky-400 font-mono">KSh {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  {txSettings.enableTransactionWiseTax && kraTaxModeSetting !== 'none' && (
                    <div className="text-[11px] text-amber-400 font-mono mt-0.5">
                      {kraTaxModeSetting === 'vat'
                        ? `Incl. Standard Tax (16%): KSh ${(exclusiveVatAddOn > 0 ? exclusiveVatAddOn : grandTotal - grandTotal / 1.16).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : `Incl. Turnover Levy (1.5%): KSh ${(grandTotal * 0.015).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </div>
                  )}
                </div>
                <div className="text-right text-xs space-y-1">
                  <div>
                    <span className="text-slate-400">Customer: </span>
                    <span className="font-semibold text-slate-200">{selectedCustomer.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Sales Rep: </span>
                    <span className="font-semibold text-indigo-300">{selectedSalesRep.name}</span>
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400 font-bold">
                    Rep Commission: KSh {currentCartComm.amount.toLocaleString()} ({currentCartComm.modelDescription})
                  </div>
                </div>
              </div>

              {/* Payment Methods Rows */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
                  <span>Payment Breakdown</span>
                  <button onClick={addPaymentRow} className="text-sky-400 hover:underline flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add Split Method
                  </button>
                </div>

                {paymentEntries.map((p, idx) => (
                  <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <select
                        value={p.method}
                        onChange={(e) => updatePaymentRow(idx, 'method', e.target.value as PaymentMethod)}
                        className="bg-slate-900 border border-slate-700 text-slate-200 text-xs p-2 rounded-lg focus:outline-none capitalize font-semibold"
                      >
                        <option value="mpesa">📱 M-Pesa</option>
                        <option value="cash">💵 Cash</option>
                        <option value="credit_card">💳 Credit Card</option>
                        <option value="cheque">📜 Cheque</option>
                        <option value="upi">📲 Mobile Bank Transfer</option>
                      </select>

                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">KSh</span>
                        <input
                          type="number"
                          step="1"
                          placeholder="Amount"
                          value={p.amount === 0 ? '' : (p.amount ?? '')}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => updatePaymentRow(idx, 'amount', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 pl-9 pr-2 py-2 rounded-lg font-mono focus:outline-none focus:border-sky-500 text-xs font-bold"
                        />
                      </div>

                      {paymentEntries.length > 1 && (
                        <button onClick={() => removePaymentRow(idx)} className="p-2 hover:bg-slate-800 text-rose-400 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Reference info for cheque / M-Pesa / UPI */}
                    {['cheque', 'mpesa', 'upi', 'credit_card'].includes(p.method) && (
                      <input
                        type="text"
                        placeholder={`Reference / M-Pesa Code / Auth # for ${p.method.toUpperCase()}`}
                        value={p.reference || ''}
                        onChange={(e) => updatePaymentRow(idx, 'reference', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-mono focus:outline-none"
                      />
                    )}

                    {p.method === 'mpesa' && (
                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          id={`btn-prompt-mpesa-row-${idx}`}
                          onClick={() => {
                            setMpesaPromptAmount(Number(p.amount) || grandTotal);
                            setMpesaActiveRowIndex(idx);
                            setIsDirectMpesaCheckout(false);
                            setShowMpesaPromptModal(true);
                          }}
                          className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold py-2 px-3 rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-emerald-200" />
                          <span>Prompt Customer M-PESA Phone (STK Push)</span>
                        </button>
                        {p.reference && (
                          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/80 px-2 py-1.5 rounded-lg flex items-center gap-1 shrink-0 font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> STK Verified
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Discount during Payment & Link Payments */}
              {(txSettings.discountDuringPayment || txSettings.linkPaymentsToInvoices) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                  {txSettings.discountDuringPayment && (
                    <div>
                      <label className="text-[11px] text-amber-300 font-semibold block mb-1">
                        Discount During Payment (KSh)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={paymentDiscountAmount === 0 ? '' : paymentDiscountAmount}
                        onChange={(e) =>
                          setPaymentDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))
                        }
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                  {txSettings.linkPaymentsToInvoices && (
                    <div>
                      <label className="text-[11px] text-sky-300 font-semibold block mb-1">
                        Link Payment to Invoice # (Optional)
                      </label>
                      <input
                        type="text"
                        value={linkedInvoiceRef}
                        onChange={(e) => setLinkedInvoiceRef(e.target.value)}
                        placeholder="e.g. INV-20261120-104"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Payment Math Summary */}
              {(() => {
                const totalPaid = paymentEntries.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                const balanceDue = grandTotal - totalPaid;

                return (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-400">
                      <span>Total Paid Now:</span>
                      <span className="font-mono font-bold text-slate-200">KSh {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    {balanceDue > 0 ? (
                      <div className="flex justify-between text-amber-400 font-bold bg-amber-950/40 p-2 rounded-lg border border-amber-800/60">
                        <span>Remaining Balance (Added to Customer Credit):</span>
                        <span className="font-mono">KSh {balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    ) : balanceDue < 0 ? (
                      <div className="flex justify-between text-emerald-400 font-bold bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/60">
                        <span>Change to Return to Customer:</span>
                        <span className="font-mono">KSh {Math.abs(balanceDue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-emerald-400 font-semibold">
                        <span>Status:</span>
                        <span>Fully Paid</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Custom Mobile-Optimized Date Selector */}
              {renderMobileDateSelector()}

              {/* Billing Name, Customer PO Details, Due Date/Terms, Transport & Additional Fields */}
              {(txSettings.enableBillingPartyName ||
                txSettings.enableCustomerPoDetails ||
                txSettings.dueDatesPaymentTerms.enabled ||
                txSettings.transportationDetails.enabled ||
                txSettings.additionalFields.enabled) && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3 text-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Invoice &amp; Dispatch Details
                  </div>

                  {txSettings.enableBillingPartyName && (
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Billing Name of Party / Business
                      </label>
                      <input
                        type="text"
                        value={billingPartyName}
                        onChange={(e) => setBillingPartyName(e.target.value)}
                        placeholder={`Optional billing name (defaults to ${selectedCustomer.name})`}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  {txSettings.enableCustomerPoDetails && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Customer PO Number</label>
                        <input
                          type="text"
                          value={customerPoNumber}
                          onChange={(e) => setCustomerPoNumber(e.target.value)}
                          placeholder="e.g. LPO-9942"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Customer PO Date</label>
                        <input
                          type="date"
                          value={customerPoDate}
                          onChange={(e) => setCustomerPoDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                        />
                      </div>
                    </div>
                  )}

                  {txSettings.dueDatesPaymentTerms.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Payment Terms</label>
                        <input
                          type="text"
                          value={paymentTermsInput}
                          onChange={(e) => setPaymentTermsInput(e.target.value)}
                          placeholder="Net 15 Days"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Invoice Due Date</label>
                        <input
                          type="date"
                          value={dueDateInput}
                          onChange={(e) => setDueDateInput(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                        />
                      </div>
                    </div>
                  )}

                  {txSettings.transportationDetails.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Transport Mode</label>
                        <input
                          type="text"
                          value={transportMode}
                          onChange={(e) => setTransportMode(e.target.value)}
                          placeholder="Boda Boda / Matatu"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">
                          {txSettings.transportationDetails.driverLabel}
                        </label>
                        <input
                          type="text"
                          value={transportDriverName}
                          onChange={(e) => setTransportDriverName(e.target.value)}
                          placeholder="Driver name"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">
                          {txSettings.transportationDetails.vehicleLabel}
                        </label>
                        <input
                          type="text"
                          value={transportVehicleRef}
                          onChange={(e) => setTransportVehicleRef(e.target.value)}
                          placeholder="KMFZ 123X"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                        />
                      </div>
                    </div>
                  )}

                  {txSettings.additionalFields.enabled &&
                    txSettings.additionalFields.fields
                      .filter((f) => f.enabled)
                      .map((f) => (
                        <div key={f.id}>
                          <label className="text-[11px] text-slate-400 block mb-1">{f.label}</label>
                          <input
                            type="text"
                            value={additionalFieldsValues[f.id] ?? f.defaultValue ?? ''}
                            onChange={(e) =>
                              setAdditionalFieldsValues((prev) => ({
                                ...prev,
                                [f.id]: e.target.value,
                              }))
                            }
                            placeholder={`Enter ${f.label}...`}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                      ))}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">Order Notes / Remark</label>
                <input
                  type="text"
                  placeholder="Optional order notes (e.g. Forgotten sale recorded retroactively)..."
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none"
                />
              </div>

              {/* Automated Transaction Summary SMS Option */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                  <input
                    type="checkbox"
                    checked={autoSmsSummary}
                    onChange={(e) => {
                      setAutoSmsSummary(e.target.checked);
                      setAutoSmsEnabled(e.target.checked);
                    }}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                  />
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Auto-send SMS transaction summary upon completion</span>
                  </span>
                </label>
                <span className="text-[10px] font-mono text-indigo-300">
                  {selectedCustomer.phone && selectedCustomer.phone !== 'N/A'
                    ? selectedCustomer.phone
                    : 'Customer phone required'}
                </span>
              </div>

              {/* Optional Tax / Fiscal Invoice Toggle */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                    <input
                      type="checkbox"
                      checked={isEtimsRequested}
                      onChange={(e) => setIsEtimsRequested(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                    />
                    <span className="flex items-center gap-1.5">
                      <ReceiptText className="w-3.5 h-3.5 text-amber-400" />
                      <span>Include Tax Invoice Details (Optional)</span>
                    </span>
                  </label>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isEtimsRequested
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isEtimsRequested ? 'Tax Invoice Active' : 'Standard Receipt'}
                  </span>
                </div>

                {isEtimsRequested ? (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">Buyer Tax PIN (Optional):</span>
                    <input
                      type="text"
                      placeholder="Optional buyer Tax PIN"
                      value={customerKraPin}
                      onChange={(e) => setCustomerKraPin(e.target.value.toUpperCase())}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 pl-6 leading-tight">
                    Standard customer receipt. Optional sales tax / levy rules can be configured anytime in Settings.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setMpesaPromptAmount(grandTotal);
                  setMpesaActiveRowIndex(0);
                  setIsDirectMpesaCheckout(false);
                  setShowMpesaPromptModal(true);
                }}
                className="bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/50 text-emerald-300 font-bold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>M-Pesa STK Push</span>
              </button>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setShowCheckoutModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-finalize-sale"
                  onClick={() => handleFinalizeSale()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" /> Complete Sale & Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW CUSTOMER */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-[125] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-200">Add New Customer</h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hidden file input for contact import */}
            <input
              ref={posCustVcfInputRef}
              type="file"
              accept=".vcf,.vcard,.csv,.txt,text/vcard,text/csv,text/plain"
              onChange={handlePOSVcfUpload}
              className="hidden"
            />

            {/* Quick Phonebook Contact Picker Banner */}
            <div className="p-2.5 bg-sky-950/40 border border-sky-900/60 rounded-xl flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-300">
                In your phone contacts?
              </span>
              <button
                type="button"
                onClick={handlePickPhoneContactForPOS}
                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                title="Auto-fill name, phone, and email from device contacts file or phone book"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>📱 Pick from Phone Book / File</span>
              </button>
            </div>

            {custPhonebookNotice && (
              <div className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-900 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>{custPhonebookNotice}</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Phone Number (For SMS / WhatsApp)</label>
                <input
                  type="text"
                  placeholder="e.g. +1 555-0199 or +254 700..."
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. john@example.com"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl">
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: BARCODE SCANNER CAMERA MODAL */}
      {showScanner && (
        <BarcodeScannerModal
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
          sampleBarcodes={products.map((p) => ({ name: `${p.name} (KSh ${p.sellingPrice.toLocaleString()})`, barcode: p.barcode }))}
          products={products}
          onSwitchToAiScanner={() => setShowAiReceiptScanner(true)}
          title="Quick Scan — Barcode & QR Scanner"
          subtitle="Scan any product barcode or QR code to add it directly to the current transaction"
        />
      )}

      {/* MODAL: AI MULTIMODAL RECEIPT SCANNER */}
      {showAiReceiptScanner && (
        <AiReceiptScannerModal
          products={products}
          categories={categories}
          onAddItemsToReceipt={handleAddMultipleToCart}
          onAddNewProduct={handleAddNewProductFromAiReceipt}
          onBatchAddNewProducts={handleBatchAddNewProductsFromAiReceipt}
          onClose={() => setShowAiReceiptScanner(false)}
        />
      )}

      {/* MODAL 4: COMPLETED SALE RECEIPT PREVIEW */}
      {completedTx && (
        <ReceiptModal
          transaction={completedTx}
          storeName={resolvedStoreName}
          activeStoreId={activeStoreId}
          storeKraPin={storeKraPin}
          onClose={() => {
            setCompletedTx(null);
            executeNewSale();
          }}
        />
      )}

      {/* MODAL: CONFIRM START NEW SALE WHEN CART NOT EMPTY */}
      {showNewSaleConfirmModal && (
        <div className="fixed inset-0 z-[125] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-xl">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-100 text-base">Start New Sale?</h3>
                <p className="text-xs text-slate-400">Confirm clearing the current receipt</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              You currently have <strong className="text-white">{cart.reduce((s, i) => s + i.quantity, 0)} item(s)</strong> in the cart with a subtotal of{' '}
              <strong className="text-emerald-400 font-mono">
                KSh {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </strong>
              .
            </p>
            <p className="text-[11px] text-slate-400">
              Starting a new sale will discard this cart and reset customer selection and discounts for the next transaction.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowNewSaleConfirmModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition"
              >
                Keep Current Cart
              </button>
              <button
                type="button"
                id="btn-confirm-start-new-sale"
                onClick={executeNewSale}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/25 transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Clear & Start New Sale</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: ADMIN DISCOUNT AUTHORIZATION PIN MODAL */}
      {showAdminDiscountAuthModal && (
        <div className="fixed inset-0 z-[125] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden text-slate-100">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-slate-100">Admin Discount Authorization</h3>
              </div>
              <button
                onClick={() => setShowAdminDiscountAuthModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyAdminPinForDiscount} className="p-5 space-y-4">
              <div className="bg-amber-950/30 border border-amber-900/50 p-3 rounded-xl text-xs text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Security Policy Enforcement:
                </p>
                <p className="text-[11px] text-slate-300">
                  Only store Administrators can authorize price discounts on sales. Please enter an Admin 4-Digit Security PIN.
                </p>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Select Store Administrator</label>
                <select
                  value={selectedAdminId}
                  onChange={(e) => setSelectedAdminId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  {adminUsers.length === 0 ? (
                    <option value="usr-1">John Doe (Admin)</option>
                  ) : (
                    adminUsers.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.role})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Enter Admin 4-Digit Security PIN *</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-slate-950 border border-slate-800 text-center tracking-widest text-lg font-mono font-bold rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
                <p className="text-[10px] text-slate-500 mt-1 text-center">Manager or Admin authorization required</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-slate-300 font-semibold">
                    Discount Type:
                  </label>
                  <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSupervisorDiscountMode('fixed')}
                      className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
                        supervisorDiscountMode === 'fixed' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Banknote className="w-3 h-3" />
                      <span>Manual KSh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSupervisorDiscountMode('percentage')}
                      className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
                        supervisorDiscountMode === 'percentage' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Percent className="w-3 h-3" />
                      <span>Percentage %</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono font-bold">
                    {supervisorDiscountMode === 'fixed' ? 'KSh' : '%'}
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={supervisorDiscountMode === 'percentage' ? 100 : itemsSubtotal}
                    value={tempDiscountVal === 0 ? '' : (tempDiscountVal || '')}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setTempDiscountVal(e.target.value === '' ? ('' as any) : Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder={supervisorDiscountMode === 'fixed' ? 'e.g. 200' : 'e.g. 10'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-3 py-2 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[10px] text-slate-500 font-medium">Quick Presets:</span>
                  {supervisorDiscountMode === 'fixed' ? (
                    [50, 100, 200, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTempDiscountVal(amt)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition border ${
                          tempDiscountVal === amt
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                            : 'bg-slate-950 hover:bg-amber-950 border-slate-800 hover:border-amber-700 text-slate-300 hover:text-amber-300'
                        }`}
                      >
                        -KSh {amt}
                      </button>
                    ))
                  ) : (
                    [5, 10, 15, 20, 25].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setTempDiscountVal(pct)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition border ${
                          tempDiscountVal === pct
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                            : 'bg-slate-950 hover:bg-amber-950 border-slate-800 hover:border-amber-700 text-slate-300 hover:text-amber-300'
                        }`}
                      >
                        {pct}% off
                      </button>
                    ))
                  )}
                </div>

                {/* Live Preview Box */}
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 mt-3 space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Items Subtotal:</span>
                    <span>KSh {itemsSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-amber-400 font-bold">
                    <span>
                      Authorized Discount {supervisorDiscountMode === 'fixed' ? '(Manual KSh)' : `(${tempDiscountVal}%)`}:
                    </span>
                    <span>
                      -KSh{' '}
                      {(supervisorDiscountMode === 'percentage'
                        ? Math.round((tempDiscountVal / 100) * itemsSubtotal)
                        : tempDiscountVal
                      ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-white font-extrabold border-t border-slate-800 pt-1">
                    <span>Payable Total:</span>
                    <span className="text-sky-400">
                      KSh{' '}
                      {Math.max(
                        0,
                        itemsSubtotal -
                          (supervisorDiscountMode === 'percentage'
                            ? Math.round((tempDiscountVal / 100) * itemsSubtotal)
                            : tempDiscountVal)
                      ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {adminAuthError && (
                <div className="bg-rose-950/60 border border-rose-800 text-rose-300 text-xs p-2.5 rounded-xl font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{adminAuthError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminDiscountAuthModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-amber-600/30 flex items-center justify-center gap-1"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authorize Discount</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: M-PESA EXPRESS STK PUSH PROMPT MODAL */}
      <MpesaPromptModal
        isOpen={showMpesaPromptModal}
        onClose={() => setShowMpesaPromptModal(false)}
        amount={mpesaPromptAmount || grandTotal}
        initialPhone={
          selectedCustomer.phone && selectedCustomer.phone !== 'N/A' ? selectedCustomer.phone : ''
        }
        customerName={selectedCustomer.name}
        accountReference={`POS-${cart.length > 0 ? (cart[0].product.sku || 'ITEM').slice(0, 8) : 'SALE'}`}
        onPaymentSuccess={handleMpesaPromptSuccess}
        onAutoFinalizeSale={isDirectMpesaCheckout ? handleMpesaDirectFinalize : undefined}
      />

      {/* MODAL 6: AUTOMATED TRANSACTION SUMMARY SMS DELIVERY LOGS */}
      <SmsDeliveryLogsModal
        isOpen={showSmsLogsModal}
        onClose={() => setShowSmsLogsModal(false)}
      />

      {/* MODAL 7: KRA TURNOVER TAX (TOT) & E-TIMS COMPLIANCE CENTER */}
      {showKraTotModal && (
        <div className="fixed inset-0 z-[125] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                  TAX
                </span>
                <h3 className="font-extrabold text-base text-white">
                  Sales Tax &amp; Levy Summary Center
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowKraTotModal(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <KraTotComplianceCenter
              transactions={transactions || []}
              onClose={() => setShowKraTotModal(false)}
            />
          </div>
        </div>
      )}

      {/* SALES REP MODAL */}
      {showRepModal && (
        <div className="fixed inset-0 z-[125] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                <User className="w-4 h-4 text-sky-400" /> Select Attributing Sales Rep
              </h4>
              <button
                type="button"
                onClick={() => setShowRepModal(false)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {allUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedSalesRepId(u.id);
                    setShowRepModal(false);
                  }}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                    selectedSalesRepId === u.id
                      ? 'bg-sky-950/60 border-sky-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs">{u.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{u.role}</div>
                  </div>
                  {selectedSalesRepId === u.id && (
                    <span className="text-xs bg-sky-600 text-white font-bold px-2 py-0.5 rounded-full">Active</span>
                  )}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowRepModal(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
