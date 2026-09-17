import React, { useState, useEffect } from 'react';
import {
  Search,
  Scan,
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
  X,
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
  Zap,
  Gem,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { Product, CartItem, Customer, PaymentMethod, PaymentBreakdown, Transaction, User as Employee, BarcodeScanLog } from '../../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ReceiptModal } from './ReceiptModal';
import { computeProductsPerformance, ProductPerformanceInfo } from '../../utils/salesPerformance';

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
}) => {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [performanceFilter, setPerformanceFilter] = useState<'All' | 'high_sales_high_profit' | 'low_sales' | 'high_sales_low_profit' | 'low_sales_high_profit'>('All');

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

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(customers[0] || { id: 'cust-1', name: 'Walk-in Customer', phone: 'N/A', totalPurchases: 0, currentBalanceDue: 0 });
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0); // e.g. 0% by default or configurable

  // Admin Discount Authorization State ("Only admin can give discount")
  const adminUsers = allUsers.filter((u) => u.role === 'Admin');
  const [discountAuthorizedBy, setDiscountAuthorizedBy] = useState<string | null>(
    currentUser.role === 'Admin' ? `${currentUser.name} (Admin)` : null
  );
  const [showAdminDiscountAuthModal, setShowAdminDiscountAuthModal] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string>(adminUsers[0]?.id || '');
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [adminAuthError, setAdminAuthError] = useState<string>('');
  const [tempDiscountVal, setTempDiscountVal] = useState<number>(100);

  // Sales Representative Attributed to this Sale (defaults to current logged-in user)
  const [selectedSalesRepId, setSelectedSalesRepId] = useState<string>(currentUser.id);
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
        const itemProfit = ((item.product.sellingPrice || item.unitPrice) - (item.product.costPrice || 0)) * item.quantity;
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
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showNewSaleConfirmModal, setShowNewSaleConfirmModal] = useState(false);
  const [posNotice, setPosNotice] = useState<{ message: string; type: 'success' | 'warning' | 'info' } | null>(null);

  // Core New Sale Action Execution
  const executeNewSale = () => {
    setCart([]);
    setSelectedCustomer(customers[0] || { id: 'cust-1', name: 'Walk-in Customer', phone: 'N/A', totalPurchases: 0, currentBalanceDue: 0 });
    setDiscountAmount(0);
    if (currentUser.role !== 'Admin') {
      setDiscountAuthorizedBy(null);
    }
    setSearchTerm('');
    setSelectedCategory('All');
    setShowCheckoutModal(false);
    setShowNewSaleConfirmModal(false);
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

  // Payment Breakdown State for Partial Payments
  const [paymentEntries, setPaymentEntries] = useState<PaymentBreakdown[]>([
    { method: 'cash', amount: 0, reference: '' }
  ]);
  const [saleNotes, setSaleNotes] = useState('');
  const [saleDate, setSaleDate] = useState<string>('');

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

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;

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

    return matchesSearch && matchesCat && matchesPerf;
  });

  // Add Item to Cart
  const handleAddToCart = (product: Product) => {
    if (product.stockQuantity <= 0) {
      alert(`Out of stock! ${product.name} currently has 0 items.`);
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        if (existing.quantity >= product.stockQuantity) {
          alert(`Cannot add more than available stock (${product.stockQuantity} pcs).`);
          return prev;
        }
        const updated = [...prev];
        const newQty = existing.quantity + 1;
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          total: (existing.unitPrice - existing.discount) * newQty
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
            total: product.sellingPrice
          }
        ];
      }
    });
  };

  // Barcode Scanned Handler
  const handleBarcodeScan = (barcode: string) => {
    const found = products.find((p) => p.barcode === barcode || p.sku.toLowerCase() === barcode.toLowerCase());
    
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
        deviceType: 'barcode_gun',
        actionTaken: found ? 'added_to_cart' : 'lookup_failed',
        notes: found ? `Scanned at POS checkout: added to cart` : `Barcode not found in catalog`,
      });
    }

    if (found) {
      handleAddToCart(found);
      setShowScanner(false);
    } else {
      alert(`No product found with barcode/SKU: ${barcode}`);
    }
  };

  // Cart Qty updates
  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.stockQuantity) {
              alert(`Stock limit reached (${item.product.stockQuantity} available).`);
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
  };

  // Calculate Subtotals & Totals
  const numDiscount = parseFloat(String(discountAmount)) || 0;
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const taxTotal = (subtotal - numDiscount) * (taxRate / 100);
  const grandTotal = Math.max(0, subtotal - numDiscount + taxTotal);

  const currentCartComm = calculateWorkerCommission(selectedSalesRep, grandTotal, cart);
  const repTodayComm = repTodayTx.reduce((sum, tx) => {
    return sum + (tx.cashierCommissionAmount || Math.round(tx.grandTotal * ((tx.cashierCommissionRate || 5) / 100)));
  }, 0);

  // Open Checkout Modal
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    // Default single payment entry to total amount
    setPaymentEntries([{ method: 'cash', amount: grandTotal, reference: '' }]);
    // Default sale date to current local date/time string for input[type="datetime-local"]
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
    setSaleDate(localISOTime);
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

  // Admin Discount PIN verification handler
  const handleVerifyAdminPinForDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError('');

    // Check if entered pin matches any admin user
    const matchedAdmin = allUsers.find(
      (u) => u.role === 'Admin' && u.pin === adminPinInput.trim()
    );

    if (matchedAdmin) {
      setDiscountAuthorizedBy(`${matchedAdmin.name} (Admin)`);
      setDiscountAmount(tempDiscountVal > 0 ? tempDiscountVal : 0);
      setShowAdminDiscountAuthModal(false);
      setAdminPinInput('');
    } else {
      setAdminAuthError('Invalid Admin Security PIN! Only Store Administrators can authorize discounts.');
    }
  };

  // Process Final Sale
  const handleFinalizeSale = () => {
    const totalPaid = paymentEntries.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const balanceDue = Math.max(0, grandTotal - totalPaid);
    let paymentStatus: 'Paid' | 'Partial' | 'Unpaid' = 'Paid';

    if (totalPaid === 0) {
      paymentStatus = 'Unpaid';
    } else if (balanceDue > 0) {
      paymentStatus = 'Partial';
    }

    const receiptNo = `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;

    const currentCommRate = currentCartComm.rate;
    const currentCommAmount = currentCartComm.amount;

    const finalTxDate = saleDate ? new Date(saleDate).toISOString() : new Date().toISOString();

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      receiptNumber: receiptNo,
      date: finalTxDate,
      items: [...cart],
      subtotal,
      discountTotal: numDiscount,
      discountAuthorizedBy: numDiscount > 0 ? (discountAuthorizedBy || `${currentUser.name} (Admin)`) : undefined,
      taxTotal,
      grandTotal,
      amountPaid: totalPaid,
      balanceDue,
      paymentStatus,
      payments: paymentEntries
        .map((p) => ({ ...p, amount: Number(p.amount) || 0 }))
        .filter((p) => p.amount > 0),
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      cashierName: currentUser.name,
      cashierId: currentUser.id,
      salesRepId: selectedSalesRep.id,
      salesRepName: selectedSalesRep.name,
      cashierCommissionRate: currentCommRate,
      cashierCommissionAmount: currentCommAmount,
      commissionModelApplied: currentCartComm.modelDescription,
      notes: saleNotes
    };

    // Update Product Stock Levels
    const updatedProducts = products.map((prod) => {
      const cartMatch = cart.find((c) => c.product.id === prod.id);
      if (cartMatch) {
        return {
          ...prod,
          stockQuantity: Math.max(0, prod.stockQuantity - cartMatch.quantity),
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

    onCompleteSale(newTx, updatedProducts, updatedCustomers);
    setShowCheckoutModal(false);
    setCart([]);
    setDiscountAmount(0);
    if (currentUser.role !== 'Admin') {
      setDiscountAuthorizedBy(null);
    }
    setCompletedTx(newTx);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 7 COLS: PRODUCT CATALOG & SEARCH */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search bar, Barcode Scanner, View Toggle & New Sale Button */}
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-md flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products by Name, SKU, or Barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Prominent New Sale Button in Catalog Header */}
            <button
              id="btn-pos-new-sale-catalog"
              onClick={handleTriggerNewSale}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-600/25 shrink-0"
              title="Start a fresh new sale (clears cart)"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Sale</span>
            </button>

            {/* Grid / List View Toggle */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="List Form View (Compact table for 300+ items)"
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'list' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Grid Cards View"
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <button
              id="btn-pos-scan-barcode"
              onClick={() => setShowScanner(true)}
              className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-sky-600/20 shrink-0"
            >
              <Scan className="w-4 h-4" />
              <span className="hidden sm:inline">Scan</span>
            </button>
          </div>

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
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition ${
                selectedCategory === 'All'
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              All Items ({products.length})
            </button>
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

          {/* Product Items Display (List Form vs Grid) */}
          {viewMode === 'list' ? (
            /* High-density Tabular List Form for 300+ items */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg max-h-[calc(100vh-280px)] overflow-y-auto">
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
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">
                        No items matching "{searchTerm}".
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isLowStock = p.stockQuantity <= p.minStockAlert;
                      const isOutOfStock = p.stockQuantity <= 0;
                      const perf = performanceMap[p.id];

                      return (
                        <tr
                          key={p.id}
                          onClick={() => handleAddToCart(p)}
                          className={`hover:bg-slate-800/70 transition cursor-pointer group ${perf ? perf.accentBorderLeft : ''} ${perf ? perf.tableRowHighlight : ''}`}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0 shadow-sm"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                                  <Package className="w-5 h-5 text-slate-600" />
                                </div>
                              )}
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-100 group-hover:text-sky-300 transition text-xs">
                                    {p.name}
                                  </span>

                                  {/* Performance Velocity & Margin Badge */}
                                  {perf && perf.tier !== 'unranked_no_sales' && (
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border shadow-sm ${perf.badgeBg} ${perf.badgeText} ${perf.badgeBorder}`}
                                      title={perf.description}
                                    >
                                      {perf.tier === 'high_sales_high_profit' && <Star className="w-3 h-3 fill-emerald-400 text-emerald-400 shrink-0" />}
                                      {perf.tier === 'low_sales_low_profit' && <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />}
                                      {perf.tier === 'high_sales_low_profit' && <Zap className="w-3 h-3 text-sky-400 shrink-0" />}
                                      {perf.tier === 'low_sales_high_profit' && <Gem className="w-3 h-3 text-purple-400 shrink-0" />}
                                      <span>{perf.tierLabel}</span>
                                      <span className="font-mono opacity-85">({perf.unitsSold} sold • {perf.marginPercent.toFixed(0)}% profit)</span>
                                    </span>
                                  )}
                                  {perf && perf.tier === 'unranked_no_sales' && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-slate-800/80 text-slate-400 border border-slate-700">
                                      0 sold
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  SKU: {p.sku} | Barcode: {p.barcode}
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
                            KSh {p.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                                handleAddToCart(p);
                              }}
                              disabled={isOutOfStock}
                              className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 ml-auto"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Product Cards Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const isLowStock = p.stockQuantity <= p.minStockAlert;
                const isOutOfStock = p.stockQuantity <= 0;
                const perf = performanceMap[p.id];

                return (
                  <div
                    key={p.id}
                    onClick={() => handleAddToCart(p)}
                    className={`group border rounded-2xl p-3 transition flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                      perf ? perf.cardBorder : 'border-slate-800'
                    } ${perf ? perf.cardGlow : ''} ${
                      isOutOfStock
                        ? 'opacity-60 bg-slate-950/40'
                        : isLowStock
                        ? 'bg-slate-900/90'
                        : 'bg-slate-900 hover:bg-slate-800/80'
                    }`}
                  >
                    <div>
                      {/* Performance Velocity & Margin Ribbon */}
                      {perf && (
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border tracking-wide shadow-sm ${perf.badgeBg} ${perf.badgeText} ${perf.badgeBorder}`}
                            title={perf.description}
                          >
                            {perf.tier === 'high_sales_high_profit' && <Star className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400 shrink-0" />}
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

                      {/* Product Image Thumbnail */}
                      <div className="w-full h-24 mb-2 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
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

                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] text-sky-400 font-mono uppercase font-semibold truncate">
                          {p.category}
                        </span>
                        {p.sizeCapacity && (
                          <span className="bg-slate-800 text-slate-300 text-[9px] px-1.5 py-0.5 rounded font-mono">
                            {p.sizeCapacity}
                          </span>
                        )}
                      </div>

                      <h4 className="font-semibold text-xs text-slate-100 group-hover:text-sky-300 transition line-clamp-2">
                        {p.name}
                      </h4>

                      <div className="text-[10px] text-slate-400 font-mono mt-1">
                        SKU: {p.sku}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-sm font-extrabold text-white">
                        KSh {p.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
              })}
            </div>
          )}
        </div>

        {/* RIGHT 5 COLS: POS RECEIPT CART & CHECKOUT PANEL */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
          {/* Header & Customer Picker */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-sky-400" />
              <h3 className="font-bold text-sm text-slate-100">Receipt Order Cart</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-sky-950 border border-sky-800 text-sky-300 text-xs px-2.5 py-1 rounded-lg font-mono font-bold">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
              <button
                id="btn-pos-new-sale-cart"
                onClick={handleTriggerNewSale}
                className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold px-3 py-1 rounded-lg text-xs transition flex items-center gap-1 shadow-md shadow-emerald-600/20"
                title="Start a fresh new sale (clears cart)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Sale</span>
              </button>
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

            <button
              onClick={() => setShowAddCustomerModal(true)}
              title="Add New Customer"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>

          {/* Cart Itemized List */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="text-center py-10 space-y-2 border-2 border-dashed border-slate-800 rounded-2xl">
                <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">Cart is empty</p>
                <p className="text-[11px] text-slate-500">Scan barcode or tap products to build receipt</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2.5 text-xs"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {item.product.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0 shadow-sm"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                        <Package className="w-4 h-4 text-slate-500" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-200 truncate">{item.product.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        KSh {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} / {item.product.unit} {item.product.sizeCapacity ? `• ${item.product.sizeCapacity}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Quantity Counter */}
                  <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => updateCartQty(item.product.id, -1)}
                      className="text-slate-400 hover:text-white p-0.5"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold font-mono text-slate-100 px-1">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQty(item.product.id, 1)}
                      className="text-slate-400 hover:text-white p-0.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right font-bold text-slate-100 min-w-[70px]">
                    KSh {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>

                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Sales Representative Selector & Real-time Commission Banner */}
          <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-sky-400" /> Attributing Sales Rep:
              </label>
              <select
                value={selectedSalesRepId}
                onChange={(e) => setSelectedSalesRepId(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-2 py-1 rounded-lg focus:outline-none font-semibold"
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Real-time Sales Commission Display */}
            <div className="bg-indigo-950/40 border border-indigo-900/60 p-2 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300">
                <Award className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold text-slate-200">{selectedSalesRep.name}</span>
                  <span className="text-[10px] text-indigo-300 block font-mono">
                    {currentCartComm.modelDescription}
                  </span>
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-[10px] text-slate-400">Cart Commission</div>
                <div className="font-bold text-emerald-400 text-xs">
                  +KSh {currentCartComm.amount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Discount, KRA Tax & Totals summary */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2.5 text-xs">
            {/* Admin-Only Discount Guard */}
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold text-slate-300">Sales Discount (KSh):</span>
                </div>

                {currentUser.role === 'Admin' || discountAuthorizedBy ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={discountAmount ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (currentUser.role === 'Admin' || discountAuthorizedBy) {
                          setDiscountAmount(val as any);
                          if (currentUser.role === 'Admin' && !discountAuthorizedBy) {
                            setDiscountAuthorizedBy(`${currentUser.name} (Admin)`);
                          }
                        }
                      }}
                      placeholder="0.00"
                      className="w-24 bg-slate-950 border border-slate-700 text-right px-2 py-1 rounded-lg text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                    />
                    {discountAmount > 0 && (
                      <button
                        onClick={() => {
                          setDiscountAmount(0);
                          if (currentUser.role !== 'Admin') setDiscountAuthorizedBy(null);
                        }}
                        className="text-[10px] text-rose-400 hover:underline font-semibold"
                        title="Remove discount"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setTempDiscountVal(100);
                      setShowAdminDiscountAuthModal(true);
                    }}
                    className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-300 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                  >
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>Request Admin Discount</span>
                  </button>
                )}
              </div>

              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-[10px] text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-900/60 px-2 py-1 rounded-lg">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Discount Approved By:</span>
                  </span>
                  <span className="font-bold">{discountAuthorizedBy || 'Store Admin'}</span>
                </div>
              )}

              {currentUser.role !== 'Admin' && !discountAuthorizedBy && (
                <p className="text-[10px] text-slate-500 italic">
                  🔒 Only Administrators can give or authorize sales discounts.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-2">
              <span className="text-slate-400">Subtotal:</span>
              <span className="font-mono font-semibold text-slate-200">KSh {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-amber-400/90 font-mono">
              <span className="flex items-center gap-1">
                <span>KRA Turnover Tax (1.5% TOT):</span>
              </span>
              <span>KSh {(grandTotal * 0.015).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex items-center justify-between text-base font-extrabold border-t border-slate-800 pt-2 text-white">
              <span>Grand Total:</span>
              <span className="text-sky-400 font-mono">KSh {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Checkout & New Sale Action Buttons */}
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                id="btn-pos-clear-new-sale"
                type="button"
                onClick={handleTriggerNewSale}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold py-3 px-3 rounded-xl transition flex items-center justify-center gap-1.5 text-xs shrink-0"
                title="Discard current items and start a fresh sale"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">New Sale</span>
              </button>
            )}
            <button
              id="btn-pos-checkout"
              disabled={cart.length === 0}
              onClick={handleOpenCheckout}
              className="flex-1 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm"
            >
              <CreditCard className="w-4 h-4" />
              <span>Process Payment (KSh {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: CHECKOUT & MULTI-PAYMENT / PARTIAL PAYMENT */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
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

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Grand Total Summary Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Total Bill Amount</div>
                  <div className="text-2xl font-extrabold text-sky-400 font-mono">KSh {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <div className="text-[11px] text-amber-400 font-mono mt-0.5">
                    Incl. KRA TOT (1.5%): KSh {(grandTotal * 0.015).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
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
                          step="0.01"
                          placeholder="Amount"
                          value={p.amount ?? ''}
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
                  </div>
                ))}
              </div>

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

              {/* Sale Date & Backdating Field */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <label className="text-xs text-slate-300 font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-400" />
                    <span>Sale Date & Time (Back-date Option)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Select past date for forgotten sales</span>
                </label>
                <input
                  type="datetime-local"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

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
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2.5 rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-finalize-sale"
                onClick={handleFinalizeSale}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Confirm & Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW CUSTOMER */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-200">Add New Customer</h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

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
          sampleBarcodes={products.map((p) => ({ name: `${p.name} ($${p.sellingPrice})`, barcode: p.barcode }))}
        />
      )}

      {/* MODAL 4: COMPLETED SALE RECEIPT PREVIEW */}
      {completedTx && (
        <ReceiptModal
          transaction={completedTx}
          onClose={() => {
            setCompletedTx(null);
            executeNewSale();
          }}
        />
      )}

      {/* MODAL: CONFIRM START NEW SALE WHEN CART NOT EMPTY */}
      {showNewSaleConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
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
                <p className="text-[10px] text-slate-500 mt-1 text-center">(Default Admin PIN is 1234)</p>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Discount Amount to Apply (KSh)</label>
                <input
                  type="number"
                  min="1"
                  value={tempDiscountVal || ''}
                  onChange={(e) => setTempDiscountVal(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="e.g. 200"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-400"
                />
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
    </div>
  );
};
