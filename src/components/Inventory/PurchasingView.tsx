import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  Building2,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  AlertCircle,
  Edit3,
  Trash2,
  ChevronRight,
  ArrowUpRight,
  ShieldCheck,
  User as UserIcon
} from 'lucide-react';
import { PurchaseOrder, PurchaseOrderItem, Supplier, Product, User } from '../../types';
import { formatKSh } from '../../utils/currency';

interface PurchasingViewProps {
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  currentUser: User;
}

export const PurchasingView: React.FC<PurchasingViewProps> = ({
  purchaseOrders,
  setPurchaseOrders,
  suppliers,
  setSuppliers,
  products,
  setProducts,
  currentUser,
}) => {
  const [subTab, setSubTab] = useState<'pos_list' | 'suppliers'>('pos_list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Received' | 'Cancelled'>('all');

  // Modal states
  const [showCreatePoModal, setShowCreatePoModal] = useState(false);
  const [selectedPoDetails, setSelectedPoDetails] = useState<PurchaseOrder | null>(null);

  // New PO Form State
  const [newPoSupplierId, setNewPoSupplierId] = useState('');
  const defaultFutureDate = new Date(Date.now() + 7 * 86400000);
  const [newPoExpectedDate, setNewPoExpectedDate] = useState(
    defaultFutureDate.toISOString().slice(0, 10)
  );
  const [poYear, setPoYear] = useState(String(defaultFutureDate.getFullYear()));
  const [poMonth, setPoMonth] = useState(String(defaultFutureDate.getMonth() + 1).padStart(2, '0'));
  const [poDay, setPoDay] = useState(String(defaultFutureDate.getDate()).padStart(2, '0'));

  const handleDatePartChange = (part: 'year' | 'month' | 'day', val: string) => {
    let y = poYear;
    let m = poMonth;
    let d = poDay;
    if (part === 'year') y = val;
    if (part === 'month') m = val;
    if (part === 'day') d = val;

    setPoYear(y);
    setPoMonth(m);
    setPoDay(d);
    setNewPoExpectedDate(`${y}-${m}-${d}`);
  };

  const [newPoNotes, setNewPoNotes] = useState('');
  const [poItems, setPoItems] = useState<
    { productId: string; quantityOrdered: number; unitCost: number }[]
  >([]);

  // Product Autocomplete Search States per Line Item
  const [productSearchQueries, setProductSearchQueries] = useState<{ [index: number]: string }>({});
  const [openProductDropdown, setOpenProductDropdown] = useState<number | null>(null);

  // On-the-fly Supplier Modal state
  const [showQuickSupplierModal, setShowQuickSupplierModal] = useState(false);
  const [quickSupName, setQuickSupName] = useState('');
  const [quickSupContact, setQuickSupContact] = useState('');
  const [quickSupPhone, setQuickSupPhone] = useState('');
  const [quickSupEmail, setQuickSupEmail] = useState('');
  const [quickSupAddress, setQuickSupAddress] = useState('');

  // Filtered POs
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchesSearch =
        po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [purchaseOrders, searchTerm, statusFilter]);

  // Statistics
  const totalPendingCount = useMemo(
    () => purchaseOrders.filter((p) => p.status === 'Pending').length,
    [purchaseOrders]
  );
  const totalReceivedValue = useMemo(
    () =>
      purchaseOrders
        .filter((p) => p.status === 'Received')
        .reduce((sum, p) => sum + p.totalCost, 0),
    [purchaseOrders]
  );
  const totalActivePOs = useMemo(
    () => purchaseOrders.filter((p) => p.status === 'Pending').reduce((sum, p) => sum + p.totalCost, 0),
    [purchaseOrders]
  );

  // Add Item to New PO
  const handleAddPoItemLine = () => {
    if (products.length === 0) return;
    const firstProd = products[0];
    setPoItems((prev) => [
      ...prev,
      {
        productId: firstProd.id,
        quantityOrdered: 10,
        unitCost: firstProd.costPrice || firstProd.buyingPrice || 1000,
      },
    ]);
  };

  const handleUpdatePoItemLine = (
    index: number,
    field: 'productId' | 'quantityOrdered' | 'unitCost',
    value: any
  ) => {
    setPoItems((prev) => {
      const updated = [...prev];
      if (field === 'productId') {
        const prod = products.find((p) => p.id === value);
        updated[index] = {
          ...updated[index],
          productId: value,
          unitCost: prod ? prod.costPrice || prod.buyingPrice || 1000 : updated[index].unitCost,
        };
      } else {
        updated[index] = {
          ...updated[index],
          [field]: Number(value) >= 0 ? Number(value) : 0,
        };
      }
      return updated;
    });
  };

  const handleRemovePoItemLine = (index: number) => {
    setPoItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Submit New Purchase Order
  const handleSaveNewPO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoSupplierId) {
      alert('Please select a supplier for this Purchase Order.');
      return;
    }
    if (poItems.length === 0) {
      alert('Please add at least one item to the Purchase Order.');
      return;
    }

    const supplier = suppliers.find((s) => s.id === newPoSupplierId);
    const supplierName = supplier ? supplier.name : 'Unknown Supplier';

    const orderItems: PurchaseOrderItem[] = poItems.map((line) => {
      const prod = products.find((p) => p.id === line.productId);
      return {
        productId: line.productId,
        productName: prod ? prod.name : 'Unknown Product',
        sku: prod ? prod.sku : 'SKU-GEN',
        imageUrl: prod ? prod.imageUrl : undefined,
        quantityOrdered: line.quantityOrdered,
        quantityReceived: 0,
        unitCost: line.unitCost,
        totalCost: line.quantityOrdered * line.unitCost,
      };
    });

    const totalCost = orderItems.reduce((sum, item) => sum + item.totalCost, 0);
    const poNumber = `PO-2026-${String(purchaseOrders.length + 101).padStart(3, '0')}`;

    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber,
      supplierId: newPoSupplierId,
      supplierName,
      orderDate: new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: newPoExpectedDate,
      status: 'Pending',
      items: orderItems,
      totalCost,
      notes: newPoNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);
    setShowCreatePoModal(false);
    // Reset form
    setNewPoSupplierId('');
    setPoItems([]);
    setNewPoNotes('');
  };

  // Mark PO as Received -> Automate Stock Inflow Sync
  const handleMarkAsReceived = (po: PurchaseOrder) => {
    if (po.status === 'Received') {
      alert('This Purchase Order has already been received.');
      return;
    }

    if (!window.confirm(`Mark ${po.poNumber} as Received? This will automatically update product stock levels and cost prices.`)) {
      return;
    }

    // 1. Update Products stock & cost
    setProducts((prevProducts) => {
      return prevProducts.map((prod) => {
        const poItem = po.items.find((item) => item.productId === prod.id);
        if (!poItem) return prod;

        const qtyToAdd = poItem.quantityOrdered; // default received full quantity ordered
        const newStock = (prod.stockQuantity || prod.stock || 0) + qtyToAdd;
        return {
          ...prod,
          stockQuantity: newStock,
          stock: newStock,
          costPrice: poItem.unitCost,
          buyingPrice: poItem.unitCost,
          updatedAt: new Date().toISOString(),
        };
      });
    });

    // 2. Update PO status
    setPurchaseOrders((prev) =>
      prev.map((item) => {
        if (item.id === po.id) {
          return {
            ...item,
            status: 'Received',
            receivedAt: new Date().toISOString(),
            receivedBy: currentUser.name,
            items: item.items.map((i) => ({ ...i, quantityReceived: i.quantityOrdered })),
          };
        }
        return item;
      })
    );

    if (selectedPoDetails && selectedPoDetails.id === po.id) {
      setSelectedPoDetails({
        ...po,
        status: 'Received',
        receivedAt: new Date().toISOString(),
        receivedBy: currentUser.name,
      });
    }
  };

  // Delete PO
  const handleDeletePO = (poId: string) => {
    if (!window.confirm('Are you sure you want to delete this Purchase Order record?')) return;
    setPurchaseOrders((prev) => prev.filter((p) => p.id !== poId));
    if (selectedPoDetails && selectedPoDetails.id === poId) {
      setSelectedPoDetails(null);
    }
  };

  // Add Supplier on the fly
  const handleSaveQuickSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSupName.trim() || !quickSupPhone.trim()) {
      alert('Please provide supplier name and phone number.');
      return;
    }

    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      name: quickSupName.trim(),
      contactPerson: quickSupContact.trim() || 'Manager',
      phone: quickSupPhone.trim(),
      email: quickSupEmail.trim() || 'info@supplier.co.ke',
      address: quickSupAddress.trim() || 'Nairobi, Kenya',
      totalSuppliedValue: 0,
      currentBalanceDue: 0,
      paymentTerms: 'Net 30 Days',
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setSuppliers((prev) => [newSup, ...prev]);
    setNewPoSupplierId(newSup.id);
    setShowQuickSupplierModal(false);
    // Reset quick form
    setQuickSupName('');
    setQuickSupContact('');
    setQuickSupPhone('');
    setQuickSupEmail('');
    setQuickSupAddress('');
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header & Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Truck className="w-4 h-4" />
            <span>Supply Chain & Purchasing</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Purchase Orders & Inventory Receiving
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage supplier purchase orders, restock inflows, and vendor accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setPoItems([
                {
                  productId: products[0]?.id || '',
                  quantityOrdered: 10,
                  unitCost: products[0]?.costPrice || 1000,
                },
              ]);
              setShowCreatePoModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-lg transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Purchase Order</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase">Active Pending POs</span>
            <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-white mt-3 tabular-nums">
            {totalPendingCount} Orders
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Value: {formatKSh(totalActivePOs)}
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase">Received Stock Value</span>
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-white mt-3 tabular-nums">
            {formatKSh(totalReceivedValue)}
          </div>
          <p className="text-xs text-emerald-400 mt-1">
            Automatically synced to inventory
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase">Active Suppliers</span>
            <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-white mt-3 tabular-nums">
            {suppliers.length} Vendors
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Registered wholesale partners
          </p>
        </div>
      </div>

      {/* Sub-Tab Navigation & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('pos_list')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              subTab === 'pos_list'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Purchase Orders ({purchaseOrders.length})
          </button>
          <button
            onClick={() => setSubTab('suppliers')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              subTab === 'suppliers'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Supplier Directory ({suppliers.length})
          </button>
        </div>

        {subTab === 'pos_list' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search PO # or Supplier..."
                className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Received">Received</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {subTab === 'pos_list' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {filteredPOs.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-white">No Purchase Orders Found</h3>
              <p className="text-sm text-slate-400 mt-1">
                Create a new purchase order to start tracking restock inflows.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">PO Number</th>
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-4">Order Date</th>
                    <th className="py-3 px-4">Expected Delivery</th>
                    <th className="py-3 px-4">Total Cost</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {filteredPOs.map((po) => {
                    const isReceived = po.status === 'Received';
                    const isCancelled = po.status === 'Cancelled';
                    return (
                      <tr
                        key={po.id}
                        className="hover:bg-slate-800/40 transition-colors group"
                      >
                        <td className="py-3 px-4 font-mono font-medium text-white">
                          {po.poNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-200 font-medium">
                          {po.supplierName}
                        </td>
                        <td className="py-3 px-4 text-slate-400 tabular-nums">
                          {po.orderDate}
                        </td>
                        <td className="py-3 px-4 text-slate-400 tabular-nums">
                          {po.expectedDeliveryDate}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white tabular-nums">
                          {formatKSh(po.totalCost)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                              isReceived
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : isCancelled
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {isReceived && <CheckCircle className="w-3 h-3" />}
                            {isCancelled && <XCircle className="w-3 h-3" />}
                            {!isReceived && !isCancelled && <Clock className="w-3 h-3" />}
                            <span>{po.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedPoDetails(po)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                            >
                              View
                            </button>
                            {!isReceived && !isCancelled && (
                              <button
                                onClick={() => handleMarkAsReceived(po)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>Receive</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDeletePO(po.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Delete PO"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      ) : (
        /* Supplier Directory Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((sup) => (
            <div
              key={sup.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white">{sup.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Contact: {sup.contactPerson}
                    </p>
                  </div>
                  <span className="p-2 bg-slate-800 text-emerald-400 rounded-xl">
                    <Building2 className="w-4 h-4" />
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{sup.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{sup.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{sup.address}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Terms:</span>{' '}
                  <span className="text-slate-200 font-medium">{sup.paymentTerms || 'Net 30'}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Supplied:</span>{' '}
                  <span className="text-emerald-400 font-semibold tabular-nums">
                    {formatKSh(sup.totalSuppliedValue || 0)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE PURCHASE ORDER MODAL */}
      {showCreatePoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 pb-32">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Create Purchase Order</h2>
                <p className="text-xs text-slate-400">Order inventory items from registered suppliers.</p>
              </div>
              <button
                onClick={() => setShowCreatePoModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewPO} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Select Supplier *
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={newPoSupplierId}
                      onChange={(e) => setNewPoSupplierId(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Choose Supplier --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.phone})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowQuickSupplierModal(true)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium shrink-0"
                    >
                      + New
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Expected Delivery Date (Day, Month, Year) *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Day Dropdown */}
                    <select
                      value={poDay}
                      onChange={(e) => handleDatePartChange('day', e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {Array.from({ length: 31 }, (_, i) => {
                        const dayStr = String(i + 1).padStart(2, '0');
                        return (
                          <option key={dayStr} value={dayStr}>
                            Day {dayStr}
                          </option>
                        );
                      })}
                    </select>

                    {/* Month Dropdown */}
                    <select
                      value={poMonth}
                      onChange={(e) => handleDatePartChange('month', e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {[
                        { val: '01', label: 'Jan' },
                        { val: '02', label: 'Feb' },
                        { val: '03', label: 'Mar' },
                        { val: '04', label: 'Apr' },
                        { val: '05', label: 'May' },
                        { val: '06', label: 'Jun' },
                        { val: '07', label: 'Jul' },
                        { val: '08', label: 'Aug' },
                        { val: '09', label: 'Sep' },
                        { val: '10', label: 'Oct' },
                        { val: '11', label: 'Nov' },
                        { val: '12', label: 'Dec' },
                      ].map((m) => (
                        <option key={m.val} value={m.val}>
                          {m.val} - {m.label}
                        </option>
                      ))}
                    </select>

                    {/* Year Dropdown */}
                    <select
                      value={poYear}
                      onChange={(e) => handleDatePartChange('year', e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {[2026, 2027, 2028, 2029, 2030, 2031, 2032].map((yr) => (
                        <option key={yr} value={String(yr)}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Order Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Order Line Items</h3>
                  <button
                    type="button"
                    onClick={handleAddPoItemLine}
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {poItems.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center border border-dashed border-slate-800 rounded-xl">
                    No items added yet. Click Add Item above.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {poItems.map((line, idx) => {
                      const lineTotal = line.quantityOrdered * line.unitCost;
                      const selectedProd = products.find((p) => p.id === line.productId);
                      const query = productSearchQueries[idx] !== undefined ? productSearchQueries[idx] : (selectedProd ? selectedProd.name : '');
                      const filteredProducts = products.filter((p) =>
                        p.name.toLowerCase().includes((query || '').toLowerCase()) ||
                        (p.sku && p.sku.toLowerCase().includes((query || '').toLowerCase()))
                      );

                      return (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 relative"
                        >
                          <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                            {selectedProd?.imageUrl ? (
                              <img src={selectedProd.imageUrl} alt={selectedProd.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-slate-500" />
                            )}
                          </div>
                          <div className="flex-1 w-full relative">
                            <label className="block text-[10px] text-slate-400 mb-1">Product (Search Name / SKU)</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={query}
                                onFocus={() => {
                                  setOpenProductDropdown(idx);
                                  setProductSearchQueries((prev) => ({ ...prev, [idx]: '' }));
                                }}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProductSearchQueries((prev) => ({ ...prev, [idx]: val }));
                                  setOpenProductDropdown(idx);
                                }}
                                placeholder="Type to search product or SKU..."
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 pr-7"
                              />
                              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                            </div>

                            {openProductDropdown === idx && (
                              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto">
                                {filteredProducts.length === 0 ? (
                                  <div className="p-2 text-[11px] text-slate-400 text-center">No products found</div>
                                ) : (
                                  filteredProducts.map((p) => (
                                    <div
                                      key={p.id}
                                      onClick={() => {
                                        handleUpdatePoItemLine(idx, 'productId', p.id);
                                        setProductSearchQueries((prev) => ({ ...prev, [idx]: p.name }));
                                        setOpenProductDropdown(null);
                                      }}
                                      className="px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center justify-between border-b border-slate-800/50 last:border-0"
                                    >
                                      <div>
                                        <span className="font-medium text-white">{p.name}</span>
                                        <span className="text-[10px] text-slate-400 block font-mono">SKU: {p.sku}</span>
                                      </div>
                                      <span className="text-[10px] text-emerald-400 font-mono">Stock: {p.stockQuantity || p.stock || 0}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>

                          <div className="w-28">
                            <label className="block text-[10px] text-slate-400 mb-1">Quantity</label>
                            <input
                              type="number"
                              min="1"
                              value={line.quantityOrdered}
                              onChange={(e) =>
                                handleUpdatePoItemLine(idx, 'quantityOrdered', e.target.value)
                              }
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white tabular-nums"
                            />
                          </div>

                          <div className="w-32">
                            <label className="block text-[10px] text-slate-400 mb-1">Unit Cost (KSh)</label>
                            <input
                              type="number"
                              min="0"
                              value={line.unitCost}
                              onChange={(e) =>
                                handleUpdatePoItemLine(idx, 'unitCost', e.target.value)
                              }
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white tabular-nums"
                            />
                          </div>

                          <div className="w-32 text-right">
                            <label className="block text-[10px] text-slate-400 mb-1">Total</label>
                            <div className="text-xs font-bold text-emerald-400 pt-1.5 tabular-nums">
                              {formatKSh(lineTotal)}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemovePoItemLine(idx)}
                            className="p-2 text-slate-500 hover:text-rose-400 self-end sm:self-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Order Notes</label>
                <textarea
                  rows={2}
                  value={newPoNotes}
                  onChange={(e) => setNewPoNotes(e.target.value)}
                  placeholder="Optional delivery instructions or payment terms..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreatePoModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg"
                >
                  Submit Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD SUPPLIER MODAL */}
      {showQuickSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-white">Add New Supplier</h3>
              <button
                onClick={() => setShowQuickSupplierModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveQuickSupplier} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Supplier/Company Name *</label>
                <input
                  type="text"
                  required
                  value={quickSupName}
                  onChange={(e) => setQuickSupName(e.target.value)}
                  placeholder="e.g. Nairobi Gadgets Wholesaler"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={quickSupContact}
                  onChange={(e) => setQuickSupContact(e.target.value)}
                  placeholder="e.g. James Mwangi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={quickSupPhone}
                  onChange={(e) => setQuickSupPhone(e.target.value)}
                  placeholder="+254 712 345678"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={quickSupEmail}
                  onChange={(e) => setQuickSupEmail(e.target.value)}
                  placeholder="sales@supplier.co.ke"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Address / Location</label>
                <input
                  type="text"
                  value={quickSupAddress}
                  onChange={(e) => setQuickSupAddress(e.target.value)}
                  placeholder="Luthuli Ave, Nairobi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickSupplierModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO DETAILS MODAL */}
      {selectedPoDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <span className="text-xs font-mono text-emerald-400">
                  {selectedPoDetails.poNumber}
                </span>
                <h3 className="text-lg font-bold text-white">{selectedPoDetails.supplierName}</h3>
              </div>
              <button
                onClick={() => setSelectedPoDetails(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-xs text-slate-500 block">Order Date</span>
                  <span className="font-medium text-white">{selectedPoDetails.orderDate}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Expected Delivery</span>
                  <span className="font-medium text-white">
                    {selectedPoDetails.expectedDeliveryDate}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Status</span>
                  <span className="font-semibold text-emerald-400">{selectedPoDetails.status}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Total Cost</span>
                  <span className="font-semibold text-white tabular-nums">
                    {formatKSh(selectedPoDetails.totalCost)}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">
                  Ordered Items
                </h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Cost</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {selectedPoDetails.items.map((item, idx) => {
                        const prod = products.find((p) => p.id === item.productId);
                        const img = item.imageUrl || prod?.imageUrl;
                        return (
                          <tr key={idx}>
                            <td className="py-2.5 px-3 flex items-center gap-2.5 font-medium text-white">
                              <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                                {img ? (
                                  <img src={img} alt={item.productName} className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="w-4 h-4 text-slate-500" />
                                )}
                              </div>
                              <div>
                                {item.productName}
                                <div className="text-[10px] text-slate-500 font-mono">
                                  SKU: {item.sku}
                                </div>
                              </div>
                            </td>
                          <td className="py-2.5 px-3 text-right tabular-nums">
                            {item.quantityOrdered}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums">
                            {formatKSh(item.unitCost)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-white tabular-nums">
                            {formatKSh(item.totalCost)}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedPoDetails.notes && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-500 block mb-1">Notes</span>
                  <p className="text-xs text-slate-300">{selectedPoDetails.notes}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              {selectedPoDetails.status === 'Pending' && (
                <button
                  onClick={() => handleMarkAsReceived(selectedPoDetails)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark as Received (Sync Stock)</span>
                </button>
              )}
              <button
                onClick={() => setSelectedPoDetails(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
