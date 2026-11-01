import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Package,
  ClipboardList,
  DollarSign,
  UserCheck,
  FileText,
  Search,
  Scan,
  AlertCircle,
  AlertTriangle,
  Bell,
  MessageSquare,
  Share2,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  ChevronDown,
  Database,
  Settings,
  PanelLeft,
  PanelLeftClose,
  Maximize2,
  Minimize2,
  ExternalLink,
  Landmark,
  Lock,
  KeyRound,
  Sparkles,
  Users,
  Smartphone,
  Monitor,
  Globe,
  Building2,
  Tag,
  Plus,
  Cloud,
  RefreshCw,
  Menu,
  X,
  Printer,
  Barcode,
  QrCode,
  Truck
} from 'lucide-react';
import {
  Product,
  Customer,
  Supplier,
  PaymentMethod,
  Expense,
  AttendanceRecord,
  Transaction,
  User,
  Role,
  StockCountAudit,
  CashTransaction,
  RestockRecord,
  StaffCommissionPayout,
  StoreLocation,
  OfferDeal,
  OnlineOrder,
  StockTransferRecord,
  WorkerLoan,
  WorkerLoanRepayment,
  FinancingFacility,
  FacilityRepayment,
  BarcodeScanLog,
  SensitiveActionLog,
  SensitiveActionType,
  PurchaseOrder
} from './types';
import {
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_SUPPLIERS,
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  INITIAL_EXPENSES,
  INITIAL_ATTENDANCE,
  INITIAL_TRANSACTIONS,
  INITIAL_CASH_TRANSACTIONS,
  INITIAL_FINANCING_FACILITIES,
  INITIAL_RESTOCK_RECORDS,
  INITIAL_COMMISSION_PAYOUTS,
  INITIAL_WORKER_LOANS,
  INITIAL_STORES,
  INITIAL_OFFERS,
  INITIAL_ONLINE_ORDERS,
  INITIAL_STOCK_TRANSFERS,
  INITIAL_BARCODE_SCAN_LOGS,
  INITIAL_PURCHASE_ORDERS
} from './data/initialData';
import { POSView } from './components/POS/POSView';
import { InventoryView } from './components/Inventory/InventoryView';
import { PurchasingView } from './components/Inventory/PurchasingView';
import { PhysicalStockCountView } from './components/Inventory/PhysicalStockCountView';
import { ExpensesView } from './components/Expenses/ExpensesView';
import { CashManagementView } from './components/Finance/CashManagementView';
import { AttendanceView } from './components/Attendance/AttendanceView';
import { ReportsView } from './components/Reports/ReportsView';
import { AuditLogsView } from './components/Reports/AuditLogsView';
import { DataManagementView } from './components/Settings/DataManagementView';
import { FloatingToolWidget } from './components/Tools/FloatingToolWidget';
import { PinLoginModal } from './components/Auth/PinLoginModal';
import { StaffManagementModal } from './components/Auth/StaffManagementModal';
import { RoleAuthorizationModal, RoleAuthorizationRequest } from './components/Auth/RoleAuthorizationModal';
import { InstallPwaModal } from './components/InstallPwaModal';
import { PhoneDeviceFrame } from './components/PhoneDeviceFrame';
import { ItemHistoryModal } from './components/Inventory/ItemHistoryModal';
import { StoreManagerModal } from './components/Store/StoreManagerModal';
import { OnlineStorefrontView } from './components/OnlineStore/OnlineStorefrontView';
import { OnlineOrdersManagerView } from './components/OnlineStore/OnlineOrdersManagerView';
import { CustomersSuppliersView } from './components/Contacts/CustomersSuppliersView';
import { AIAssistantModal } from './components/AI/AIAssistantModal';
import { AIAssistantWidget } from './components/AI/AIAssistantWidget';
import { CloudSyncModal } from './components/CloudSync/CloudSyncModal';
import { PrintBarcodesUtilityModal } from './components/Inventory/PrintBarcodesUtilityModal';
import { ItemAuditMiniPage } from './components/Inventory/ItemAuditMiniPage';
import { StockAlertNotificationModal } from './components/Inventory/StockAlertNotificationModal';
import { CameraStartupPrompt } from './components/Common/CameraStartupPrompt';
import { AppMenuView } from './components/Common/AppMenuView';
import { formatKSh } from './utils/currency';
import {
  TabKey,
  hasTabPermission,
  hasRole,
  getUserRoles,
  setWorkerRoles,
  canManageStaff,
  canViewGrossProfit,
  canManageSettings,
  getRoleBadgeStyle,
  ROLE_CONFIGURATIONS,
  DEFAULT_ROLE_WORKER_PERMISSIONS,
} from './utils/permissions';
import {
  loadAuditLogsFromStorage,
  saveAuditLogsToStorage,
  buildSensitiveActionLog,
  getQualifyingRolesForAction,
  computeProductDiff,
} from './utils/auditLogger';
import { AccessRestrictedView } from './components/Auth/AccessRestrictedView';
import {
  subscribeToProducts,
  saveProductToCloud,
  deleteProductFromCloud,
  bulkUploadProductsToCloud,
  batchSaveProductsToCloud,
  subscribeToTransactions,
  saveTransactionToCloud,
  commitSaleToCloudBatch,
  subscribeToCustomers,
  saveCustomerToCloud,
  deleteCustomerFromCloud,
  subscribeToSuppliers,
  saveSupplierToCloud,
  deleteSupplierFromCloud,
  subscribeToExpenses,
  saveExpenseToCloud,
  deleteExpenseFromCloud,
  subscribeToRestockRecords,
  saveRestockRecordToCloud,
  subscribeToStoreSecurity,
  saveStoreSecurityToCloud,
  StoreSecurityConfig,
  subscribeToUsers,
  saveUserToCloud,
  deleteUserFromCloud,
  bulkUploadUsersToCloud,
  subscribeToAuditLogs,
  saveAuditLogToCloud,
} from './lib/cloudSync';
import { testFirestoreConnection, isQuotaExceededError, FIREBASE_UPGRADE_URL } from './lib/firebase';
import { safeGetJSON, safeSetJSON, checkAndRunRollingSalesArchive } from './utils/safeStorage';
import {
  getAllProductImagesFromIndexedDB,
  saveProductImageToIndexedDB,
  deleteProductImageFromIndexedDB,
} from './utils/imageStorage';
import { OfflineSyncBanner } from './components/Network/OfflineSyncBanner';
import { NetworkStatusBadge } from './components/Network/NetworkStatusBadge';
import {
  getIsOnline,
  addPendingSyncItem,
  getPendingSyncQueue,
  removePendingSyncItem,
} from './utils/offlineSync';

/**
 * Rofani Electronics & Boutique - Live Firebase Firestore Configuration
 * Project: rofani-pos (rofi-pos)
 * Multi-device Cloud Sync: products (302 items), transactions, customers, suppliers, expenses, users
 */
export const ROFANI_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCqfkqKusjttxhr0sDx5005",
  authDomain: "rofani-pos.firebaseapp.com",
  projectId: "rofani-pos",
  storageBucket: "rofani-pos.firebasestorage.app",
  messagingSenderId: "1059699871684",
  appId: "1:1059699871684:web:b5260e337",
  firestoreDatabaseId: "ai-studio-retailstockmanag-35779e9e-08d0-4311-8158-8be055847014",
};

