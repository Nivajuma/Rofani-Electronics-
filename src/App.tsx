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
  Barcode
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
  SensitiveActionType
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
  INITIAL_BARCODE_SCAN_LOGS
} from './data/initialData';
import { POSView } from './components/POS/POSView';
import { InventoryView } from './components/Inventory/InventoryView';
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
  subscribeToTransactions,
  saveTransactionToCloud,
  subscribeToCustomers,
  saveCustomerToCloud,
  subscribeToSuppliers,
  saveSupplierToCloud,
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
import { testFirestoreConnection, isQuotaExceededError } from './lib/firebase';
import { safeGetJSON, safeSetJSON } from './utils/safeStorage';
import {
  getAllProductImagesFromIndexedDB,
  saveProductImageToIndexedDB,
  deleteProductImageFromIndexedDB,
} from './utils/imageStorage';

export default function App() {
  // Navigation & Display Layout State
  const [activeTab, setActiveTab] = useState<
    'pos' | 'inventory' | 'stocktake' | 'contacts' | 'cashmanagement' | 'expenses' | 'attendance' | 'reports' | 'onlinestore' | 'onlineorders' | 'settings' | 'auditlogs'
  >('pos');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [displayTheme, setDisplayTheme] = useState<'light' | 'dark' | 'contrast'>('light');
  const [fontScale, setFontScale] = useState<'normal' | 'large'>('normal');

  // Format Switcher State (Computer / Desktop vs Mobile Phone Frame)
  const [deviceFormat, setDeviceFormat] = useState<'computer' | 'phone'>(() => {
    const saved = safeGetJSON('retail_pos_device_format', null);
    if (saved === 'computer' || saved === 'phone') return saved;
    // Auto-detect mobile phone screens on first visit
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'phone';
    }
    return 'computer';
  });

  useEffect(() => {
    safeSetJSON('retail_pos_device_format', deviceFormat);
  }, [deviceFormat]);

  const [phoneOrientation, setPhoneOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [phoneModel, setPhoneModel] = useState<'iphone15pro' | 'galaxyS24' | 'pixel8'>('iphone15pro');

  // Stock alert filter toggle state
  const [inventoryLowStockOnly, setInventoryLowStockOnly] = useState<boolean>(false);

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

  // Role, Worker Users & PIN Security State
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const rawUsers = safeGetJSON<User[]>('retail_pos_users', INITIAL_USERS);
    // Ensure all workers have their roles[] array populated
    const migrated = rawUsers.map((u) => {
      const userRoles = getUserRoles(u);
      return {
        ...u,
        roles: u.roles && u.roles.length > 0 ? Array.from(new Set([...u.roles, ...userRoles])) : userRoles,
      };
    });

    // Safeguard: Ensure at least one worker has the Admin role so store owner is NEVER locked out!
    const hasAdmin = migrated.some((u) => hasRole(u, 'Admin'));
    if (!hasAdmin && migrated.length > 0) {
      const adminCandidateIdx = migrated.findIndex((u) => u.id === 'usr-1');
      const targetIdx = adminCandidateIdx >= 0 ? adminCandidateIdx : 0;
      migrated[targetIdx] = {
        ...migrated[targetIdx],
        role: 'Admin',
        roles: Array.from(new Set([...(migrated[targetIdx].roles || []), 'Admin' as Role])),
        pin: migrated[targetIdx].pin || '1234',
        permissions: { ...DEFAULT_ROLE_WORKER_PERMISSIONS['Admin'] },
      };
      safeSetJSON('retail_pos_users', migrated);
    }
    return migrated;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const rawCurrent = safeGetJSON<User>('retail_pos_active_user', INITIAL_USERS[0]);
    const userRoles = getUserRoles(rawCurrent);
    return {
      ...rawCurrent,
      roles: rawCurrent.roles && rawCurrent.roles.length > 0 ? Array.from(new Set([...rawCurrent.roles, ...userRoles])) : userRoles,
    };
  });

  // Security Configuration (PIN Protection before sharing with anyone)
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
  // If requirePinOnStartup is true, lock the terminal immediately on startup
  const [isTerminalLocked, setIsTerminalLocked] = useState<boolean>(() =>
    safeGetJSON('retail_pos_require_pin_startup', true)
  );
  // Target user when switching workers via PIN lock modal
  const [pinModalTargetUser, setPinModalTargetUser] = useState<User | null>(null);
  // Set of tabs temporarily authorized by supervisor PIN during active session
  const [temporarilyUnlockedTabs, setTemporarilyUnlockedTabs] = useState<Set<TabKey>>(new Set());
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showCloudSyncModal, setShowCloudSyncModal] = useState(false);
  const [showPrintBarcodesModal, setShowPrintBarcodesModal] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error' | 'quota_exceeded'>('syncing');
  const [isCloudQuotaExceeded, setIsCloudQuotaExceeded] = useState<boolean>(false);
  const [showQuotaBanner, setShowQuotaBanner] = useState<boolean>(true);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  // Application Persistent Collections State with localStorage sync
  const [products, setProducts] = useState<Product[]>(() => safeGetJSON('retail_pos_products', INITIAL_PRODUCTS));

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

  const [expenses, setExpenses] = useState<Expense[]>(() => safeGetJSON('retail_pos_expenses', INITIAL_EXPENSES));

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => safeGetJSON('retail_pos_attendance', INITIAL_ATTENDANCE));

  const [transactions, setTransactions] = useState<Transaction[]>(() => safeGetJSON('retail_pos_transactions', INITIAL_TRANSACTIONS));

  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(() => safeGetJSON('retail_pos_cash_transactions', INITIAL_CASH_TRANSACTIONS));

  const [restockRecords, setRestockRecords] = useState<RestockRecord[]>(() => safeGetJSON('retail_pos_restock_records', INITIAL_RESTOCK_RECORDS));

  const [commissionPayouts, setCommissionPayouts] = useState<StaffCommissionPayout[]>(() => safeGetJSON('retail_pos_commission_payouts', INITIAL_COMMISSION_PAYOUTS));

  const [workerLoans, setWorkerLoans] = useState<WorkerLoan[]>(() => safeGetJSON('retail_pos_worker_loans', INITIAL_WORKER_LOANS));

  useEffect(() => {
    safeSetJSON('retail_pos_worker_loans', workerLoans);
  }, [workerLoans]);

  const [financingFacilities, setFinancingFacilities] = useState<FinancingFacility[]>(() => safeGetJSON('retail_pos_financing_facilities', INITIAL_FINANCING_FACILITIES));

  useEffect(() => {
    safeSetJSON('retail_pos_financing_facilities', financingFacilities);
  }, [financingFacilities]);

  // Multi-Store Outlets & Online Sales State
  const [stores, setStores] = useState<StoreLocation[]>(() => safeGetJSON('retail_pos_stores', INITIAL_STORES));

  const [activeStoreId, setActiveStoreId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('retail_pos_active_store_id');
      return saved || 'store-main';
    } catch {
      return 'store-main';
    }
  });

  const [offers, setOffers] = useState<OfferDeal[]>(() => safeGetJSON('retail_pos_offers', INITIAL_OFFERS));

  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>(() => safeGetJSON('retail_pos_online_orders', INITIAL_ONLINE_ORDERS));

  const [stockTransfers, setStockTransfers] = useState<StockTransferRecord[]>(() => safeGetJSON('retail_pos_stock_transfers', INITIAL_STOCK_TRANSFERS));

  const [showStoreManagerModal, setShowStoreManagerModal] = useState(false);
  const [showAiAssistantModal, setShowAiAssistantModal] = useState(false);

  // New Sale global trigger counter
  const [newSaleTrigger, setNewSaleTrigger] = useState(0);

  const handleGlobalNewSale = () => {
    setActiveTab('pos');
    setIsMobileMenuOpen(false);
    setNewSaleTrigger((prev) => prev + 1);
  };

  // Close mobile drawer whenever active tab changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  // Selected product for Restock & Sales History audit modal
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<Product | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Save changes to LocalStorage
  useEffect(() => {
    safeSetJSON('retail_pos_stores', stores);
  }, [stores]);

  useEffect(() => {
    try {
      localStorage.setItem('retail_pos_active_store_id', activeStoreId);
    } catch {}
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

  // Save changes to LocalStorage with quota and OOM protection
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

  // Real-Time Firebase Firestore Cloud Synchronization Across All Mobile Phones & Devices
  useEffect(() => {
    let active = true;

    const handleSyncError = (error: any, collectionName: string) => {
      if (!active) return;
      if (isQuotaExceededError(error)) {
        setIsCloudQuotaExceeded(true);
        setCloudSyncStatus('quota_exceeded');
        console.warn(
          `[Firestore Quota Notice] Free daily read units quota reached for ${collectionName}. POS operating seamlessly in offline local storage mode.`
        );
      } else {
        setCloudSyncStatus('offline');
        console.warn(`Realtime ${collectionName} sync notice:`, error?.message || error);
      }
    };

    // Test connection first
    testFirestoreConnection().then((connected) => {
      if (!active) return;
      if (connected) {
        setCloudSyncStatus('synced');
        setLastSyncedTime(new Date().toLocaleTimeString());
      } else {
        setCloudSyncStatus('offline');
      }
    });

    // 1. Subscribe to Products
    const unsubProducts = subscribeToProducts(
      (cloudProducts) => {
        if (!active) return;
        if (cloudProducts && cloudProducts.length > 0) {
          setProducts(cloudProducts);
        }
        setCloudSyncStatus('synced');
        setLastSyncedTime(new Date().toLocaleTimeString());
      },
      (error) => handleSyncError(error, 'products')
    );

    // 2. Subscribe to Transactions (Sales & Invoices)
    const unsubTransactions = subscribeToTransactions(
      (cloudTransactions) => {
        if (!active) return;
        if (cloudTransactions && cloudTransactions.length > 0) {
          setTransactions(cloudTransactions);
        }
        setCloudSyncStatus('synced');
        setLastSyncedTime(new Date().toLocaleTimeString());
      },
      (error) => handleSyncError(error, 'transactions')
    );

    // 3. Subscribe to Customers
    const unsubCustomers = subscribeToCustomers(
      (cloudCustomers) => {
        if (!active) return;
        if (cloudCustomers && cloudCustomers.length > 0) {
          setCustomers(cloudCustomers);
        }
      },
      (error) => handleSyncError(error, 'customers')
    );

    // 4. Subscribe to Suppliers
    const unsubSuppliers = subscribeToSuppliers(
      (cloudSuppliers) => {
        if (!active) return;
        if (cloudSuppliers && cloudSuppliers.length > 0) {
          setSuppliers(cloudSuppliers);
        }
      },
      (error) => handleSyncError(error, 'suppliers')
    );

    // 5. Subscribe to Expenses
    const unsubExpenses = subscribeToExpenses(
      (cloudExpenses) => {
        if (!active) return;
        if (cloudExpenses && cloudExpenses.length > 0) {
          setExpenses(cloudExpenses);
        }
      },
      (error) => handleSyncError(error, 'expenses')
    );

    // 6. Subscribe to Restock Records
    const unsubRestock = subscribeToRestockRecords(
      (cloudRestock) => {
        if (!active) return;
        if (cloudRestock && cloudRestock.length > 0) {
          setRestockRecords(cloudRestock);
        }
      },
      (error) => handleSyncError(error, 'restock')
    );

    // 7. Subscribe to Store Security & Master PIN Config
    const unsubSecurity = subscribeToStoreSecurity(
      (securityConfig) => {
        if (!active) return;
        if (securityConfig) {
          if (typeof securityConfig.requirePinOnStartup === 'boolean') {
            setRequirePinOnStartup(securityConfig.requirePinOnStartup);
            safeSetJSON('retail_pos_require_pin_startup', securityConfig.requirePinOnStartup);
          }
          if (securityConfig.masterPin) {
            setMasterPin(securityConfig.masterPin);
            safeSetJSON('retail_pos_master_pin', securityConfig.masterPin);
          }
          if (securityConfig.recoveryEmail) {
            setOwnerRecoveryEmail(securityConfig.recoveryEmail);
            safeSetJSON('retail_pos_recovery_email', securityConfig.recoveryEmail);
          }
          if (securityConfig.emergencyKey) {
            setEmergencyRecoveryKey(securityConfig.emergencyKey);
            safeSetJSON('retail_pos_emergency_key', securityConfig.emergencyKey);
          }
        }
      },
      (error) => handleSyncError(error, 'security')
    );

    // 8. Subscribe to Users (Staff members & Worker Profiles)
    const unsubUsers = subscribeToUsers(
      (cloudUsers) => {
        if (!active) return;
        if (cloudUsers && cloudUsers.length > 0) {
          const migrated = cloudUsers.map((u) => {
            const userRoles = getUserRoles(u);
            return {
              ...u,
              roles: u.roles && u.roles.length > 0 ? Array.from(new Set([...u.roles, ...userRoles])) : userRoles,
            };
          });

          // Safeguard: Ensure at least one worker has the Admin role
          const hasAdmin = migrated.some((u) => hasRole(u, 'Admin'));
          if (!hasAdmin && migrated.length > 0) {
            const adminCandidateIdx = migrated.findIndex((u) => u.id === 'usr-1');
            const targetIdx = adminCandidateIdx >= 0 ? adminCandidateIdx : 0;
            migrated[targetIdx] = {
              ...migrated[targetIdx],
              role: 'Admin',
              roles: Array.from(new Set([...(migrated[targetIdx].roles || []), 'Admin' as Role])),
              permissions: { ...DEFAULT_ROLE_WORKER_PERMISSIONS['Admin'] },
            };
          }

          setAllUsers(migrated);
          safeSetJSON('retail_pos_users', migrated);
        } else {
          // If Firestore users collection is newly provisioned, upload current staff profiles to bootstrap cloud
          bulkUploadUsersToCloud(allUsers).catch((err) => {
            console.warn('Initial staff cloud upload notice:', err);
          });
        }
      },
      (error) => handleSyncError(error, 'users')
    );

    // 9. Subscribe to Sensitive Action & Audit Logs
    const unsubAudit = subscribeToAuditLogs(
      (cloudLogs) => {
        if (!active) return;
        if (cloudLogs && cloudLogs.length > 0) {
          setAuditLogs(cloudLogs);
          safeSetJSON('retail_pos_sensitive_action_logs', cloudLogs);
        }
      },
      (error) => handleSyncError(error, 'audit')
    );

    return () => {
      active = false;
      unsubProducts();
      unsubTransactions();
      unsubCustomers();
      unsubSuppliers();
      unsubExpenses();
      unsubRestock();
      unsubSecurity();
      unsubUsers();
      unsubAudit();
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

  // Barcode Scanner Activity & Staff Scans Audit Log State
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
    // If the active user was deleted, switch to the first remaining user safely
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
      });
    } catch (err) {
      console.warn('Could not sync security settings to cloud:', err);
    }
  };

  // Low stock counter
  const lowStockProducts = products.filter((p) => p.stockQuantity <= p.minStockAlert);
  const lowStockCount = lowStockProducts.length;

  // Header Calculations for Today's Sales and Gross Profit
  const todayStr = new Date().toDateString();
  const todayTransactions = transactions.filter(
    (tx) => new Date(tx.date).toDateString() === todayStr
  );

  const todaySales = todayTransactions.reduce((sum, tx) => sum + tx.grandTotal, 0);

  let todayCOGS = 0;
  todayTransactions.forEach((tx) => {
    tx.items.forEach((item) => {
      todayCOGS += (item.product.costPrice || 0) * item.quantity;
    });
  });

  const totalGrossSales = transactions.reduce((sum, tx) => sum + tx.grandTotal, 0);
  let totalCOGS = 0;
  transactions.forEach((tx) => {
    tx.items.forEach((item) => {
      totalCOGS += (item.product.costPrice || 0) * item.quantity;
    });
  });

  const grossProfitAmount = totalGrossSales - totalCOGS;
  const profitMarginPercent = totalGrossSales > 0 ? (grossProfitAmount / totalGrossSales) * 100 : 0;

  // Handlers for state updates
  const handlePayCommission = (payout: StaffCommissionPayout) => {
    setCommissionPayouts((prev) => [payout, ...prev]);

    // Record expense for paid commission
    if (payout.paidAmount > 0) {
      const commExpense: Expense = {
        id: `exp-comm-${Date.now()}`,
        date: payout.startDate || (payout.date.length === 10 ? payout.date : new Date().toISOString().slice(0, 10)),
        category: 'Salaries',
        description: `Worker Sales Commission: ${payout.employeeName} (${payout.salesCount} sales, base: KSh ${payout.totalSalesAmount.toLocaleString()})`,
        amount: payout.paidAmount,
        paymentMethod: payout.paymentMethod === 'salary_addition' ? 'bank_transfer' : ((payout.paymentMethod as any) || 'mpesa'),
        recordedBy: payout.paidBy || currentUser.name,
        receiptNo: payout.referenceNo || payout.id,
        recurringType: 'One-Time',
        status: 'Paid'
      };
      setExpenses((prev) => [commExpense, ...prev]);
    }

    // Automatically apply loan deduction to worker loan if applicable
    if (payout.loanDeduction && payout.deductedLoanId && payout.loanDeduction > 0) {
      const repayment: WorkerLoanRepayment = {
        id: `rep-comm-${Date.now()}`,
        loanId: payout.deductedLoanId,
        amount: payout.loanDeduction,
        date: new Date().toISOString().slice(0, 10),
        paymentMethod: 'salary_deduction',
        referenceNo: payout.referenceNo || payout.id,
        notes: `Automatic deduction from sales commission payout (${payout.id})`,
        recordedBy: `${currentUser.name} (${currentUser.role})`
      };
      handleRepayWorkerLoan(payout.deductedLoanId, repayment);
    }
  };

  const handleUpdateUserCommissionRate = (userId: string, newRate: number) => {
    setAllUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, commissionRate: newRate } : u))
    );
  };

  const handleUpdateUserCommissionSettings = (userId: string, settings: Partial<User>) => {
    setAllUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...settings } : u))
    );
    if (currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev, ...settings }));
    }
  };

  const handleReattributeSale = (txId: string, salesRepId: string, salesRepName: string) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === txId ? { ...tx, salesRepId, salesRepName } : tx))
    );
  };

  const handleCompleteSale = (
    tx: Transaction,
    updatedProducts: Product[],
    updatedCustomers: Customer[]
  ) => {
    setTransactions((prev) => [tx, ...prev]);
    setProducts(updatedProducts);
    setCustomers(updatedCustomers);

    // Real-Time Cloud Sync to Firestore for all connected worker mobile devices
    saveTransactionToCloud(tx).catch((err) => {
      if (isQuotaExceededError(err)) {
        setIsCloudQuotaExceeded(true);
        setCloudSyncStatus('quota_exceeded');
      }
    });
    updatedProducts.forEach((p) => saveProductToCloud(p).catch(() => {}));
    updatedCustomers.forEach((c) => saveCustomerToCloud(c).catch(() => {}));
  };

  const handleAddCustomer = (newCust: Customer) => {
    setCustomers((prev) => [...prev, newCust]);
    saveCustomerToCloud(newCust).catch(() => {});
  };

  const handleSaveCustomer = (cust: Customer) => {
    setCustomers((prev) => {
      const idx = prev.findIndex((c) => c.id === cust.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = cust;
        return copy;
      }
      return [cust, ...prev];
    });
    saveCustomerToCloud(cust).catch(() => {});
  };

  const handleDeleteCustomer = (customerId: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
  };

  const handleSaveSupplier = (sup: Supplier) => {
    setSuppliers((prev) => {
      const idx = prev.findIndex((s) => s.id === sup.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = sup;
        return copy;
      }
      return [...prev, sup];
    });
    saveSupplierToCloud(sup).catch(() => {});
  };

  const handleDeleteSupplier = (supplierId: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== supplierId));
  };

  const handleRecordCustomerDebtPayment = (
    customerId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    reference?: string,
    notes?: string
  ) => {
    let customerName = 'Customer';
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          customerName = c.name;
          const newBalance = Math.max(0, (c.currentBalanceDue || 0) - amount);
          return {
            ...c,
            currentBalanceDue: newBalance,
            updatedAt: new Date().toISOString().slice(0, 10),
          };
        }
        return c;
      })
    );

    const cashEntry: CashTransaction = {
      id: `cash-in-${Date.now()}`,
      type: 'CASH_IN',
      category: 'Customer Debt Payment',
      amount,
      date: new Date().toISOString(),
      sourceDestination: customerName,
      referenceNo: reference || `DEBT-REC-${Date.now().toString().slice(-6)}`,
      paymentMethod: paymentMethod === 'cheque' ? 'cheque' : paymentMethod === 'mpesa' ? 'mpesa' : 'cash',
      description: `Debt repayment from ${customerName}${notes ? ` - ${notes}` : ''}`,
      recordedBy: `${currentUser.name} (${currentUser.role})`,
      status: 'Completed',
      notes: notes || undefined,
    };
    setCashTransactions((prev) => [cashEntry, ...prev]);
  };

  const handleRecordSupplierPayment = (
    supplierId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    reference?: string,
    notes?: string
  ) => {
    let supplierName = 'Supplier';
    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id === supplierId) {
          supplierName = s.name;
          const newBalance = Math.max(0, (s.currentBalanceDue || 0) - amount);
          return {
            ...s,
            currentBalanceDue: newBalance,
            updatedAt: new Date().toISOString().slice(0, 10),
          };
        }
        return s;
      })
    );

    const cashEntry: CashTransaction = {
      id: `cash-out-${Date.now()}`,
      type: 'CASH_OUT',
      category: 'Supplier Cash Payment',
      amount,
      date: new Date().toISOString(),
      sourceDestination: supplierName,
      referenceNo: reference || `SUP-PAY-${Date.now().toString().slice(-6)}`,
      paymentMethod: paymentMethod === 'cheque' ? 'cheque' : paymentMethod === 'mpesa' ? 'mpesa' : 'cash',
      description: `Accounts payable settlement to ${supplierName}${notes ? ` - ${notes}` : ''}`,
      recordedBy: `${currentUser.name} (${currentUser.role})`,
      status: 'Completed',
      notes: notes || undefined,
    };
    setCashTransactions((prev) => [cashEntry, ...prev]);
  };

  const handleImportCustomers = (newCustomers: Customer[]) => {
    setCustomers((prev) => {
      const existingPhones = new Set(prev.map((c) => c.phone.trim()).filter((p) => p !== 'N/A'));
      const existingNames = new Set(prev.map((c) => c.name.toLowerCase().trim()));
      const uniqueNew = newCustomers.filter(
        (c) =>
          (c.phone !== 'N/A' && !existingPhones.has(c.phone.trim())) ||
          (c.phone === 'N/A' && !existingNames.has(c.name.toLowerCase().trim()))
      );
      return [...prev, ...uniqueNew];
    });
  };

  const handleImportSuppliers = (newSuppliers: Supplier[]) => {
    setSuppliers((prev) => {
      const existingNames = new Set(prev.map((s) => s.name.toLowerCase().trim()));
      const uniqueNew = newSuppliers.filter((s) => !existingNames.has(s.name.toLowerCase().trim()));
      return [...prev, ...uniqueNew];
    });
  };

  const handleSaveProduct = (prod: Product) => {
    const existing = products.find((p) => p.id === prod.id);

    const performSave = (authorizingRole?: Role, reason?: string) => {
      if (prod.imageUrl && prod.imageUrl.trim() !== '') {
        saveProductImageToIndexedDB(prod.id, prod.imageUrl);
      }
      setProducts((prev) => {
        const idx = prev.findIndex((p) => p.id === prod.id);
        if (idx > -1) {
          const copy = [...prev];
          copy[idx] = prod;
          return copy;
        }
        return [prod, ...prev];
      });

      // Real-Time Cloud Sync to Firestore
      saveProductToCloud(prod).catch(() => {});

      if (existing && authorizingRole) {
        const diff = computeProductDiff(existing, prod);
        const diffKeys = Object.keys(diff);
        const diffSummary = diffKeys.map(
          (k) => `${k}: ${existing[k as keyof Product]} → ${prod[k as keyof Product]}`
        );

        const log = buildSensitiveActionLog({
          actionType: 'MODIFY_INVENTORY',
          actionTitle: `Modified Product: ${prod.name}`,
          user: currentUser,
          authorizingRole,
          targetId: prod.id,
          targetName: prod.name,
          details: {
            summary: diffSummary.length > 0
              ? `Updated ${diffSummary.join(', ')} on ${prod.name}`
              : `Updated catalog attributes for ${prod.name}`,
            before: existing,
            after: prod,
            diff,
          },
          reason,
          severity: 'high',
        });
        handleRecordAuditLog(log);
      }
    };

    if (existing) {
      const diff = computeProductDiff(existing, prod);
      const diffKeys = Object.keys(diff);
      if (diffKeys.length > 0) {
        const qualifyingRoles = getQualifyingRolesForAction(currentUser, 'MODIFY_INVENTORY');
        const userRoles = getUserRoles(currentUser);

        if (qualifyingRoles.length > 1 || userRoles.length > 1) {
          const diffSummary = diffKeys.map(
            (k) => `${k}: ${existing[k as keyof Product]} → ${prod[k as keyof Product]}`
          );

          setRoleAuthRequest({
            actionType: 'MODIFY_INVENTORY',
            actionTitle: `Modify Product: ${prod.name}`,
            targetId: prod.id,
            targetName: prod.name,
            qualifyingRoles: qualifyingRoles.length > 0 ? qualifyingRoles : userRoles,
            user: currentUser,
            diffSummary,
            metadata: { before: existing, after: prod },
            onConfirm: (selectedRole, reason) => {
              performSave(selectedRole, reason);
              setRoleAuthRequest(null);
            },
            onCancel: () => setRoleAuthRequest(null),
          });
          return;
        } else {
          const singleRole = qualifyingRoles[0] || userRoles[0] || 'Staff';
          performSave(singleRole);
          return;
        }
      }
    }

    // New item or unchanged
    performSave();
  };

  const handleBatchImportProducts = (importedProducts: Product[], replaceExisting: boolean) => {
    importedProducts.forEach((p) => {
      if (p.imageUrl && p.imageUrl.trim() !== '') {
        saveProductImageToIndexedDB(p.id, p.imageUrl);
      }
    });

    if (replaceExisting) {
      setProducts(importedProducts);
    } else {
      setProducts((prev) => {
        const existingBarcodes = new Set(prev.map((p) => p.barcode.toLowerCase()));
        const existingSkus = new Set(prev.map((p) => p.sku.toLowerCase()));

        const newUnique = importedProducts.filter(
          (p) => !existingBarcodes.has(p.barcode.toLowerCase()) && !existingSkus.has(p.sku.toLowerCase())
        );
        return [...newUnique, ...prev];
      });
    }

    // Sync imported products to Firestore cloud catalog
    bulkUploadProductsToCloud(importedProducts).catch(() => {});
  };

  const handleDeleteProduct = (productId: string) => {
    const existing = products.find((p) => p.id === productId);
    const qualifyingRoles = getQualifyingRolesForAction(currentUser, 'DELETE_PRODUCT');
    const userRoles = getUserRoles(currentUser);

    const performDelete = (authorizingRole: Role, reason?: string) => {
      deleteProductImageFromIndexedDB(productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      deleteProductFromCloud(productId).catch(() => {});

      const log = buildSensitiveActionLog({
        actionType: 'DELETE_PRODUCT',
        actionTitle: `Deleted Product: ${existing?.name || productId}`,
        user: currentUser,
        authorizingRole,
        targetId: productId,
        targetName: existing?.name || productId,
        details: {
          summary: `Permanently removed ${existing?.name || 'product'} (SKU: ${existing?.sku || 'N/A'}, Barcode: ${existing?.barcode || 'N/A'}, Stock: ${existing?.stockQuantity || 0}) from store catalog`,
          before: existing || {},
        },
        reason,
        severity: 'critical',
      });
      handleRecordAuditLog(log);
    };

    if (qualifyingRoles.length > 1 || userRoles.length > 1) {
      setRoleAuthRequest({
        actionType: 'DELETE_PRODUCT',
        actionTitle: `Delete Product: ${existing?.name || productId}`,
        targetId: productId,
        targetName: existing?.name || productId,
        qualifyingRoles: qualifyingRoles.length > 0 ? qualifyingRoles : userRoles,
        user: currentUser,
        diffSummary: existing ? [
          `SKU: ${existing.sku || 'N/A'}`,
          `Barcode: ${existing.barcode || 'N/A'}`,
          `Category: ${existing.category}`,
          `Selling Price: KSh ${existing.sellingPrice}`,
          `Stock On Hand: ${existing.stockQuantity} units`,
        ] : undefined,
        onConfirm: (selectedRole, reason) => {
          performDelete(selectedRole, reason);
          setRoleAuthRequest(null);
        },
        onCancel: () => setRoleAuthRequest(null),
      });
    } else {
      const singleRole = qualifyingRoles[0] || userRoles[0] || 'Staff';
      performDelete(singleRole);
    }
  };

  const handleAddRestockRecord = (
    productId: string,
    quantityAdded: number,
    unitCost: number,
    supplierName: string,
    batchNo: string,
    notes: string
  ) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const totalCost = quantityAdded * unitCost;

    const newRestock: RestockRecord = {
      id: `rst-${Date.now()}`,
      productId,
      productName: prod.name,
      quantityAdded,
      unitCost,
      totalCost,
      supplierName,
      supplierId: prod.supplierId,
      date: new Date().toISOString(),
      receivedBy: `${currentUser.name} (${currentUser.role})`,
      batchNo: batchNo || `BATCH-${Math.floor(1000 + Math.random() * 9000)}`,
      notes
    };

    setRestockRecords((prev) => [newRestock, ...prev]);
    saveRestockRecordToCloud(newRestock).catch(() => {});

    const updatedProd: Product = {
      ...prod,
      stockQuantity: prod.stockQuantity + quantityAdded,
      costPrice: unitCost,
      updatedAt: new Date().toISOString().slice(0, 10)
    };

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? updatedProd : p))
    );
    saveProductToCloud(updatedProd).catch(() => {});

    const restockExp: Expense = {
      id: `exp-rst-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      category: 'Restock',
      description: `Restock Order: ${quantityAdded}x ${prod.name} (${supplierName})`,
      amount: totalCost,
      paymentMethod: 'mpesa',
      recordedBy: currentUser.name,
      receiptNo: batchNo || `RST-${Math.floor(100 + Math.random() * 900)}`,
      recurringType: 'One-Time',
      status: 'Paid'
    };
    setExpenses((prev) => [restockExp, ...prev]);
    saveExpenseToCloud(restockExp).catch(() => {});
  };

  const handleApplyStockAdjustment = (updatedProducts: Product[], audit: StockCountAudit) => {
    const qualifyingRoles = getQualifyingRolesForAction(currentUser, 'ADJUST_STOCK');
    const userRoles = getUserRoles(currentUser);

    const performAdjustment = (authorizingRole: Role, reason?: string) => {
      setProducts(updatedProducts);
      updatedProducts.forEach((p) => saveProductToCloud(p).catch(() => {}));

      const log = buildSensitiveActionLog({
        actionType: 'ADJUST_STOCK',
        actionTitle: `Stock Adjustment: ${audit.items.length} Products Reconciled`,
        user: currentUser,
        authorizingRole,
        details: {
          summary: `Reconciled shelf inventory count for ${audit.items.length} products (Net Variance: ${audit.totalVarianceCount} units, Total Cost: KSh ${audit.totalVarianceCost.toLocaleString()})`,
          metadata: {
            auditId: audit.id,
            auditDate: audit.auditDate,
            totalVarianceCount: audit.totalVarianceCount,
            totalVarianceCost: audit.totalVarianceCost,
            itemsCount: audit.items.length,
          },
        },
        reason: reason || audit.notes,
        severity: 'high',
      });
      handleRecordAuditLog(log);
    };

    if (qualifyingRoles.length > 1 || userRoles.length > 1) {
      setRoleAuthRequest({
        actionType: 'ADJUST_STOCK',
        actionTitle: `Physical Stock Count Reconciliation (${audit.items.length} Items)`,
        targetName: `Stock Count Audit: ${audit.auditDate}`,
        qualifyingRoles: qualifyingRoles.length > 0 ? qualifyingRoles : userRoles,
        user: currentUser,
        diffSummary: [
          `Items Checked: ${audit.items.length}`,
          `Total Unit Variance: ${audit.totalVarianceCount}`,
          `Total Variance Value: KSh ${audit.totalVarianceCost.toLocaleString()}`,
        ],
        onConfirm: (selectedRole, reason) => {
          performAdjustment(selectedRole, reason);
          setRoleAuthRequest(null);
        },
        onCancel: () => setRoleAuthRequest(null),
      });
    } else {
      const singleRole = qualifyingRoles[0] || userRoles[0] || 'Staff';
      performAdjustment(singleRole);
    }
  };

  const handleAddExpense = (exp: Expense) => {
    setExpenses((prev) => [exp, ...prev]);
    saveExpenseToCloud(exp).catch(() => {});
  };

  const handleDeleteExpense = (expId: string) => {
    const exp = expenses.find((e) => e.id === expId);
    const qualifyingRoles = getQualifyingRolesForAction(currentUser, 'DELETE_EXPENSE');
    const userRoles = getUserRoles(currentUser);

    const performDelete = (authorizingRole: Role, reason?: string) => {
      setExpenses((prev) => prev.filter((e) => e.id !== expId));
      deleteExpenseFromCloud(expId).catch(() => {});

      const log = buildSensitiveActionLog({
        actionType: 'DELETE_EXPENSE',
        actionTitle: `Deleted Expense: ${exp ? exp.category : 'Record'} (${exp ? `KSh ${exp.amount.toLocaleString()}` : ''})`,
        user: currentUser,
        authorizingRole,
        targetId: expId,
        targetName: exp ? `${exp.category} - ${exp.description || 'Record'}` : expId,
        details: {
          summary: `Deleted ${exp?.category || 'expense'} of KSh ${(exp?.amount || 0).toLocaleString()} (${exp?.description || 'No description'})`,
          before: exp || {},
        },
        reason,
        severity: 'critical',
      });
      handleRecordAuditLog(log);
    };

    if (qualifyingRoles.length > 1 || userRoles.length > 1) {
      setRoleAuthRequest({
        actionType: 'DELETE_EXPENSE',
        actionTitle: `Delete Expense: ${exp ? exp.category : 'Record'} (${exp ? `KSh ${exp.amount.toLocaleString()}` : ''})`,
        targetId: expId,
        targetName: exp ? `${exp.category} - ${exp.description || 'Record'}` : expId,
        qualifyingRoles: qualifyingRoles.length > 0 ? qualifyingRoles : userRoles,
        user: currentUser,
        diffSummary: exp ? [
          `Category: ${exp.category}`,
          `Amount: KSh ${exp.amount.toLocaleString()}`,
          `Description: ${exp.description || 'None'}`,
          `Payment Method: ${exp.paymentMethod}`,
          `Recorded By: ${exp.recordedBy}`,
          `Date: ${exp.date}`,
        ] : undefined,
        metadata: { expense: exp },
        onConfirm: (selectedRole, reason) => {
          performDelete(selectedRole, reason);
          setRoleAuthRequest(null);
        },
        onCancel: () => setRoleAuthRequest(null),
      });
    } else {
      const singleRole = qualifyingRoles[0] || userRoles[0] || 'Staff';
      performDelete(singleRole);
    }
  };

  const handleAddCashTransaction = (tx: CashTransaction) => {
    setCashTransactions((prev) => [tx, ...prev]);
  };

  const handleDeleteCashTransaction = (txId: string) => {
    setCashTransactions((prev) => prev.filter((t) => t.id !== txId));
  };

  const handleClockIn = (rec: AttendanceRecord) => {
    setAttendanceRecords((prev) => [rec, ...prev]);
  };

  const handleClockOut = (recordId: string, clockOutTime: string) => {
    setAttendanceRecords((prev) =>
      prev.map((rec) => (rec.id === recordId ? { ...rec, clockOutTime } : rec))
    );
  };

  const handleIssueWorkerLoan = (newLoan: WorkerLoan) => {
    setWorkerLoans((prev) => [newLoan, ...prev]);

    // Record expense for loan advance
    const loanExpense: Expense = {
      id: `exp-loan-${Date.now()}`,
      date: newLoan.issueDate,
      category: 'Salaries',
      description: `Worker Loan Advance to ${newLoan.workerName} (${newLoan.loanNumber}) - ${newLoan.purpose}`,
      amount: newLoan.principalAmount,
      paymentMethod: newLoan.disbursementMethod,
      recordedBy: newLoan.approvedBy,
      status: 'Paid',
      receiptNo: newLoan.disbursementRef || newLoan.loanNumber,
    };
    setExpenses((prev) => [loanExpense, ...prev]);
  };

  const handleRepayWorkerLoan = (loanId: string, repayment: WorkerLoanRepayment) => {
    setWorkerLoans((prev) =>
      prev.map((l) => {
        if (l.id === loanId) {
          const updatedRepayments = [repayment, ...l.repayments];
          const newTotalRepaid = l.totalRepaid + repayment.amount;
          const newBalanceDue = Math.max(0, l.principalAmount - newTotalRepaid);
          const newStatus = newBalanceDue <= 0 ? 'Fully Repaid' : l.status;

          return {
            ...l,
            totalRepaid: newTotalRepaid,
            balanceDue: newBalanceDue,
            status: newStatus,
            repayments: updatedRepayments,
          };
        }
        return l;
      })
    );

    // If repayment is cash or mpesa, record as Cash In
    if (repayment.paymentMethod === 'cash' || repayment.paymentMethod === 'mpesa') {
      const cashIn: CashTransaction = {
        id: `ctx-loan-${Date.now()}`,
        type: 'CASH_IN',
        category: 'Other Cash In',
        amount: repayment.amount,
        date: repayment.date,
        sourceDestination: 'Worker Loan Repayment',
        referenceNo: repayment.referenceNo || loanId,
        paymentMethod: repayment.paymentMethod === 'cash' ? 'cash' : 'mpesa',
        description: `Loan repayment received from worker (${repayment.recordedBy})`,
        recordedBy: repayment.recordedBy,
        status: 'Completed',
      };
      setCashTransactions((prev) => [cashIn, ...prev]);
    }
  };

  const handleUpdateWorkerLoanStatus = (loanId: string, status: WorkerLoan['status']) => {
    setWorkerLoans((prev) =>
      prev.map((l) => (l.id === loanId ? { ...l, status } : l))
    );
  };

  // Financing Facilities (Bank Loans, Chama, SACCO, Mobile Floats) Handlers
  const handleSaveFinancingFacility = (facility: FinancingFacility) => {
    setFinancingFacilities((prev) => {
      const exists = prev.some((f) => f.id === facility.id);
      if (exists) {
        return prev.map((f) => (f.id === facility.id ? facility : f));
      }
      return [facility, ...prev];
    });
  };

  const handleDeleteFinancingFacility = (facilityId: string) => {
    setFinancingFacilities((prev) => prev.filter((f) => f.id !== facilityId));
  };

  const handleRecordFacilityRepayment = (facilityId: string, repayment: FacilityRepayment, autoLogCashOut: boolean = true) => {
    setFinancingFacilities((prev) =>
      prev.map((fac) => {
        if (fac.id === facilityId) {
          const currentRepayments = fac.repayments || [];
          const updatedRepayments = [repayment, ...currentRepayments];
          const newTotalRepaid = (fac.totalRepaid || 0) + repayment.amount;
          const newBalanceRemaining = Math.max(0, fac.totalRepayableAmount - newTotalRepaid);
          const newStatus = newBalanceRemaining <= 0 ? 'Fully Cleared' : fac.status;

          return {
            ...fac,
            totalRepaid: newTotalRepaid,
            balanceRemaining: newBalanceRemaining,
            status: newStatus,
            repayments: updatedRepayments,
          };
        }
        return fac;
      })
    );
  };

  const handleDisburseFacilityFunds = (facilityId: string, additionalAmount: number, refNo: string, autoLogCashIn: boolean = true) => {
    setFinancingFacilities((prev) =>
      prev.map((fac) => {
        if (fac.id === facilityId) {
          const newPrincipal = fac.principalAmount + additionalAmount;
          const interestCalc = (additionalAmount * (fac.interestRatePercentage || 0)) / 100;
          const newTotalRepayable = fac.totalRepayableAmount + additionalAmount + interestCalc;
          const newBalance = Math.max(0, newTotalRepayable - (fac.totalRepaid || 0));

          return {
            ...fac,
            principalAmount: newPrincipal,
            totalRepayableAmount: newTotalRepayable,
            balanceRemaining: newBalance,
            status: 'Active',
          };
        }
        return fac;
      })
    );
  };

  // Multi-Store & Online Orders Handlers
  const handleAddStore = (newStoreData: Omit<StoreLocation, 'id'>) => {
    const newStore: StoreLocation = {
      ...newStoreData,
      id: `store-${Date.now()}`
    };
    setStores((prev) => [...prev, newStore]);
  };

  const handleUpdateStore = (updatedStore: StoreLocation) => {
    setStores((prev) => prev.map((s) => (s.id === updatedStore.id ? updatedStore : s)));
  };

  const handleDeleteStore = (storeId: string) => {
    setStores((prev) => prev.filter((s) => s.id !== storeId));
  };

  const handlePlaceOnlineOrder = (newOrderData: Omit<OnlineOrder, 'id' | 'createdAt' | 'orderNumber'>) => {
    const orderNum = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: OnlineOrder = {
      ...newOrderData,
      id: `ord-${Date.now()}`,
      orderNumber: orderNum,
      createdAt: new Date().toISOString()
    };
    setOnlineOrders((prev) => [newOrder, ...prev]);
  };

  const handleUpdateOrderStatus = (orderId: string, status: OnlineOrder['orderStatus']) => {
    setOnlineOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return { ...o, orderStatus: status };
        }
        return o;
      })
    );

    // If order completed, convert to POS transaction & deduct stock
    if (status === 'Completed') {
      const orderObj = onlineOrders.find((o) => o.id === orderId);
      if (orderObj) {
        // Deduct stock for each product
        setProducts((prev) =>
          prev.map((prod) => {
            const itemInOrder = orderObj.items.find((i) => i.product.id === prod.id);
            if (itemInOrder) {
              return {
                ...prod,
                stockQuantity: Math.max(0, prod.stockQuantity - itemInOrder.quantity)
              };
            }
            return prod;
          })
        );

        // Append to sales transactions
        const onlineSaleTx: Transaction = {
          id: `tx-online-${Date.now()}`,
          receiptNumber: `WEB-${orderObj.orderNumber}`,
          date: new Date().toISOString(),
          customerName: orderObj.customerName,
          customerPhone: orderObj.customerPhone,
          items: orderObj.items,
          subtotal: orderObj.subtotal,
          discountTotal: orderObj.discountAmount,
          taxTotal: 0,
          grandTotal: orderObj.grandTotal,
          amountPaid: orderObj.grandTotal,
          balanceDue: 0,
          paymentStatus: 'Paid',
          payments: [
            {
              method: orderObj.paymentMethod === 'mpesa' ? 'mpesa' : orderObj.paymentMethod === 'card' ? 'credit_card' : 'cash',
              amount: orderObj.grandTotal
            }
          ],
          cashierName: 'Online Web Storefront',
          cashierId: 'sys-online',
          storeId: orderObj.storeId,
          storeName: orderObj.storeName,
          sourceType: 'Online Store'
        };

        setTransactions((prev) => [onlineSaleTx, ...prev]);
      }
    }
  };

  const handleAddOffer = (newOfferData: Omit<OfferDeal, 'id'>) => {
    const newOffer: OfferDeal = {
      ...newOfferData,
      id: `offer-${Date.now()}`
    };
    setOffers((prev) => [...prev, newOffer]);
  };

  const handleToggleOffer = (offerId: string) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === offerId ? { ...o, active: !o.active } : o))
    );
  };

  const handleDeleteOffer = (offerId: string) => {
    setOffers((prev) => prev.filter((o) => o.id !== offerId));
  };

  const handleTransferStock = (
    transferData: Omit<StockTransferRecord, 'id' | 'createdAt' | 'transferNumber'>
  ) => {
    const trfNum = `TRF-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newRecord: StockTransferRecord = {
      ...transferData,
      id: `trf-${Date.now()}`,
      transferNumber: trfNum,
      createdAt: new Date().toISOString()
    };

    setStockTransfers((prev) => [newRecord, ...prev]);

    // If marked as Completed immediately, adjust stock
    if (newRecord.status === 'Completed') {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === newRecord.productId) {
            const currentStoreStock = p.storeStock || {};
            const sourceQty = currentStoreStock[newRecord.sourceStoreId] ?? p.stockQuantity;
            const targetQty = currentStoreStock[newRecord.targetStoreId] ?? 0;

            return {
              ...p,
              storeStock: {
                ...currentStoreStock,
                [newRecord.sourceStoreId]: Math.max(0, sourceQty - newRecord.quantity),
                [newRecord.targetStoreId]: targetQty + newRecord.quantity
              }
            };
          }
          return p;
        })
      );
    }
  };

  const handleUpdateTransferStatus = (transferId: string, status: StockTransferRecord['status']) => {
    setStockTransfers((prev) =>
      prev.map((trf) => {
        if (trf.id === transferId) {
          // If status changes to Completed, update store stock
          if (status === 'Completed' && trf.status !== 'Completed') {
            setProducts((prevProd) =>
              prevProd.map((p) => {
                if (p.id === trf.productId) {
                  const currentStoreStock = p.storeStock || {};
                  const sourceQty = currentStoreStock[trf.sourceStoreId] ?? p.stockQuantity;
                  const targetQty = currentStoreStock[trf.targetStoreId] ?? 0;

                  return {
                    ...p,
                    storeStock: {
                      ...currentStoreStock,
                      [trf.sourceStoreId]: Math.max(0, sourceQty - trf.quantity),
                      [trf.targetStoreId]: targetQty + trf.quantity
                    }
                  };
                }
                return p;
              })
            );
          }
          return { ...trf, status };
        }
        return trf;
      })
    );
  };

  const handleResetData = () => {
    localStorage.clear();
    setProducts(INITIAL_PRODUCTS);
    setCustomers(INITIAL_CUSTOMERS);
    setSuppliers(INITIAL_SUPPLIERS);
    setExpenses(INITIAL_EXPENSES);
    setAttendanceRecords(INITIAL_ATTENDANCE);
    setTransactions(INITIAL_TRANSACTIONS);
    setCashTransactions(INITIAL_CASH_TRANSACTIONS);
  };

  const handleImportData = (imported: any) => {
    if (imported.products) setProducts(imported.products);
    if (imported.customers) setCustomers(imported.customers);
    if (imported.suppliers) setSuppliers(imported.suppliers);
    if (imported.expenses) setExpenses(imported.expenses);
    if (imported.transactions) setTransactions(imported.transactions);
    if (imported.attendanceRecords) setAttendanceRecords(imported.attendanceRecords);
  };

  const handleClearTransactions = () => {
    const userRoles = getUserRoles(currentUser);
    const qualifyingRoles = getQualifyingRolesForAction(currentUser, 'CLEAR_TRANSACTIONS');

    const performClear = (authorizingRole: Role, reason?: string) => {
      const count = transactions.length;
      setTransactions([]);
      const log = buildSensitiveActionLog({
        actionType: 'CLEAR_TRANSACTIONS',
        actionTitle: `Purged Sales History (${count} Receipts)`,
        user: currentUser,
        authorizingRole,
        details: {
          summary: `Purged ${count} sales receipts from store register history`,
        },
        reason,
        severity: 'critical',
      });
      handleRecordAuditLog(log);
    };

    if (userRoles.length > 1) {
      setRoleAuthRequest({
        actionType: 'CLEAR_TRANSACTIONS',
        actionTitle: `Purge All Sales Transactions (${transactions.length} Receipts)`,
        qualifyingRoles: qualifyingRoles.length > 0 ? qualifyingRoles : userRoles,
        user: currentUser,
        diffSummary: [`Total Receipts to Purge: ${transactions.length}`],
        onConfirm: (selectedRole, reason) => {
          performClear(selectedRole, reason);
          setRoleAuthRequest(null);
        },
        onCancel: () => setRoleAuthRequest(null),
      });
    } else {
      performClear(userRoles[0] || 'Admin');
    }
  };

  const handleClearExpenses = () => {
    const userRoles = getUserRoles(currentUser);
    const qualifyingRoles = getQualifyingRolesForAction(currentUser, 'CLEAR_EXPENSES');

    const performClear = (authorizingRole: Role, reason?: string) => {
      const count = expenses.length;
      setExpenses([]);
      const log = buildSensitiveActionLog({
        actionType: 'CLEAR_EXPENSES',
        actionTitle: `Purged All Expense History (${count} Records)`,
        user: currentUser,
        authorizingRole,
        details: {
          summary: `Purged ${count} historical store expense records and overhead schedules`,
        },
        reason,
        severity: 'critical',
      });
      handleRecordAuditLog(log);
    };

    if (userRoles.length > 1) {
      setRoleAuthRequest({
        actionType: 'CLEAR_EXPENSES',
        actionTitle: `Purge All Expense Logs (${expenses.length} Records)`,
        qualifyingRoles: qualifyingRoles.length > 0 ? qualifyingRoles : userRoles,
        user: currentUser,
        diffSummary: [`Total Records to Purge: ${expenses.length}`],
        onConfirm: (selectedRole, reason) => {
          performClear(selectedRole, reason);
          setRoleAuthRequest(null);
        },
        onCancel: () => setRoleAuthRequest(null),
      });
    } else {
      performClear(userRoles[0] || 'Admin');
    }
  };

  // User initials avatar helper
  const getUserInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const themeContainerClass =
    displayTheme === 'dark'
      ? 'bg-slate-950 text-slate-100'
      : displayTheme === 'contrast'
      ? 'bg-black text-amber-300'
      : 'bg-slate-50 text-slate-900';

  const fontScaleClass = fontScale === 'large' ? 'text-base' : 'text-sm';

  // Helper function to render active tab view content
  const renderActiveTabContent = () => {
    const isTabPermitted =
      hasTabPermission(currentUser, activeTab as TabKey) ||
      temporarilyUnlockedTabs.has(activeTab as TabKey);

    if (!isTabPermitted) {
      return (
        <AccessRestrictedView
          currentTab={activeTab as TabKey}
          currentUser={currentUser}
          allUsers={allUsers}
          onNavigateToAllowedTab={(tab) => {
            setActiveTab(tab);
            if (tab !== 'inventory') setInventoryLowStockOnly(false);
          }}
          onTemporaryUnlock={(authorizedBy) => {
            setTemporarilyUnlockedTabs((prev) => new Set([...prev, activeTab as TabKey]));
          }}
          onSwitchUser={(authorizedUser) => {
            setCurrentUser(authorizedUser);
            setPinModalTargetUser(null);
            setIsTerminalLocked(false);
            setTemporarilyUnlockedTabs(new Set());
          }}
        />
      );
    }

    return (
      <>
        {activeTab === 'pos' && (
        <POSView
          products={products}
          categories={categories}
          customers={customers}
          currentUser={currentUser}
          allUsers={allUsers}
          transactions={transactions}
          onCompleteSale={handleCompleteSale}
          onAddCustomer={handleAddCustomer}
          onRecordScanLog={handleRecordScanLog}
          newSaleTrigger={newSaleTrigger}
        />
      )}

      {activeTab === 'inventory' && (
        <InventoryView
          products={products}
          categories={categories}
          suppliers={suppliers}
          transactions={transactions}
          onSaveProduct={handleSaveProduct}
          onDeleteProduct={handleDeleteProduct}
          onBatchImportProducts={handleBatchImportProducts}
          onAddSupplier={handleSaveSupplier}
          initialShowLowStockOnly={inventoryLowStockOnly}
          onViewProductHistory={(prod) => {
            setSelectedHistoryProduct(prod);
            setShowHistoryModal(true);
          }}
          onOpenStoreManagerModal={() => setShowStoreManagerModal(true)}
          currentUser={currentUser}
          allUsers={allUsers}
          scanLogs={scanLogs}
          onRecordScanLog={handleRecordScanLog}
          onClearScanLogs={handleClearScanLogs}
          storeName={stores.find((s) => s.id === activeStoreId)?.name || 'ROFANI Flagship Store'}
          onOpenAiAssistantWithPrompt={(_prompt) => {
            setShowAiAssistantModal(true);
          }}
        />
      )}

      {activeTab === 'stocktake' && (
        <PhysicalStockCountView
          products={products}
          onApplyStockAdjustment={handleApplyStockAdjustment}
        />
      )}

      {activeTab === 'contacts' && (
        <CustomersSuppliersView
          customers={customers}
          suppliers={suppliers}
          transactions={transactions}
          products={products}
          currentUser={currentUser}
          onSaveCustomer={handleSaveCustomer}
          onDeleteCustomer={handleDeleteCustomer}
          onSaveSupplier={handleSaveSupplier}
          onDeleteSupplier={handleDeleteSupplier}
          onRecordCustomerDebtPayment={handleRecordCustomerDebtPayment}
          onRecordSupplierPayment={handleRecordSupplierPayment}
          onImportCustomers={handleImportCustomers}
          onImportSuppliers={handleImportSuppliers}
          onNavigateToRestock={(supplierName) => {
            setActiveTab('inventory');
          }}
        />
      )}

      {activeTab === 'cashmanagement' && (
        <CashManagementView
          cashTransactions={cashTransactions}
          financingFacilities={financingFacilities}
          currentUser={currentUser}
          products={products}
          customers={customers}
          suppliers={suppliers}
          transactions={transactions}
          expenses={expenses}
          onAddCashTransaction={handleAddCashTransaction}
          onDeleteCashTransaction={handleDeleteCashTransaction}
          onSaveSupplier={handleSaveSupplier}
          onRecordSupplierPayment={handleRecordSupplierPayment}
          onSaveFinancingFacility={handleSaveFinancingFacility}
          onDeleteFinancingFacility={handleDeleteFinancingFacility}
          onRecordFacilityRepayment={handleRecordFacilityRepayment}
          onDisburseFacilityFunds={handleDisburseFacilityFunds}
        />
      )}

      {activeTab === 'expenses' && (
        <ExpensesView
          expenses={expenses}
          currentUser={currentUser}
          onAddExpense={handleAddExpense}
          onDeleteExpense={handleDeleteExpense}
          onBatchUpdateExpenses={setExpenses}
          onOpenAuditLogs={() => setActiveTab('auditlogs')}
        />
      )}

      {activeTab === 'attendance' && (
        <AttendanceView
          attendanceRecords={attendanceRecords}
          allUsers={allUsers}
          currentUser={currentUser}
          transactions={transactions}
          commissionPayouts={commissionPayouts}
          workerLoans={workerLoans}
          onClockIn={handleClockIn}
          onClockOut={handleClockOut}
          onPayCommission={handlePayCommission}
          onUpdateUserCommissionRate={handleUpdateUserCommissionRate}
          onUpdateUserCommissionSettings={handleUpdateUserCommissionSettings}
          onReattributeSale={handleReattributeSale}
          onIssueLoan={handleIssueWorkerLoan}
          onRepayLoan={handleRepayWorkerLoan}
          onUpdateLoanStatus={handleUpdateWorkerLoanStatus}
          onAddUser={handleAddUser}
          onUpdateUser={handleUpdateUser}
          onDeleteUser={handleDeleteUser}
          onOpenStaffModal={() => setShowStaffModal(true)}
        />
      )}

      {activeTab === 'reports' && (
        <ReportsView
          transactions={transactions}
          products={products}
          customers={customers}
          suppliers={suppliers}
          expenses={expenses}
          auditLogs={auditLogs}
        />
      )}

      {activeTab === 'auditlogs' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AuditLogsView
            logs={auditLogs}
            onClose={() => setActiveTab('reports')}
          />
        </div>
      )}

      {activeTab === 'onlinestore' && (
        <OnlineStorefrontView
          products={products}
          offers={offers}
          stores={stores}
          onPlaceOrder={handlePlaceOnlineOrder}
          activeStore={stores.find((s) => s.id === activeStoreId) || stores[0]}
        />
      )}

      {activeTab === 'onlineorders' && (
        <OnlineOrdersManagerView
          orders={onlineOrders}
          offers={offers}
          stores={stores}
          customers={customers}
          products={products}
          activeStore={stores.find((s) => s.id === activeStoreId) || stores[0]}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onAddOffer={handleAddOffer}
          onToggleOffer={handleToggleOffer}
          onDeleteOffer={handleDeleteOffer}
          onUpdateStoreWhatsApp={(storeId, whatsappNum) => {
            setStores((prev) =>
              prev.map((s) => (s.id === storeId ? { ...s, whatsappPhone: whatsappNum } : s))
            );
          }}
        />
      )}

      {activeTab === 'settings' && (
        <DataManagementView
          products={products}
          categories={categories}
          customers={customers}
          suppliers={suppliers}
          transactions={transactions}
          expenses={expenses}
          attendanceRecords={attendanceRecords}
          allUsers={allUsers}
          onImportData={handleImportData}
          onResetSampleData={handleResetData}
          onClearTransactions={handleClearTransactions}
          onClearExpenses={handleClearExpenses}
          displayTheme={displayTheme}
          onChangeDisplayTheme={setDisplayTheme}
          fontScale={fontScale}
          onChangeFontScale={setFontScale}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenCloudSync={() => setShowCloudSyncModal(true)}
          deviceFormat={deviceFormat}
          onChangeDeviceFormat={setDeviceFormat}
          requirePinOnStartup={requirePinOnStartup}
          onToggleRequirePinOnStartup={handleToggleRequirePinOnStartup}
          masterPin={masterPin}
          onUpdateMasterPin={handleUpdateMasterPin}
          onLockNow={() => setIsTerminalLocked(true)}
          onOpenAuditLogs={() => setActiveTab('auditlogs')}
        />
      )}
    </>
    );
  };

  // If Mobile Phone Format is active, render PhoneDeviceFrame view
  if (deviceFormat === 'phone') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <PhoneDeviceFrame
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            if (tab !== 'inventory') setInventoryLowStockOnly(false);
          }}
          onSelectStockAlertFilter={() => setInventoryLowStockOnly(true)}
          phoneOrientation={phoneOrientation}
          phoneModel={phoneModel}
          onToggleOrientation={() =>
            setPhoneOrientation((prev) => (prev === 'portrait' ? 'landscape' : 'portrait'))
          }
          onChangeModel={(model) => setPhoneModel(model)}
          onSwitchToComputer={() => setDeviceFormat('computer')}
          currentUser={currentUser}
          todaySales={todaySales}
          lowStockCount={lowStockCount}
          onLockTerminal={() => setIsTerminalLocked(true)}
          onOpenStaffModal={() => setShowStaffModal(true)}
          onNewSale={handleGlobalNewSale}
          onOpenCloudSync={() => setShowCloudSyncModal(true)}
          cloudSyncStatus={cloudSyncStatus}
        >
          {renderActiveTabContent()}
        </PhoneDeviceFrame>

        {/* Modals in Phone Format Mode */}
        <CloudSyncModal
          isOpen={showCloudSyncModal}
          onClose={() => setShowCloudSyncModal(false)}
          products={products}
          allUsers={allUsers}
          cloudSyncStatus={cloudSyncStatus}
          lastSyncedTime={lastSyncedTime}
          isQuotaExceeded={isCloudQuotaExceeded}
          onSyncCatalogComplete={() => {
            setCloudSyncStatus('synced');
            setLastSyncedTime(new Date().toLocaleTimeString());
          }}
          masterPin={masterPin}
          requirePinOnStartup={requirePinOnStartup}
          onLockNow={() => setIsTerminalLocked(true)}
          recoveryEmail={ownerRecoveryEmail}
          emergencyKey={emergencyRecoveryKey}
        />

        <PinLoginModal
          isOpen={isTerminalLocked}
          users={allUsers}
          currentUser={null}
          initialTargetUser={pinModalTargetUser}
          onLoginSuccess={handleLoginSuccess}
          onClose={() => {
            setPinModalTargetUser(null);
            if (!requirePinOnStartup) {
              setIsTerminalLocked(false);
            }
          }}
          isMandatory={requirePinOnStartup}
          masterPin={masterPin}
          storeName={stores.find((s) => s.id === activeStoreId)?.name || 'ROFANI POS'}
          recoveryEmail={ownerRecoveryEmail}
          emergencyKey={emergencyRecoveryKey}
          onResetAdminPin={handleResetAdminPin}
          onResetMasterPin={handleUpdateMasterPin}
        />

        <StaffManagementModal
          isOpen={showStaffModal}
          onClose={() => setShowStaffModal(false)}
          users={allUsers}
          currentUser={currentUser}
          onAddUser={handleAddUser}
          onUpdateUser={handleUpdateUser}
          onDeleteUser={handleDeleteUser}
        />

        <InstallPwaModal
          isOpen={showInstallModal}
          onClose={() => setShowInstallModal(false)}
        />

        {/* Role Authorization Modal for Sensitive Operations in Phone Mode */}
        <RoleAuthorizationModal request={roleAuthRequest} />
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full overflow-hidden font-sans ${themeContainerClass} ${fontScaleClass}`}>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden cursor-pointer"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar: Professional Polish Navigation */}
      <nav
        className={`bg-slate-900 flex flex-col border-r border-slate-800 text-slate-300 shrink-0 transition-all duration-300 z-50 ${
          isSidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
        } ${
          isMobileMenuOpen
            ? 'fixed inset-y-0 left-0 w-72 shadow-2xl flex'
            : 'hidden lg:flex'
        }`}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          {(!isSidebarCollapsed || isMobileMenuOpen) && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center font-extrabold text-white shadow-lg shadow-blue-600/30 shrink-0">
                R
              </div>
              <div className="truncate">
                <span className="text-sm font-extrabold text-white tracking-wider block leading-tight">
                  ROFANI
                </span>
                <span className="text-[10px] text-slate-400 font-mono block truncate">ELECTRONICS & BOUTIQUE</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar for Full View"}
              className="hidden lg:flex p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            >
              {isSidebarCollapsed ? <PanelLeft className="w-5 h-5 text-sky-400" /> : <PanelLeftClose className="w-5 h-5 text-slate-400" />}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              title="Close Menu"
              className="lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Action: Hero "+ New Sale" Button & Secondary "Print Barcodes" in Sidebar */}
        <div className="px-2 pt-3 pb-1 border-b border-slate-800/80">
          {isSidebarCollapsed ? (
            <div className="flex flex-col gap-1.5">
              <button
                id="btn-sidebar-new-sale"
                onClick={handleGlobalNewSale}
                title="Create New POS Sale"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-extrabold rounded-xl shadow-md shadow-emerald-600/25 transition flex items-center justify-center p-2.5"
              >
                <Plus className="w-4 h-4 shrink-0" />
              </button>
              <button
                id="btn-sidebar-print-barcodes"
                onClick={() => setShowPrintBarcodesModal(true)}
                title="Print Barcodes Utility - Batch print labels from scan history & catalog"
                className="w-full bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-sky-400 hover:text-white font-bold rounded-xl border border-slate-700/80 hover:border-sky-500/50 shadow-sm transition flex items-center justify-center p-2.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 shrink-0" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                id="btn-sidebar-new-sale"
                onClick={handleGlobalNewSale}
                title="Create New POS Sale"
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-extrabold rounded-xl shadow-md shadow-emerald-600/25 transition flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs truncate cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="truncate">+ New Sale</span>
              </button>
              <button
                id="btn-sidebar-print-barcodes"
                onClick={() => setShowPrintBarcodesModal(true)}
                title="Print Barcodes Utility - Batch print labels from scan history & catalog"
                className="bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-sky-300 hover:text-white font-bold rounded-xl border border-slate-700/80 hover:border-sky-500/60 shadow-sm transition flex items-center gap-1.5 py-2.5 px-2.5 text-xs shrink-0 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                <span className="font-semibold">Print Barcodes</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-3 px-2 space-y-1.5 text-xs font-semibold overflow-y-auto">
          <button
            onClick={() => setActiveTab('pos')}
            title="Point of Sale (POS)"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition ${
              activeTab === 'pos'
                ? 'bg-blue-600 text-white shadow-md'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4 opacity-90 shrink-0" />
              {!isSidebarCollapsed && <span>Point of Sale</span>}
            </div>
            {!isSidebarCollapsed && (
              <span className="text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded font-mono text-slate-300">
                POS
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('inventory');
              setInventoryLowStockOnly(false);
            }}
            title="Inventory Control & Stock"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition ${
              activeTab === 'inventory'
                ? 'bg-blue-600 text-white shadow-md'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4 opacity-90 shrink-0" />
              {!isSidebarCollapsed && <span>Inventory Control</span>}
            </div>
            {lowStockCount > 0 && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('inventory');
                  setInventoryLowStockOnly(true);
                }}
                className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full cursor-pointer shadow-sm"
                title="Click to view only low stock / alerted items"
              >
                {lowStockCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('stocktake')}
            title="Physical Stock Take Audit"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition ${
              activeTab === 'stocktake'
                ? 'bg-blue-600 text-white shadow-md'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <ClipboardList className="w-4 h-4 opacity-90 shrink-0" />
              {!isSidebarCollapsed && <span>Physical Audit</span>}
            </div>
          </button>

          <button
            onClick={() => setActiveTab('contacts')}
            title="Customers & Suppliers Management (CRM & SRM)"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition ${
              activeTab === 'contacts'
                ? 'bg-sky-600 text-white shadow-md'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 opacity-90 shrink-0 text-sky-400" />
              {!isSidebarCollapsed && <span>Contacts & CRM</span>}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-1">
                {customers.filter((c) => (c.currentBalanceDue || 0) > 0).length > 0 && (
                  <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full font-bold font-mono">
                    {customers.filter((c) => (c.currentBalanceDue || 0) > 0).length}
                  </span>
                )}
                <span className="text-[10px] bg-sky-950/80 text-sky-300 border border-sky-800/80 px-1.5 py-0.5 rounded font-mono">
                  CRM
                </span>
              </div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('cashmanagement')}
            title="Cash In & Cash Out Ledger (Loans, Deposits, Vault)"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition ${
              activeTab === 'cashmanagement'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Landmark className="w-4 h-4 opacity-90 shrink-0 text-emerald-400" />
              {!isSidebarCollapsed && <span>Cash In & Out</span>}
            </div>
            {!isSidebarCollapsed && (
              <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 px-1.5 py-0.5 rounded font-mono">
                Vault
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            title="Expense Manager"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition ${
              activeTab === 'expenses'
                ? 'bg-blue-600 text-white shadow-md'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <DollarSign className="w-4 h-4 opacity-90 shrink-0" />
              {!isSidebarCollapsed && <span>Expense Manager</span>}
            </div>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            title="Staff Attendance & Worker Loans Management"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition ${
              activeTab === 'attendance'
                ? 'bg-blue-600 text-white shadow-md'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <UserCheck className="w-4 h-4 opacity-90 shrink-0 text-emerald-400" />
              {!isSidebarCollapsed && <span>Workers & Loans</span>}
            </div>
            {!isSidebarCollapsed && (
              <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 px-1.5 py-0.5 rounded font-mono font-bold">
                Loans 💳
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            title="Reports & Analytics"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow-md'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 opacity-90 shrink-0" />
              {!isSidebarCollapsed && <span>Reports Central</span>}
            </div>
            {!isSidebarCollapsed && (
              <span className="text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded font-mono text-slate-300">
                PDF
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('auditlogs')}
            title="Worker Role Authorization Audit Trail"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition ${
              activeTab === 'auditlogs'
                ? 'bg-purple-600 text-white shadow-md'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-4 h-4 opacity-90 shrink-0 text-purple-400" />
              {!isSidebarCollapsed && <span>Audit Trail</span>}
            </div>
            {!isSidebarCollapsed && auditLogs.length > 0 && (
              <span className="text-[10px] bg-purple-950/80 text-purple-300 border border-purple-800/80 px-1.5 py-0.5 rounded font-mono font-bold">
                {auditLogs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('onlinestore')}
            title="Online Web Storefront"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition ${
              activeTab === 'onlinestore'
                ? 'bg-sky-600 text-white shadow-md'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 opacity-90 shrink-0 text-sky-400" />
              {!isSidebarCollapsed && <span>Online E-Store</span>}
            </div>
            {!isSidebarCollapsed && (
              <span className="text-[10px] bg-sky-950/80 text-sky-300 border border-sky-800/80 px-1.5 py-0.5 rounded font-mono">
                Web
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('onlineorders')}
            title="Online Customer Orders & Offers"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition ${
              activeTab === 'onlineorders'
                ? 'bg-amber-600 text-slate-950 shadow-md font-bold'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Tag className="w-4 h-4 opacity-90 shrink-0 text-amber-400" />
              {!isSidebarCollapsed && <span>Orders & Deals</span>}
            </div>
            {onlineOrders.filter((o) => o.orderStatus === 'Pending').length > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm">
                {onlineOrders.filter((o) => o.orderStatus === 'Pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowStoreManagerModal(true)}
            title="Manage Multi-Store Branches, Add Outlets & Inter-Store Stock Transfers"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition hover:bg-slate-800 text-indigo-200 border border-indigo-900/50 bg-indigo-950/30`}
          >
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 opacity-90 shrink-0 text-indigo-400" />
              {!isSidebarCollapsed && <span className="font-semibold">Multi-Store Outlets</span>}
            </div>
            {!isSidebarCollapsed && (
              <span className="text-[10px] bg-indigo-900/80 text-indigo-200 border border-indigo-700/80 px-1.5 py-0.5 rounded font-mono font-bold">
                {stores.length} Outlets
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            title="Data Management & KRA Settings"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 opacity-90 shrink-0" />
              {!isSidebarCollapsed && <span>Data & KRA Settings</span>}
            </div>
          </button>

          {/* Cloud Sync & Multi-Phone Share Button in Sidebar */}
          <button
            onClick={() => setShowCloudSyncModal(true)}
            title="Real-Time Cloud Synchronization & Multi-Phone Share"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition bg-gradient-to-r from-sky-950/80 to-blue-950/80 text-sky-200 border border-sky-800/60 hover:border-sky-500 hover:text-white shadow-sm`}
          >
            <div className="flex items-center gap-3">
              <Cloud className="w-4 h-4 opacity-90 shrink-0 text-sky-400" />
              {!isSidebarCollapsed && <span>Cloud Sync & Share</span>}
            </div>
            {!isSidebarCollapsed && (
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded-full font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </button>

          {/* AI Worker Assistant & Onboarding Button */}
          <button
            onClick={() => setShowAiAssistantModal(true)}
            title="ROFANI Worker AI Assistant & Onboarding Co-Pilot"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition bg-gradient-to-r from-indigo-950/90 via-purple-950/90 to-sky-950/90 text-indigo-300 border border-indigo-700/60 hover:border-indigo-400 hover:text-white shadow-md`}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-400 animate-pulse" />
              {!isSidebarCollapsed && <span className="font-bold">AI Worker Co-Pilot</span>}
            </div>
            {!isSidebarCollapsed && (
              <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                24/7 AI
              </span>
            )}
          </button>
        </div>

        {/* User Account / Role Switcher Footer */}
        <div className="p-3 border-t border-slate-800 relative">
          <button
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            className="w-full flex items-center justify-between bg-slate-800/60 hover:bg-slate-800 p-2.5 rounded-xl border border-slate-700/60 transition text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-blue-600/30 text-blue-300 flex items-center justify-center text-xs font-bold border border-blue-500/40">
                {getUserInitials(currentUser.name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">
                  {currentUser.role}
                </p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {/* Role selection menu dropdown */}
          {showRoleSwitcher && (
            <div className="absolute bottom-16 left-3 right-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 space-y-1 text-xs z-50">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                Switch Staff Role
              </div>
              {allUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setShowRoleSwitcher(false);
                    if (u.id === currentUser.id) return;
                    setPinModalTargetUser(u);
                    setIsTerminalLocked(true);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
                    u.id === currentUser.id
                      ? 'bg-blue-600 text-white font-bold'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span className="truncate">{u.name}</span>
                  <span className="text-[9px] opacity-80 uppercase">{u.role}</span>
                </button>
              ))}
              <div className="pt-1.5 border-t border-slate-800 space-y-1">
                <button
                  onClick={() => {
                    setShowRoleSwitcher(false);
                    setShowStaffModal(true);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-sky-300 hover:bg-sky-950/40 transition font-semibold"
                >
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span>Manage Workers & PINs</span>
                </button>

                <button
                  onClick={() => {
                    setShowRoleSwitcher(false);
                    setPinModalTargetUser(null);
                    setIsTerminalLocked(true);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-amber-300 hover:bg-amber-950/40 transition font-semibold"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Lock Terminal (PIN)</span>
                </button>

                {hasRole(currentUser, 'Admin') && (
                  <button
                    onClick={() => {
                      handleResetData();
                      setShowRoleSwitcher(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-rose-400 hover:bg-rose-950/40 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Sample Data</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Firestore Quota Notice Banner */}
        {isCloudQuotaExceeded && showQuotaBanner && (
          <div className="bg-amber-500 text-slate-950 px-5 py-2 text-xs font-semibold flex items-center justify-between shadow-sm z-30 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 bg-slate-950 text-amber-300 px-2 py-0.5 rounded text-[11px] font-bold">
                <AlertTriangle className="w-3.5 h-3.5" /> Quota Notice
              </span>
              <span>
                Firebase daily free read units limit reached. <strong>POS is operating safely in Offline Local Storage Mode</strong>. All transactions and inventory records are stored securely in local storage.
              </span>
              <button
                onClick={() => setShowCloudSyncModal(true)}
                className="underline font-extrabold text-slate-950 hover:text-black ml-1 cursor-pointer"
              >
                View Quota & Plan Details
              </button>
            </div>
            <button
              onClick={() => setShowQuotaBanner(false)}
              className="text-slate-900 hover:text-black p-1 font-bold text-xs cursor-pointer ml-4"
              title="Dismiss banner"
            >
              ✕
            </button>
          </div>
        )}

        {/* Responsive Mobile Top Header for Smartphones & Tablets on Vercel */}
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-between shrink-0 z-20 text-white">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-xs shrink-0 shadow-md">
                R
              </div>
              <div className="min-w-0">
                <span className="font-black text-xs tracking-wider block leading-none truncate">ROFANI POS</span>
                <span className="text-[9px] text-slate-400 font-mono block truncate">
                  {stores.find((s) => s.id === activeStoreId)?.name || 'Main Store'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Always Visible Share & Sync Button on Mobile */}
            <button
              onClick={() => setShowCloudSyncModal(true)}
              title="Cloud Sync & Multi-Phone Share"
              className={`px-2.5 py-1.5 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold shadow-sm cursor-pointer ${
                cloudSyncStatus === 'quota_exceeded'
                  ? 'bg-amber-950/90 text-amber-200 border-amber-700'
                  : 'bg-sky-500/20 text-sky-200 border-sky-400/40'
              }`}
            >
              <Cloud className={`w-3.5 h-3.5 ${cloudSyncStatus === 'quota_exceeded' ? 'text-amber-400' : 'text-sky-400'}`} />
              <span>Sync & Share</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  cloudSyncStatus === 'quota_exceeded'
                    ? 'bg-amber-400'
                    : cloudSyncStatus === 'offline'
                    ? 'bg-slate-400'
                    : 'bg-emerald-400 animate-pulse'
                }`}
              />
            </button>

            <button
              onClick={handleGlobalNewSale}
              title="Create New POS Sale"
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Sale</span>
            </button>

            <button
              onClick={() => setIsTerminalLocked(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl cursor-pointer"
              title="Lock Terminal PIN"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Top Header Stats Bar for Desktop & Laptop Viewports */}
        <header className="hidden lg:flex min-h-16 h-auto py-2.5 lg:h-20 bg-white border-b border-slate-200 items-center justify-between px-4 xl:px-8 shrink-0 shadow-sm z-10 gap-3">
          <div className="flex items-center gap-4 xl:gap-8 min-w-0">
            <div className="flex flex-col shrink-0">
              <span className="text-[10px] xl:text-[11px] text-slate-500 uppercase tracking-widest font-bold">
                Today's Sales
              </span>
              <span className="text-lg xl:text-xl font-extrabold text-slate-900 font-mono">
                KSh {(todaySales > 0 ? todaySales : totalGrossSales).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {canViewGrossProfit(currentUser) && (
              <div className="hidden xl:flex flex-col border-l border-slate-200 pl-4 xl:pl-8 shrink-0">
                <span className="text-[11px] text-slate-500 uppercase tracking-widest font-bold">
                  Gross Profit Margin
                </span>
                <span className="text-xl font-extrabold text-emerald-600 font-mono">
                  +{profitMarginPercent.toFixed(1)}% (KSh {grossProfitAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                </span>
              </div>
            )}

            <div className="flex flex-col border-l border-slate-200 pl-4 xl:pl-8 shrink-0">
              <span className="text-[10px] xl:text-[11px] text-slate-500 uppercase tracking-widest font-bold">
                Low Stock Alert
              </span>
              <button
                onClick={() => {
                  setActiveTab('inventory');
                  setInventoryLowStockOnly(true);
                }}
                className={`text-lg xl:text-xl font-extrabold font-mono hover:underline flex items-center gap-1.5 transition text-left cursor-pointer ${
                  lowStockCount > 0 ? 'text-rose-500 font-black' : 'text-slate-700'
                }`}
                title="Click to view only low stock / alerted items in inventory"
              >
                <AlertTriangle className={`w-4 h-4 ${lowStockCount > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
                <span>{lowStockCount.toString().padStart(2, '0')} Items</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {/* Direct "+ New Sale" Button in Top Header */}
            <button
              id="btn-top-new-sale"
              onClick={handleGlobalNewSale}
              title="Quick Start New POS Sale"
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl transition flex items-center gap-1.5 text-xs font-extrabold shadow-md shadow-emerald-600/25 border border-emerald-400/30 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>New Sale</span>
            </button>

            {/* Cloud Sync & Share Across Mobile Phones Button in Top Header */}
            <button
              onClick={() => setShowCloudSyncModal(true)}
              title={
                cloudSyncStatus === 'quota_exceeded'
                  ? 'Firestore Daily Quota Reached: Operating in Offline Local Storage Mode'
                  : 'Real-Time Cloud Synchronization & Share with Worker Mobile Phones'
              }
              className={`px-3 py-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold shadow-sm shrink-0 cursor-pointer ${
                cloudSyncStatus === 'quota_exceeded'
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300'
                  : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200'
              }`}
            >
              <Cloud className={`w-4 h-4 ${cloudSyncStatus === 'quota_exceeded' ? 'text-amber-600' : 'text-sky-600'}`} />
              <span className="inline">
                {cloudSyncStatus === 'quota_exceeded' ? 'Cloud Quota' : 'Share & Sync'}
              </span>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  cloudSyncStatus === 'quota_exceeded'
                    ? 'bg-amber-500'
                    : cloudSyncStatus === 'offline'
                    ? 'bg-slate-400'
                    : 'bg-emerald-500 animate-pulse'
                }`}
                title={cloudSyncStatus === 'quota_exceeded' ? 'Local storage mode' : 'Cloud connection active'}
              />
            </button>

            {/* AI Worker Assistant Button */}
            <button
              onClick={() => setShowAiAssistantModal(true)}
              title="Open AI Assistant for New Workers & Onboarding Guidance"
              className="px-3 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-xl transition flex items-center gap-1.5 text-xs font-bold shadow-md shadow-indigo-600/20 border border-white/20 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span className="hidden xl:inline">AI Co-Pilot</span>
            </button>

            {/* Multi-Store Branch Selector Button */}
            <button
              onClick={() => setShowStoreManagerModal(true)}
              title="Manage & Switch Multi-Store Branches / Outlets"
              className="p-2 lg:px-2.5 lg:py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 transition flex items-center gap-1.5 text-xs font-bold shadow-sm shrink-0 cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="hidden xl:inline max-w-[120px] truncate">
                {stores.find((s) => s.id === activeStoreId)?.name || 'All Stores'}
              </span>
            </button>

            {/* Manage Workers (Add, Edit, Delete, PINs) */}
            <button
              onClick={() => setShowStaffModal(true)}
              title="Manage Workers (Add, Edit, Delete) & Terminal PINs"
              className="p-2 lg:px-2.5 lg:py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl border border-purple-200 transition flex items-center gap-1.5 text-xs font-bold shadow-sm shrink-0 cursor-pointer"
            >
              <Users className="w-4 h-4 text-purple-600 shrink-0" />
              <span className="hidden xl:inline">Workers</span>
            </button>

            {/* Lock Terminal PIN Screen Button */}
            <button
              onClick={() => setIsTerminalLocked(true)}
              title="Lock Register / PIN Auth Screen"
              className="p-2 lg:px-2.5 lg:py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl border border-amber-200 transition flex items-center gap-1.5 text-xs font-bold shadow-sm shrink-0 cursor-pointer"
            >
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="hidden xl:inline">Lock PIN</span>
            </button>

            {/* Sidebar collapse button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? "Expand Sidebar Menu" : "Collapse Sidebar for Full View"}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              {isSidebarCollapsed ? <PanelLeft className="w-4 h-4 text-blue-600" /> : <PanelLeftClose className="w-4 h-4 text-slate-600" />}
              <span className="hidden xl:inline">{isSidebarCollapsed ? "Show Menu" : "Full Canvas"}</span>
            </button>

            {/* Native Browser Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Mode"}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-blue-600" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Launch App in Dedicated Full Browser Tab */}
            <button
              onClick={openInNewTab}
              title="Open Application in Full New Tab (No Studio Frame)"
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Full View</span>
            </button>

            {/* Install App on Mobile Phone Button */}
            <button
              onClick={() => setShowInstallModal(true)}
              title="Install App on Android or iPhone Home Screen"
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Install Mobile App</span>
            </button>

            {/* Format Selector: Computer vs Mobile Phone Format */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                onClick={() => setDeviceFormat('computer')}
                className="px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 bg-blue-600 text-white shadow-sm"
                title="Computer Desktop Format (Full Desktop View)"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Computer Format</span>
              </button>
              <button
                onClick={() => setDeviceFormat('phone')}
                className="px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
                title="Mobile Phone Format (Smartphone Device Frame)"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden md:inline">Mobile Phone Format</span>
              </button>
            </div>

            <div className="relative hidden sm:block">
              <input
                type="text"
                placeholder="Scan barcode or search items..."
                onClick={() => setActiveTab('pos')}
                className="w-56 bg-slate-100 border-none rounded-xl px-10 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 transition"
              />
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            </div>

            {lowStockCount > 0 && (
              <button
                onClick={() => setActiveTab('inventory')}
                className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 text-rose-600 relative transition"
                title={`${lowStockCount} items low on stock`}
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Workspace Canvas for Computer Format */}
        <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-900">
          {renderActiveTabContent()}
        </div>

        {/* Bottom Status & Quick Action Bar */}
        <footer className="h-12 bg-white border-t border-slate-200 flex items-center px-6 justify-between shrink-0 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-5">
            <button
              onClick={() => setActiveTab('reports')}
              className="flex items-center gap-1.5 hover:text-blue-600 transition"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              <span>SMS Receipt Utility</span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className="flex items-center gap-1.5 hover:text-emerald-600 transition"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>WhatsApp Share</span>
            </button>
          </div>

          <div className="text-[10px] text-slate-400 font-mono tracking-wider">
            ROFANI POS OS v4.2.0 • TERMINAL: T-09-NY •{' '}
            <span className="text-emerald-600 font-bold uppercase">Online</span>
          </div>
        </footer>
      </main>

      {/* Floating Calculator & Converter Utilities Widget */}
      <FloatingToolWidget onNavigateTab={(tab) => setActiveTab(tab)} />

      {/* Terminal PIN Lock Screen Modal */}
      <PinLoginModal
        isOpen={isTerminalLocked}
        users={allUsers}
        currentUser={null}
        initialTargetUser={pinModalTargetUser}
        onLoginSuccess={handleLoginSuccess}
        onClose={() => {
          setPinModalTargetUser(null);
          if (!requirePinOnStartup) {
            setIsTerminalLocked(false);
          }
        }}
        isMandatory={requirePinOnStartup}
        masterPin={masterPin}
        storeName={stores.find((s) => s.id === activeStoreId)?.name || 'ROFANI POS'}
        recoveryEmail={ownerRecoveryEmail}
        emergencyKey={emergencyRecoveryKey}
        onResetAdminPin={handleResetAdminPin}
        onResetMasterPin={handleUpdateMasterPin}
      />

      {/* Staff Worker Credentials & PIN Generator Modal */}
      <StaffManagementModal
        isOpen={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        users={allUsers}
        currentUser={currentUser}
        onAddUser={handleAddUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
      />

      {/* PWA Mobile Installation Instructions Modal */}
      <InstallPwaModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />

      {/* Cloud Sync & Real-Time Worker Phone Sharing Modal */}
      <CloudSyncModal
        isOpen={showCloudSyncModal}
        onClose={() => setShowCloudSyncModal(false)}
        products={products}
        allUsers={allUsers}
        cloudSyncStatus={cloudSyncStatus}
        lastSyncedTime={lastSyncedTime}
        isQuotaExceeded={isCloudQuotaExceeded}
        onSyncCatalogComplete={() => {
          setCloudSyncStatus('synced');
          setLastSyncedTime(new Date().toLocaleTimeString());
        }}
        masterPin={masterPin}
        requirePinOnStartup={requirePinOnStartup}
        onLockNow={() => setIsTerminalLocked(true)}
        recoveryEmail={ownerRecoveryEmail}
        emergencyKey={emergencyRecoveryKey}
      />

      {/* Multi-Store Branch Outlets & Inter-Store Stock Transfer Manager Modal */}
      <StoreManagerModal
        isOpen={showStoreManagerModal}
        onClose={() => setShowStoreManagerModal(false)}
        stores={stores}
        products={products}
        stockTransfers={stockTransfers}
        onAddStore={handleAddStore}
        onUpdateStore={handleUpdateStore}
        onDeleteStore={handleDeleteStore}
        activeStoreId={activeStoreId}
        onSelectActiveStore={(id) => {
          setActiveStoreId(id);
          setShowStoreManagerModal(false);
        }}
        onTransferStock={handleTransferStock}
        onUpdateTransferStatus={handleUpdateTransferStatus}
      />

      {/* Restock & Sales History Audit Modal */}
      {selectedHistoryProduct && (
        <ItemHistoryModal
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedHistoryProduct(null);
          }}
          product={selectedHistoryProduct}
          restockRecords={restockRecords}
          transactions={transactions}
          suppliers={suppliers}
          currentUser={currentUser}
          onAddRestock={handleAddRestockRecord}
        />
      )}

      {/* Batch Barcode Label Printer Utility Modal */}
      <PrintBarcodesUtilityModal
        isOpen={showPrintBarcodesModal}
        onClose={() => setShowPrintBarcodesModal(false)}
        scanLogs={scanLogs}
        products={products}
        storeName={stores.find((s) => s.id === activeStoreId)?.name || 'ROFANI Retail'}
      />

      {/* Floating AI Worker Assistant Widget Trigger */}
      <AIAssistantWidget onOpen={() => setShowAiAssistantModal(true)} />

      {/* AI Worker Assistant Modal */}
      <AIAssistantModal
        isOpen={showAiAssistantModal}
        onClose={() => setShowAiAssistantModal(false)}
        activeStoreName={stores.find((s) => s.id === activeStoreId)?.name || 'Main Store'}
        workerRole={currentUser.role}
        activeTab={activeTab}
        lowStockCount={lowStockCount}
        totalProductsCount={products.length}
        totalSalesToday={todaySales > 0 ? todaySales : totalGrossSales}
        products={products}
        transactions={transactions}
        onOpenPredictiveRestock={() => {
          setActiveTab('inventory');
        }}
      />
      {/* Role Authorization Modal for Sensitive Operations (Modifying Inventory, Deleting Expenses, Stock Count Adjustment) */}
      <RoleAuthorizationModal request={roleAuthRequest} />
    </div>
  );
}