export default function App() {
  // Navigation & Display Layout State
  const VALID_TABS = [
    'pos',
    'inventory',
    'purchasing',
    'stocktake',
    'contacts',
    'cashmanagement',
    'expenses',
    'attendance',
    'reports',
    'onlinestore',
    'onlineorders',
    'settings',
    'auditlogs',
    'menu',
  ] as const;

  type AppTab = (typeof VALID_TABS)[number];

  const [activeTab, setActiveTab] = useState<AppTab>(() =>
    safeGetJSON<AppTab>('retail_pos_active_tab', 'pos', (val) => VALID_TABS.includes(val))
  );

  useEffect(() => {
    safeSetJSON('retail_pos_active_tab', activeTab);
  }, [activeTab]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() =>
    safeGetJSON<boolean>('retail_pos_sidebar_collapsed', false, (val) => typeof val === 'boolean')
  );

  useEffect(() => {
    safeSetJSON('retail_pos_sidebar_collapsed', isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [displayTheme, setDisplayTheme] = useState<'light' | 'dark' | 'contrast'>(() =>
    safeGetJSON<'light' | 'dark' | 'contrast'>('retail_pos_display_theme', 'light', (val) =>
      ['light', 'dark', 'contrast'].includes(val)
    )
  );

  useEffect(() => {
    safeSetJSON('retail_pos_display_theme', displayTheme);
  }, [displayTheme]);

  const [fontScale, setFontScale] = useState<'normal' | 'large'>(() =>
    safeGetJSON<'normal' | 'large'>('retail_pos_font_scale', 'normal', (val) =>
      ['normal', 'large'].includes(val)
    )
  );

  useEffect(() => {
    safeSetJSON('retail_pos_font_scale', fontScale);
  }, [fontScale]);

  // Format Switcher State (Computer / Desktop vs Mobile Phone Frame)
  const [deviceFormat, setDeviceFormat] = useState<'computer' | 'phone'>(() => {
    const saved = safeGetJSON('retail_pos_device_format', null, (val) => val === 'computer' || val === 'phone');
    if (saved === 'computer' || saved === 'phone') return saved;
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'phone';
    }
    return 'computer';
  });

  useEffect(() => {
    safeSetJSON('retail_pos_device_format', deviceFormat);
  }, [deviceFormat]);

  const [phoneOrientation, setPhoneOrientation] = useState<'portrait' | 'landscape'>(() =>
    safeGetJSON<'portrait' | 'landscape'>('retail_pos_phone_orientation', 'portrait', (val) =>
      ['portrait', 'landscape'].includes(val)
    )
  );

  useEffect(() => {
    safeSetJSON('retail_pos_phone_orientation', phoneOrientation);
  }, [phoneOrientation]);

  const [phoneModel, setPhoneModel] = useState<'iphone15pro' | 'galaxyS24' | 'pixel8'>(() =>
    safeGetJSON<'iphone15pro' | 'galaxyS24' | 'pixel8'>('retail_pos_phone_model', 'iphone15pro', (val) =>
      ['iphone15pro', 'galaxyS24', 'pixel8'].includes(val)
    )
  );

  useEffect(() => {
    safeSetJSON('retail_pos_phone_model', phoneModel);
  }, [phoneModel]);

  const [inventoryLowStockOnly, setInventoryLowStockOnly] = useState<boolean>(() =>
    safeGetJSON<boolean>('retail_pos_low_stock_only', false, (val) => typeof val === 'boolean')
  );

  useEffect(() => {
    safeSetJSON('retail_pos_low_stock_only', inventoryLowStockOnly);
  }, [inventoryLowStockOnly]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  // Role, Worker Users & PIN Security State with safe lazy initialization & immediate localStorage sync
  const [allUsers, setAllUsersState] = useState<User[]>(() => {
    try {
      const primary = localStorage.getItem('retail_pos_users');
      const secondary = localStorage.getItem('pos_store_staff_users');
      const saved = primary || secondary;
      const rawUsers = saved ? JSON.parse(saved) : INITIAL_USERS;
      const migrated = rawUsers.map((u: any) => {
        const userRoles = getUserRoles(u);
        return {
          ...u,
          roles: u.roles && u.roles.length > 0 ? Array.from(new Set([...u.roles, ...userRoles])) : userRoles,
        };
      });

      const hasAdmin = migrated.some((u: any) => hasRole(u, 'Admin'));
      if (!hasAdmin && migrated.length > 0) {
        const adminCandidateIdx = migrated.findIndex((u: any) => u.id === 'usr-1');
        const targetIdx = adminCandidateIdx >= 0 ? adminCandidateIdx : 0;
        migrated[targetIdx] = {
          ...migrated[targetIdx],
          role: 'Admin',
          roles: Array.from(new Set([...(migrated[targetIdx].roles || []), 'Admin' as Role])),
          pin: migrated[targetIdx].pin || '1234',
          permissions: { ...DEFAULT_ROLE_WORKER_PERMISSIONS['Admin'] },
        };
        try {
          localStorage.setItem('retail_pos_users', JSON.stringify(migrated));
          localStorage.setItem('pos_store_staff_users', JSON.stringify(migrated));
        } catch {}
      }
      return migrated;
    } catch (e) {
      return INITIAL_USERS;
    }
  });

  const setAllUsers = (newVal: User[] | ((prev: User[]) => User[])) => {
    setAllUsersState((prev) => {
      const next = typeof newVal === 'function' ? newVal(prev) : newVal;
      safeSetJSON('retail_pos_users', next);
      safeSetJSON('pos_store_staff_users', next);
      return next;
    });
  };

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const rawCurrent = safeGetJSON<User>('retail_pos_active_user', INITIAL_USERS[0]);
    const userRoles = getUserRoles(rawCurrent);
    return {
      ...rawCurrent,
      roles: rawCurrent.roles && rawCurrent.roles.length > 0 ? Array.from(new Set([...rawCurrent.roles, ...userRoles])) : userRoles,
    };
  });

  // Security Configuration
  const [requirePinOnStartup, setRequirePinOnStartup] = useState<boolean>(() =>
    safeGetJSON('retail_pos_require_pin_startup', true)
  );
  const [masterPin, setMasterPin] = useState<string>(() =>
    safeGetJSON('retail_pos_master_pin', '1234')
  );
  const [ownerRecoveryEmail, setOwnerRecoveryEmail] = useState<string>(() =>
    safeGetJSON('retail_pos_recovery_email', 'NivaJuma@gmail.com')
  );
  const [emergencyRecoveryKey, setEmergencyRecoveryKey] = useState<string>(() =>
    safeGetJSON('retail_pos_emergency_key', 'ROFANI-RESET-2026')
  );

  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [isTerminalLocked, setIsTerminalLocked] = useState<boolean>(() =>
    safeGetJSON<boolean>('retail_pos_terminal_locked', safeGetJSON('retail_pos_require_pin_startup', true), (val) => typeof val === 'boolean')
  );

  useEffect(() => {
    safeSetJSON('retail_pos_terminal_locked', isTerminalLocked);
  }, [isTerminalLocked]);

  const [pinModalTargetUser, setPinModalTargetUser] = useState<User | null>(null);
  const [temporarilyUnlockedTabs, setTemporarilyUnlockedTabs] = useState<Set<TabKey>>(() => {
    const saved = safeGetJSON<string[]>('retail_pos_unlocked_tabs', [], (val) => Array.isArray(val));
    return new Set(saved as TabKey[]);
  });

  useEffect(() => {
    safeSetJSON('retail_pos_unlocked_tabs', Array.from(temporarilyUnlockedTabs));
  }, [temporarilyUnlockedTabs]);

  const [showStaffModal, setShowStaffModal] = useState<boolean>(() =>
    safeGetJSON<boolean>('retail_pos_show_staff_modal', false, (val) => typeof val === 'boolean')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_show_staff_modal', showStaffModal);
  }, [showStaffModal]);

  const [showInstallModal, setShowInstallModal] = useState(false);

  const [showCloudSyncModal, setShowCloudSyncModal] = useState<boolean>(() =>
    safeGetJSON<boolean>('retail_pos_show_cloud_sync_modal', false, (val) => typeof val === 'boolean')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_show_cloud_sync_modal', showCloudSyncModal);
  }, [showCloudSyncModal]);

  const [showPrintBarcodesModal, setShowPrintBarcodesModal] = useState<boolean>(() =>
    safeGetJSON<boolean>('retail_pos_show_print_modal', false, (val) => typeof val === 'boolean')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_show_print_modal', showPrintBarcodesModal);
  }, [showPrintBarcodesModal]);

  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error' | 'quota_exceeded'>('syncing');
  const [isCloudQuotaExceeded, setIsCloudQuotaExceeded] = useState<boolean>(false);
  const [showQuotaBanner, setShowQuotaBanner] = useState<boolean>(true);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  // Application Persistent Collections State with safe lazy initialization & immediate localStorage sync
  const [products, setProductsState] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('retail_pos_products');
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch (e) {
      return INITIAL_PRODUCTS;
    }
  });

  const setProducts = (newVal: Product[] | ((prev: Product[]) => Product[])) => {
    setProductsState((prev) => {
      const next = typeof newVal === 'function' ? newVal(prev) : newVal;
      safeSetJSON('retail_pos_products', next);
      return next;
    });
  };

  // Automatically restore and hydrate high-resolution product photos from persistent IndexedDB
  useEffect(() => {
    let isMounted = true;
    getAllProductImagesFromIndexedDB()
      .then((imageMap) => {
        if (!isMounted || !imageMap || Object.keys(imageMap).length === 0) return;

        setProducts((currentProducts) => {
          let hasNewImages = false;
          const merged = currentProducts.map((p) => {
            const storedImage = imageMap[p.id];
            if (storedImage && (!p.imageUrl || p.imageUrl.trim() === '')) {
              hasNewImages = true;
              return { ...p, imageUrl: storedImage };
            }
            return p;
          });
          return hasNewImages ? merged : currentProducts;
        });
      })
      .catch((err) => {
        console.warn('Could not hydrate images from IndexedDB:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const [categories, setCategories] = useState(() => safeGetJSON('retail_pos_categories_v2', INITIAL_CATEGORIES));

  useEffect(() => {
    safeSetJSON('retail_pos_categories_v2', categories);
  }, [categories]);

  // Auto-sync products' categories & subcategories into master categories state
  useEffect(() => {
    if (!products || products.length === 0) return;

    setCategories((prevCategories: any[]) => {
      let updated = [...(prevCategories || [])];
      let hasChanges = false;

      products.forEach((p) => {
        const catName = p.category ? p.category.trim() : '';
        const subName = p.subcategory ? p.subcategory.trim() : '';
        if (!catName) return;

        const catIndex = updated.findIndex(
          (c) => c.name.toLowerCase() === catName.toLowerCase()
        );

        if (catIndex === -1) {
          updated.push({
            id: `cat-auto-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: catName,
            subcategories: subName ? [subName] : ['General'],
          });
          hasChanges = true;
        } else {
          if (subName && subName !== 'General') {
            const existingCat = updated[catIndex];
            const subs: string[] = existingCat.subcategories || ['General'];
            const hasSub = subs.some((s) => s.toLowerCase() === subName.toLowerCase());
            if (!hasSub) {
              updated[catIndex] = {
                ...existingCat,
                subcategories: [...subs, subName],
              };
              hasChanges = true;
            }
          }
        }
      });

      return hasChanges ? updated : prevCategories;
    });
  }, [products]);

  const [customers, setCustomers] = useState<Customer[]>(() => safeGetJSON('retail_pos_customers', INITIAL_CUSTOMERS));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => safeGetJSON('retail_pos_suppliers', INITIAL_SUPPLIERS));

  const [expenses, setExpensesState] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem('retail_pos_expenses');
      return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
    } catch (e) {
      return INITIAL_EXPENSES;
    }
  });

  const setExpenses = (newVal: Expense[] | ((prev: Expense[]) => Expense[])) => {
    setExpensesState((prev) => {
      const next = typeof newVal === 'function' ? newVal(prev) : newVal;
      safeSetJSON('retail_pos_expenses', next);
      return next;
    });
  };

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => safeGetJSON('retail_pos_attendance', INITIAL_ATTENDANCE));

  // Transactions state with rolling sales archive protection
  const [transactions, setTransactionsState] = useState<Transaction[]>(() => {
    try {
      checkAndRunRollingSalesArchive();
      const saved = localStorage.getItem('retail_pos_transactions');
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch (e) {
      return INITIAL_TRANSACTIONS;
    }
  });

  const setTransactions = (newVal: Transaction[] | ((prev: Transaction[]) => Transaction[])) => {
    setTransactionsState((prev) => {
      const next = typeof newVal === 'function' ? newVal(prev) : newVal;
      safeSetJSON('retail_pos_transactions', next);
      return next;
    });
  };

  // Aggressive Post-Sleep & Wake Rehydration Effect
  useEffect(() => {
    const handleFocusAndVisibility = () => {
      if (document.visibilityState === 'visible') {
        const savedProducts = safeGetJSON<Product[] | null>('retail_pos_products', null);
        if (savedProducts && Array.isArray(savedProducts) && savedProducts.length > 0) {
          setProducts(savedProducts);
        }
        const savedSales = safeGetJSON<Transaction[] | null>('retail_pos_transactions', null);
        if (savedSales && Array.isArray(savedSales)) {
          setTransactions(savedSales);
        }
        const savedExpenses = safeGetJSON<Expense[] | null>('retail_pos_expenses', null);
        if (savedExpenses && Array.isArray(savedExpenses)) {
          setExpenses(savedExpenses);
        }
      }
    };
    window.addEventListener('focus', handleFocusAndVisibility);
    document.addEventListener('visibilitychange', handleFocusAndVisibility);
    return () => {
      window.removeEventListener('focus', handleFocusAndVisibility);
      document.removeEventListener('visibilitychange', handleFocusAndVisibility);
    };
  }, []);

  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(() => safeGetJSON('retail_pos_cash_transactions', INITIAL_CASH_TRANSACTIONS));
  const [restockRecords, setRestockRecords] = useState<RestockRecord[]>(() => safeGetJSON('retail_pos_restock_records', INITIAL_RESTOCK_RECORDS));

  const [purchaseOrders, setPurchaseOrdersState] = useState<PurchaseOrder[]>(() => {
    try {
      const saved = localStorage.getItem('retail_pos_purchase_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading purchases:', e);
    }
    return INITIAL_PURCHASE_ORDERS;
  });

  const setPurchaseOrders = (newVal: PurchaseOrder[] | ((prev: PurchaseOrder[]) => PurchaseOrder[])) => {
    setPurchaseOrdersState((prev) => {
      const next = typeof newVal === 'function' ? newVal(prev) : newVal;
      safeSetJSON('retail_pos_purchase_orders', next);
      return next;
    });
  };

  const [commissionPayouts, setCommissionPayouts] = useState<StaffCommissionPayout[]>(() => safeGetJSON('retail_pos_commission_payouts', INITIAL_COMMISSION_PAYOUTS));
  const [workerLoans, setWorkerLoans] = useState<WorkerLoan[]>(() => safeGetJSON('retail_pos_worker_loans', INITIAL_WORKER_LOANS));

  useEffect(() => {
    safeSetJSON('retail_pos_worker_loans', workerLoans);
  }, [workerLoans]);

  const [financingFacilities, setFinancingFacilities] = useState<FinancingFacility[]>(() => safeGetJSON('retail_pos_financing_facilities', INITIAL_FINANCING_FACILITIES));

  useEffect(() => {
    safeSetJSON('retail_pos_financing_facilities', financingFacilities);
  }, [financingFacilities]);

  // Single Store Location: Rofani Electronics
  const [stores, setStores] = useState<StoreLocation[]>(() => {
    const saved = safeGetJSON<StoreLocation[] | null>('retail_pos_stores', null);
    if (!saved || !Array.isArray(saved) || saved.length === 0) {
      return INITIAL_STORES;
    }
    const hasLegacyBranches = saved.some(
      (s) => s.id === 'store-westlands' || s.id === 'store-mombasa' || s.name.toLowerCase().includes('flagship')
    );
    if (hasLegacyBranches) {
      const main = saved.find((s) => s.id === 'store-main') || INITIAL_STORES[0];
      const singleStore: StoreLocation = {
        ...main,
        id: 'store-main',
        name: 'Rofani Electronics',
        isMainBranch: true,
        active: true
      };
      safeSetJSON('retail_pos_stores', [singleStore]);
      return [singleStore];
    }
    return saved.map((s) => {
      if (s.name.toLowerCase().includes('flagship') || s.name === 'Main Store') {
        return { ...s, name: 'Rofani Electronics' };
      }
      return s;
    });
  });

  const [activeStoreId, setActiveStoreId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('retail_pos_active_store_id');
      return saved && saved !== 'all' ? saved : 'store-main';
    } catch {
      return 'store-main';
    }
  });

  const [offers, setOffers] = useState<OfferDeal[]>(() => safeGetJSON('retail_pos_offers', INITIAL_OFFERS));
  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>(() => safeGetJSON('retail_pos_online_orders', INITIAL_ONLINE_ORDERS));
  const [stockTransfers, setStockTransfers] = useState<StockTransferRecord[]>(() => safeGetJSON('retail_pos_stock_transfers', INITIAL_STOCK_TRANSFERS));

  const [showStoreManagerModal, setShowStoreManagerModal] = useState<boolean>(() =>
    safeGetJSON<boolean>('retail_pos_show_store_modal', false, (val) => typeof val === 'boolean')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_show_store_modal', showStoreManagerModal);
  }, [showStoreManagerModal]);

  const [showStockAlertModal, setShowStockAlertModal] = useState<boolean>(false);
  const [showAiAssistantModal, setShowAiAssistantModal] = useState<boolean>(() =>
    safeGetJSON<boolean>('retail_pos_show_ai_modal', false, (val) => typeof val === 'boolean')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_show_ai_modal', showAiAssistantModal);
  }, [showAiAssistantModal]);

  const [newSaleTrigger, setNewSaleTrigger] = useState(0);

  const handleGlobalNewSale = () => {
    setActiveTab('pos');
    setIsMobileMenuOpen(false);
    setNewSaleTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<Product | null>(() =>
    safeGetJSON<Product | null>('retail_pos_history_product', null, (val) => Boolean(val && val.id))
  );
  useEffect(() => {
    safeSetJSON('retail_pos_history_product', selectedHistoryProduct);
  }, [selectedHistoryProduct]);

  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(() =>
    safeGetJSON<boolean>('retail_pos_show_history_modal', false, (val) => typeof val === 'boolean')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_show_history_modal', showHistoryModal);
  }, [showHistoryModal]);

  const [auditUrlProduct, setAuditUrlProduct] = useState<Product | null>(null);

  useEffect(() => {
    const handleUrlAudit = () => {
      try {
        if (typeof window === 'undefined') return;
        const searchParams = new URLSearchParams(window.location.search);
        const auditId = searchParams.get('itemAudit');
        if (auditId && products.length > 0) {
          const match = products.find(
            (p) =>
              p.id === auditId ||
              p.sku.toLowerCase() === auditId.toLowerCase() ||
              p.barcode === auditId
          );
          if (match) {
            setAuditUrlProduct(match);
          }
        }
      } catch (err) {
        console.warn('Error reading itemAudit URL param:', err);
      }
    };

    handleUrlAudit();
    window.addEventListener('popstate', handleUrlAudit);
    return () => window.removeEventListener('popstate', handleUrlAudit);
  }, [products]);

  // Save changes to LocalStorage
  useEffect(() => {
    safeSetJSON('retail_pos_stores', stores);
  }, [stores]);

  useEffect(() => {
    safeSetJSON('retail_pos_active_store_id', activeStoreId);
  }, [activeStoreId]);

  useEffect(() => {
    safeSetJSON('retail_pos_offers', offers);
  }, [offers]);

  useEffect(() => {
    safeSetJSON('retail_pos_online_orders', onlineOrders);
  }, [onlineOrders]);

  useEffect(() => {
    safeSetJSON('retail_pos_stock_transfers', stockTransfers);
  }, [stockTransfers]);

  useEffect(() => {
    safeSetJSON('retail_pos_products', products);
  }, [products]);

  useEffect(() => {
    safeSetJSON('retail_pos_commission_payouts', commissionPayouts);
  }, [commissionPayouts]);

  useEffect(() => {
    safeSetJSON('retail_pos_restock_records', restockRecords);
  }, [restockRecords]);

  useEffect(() => {
    safeSetJSON('retail_pos_customers', customers);
  }, [customers]);

  useEffect(() => {
    safeSetJSON('retail_pos_expenses', expenses);
  }, [expenses]);

  useEffect(() => {
    safeSetJSON('retail_pos_attendance', attendanceRecords);
  }, [attendanceRecords]);

  useEffect(() => {
    safeSetJSON('retail_pos_transactions', transactions);
  }, [transactions]);

  useEffect(() => {
    safeSetJSON('retail_pos_suppliers', suppliers);
  }, [suppliers]);

  useEffect(() => {
    safeSetJSON('retail_pos_cash_transactions', cashTransactions);
  }, [cashTransactions]);

  useEffect(() => {
    safeSetJSON('retail_pos_users', allUsers);
  }, [allUsers]);

  useEffect(() => {
    safeSetJSON('retail_pos_active_user', currentUser);
  }, [currentUser]);

  // Automatic Background Backup & Event-Driven Snapshots
  useEffect(() => {
    const handleBackupSnapshot = () => {
      try {
        const backupPayload = {
          timestamp: Date.now(),
          sales: transactions,
          staff: allUsers,
          products: products,
          expenses: expenses,
          settings: {
            activeStoreId,
            requirePinOnStartup,
            masterPin,
            ownerRecoveryEmail,
          }
        };
        localStorage.setItem('rofani_pos_auto_backup', JSON.stringify(backupPayload));
        localStorage.setItem('rofani_pos_last_snapshot', JSON.stringify(backupPayload));
      } catch (err) {
        console.warn('Could not save auto-backup snapshot:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleBackupSnapshot();
      }
    };

    window.addEventListener('beforeunload', handleBackupSnapshot);
    window.addEventListener('pagehide', handleBackupSnapshot);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBackupSnapshot);
      window.removeEventListener('pagehide', handleBackupSnapshot);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [transactions, allUsers, products, expenses, activeStoreId, requirePinOnStartup, masterPin, ownerRecoveryEmail]);

  // 1. Real-time synchronization subscription for transactions from Firestore
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToTransactions(
        (incomingRemoteSales) => {
          const existingLocalSales = safeGetJSON<Transaction[]>('retail_pos_transactions', transactions);
          const mergedSales = [...existingLocalSales];
          incomingRemoteSales.forEach((remoteTxn) => {
            if (!mergedSales.some((localTxn) => localTxn.id === remoteTxn.id)) {
              mergedSales.push(remoteTxn);
            }
          });
          mergedSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setTransactions(mergedSales);
          safeSetJSON('retail_pos_transactions', mergedSales);
        },
        (err) => {
          console.warn('Transactions subscription notice:', err);
        }
      );
    } catch (err) {
      console.warn('Could not subscribe to transactions:', err);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 2. Real-time synchronization subscription for all 302 products from Firestore
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToProducts(
        (incomingRemoteProducts) => {
          if (incomingRemoteProducts && incomingRemoteProducts.length > 0) {
            setProducts((prevLocalProducts) => {
              const merged = [...incomingRemoteProducts];
              prevLocalProducts.forEach((localItem) => {
                if (!merged.some((remoteItem) => remoteItem.id === localItem.id)) {
                  merged.push(localItem);
                }
              });
              safeSetJSON('retail_pos_products', merged);
              return merged;
            });
            setCloudSyncStatus('synced');
            setLastSyncedTime(new Date().toLocaleTimeString());
          }
        },
        (err) => {
          if (isQuotaExceededError(err)) {
            setIsCloudQuotaExceeded(true);
            setCloudSyncStatus('quota_exceeded');
          } else {
            console.warn('Products Firestore subscription notice:', err);
          }
        }
      );
    } catch (err) {
      console.warn('Could not subscribe to products:', err);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Offline and bidirectional cloud sync handler
  const syncPendingQueueToCloud = async () => {
    setCloudSyncStatus('syncing');

    // Push local sales to cloud
    const localSales = safeGetJSON<Transaction[]>('retail_pos_transactions', transactions);
    for (const tx of localSales) {
      try {
        await saveTransactionToCloud(tx);
      } catch (err) {
        console.warn(`[Sync] Could not push transaction ${tx.id} to cloud:`, err);
      }
    }

    const queue = getPendingSyncQueue();
    let syncedCount = 0;
    for (const item of queue) {
      try {
        if (item.type === 'sale') {
          await saveTransactionToCloud(item.data);
        } else if (item.type === 'product') {
          await saveProductToCloud(item.data);
        } else if (item.type === 'customer') {
          if (item.data?._deleted) {
            await deleteCustomerFromCloud(item.data.id);
          } else {
            await saveCustomerToCloud(item.data);
          }
        } else if (item.type === 'supplier') {
          if (item.data?._deleted) {
            await deleteSupplierFromCloud(item.data.id);
          } else {
            await saveSupplierToCloud(item.data);
          }
        } else if (item.type === 'expense') {
          await saveExpenseToCloud(item.data);
        } else if (item.type === 'restock') {
          await saveRestockRecordToCloud(item.data);
        } else if (item.type === 'user') {
          await saveUserToCloud(item.data);
        }
        removePendingSyncItem(item.id);
        syncedCount++;
      } catch (err) {
        if (isQuotaExceededError(err)) {
          setIsCloudQuotaExceeded(true);
          setCloudSyncStatus('quota_exceeded');
        } else {
          console.warn(`[Sync Queue] Offline action ${item.id} waiting for stable connection:`, err);
        }
        break;
      }
    }

    const existingLocalSales = safeGetJSON<Transaction[]>('retail_pos_transactions', transactions);
    setTransactions(existingLocalSales);
    safeSetJSON('retail_pos_transactions', existingLocalSales);

    setLastSyncedTime(new Date().toLocaleTimeString());
    setCloudSyncStatus('synced');
  };

  useEffect(() => {
    const handleReconnected = () => {
      syncPendingQueueToCloud();
    };

    window.addEventListener('online', handleReconnected);
    return () => {
      window.removeEventListener('online', handleReconnected);
    };
  }, []);

  useEffect(() => {
    let active = true;

    testFirestoreConnection().then((connected) => {
      if (!active) return;
      if (connected) {
        setCloudSyncStatus('synced');
        setLastSyncedTime(new Date().toLocaleTimeString());
      } else {
        setCloudSyncStatus('offline');
      }
    }).catch(() => {
      if (!active) return;
      setCloudSyncStatus('offline');
    });

    return () => {
      active = false;
    };
  }, []);

  // Sensitive Action Role Authorization & Audit Trail State
  const [auditLogs, setAuditLogs] = useState<SensitiveActionLog[]>(() =>
    loadAuditLogsFromStorage()
  );
  const [roleAuthRequest, setRoleAuthRequest] = useState<RoleAuthorizationRequest | null>(null);

  useEffect(() => {
    saveAuditLogsToStorage(auditLogs);
  }, [auditLogs]);

  const handleRecordAuditLog = (log: SensitiveActionLog) => {
    setAuditLogs((prev) => [log, ...prev]);
    saveAuditLogToCloud(log).catch((err) =>
      console.warn('Could not sync audit log to cloud:', err)
    );
  };

  const [scanLogs, setScanLogs] = useState<BarcodeScanLog[]>(() =>
    safeGetJSON('retail_pos_barcode_scan_logs', INITIAL_BARCODE_SCAN_LOGS)
  );

  useEffect(() => {
    safeSetJSON('retail_pos_barcode_scan_logs', scanLogs);
  }, [scanLogs]);

  const handleRecordScanLog = (log: BarcodeScanLog) => {
    setScanLogs((prev) => [log, ...prev].slice(0, 1000));
  };

  const handleClearScanLogs = () => {
    setScanLogs([]);
    safeSetJSON('retail_pos_barcode_scan_logs', []);
  };

  // Worker & PIN Auth Handlers
  const handleAddUser = (newUser: User) => {
    const roles = getUserRoles(newUser);
    const sanitizedUser: User = {
      ...newUser,
      roles: newUser.roles && newUser.roles.length > 0 ? newUser.roles : roles,
      assignedRoles: newUser.roles && newUser.roles.length > 0 ? newUser.roles : roles,
    };
    setAllUsers((prev) => {
      const updated = [...prev, sanitizedUser];
      safeSetJSON('retail_pos_users', updated);
      return updated;
    });
    saveUserToCloud(sanitizedUser).catch((err) =>
      console.warn('Could not save user to cloud:', err)
    );
  };

  const handleUpdateUser = (updatedUser: User) => {
    const roles = getUserRoles(updatedUser);
    const sanitizedUser: User = {
      ...updatedUser,
      roles: updatedUser.roles && updatedUser.roles.length > 0 ? updatedUser.roles : roles,
    };
    setAllUsers((prev) => {
      const updated = prev.map((u) => (u.id === sanitizedUser.id ? sanitizedUser : u));
      safeSetJSON('retail_pos_users', updated);
      return updated;
    });
    if (currentUser.id === sanitizedUser.id) {
      setCurrentUser(sanitizedUser);
      safeSetJSON('retail_pos_active_user', sanitizedUser);
    }
    saveUserToCloud(sanitizedUser).catch((err) =>
      console.warn('Could not update user in cloud:', err)
    );
  };

  const handleDeleteUser = (userId: string) => {
    setAllUsers((prev) => {
      const remaining = prev.filter((u) => u.id !== userId);
      safeSetJSON('retail_pos_users', remaining);
      return remaining;
    });
    if (currentUser.id === userId) {
      const remainingUser = allUsers.find((u) => u.id !== userId);
      if (remainingUser) {
        setCurrentUser(remainingUser);
        safeSetJSON('retail_pos_active_user', remainingUser);
      }
    }
    deleteUserFromCloud(userId).catch((err) =>
      console.warn('Could not delete user from cloud:', err)
    );
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    safeSetJSON('retail_pos_active_user', user);
    setPinModalTargetUser(null);
    setIsTerminalLocked(false);
    setTemporarilyUnlockedTabs(new Set());
    if (!hasTabPermission(user, activeTab as TabKey)) {
      if (hasRole(user, 'Inventory Staff') || hasRole(user, 'Stock Ins Role') || hasRole(user, 'Stock Setup Role')) {
        setActiveTab('inventory');
      } else if (hasRole(user, 'Expenses Role')) {
        setActiveTab('expenses');
      } else {
        setActiveTab('pos');
      }
    }
  };

  const handleUpdateMasterPin = async (newPin: string) => {
    setMasterPin(newPin);
    safeSetJSON('retail_pos_master_pin', newPin);
    try {
      await saveStoreSecurityToCloud({
        requirePinOnStartup,
        masterPin: newPin,
        recoveryEmail: ownerRecoveryEmail,
        emergencyKey: emergencyRecoveryKey,
      });
    } catch (err) {
      console.warn('Could not sync master PIN to cloud:', err);
    }
  };

  const handleResetAdminPin = async (newPin: string, targetUserId: string) => {
    setAllUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === targetUserId) {
          const userRoles = Array.from(new Set([...(u.roles || []), 'Admin' as Role]));
          return {
            ...u,
            pin: newPin,
            role: 'Admin' as Role,
            roles: userRoles,
            permissions: { ...DEFAULT_ROLE_WORKER_PERMISSIONS['Admin'] },
          };
        }
        return u;
      });
      safeSetJSON('retail_pos_users', updated);
      return updated;
    });

    const target = allUsers.find((u) => u.id === targetUserId);
    if (target) {
      const updatedUser: User = {
        ...target,
        pin: newPin,
        role: 'Admin',
        roles: Array.from(new Set([...(target.roles || []), 'Admin' as Role])),
        permissions: { ...DEFAULT_ROLE_WORKER_PERMISSIONS['Admin'] },
      };
      if (currentUser.id === targetUserId) {
        setCurrentUser(updatedUser);
        safeSetJSON('retail_pos_active_user', updatedUser);
      }
      try {
        await saveUserToCloud(updatedUser);
      } catch (err) {
        console.warn('Could not sync reset admin PIN to cloud:', err);
      }
    }
  };

  const handleToggleRequirePinOnStartup = async (require: boolean) => {
    setRequirePinOnStartup(require);
    safeSetJSON('retail_pos_require_pin_startup', require);
    try {
      await saveStoreSecurityToCloud({
        requirePinOnStartup: require,
        masterPin,
        recoveryEmail: ownerRecoveryEmail,
        emergencyKey: emergencyRecoveryKey,
      });
    } catch (err) {
      console.warn('Could not sync security settings to cloud:', err);
    }
  };

  // Product Inventory Handlers with Firestore Batch Sync
  const handleAddProduct = async (productData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProducts((prev) => [newProduct, ...prev]);

    if (newProduct.imageUrl && newProduct.imageUrl.startsWith('data:image')) {
      saveProductImageToIndexedDB(newProduct.id, newProduct.imageUrl).catch(console.warn);
    }

    try {
      await saveProductToCloud(newProduct);
    } catch (err) {
      addPendingSyncItem('product', newProduct);
    }

    handleRecordAuditLog(
      buildSensitiveActionLog(
        SensitiveActionType.CREATE_PRODUCT,
        currentUser,
        newProduct.name,
        `Created new inventory product "${newProduct.name}" (SKU: ${newProduct.sku}) with stock ${newProduct.stock}.`,
        undefined,
        newProduct
      )
    );
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    const existing = products.find((p) => p.id === updatedProduct.id);
    const diff = existing ? computeProductDiff(existing, updatedProduct) : undefined;

    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );

    if (updatedProduct.imageUrl && updatedProduct.imageUrl.startsWith('data:image')) {
      saveProductImageToIndexedDB(updatedProduct.id, updatedProduct.imageUrl).catch(console.warn);
    }

    try {
      await saveProductToCloud(updatedProduct);
    } catch (err) {
      addPendingSyncItem('product', updatedProduct);
    }

    handleRecordAuditLog(
      buildSensitiveActionLog(
        SensitiveActionType.EDIT_PRODUCT,
        currentUser,
        updatedProduct.name,
        `Edited product details for "${updatedProduct.name}".`,
        existing,
        updatedProduct,
        diff
      )
    );
  };

  const handleDeleteProduct = async (productId: string) => {
    const target = products.find((p) => p.id === productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    deleteProductImageFromIndexedDB(productId).catch(console.warn);

    try {
      await deleteProductFromCloud(productId);
    } catch (err) {
      console.warn('Could not delete product from cloud:', err);
    }

    if (target) {
      handleRecordAuditLog(
        buildSensitiveActionLog(
          SensitiveActionType.DELETE_PRODUCT,
          currentUser,
          target.name,
          `Deleted product "${target.name}" (SKU: ${target.sku}) from catalog.`,
          target,
          undefined
        )
      );
    }
  };

  // Complete checkout & commit transaction atomically to Firestore
  const handleCompleteSale = async (transaction: Transaction) => {
    // 1. Decrement inventory stock locally
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const itemSold = transaction.items.find((item) => item.product.id === p.id);
        if (itemSold) {
          const newStock = Math.max(0, p.stock - itemSold.quantity);
          return { ...p, stock: newStock, updatedAt: new Date().toISOString() };
        }
        return p;
      })
    );

    // 2. Add transaction to state & rolling localStorage
    setTransactions((prev) => [transaction, ...prev]);

    // 3. Atomically commit both sale and decremented stocks to live Firestore
    try {
      await commitSaleToCloudBatch(transaction, products);
    } catch (err) {
      addPendingSyncItem('sale', transaction);
    }
  };

  // Customer Management Handlers
  const handleAddCustomer = async (cust: Omit<Customer, 'id'>) => {
    const newCust: Customer = {
      ...cust,
      id: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    setCustomers((prev) => [newCust, ...prev]);
    try {
      await saveCustomerToCloud(newCust);
    } catch {
      addPendingSyncItem('customer', newCust);
    }
  };

  const handleUpdateCustomer = async (cust: Customer) => {
    setCustomers((prev) => prev.map((c) => (c.id === cust.id ? cust : c)));
    try {
      await saveCustomerToCloud(cust);
    } catch {
      addPendingSyncItem('customer', cust);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteCustomerFromCloud(id);
    } catch {
      addPendingSyncItem('customer', { id, _deleted: true });
    }
  };

  // Supplier Management Handlers
  const handleAddSupplier = async (sup: Omit<Supplier, 'id'>) => {
    const newSup: Supplier = {
      ...sup,
      id: `sup-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    setSuppliers((prev) => [newSup, ...prev]);
    try {
      await saveSupplierToCloud(newSup);
    } catch {
      addPendingSyncItem('supplier', newSup);
    }
  };

  const handleUpdateSupplier = async (sup: Supplier) => {
    setSuppliers((prev) => prev.map((s) => (s.id === sup.id ? sup : s)));
    try {
      await saveSupplierToCloud(sup);
    } catch {
      addPendingSyncItem('supplier', sup);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    try {
      await deleteSupplierFromCloud(id);
    } catch {
      addPendingSyncItem('supplier', { id, _deleted: true });
    }
  };

  // Expenses Handlers
  const handleAddExpense = async (exp: Omit<Expense, 'id'>) => {
    const newExp: Expense = {
      ...exp,
      id: `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    setExpenses((prev) => [newExp, ...prev]);
    try {
      await saveExpenseToCloud(newExp);
    } catch {
      addPendingSyncItem('expense', newExp);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteExpenseFromCloud(id);
    } catch {
      // offline fallback
    }
  };

  const isAccessAllowed = hasTabPermission(currentUser, activeTab as TabKey) || temporarilyUnlockedTabs.has(activeTab as TabKey);

  // Render POS Interface Inside Desktop or Phone Frame
  const renderAppContent = () => {
    if (!isAccessAllowed) {
      return (
        <AccessRestrictedView
          currentUser={currentUser}
          tabName={activeTab}
          onRequestSupervisorUnlock={() => {
            setRoleAuthRequest({
              actionType: SensitiveActionType.SETTINGS_ACCESS,
              actionTitle: `Unlock ${activeTab.toUpperCase()} View`,
              details: `Worker ${currentUser.name} requested temporary access to ${activeTab} screen.`,
              onApproved: (authNote) => {
                setTemporarilyUnlockedTabs((prev) => new Set([...prev, activeTab as TabKey]));
                setRoleAuthRequest(null);
              },
              onDeclined: () => setRoleAuthRequest(null),
            });
          }}
        />
      );
    }

    switch (activeTab) {
      case 'pos':
        return (
          <POSView
            products={products}
            customers={customers}
            onCompleteSale={handleCompleteSale}
            currentUser={currentUser}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            activeStoreId={activeStoreId}
            stores={stores}
            newSaleTrigger={newSaleTrigger}
            onLogBarcodeScan={handleRecordScanLog}
          />
        );
      case 'inventory':
        return (
          <InventoryView
            products={products}
            categories={categories}
            suppliers={suppliers}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onRestock={(record) => {
              setRestockRecords((prev) => [record, ...prev]);
              saveRestockRecordToCloud(record).catch(console.warn);
            }}
            currentUser={currentUser}
            stores={stores}
            activeStoreId={activeStoreId}
            onViewHistory={(product) => {
              setSelectedHistoryProduct(product);
              setShowHistoryModal(true);
            }}
            lowStockOnlyFilter={inventoryLowStockOnly}
            onClearLowStockFilter={() => setInventoryLowStockOnly(false)}
            onLogBarcodeScan={handleRecordScanLog}
          />
        );
      case 'purchasing':
        return (
          <PurchasingView
            products={products}
            suppliers={suppliers}
            stores={stores}
            activeStoreId={activeStoreId}
            purchaseOrders={purchaseOrders}
            onSavePurchaseOrder={(po) => {
              setPurchaseOrders((prev) => {
                const idx = prev.findIndex((p) => p.id === po.id);
                if (idx >= 0) {
                  const updated = [...prev];
                  updated[idx] = po;
                  return updated;
                }
                return [po, ...prev];
              });
            }}
            onReceivePurchaseOrder={(receivedPO) => {
              setPurchaseOrders((prev) =>
                prev.map((po) => (po.id === receivedPO.id ? receivedPO : po))
              );
              // Auto increment inventory stock on receiving PO
              setProducts((prev) =>
                prev.map((prod) => {
                  const match = receivedPO.items.find((item) => item.productId === prod.id);
                  if (match) {
                    return {
                      ...prod,
                      stock: prod.stock + (match.receivedQuantity || match.quantity),
                    };
                  }
                  return prod;
                })
              );
            }}
            currentUser={currentUser}
          />
        );
      case 'stocktake':
        return (
          <PhysicalStockCountView
            products={products}
            currentUser={currentUser}
            activeStoreId={activeStoreId}
            onApplyStockCountAudit={(audit: StockCountAudit) => {
              setProducts((prev) =>
                prev.map((p) => {
                  const counted = audit.items.find((i) => i.productId === p.id);
                  return counted ? { ...p, stock: counted.countedQuantity } : p;
                })
              );
            }}
          />
        );
      case 'contacts':
        return (
          <CustomersSuppliersView
            customers={customers}
            suppliers={suppliers}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onAddSupplier={handleAddSupplier}
            onUpdateSupplier={handleUpdateSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            currentUser={currentUser}
          />
        );
      case 'cashmanagement':
        return (
          <CashManagementView
            cashTransactions={cashTransactions}
            onAddCashTransaction={(t) => setCashTransactions((prev) => [t, ...prev])}
            currentUser={currentUser}
            financingFacilities={financingFacilities}
            onAddFacility={(f) => setFinancingFacilities((prev) => [f, ...prev])}
            onAddFacilityRepayment={(facilityId, rep) => {
              setFinancingFacilities((prev) =>
                prev.map((f) =>
                  f.id === facilityId
                    ? {
                        ...f,
                        currentBalance: Math.max(0, f.currentBalance - rep.amount),
                        repayments: [...f.repayments, rep],
                      }
                    : f
                )
              );
            }}
          />
        );
      case 'expenses':
        return (
          <ExpensesView
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            currentUser={currentUser}
          />
        );
      case 'attendance':
        return (
          <AttendanceView
            attendanceRecords={attendanceRecords}
            onRecordAttendance={(att) => setAttendanceRecords((prev) => [att, ...prev])}
            staffUsers={allUsers}
            currentUser={currentUser}
          />
        );
      case 'reports':
        return (
          <ReportsView
            transactions={transactions}
            products={products}
            expenses={expenses}
            cashTransactions={cashTransactions}
            stores={stores}
            activeStoreId={activeStoreId}
            currentUser={currentUser}
            onUpdateTransaction={(updatedTx) => {
              setTransactions((prev) =>
                prev.map((t) => (t.id === updatedTx.id ? updatedTx : t))
              );
              saveTransactionToCloud(updatedTx).catch(console.warn);
            }}
          />
        );
      case 'auditlogs':
        return (
          <AuditLogsView
            auditLogs={auditLogs}
            scanLogs={scanLogs}
            onClearScanLogs={handleClearScanLogs}
            currentUser={currentUser}
          />
        );
      case 'onlinestore':
        return (
          <OnlineStorefrontView
            products={products}
            offers={offers}
            storeName="Rofani Electronics & Boutique"
            onPlaceOnlineOrder={(order) => {
              setOnlineOrders((prev) => [order, ...prev]);
            }}
          />
        );
      case 'onlineorders':
        return (
          <OnlineOrdersManagerView
            orders={onlineOrders}
            onUpdateOrderStatus={(orderId, status) => {
              setOnlineOrders((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, status } : o))
              );
            }}
          />
        );
      case 'settings':
        return (
          <DataManagementView
            products={products}
            transactions={transactions}
            expenses={expenses}
            staffUsers={allUsers}
            customers={customers}
            suppliers={suppliers}
            onRestoreProducts={(p) => setProducts(p)}
            onRestoreTransactions={(t) => setTransactions(t)}
            onRestoreExpenses={(e) => setExpenses(e)}
            onRestoreStaff={(s) => setAllUsers(s)}
            currentUser={currentUser}
            onOpenStaffManager={() => setShowStaffModal(true)}
            onOpenCloudSync={() => setShowCloudSyncModal(true)}
            activeStoreId={activeStoreId}
            requirePinOnStartup={requirePinOnStartup}
            onToggleRequirePinOnStartup={handleToggleRequirePinOnStartup}
            masterPin={masterPin}
            onUpdateMasterPin={handleUpdateMasterPin}
            ownerRecoveryEmail={ownerRecoveryEmail}
            emergencyRecoveryKey={emergencyRecoveryKey}
          />
        );
      case 'menu':
        return (
          <AppMenuView
            currentUser={currentUser}
            activeTab={activeTab}
            onSelectTab={(tab) => {
              setActiveTab(tab as AppTab);
              setIsMobileMenuOpen(false);
            }}
            onLockTerminal={() => setIsTerminalLocked(true)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans ${displayTheme === 'contrast' ? 'contrast-125' : ''}`}>
      {/* Offline sync alert banner */}
      <OfflineSyncBanner
        isQuotaExceeded={isCloudQuotaExceeded}
        onOpenCloudSync={() => setShowCloudSyncModal(true)}
      />

      {deviceFormat === 'phone' ? (
        <PhoneDeviceFrame
          orientation={phoneOrientation}
          model={phoneModel}
          onToggleOrientation={() =>
            setPhoneOrientation((prev) => (prev === 'portrait' ? 'landscape' : 'portrait'))
          }
          onSwitchToDesktop={() => setDeviceFormat('computer')}
          cloudSyncStatus={cloudSyncStatus}
          lastSyncedTime={lastSyncedTime}
          currentUser={currentUser}
          onLockTerminal={() => setIsTerminalLocked(true)}
          activeTab={activeTab}
          onSelectTab={(t) => setActiveTab(t as AppTab)}
        >
          {renderAppContent()}
        </PhoneDeviceFrame>
      ) : (
        /* Full Desktop Experience */
        <div className="flex-1 flex overflow-hidden">
          {/* Main POS Navigation Sidebar */}
          <aside
            className={`${
              isSidebarCollapsed ? 'w-20' : 'w-64'
            } bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-all duration-300 z-30 shrink-0`}
          >
            <div>
              {/* Brand Header */}
              <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-sky-500/20 shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="min-w-0">
                      <h1 className="font-black text-sm text-white tracking-wide truncate">
                        ROFANI POS
                      </h1>
                      <div className="flex items-center gap-1.5">
                        <NetworkStatusBadge />
                        <span className="text-[10px] text-slate-400 font-mono">
                          {products.length} Items
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {isSidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>
              </div>

              {/* Navigation Tabs List */}
              <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
                {[
                  { id: 'pos', label: 'Point of Sale', icon: ShoppingBag, color: 'text-sky-400' },
                  { id: 'inventory', label: 'Inventory (302 Items)', icon: Package, color: 'text-indigo-400' },
                  { id: 'purchasing', label: 'Purchases & Stock In', icon: Truck, color: 'text-teal-400' },
                  { id: 'stocktake', label: 'Physical Audit', icon: ClipboardList, color: 'text-cyan-400' },
                  { id: 'contacts', label: 'Customers & Suppliers', icon: Users, color: 'text-emerald-400' },
                  { id: 'cashmanagement', label: 'Finance & Banking', icon: Landmark, color: 'text-amber-400' },
                  { id: 'expenses', label: 'Store Expenses', icon: DollarSign, color: 'text-rose-400' },
                  { id: 'attendance', label: 'Staff Attendance', icon: UserCheck, color: 'text-purple-400' },
                  { id: 'reports', label: 'Reports & eTIMS', icon: FileText, color: 'text-blue-400' },
                  { id: 'auditlogs', label: 'Security & Audit', icon: ShieldCheck, color: 'text-yellow-400' },
                  { id: 'onlinestore', label: 'Online Storefront', icon: Globe, color: 'text-fuchsia-400' },
                  { id: 'onlineorders', label: 'Web Orders', icon: Tag, color: 'text-pink-400' },
                  { id: 'settings', label: 'Settings & Cloud', icon: Settings, color: 'text-slate-400' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isAllowed = hasTabPermission(currentUser, item.id as TabKey) || temporarilyUnlockedTabs.has(item.id as TabKey);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id as AppTab)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer select-none ${
                        isActive
                          ? 'bg-sky-500 text-slate-950 font-black shadow-lg shadow-sky-500/20'
                          : isAllowed
                          ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                          : 'text-slate-600 hover:bg-slate-900/60'
                      }`}
                      title={item.label}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : item.color}`} />
                      {!isSidebarCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                      {!isSidebarCollapsed && !isAllowed && (
                        <Lock className="w-3 h-3 ml-auto text-slate-600" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Sidebar User Profile & Lock Switcher */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/90">
              <div className="flex items-center justify-between gap-2">
                <div
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer p-1.5 rounded-xl hover:bg-slate-800/80 transition"
                  onClick={() => setIsTerminalLocked(true)}
                  title="Switch Staff / Lock Terminal"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="min-w-0 text-left">
                      <div className="text-xs font-bold text-white truncate">
                        {currentUser.name || 'Store Worker'}
                      </div>
                      <div className="text-[10px] text-sky-400 font-mono">
                        {currentUser.role || 'Staff'}
                      </div>
                    </div>
                  )}
                </div>

                {!isSidebarCollapsed && (
                  <button
                    type="button"
                    onClick={() => setIsTerminalLocked(true)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition cursor-pointer"
                    title="Lock terminal screen"
                  >
                    <Lock className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* Main Center Stage */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">
            {/* Top Toolbar */}
            <header className="h-16 border-b border-slate-800 bg-slate-900/60 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleGlobalNewSale}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>NEW SALE</span>
                </button>

                <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Building2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Rofani Electronics</span>
                </div>
              </div>

              {/* Format Switcher & Tools */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeviceFormat('phone')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                  title="Switch to Mobile Frame"
                >
                  <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden md:inline">Phone View</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCloudSyncModal(true)}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer"
                  title="Cloud Sync Database"
                >
                  <Cloud className="w-4 h-4 text-sky-400" />
                </button>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer"
                  title="Fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </header>

            {/* View Render Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 min-h-0">
              {renderAppContent()}
            </div>
          </main>
        </div>
      )}

      {/* Security Staff Switcher / Terminal PIN Screen */}
      <PinLoginModal
        isOpen={isTerminalLocked}
        users={allUsers}
        currentUser={currentUser}
        initialTargetUser={pinModalTargetUser}
        onLoginSuccess={handleLoginSuccess}
        isMandatory={requirePinOnStartup}
        masterPin={masterPin}
        storeName="ROFANI POS SYSTEM"
        recoveryEmail={ownerRecoveryEmail}
        emergencyKey={emergencyRecoveryKey}
        onResetAdminPin={handleResetAdminPin}
        onResetMasterPin={handleUpdateMasterPin}
        onClose={requirePinOnStartup ? undefined : () => setIsTerminalLocked(false)}
      />

      {/* Cloud Sync Center Modal */}
      <CloudSyncModal
        isOpen={showCloudSyncModal}
        onClose={() => setShowCloudSyncModal(false)}
        products={products}
        transactions={transactions}
        users={allUsers}
        customers={customers}
        suppliers={suppliers}
        expenses={expenses}
        onUploadAllToCloud={async () => {
          await bulkUploadProductsToCloud(products);
          await bulkUploadUsersToCloud(allUsers);
        }}
        cloudSyncStatus={cloudSyncStatus}
        lastSyncedTime={lastSyncedTime}
      />

      {/* Staff Management Modal */}
      {showStaffModal && (
        <StaffManagementModal
          isOpen={showStaffModal}
          onClose={() => setShowStaffModal(false)}
          users={allUsers}
          currentUser={currentUser}
          onAddUser={handleAddUser}
          onUpdateUser={handleUpdateUser}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {/* Role Authorization Supervisor Prompt */}
      {roleAuthRequest && (
        <RoleAuthorizationModal
          isOpen={Boolean(roleAuthRequest)}
          users={allUsers}
          request={roleAuthRequest}
          onClose={() => setRoleAuthRequest(null)}
        />
      )}

      {/* Barcode Print Tool */}
      {showPrintBarcodesModal && (
        <PrintBarcodesUtilityModal
          isOpen={showPrintBarcodesModal}
          onClose={() => setShowPrintBarcodesModal(false)}
          products={products}
        />
      )}

      {/* Product Stock and History Modal */}
      {showHistoryModal && selectedHistoryProduct && (
        <ItemHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          product={selectedHistoryProduct}
          transactions={transactions}
          restockRecords={restockRecords}
        />
      )}

      {/* Mobile Floating Quick Action Widget */}
      <FloatingToolWidget
        onNewSale={handleGlobalNewSale}
        onOpenCloudSync={() => setShowCloudSyncModal(true)}
        onLockTerminal={() => setIsTerminalLocked(true)}
      />
    </div>
  );
}
