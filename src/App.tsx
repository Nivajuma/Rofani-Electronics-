import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
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
  Truck,
  Mail,
  Volume2,
  VolumeX,
  LayoutDashboard,
  Award,
  LogOut,
  Gift,
  Info,
  Lightbulb,
  Play
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
  WorkerSalaryPayout,
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
  PurchaseOrder,
  StoreSubscriptionProfile,
  DigitalBusinessCard,
  CustomerDepositRecord,
  CustomerComplaint,
  CustomerReturnRecord,
  CustomerReturnItem,
  ReturnRefundMode,
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
import { LowStockPushNotification, LowStockPushAlert, LowStockPushAlertItem } from './components/POS/LowStockPushNotification';
import { InventoryView } from './components/Inventory/InventoryView';
import { PurchasingView } from './components/Inventory/PurchasingView';
import { PhysicalStockCountView } from './components/Inventory/PhysicalStockCountView';
import { ExpensesView } from './components/Expenses/ExpensesView';
import { CashManagementView } from './components/Finance/CashManagementView';
import { AttendanceView } from './components/Attendance/AttendanceView';
import { ReportsView } from './components/Reports/ReportsView';
import { AuditLogsView } from './components/Reports/AuditLogsView';
import { DataManagementView } from './components/Settings/DataManagementView';
import { MobileQuickToolsBar, MobileCartSummary } from './components/Tools/MobileQuickToolsBar';
import { PinLoginModal } from './components/Auth/PinLoginModal';
import { StaffManagementModal } from './components/Auth/StaffManagementModal';
import { RoleAuthorizationModal, RoleAuthorizationRequest } from './components/Auth/RoleAuthorizationModal';
import { InstallPwaModal } from './components/InstallPwaModal';
import { PhoneDeviceFrame } from './components/PhoneDeviceFrame';
import { ItemHistoryModal } from './components/Inventory/ItemHistoryModal';
import { StoreManagerModal } from './components/Store/StoreManagerModal';
import { MultiBranchUpgradeModal } from './components/Store/MultiBranchUpgradeModal';
import { OnlineStorefrontView } from './components/OnlineStore/OnlineStorefrontView';
import { OnlineOrdersManagerView } from './components/OnlineStore/OnlineOrdersManagerView';
import { CustomersSuppliersView } from './components/Contacts/CustomersSuppliersView';
import { AIAssistantModal } from './components/AI/AIAssistantModal';
import { CloudSyncModal } from './components/CloudSync/CloudSyncModal';
import { ConflictResolutionModal } from './components/CloudSync/ConflictResolutionModal';
import { PrintBarcodesUtilityModal } from './components/Inventory/PrintBarcodesUtilityModal';
import { ItemAuditMiniPage } from './components/Inventory/ItemAuditMiniPage';
import { StockAlertNotificationModal } from './components/Inventory/StockAlertNotificationModal';
import { CategoryManagerModal } from './components/Inventory/CategoryManagerModal';
import { CameraStartupPrompt } from './components/Common/CameraStartupPrompt';
import { AppMenuView } from './components/Common/AppMenuView';
import { AboutUsView } from './components/Common/AboutUsView';
import { LiveClientDemoOverlay } from './components/Demo/LiveClientDemoOverlay';
import { ShopQrShareModal } from './components/Common/ShopQrShareModal';
import { DailyEndOfDaySummaryModal } from './components/Common/DailyEndOfDaySummaryModal';
import { DailyEmailBackupModal } from './components/Settings/DailyEmailBackupModal';
import { MerchantAuthScreen } from './components/Auth/MerchantAuthScreen';
import { StoreOnboardingModal } from './components/Auth/StoreOnboardingModal';
import { SubscriptionPlansModal } from './components/Subscription/SubscriptionPlansModal';
import { SuperAdminSubscribersModal } from './components/Admin/SuperAdminSubscribersModal';
import { SuggestFeatureModal } from './components/Common/SuggestFeatureModal';
import {
  DigitalBusinessCardModal,
  BUSINESS_CARD_STORAGE_KEY,
} from './components/Common/DigitalBusinessCardModal';
import {
  getBackupSettings,
  saveBackupSettings,
  getGmailAccessToken,
  buildAndDispatchStoreBackup,
  dismissBackupBannerForDate,
  isBackupBannerDismissedForDate,
  BackupSettings,
} from './lib/gmailService';
import { formatKSh } from './utils/currency';
import {
  TabKey,
  hasTabPermission,
  hasWorkerPermission,
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
  batchDeleteProductsFromCloud,
  bulkUploadProductsToCloud,
  batchSaveProductsToCloud,
  subscribeToTransactions,
  saveTransactionToCloud,
  batchSaveTransactionsToCloud,
  commitSaleToCloudBatch,
  subscribeToCustomers,
  saveCustomerToCloud,
  deleteCustomerFromCloud,
  batchSaveCustomersToCloud,
  subscribeToSuppliers,
  saveSupplierToCloud,
  deleteSupplierFromCloud,
  batchSaveSuppliersToCloud,
  subscribeToExpenses,
  saveExpenseToCloud,
  deleteExpenseFromCloud,
  batchSaveExpensesToCloud,
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
  fetchProductsFromCloud,
  fetchTransactionsFromCloud,
  fetchCustomersFromCloud,
  fetchSuppliersFromCloud,
  fetchExpensesFromCloud,
  fetchUsersFromCloud,
  subscribeToMpesaConfig,
  fetchStoreProfile,
  subscribeToStoreProfile,
  ensureOwnerPrimaryStoreProfile,
  createMerchantStoreProfile,
  migrateLegacyRootCollectionsToOwnerStoreIfNeeded,
  ensureReferralCodeForStore,
  reconcileIncomingReferralRewards,
  subscribeToReferralRewards,
  normalizeReferralCode,
  subscribeToTransactionSettings,
  subscribeToShopProtectionSettings,
  deleteTransactionFromCloud,
  updateStoreProfileDetails,
  isLegacyRofaniStoreBrand,
  upgradeStoreToMultiBranchGroup,
  createBranchStoreInGroup,
  fetchBusinessGroupBranches,
  getCachedGroupBranches,
  saveCachedGroupBranches,
  syncCrossBranchStaffAssignment,
  subscribeToCustomerDeposits,
  saveCustomerDepositToCloud,
  subscribeToCustomerComplaints,
  saveCustomerComplaintToCloud,
  subscribeToCustomerReturns,
  saveCustomerReturnToCloud,
} from './lib/cloudSync';
import { registerNativeBiometricCredential } from './utils/biometricAuth';
import { loadMpesaConfig, saveMpesaConfig } from './utils/mpesa';
import {
  saveTransactionSettingsLocal,
  normalizeTransactionSettings,
} from './utils/transactionSettings';
import {
  useShopProtectionSettings,
  saveShopProtectionSettingsLocal,
  normalizeShopProtectionSettings,
} from './utils/shopProtectionSettings';
import {
  auth,
  isAuthorizedCloudUser,
  isOwnerCloudUser,
  getStoreIdForUser,
  OWNER_PRIMARY_STORE_ID,
  completeGoogleRedirectSignIn,
  signOutFromCloud,
  testFirestoreConnection,
  refreshFirestoreConnection,
  isQuotaExceededError,
  FIREBASE_UPGRADE_URL,
} from './lib/firebase';
import {
  ACTIVE_SCOPE_STORAGE_KEY,
  VERIFIED_OWNER_CACHE_KEY,
  CLIENT_DEMO_STORE_ID,
  CLIENT_DEMO_MODE_KEY,
  clearClientDemoStorage,
  setActiveTenantStoreId,
  getActiveTenantStoreId,
  getActiveBranchCloudStoreId,
  setActiveBranchCloudStoreId,
  resolveTenantStorageKey,
} from './utils/tenantScope';
import {
  createClientDemoProfiles,
  seedClientDemoSandbox,
  buildFreshDemoTransactions,
  buildFreshDemoExpenses,
  buildFreshDemoAttendance,
  buildDemoLocations,
  buildFreshDemoCustomerDeposits,
  buildFreshDemoCustomerComplaints,
  buildFreshDemoCustomerReturns,
} from './utils/demoPreset';
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
  getPendingSyncCount,
  removePendingSyncItem,
  getAggressiveAutoSync,
  addSyncHistoryEntry,
  SyncRetryResult,
} from './utils/offlineSync';
import {
  SyncConflictRecordType,
  SyncConflict,
  ConflictResolutionChoice,
  mergeRecordsWithConflictDetection,
} from './utils/syncConflicts';
import { findRecoverableBackups, protectLargestBackup, getBackupDataByKey } from './utils/backupRecovery';
import { recordLastBackupMeta } from './utils/storeBackup';
import { isSoundEnabled, setSoundEnabled, subscribeToSoundPref, playButtonSound, playLowStockAlertSound } from './utils/uiFeedback';
import { saveToIDB, getFromIDB } from './utils/idbStorage';
import { deduplicateProducts } from './utils/deduplicate';
import { ErrorBoundary } from './components/ErrorBoundary';

function haveProductListsChanged(a: Product[], b: Product[]): boolean {
  if (a === b) return false;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    const p1 = a[i];
    const p2 = b[i];
    if (
      !p1 ||
      !p2 ||
      p1.id !== p2.id ||
      p1.updatedAt !== p2.updatedAt ||
      p1.stockQuantity !== p2.stockQuantity ||
      p1.sellingPrice !== p2.sellingPrice ||
      p1.costPrice !== p2.costPrice ||
      p1.name !== p2.name ||
      p1.category !== p2.category ||
      p1.barcode !== p2.barcode ||
      p1.sku !== p2.sku
    ) {
      return true;
    }
  }
  return false;
}

function haveTransactionListsChanged(a: Transaction[], b: Transaction[]): boolean {
  if (a === b) return false;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    const t1 = a[i];
    const t2 = b[i];
    if (
      !t1 ||
      !t2 ||
      t1.id !== t2.id ||
      t1.updatedAt !== t2.updatedAt ||
      t1.editedAt !== t2.editedAt ||
      t1.grandTotal !== t2.grandTotal ||
      t1.paymentStatus !== t2.paymentStatus
    ) {
      return true;
    }
  }
  return false;
}

function haveUserListsChanged(a: User[], b: User[]): boolean {
  if (a === b) return false;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    const u1 = a[i];
    const u2 = b[i];
    if (
      !u1 ||
      !u2 ||
      u1.id !== u2.id ||
      u1.updatedAt !== u2.updatedAt ||
      u1.name !== u2.name ||
      u1.role !== u2.role ||
      u1.pin !== u2.pin ||
      u1.status !== u2.status
    ) {
      return true;
    }
  }
  return false;
}

const DELETED_PRODUCTS_STORAGE_KEY = 'retail_pos_deleted_products';

function getDeletedProductIds(): Set<string> {
  const ids = safeGetJSON<string[]>(DELETED_PRODUCTS_STORAGE_KEY, []);
  return new Set(Array.isArray(ids) ? ids.filter(Boolean) : []);
}

function markProductDeletedLocally(productId: string): void {
  if (!productId) return;
  const ids = getDeletedProductIds();
  ids.add(productId);
  safeSetJSON(DELETED_PRODUCTS_STORAGE_KEY, Array.from(ids).slice(-2500));
}

function markProductsDeletedLocally(productIds: string[]): void {
  if (!productIds || productIds.length === 0) return;
  const ids = getDeletedProductIds();
  productIds.forEach((pid) => {
    if (pid) ids.add(pid);
  });
  safeSetJSON(DELETED_PRODUCTS_STORAGE_KEY, Array.from(ids).slice(-2500));
}

function unmarkProductDeletedLocally(productId: string): void {
  if (!productId) return;
  const ids = getDeletedProductIds();
  if (ids.delete(productId)) {
    safeSetJSON(DELETED_PRODUCTS_STORAGE_KEY, Array.from(ids));
  }
}

function parseProductTimestampMs(val?: string): number {
  if (!val || typeof val !== 'string') return 0;
  const ms = Date.parse(val);
  return Number.isFinite(ms) ? ms : 0;
}

function getPendingRecordMap<T extends { id: string }>(
  queueType: 'product' | 'sale' | 'customer' | 'supplier' | 'expense' | 'user'
): Map<string, T> {
  const map = new Map<string, T>();
  try {
    const queue = getPendingSyncQueue();
    queue.forEach((item) => {
      if (item.type === queueType && item.data && item.data.id && !item.data._deleted) {
        const rec = item.data as T & { updatedAt?: string; editedAt?: string };
        const existing = map.get(rec.id) as (T & { updatedAt?: string; editedAt?: string }) | undefined;
        const recTs = parseProductTimestampMs(rec.editedAt || rec.updatedAt);
        const existingTs = existing ? parseProductTimestampMs(existing.editedAt || existing.updatedAt) : -1;
        if (!existing || recTs >= existingTs) {
          map.set(rec.id, rec);
        }
      }
    });
  } catch {}
  return map;
}

function getPendingProductMap(): Map<string, Product> {
  return getPendingRecordMap<Product>('product');
}

function clearPendingSyncItemsForRecord(recordType: SyncConflictRecordType, recordId: string): void {
  try {
    const queueType = recordType === 'transaction' ? 'sale' : recordType;
    const queue = getPendingSyncQueue();
    queue.forEach((item) => {
      if (item.type === queueType && String(item.data?.id || '') === String(recordId)) {
        removePendingSyncItem(item.id);
      }
    });
  } catch {}
}

function mergeProductListsByTimestamp(
  localProducts: Product[],
  incomingProducts: Product[],
  deletedIds: Set<string> = getDeletedProductIds(),
  pendingMap: Map<string, Product> = getPendingProductMap()
): Product[] {
  const prodMap = new Map<string, Product>();

  (localProducts || []).forEach((lp) => {
    if (lp && lp.id && !deletedIds.has(lp.id)) {
      prodMap.set(lp.id, lp);
    }
  });

  // Ensure any locally queued unsynced product edits/additions are never lost
  pendingMap.forEach((pendingProd, id) => {
    if (deletedIds.has(id)) return;
    const existing = prodMap.get(id);
    if (!existing || parseProductTimestampMs(pendingProd.updatedAt) >= parseProductTimestampMs(existing.updatedAt)) {
      prodMap.set(id, {
        ...pendingProd,
        imageUrl: pendingProd.imageUrl || existing?.imageUrl || '',
      });
    }
  });

  (incomingProducts || []).forEach((remoteItem) => {
    if (!remoteItem || !remoteItem.id || deletedIds.has(remoteItem.id)) return;
    const local = prodMap.get(remoteItem.id);
    if (!local) {
      prodMap.set(remoteItem.id, remoteItem);
      return;
    }

    const remoteMs = parseProductTimestampMs(remoteItem.updatedAt);
    const localMs = parseProductTimestampMs(local.updatedAt);
    const hasPendingLocalWrite = pendingMap.has(remoteItem.id);

    // Strictly newer (`>`) wins, and never clobber an unsynced local pending edit unless remote is strictly newer
    if (remoteMs > localMs && (!hasPendingLocalWrite || remoteMs > parseProductTimestampMs(pendingMap.get(remoteItem.id)?.updatedAt))) {
      prodMap.set(remoteItem.id, {
        ...remoteItem,
        imageUrl: remoteItem.imageUrl || local.imageUrl || '',
      });
    } else if (!local.imageUrl && remoteItem.imageUrl) {
      prodMap.set(remoteItem.id, {
        ...local,
        imageUrl: remoteItem.imageUrl,
      });
    }
  });

  return Array.from(prodMap.values());
}

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
    'about',
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
    // Auto-detect mobile phone screens on first visit
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

  // Stock alert filter toggle state
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

  // Role, Worker Users & PIN Security State with safe lazy initialization & immediate tenant-scoped sync
  const [allUsers, setAllUsersState] = useState<User[]>(() => {
    try {
      const activeScope = getActiveTenantStoreId();
      const fallbackUsers = activeScope === OWNER_PRIMARY_STORE_ID ? INITIAL_USERS : [];
      const primary = localStorage.getItem(resolveTenantStorageKey('retail_pos_users'));
      const secondary = localStorage.getItem(resolveTenantStorageKey('pos_store_staff_users'));
      const saved = primary || secondary;
      const rawUsers = saved ? JSON.parse(saved) : fallbackUsers;
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
          safeSetJSON('retail_pos_users', migrated);
          safeSetJSON('pos_store_staff_users', migrated);
        } catch {}
      }
      return migrated;
    } catch {
      return getActiveTenantStoreId() === OWNER_PRIMARY_STORE_ID ? INITIAL_USERS : [];
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

  // Security Configuration (PIN / Password / Biometric Protection)
  const [requirePinOnStartup, setRequirePinOnStartup] = useState<boolean>(() =>
    safeGetJSON('retail_pos_require_pin_startup', true)
  );
  const [biometricUnlockEnabled, setBiometricUnlockEnabled] = useState<boolean>(() =>
    safeGetJSON('retail_pos_biometric_unlock', false, (v) => typeof v === 'boolean')
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
  // Restore terminal locked state or default to requirePinOnStartup
  const [isTerminalLocked, setIsTerminalLocked] = useState<boolean>(() =>
    safeGetJSON<boolean>('retail_pos_terminal_locked', safeGetJSON('retail_pos_require_pin_startup', true), (val) => typeof val === 'boolean')
  );

  useEffect(() => {
    safeSetJSON('retail_pos_terminal_locked', isTerminalLocked);
  }, [isTerminalLocked]);

  const [showShopQrModal, setShowShopQrModal] = useState(false);
  const [showBusinessCardModal, setShowBusinessCardModal] = useState(false);
  const [show9PmSummaryModal, setShow9PmSummaryModal] = useState(false);
  const [activityAlertBanner, setActivityAlertBanner] = useState<{
    id: string;
    severity: 'info' | 'warning' | 'danger';
    title: string;
    message: string;
  } | null>(null);

  // Target user when switching workers via PIN lock modal
  const [pinModalTargetUser, setPinModalTargetUser] = useState<User | null>(null);
  // Set of tabs temporarily authorized by supervisor PIN during active session
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

  const CACHED_CLOUD_SESSION_KEY = 'rofani_pos_cached_cloud_session';
  const [cachedCloudSession, setCachedCloudSession] = useState<{
    uid: string;
    email?: string | null;
    isOwner?: boolean;
  } | null>(() => safeGetJSON(CACHED_CLOUD_SESSION_KEY, null));
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [isFirebaseAuthReady, setIsFirebaseAuthReady] = useState<boolean>(() => Boolean(auth.currentUser));
  const [hasAuthSettledFromFirebase, setHasAuthSettledFromFirebase] = useState<boolean>(() => Boolean(auth.currentUser));
  const [allowOfflineOwnerMode, setAllowOfflineOwnerMode] = useState<boolean>(false);
  const [isClientDemoMode, setIsClientDemoMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const params = new URLSearchParams(window.location.search);
      const demoParam = (params.get('demo') || '').toLowerCase();
      if (demoParam === '1' || demoParam === 'true') {
        localStorage.setItem(CLIENT_DEMO_MODE_KEY, '1');
        return true;
      }
      return localStorage.getItem(CLIENT_DEMO_MODE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [storeProfile, setStoreProfile] = useState<StoreSubscriptionProfile | null>(() =>
    safeGetJSON<StoreSubscriptionProfile | null>('rofani_pos_store_profile', null)
  );
  const [isCheckingStoreProfile, setIsCheckingStoreProfile] = useState<boolean>(false);
  const [showPlansModal, setShowPlansModal] = useState<boolean>(false);
  const [showSuperAdminModal, setShowSuperAdminModal] = useState<boolean>(false);
  const [showSuggestFeatureModal, setShowSuggestFeatureModal] = useState<boolean>(false);
  const [activeBranchStoreId, setActiveBranchStoreIdState] = useState<string | null>(() =>
    getActiveBranchCloudStoreId()
  );
  const [groupBranches, setGroupBranches] = useState<StoreSubscriptionProfile[]>(() => {
    const cachedSess = safeGetJSON<{ uid?: string } | null>('rofani_pos_cached_cloud_session', null);
    return cachedSess?.uid ? getCachedGroupBranches(cachedSess.uid) : [];
  });
  const [showMultiBranchModal, setShowMultiBranchModal] = useState<boolean>(false);

  const PENDING_REFERRAL_STORAGE_KEY = 'rofani_pending_referral_code';
  const [pendingReferralCode, setPendingReferralCode] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const urlRef = new URLSearchParams(window.location.search).get('ref');
      if (urlRef) {
        const clean = normalizeReferralCode(urlRef);
        if (clean) {
          localStorage.setItem(PENDING_REFERRAL_STORAGE_KEY, clean);
          return clean;
        }
      }
      return normalizeReferralCode(localStorage.getItem(PENDING_REFERRAL_STORAGE_KEY) || '');
    } catch {
      return '';
    }
  });
  const updatePendingReferralCode = (code: string) => {
    const clean = normalizeReferralCode(code);
    setPendingReferralCode(clean);
    try {
      if (clean) {
        localStorage.setItem(PENDING_REFERRAL_STORAGE_KEY, clean);
      } else {
        localStorage.removeItem(PENDING_REFERRAL_STORAGE_KEY);
      }
    } catch {}
  };

  const [referralRewardToast, setReferralRewardToast] = useState<{
    kind: 'reward' | 'welcome';
    message: string;
    subtext?: string;
  } | null>(null);
  const [welcomeBannerDismissedForStore, setWelcomeBannerDismissedForStore] = useState<string | null>(null);

  useEffect(() => {
    completeGoogleRedirectSignIn().catch(() => null);
    // Failsafe so new/unauthenticated visitors aren't stuck on loading screen;
    // never marks auth settled as null so cached sessions are not prematurely kicked out.
    const authTimeoutId = setTimeout(() => {
      setIsFirebaseAuthReady(true);
    }, 3000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(authTimeoutId);
      setFirebaseUser(user);
      setHasAuthSettledFromFirebase(true);
      setIsFirebaseAuthReady(true);
      if (user && isAuthorizedCloudUser(user)) {
        const sessionSnapshot = {
          uid: user.uid,
          email: user.email,
          isOwner: isOwnerCloudUser(user),
        };
        setCachedCloudSession(sessionSnapshot);
        safeSetJSON(CACHED_CLOUD_SESSION_KEY, sessionSnapshot);
        setAllowOfflineOwnerMode(false);
      } else if (user === null) {
        setCachedCloudSession(null);
        safeSetJSON(CACHED_CLOUD_SESSION_KEY, undefined);
      }
    });
    return () => {
      clearTimeout(authTimeoutId);
      unsubscribe();
    };
  }, []);

  const isOwnerAccount =
    !isClientDemoMode &&
    (isOwnerCloudUser(firebaseUser) ||
      (!hasAuthSettledFromFirebase && Boolean(cachedCloudSession?.isOwner)) ||
      (allowOfflineOwnerMode && typeof window !== 'undefined' && localStorage.getItem(VERIFIED_OWNER_CACHE_KEY) === '1'));
  const primaryCloudStoreId = isClientDemoMode
    ? CLIENT_DEMO_STORE_ID
    : getStoreIdForUser(firebaseUser) || cachedCloudSession?.uid || null;
  const activeCloudStoreId = primaryCloudStoreId;
  const effectiveCloudStoreId = activeBranchStoreId || primaryCloudStoreId;
  const activeBranchProfile = useMemo(() => {
    if (effectiveCloudStoreId && groupBranches.length > 0) {
      const matched = groupBranches.find((b) => b.id === effectiveCloudStoreId);
      if (matched) return matched;
    }
    return storeProfile;
  }, [groupBranches, effectiveCloudStoreId, storeProfile]);
  const isCloudAuthReady =
    !isClientDemoMode && isFirebaseAuthReady && isAuthorizedCloudUser(firebaseUser);
  const canAutoSyncCloud = () =>
    !isClientDemoMode && getIsOnline() && isAuthorizedCloudUser(auth.currentUser);
  const prevTenantScopeRef = useRef<string>(getActiveTenantStoreId());

  const reloadAppStateForTenantScope = (
    targetScope: string,
    ownerMode: boolean,
    profileOverride?: StoreSubscriptionProfile | null
  ) => {
    const isDemoScope =
      targetScope === CLIENT_DEMO_STORE_ID ||
      targetScope.startsWith(`${CLIENT_DEMO_STORE_ID}_br_`);
    const isOwnerScope = targetScope === OWNER_PRIMARY_STORE_ID || ownerMode;
    const isUnauthScope = targetScope === '__unauthenticated__';

    setActiveTenantStoreId(targetScope);
    setSyncConflicts([]);
    resolvedConflictFingerprintsRef.current.clear();
    userMutatedProductsRef.current = false;
    hasHydratedProductsFromIdbRef.current = false;

    if (isUnauthScope) {
      setStoreProfile(null);
      return;
    }

    const loadArr = <T,>(key: string, ownerFallback: T[]): T[] => {
      try {
        const raw = localStorage.getItem(resolveTenantStorageKey(key, targetScope));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed as T[];
        }
      } catch {}
      return isOwnerScope || isDemoScope ? ownerFallback : [];
    };

    const isBlankMode =
      !isDemoScope &&
      (safeGetJSON<boolean>('rofani_pos_blank_mode', false) ||
        Boolean(profileOverride?.skipLegacySeed));

    const nextProducts = mergeProductListsByTimestamp(
      loadArr<Product>('retail_pos_products', isBlankMode ? [] : INITIAL_PRODUCTS),
      [],
      getDeletedProductIds(),
      getPendingProductMap()
    );
    productsRef.current = nextProducts;
    setProductsState(nextProducts);

    if (isDemoScope) {
      hasHydratedProductsFromIdbRef.current = true;
    } else {
      getFromIDB(resolveTenantStorageKey('retail_pos_products', targetScope))
        .then((idbProds) => {
          if (Array.isArray(idbProds) && idbProds.length > 0 && getActiveTenantStoreId() === targetScope) {
            const merged = mergeProductListsByTimestamp(
              productsRef.current,
              idbProds,
              getDeletedProductIds(),
              getPendingProductMap()
            );
            productsRef.current = merged;
            setProductsState(merged);
          }
          hasHydratedProductsFromIdbRef.current = true;
        })
        .catch(() => {
          hasHydratedProductsFromIdbRef.current = true;
        });
    }

    const nextSales = loadArr<Transaction>(
      'retail_pos_transactions',
      isDemoScope ? buildFreshDemoTransactions() : INITIAL_TRANSACTIONS
    );
    transactionsRef.current = nextSales;
    setTransactionsState(nextSales);

    const nextCustomers = loadArr<Customer>('retail_pos_customers', INITIAL_CUSTOMERS);
    customersRef.current = nextCustomers;
    setCustomers(nextCustomers);

    setCustomerDeposits(
      loadArr<CustomerDepositRecord>(
        'retail_pos_customer_deposits',
        isDemoScope ? buildFreshDemoCustomerDeposits() : []
      )
    );
    setCustomerComplaints(
      loadArr<CustomerComplaint>(
        'retail_pos_customer_complaints',
        isDemoScope ? buildFreshDemoCustomerComplaints() : []
      )
    );
    setCustomerReturns(
      loadArr<CustomerReturnRecord>(
        'retail_pos_customer_returns',
        isDemoScope ? buildFreshDemoCustomerReturns() : []
      )
    );

    const nextSuppliers = loadArr<Supplier>('retail_pos_suppliers', INITIAL_SUPPLIERS);
    suppliersRef.current = nextSuppliers;
    setSuppliers(nextSuppliers);

    const nextExpenses = loadArr<Expense>(
      'retail_pos_expenses',
      isDemoScope ? buildFreshDemoExpenses() : INITIAL_EXPENSES
    );
    expensesRef.current = nextExpenses;
    setExpensesState(nextExpenses);

    setAttendanceRecords(
      loadArr<AttendanceRecord>(
        'retail_pos_attendance',
        isDemoScope ? buildFreshDemoAttendance() : INITIAL_ATTENDANCE
      )
    );
    setCashTransactions(loadArr<CashTransaction>('retail_pos_cash_transactions', INITIAL_CASH_TRANSACTIONS));
    setRestockRecords(loadArr<RestockRecord>('retail_pos_restock_records', INITIAL_RESTOCK_RECORDS));
    setPurchaseOrdersState(loadArr<PurchaseOrder>('retail_pos_purchase_orders', INITIAL_PURCHASE_ORDERS));
    setCommissionPayouts(loadArr<StaffCommissionPayout>('retail_pos_commission_payouts', INITIAL_COMMISSION_PAYOUTS));
    setSalaryPayouts(loadArr<WorkerSalaryPayout>('retail_pos_salary_payouts', []));
    setWorkerLoans(loadArr<WorkerLoan>('retail_pos_worker_loans', INITIAL_WORKER_LOANS));
    setFinancingFacilities(loadArr<FinancingFacility>('retail_pos_financing_facilities', INITIAL_FINANCING_FACILITIES));
    setOffers(loadArr<OfferDeal>('retail_pos_offers', INITIAL_OFFERS));
    setOnlineOrders(loadArr<OnlineOrder>('retail_pos_online_orders', INITIAL_ONLINE_ORDERS));
    setStockTransfers(loadArr<StockTransferRecord>('retail_pos_stock_transfers', INITIAL_STOCK_TRANSFERS));
    setScanLogs(loadArr<BarcodeScanLog>('retail_pos_barcode_scan_logs', INITIAL_BARCODE_SCAN_LOGS));
    setAuditLogs(loadAuditLogsFromStorage());

    const fallbackUsers: User[] =
      isOwnerScope || isDemoScope
        ? INITIAL_USERS
        : [
            {
              id: 'usr-owner',
              name:
                auth.currentUser?.displayName ||
                profileOverride?.storeName ||
                auth.currentUser?.email?.split('@')[0] ||
                'Store Owner',
              role: 'Admin',
              roles: ['Admin'],
              email: auth.currentUser?.email || '',
              pin: '1234',
              status: 'active',
            },
          ];

    const loadedUsers = loadArr<User>('retail_pos_users', fallbackUsers);
    const nextUsers = loadedUsers.length > 0 ? loadedUsers : fallbackUsers;
    allUsersRef.current = nextUsers;
    setAllUsersState(nextUsers);

    const savedActiveUser = safeGetJSON<User | null>('retail_pos_active_user', null);
    const nextActiveUser =
      savedActiveUser && nextUsers.some((u) => u.id === savedActiveUser.id)
        ? savedActiveUser
        : nextUsers[0];
    if (nextActiveUser) {
      setCurrentUser(nextActiveUser);
    }

    const defaultPinReq = isOwnerScope && !isDemoScope ? true : false;
    const savedPinReq = isDemoScope
      ? false
      : safeGetJSON<boolean>('retail_pos_require_pin_startup', defaultPinReq);
    setRequirePinOnStartup(savedPinReq);
    setMasterPin(safeGetJSON<string>('retail_pos_master_pin', '1234'));
    setIsTerminalLocked(isDemoScope ? false : safeGetJSON<boolean>('retail_pos_terminal_locked', savedPinReq));

    const savedStores = safeGetJSON<StoreLocation[] | null>('retail_pos_stores', null);
    if (savedStores && Array.isArray(savedStores) && savedStores.length > 0) {
      setStores(savedStores);
    } else if (isDemoScope) {
      setStores(buildDemoLocations(profileOverride?.storeName || 'Rofani Demo Flagship'));
    } else if (isOwnerScope) {
      setStores(INITIAL_STORES);
    } else {
      setStores([
        {
          id: 'store-main',
          name: profileOverride?.storeName || 'My Store',
          code: 'MAIN-01',
          city: 'Nairobi',
          address: 'Main Branch',
          phone: profileOverride?.phone || '',
          isMainBranch: true,
          active: true,
        },
      ]);
    }
    setActiveStoreId(safeGetJSON<string>('retail_pos_active_store_id', 'store-main') || 'store-main');
  };

  // Synchronize active tenant scope, reload isolated state, and bind Firestore stores/{userId}
  useEffect(() => {
    if (isClientDemoMode) {
      const hasSeededDemo = Boolean(
        localStorage.getItem(resolveTenantStorageKey('retail_pos_products', CLIENT_DEMO_STORE_ID))
      );
      let demoBranches = getCachedGroupBranches(CLIENT_DEMO_STORE_ID);
      let defaultMainProfile: StoreSubscriptionProfile;
      if (!hasSeededDemo || demoBranches.length === 0) {
        const seeded = seedClientDemoSandbox();
        defaultMainProfile = seeded.mainProfile;
        demoBranches = seeded.branches;
      } else {
        defaultMainProfile =
          demoBranches.find((b) => b.id === CLIENT_DEMO_STORE_ID) ||
          createClientDemoProfiles().mainProfile;
      }

      const validDemoScope =
        activeBranchStoreId &&
        (activeBranchStoreId === CLIENT_DEMO_STORE_ID ||
          activeBranchStoreId.startsWith(`${CLIENT_DEMO_STORE_ID}_br_`))
          ? activeBranchStoreId
          : CLIENT_DEMO_STORE_ID;
      const activeDemoBranch =
        demoBranches.find((b) => b.id === validDemoScope) || defaultMainProfile;

      if (prevTenantScopeRef.current !== validDemoScope) {
        prevTenantScopeRef.current = validDemoScope;
        reloadAppStateForTenantScope(validDemoScope, false, activeDemoBranch);
      } else {
        setActiveTenantStoreId(validDemoScope);
      }

      setStoreProfile(activeDemoBranch);
      setGroupBranches(demoBranches);
      setIsCheckingStoreProfile(false);
      setIsTerminalLocked(false);
      return;
    }

    if (!isFirebaseAuthReady) return;

    let nextLocalScope = '__unauthenticated__';
    const nextCloudStoreId =
      firebaseUser && isAuthorizedCloudUser(firebaseUser) ? getStoreIdForUser(firebaseUser) : null;

    if (firebaseUser && isAuthorizedCloudUser(firebaseUser)) {
      const validBranchScope =
        activeBranchStoreId &&
        nextCloudStoreId &&
        (activeBranchStoreId === nextCloudStoreId ||
          activeBranchStoreId.startsWith(`${nextCloudStoreId}_br_`))
          ? activeBranchStoreId
          : null;
      if (activeBranchStoreId && !validBranchScope) {
        setActiveBranchCloudStoreId(null);
        setActiveBranchStoreIdState(null);
      }
      nextLocalScope =
        validBranchScope ||
        (isOwnerCloudUser(firebaseUser)
          ? OWNER_PRIMARY_STORE_ID
          : (nextCloudStoreId || firebaseUser.uid));
      if (isOwnerCloudUser(firebaseUser)) {
        try {
          localStorage.setItem(VERIFIED_OWNER_CACHE_KEY, '1');
        } catch {}
      }
    } else if (!hasAuthSettledFromFirebase && cachedCloudSession?.uid) {
      // Firebase Auth is still hydrating on a slow mobile/cold start — preserve cached session scope
      const validCachedBranch =
        activeBranchStoreId &&
        (activeBranchStoreId === cachedCloudSession.uid ||
          activeBranchStoreId.startsWith(`${cachedCloudSession.uid}_br_`))
          ? activeBranchStoreId
          : null;
      nextLocalScope =
        validCachedBranch ||
        (cachedCloudSession.isOwner ? OWNER_PRIMARY_STORE_ID : cachedCloudSession.uid);
    } else if (
      allowOfflineOwnerMode &&
      typeof window !== 'undefined' &&
      localStorage.getItem(VERIFIED_OWNER_CACHE_KEY) === '1'
    ) {
      nextLocalScope = activeBranchStoreId || OWNER_PRIMARY_STORE_ID;
    }

    if (prevTenantScopeRef.current !== nextLocalScope) {
      prevTenantScopeRef.current = nextLocalScope;
      const branchMatch = groupBranches.find((b) => b.id === nextLocalScope) || null;
      reloadAppStateForTenantScope(
        nextLocalScope,
        nextLocalScope === OWNER_PRIMARY_STORE_ID,
        branchMatch
      );
    } else {
      setActiveTenantStoreId(nextLocalScope);
    }

    if (!firebaseUser || !isAuthorizedCloudUser(firebaseUser) || !nextCloudStoreId || nextLocalScope === '__unauthenticated__') {
      setIsCheckingStoreProfile(false);
      // Only wipe cached store profile once Firebase Auth has genuinely confirmed user === null
      if (hasAuthSettledFromFirebase && !allowOfflineOwnerMode) {
        setStoreProfile(null);
        safeSetJSON('rofani_pos_store_profile', undefined);
      }
      return;
    }

    let cancelled = false;
    let unsubscribeProfile: (() => void) | undefined;

    const applyStoreProfileToWorkspace = (prof: StoreSubscriptionProfile | null) => {
      if (cancelled) return;
      setStoreProfile(prof);
      if (prof) {
        safeSetJSON('rofani_pos_store_profile', prof);
        if (prof.skipLegacySeed) {
          safeSetJSON('rofani_pos_blank_mode', true);
        }
        if (prof.preferredLabelSizeId) {
          safeSetJSON('retail_pos_print_format_id', prof.preferredLabelSizeId);
        }
        if (prof.businessCard) {
          safeSetJSON(BUSINESS_CARD_STORAGE_KEY, prof.businessCard);
        }
        if (
          prof.backupEmail ||
          typeof prof.emailAutoBackupEnabled === 'boolean' ||
          prof.dismissedBackupBannerDate
        ) {
          const cleanProfEmail = (prof.backupEmail || '').trim();
          if (cleanProfEmail) {
            safeSetJSON('rofani_pos_backup_email', cleanProfEmail);
          }
          if (prof.dismissedBackupBannerDate) {
            safeSetJSON('rofani_pos_dismissed_backup_banner_date', prof.dismissedBackupBannerDate);
          }
          const currentLocalBackupCfg = getBackupSettings();
          const resolvedEmail = cleanProfEmail || (currentLocalBackupCfg.recipientEmail || '').trim();
          const autoEnabled =
            typeof prof.emailAutoBackupEnabled === 'boolean'
              ? prof.emailAutoBackupEnabled
              : currentLocalBackupCfg.enabled;
          saveBackupSettings({
            ...(resolvedEmail ? { recipientEmail: resolvedEmail } : {}),
            ...(cleanProfEmail
              ? { recipientEmailConfirmed: prof.backupEmailConfirmed !== false }
              : autoEnabled && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resolvedEmail)
              ? { recipientEmailConfirmed: true }
              : {}),
            enabled: autoEnabled,
            ...(prof.dismissedBackupBannerDate
              ? { dismissedBackupBannerDate: prof.dismissedBackupBannerDate }
              : {}),
          });

          const todayIso = new Date().toISOString().split('T')[0];
          if (
            prof.dismissedBackupBannerDate === todayIso ||
            (Boolean(resolvedEmail) && autoEnabled)
          ) {
            setBackupBanner((prev) => (prev?.type === 'info' ? null : prev));
          }
        }
      }
      if (prof) {
        const cleanProfileStoreName = isLegacyRofaniStoreBrand(prof.storeName)
          ? 'Rofani POS'
          : prof.storeName;
        setStores((prev) => {
          if (!prev || prev.length === 0) {
            return [
              {
                id: 'store-main',
                name: cleanProfileStoreName,
                code: 'MAIN-01',
                city: 'Nairobi',
                address: 'Main Branch',
                phone: prof.phone || '',
                isMainBranch: true,
                active: true,
              },
            ];
          }
          if (isOwnerCloudUser(firebaseUser) && !isLegacyRofaniStoreBrand(prof.storeName) && prof.storeName !== prev[0]?.name) {
            return prev.map((s, idx) =>
              idx === 0 || s.id === 'store-main'
                ? { ...s, name: cleanProfileStoreName }
                : s
            );
          }
          if (isOwnerCloudUser(firebaseUser)) {
            return prev.map((s) =>
              isLegacyRofaniStoreBrand(s.name) ? { ...s, name: 'Rofani POS' } : s
            );
          }
          return prev.map((s, idx) =>
            idx === 0 || s.id === 'store-main'
              ? {
                  ...s,
                  name: cleanProfileStoreName || s.name,
                  phone: prof.phone || s.phone,
                }
              : s
          );
        });
      }
    };

    const runReferralReconciliation = () => {
      reconcileIncomingReferralRewards(nextCloudStoreId)
        .then((res) => {
          if (cancelled || res.newlyAppliedCount <= 0) return;
          if (res.updatedProfile) {
            applyStoreProfileToWorkspace(res.updatedProfile);
          }
          setReferralRewardToast({
            kind: 'reward',
            message:
              "🎉 Referral Bonus! A new friend joined using your code. You've been rewarded +30 Days Free!",
            subtext: res.latestReferredStoreName
              ? `Unlocked via ${res.latestReferredStoreName} (+${res.totalBonusDays} bonus days added to your store license).`
              : `+${res.totalBonusDays} bonus days added to your store license.`,
          });
        })
        .catch(() => {});
    };

    // Only block UI for profile check when there is no cached profile and user is not the owner
    const cachedProfile = safeGetJSON<StoreSubscriptionProfile | null>('rofani_pos_store_profile', null);
    if (!isOwnerCloudUser(firebaseUser) && !cachedProfile) {
      setIsCheckingStoreProfile(true);
    }

    // Strict 3-second maximum timeout on startup profile check
    const profileTimeoutId = setTimeout(() => {
      if (!cancelled) setIsCheckingStoreProfile(false);
    }, 3000);

    if (isOwnerCloudUser(firebaseUser)) {
      ensureOwnerPrimaryStoreProfile(firebaseUser)
        .then((prof) => {
          applyStoreProfileToWorkspace(prof);
          if (!cancelled) setIsCheckingStoreProfile(false);
          runReferralReconciliation();
          // Automatic One-Time Data Bridge: checks stores/{userId} first and copies root/legacy data if empty
          migrateLegacyRootCollectionsToOwnerStoreIfNeeded(firebaseUser.uid)
            .then((migrated) => {
              if (!migrated || cancelled) return;
              Promise.all([
                fetchProductsFromCloud(firebaseUser.uid).catch(() => []),
                fetchTransactionsFromCloud(firebaseUser.uid).catch(() => []),
              ]).then(([migratedProducts, migratedSales]) => {
                if (cancelled) return;
                if (migratedProducts.length > 0) {
                  const { merged } = mergeRecordsWithConflictDetection<Product>({
                    recordType: 'product',
                    localRecords: productsRef.current,
                    incomingRecords: migratedProducts,
                    deletedIds: getDeletedProductIds(),
                    pendingMap: getPendingProductMap(),
                    resolvedFingerprints: resolvedConflictFingerprintsRef.current,
                    sourceLabel: 'Legacy Root Data Bridge',
                  });
                  productsRef.current = merged;
                  setProducts(merged);
                  safeSetJSON('retail_pos_products', merged);
                }
                if (migratedSales.length > 0) {
                  const { merged: mergedSales } = mergeRecordsWithConflictDetection<Transaction>({
                    recordType: 'transaction',
                    localRecords: transactionsRef.current,
                    incomingRecords: migratedSales,
                    pendingMap: getPendingRecordMap<Transaction>('sale'),
                    resolvedFingerprints: resolvedConflictFingerprintsRef.current,
                    sourceLabel: 'Legacy Root Sales Bridge',
                  });
                  mergedSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  transactionsRef.current = mergedSales;
                  setTransactions(mergedSales);
                  safeSetJSON('retail_pos_transactions', mergedSales);
                }
              });
            })
            .catch(() => false);
        })
        .catch(() => {
          if (!cancelled) setIsCheckingStoreProfile(false);
        });
    } else {
      fetchStoreProfile(nextCloudStoreId)
        .then((prof) => {
          if (prof && !prof.referralCode) {
            ensureReferralCodeForStore(prof)
              .then((ensured) => applyStoreProfileToWorkspace(ensured))
              .catch(() => applyStoreProfileToWorkspace(prof));
          } else {
            applyStoreProfileToWorkspace(prof);
          }
          if (!cancelled) setIsCheckingStoreProfile(false);
          if (prof) {
            runReferralReconciliation();
          }
        })
        .catch(() => {
          if (!cancelled) setIsCheckingStoreProfile(false);
        });
    }

    let unsubscribeRewards: (() => void) | undefined;
    try {
      unsubscribeProfile = subscribeToStoreProfile(
        nextCloudStoreId,
        (prof) => {
          applyStoreProfileToWorkspace(prof);
          if (!cancelled) setIsCheckingStoreProfile(false);
          if (prof && !prof.referralCode) {
            ensureReferralCodeForStore(prof)
              .then((ensured) => applyStoreProfileToWorkspace(ensured))
              .catch(() => {});
          }
        },
        () => {
          if (!cancelled) setIsCheckingStoreProfile(false);
        }
      );
      unsubscribeRewards = subscribeToReferralRewards(nextCloudStoreId, () => {
        if (!cancelled) runReferralReconciliation();
      });
    } catch {
      if (!cancelled) setIsCheckingStoreProfile(false);
    }

    return () => {
      cancelled = true;
      clearTimeout(profileTimeoutId);
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeRewards) unsubscribeRewards();
    };
  }, [isClientDemoMode, isFirebaseAuthReady, hasAuthSettledFromFirebase, firebaseUser?.uid, allowOfflineOwnerMode]);

  // Hydrate Store Security (PIN / Password / Biometric Unlock) from Firestore
  useEffect(() => {
    const activeUid = effectiveCloudStoreId || firebaseUser?.uid;
    if (!isCloudAuthReady || !activeUid) return;
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToStoreSecurity(
        (cfg) => {
          if (!cfg) return;
          if (typeof cfg.requirePinOnStartup === 'boolean') {
            setRequirePinOnStartup(cfg.requirePinOnStartup);
            safeSetJSON('retail_pos_require_pin_startup', cfg.requirePinOnStartup);
          }
          if (typeof cfg.biometricUnlockEnabled === 'boolean') {
            setBiometricUnlockEnabled(cfg.biometricUnlockEnabled);
            safeSetJSON('retail_pos_biometric_unlock', cfg.biometricUnlockEnabled);
          }
          if (cfg.masterPin && cfg.masterPin.trim().length >= 4) {
            setMasterPin(cfg.masterPin.trim());
            safeSetJSON('retail_pos_master_pin', cfg.masterPin.trim());
            safeSetJSON('rofani_app_pin', cfg.masterPin.trim());
          }
        },
        (err) => console.warn('Store security subscription notice:', err),
        activeUid
      );
    } catch (err) {
      console.warn('Could not subscribe to store security:', err);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isCloudAuthReady, firebaseUser?.uid, effectiveCloudStoreId]);

  // Hydrate Multi-Branch Business Group branches whenever primary store or multi-branch status updates
  useEffect(() => {
    const primaryId = primaryCloudStoreId || firebaseUser?.uid;
    if (!primaryId) return;
    let cancelled = false;

    const cached = getCachedGroupBranches(primaryId);
    if (cached.length > 0) {
      setGroupBranches(cached);
    } else if (storeProfile) {
      setGroupBranches([storeProfile]);
    }

    if (isCloudAuthReady && (storeProfile?.isMultiBranch || cached.length > 1)) {
      fetchBusinessGroupBranches(firebaseUser?.uid || primaryId, primaryId, storeProfile)
        .then((branches) => {
          if (!cancelled && branches.length > 0) {
            setGroupBranches(branches);
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [
    isCloudAuthReady,
    firebaseUser?.uid,
    primaryCloudStoreId,
    storeProfile?.id,
    storeProfile?.isMultiBranch,
    storeProfile?.businessGroupName,
  ]);

  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error' | 'quota_exceeded'>('offline');
  // Strict 3-second maximum cap on any active cloud sync indicator
  useEffect(() => {
    if (cloudSyncStatus !== 'syncing') return;
    const syncSpinnerTimeout = setTimeout(() => {
      setCloudSyncStatus((prev) =>
        prev === 'syncing'
          ? typeof navigator !== 'undefined' && !navigator.onLine
            ? 'offline'
            : 'synced'
          : prev
      );
    }, 3000);
    return () => clearTimeout(syncSpinnerTimeout);
  }, [cloudSyncStatus]);
  const [isCloudQuotaExceeded, setIsCloudQuotaExceeded] = useState<boolean>(false);
  const [showQuotaBanner, setShowQuotaBanner] = useState<boolean>(true);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [syncConflicts, setSyncConflicts] = useState<SyncConflict[]>([]);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState<boolean>(false);
  const resolvedConflictFingerprintsRef = useRef<Set<string>>(new Set());

  const enqueueSyncConflicts = (incoming: SyncConflict[], autoOpen: boolean = true) => {
    if (!incoming || incoming.length === 0) return;
    const filtered = incoming.filter((c) => !resolvedConflictFingerprintsRef.current.has(c.fingerprint));
    if (filtered.length === 0) return;

    let addedAny = false;
    setSyncConflicts((prev) => {
      const next = [...prev];
      filtered.forEach((conflict) => {
        if (!next.some((existing) => existing.fingerprint === conflict.fingerprint || existing.id === conflict.id)) {
          next.push(conflict);
          addedAny = true;
        }
      });
      return addedAny ? next : prev;
    });

    if (autoOpen) {
      setIsConflictModalOpen(true);
    }
  };

  // Daily Automatic Email Backup Modal & Status Banner
  const [showDailyEmailBackupModal, setShowDailyEmailBackupModal] = useState<boolean>(false);
  const [backupBanner, setBackupBanner] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [lowStockPushAlerts, setLowStockPushAlerts] = useState<LowStockPushAlert[]>([]);
  const [showCategoryManagerModal, setShowCategoryManagerModal] = useState<boolean>(false);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState<boolean>(() => isSoundEnabled());

  useEffect(() => {
    return subscribeToSoundPref((enabled) => {
      setSoundEffectsEnabled(enabled);
    });
  }, []);

  const handleToggleSoundEffects = () => {
    const next = !soundEffectsEnabled;
    setSoundEnabled(next);
    setSoundEffectsEnabled(next);
    if (next) {
      playButtonSound('backup');
    }
  };

  const hasHydratedProductsFromIdbRef = useRef(false);
  const userMutatedProductsRef = useRef(false);

  // Application Persistent Collections State with safe lazy initialization & tenant isolation
  const [products, setProductsState] = useState<Product[]>(() => {
    try {
      const deletedIds = getDeletedProductIds();
      const pendingMap = getPendingProductMap();
      const isOwnerScope = getActiveTenantStoreId() === OWNER_PRIMARY_STORE_ID;
      const isBlankMode = safeGetJSON<boolean>('rofani_pos_blank_mode', false);
      const fallback = isOwnerScope && !isBlankMode ? INITIAL_PRODUCTS : [];
      const saved = localStorage.getItem(resolveTenantStorageKey('retail_pos_products'));
      const parsed = saved ? JSON.parse(saved) : fallback;
      const baseList = Array.isArray(parsed) ? parsed : fallback;
      return mergeProductListsByTimestamp(baseList, [], deletedIds, pendingMap);
    } catch {
      const isBlankMode = safeGetJSON<boolean>('rofani_pos_blank_mode', false);
      return getActiveTenantStoreId() === OWNER_PRIMARY_STORE_ID && !isBlankMode ? INITIAL_PRODUCTS : [];
    }
  });

  const setProducts = (newVal: Product[] | ((prev: Product[]) => Product[])) => {
    userMutatedProductsRef.current = true;
    setProductsState((prev) => {
      const next = typeof newVal === 'function' ? newVal(prev) : newVal;
      productsRef.current = next;
      safeSetJSON('retail_pos_products', next);
      return next;
    });
  };

  // Proactive IndexedDB Hydration on Startup and Resume from Sleep Mode
  // Merges by item ID and newest `updatedAt` timestamp so neither newly added items nor recent edits are ever lost
  useEffect(() => {
    let isMounted = true;
    let lastWakeCheckAt = 0;

    const restoreAndMergeFromIDB = async (force = false) => {
      const now = Date.now();
      if (!force && now - lastWakeCheckAt < 2500) return;
      lastWakeCheckAt = now;

      const activeScope = getActiveTenantStoreId();
      if (!activeScope || activeScope === '__unauthenticated__') {
        hasHydratedProductsFromIdbRef.current = true;
        return;
      }
      try {
        const scopedIdbKey = resolveTenantStorageKey('retail_pos_products', activeScope);
        const idbProducts = await getFromIDB(scopedIdbKey);
        if (isMounted && Array.isArray(idbProducts) && idbProducts.length > 0 && getActiveTenantStoreId() === activeScope) {
          const deletedIds = getDeletedProductIds();
          const pendingMap = getPendingProductMap();
          setProductsState((current) => {
            const merged = mergeProductListsByTimestamp(current, idbProducts, deletedIds, pendingMap);
            if (haveProductListsChanged(current, merged)) {
              productsRef.current = merged;
              safeSetJSON('retail_pos_products', merged);
              return merged;
            }
            return current;
          });
        }
      } catch (err) {
        console.warn('[Sleep Mode Recovery] IDB hydration notice:', err);
      } finally {
        hasHydratedProductsFromIdbRef.current = true;
      }
    };

    restoreAndMergeFromIDB(true);

    // Chrome Sleep & Resume event listeners (Page Lifecycle API, visibilitychange, focus)
    const handleWakeFromSleep = () => {
      if (document.visibilityState === 'visible') {
        restoreAndMergeFromIDB(false);
      }
    };

    document.addEventListener('visibilitychange', handleWakeFromSleep);
    window.addEventListener('focus', handleWakeFromSleep);
    document.addEventListener('resume', handleWakeFromSleep);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleWakeFromSleep);
      window.removeEventListener('focus', handleWakeFromSleep);
      document.removeEventListener('resume', handleWakeFromSleep);
    };
  }, []);

  // Automatically restore and hydrate high-resolution product photos from persistent IndexedDB
  useEffect(() => {
    let isMounted = true;
    getAllProductImagesFromIndexedDB()
      .then((imageMap) => {
        if (!isMounted || !imageMap || Object.keys(imageMap).length === 0) return;

        setProductsState((currentProducts) => {
          let hasNewImages = false;
          const merged = currentProducts.map((p) => {
            const storedImage = imageMap[p.id];
            if (storedImage && (!p.imageUrl || p.imageUrl.trim() === '')) {
              hasNewImages = true;
              return { ...p, imageUrl: storedImage };
            }
            return p;
          });
          if (hasNewImages) {
            productsRef.current = merged;
            return merged;
          }
          return currentProducts;
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

  // Auto-sync products' categories & subcategories into master categories state (skips user-deleted ones)
  useEffect(() => {
    if (!products || products.length === 0) return;
    const deletedCats: string[] = safeGetJSON('retail_pos_deleted_categories', []);
    const deletedSubs: string[] = safeGetJSON('retail_pos_deleted_subcategories', []);

    setCategories((prevCategories: any[]) => {
      let updated = [...(prevCategories || [])];
      let hasChanges = false;

      products.forEach((p) => {
        const catName = p.category ? p.category.trim() : '';
        const subName = p.subcategory ? p.subcategory.trim() : '';
        if (!catName) return;
        if (deletedCats.includes(catName.toLowerCase())) return;

        const catIndex = updated.findIndex(
          (c) => c.name.toLowerCase() === catName.toLowerCase()
        );

        if (catIndex === -1) {
          const subKey = `${catName.toLowerCase()}:::${subName.toLowerCase()}`;
          const isSubDeleted = subName ? deletedSubs.includes(subKey) : false;
          updated.push({
            id: `cat-auto-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: catName,
            subcategories: subName && !isSubDeleted ? [subName] : ['General'],
          });
          hasChanges = true;
        } else {
          if (subName && subName !== 'General') {
            const subKey = `${catName.toLowerCase()}:::${subName.toLowerCase()}`;
            if (deletedSubs.includes(subKey)) return;

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

  // Category & Subcategory Management Handlers
  const handleAddCategory = (name: string, initialSubs: string[] = ['General']) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Unmark from deleted categories if re-added
    const deletedCats: string[] = safeGetJSON('retail_pos_deleted_categories', []);
    if (deletedCats.includes(trimmed.toLowerCase())) {
      safeSetJSON(
        'retail_pos_deleted_categories',
        deletedCats.filter((c) => c !== trimmed.toLowerCase())
      );
    }

    setCategories((prev: any[]) => {
      const exists = prev.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
      if (exists) return prev;
      const newCat = {
        id: `cat-${Date.now()}`,
        name: trimmed,
        subcategories: initialSubs && initialSubs.length > 0 ? initialSubs : ['General'],
      };
      const updated = [...prev, newCat];
      safeSetJSON('retail_pos_categories_v2', updated);
      return updated;
    });
  };

  const handleEditCategory = (oldName: string, newName: string) => {
    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();
    if (!trimmedNew || trimmedOld.toLowerCase() === trimmedNew.toLowerCase()) return;

    // Update categories state
    setCategories((prev: any[]) => {
      const updated = prev.map((c) => {
        if (c.name.toLowerCase() === trimmedOld.toLowerCase()) {
          return { ...c, name: trimmedNew };
        }
        return c;
      });
      safeSetJSON('retail_pos_categories_v2', updated);
      return updated;
    });

    // Cascade rename to all products
    const affected: Product[] = [];
    setProducts((prev) => {
      const updated = prev.map((p) => {
        if (p.category && p.category.trim().toLowerCase() === trimmedOld.toLowerCase()) {
          const nextProd = { ...p, category: trimmedNew, updatedAt: new Date().toISOString() };
          affected.push(nextProd);
          return nextProd;
        }
        return p;
      });
      safeSetJSON('retail_pos_products', updated);
      return updated;
    });
    if (affected.length > 0) {
      if (canAutoSyncCloud()) {
        batchSaveProductsToCloud(affected).catch(() => {});
      } else {
        affected.forEach((p) =>
          addPendingSyncItem({
            type: 'product',
            description: `Category Rename: ${p.name}`,
            data: p,
          })
        );
      }
    }
  };

  const handleDeleteCategory = (categoryName: string, reassignToCategory: string = 'General') => {
    const targetName = categoryName.trim().toLowerCase();
    const reassignName = reassignToCategory.trim() || 'General';

    // Track as deleted so auto-sync never resurrects it, and ensure reassign target isn't blocked
    const deletedCats: string[] = safeGetJSON('retail_pos_deleted_categories', []);
    const nextDeleted = deletedCats.filter((c) => c !== reassignName.toLowerCase());
    if (!nextDeleted.includes(targetName)) {
      nextDeleted.push(targetName);
    }
    safeSetJSON('retail_pos_deleted_categories', nextDeleted);

    // Remove from categories state
    setCategories((prev: any[]) => {
      const updated = prev.filter((c) => c.name.trim().toLowerCase() !== targetName);
      safeSetJSON('retail_pos_categories_v2', updated);
      return updated;
    });

    // Reassign all products belonging to this category
    const affected: Product[] = [];
    setProducts((prev) => {
      const updated = prev.map((p) => {
        if (p.category && p.category.trim().toLowerCase() === targetName) {
          const nextProd = { ...p, category: reassignName, updatedAt: new Date().toISOString() };
          affected.push(nextProd);
          return nextProd;
        }
        return p;
      });
      safeSetJSON('retail_pos_products', updated);
      return updated;
    });
    if (affected.length > 0) {
      if (canAutoSyncCloud()) {
        batchSaveProductsToCloud(affected).catch(() => {});
      } else {
        affected.forEach((p) =>
          addPendingSyncItem({
            type: 'product',
            description: `Category Reassign: ${p.name}`,
            data: p,
          })
        );
      }
    }
  };

  const handleAddSubcategory = (categoryName: string, subName: string) => {
    const trimmedCat = categoryName.trim();
    const trimmedSub = subName.trim();
    if (!trimmedSub) return;

    const subKey = `${trimmedCat.toLowerCase()}:::${trimmedSub.toLowerCase()}`;
    const deletedSubs: string[] = safeGetJSON('retail_pos_deleted_subcategories', []);
    if (deletedSubs.includes(subKey)) {
      safeSetJSON(
        'retail_pos_deleted_subcategories',
        deletedSubs.filter((k) => k !== subKey)
      );
    }

    setCategories((prev: any[]) => {
      const updated = prev.map((c) => {
        if (c.name.toLowerCase() === trimmedCat.toLowerCase()) {
          const subs = c.subcategories || ['General'];
          if (subs.some((s: string) => s.toLowerCase() === trimmedSub.toLowerCase())) {
            return c;
          }
          return { ...c, subcategories: [...subs, trimmedSub] };
        }
        return c;
      });
      safeSetJSON('retail_pos_categories_v2', updated);
      return updated;
    });
  };

  const handleEditSubcategory = (categoryName: string, oldSubName: string, newSubName: string) => {
    const trimmedCat = categoryName.trim();
    const trimmedOld = oldSubName.trim();
    const trimmedNew = newSubName.trim();
    if (!trimmedNew || trimmedOld.toLowerCase() === trimmedNew.toLowerCase()) return;

    setCategories((prev: any[]) => {
      const updated = prev.map((c) => {
        if (c.name.toLowerCase() === trimmedCat.toLowerCase()) {
          const subs = (c.subcategories || []).map((s: string) =>
            s.toLowerCase() === trimmedOld.toLowerCase() ? trimmedNew : s
          );
          return { ...c, subcategories: subs };
        }
        return c;
      });
      safeSetJSON('retail_pos_categories_v2', updated);
      return updated;
    });

    // Cascade rename to all products
    const affected: Product[] = [];
    setProducts((prev) => {
      const updated = prev.map((p) => {
        if (
          p.category &&
          p.category.trim().toLowerCase() === trimmedCat.toLowerCase() &&
          p.subcategory &&
          p.subcategory.trim().toLowerCase() === trimmedOld.toLowerCase()
        ) {
          const nextProd = { ...p, subcategory: trimmedNew, updatedAt: new Date().toISOString() };
          affected.push(nextProd);
          return nextProd;
        }
        return p;
      });
      safeSetJSON('retail_pos_products', updated);
      return updated;
    });
    if (affected.length > 0) {
      if (canAutoSyncCloud()) {
        batchSaveProductsToCloud(affected).catch(() => {});
      } else {
        affected.forEach((p) =>
          addPendingSyncItem({
            type: 'product',
            description: `Subcategory Rename: ${p.name}`,
            data: p,
          })
        );
      }
    }
  };

  const handleDeleteSubcategory = (
    categoryName: string,
    subName: string,
    reassignToSub: string = 'General'
  ) => {
    const trimmedCat = categoryName.trim();
    const trimmedSub = subName.trim();
    const subKey = `${trimmedCat.toLowerCase()}:::${trimmedSub.toLowerCase()}`;

    // Mark as deleted so auto-sync never resurrects it
    const deletedSubs: string[] = safeGetJSON('retail_pos_deleted_subcategories', []);
    if (!deletedSubs.includes(subKey)) {
      safeSetJSON('retail_pos_deleted_subcategories', [...deletedSubs, subKey]);
    }

    setCategories((prev: any[]) => {
      const updated = prev.map((c) => {
        if (c.name.toLowerCase() === trimmedCat.toLowerCase()) {
          const subs = (c.subcategories || []).filter(
            (s: string) => s.toLowerCase() !== trimmedSub.toLowerCase()
          );
          return { ...c, subcategories: subs.length > 0 ? subs : ['General'] };
        }
        return c;
      });
      safeSetJSON('retail_pos_categories_v2', updated);
      return updated;
    });

    // Reassign products with this subcategory
    const affected: Product[] = [];
    setProducts((prev) => {
      const updated = prev.map((p) => {
        if (
          p.category &&
          p.category.trim().toLowerCase() === trimmedCat.toLowerCase() &&
          p.subcategory &&
          p.subcategory.trim().toLowerCase() === trimmedSub.toLowerCase()
        ) {
          const nextProd = { ...p, subcategory: reassignToSub, updatedAt: new Date().toISOString() };
          affected.push(nextProd);
          return nextProd;
        }
        return p;
      });
      safeSetJSON('retail_pos_products', updated);
      return updated;
    });
    if (affected.length > 0) {
      if (canAutoSyncCloud()) {
        batchSaveProductsToCloud(affected).catch(() => {});
      } else {
        affected.forEach((p) =>
          addPendingSyncItem({
            type: 'product',
            description: `Subcategory Reassign: ${p.name}`,
            data: p,
          })
        );
      }
    }
  };

  const [customers, setCustomers] = useState<Customer[]>(() =>
    safeGetJSON('retail_pos_customers', getActiveTenantStoreId() === OWNER_PRIMARY_STORE_ID ? INITIAL_CUSTOMERS : [])
  );

  const [customerDeposits, setCustomerDeposits] = useState<CustomerDepositRecord[]>(() =>
    safeGetJSON<CustomerDepositRecord[]>('retail_pos_customer_deposits', [])
  );
  const [customerComplaints, setCustomerComplaints] = useState<CustomerComplaint[]>(() =>
    safeGetJSON<CustomerComplaint[]>('retail_pos_customer_complaints', [])
  );
  const [customerReturns, setCustomerReturns] = useState<CustomerReturnRecord[]>(() =>
    safeGetJSON<CustomerReturnRecord[]>('retail_pos_customer_returns', [])
  );

  const [suppliers, setSuppliers] = useState<Supplier[]>(() =>
    safeGetJSON('retail_pos_suppliers', getActiveTenantStoreId() === OWNER_PRIMARY_STORE_ID ? INITIAL_SUPPLIERS : [])
  );

  const [expenses, setExpensesState] = useState<Expense[]>(() => {
    const fallback = getActiveTenantStoreId() === OWNER_PRIMARY_STORE_ID ? INITIAL_EXPENSES : [];
    try {
      const saved = localStorage.getItem(resolveTenantStorageKey('retail_pos_expenses'));
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  });

  const setExpenses = (newVal: Expense[] | ((prev: Expense[]) => Expense[])) => {
    setExpensesState((prev) => {
      const next = typeof newVal === 'function' ? newVal(prev) : newVal;
      safeSetJSON('retail_pos_expenses', next);
      return next;
    });
  };

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() =>
    safeGetJSON('retail_pos_attendance', getActiveTenantStoreId() === OWNER_PRIMARY_STORE_ID ? INITIAL_ATTENDANCE : [])
  );

  const [transactions, setTransactionsState] = useState<Transaction[]>(() => {
    const fallback = getActiveTenantStoreId() === OWNER_PRIMARY_STORE_ID ? INITIAL_TRANSACTIONS : [];
    try {
      const primary = localStorage.getItem(resolveTenantStorageKey('retail_pos_transactions'));
      const secondary = localStorage.getItem(resolveTenantStorageKey('pos_store_sales'));
      const primaryParsed = primary ? JSON.parse(primary) : [];
      const secondaryParsed = secondary ? JSON.parse(secondary) : [];
      const combined = [...primaryParsed];
      secondaryParsed.forEach((t: any) => {
        if (!combined.some((item) => item.id === t.id)) {
          combined.push(t);
        }
      });
      if (combined.length === 0) {
        return fallback;
      }
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return checkAndRunRollingSalesArchive(combined);
    } catch {
      return fallback;
    }
  });

  const setTransactions = (newVal: Transaction[] | ((prev: Transaction[]) => Transaction[])) => {
    setTransactionsState((prev) => {
      const next = typeof newVal === 'function' ? newVal(prev) : newVal;
      const archivedChecked = checkAndRunRollingSalesArchive(next);
      transactionsRef.current = archivedChecked;
      safeSetJSON('retail_pos_transactions', archivedChecked);
      safeSetJSON('pos_store_sales', archivedChecked);
      return archivedChecked;
    });
  };

  const productsRef = useRef<Product[]>(products);
  productsRef.current = products;
  const transactionsRef = useRef<Transaction[]>(transactions);
  transactionsRef.current = transactions;
  const customersRef = useRef<Customer[]>(customers);
  customersRef.current = customers;
  const suppliersRef = useRef<Supplier[]>(suppliers);
  suppliersRef.current = suppliers;
  const expensesRef = useRef<Expense[]>(expenses);
  expensesRef.current = expenses;
  const allUsersRef = useRef<User[]>(allUsers);
  allUsersRef.current = allUsers;

  // Post-Sleep / Focus Rehydration Effect (strictly scoped by active tenant store, throttled & diff-checked)
  useEffect(() => {
    let lastFocusRehydrateAt = 0;
    const handleFocusAndVisibility = () => {
      const now = Date.now();
      if (now - lastFocusRehydrateAt < 2500) return;
      lastFocusRehydrateAt = now;

      const activeScope = getActiveTenantStoreId();
      if (!activeScope || activeScope === '__unauthenticated__') return;
      if (document.visibilityState === 'visible') {
        try {
          const freshSales =
            localStorage.getItem(resolveTenantStorageKey('retail_pos_transactions', activeScope)) ||
            localStorage.getItem(resolveTenantStorageKey('pos_store_sales', activeScope));
          if (freshSales) {
            const parsed = JSON.parse(freshSales);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setTransactionsState((current) => {
                if (parsed.length > current.length) return parsed;
                const existingIds = new Set(current.map((t) => t.id));
                const missing = parsed.filter((t: Transaction) => t && t.id && !existingIds.has(t.id));
                return missing.length > 0 ? [...missing, ...current] : current;
              });
            }
          }

          const freshProducts = localStorage.getItem(resolveTenantStorageKey('retail_pos_products', activeScope));
          if (freshProducts) {
            const parsed = JSON.parse(freshProducts);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const deletedIds = getDeletedProductIds();
              const pendingMap = getPendingProductMap();
              setProductsState((current) => {
                const merged = mergeProductListsByTimestamp(current, parsed, deletedIds, pendingMap);
                return haveProductListsChanged(current, merged) ? merged : current;
              });
            }
          }

          const freshUsers =
            localStorage.getItem(resolveTenantStorageKey('retail_pos_users', activeScope)) ||
            localStorage.getItem(resolveTenantStorageKey('pos_store_staff_users', activeScope));
          if (freshUsers) {
            const parsed = JSON.parse(freshUsers);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setAllUsersState((current) => (parsed.length > current.length ? parsed : current));
            }
          }

          const freshExpenses = localStorage.getItem(resolveTenantStorageKey('retail_pos_expenses', activeScope));
          if (freshExpenses) {
            const parsed = JSON.parse(freshExpenses);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setExpensesState((current) => (parsed.length > current.length ? parsed : current));
            }
          }

          const freshPurchases = localStorage.getItem(resolveTenantStorageKey('retail_pos_purchase_orders', activeScope));
          if (freshPurchases) {
            const parsed = JSON.parse(freshPurchases);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setPurchaseOrdersState((current) => (parsed.length > current.length ? parsed : current));
            }
          }
        } catch (e) {
          console.error('Storage quota or error on focus/wake:', e);
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

  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(() =>
    safeGetJSON('retail_pos_cash_transactions', getActiveTenantStoreId() === OWNER_PRIMARY_STORE_ID ? INITIAL_CASH_TRANSACTIONS : [])
  );

  const [restockRecords, setRestockRecords] = useState<RestockRecord[]>(() =>
    safeGetJSON('retail_pos_restock_records', getActiveTenantStoreId() === OWNER_PRIMARY_STORE_ID ? INITIAL_RESTOCK_RECORDS : [])
  );

  const [purchaseOrders, setPurchaseOrdersState] = useState<PurchaseOrder[]>(() => {
    const fallback = getActiveTenantStoreId() === OWNER_PRIMARY_STORE_ID ? INITIAL_PURCHASE_ORDERS : [];
    try {
      const saved = localStorage.getItem(resolveTenantStorageKey('retail_pos_purchase_orders'));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading purchases:', e);
    }
    return fallback;
  });

  const setPurchaseOrders = (newVal: PurchaseOrder[] | ((prev: PurchaseOrder[]) => PurchaseOrder[])) => {
    setPurchaseOrdersState((prev) => {
      const next = typeof newVal === 'function' ? newVal(prev) : newVal;
      safeSetJSON('retail_pos_purchase_orders', next);
      return next;
    });
  };

  const [commissionPayouts, setCommissionPayouts] = useState<StaffCommissionPayout[]>(() =>
    safeGetJSON('retail_pos_commission_payouts', getActiveTenantStoreId() === OWNER_PRIMARY_STORE_ID ? INITIAL_COMMISSION_PAYOUTS : [])
  );

  const [salaryPayouts, setSalaryPayouts] = useState<WorkerSalaryPayout[]>(() =>
    safeGetJSON<WorkerSalaryPayout[]>('retail_pos_salary_payouts', [])
  );

  const [workerLoans, setWorkerLoans] = useState<WorkerLoan[]>(() =>
    safeGetJSON('retail_pos_worker_loans', getActiveTenantStoreId() === OWNER_PRIMARY_STORE_ID ? INITIAL_WORKER_LOANS : [])
  );

  useEffect(() => {
    safeSetJSON('retail_pos_worker_loans', workerLoans);
  }, [workerLoans]);

  const [financingFacilities, setFinancingFacilities] = useState<FinancingFacility[]>(() =>
    safeGetJSON('retail_pos_financing_facilities', getActiveTenantStoreId() === OWNER_PRIMARY_STORE_ID ? INITIAL_FINANCING_FACILITIES : [])
  );

  useEffect(() => {
    safeSetJSON('retail_pos_financing_facilities', financingFacilities);
  }, [financingFacilities]);

  // Store Location scoped to active tenant
  const [stores, setStores] = useState<StoreLocation[]>(() => {
    const isOwnerScope = getActiveTenantStoreId() === OWNER_PRIMARY_STORE_ID;
    const saved = safeGetJSON<StoreLocation[] | null>('retail_pos_stores', null);
    if (!saved || !Array.isArray(saved) || saved.length === 0) {
      return isOwnerScope
        ? INITIAL_STORES
        : [{ id: 'store-main', name: 'My Store', code: 'MAIN-01', city: 'Nairobi', address: 'Main Branch', phone: '', isMainBranch: true, active: true }];
    }
    if (!isOwnerScope) {
      return saved;
    }
    const hasLegacyBranches = saved.some(
      (s) => s.id === 'store-westlands' || s.id === 'store-mombasa' || s.name.toLowerCase().includes('flagship')
    );
    if (hasLegacyBranches) {
      const main = saved.find((s) => s.id === 'store-main') || INITIAL_STORES[0];
      const singleStore: StoreLocation = {
        ...main,
        id: 'store-main',
        name: 'Rofani POS',
        isMainBranch: true,
        active: true
      };
      safeSetJSON('retail_pos_stores', [singleStore]);
      return [singleStore];
    }
    return saved.map((s) => {
      const lower = (s.name || '').trim().toLowerCase();
      if (
        lower.includes('flagship') ||
        s.name === 'Main Store' ||
        isLegacyRofaniStoreBrand(s.name)
      ) {
        return { ...s, name: 'Rofani POS' };
      }
      return s;
    });
  });

  const [activeStoreId, setActiveStoreId] = useState<string>(() => {
    try {
      const saved = safeGetJSON<string>('retail_pos_active_store_id', 'store-main');
      return saved && saved !== 'all' ? saved : 'store-main';
    } catch {
      return 'store-main';
    }
  });

  const displayedStoreName =
    (activeBranchStoreId && activeBranchProfile?.storeName) ||
    stores.find((s) => s.id === activeStoreId)?.name ||
    storeProfile?.storeName ||
    'Rofani POS';

  const [offers, setOffers] = useState<OfferDeal[]>(() =>
    safeGetJSON('retail_pos_offers', getActiveTenantStoreId() === OWNER_PRIMARY_STORE_ID ? INITIAL_OFFERS : [])
  );

  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>(() =>
    safeGetJSON('retail_pos_online_orders', getActiveTenantStoreId() === OWNER_PRIMARY_STORE_ID ? INITIAL_ONLINE_ORDERS : [])
  );

  const [stockTransfers, setStockTransfers] = useState<StockTransferRecord[]>(() =>
    safeGetJSON('retail_pos_stock_transfers', getActiveTenantStoreId() === OWNER_PRIMARY_STORE_ID ? INITIAL_STOCK_TRANSFERS : [])
  );

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

  // New Sale global trigger counter
  const [newSaleTrigger, setNewSaleTrigger] = useState(0);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isEditableKeyboardOpen, setIsEditableKeyboardOpen] = useState(false);
  const [mobileCartSummary, setMobileCartSummary] = useState<MobileCartSummary>({
    itemCount: 0,
    subtotal: 0,
    discountTotal: 0,
    grandTotal: 0,
    hasCartItems: false,
  });
  const [externalScanTrigger, setExternalScanTrigger] = useState(0);
  const [externalAiScanTrigger, setExternalAiScanTrigger] = useState(0);
  const [externalManualBarcodeRequest, setExternalManualBarcodeRequest] = useState<{
    code: string;
    nonce: number;
  } | null>(null);
  const [externalQuickDiscountRequest, setExternalQuickDiscountRequest] = useState<{
    mode: 'fixed' | 'percentage';
    value: number;
    nonce: number;
  } | null>(null);
  const [externalClearDiscountTrigger, setExternalClearDiscountTrigger] = useState(0);

  // Auto-hide mobile floating Quick Tools bar whenever phone soft keyboard is active
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isEditableTarget = (el: EventTarget | null): el is HTMLElement => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.closest('[data-quick-tools-container="true"]')) return false;
      if (el.tagName === 'TEXTAREA') return true;
      if (el.tagName === 'INPUT') {
        const type = (el as HTMLInputElement).type || 'text';
        return !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color'].includes(type);
      }
      return el.isContentEditable;
    };

    const handleFocusIn = (e: FocusEvent) => {
      if (isEditableTarget(e.target)) {
        setIsEditableKeyboardOpen(true);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const activeEl = document.activeElement;
        setIsEditableKeyboardOpen(isEditableTarget(activeEl));
      }, 60);
    };

    const baseViewportHeight = window.innerHeight;
    const handleViewportResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const activeEl = document.activeElement;
      if (activeEl instanceof HTMLElement && activeEl.closest('[data-quick-tools-container="true"]')) {
        return;
      }
      const heightDrop = baseViewportHeight - vv.height;
      if (heightDrop > 160 && isEditableTarget(activeEl)) {
        setIsEditableKeyboardOpen(true);
      } else if (heightDrop <= 100 && !isEditableTarget(activeEl)) {
        setIsEditableKeyboardOpen(false);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    window.visualViewport?.addEventListener('resize', handleViewportResize);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
    };
  }, []);

  const handleGlobalNewSale = () => {
    setActiveTab('pos');
    setIsMobileMenuOpen(false);
    setNewSaleTrigger((prev) => prev + 1);
  };

  const handleMobileMakeSaleBarClick = () => {
    if (activeTab !== 'pos') {
      setActiveTab('pos');
      setIsMobileMenuOpen(false);
    } else {
      handleGlobalNewSale();
    }
  };

  const handleMobileOpenBarcodeScanner = () => {
    setActiveTab('pos');
    setIsMobileMenuOpen(false);
    setExternalScanTrigger((prev) => prev + 1);
  };

  const handleMobileOpenAiScanner = () => {
    setActiveTab('pos');
    setIsMobileMenuOpen(false);
    setExternalAiScanTrigger((prev) => prev + 1);
  };

  const handleMobileManualBarcode = (code: string) => {
    setActiveTab('pos');
    setIsMobileMenuOpen(false);
    setExternalManualBarcodeRequest({ code, nonce: Date.now() });
  };

  const handleMobileApplyQuickDiscount = (payload: { mode: 'fixed' | 'percentage'; value: number }) => {
    setActiveTab('pos');
    setIsMobileMenuOpen(false);
    setExternalQuickDiscountRequest({ ...payload, nonce: Date.now() });
  };

  const handleMobileClearQuickDiscount = () => {
    setExternalClearDiscountTrigger((prev) => prev + 1);
  };

  const shouldHideMobileQuickTools =
    isMobileSearchActive ||
    isEditableKeyboardOpen ||
    (activeTab === 'pos' && isMobileCartOpen);

  // Close mobile drawer whenever active tab changes & reset POS search/cart sheet flags
  useEffect(() => {
    setIsMobileMenuOpen(false);
    if (activeTab !== 'pos') {
      setIsMobileSearchActive(false);
      setIsMobileCartOpen(false);
    }
  }, [activeTab]);

  // Selected product for Restock & Sales History audit modal
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

  // Store Manager Dedicated Item Audit Mini-Page state (from QR code scan or direct audit trigger)
  const [auditUrlProduct, setAuditUrlProduct] = useState<Product | null>(null);

  // Listen for ?itemAudit=<productId> in URL (e.g., when scanned by the store manager)
  useEffect(() => {
    const handleUrlAudit = () => {
      try {
        if (typeof window === 'undefined' || !window.location.search.includes('itemAudit=')) return;
        const searchParams = new URLSearchParams(window.location.search);
        const auditId = searchParams.get('itemAudit');
        const list = productsRef.current;
        if (auditId && list.length > 0) {
          const match = list.find(
            (p) =>
              p.id === auditId ||
              (p.sku || '').toLowerCase() === auditId.toLowerCase() ||
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
  }, [products.length]);

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

  const cashTransactionsRef = useRef<CashTransaction[]>(cashTransactions);
  cashTransactionsRef.current = cashTransactions;
  const storesRef = useRef<StoreLocation[]>(stores);
  storesRef.current = stores;
  const activeStoreIdRef = useRef<string>(activeStoreId);
  activeStoreIdRef.current = activeStoreId;
  const activeTabRef = useRef<AppTab>(activeTab);
  activeTabRef.current = activeTab;
  const storeProfileRef = useRef<StoreSubscriptionProfile | null>(storeProfile);
  storeProfileRef.current = storeProfile;
  const securitySettingsRef = useRef({ requirePinOnStartup, masterPin, ownerRecoveryEmail });
  securitySettingsRef.current = { requirePinOnStartup, masterPin, ownerRecoveryEmail };

  // Save changes to LocalStorage & IndexedDB only after initial IDB hydration or user mutation
  useEffect(() => {
    if (!hasHydratedProductsFromIdbRef.current && !userMutatedProductsRef.current) {
      return;
    }
    safeSetJSON('retail_pos_products', products);
  }, [products]);

  useEffect(() => {
    safeSetJSON('retail_pos_commission_payouts', commissionPayouts);
  }, [commissionPayouts]);

  useEffect(() => {
    safeSetJSON('retail_pos_salary_payouts', salaryPayouts);
  }, [salaryPayouts]);

  useEffect(() => {
    safeSetJSON('retail_pos_restock_records', restockRecords);
  }, [restockRecords]);

  useEffect(() => {
    safeSetJSON('retail_pos_customers', customers);
  }, [customers]);

  useEffect(() => {
    safeSetJSON('retail_pos_customer_deposits', customerDeposits);
  }, [customerDeposits]);

  useEffect(() => {
    safeSetJSON('retail_pos_customer_complaints', customerComplaints);
  }, [customerComplaints]);

  useEffect(() => {
    safeSetJSON('retail_pos_customer_returns', customerReturns);
  }, [customerReturns]);

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

  // Automatic Background Backup & Event-Driven Snapshots (reads refs so listeners never tear down on every sale/edit)
  useEffect(() => {
    let lastWakeSyncAt = 0;

    const handleBackupSnapshot = () => {
      try {
        const currentProducts = productsRef.current;
        const currentSales = transactionsRef.current;
        const currentCustomers = customersRef.current;
        const currentSuppliers = suppliersRef.current;
        const currentExpenses = expensesRef.current;
        const currentUsers = allUsersRef.current;
        const sec = securitySettingsRef.current;

        const backupPayload = {
          timestamp: Date.now(),
          sales: currentSales,
          staff: currentUsers,
          products: currentProducts,
          expenses: currentExpenses,
          settings: {
            activeStoreId: activeStoreIdRef.current,
            requirePinOnStartup: sec.requirePinOnStartup,
            masterPin: sec.masterPin,
            ownerRecoveryEmail: sec.ownerRecoveryEmail,
          }
        };
        protectLargestBackup(currentProducts, currentSales, currentCustomers, currentSuppliers, currentExpenses, currentUsers);
        try {
          saveToIDB(resolveTenantStorageKey('rofani_pos_auto_backup'), backupPayload);
          saveToIDB(resolveTenantStorageKey('rofani_pos_last_snapshot'), backupPayload);
        } catch {}
      } catch (err) {
        console.warn('Could not save auto-backup snapshot:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        try {
          safeSetJSON('retail_pos_active_tab', activeTabRef.current);
          safeSetJSON('retail_pos_products', productsRef.current);
          safeSetJSON('retail_pos_transactions', transactionsRef.current);
          safeSetJSON('retail_pos_customers', customersRef.current);
          safeSetJSON('retail_pos_suppliers', suppliersRef.current);
          safeSetJSON('retail_pos_expenses', expensesRef.current);
          safeSetJSON('retail_pos_users', allUsersRef.current);
        } catch {}
        handleBackupSnapshot();
      } else if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastWakeSyncAt < 3000) return;
        lastWakeSyncAt = now;
        refreshFirestoreConnection()
          .then((ok) => {
            if (ok && getIsOnline() && isAuthorizedCloudUser(auth.currentUser) && getPendingSyncCount() > 0) {
              syncPendingQueueToCloudRef.current().catch(() => {});
            }
          })
          .catch(() => {});
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
  }, []);

  // Real-time synchronization subscription for transactions with conflict detection
  useEffect(() => {
    const activeUid = effectiveCloudStoreId || firebaseUser?.uid;
    if (!isCloudAuthReady || !activeUid) return;
    let cancelled = false;
    let receivedSnapshot = false;
    let unsubscribe: (() => void) | undefined;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    try {
      unsubscribe = subscribeToTransactions(
        (incomingRemoteSales) => {
          receivedSnapshot = true;
          if (cancelled) return;
          if (incomingRemoteSales && incomingRemoteSales.length > 0) {
            const currentLocal = transactionsRef.current.length > 0
              ? transactionsRef.current
              : safeGetJSON<Transaction[]>('retail_pos_transactions', []);
            const { merged, conflicts } = mergeRecordsWithConflictDetection<Transaction>({
              recordType: 'transaction',
              localRecords: currentLocal,
              incomingRecords: incomingRemoteSales,
              pendingMap: getPendingRecordMap<Transaction>('sale'),
              resolvedFingerprints: resolvedConflictFingerprintsRef.current,
              sourceLabel: 'Cloud Firestore Live Sales Sync',
            });
            merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            if (haveTransactionListsChanged(transactionsRef.current, merged)) {
              transactionsRef.current = merged;
              setTransactions(merged);
            }
            if (conflicts.length > 0) {
              enqueueSyncConflicts(conflicts, true);
            }
          }
        },
        (err) => {
          console.warn('Transactions subscription notice:', err);
        },
        activeUid
      );

      // Delayed REST/getDocs fallback only if onSnapshot has not delivered within 2.5s
      fallbackTimer = setTimeout(() => {
        if (cancelled || receivedSnapshot) return;
        fetchTransactionsFromCloud(activeUid).then((sales) => {
          if (cancelled || !sales || sales.length === 0) return;
          const currentLocal = transactionsRef.current.length > 0
            ? transactionsRef.current
            : safeGetJSON<Transaction[]>('retail_pos_transactions', []);
          const { merged, conflicts } = mergeRecordsWithConflictDetection<Transaction>({
            recordType: 'transaction',
            localRecords: currentLocal,
            incomingRecords: sales,
            pendingMap: getPendingRecordMap<Transaction>('sale'),
            resolvedFingerprints: resolvedConflictFingerprintsRef.current,
            sourceLabel: 'Cloud Firestore Startup Sales Sync',
          });
          merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          if (haveTransactionListsChanged(transactionsRef.current, merged)) {
            transactionsRef.current = merged;
            setTransactions(merged);
          }
          if (conflicts.length > 0) {
            enqueueSyncConflicts(conflicts, true);
          }
        }).catch((e) => console.warn('Startup transactions fetch notice:', e));
      }, 2500);
    } catch (err) {
      console.warn('Could not subscribe to transactions:', err);
    }
    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (unsubscribe) unsubscribe();
    };
  }, [isCloudAuthReady, firebaseUser?.uid, effectiveCloudStoreId]);

  // Real-time synchronization subscription for products with ID-based local preservation & exact-ms conflict detection
  useEffect(() => {
    const activeUid = effectiveCloudStoreId || firebaseUser?.uid;
    if (!isCloudAuthReady || !activeUid) return;
    let cancelled = false;
    let receivedSnapshot = false;
    let unsubscribe: (() => void) | undefined;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    try {
      unsubscribe = subscribeToProducts(
        (incomingRemoteProducts) => {
          receivedSnapshot = true;
          if (cancelled) return;
          if (incomingRemoteProducts && incomingRemoteProducts.length > 0) {
            const deletedIds = getDeletedProductIds();
            const pendingMap = getPendingProductMap();
            const { merged, conflicts } = mergeRecordsWithConflictDetection<Product>({
              recordType: 'product',
              localRecords: productsRef.current,
              incomingRecords: incomingRemoteProducts,
              deletedIds,
              pendingMap,
              resolvedFingerprints: resolvedConflictFingerprintsRef.current,
              sourceLabel: 'Cloud Firestore Live Catalog Sync',
            });
            if (haveProductListsChanged(productsRef.current, merged)) {
              productsRef.current = merged;
              setProducts(merged);
            }
            if (conflicts.length > 0) {
              enqueueSyncConflicts(conflicts, true);
            }
          }
          setCloudSyncStatus('synced');
          setLastSyncedTime(new Date().toLocaleTimeString());
        },
        (err) => {
          if (isQuotaExceededError(err)) {
            setIsCloudQuotaExceeded(true);
            setCloudSyncStatus('quota_exceeded');
          } else {
            console.warn('Products Firestore subscription notice:', err);
          }
        },
        activeUid
      );

      // Delayed REST/getDocs fallback only if onSnapshot has not delivered within 2.5s
      fallbackTimer = setTimeout(() => {
        if (cancelled || receivedSnapshot) return;
        fetchProductsFromCloud(activeUid).then((cloudItems) => {
          if (cancelled || !cloudItems || cloudItems.length === 0) return;
          const deletedIds = getDeletedProductIds();
          const pendingMap = getPendingProductMap();
          const { merged, conflicts } = mergeRecordsWithConflictDetection<Product>({
            recordType: 'product',
            localRecords: productsRef.current,
            incomingRecords: cloudItems,
            deletedIds,
            pendingMap,
            resolvedFingerprints: resolvedConflictFingerprintsRef.current,
            sourceLabel: 'Cloud Firestore Startup Catalog Sync',
          });
          if (haveProductListsChanged(productsRef.current, merged)) {
            productsRef.current = merged;
            setProducts(merged);
          }
          setCloudSyncStatus('synced');
          setLastSyncedTime(new Date().toLocaleTimeString());
          if (conflicts.length > 0) {
            enqueueSyncConflicts(conflicts, true);
          }
        }).catch((e) => console.warn('Startup products cloud fetch notice:', e));
      }, 2500);
    } catch (err) {
      console.warn('Could not subscribe to products:', err);
    }
    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (unsubscribe) unsubscribe();
    };
  }, [isCloudAuthReady, firebaseUser?.uid, effectiveCloudStoreId]);

  // Real-time synchronization subscription for M-PESA & Daraja store configuration
  useEffect(() => {
    const activeUid = firebaseUser?.uid;
    if (!isCloudAuthReady || !activeUid) return;
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToMpesaConfig(
        (remoteConfig) => {
          if (remoteConfig && typeof remoteConfig === 'object') {
            const current = loadMpesaConfig();
            const merged = {
              ...current,
              ...remoteConfig,
              consumerKey: remoteConfig.consumerKey?.trim() || current.consumerKey || '',
              consumerSecret: remoteConfig.consumerSecret?.trim() || current.consumerSecret || '',
              passkey: remoteConfig.passkey?.trim() || current.passkey || '',
              shortcode: remoteConfig.shortcode?.trim() || current.shortcode || (isOwnerAccount ? '1833804' : ''),
              storeNumber: remoteConfig.storeNumber?.trim() || current.storeNumber || (isOwnerAccount ? '1365369' : ''),
            };
            safeSetJSON('rofani_pos_mpesa_config', merged);
          }
        },
        (err) => console.warn('Mpesa config subscription notice:', err),
        activeUid
      );
    } catch (err) {
      console.warn('Could not subscribe to M-Pesa config:', err);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isCloudAuthReady, firebaseUser?.uid, isOwnerAccount]);

  // Real-time synchronization subscription for per-store Transaction Settings & Shop Protection Controls
  useEffect(() => {
    const activeUid = effectiveCloudStoreId || firebaseUser?.uid;
    if (!isCloudAuthReady || !activeUid) return;
    let isCancelled = false;
    let unsubscribeTx: (() => void) | undefined;
    let unsubscribeControls: (() => void) | undefined;
    try {
      unsubscribeTx = subscribeToTransactionSettings(
        (remoteConfig) => {
          if (isCancelled) return;
          if (remoteConfig && typeof remoteConfig === 'object') {
            saveTransactionSettingsLocal(normalizeTransactionSettings(remoteConfig), activeUid);
          }
        },
        (err) => console.warn('Transaction settings subscription notice:', err),
        activeUid
      );
      unsubscribeControls = subscribeToShopProtectionSettings(
        (remoteConfig) => {
          if (isCancelled) return;
          if (remoteConfig && typeof remoteConfig === 'object') {
            saveShopProtectionSettingsLocal(normalizeShopProtectionSettings(remoteConfig), activeUid);
          }
        },
        (err) => console.warn('Shop protection settings subscription notice:', err),
        activeUid
      );
    } catch (err) {
      console.warn('Could not subscribe to transaction/shop settings:', err);
    }
    return () => {
      isCancelled = true;
      if (unsubscribeTx) unsubscribeTx();
      if (unsubscribeControls) unsubscribeControls();
    };
  }, [isCloudAuthReady, firebaseUser?.uid, effectiveCloudStoreId]);

  const resolvedSettingsStoreId = effectiveCloudStoreId || getActiveTenantStoreId();
  const [shopControls] = useShopProtectionSettings(resolvedSettingsStoreId);

  const pushActivityAlert = (
    severity: 'info' | 'warning' | 'danger',
    title: string,
    message: string
  ) => {
    const id = `act-alert-${Date.now()}`;
    setActivityAlertBanner({ id, severity, title, message });
    setTimeout(() => {
      setActivityAlertBanner((curr) => (curr?.id === id ? null : curr));
    }, severity === 'info' ? 5500 : 12000);
  };

  // Inactivity Auto-Lock Listener (when enabled in Shop Controls)
  useEffect(() => {
    if (!shopControls.enableInactivityLock || isTerminalLocked) return;
    if (!isAuthorizedCloudUser(firebaseUser) && !allowOfflineOwnerMode) return;

    const timeoutMs = Math.max(1, shopControls.inactivityTimeoutMinutes || 5) * 60 * 1000;
    let idleTimer: number | undefined;

    const resetIdleTimer = () => {
      if (idleTimer !== undefined) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        setIsTerminalLocked(true);
      }, timeoutMs);
    };

    resetIdleTimer();
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetIdleTimer, { passive: true }));
    return () => {
      if (idleTimer !== undefined) window.clearTimeout(idleTimer);
      events.forEach((ev) => window.removeEventListener(ev, resetIdleTimer));
    };
  }, [
    shopControls.enableInactivityLock,
    shopControls.inactivityTimeoutMinutes,
    isTerminalLocked,
    firebaseUser,
    allowOfflineOwnerMode,
  ]);

  // 9:00 PM Daily Summary Auto-Prompt (triggers once per evening at/after 21:00 local time unless dismissed)
  useEffect(() => {
    if (!shopControls.enable9PmDailySummary || isTerminalLocked) return;
    if (!isAuthorizedCloudUser(firebaseUser) && !allowOfflineOwnerMode) return;

    const checkEveningSummary = () => {
      const now = new Date();
      if (now.getHours() < 21) return;
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const dismissKey = `rofani_9pm_dismissed_${resolvedSettingsStoreId}_${y}-${m}-${d}`;
      const alreadyDismissed = safeGetJSON<boolean>(dismissKey, false);
      if (!alreadyDismissed) {
        setShow9PmSummaryModal(true);
      }
    };

    checkEveningSummary();
    const timer = window.setInterval(checkEveningSummary, 60000);
    return () => window.clearInterval(timer);
  }, [
    shopControls.enable9PmDailySummary,
    isTerminalLocked,
    resolvedSettingsStoreId,
    firebaseUser,
    allowOfflineOwnerMode,
  ]);

  // Real-time synchronization subscription for users & staff accounts
  useEffect(() => {
    const activeUid = effectiveCloudStoreId || firebaseUser?.uid;
    if (!isCloudAuthReady || !activeUid) return;
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToUsers(
          (incomingRemoteUsers) => {
          if (incomingRemoteUsers && incomingRemoteUsers.length > 0) {
            const { merged, conflicts } = mergeRecordsWithConflictDetection<User>({
              recordType: 'user',
              localRecords: allUsersRef.current,
              incomingRecords: incomingRemoteUsers,
              pendingMap: getPendingRecordMap<User>('user'),
              resolvedFingerprints: resolvedConflictFingerprintsRef.current,
              sourceLabel: 'Cloud Firestore Live Staff Sync',
            });
            if (haveUserListsChanged(allUsersRef.current, merged)) {
              allUsersRef.current = merged;
              setAllUsers(merged);
            }
            if (conflicts.length > 0) {
              enqueueSyncConflicts(conflicts, true);
            }
          }
        },
        (err) => console.warn('Users cloud subscription notice:', err),
        activeUid
      );
    } catch (err) {
      console.warn('Could not subscribe to users:', err);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isCloudAuthReady, firebaseUser?.uid, effectiveCloudStoreId]);

  // Real-time synchronization subscriptions for Customer Deposits, Complaints & Goods Returns
  useEffect(() => {
    const activeUid = effectiveCloudStoreId || firebaseUser?.uid;
    if (!isCloudAuthReady || !activeUid) return;

    const mergeByTimestamp = <T extends { id: string; updatedAt?: string }>(
      localList: T[],
      incomingList: T[],
      sortKey: keyof T
    ): T[] => {
      const map = new Map<string, T>();
      localList.forEach((item) => map.set(item.id, item));
      incomingList.forEach((remote) => {
        const existing = map.get(remote.id);
        if (!existing) {
          map.set(remote.id, remote);
        } else {
          const remoteMs = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
          const localMs = existing.updatedAt ? Date.parse(existing.updatedAt) : 0;
          if (remoteMs >= localMs) {
            map.set(remote.id, remote);
          }
        }
      });
      return Array.from(map.values()).sort((a, b) => {
        const da = Date.parse(String(a[sortKey] || '')) || 0;
        const db = Date.parse(String(b[sortKey] || '')) || 0;
        return db - da;
      });
    };

    let unsubDeposits: (() => void) | undefined;
    let unsubComplaints: (() => void) | undefined;
    let unsubReturns: (() => void) | undefined;

    try {
      unsubDeposits = subscribeToCustomerDeposits(
        (incoming) => {
          if (incoming && incoming.length > 0) {
            setCustomerDeposits((prev) => mergeByTimestamp(prev, incoming, 'date'));
          }
        },
        (err) => console.warn('Customer deposits subscription notice:', err),
        activeUid
      );
      unsubComplaints = subscribeToCustomerComplaints(
        (incoming) => {
          if (incoming && incoming.length > 0) {
            setCustomerComplaints((prev) => mergeByTimestamp(prev, incoming, 'createdAt'));
          }
        },
        (err) => console.warn('Customer complaints subscription notice:', err),
        activeUid
      );
      unsubReturns = subscribeToCustomerReturns(
        (incoming) => {
          if (incoming && incoming.length > 0) {
            setCustomerReturns((prev) => mergeByTimestamp(prev, incoming, 'date'));
          }
        },
        (err) => console.warn('Customer returns subscription notice:', err),
        activeUid
      );
    } catch (err) {
      console.warn('Could not subscribe to customer ledgers:', err);
    }

    return () => {
      if (unsubDeposits) unsubDeposits();
      if (unsubComplaints) unsubComplaints();
      if (unsubReturns) unsubReturns();
    };
  }, [isCloudAuthReady, firebaseUser?.uid, effectiveCloudStoreId]);

  const syncInFlightPromiseRef = useRef<Promise<SyncRetryResult> | null>(null);

  // Offline and bidirectional cloud sync handler (serialized via in-flight promise lock to avoid race conditions)
  const syncPendingQueueToCloud = useCallback((): Promise<SyncRetryResult> => {
    if (syncInFlightPromiseRef.current) {
      return syncInFlightPromiseRef.current;
    }

    const runSync = async (): Promise<SyncRetryResult> => {
      const initialQueue = getPendingSyncQueue();
      if (!getIsOnline() || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        setCloudSyncStatus('offline');
        const errMsg = 'Device is offline. Connect to Wi-Fi or mobile data and try again.';
        if (initialQueue.length > 0) {
          addSyncHistoryEntry({
            operation: 'queue_flush',
            status: 'failed',
            syncedCount: 0,
            failedCount: initialQueue.length,
            summary: `Queue sync paused (${initialQueue.length} queued record${initialQueue.length === 1 ? '' : 's'})`,
            errorDetails: errMsg,
          });
        }
        return {
          syncedCount: 0,
          remainingCount: initialQueue.length,
          errorMessage: errMsg,
        };
      }
      if (!isAuthorizedCloudUser(auth.currentUser)) {
        setCloudSyncStatus('offline');
        const errMsg = 'Sign in with your verified Google account in Sync & Share to sync queued records.';
        if (initialQueue.length > 0) {
          addSyncHistoryEntry({
            operation: 'queue_flush',
            status: 'failed',
            syncedCount: 0,
            failedCount: initialQueue.length,
            summary: `Queue sync blocked — authentication required (${initialQueue.length} queued)`,
            errorDetails: errMsg,
          });
        }
        return {
          syncedCount: 0,
          remainingCount: initialQueue.length,
          errorMessage: errMsg,
        };
      }

      setCloudSyncStatus('syncing');
      let hadError = false;
      let syncedCount = 0;
      let lastErrorMessage: string | undefined;

      try {
        // 1. Flush pendingSyncQueue first (oldest-to-newest so newest edits always win)
        const chronologicalQueue = [...initialQueue].reverse();
        for (const item of chronologicalQueue) {
          try {
            if (item.type === 'sale') {
              await saveTransactionToCloud(item.data);
            } else if (item.type === 'product') {
              if (item.data?._deleted) {
                await deleteProductFromCloud(item.data.id);
              } else {
                await saveProductToCloud(item.data);
              }
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
            } else if (item.type === 'customer_deposit') {
              await saveCustomerDepositToCloud(item.data);
            } else if (item.type === 'customer_complaint') {
              await saveCustomerComplaintToCloud(item.data);
            } else if (item.type === 'customer_return') {
              await saveCustomerReturnToCloud(item.data);
            }
            removePendingSyncItem(item.id);
            syncedCount += 1;
          } catch (err) {
            if (isQuotaExceededError(err)) {
              setIsCloudQuotaExceeded(true);
              setCloudSyncStatus('quota_exceeded');
              return {
                syncedCount,
                remainingCount: getPendingSyncCount(),
                errorMessage: 'Cloud Firestore daily free quota limit reached.',
              };
            }
            hadError = true;
            lastErrorMessage = err instanceof Error ? err.message : String(err);
            console.warn(`[Sync Queue] Offline action ${item.id} waiting for stable connection:`, err);
          }
        }

        // 2. Bidirectional Sync Guarantee: Batch-push recent local sales
        const localSales = safeGetJSON<Transaction[]>('retail_pos_transactions', transactionsRef.current);
        if (localSales && localSales.length > 0) {
          try {
            await batchSaveTransactionsToCloud(localSales.slice(0, 100));
          } catch (err) {
            if (isQuotaExceededError(err)) {
              setIsCloudQuotaExceeded(true);
              setCloudSyncStatus('quota_exceeded');
              return {
                syncedCount,
                remainingCount: getPendingSyncCount(),
                errorMessage: 'Cloud Firestore daily free quota limit reached.',
              };
            }
            hadError = true;
            if (!lastErrorMessage) {
              lastErrorMessage = err instanceof Error ? err.message : String(err);
            }
            console.warn('[Sync] Could not batch push local sales to cloud:', err);
          }
        }

        // 3. Preserve Local Sales State without unnecessary re-renders
        const existingLocalSales = safeGetJSON<Transaction[]>('retail_pos_transactions', transactionsRef.current);
        if (haveTransactionListsChanged(transactionsRef.current, existingLocalSales)) {
          setTransactions(existingLocalSales);
        }

        const remainingCount = getPendingSyncCount();
        if (hadError || remainingCount > 0) {
          setCloudSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
          addSyncHistoryEntry({
            operation: 'queue_flush',
            status: syncedCount > 0 ? 'partial' : 'failed',
            syncedCount,
            failedCount: Math.max(remainingCount, 1),
            summary:
              syncedCount > 0
                ? `Synced ${syncedCount} queued record(s); ${remainingCount} remaining`
                : `Failed to sync ${remainingCount} queued record(s)`,
            errorDetails: lastErrorMessage || 'Could not reach Cloud Firestore.',
          });
        } else {
          setLastSyncedTime(new Date().toLocaleTimeString());
          setCloudSyncStatus('synced');
          if (syncedCount > 0 || initialQueue.length > 0) {
            addSyncHistoryEntry({
              operation: 'queue_flush',
              status: 'success',
              syncedCount,
              failedCount: 0,
              summary:
                syncedCount > 0
                  ? `Uploaded ${syncedCount} queued offline record${syncedCount === 1 ? '' : 's'} to Cloud Firestore`
                  : 'Verified local sales & offline queue in sync with Cloud Firestore',
            });
          }
        }

        return {
          syncedCount,
          remainingCount,
          errorMessage: lastErrorMessage,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isQuotaExceededError(err)) {
          setIsCloudQuotaExceeded(true);
          setCloudSyncStatus('quota_exceeded');
        } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setCloudSyncStatus('offline');
        } else {
          setCloudSyncStatus('error');
        }
        addSyncHistoryEntry({
          operation: 'queue_flush',
          status: syncedCount > 0 ? 'partial' : 'failed',
          syncedCount,
          failedCount: Math.max(getPendingSyncCount(), 1),
          summary: 'Cloud queue sync encountered an unexpected error',
          errorDetails: msg,
        });
        console.warn('[Sync Queue] Unexpected sync failure:', err);
        return {
          syncedCount,
          remainingCount: getPendingSyncCount(),
          errorMessage: msg,
        };
      }
    };

    const promise = runSync().finally(() => {
      syncInFlightPromiseRef.current = null;
    });
    syncInFlightPromiseRef.current = promise;
    return promise;
  }, []);

  const syncPendingQueueToCloudRef = useRef(syncPendingQueueToCloud);
  syncPendingQueueToCloudRef.current = syncPendingQueueToCloud;

  // Proactively attempt flushing any queued offline records shortly after app launch & Google auth readiness when Aggressive Auto-Sync is enabled
  useEffect(() => {
    if (!isCloudAuthReady || !getAggressiveAutoSync() || !getIsOnline() || getPendingSyncCount() === 0) return;
    const timer = setTimeout(() => {
      syncPendingQueueToCloudRef.current().catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [isCloudAuthReady, firebaseUser?.uid]);

  // Comprehensive pull from Cloud Firestore handler with safety merge & backup snapshot
  const handlePullFromCloud = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setCloudSyncStatus('offline');
      throw new Error('Device is offline. Please reconnect to internet and try pulling again.');
    }
    if (!isAuthorizedCloudUser(auth.currentUser)) {
      setCloudSyncStatus('offline');
      throw new Error('Sign in with your verified Google account first before pulling from Cloud Firestore.');
    }

    setCloudSyncStatus('syncing');
    try {
      // 1. Proactively record a local rollback snapshot and protect master backup before pulling
      try {
        if (products && products.length > 0) {
          protectLargestBackup(products, transactions, customers, suppliers, expenses, allUsers);
          const prePullSnapshot = {
            timestamp: Date.now(),
            products,
            transactions,
            customers,
            suppliers,
            expenses,
            allUsers,
          };
          safeSetJSON('rofani_pos_pre_pull_backup', prePullSnapshot);
        }
      } catch {}

      // 2. Fetch all collections from Cloud Firestore, distinguishing network failure from empty cloud
      let failedCollections = 0;
      let lastFetchError: any = null;
      const trackFetch = <T,>(promise: Promise<T[]>): Promise<T[]> =>
        promise.catch((err) => {
          failedCollections += 1;
          lastFetchError = err;
          return [];
        });

      const [cloudProducts, cloudSales, cloudCustomers, cloudSuppliers, cloudExpenses, cloudUsers] = await Promise.all([
        trackFetch(fetchProductsFromCloud()),
        trackFetch(fetchTransactionsFromCloud()),
        trackFetch(fetchCustomersFromCloud()),
        trackFetch(fetchSuppliersFromCloud()),
        trackFetch(fetchExpensesFromCloud()),
        trackFetch(fetchUsersFromCloud()),
      ]);

      if (failedCollections === 6 && lastFetchError) {
        throw lastFetchError;
      }

      // 3. ID-based union merge with exact-ms conflict detection: NEVER discard local items or newer local edits
      const pullConflicts: SyncConflict[] = [];

      if (cloudProducts && cloudProducts.length > 0) {
        const deletedIds = getDeletedProductIds();
        const pendingMap = getPendingProductMap();
        const { merged, conflicts } = mergeRecordsWithConflictDetection<Product>({
          recordType: 'product',
          localRecords: productsRef.current,
          incomingRecords: cloudProducts,
          deletedIds,
          pendingMap,
          resolvedFingerprints: resolvedConflictFingerprintsRef.current,
          sourceLabel: 'Manual Cloud Pull',
        });
        productsRef.current = merged;
        setProducts(merged);
        safeSetJSON('retail_pos_products', merged);
        try {
          saveToIDB(resolveTenantStorageKey('retail_pos_products'), merged);
        } catch {}
        pullConflicts.push(...conflicts);
      }

      if (cloudSales && cloudSales.length > 0) {
        const { merged, conflicts } = mergeRecordsWithConflictDetection<Transaction>({
          recordType: 'transaction',
          localRecords: transactionsRef.current,
          incomingRecords: cloudSales,
          pendingMap: getPendingRecordMap<Transaction>('sale'),
          resolvedFingerprints: resolvedConflictFingerprintsRef.current,
          sourceLabel: 'Manual Cloud Pull',
        });
        merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        transactionsRef.current = merged;
        setTransactions(merged);
        safeSetJSON('retail_pos_transactions', merged);
        pullConflicts.push(...conflicts);
      }

      if (cloudCustomers && cloudCustomers.length > 0) {
        const { merged, conflicts } = mergeRecordsWithConflictDetection<Customer>({
          recordType: 'customer',
          localRecords: customersRef.current,
          incomingRecords: cloudCustomers,
          pendingMap: getPendingRecordMap<Customer>('customer'),
          resolvedFingerprints: resolvedConflictFingerprintsRef.current,
          sourceLabel: 'Manual Cloud Pull',
        });
        customersRef.current = merged;
        setCustomers(merged);
        safeSetJSON('retail_pos_customers', merged);
        pullConflicts.push(...conflicts);
      }

      if (cloudSuppliers && cloudSuppliers.length > 0) {
        const deletedIds: string[] = safeGetJSON('retail_pos_deleted_suppliers', []);
        const deletedSet = new Set(deletedIds);
        const { merged, conflicts } = mergeRecordsWithConflictDetection<Supplier>({
          recordType: 'supplier',
          localRecords: suppliersRef.current,
          incomingRecords: cloudSuppliers,
          deletedIds: deletedSet,
          pendingMap: getPendingRecordMap<Supplier>('supplier'),
          resolvedFingerprints: resolvedConflictFingerprintsRef.current,
          sourceLabel: 'Manual Cloud Pull',
        });
        suppliersRef.current = merged;
        setSuppliers(merged);
        safeSetJSON('retail_pos_suppliers', merged);
        pullConflicts.push(...conflicts);
      }

      if (cloudExpenses && cloudExpenses.length > 0) {
        const { merged, conflicts } = mergeRecordsWithConflictDetection<Expense>({
          recordType: 'expense',
          localRecords: expensesRef.current,
          incomingRecords: cloudExpenses,
          pendingMap: getPendingRecordMap<Expense>('expense'),
          resolvedFingerprints: resolvedConflictFingerprintsRef.current,
          sourceLabel: 'Manual Cloud Pull',
        });
        merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        expensesRef.current = merged;
        setExpenses(merged);
        safeSetJSON('retail_pos_expenses', merged);
        pullConflicts.push(...conflicts);
      }

      if (cloudUsers && cloudUsers.length > 0) {
        const { merged, conflicts } = mergeRecordsWithConflictDetection<User>({
          recordType: 'user',
          localRecords: allUsersRef.current,
          incomingRecords: cloudUsers,
          pendingMap: getPendingRecordMap<User>('user'),
          resolvedFingerprints: resolvedConflictFingerprintsRef.current,
          sourceLabel: 'Manual Cloud Pull',
        });
        allUsersRef.current = merged;
        setAllUsers(merged);
        safeSetJSON('retail_pos_users', merged);
        pullConflicts.push(...conflicts);
      }

      if (pullConflicts.length > 0) {
        enqueueSyncConflicts(pullConflicts, true);
      }

      setCloudSyncStatus('synced');
      setLastSyncedTime(new Date().toLocaleTimeString());

      const totalPulled =
        cloudProducts.length +
        cloudSales.length +
        cloudCustomers.length +
        cloudSuppliers.length +
        cloudExpenses.length +
        cloudUsers.length;
      addSyncHistoryEntry({
        operation: 'cloud_pull',
        status: failedCollections > 0 ? 'partial' : 'success',
        syncedCount: totalPulled,
        failedCount: failedCollections,
        summary: `Pulled ${cloudProducts.length} products, ${cloudSales.length} sales, ${cloudCustomers.length} customers from Cloud Firestore`,
        errorDetails:
          failedCollections > 0 && lastFetchError
            ? lastFetchError instanceof Error
              ? lastFetchError.message
              : String(lastFetchError)
            : undefined,
      });

      return {
        productsCount: cloudProducts.length,
        salesCount: cloudSales.length,
        customersCount: cloudCustomers.length,
        suppliersCount: cloudSuppliers.length,
        expensesCount: cloudExpenses.length,
        usersCount: cloudUsers.length,
      };
    } catch (err) {
      if (isQuotaExceededError(err)) {
        setIsCloudQuotaExceeded(true);
        setCloudSyncStatus('quota_exceeded');
      } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setCloudSyncStatus('offline');
      } else {
        setCloudSyncStatus('error');
      }
      addSyncHistoryEntry({
        operation: 'cloud_pull',
        status: 'failed',
        syncedCount: 0,
        failedCount: 1,
        summary: 'Failed to pull data from Cloud Firestore',
        errorDetails: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  };

  // Resolve a timestamp-tie sync conflict chosen in the Conflict Resolution Assistant modal
  const handleResolveSyncConflict = async (
    conflict: SyncConflict,
    choice: ConflictResolutionChoice,
    customMergedRecord?: Record<string, any>
  ) => {
    const nowIso = new Date().toISOString();
    const chosenBase =
      choice === 'remote'
        ? conflict.remoteRecord
        : choice === 'custom' && customMergedRecord
        ? customMergedRecord
        : conflict.localRecord;

    const shouldPushToCloud = choice === 'local' || choice === 'custom';
    const resolvedRecord: any = shouldPushToCloud
      ? {
          ...chosenBase,
          updatedAt: nowIso,
          ...(conflict.recordType === 'transaction' ? { editedAt: nowIso } : {}),
        }
      : { ...chosenBase };

    if (
      conflict.recordType === 'product' &&
      !resolvedRecord.imageUrl &&
      conflict.localRecord?.imageUrl
    ) {
      resolvedRecord.imageUrl = conflict.localRecord.imageUrl;
    }

    const upsertById = <T extends { id: string }>(list: T[], item: T): T[] => {
      const idx = list.findIndex((x) => x.id === item.id);
      if (idx > -1) {
        const next = [...list];
        next[idx] = item;
        return next;
      }
      return [item, ...list];
    };

    if (conflict.recordType === 'product') {
      const prod = resolvedRecord as Product;
      unmarkProductDeletedLocally(prod.id);
      if (prod.imageUrl && prod.imageUrl.trim() !== '') {
        saveProductImageToIndexedDB(prod.id, prod.imageUrl);
      }
      const nextList = upsertById(productsRef.current, prod);
      productsRef.current = nextList;
      setProducts(nextList);
      safeSetJSON('retail_pos_products', nextList);
      try {
        saveToIDB(resolveTenantStorageKey('retail_pos_products'), nextList);
      } catch {}

      if (shouldPushToCloud) {
        if (!canAutoSyncCloud()) {
          addPendingSyncItem({
            type: 'product',
            description: `Conflict Resolved (Local/Merged): ${prod.name}`,
            data: prod,
          });
        } else {
          try {
            await saveProductToCloud(prod);
          } catch {
            addPendingSyncItem({
              type: 'product',
              description: `Conflict Resolved (Local/Merged): ${prod.name}`,
              data: prod,
            });
          }
        }
      } else {
        clearPendingSyncItemsForRecord('product', prod.id);
      }
    } else if (conflict.recordType === 'customer') {
      const cust = resolvedRecord as Customer;
      const nextList = upsertById(customersRef.current, cust);
      customersRef.current = nextList;
      setCustomers(nextList);
      safeSetJSON('retail_pos_customers', nextList);

      if (shouldPushToCloud) {
        if (!canAutoSyncCloud()) {
          addPendingSyncItem({
            type: 'customer',
            description: `Conflict Resolved: ${cust.name}`,
            data: cust,
          });
        } else {
          try {
            await saveCustomerToCloud(cust);
          } catch {
            addPendingSyncItem({
              type: 'customer',
              description: `Conflict Resolved: ${cust.name}`,
              data: cust,
            });
          }
        }
      } else {
        clearPendingSyncItemsForRecord('customer', cust.id);
      }
    } else if (conflict.recordType === 'supplier') {
      const sup = resolvedRecord as Supplier;
      const nextList = upsertById(suppliersRef.current, sup);
      suppliersRef.current = nextList;
      setSuppliers(nextList);
      safeSetJSON('retail_pos_suppliers', nextList);

      if (shouldPushToCloud) {
        if (!canAutoSyncCloud()) {
          addPendingSyncItem({
            type: 'supplier',
            description: `Conflict Resolved: ${sup.name}`,
            data: sup,
          });
        } else {
          try {
            await saveSupplierToCloud(sup);
          } catch {
            addPendingSyncItem({
              type: 'supplier',
              description: `Conflict Resolved: ${sup.name}`,
              data: sup,
            });
          }
        }
      } else {
        clearPendingSyncItemsForRecord('supplier', sup.id);
      }
    } else if (conflict.recordType === 'transaction') {
      const tx = resolvedRecord as Transaction;
      const nextList = upsertById(transactionsRef.current, tx);
      nextList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      transactionsRef.current = nextList;
      setTransactions(nextList);
      safeSetJSON('retail_pos_transactions', nextList);
      safeSetJSON('pos_store_sales', nextList);

      if (shouldPushToCloud) {
        if (!canAutoSyncCloud()) {
          addPendingSyncItem({
            type: 'sale',
            description: `Conflict Resolved Sale #${tx.receiptNumber}`,
            data: tx,
          });
        } else {
          try {
            await saveTransactionToCloud(tx);
          } catch {
            addPendingSyncItem({
              type: 'sale',
              description: `Conflict Resolved Sale #${tx.receiptNumber}`,
              data: tx,
            });
          }
        }
      } else {
        clearPendingSyncItemsForRecord('transaction', tx.id);
      }
    } else if (conflict.recordType === 'expense') {
      const exp = resolvedRecord as Expense;
      const nextList = upsertById(expensesRef.current, exp);
      nextList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      expensesRef.current = nextList;
      setExpenses(nextList);
      safeSetJSON('retail_pos_expenses', nextList);

      if (shouldPushToCloud) {
        if (!canAutoSyncCloud()) {
          addPendingSyncItem({
            type: 'expense',
            description: `Conflict Resolved Expense: ${exp.category}`,
            data: exp,
          });
        } else {
          try {
            await saveExpenseToCloud(exp);
          } catch {
            addPendingSyncItem({
              type: 'expense',
              description: `Conflict Resolved Expense: ${exp.category}`,
              data: exp,
            });
          }
        }
      } else {
        clearPendingSyncItemsForRecord('expense', exp.id);
      }
    } else if (conflict.recordType === 'user') {
      const usr = resolvedRecord as User;
      const nextList = upsertById(allUsersRef.current, usr);
      allUsersRef.current = nextList;
      setAllUsers(nextList);
      safeSetJSON('retail_pos_users', nextList);
      safeSetJSON('pos_store_staff_users', nextList);
      if (currentUser.id === usr.id) {
        setCurrentUser(usr);
        safeSetJSON('retail_pos_active_user', usr);
      }

      if (shouldPushToCloud) {
        if (!canAutoSyncCloud()) {
          addPendingSyncItem({
            type: 'user',
            description: `Conflict Resolved Staff: ${usr.name}`,
            data: usr,
          });
        } else {
          try {
            await saveUserToCloud(usr);
          } catch {
            addPendingSyncItem({
              type: 'user',
              description: `Conflict Resolved Staff: ${usr.name}`,
              data: usr,
            });
          }
        }
      } else {
        clearPendingSyncItemsForRecord('user', usr.id);
      }
    }

    resolvedConflictFingerprintsRef.current.add(conflict.fingerprint);
    setSyncConflicts((prev) => {
      const remaining = prev.filter(
        (c) => c.id !== conflict.id && c.fingerprint !== conflict.fingerprint
      );
      if (remaining.length === 0) {
        setIsConflictModalOpen(false);
      }
      return remaining;
    });
  };

  // State to track if user dismissed the top emergency recovery banner
  const [dismissedRecoveryBanner, setDismissedRecoveryBanner] = useState(false);

  const largestRecoverableBackup = useMemo(() => {
    if (dismissedRecoveryBanner || products.length >= 50) return null;
    try {
      const backups = findRecoverableBackups();
      return backups.find((b) => b.productsCount > products.length && b.productsCount > 50) || null;
    } catch {
      return null;
    }
  }, [dismissedRecoveryBanner, products.length]);

  // Emergency Catalog Rollback Handler: restores products and associated collections from local snapshots
  // Emergency Catalog Rollback Handler: restores products and associated collections from local snapshots
  const handleRestoreEmergencyBackup = async (sourceKey?: string): Promise<boolean> => {
    try {
      const backups = findRecoverableBackups();
      const target = sourceKey
        ? backups.find((b) => b.key === sourceKey)
        : backups.find((b) => b.productsCount > products.length) || backups[0];

      // Retrieve full data checking IndexedDB first (which has no 5MB limit)
      const fullBackupData = target ? await getBackupDataByKey(target.key) : null;
      const dataPayload = fullBackupData?.data || fullBackupData || target?.data;

      if (!dataPayload) {
        setBackupBanner({
          type: 'error',
          message: 'No recoverable emergency backups found in browser storage.',
        });
        setTimeout(() => setBackupBanner(null), 5000);
        return false;
      }

      const restoredProducts: Product[] = dataPayload.products || [];
      const restoredSales: Transaction[] = dataPayload.transactions || dataPayload.sales || [];
      const restoredCustomers: Customer[] = dataPayload.customers || [];
      const restoredSuppliers: Supplier[] = dataPayload.suppliers || [];
      const restoredExpenses: Expense[] = dataPayload.expenses || [];
      const restoredUsers: User[] = dataPayload.allUsers || dataPayload.staff || [];

      if (restoredProducts.length > 0) {
        setProducts(restoredProducts);
        safeSetJSON('retail_pos_products', restoredProducts);
        try {
          await saveToIDB(resolveTenantStorageKey('retail_pos_products'), restoredProducts);
        } catch {}
        protectLargestBackup(restoredProducts, restoredSales, restoredCustomers, restoredSuppliers, restoredExpenses, restoredUsers);
      }
      if (restoredSales.length > 0) {
        setTransactions(restoredSales);
        safeSetJSON('retail_pos_transactions', restoredSales);
        try {
          await saveToIDB(resolveTenantStorageKey('retail_pos_transactions'), restoredSales);
        } catch {}
      }
      if (restoredCustomers.length > 0) {
        setCustomers(restoredCustomers);
        safeSetJSON('retail_pos_customers', restoredCustomers);
        try {
          await saveToIDB(resolveTenantStorageKey('retail_pos_customers'), restoredCustomers);
        } catch {}
      }
      if (restoredSuppliers.length > 0) {
        setSuppliers(restoredSuppliers);
        safeSetJSON('retail_pos_suppliers', restoredSuppliers);
        try {
          await saveToIDB(resolveTenantStorageKey('retail_pos_suppliers'), restoredSuppliers);
        } catch {}
      }
      if (restoredExpenses.length > 0) {
        setExpenses(restoredExpenses);
        safeSetJSON('retail_pos_expenses', restoredExpenses);
        try {
          await saveToIDB(resolveTenantStorageKey('retail_pos_expenses'), restoredExpenses);
        } catch {}
      }
      if (restoredUsers.length > 0) {
        setAllUsers(restoredUsers);
        safeSetJSON('retail_pos_users', restoredUsers);
        try {
          await saveToIDB(resolveTenantStorageKey('retail_pos_users'), restoredUsers);
        } catch {}
      }

      // Automatically publish restored catalog to Cloud Firestore if Google auth is ready
      if (restoredProducts.length > 0 && canAutoSyncCloud()) {
        batchSaveProductsToCloud(restoredProducts)
          .then((count) => {
            console.log(`[Cloud Sync] Automatically uploaded all ${count} restored products to Cloud Firestore!`);
            setCloudSyncStatus('synced');
            setLastSyncedTime(new Date().toLocaleTimeString());
          })
          .catch((e) => console.warn('[Cloud Sync] Auto-push after restore notice:', e));
      }

      setBackupBanner({
        type: 'success',
        message: `✨ Successfully restored ${restoredProducts.length} items & ${restoredSales.length} sales from ${target?.label || 'emergency backup'}! Persisted safely to IndexedDB and Cloud Firestore.`,
      });
      setTimeout(() => setBackupBanner(null), 8000);
      setDismissedRecoveryBanner(true);
      return true;
    } catch (err: any) {
      setBackupBanner({
        type: 'error',
        message: `Failed to restore emergency backup: ${err.message || 'Unknown error'}`,
      });
      setTimeout(() => setBackupBanner(null), 5000);
      return false;
    }
  };

  // Automatically attempt sync when network connection transitions from offline to online (if Aggressive Auto-Sync is enabled)
  useEffect(() => {
    const handleReconnected = () => {
      if (getAggressiveAutoSync() && isAuthorizedCloudUser(auth.currentUser)) {
        syncPendingQueueToCloudRef.current().catch(() => {});
      }
    };

    window.addEventListener('online', handleReconnected);
    return () => {
      window.removeEventListener('online', handleReconnected);
    };
  }, [isCloudAuthReady, firebaseUser?.uid]);

  // Optimized Firebase Cloud Connection Test & Local Storage Cache Strategy
  // Only executes after Firebase Auth initializes and store owner account is verified.
  useEffect(() => {
    if (!isFirebaseAuthReady) return;
    if (!isCloudAuthReady) {
      setCloudSyncStatus('offline');
      return;
    }
    let active = true;

    testFirestoreConnection().then((connected) => {
      if (!active) return;
      if (connected) {
        setCloudSyncStatus('synced');
        setLastSyncedTime(new Date().toLocaleTimeString());
      } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setCloudSyncStatus('offline');
      } else {
        setCloudSyncStatus('synced');
      }
    }).catch(() => {
      if (!active) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setCloudSyncStatus('offline');
      } else {
        setCloudSyncStatus('synced');
      }
    });

    return () => {
      active = false;
    };
  }, [isFirebaseAuthReady, isCloudAuthReady, firebaseUser?.uid]);

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
    if (canAutoSyncCloud()) {
      saveAuditLogToCloud(log).catch((err) =>
        console.warn('Could not sync audit log to cloud:', err)
      );
    }
  };

  // Barcode Scanner Activity & Staff Scans Audit Log State
  const [scanLogs, setScanLogs] = useState<BarcodeScanLog[]>(() =>
    safeGetJSON('retail_pos_barcode_scan_logs', getActiveTenantStoreId() === OWNER_PRIMARY_STORE_ID ? INITIAL_BARCODE_SCAN_LOGS : [])
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
    const nowIso = new Date().toISOString();
    const sanitizedUser: User = {
      ...newUser,
      roles: newUser.roles && newUser.roles.length > 0 ? newUser.roles : roles,
      assignedRoles: newUser.roles && newUser.roles.length > 0 ? newUser.roles : roles,
      updatedAt: newUser.updatedAt || nowIso,
    };
    setAllUsers((prev) => {
      const updated = [...prev, sanitizedUser];
      safeSetJSON('retail_pos_users', updated);
      return updated;
    });
    if (canAutoSyncCloud()) {
      saveUserToCloud(sanitizedUser).catch(() => {
        addPendingSyncItem({ type: 'user', description: `Add Staff: ${sanitizedUser.name}`, data: sanitizedUser });
      });
    } else {
      addPendingSyncItem({ type: 'user', description: `Add Staff: ${sanitizedUser.name}`, data: sanitizedUser });
    }
  };

  const handleUpdateUser = (updatedUser: User) => {
    const roles = getUserRoles(updatedUser);
    const sanitizedUser: User = {
      ...updatedUser,
      roles: updatedUser.roles && updatedUser.roles.length > 0 ? updatedUser.roles : roles,
      updatedAt: new Date().toISOString(),
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
    if (canAutoSyncCloud()) {
      saveUserToCloud(sanitizedUser).catch(() => {
        addPendingSyncItem({ type: 'user', description: `Update Staff: ${sanitizedUser.name}`, data: sanitizedUser });
      });
    } else {
      addPendingSyncItem({ type: 'user', description: `Update Staff: ${sanitizedUser.name}`, data: sanitizedUser });
    }
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
    if (canAutoSyncCloud()) {
      deleteUserFromCloud(userId).catch((err) =>
        console.warn('Could not delete user from cloud:', err)
      );
    }
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
    safeSetJSON('rofani_app_pin', newPin);
    if (!canAutoSyncCloud()) return;
    try {
      const payload: StoreSecurityConfig = {
        requirePinOnStartup,
        biometricUnlockEnabled,
        masterPin: newPin,
        recoveryEmail: ownerRecoveryEmail,
        emergencyKey: emergencyRecoveryKey,
      };
      await saveStoreSecurityToCloud(payload, effectiveCloudStoreId || undefined);
      if (primaryCloudStoreId && primaryCloudStoreId !== effectiveCloudStoreId) {
        await saveStoreSecurityToCloud(payload, primaryCloudStoreId).catch(() => {});
      }
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
      if (canAutoSyncCloud()) {
        try {
          await saveUserToCloud(updatedUser, effectiveCloudStoreId || undefined);
        } catch (err) {
          console.warn('Could not sync reset admin PIN to cloud:', err);
        }
      } else {
        addPendingSyncItem({ type: 'user', description: `Reset Admin PIN: ${updatedUser.name}`, data: updatedUser });
      }
    }
  };

  const handleToggleRequirePinOnStartup = async (require: boolean) => {
    setRequirePinOnStartup(require);
    safeSetJSON('retail_pos_require_pin_startup', require);
    if (!canAutoSyncCloud()) return;
    try {
      const payload: StoreSecurityConfig = {
        requirePinOnStartup: require,
        biometricUnlockEnabled,
        masterPin,
        recoveryEmail: ownerRecoveryEmail,
        emergencyKey: emergencyRecoveryKey,
      };
      await saveStoreSecurityToCloud(payload, effectiveCloudStoreId || undefined);
      if (primaryCloudStoreId && primaryCloudStoreId !== effectiveCloudStoreId) {
        await saveStoreSecurityToCloud(payload, primaryCloudStoreId).catch(() => {});
      }
    } catch (err) {
      console.warn('Could not sync security settings to cloud:', err);
    }
  };

  const handleChangePasswordOrPin = async ({
    currentPin,
    newPin,
  }: {
    currentPin: string;
    newPin: string;
  }) => {
    const cleanCurrent = (currentPin || '').trim();
    const cleanNew = (newPin || '').trim();
    const adminUser =
      allUsers.find((u) => hasRole(u, 'Admin')) || allUsers[0];
    const validMaster = (masterPin || '1234').trim();
    const validAdminPin = (adminUser?.pin || '').trim();

    if (!cleanCurrent || (cleanCurrent !== validMaster && cleanCurrent !== validAdminPin)) {
      throw new Error('Current Password / Admin PIN does not match.');
    }
    if (cleanNew.length < 4) {
      throw new Error('New Password / PIN must be at least 4 characters.');
    }

    setMasterPin(cleanNew);
    safeSetJSON('retail_pos_master_pin', cleanNew);
    safeSetJSON('rofani_app_pin', cleanNew);

    if (adminUser) {
      const updatedAdmin: User = {
        ...adminUser,
        pin: cleanNew,
        updatedAt: new Date().toISOString(),
      };
      setAllUsers((prev) => prev.map((u) => (u.id === adminUser.id ? updatedAdmin : u)));
      if (currentUser.id === adminUser.id) {
        setCurrentUser(updatedAdmin);
        safeSetJSON('retail_pos_active_user', updatedAdmin);
      }
      if (canAutoSyncCloud()) {
        await saveUserToCloud(updatedAdmin, effectiveCloudStoreId || undefined).catch(() => {});
      }
    }

    if (canAutoSyncCloud()) {
      const payload: StoreSecurityConfig = {
        requirePinOnStartup,
        biometricUnlockEnabled,
        masterPin: cleanNew,
        recoveryEmail: ownerRecoveryEmail,
        emergencyKey: emergencyRecoveryKey,
      };
      await saveStoreSecurityToCloud(payload, effectiveCloudStoreId || undefined).catch(() => {});
      if (primaryCloudStoreId && primaryCloudStoreId !== effectiveCloudStoreId) {
        await saveStoreSecurityToCloud(payload, primaryCloudStoreId).catch(() => {});
      }
    }
  };

  const handleToggleBiometricUnlock = async (enabled: boolean) => {
    setBiometricUnlockEnabled(enabled);
    safeSetJSON('retail_pos_biometric_unlock', enabled);
    if (enabled && currentUser) {
      await registerNativeBiometricCredential(currentUser).catch(() => null);
    }
    if (!canAutoSyncCloud()) return;
    try {
      const payload: StoreSecurityConfig = {
        requirePinOnStartup,
        biometricUnlockEnabled: enabled,
        masterPin,
        recoveryEmail: ownerRecoveryEmail,
        emergencyKey: emergencyRecoveryKey,
      };
      await saveStoreSecurityToCloud(payload, effectiveCloudStoreId || undefined);
      if (primaryCloudStoreId && primaryCloudStoreId !== effectiveCloudStoreId) {
        await saveStoreSecurityToCloud(payload, primaryCloudStoreId).catch(() => {});
      }
    } catch (err) {
      console.warn('Could not sync biometric unlock setting:', err);
    }
  };

  // Automated Daily Gmail Backup Background Schedule Checker (reads refs so timer never tears down on every sale/edit)
  useEffect(() => {
    let isCancelled = false;
    let isCheckRunning = false;

    const performDailyBackupCheck = async () => {
      if (isCheckRunning || isCancelled || isClientDemoMode) return;
      isCheckRunning = true;
      try {
        const settings = getBackupSettings();
        const storeEmail = (storeProfileRef.current?.backupEmail || '').trim();
        const effectiveAutoEnabled =
          typeof storeProfileRef.current?.emailAutoBackupEnabled === 'boolean'
            ? storeProfileRef.current.emailAutoBackupEnabled
            : settings.enabled;
        if (!effectiveAutoEnabled) return;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const currentHour = now.getHours();

        const localDismissedDate = safeGetJSON<string>(
          'rofani_pos_dismissed_backup_banner_date',
          '',
          (v) => typeof v === 'string'
        );
        const isDismissedToday =
          isBackupBannerDismissedForDate(todayStr) ||
          storeProfileRef.current?.dismissedBackupBannerDate === todayStr ||
          localDismissedDate === todayStr;

        const localSavedEmail = safeGetJSON<string>(
          'rofani_pos_backup_email',
          '',
          (v) => typeof v === 'string'
        ).trim();
        const configuredEmail =
          storeEmail ||
          localSavedEmail ||
          (settings.recipientEmail || '').trim();
        const hasConfiguredEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configuredEmail);

        // Ensure configured backup email with Auto Backup ON stays confirmed/trusted automatically
        if (hasConfiguredEmail && !settings.recipientEmailConfirmed) {
          safeSetJSON('rofani_pos_backup_email', configuredEmail);
          saveBackupSettings({
            recipientEmail: configuredEmail,
            recipientEmailConfirmed: true,
          });
        }

        // Check if scheduled hour has arrived and today's backup has not been delivered yet
        const isPastScheduledHour = currentHour >= settings.scheduledHour;
        const isMissedPreviousDay = settings.lastSentDate ? settings.lastSentDate < todayStr : true;
        const isDue = (isPastScheduledHour || isMissedPreviousDay) && settings.lastSentDate !== todayStr;

        if (!isDue) return;

        // Only prompt gently if NO backup email is set yet (and user hasn't dismissed today's banner)
        if (!hasConfiguredEmail) {
          if (!isDismissedToday && storeProfileRef.current) {
            setBackupBanner((prev) =>
              prev
                ? prev
                : {
                    message: 'Set a backup email address in Backup Settings to enable daily automatic snapshots.',
                    type: 'info',
                  }
            );
          }
          return;
        }

        const currentStore =
          storesRef.current.find((s) => s.id === activeStoreIdRef.current)?.name ||
          storeProfileRef.current?.storeName ||
          'Rofani POS';

        const queueLocalSnapshotSilently = () => {
          if (settings.lastQueuedDate !== todayStr) {
            protectLargestBackup(
              productsRef.current,
              transactionsRef.current,
              customersRef.current,
              suppliersRef.current,
              expensesRef.current,
              allUsersRef.current
            );
          }
          saveBackupSettings({
            recipientEmail: configuredEmail,
            recipientEmailConfirmed: true,
            lastQueuedDate: todayStr,
            lastQueuedTimestamp: now.toISOString(),
            lastSentMessage: `Auto-backup snapshot queued silently for ${configuredEmail} (${todayStr})`,
          });
        };

        const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
        const token = getGmailAccessToken();

        // Skip network Gmail call if offline, missing session token, or already attempted & queued today
        if (
          isOffline ||
          !token ||
          (settings.lastAutoAttemptDate === todayStr && settings.lastQueuedDate === todayStr)
        ) {
          if (settings.lastQueuedDate !== todayStr) {
            queueLocalSnapshotSilently();
          }
          return;
        }

        console.log('[Daily Email Backup] Scheduled hour reached, dispatching daily store backup silently...');
        const result = await buildAndDispatchStoreBackup({
          accessToken: token,
          recipientEmail: configuredEmail,
          products: productsRef.current,
          transactions: transactionsRef.current,
          customers: customersRef.current,
          suppliers: suppliersRef.current,
          expenses: expensesRef.current,
          cashTransactions: cashTransactionsRef.current,
          allUsers: allUsersRef.current,
          storeName: currentStore,
        });

        if (isCancelled) return;

        if (result.success) {
          const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          recordLastBackupMeta({
            timestamp: now.toISOString(),
            method: 'gmail_api',
            fileName: `Rofani_Store_Backup_${todayStr}.json`,
            recipientEmail: configuredEmail,
            productsCount: productsRef.current.length,
            categoriesCount: 0,
            salesCount: transactionsRef.current.length,
            customersCount: customersRef.current.length,
            storeName: currentStore,
          });
          if (!isDismissedToday) {
            setBackupBanner({
              message: `Daily automated backup email sent silently to ${configuredEmail} at ${timeStr}.`,
              type: 'success',
            });
            window.setTimeout(() => {
              setBackupBanner((curr) => (curr?.type === 'success' ? null : curr));
            }, 6000);
          }
        } else {
          // Silently fall back to queued local snapshot without retrying every 60s
          queueLocalSnapshotSilently();
        }
      } catch (err: any) {
        console.warn('[Daily Email Backup Background Notice]:', err?.message || err);
      } finally {
        isCheckRunning = false;
      }
    };

    performDailyBackupCheck();
    const intervalId = window.setInterval(performDailyBackupCheck, 60000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

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
    const nowIso = new Date().toISOString();
    setAllUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, commissionRate: newRate, updatedAt: nowIso } : u))
    );
  };

  const handleUpdateUserCommissionSettings = (userId: string, settings: Partial<User>) => {
    const nowIso = new Date().toISOString();
    setAllUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...settings, updatedAt: nowIso } : u))
    );
    if (currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev, ...settings, updatedAt: nowIso }));
    }
  };

  const handlePaySalary = (payout: WorkerSalaryPayout) => {
    setSalaryPayouts((prev) => [payout, ...prev]);

    // Record net paid salary under Expenses -> Salaries and sync to cloud
    if (payout.netPayPaid > 0) {
      const salaryExpense: Expense = {
        id: `exp-sal-${Date.now()}`,
        date: payout.paidAt ? payout.paidAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
        category: 'Salaries',
        description: `Salary / Wage: ${payout.employeeName} (${payout.payPeriodLabel})`,
        amount: payout.netPayPaid,
        paymentMethod: payout.paymentMethod,
        recordedBy: payout.paidBy || currentUser.name,
        receiptNo: payout.referenceNo || payout.id,
        recurringType: 'One-Time',
        status: 'Paid',
        updatedAt: new Date().toISOString(),
      };
      handleAddExpense(salaryExpense);
    }

    // Automatically apply loan/advance deduction to worker loan balance if applicable
    if (payout.loanDeduction > 0 && payout.deductedLoanId) {
      const repayment: WorkerLoanRepayment = {
        id: `rep-sal-${Date.now()}`,
        loanId: payout.deductedLoanId,
        amount: payout.loanDeduction,
        date: new Date().toISOString().slice(0, 10),
        paymentMethod: 'salary_deduction',
        referenceNo: payout.referenceNo || payout.id,
        notes: `Automatic salary deduction from payslip ${payout.id} (${payout.payPeriodLabel})`,
        recordedBy: `${currentUser.name} (${currentUser.role})`,
      };
      handleRepayWorkerLoan(payout.deductedLoanId, repayment);
    }
  };

  const handleUpdateUserSalarySettings = (userId: string, settings: Partial<User>) => {
    const nowIso = new Date().toISOString();
    let updatedTarget: User | null = null;
    setAllUsers((prev) => {
      const next = prev.map((u) => {
        if (u.id === userId) {
          updatedTarget = { ...u, ...settings, updatedAt: nowIso };
          return updatedTarget;
        }
        return u;
      });
      safeSetJSON('retail_pos_users', next);
      return next;
    });
    if (currentUser.id === userId) {
      setCurrentUser((prev) => {
        const nextUser = { ...prev, ...settings, updatedAt: nowIso };
        safeSetJSON('retail_pos_active_user', nextUser);
        return nextUser;
      });
    }
    if (updatedTarget) {
      if (canAutoSyncCloud()) {
        saveUserToCloud(updatedTarget).catch(() => {
          addPendingSyncItem({ type: 'user', description: `Staff Salary Settings: ${updatedTarget!.name}`, data: updatedTarget! });
        });
      } else {
        addPendingSyncItem({ type: 'user', description: `Staff Salary Settings: ${updatedTarget.name}`, data: updatedTarget });
      }
    }
  };

  const handleReattributeSale = (txId: string, salesRepId: string, salesRepName: string) => {
    const nowIso = new Date().toISOString();
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === txId ? { ...tx, salesRepId, salesRepName, editedAt: nowIso, updatedAt: nowIso } : tx))
    );
  };

  const handleCompleteSale = (
    tx: Transaction,
    updatedProducts: Product[],
    updatedCustomers: Customer[]
  ) => {
    const nowIso = new Date().toISOString();
    const stampedTx: Transaction = {
      ...tx,
      updatedAt: tx.updatedAt || nowIso,
    };
    setTransactions((prev) => {
      const updated = [stampedTx, ...prev.filter((t) => t.id !== stampedTx.id)];
      safeSetJSON('retail_pos_transactions', updated);
      safeSetJSON('pos_store_sales', updated);
      return updated;
    });
    if (shopControls.alertOnAnySale) {
      pushActivityAlert(
        'info',
        'Sale Recorded',
        `${stampedTx.salesRepName || stampedTx.cashierName || currentUser.name} completed ${stampedTx.receiptNumber} for KSh ${(stampedTx.grandTotal || 0).toLocaleString()}.`
      );
    }
    const soldProductIds = new Set((stampedTx.items || []).map((it) => it.product?.id || (it as any).productId));

    // Detect any sold product reaching or dropping below its minimum stock limit during this sale
    const previousStockById = new Map<string, number>(
      products.map((p) => [p.id, p.stockQuantity])
    );
    const triggeredLowStockItems: LowStockPushAlertItem[] = [];
    updatedProducts.forEach((p) => {
      if (!soldProductIds.has(p.id)) return;
      const minLimit = typeof p.minStockAlert === 'number' ? p.minStockAlert : 5;
      const prevStock = previousStockById.get(p.id) ?? p.stockQuantity;
      const remainingStock = p.stockQuantity;
      if (remainingStock < prevStock && remainingStock <= minLimit) {
        triggeredLowStockItems.push({
          productId: p.id,
          name: p.name,
          sku: p.sku || '',
          unit: p.unit || 'pcs',
          previousStock: prevStock,
          remainingStock,
          minStockLimit: minLimit,
          severity: remainingStock <= 0 ? 'out_of_stock' : 'low_stock',
        });
      }
    });

    if (triggeredLowStockItems.length > 0) {
      const hasOutOfStock = triggeredLowStockItems.some((item) => item.severity === 'out_of_stock');
      playLowStockAlertSound(hasOutOfStock);
      const newAlert: LowStockPushAlert = {
        id: `low-stock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        receiptNumber: stampedTx.receiptNumber || stampedTx.id,
        triggeredAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        items: triggeredLowStockItems,
      };
      setLowStockPushAlerts((prev) => [newAlert, ...prev].slice(0, 3));
    }

    const stampedUpdatedProducts = updatedProducts.map((p) =>
      soldProductIds.has(p.id) ? { ...p, updatedAt: nowIso } : p
    );
    const stampedUpdatedCustomers = updatedCustomers.map((c) =>
      c.id === stampedTx.customerId ? { ...c, updatedAt: nowIso } : c
    );
    setProducts(stampedUpdatedProducts);
    setCustomers(stampedUpdatedCustomers);

    const isCurrentlyOffline = !canAutoSyncCloud();
    const affectedProducts = stampedUpdatedProducts.filter((p) => soldProductIds.has(p.id));
    const productsToSync = affectedProducts.length > 0 ? affectedProducts : stampedUpdatedProducts.slice(0, 5);

    if (isCurrentlyOffline) {
      addPendingSyncItem({
        type: 'sale',
        description: `POS Sale #${stampedTx.receiptNumber} (KSh ${stampedTx.grandTotal.toLocaleString()})`,
        data: stampedTx,
      });
      productsToSync.forEach((p) => {
        addPendingSyncItem({
          type: 'product',
          description: `Stock Update: ${p.name} (${p.stockQuantity} ${p.unit})`,
          data: p,
        });
      });
      const customerToUpdate = stampedUpdatedCustomers.find((c) => c.id === stampedTx.customerId);
      if (customerToUpdate) {
        addPendingSyncItem({
          type: 'customer',
          description: `Customer Update: ${customerToUpdate.name}`,
          data: customerToUpdate,
        });
      }
    } else {
      // Real-Time Atomic Cloud Sync via SINGLE writeBatch() (Zero quota waste)
      const customerToUpdate = stampedUpdatedCustomers.find((c) => c.id === stampedTx.customerId);
      commitSaleToCloudBatch(stampedTx, productsToSync, customerToUpdate)
        .then(() => {
          addSyncHistoryEntry({
            operation: 'realtime_sale',
            status: 'success',
            syncedCount: 1,
            failedCount: 0,
            summary: `Live synced Sale #${stampedTx.receiptNumber} (KSh ${stampedTx.grandTotal.toLocaleString()})`,
          });
        })
        .catch((err) => {
          if (isQuotaExceededError(err)) {
            setIsCloudQuotaExceeded(true);
            setCloudSyncStatus('quota_exceeded');
          } else {
            console.warn('[Sale Cloud Sync Notice] Offline fallback queued:', err);
          }
          addSyncHistoryEntry({
            operation: 'realtime_sale',
            status: 'failed',
            syncedCount: 0,
            failedCount: 1,
            summary: `Sale #${stampedTx.receiptNumber} queued offline after cloud write failure`,
            errorDetails: err instanceof Error ? err.message : String(err),
          });
        // Graceful offline fallback queue so sale completes smoothly with 0 interruption
        addPendingSyncItem({
          type: 'sale',
          description: `POS Sale #${stampedTx.receiptNumber} (KSh ${stampedTx.grandTotal.toLocaleString()})`,
          data: stampedTx,
        });
        productsToSync.forEach((p) => {
          addPendingSyncItem({
            type: 'product',
            description: `Stock Update: ${p.name} (${p.stockQuantity} ${p.unit})`,
            data: p,
          });
        });
        if (customerToUpdate) {
          addPendingSyncItem({
            type: 'customer',
            description: `Customer Update: ${customerToUpdate.name}`,
            data: customerToUpdate,
          });
        }
      });
    }

    // Record deposit wallet deduction entry if customer used advance deposit at POS checkout
    if ((stampedTx.depositAppliedAmount || 0) > 0) {
      const custSnapshot = stampedUpdatedCustomers.find((c) => c.id === stampedTx.customerId);
      const depositUsedRecord: CustomerDepositRecord = {
        id: `dep-app-${Date.now()}`,
        receiptRef: `USE-${stampedTx.receiptNumber}`,
        type: 'deposit_applied',
        customerId: stampedTx.customerId || 'cust-1',
        customerName: stampedTx.customerName || 'Customer',
        customerPhone: stampedTx.customerPhone,
        amount: stampedTx.depositAppliedAmount || 0,
        paymentMethod: 'store_credit',
        referenceNo: stampedTx.receiptNumber,
        linkedTransactionId: stampedTx.id,
        linkedReceiptNumber: stampedTx.receiptNumber,
        balanceAfterDebt: custSnapshot?.currentBalanceDue ?? 0,
        depositBalanceAfter: custSnapshot?.depositBalance ?? 0,
        notes: `Applied from Advance Deposit Wallet at POS checkout`,
        recordedBy: stampedTx.cashierName || currentUser.name,
        date: nowIso,
        updatedAt: nowIso,
      };
      setCustomerDeposits((prev) => [depositUsedRecord, ...prev]);
      if (!canAutoSyncCloud()) {
        addPendingSyncItem({
          type: 'customer_deposit',
          description: `Deposit Applied: ${depositUsedRecord.customerName}`,
          data: depositUsedRecord,
        });
      } else {
        saveCustomerDepositToCloud(depositUsedRecord).catch(() => {
          addPendingSyncItem({
            type: 'customer_deposit',
            description: `Deposit Applied: ${depositUsedRecord.customerName}`,
            data: depositUsedRecord,
          });
        });
      }
    }
  };

  const handleAddCustomer = (newCust: Customer) => {
    const nowIso = new Date().toISOString();
    const stampedCust: Customer = {
      ...newCust,
      createdAt: newCust.createdAt || nowIso,
      updatedAt: newCust.updatedAt || nowIso,
    };
    setCustomers((prev) => [...prev, stampedCust]);
    if (!canAutoSyncCloud()) {
      addPendingSyncItem({
        type: 'customer',
        description: `Add Customer: ${stampedCust.name} (${stampedCust.phone})`,
        data: stampedCust,
      });
    } else {
      saveCustomerToCloud(stampedCust).catch(() => {
        addPendingSyncItem({
          type: 'customer',
          description: `Add Customer: ${stampedCust.name} (${stampedCust.phone})`,
          data: stampedCust,
        });
      });
    }
  };

  const handleSaveCustomer = (cust: Customer) => {
    const nowIso = new Date().toISOString();
    const stampedCust: Customer = {
      ...cust,
      createdAt: cust.createdAt || nowIso,
      updatedAt: nowIso,
    };
    setCustomers((prev) => {
      const idx = prev.findIndex((c) => c.id === stampedCust.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = stampedCust;
        return copy;
      }
      return [stampedCust, ...prev];
    });
    if (!canAutoSyncCloud()) {
      addPendingSyncItem({
        type: 'customer',
        description: `Update Customer: ${stampedCust.name} (${stampedCust.phone})`,
        data: stampedCust,
      });
    } else {
      saveCustomerToCloud(stampedCust).catch(() => {
        addPendingSyncItem({
          type: 'customer',
          description: `Update Customer: ${stampedCust.name} (${stampedCust.phone})`,
          data: stampedCust,
        });
      });
    }
  };

  const handleDeleteCustomer = (customerId: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    if (!canAutoSyncCloud()) {
      addPendingSyncItem({
        type: 'customer',
        description: `Delete Customer (${customerId})`,
        data: { id: customerId, _deleted: true },
      });
    } else {
      deleteCustomerFromCloud(customerId).catch(() => {
        addPendingSyncItem({
          type: 'customer',
          description: `Delete Customer (${customerId})`,
          data: { id: customerId, _deleted: true },
        });
      });
    }
  };

  const handleSaveSupplier = (sup: Supplier) => {
    const nowIso = new Date().toISOString();
    const stampedSup: Supplier = {
      ...sup,
      createdAt: sup.createdAt || nowIso,
      updatedAt: nowIso,
    };
    const deletedIds: string[] = safeGetJSON('retail_pos_deleted_suppliers', []);
    if (deletedIds.includes(stampedSup.id)) {
      safeSetJSON(
        'retail_pos_deleted_suppliers',
        deletedIds.filter((id) => id !== stampedSup.id)
      );
    }

    setSuppliers((prev) => {
      const idx = prev.findIndex((s) => s.id === stampedSup.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = stampedSup;
        return copy;
      }
      return [...prev, stampedSup];
    });
    if (!canAutoSyncCloud()) {
      addPendingSyncItem({
        type: 'supplier',
        description: `Supplier: ${stampedSup.name}`,
        data: stampedSup,
      });
    } else {
      saveSupplierToCloud(stampedSup).catch(() => {
        addPendingSyncItem({
          type: 'supplier',
          description: `Supplier: ${stampedSup.name}`,
          data: stampedSup,
        });
      });
    }
  };

  const handleDeleteSupplier = (supplierId: string, cascadeProducts: boolean = true) => {
    const targetSupplier = suppliers.find((s) => s.id === supplierId);
    const targetName = targetSupplier?.name?.trim().toLowerCase();

    // Prevent resurrection on cloud pulls
    const deletedIds: string[] = safeGetJSON('retail_pos_deleted_suppliers', []);
    if (!deletedIds.includes(supplierId)) {
      safeSetJSON('retail_pos_deleted_suppliers', [...deletedIds, supplierId]);
    }

    setSuppliers((prev) => {
      const updated = prev.filter((s) => s.id !== supplierId);
      safeSetJSON('retail_pos_suppliers', updated);
      return updated;
    });

    if (targetName && cascadeProducts) {
      const affected: Product[] = [];
      setProducts((prev) => {
        const updated = prev.map((p) => {
          if (p.supplierName && p.supplierName.trim().toLowerCase() === targetName) {
            const nextProd = { ...p, supplierName: 'Direct Wholesale', updatedAt: new Date().toISOString() };
            affected.push(nextProd);
            return nextProd;
          }
          return p;
        });
        safeSetJSON('retail_pos_products', updated);
        return updated;
      });
      if (affected.length > 0 && canAutoSyncCloud()) {
        batchSaveProductsToCloud(affected).catch(() => {});
      }
    }

    if (!canAutoSyncCloud()) {
      addPendingSyncItem({
        type: 'supplier',
        description: `Delete Supplier (${supplierId})`,
        data: { id: supplierId, _deleted: true },
      });
    } else {
      deleteSupplierFromCloud(supplierId).catch(() => {
        addPendingSyncItem({
          type: 'supplier',
          description: `Delete Supplier (${supplierId})`,
          data: { id: supplierId, _deleted: true },
        });
      });
    }
  };

  const handleRecordCustomerDebtPayment = (
    customerId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    reference?: string,
    notes?: string
  ) => {
    let customerName = 'Customer';
    const nowIso = new Date().toISOString();
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          customerName = c.name;
          const newBalance = Math.max(0, (c.currentBalanceDue || 0) - amount);
          return {
            ...c,
            currentBalanceDue: newBalance,
            updatedAt: nowIso,
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

  const handleRecordCustomerDepositOrPayment = (params: {
    customerId: string;
    mode: 'deposit' | 'partial_payment';
    amount: number;
    paymentMethod: PaymentMethod | 'store_credit';
    linkedTransactionId?: string;
    referenceNo?: string;
    notes?: string;
  }) => {
    const {
      customerId,
      mode,
      amount,
      paymentMethod,
      linkedTransactionId,
      referenceNo,
      notes,
    } = params;
    const cleanAmount = Math.max(0, Number(amount) || 0);
    if (cleanAmount <= 0) return;

    const nowIso = new Date().toISOString();
    const targetCustomer = customersRef.current.find((c) => c.id === customerId);
    if (!targetCustomer) return;

    const currentDebt = Math.max(0, Number(targetCustomer.currentBalanceDue) || 0);
    const currentDeposit = Math.max(0, Number(targetCustomer.depositBalance) || 0);

    let nextDebt = currentDebt;
    let nextDeposit = currentDeposit;

    if (mode === 'deposit') {
      nextDeposit = currentDeposit + cleanAmount;
    } else {
      nextDebt = Math.max(0, currentDebt - cleanAmount);
      if (paymentMethod === 'store_credit') {
        nextDeposit = Math.max(0, currentDeposit - cleanAmount);
      }
    }

    const updatedCustomer: Customer = {
      ...targetCustomer,
      currentBalanceDue: nextDebt,
      depositBalance: nextDeposit,
      updatedAt: nowIso,
    };

    setCustomers((prev) => prev.map((c) => (c.id === customerId ? updatedCustomer : c)));

    // Settle linked invoice or FIFO across open invoices if partial_payment
    let linkedReceiptNumber: string | undefined;
    const updatedTransactions: Transaction[] = [];
    if (mode === 'partial_payment') {
      let remainingToAllocate = cleanAmount;
      setTransactions((prev) => {
        const nextList = prev.map((tx) => {
          if (tx.customerId !== customerId) return tx;
          const txBal = Math.max(0, Number(tx.balanceDue) || 0);
          if (txBal <= 0) return tx;
          if (linkedTransactionId && tx.id !== linkedTransactionId) return tx;
          if (remainingToAllocate <= 0) return tx;

          const applied = Math.min(txBal, remainingToAllocate);
          remainingToAllocate -= applied;
          if (!linkedReceiptNumber) linkedReceiptNumber = tx.receiptNumber;

          const newAmountPaid = (Number(tx.amountPaid) || 0) + applied;
          const newBalanceDue = Math.max(0, txBal - applied);
          const updatedTx: Transaction = {
            ...tx,
            amountPaid: newAmountPaid,
            balanceDue: newBalanceDue,
            paymentStatus: newBalanceDue <= 0 ? 'Paid' : 'Partial',
            updatedAt: nowIso,
          };
          updatedTransactions.push(updatedTx);
          return updatedTx;
        });
        return nextList;
      });
    }

    const prefix = mode === 'deposit' ? 'DEP' : 'PAY';
    const receiptRef = `${prefix}-${nowIso.slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    const record: CustomerDepositRecord = {
      id: `cust-dep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      receiptRef,
      type: mode,
      customerId,
      customerName: targetCustomer.name,
      customerPhone: targetCustomer.phone,
      amount: cleanAmount,
      paymentMethod,
      referenceNo: referenceNo?.trim() || receiptRef,
      linkedTransactionId,
      linkedReceiptNumber,
      balanceAfterDebt: nextDebt,
      depositBalanceAfter: nextDeposit,
      notes: notes?.trim() || undefined,
      recordedBy: `${currentUser.name} (${currentUser.role})`,
      date: nowIso,
      updatedAt: nowIso,
    };

    setCustomerDeposits((prev) => [record, ...prev]);

    // Log into Cash Management unless paid strictly from existing Deposit Wallet (store_credit)
    if (paymentMethod !== 'store_credit') {
      const cashEntry: CashTransaction = {
        id: `cash-in-${Date.now()}`,
        type: 'CASH_IN',
        category: mode === 'deposit' ? 'Customer Deposit' : 'Customer Debt Payment',
        amount: cleanAmount,
        date: nowIso,
        sourceDestination: targetCustomer.name,
        referenceNo: record.referenceNo,
        paymentMethod:
          paymentMethod === 'cheque'
            ? 'cheque'
            : paymentMethod === 'mpesa'
            ? 'mpesa'
            : paymentMethod === 'credit_card' || paymentMethod === 'upi'
            ? 'bank_transfer'
            : 'cash',
        description:
          mode === 'deposit'
            ? `Advance deposit from ${targetCustomer.name}${notes ? ` - ${notes}` : ''}`
            : `Invoice partial/debt payment from ${targetCustomer.name}${linkedReceiptNumber ? ` (${linkedReceiptNumber})` : ''}`,
        recordedBy: `${currentUser.name} (${currentUser.role})`,
        status: 'Completed',
        notes: notes?.trim() || undefined,
      };
      setCashTransactions((prev) => [cashEntry, ...prev]);
    }

    // Cloud sync or queue
    if (!canAutoSyncCloud()) {
      addPendingSyncItem({ type: 'customer', description: `Customer Wallet: ${updatedCustomer.name}`, data: updatedCustomer });
      addPendingSyncItem({ type: 'customer_deposit', description: `${mode}: ${updatedCustomer.name}`, data: record });
      updatedTransactions.forEach((tx) =>
        addPendingSyncItem({ type: 'sale', description: `Invoice Balance Update: ${tx.receiptNumber}`, data: tx })
      );
    } else {
      saveCustomerToCloud(updatedCustomer).catch(() =>
        addPendingSyncItem({ type: 'customer', description: `Customer Wallet: ${updatedCustomer.name}`, data: updatedCustomer })
      );
      saveCustomerDepositToCloud(record).catch(() =>
        addPendingSyncItem({ type: 'customer_deposit', description: `${mode}: ${updatedCustomer.name}`, data: record })
      );
      updatedTransactions.forEach((tx) =>
        saveTransactionToCloud(tx).catch(() =>
          addPendingSyncItem({ type: 'sale', description: `Invoice Balance Update: ${tx.receiptNumber}`, data: tx })
        )
      );
    }
  };

  const handleProcessCustomerReturn = (params: {
    customer: Customer;
    transaction: Transaction;
    items: CustomerReturnItem[];
    refundMode: ReturnRefundMode;
    cashRefundAmount: number;
    cashRefundChannel?: 'cash' | 'mpesa';
    cashRefundRef?: string;
    reason: string;
    notes?: string;
  }): CustomerReturnRecord => {
    const {
      customer,
      transaction,
      items,
      refundMode,
      cashRefundAmount,
      cashRefundChannel,
      cashRefundRef,
      reason,
      notes,
    } = params;

    const nowIso = new Date().toISOString();
    const dateStamp = nowIso.slice(0, 10).replace(/-/g, '');
    const suffix = Date.now().toString().slice(-4);
    const returnNumber = `RET-${dateStamp}-${suffix}`;
    const creditNoteNumber = `CN-${dateStamp}-${suffix}`;

    const totalRefundAmount = items.reduce((s, it) => s + (Number(it.refundSubtotal) || 0), 0);
    const restockedTotalUnits = items.reduce((s, it) => s + (it.addedBackToStock ? it.quantityReturned : 0), 0);
    const damagedTotalUnits = items.reduce((s, it) => s + (!it.addedBackToStock ? it.quantityReturned : 0), 0);

    let cleanCashRefund = Math.max(0, Number(cashRefundAmount) || 0);
    let creditIssuedAmount = 0;
    let debtReducedAmount = 0;

    if (refundMode === 'cash' || refundMode === 'mpesa') {
      cleanCashRefund = totalRefundAmount;
    } else if (refundMode === 'store_deposit') {
      cleanCashRefund = 0;
      creditIssuedAmount = totalRefundAmount;
    } else if (refundMode === 'debt_offset') {
      cleanCashRefund = 0;
      debtReducedAmount = Math.min(Math.max(0, customer.currentBalanceDue || 0), totalRefundAmount);
      creditIssuedAmount = Math.max(0, totalRefundAmount - debtReducedAmount);
    } else if (refundMode === 'partial_cash_and_credit') {
      cleanCashRefund = Math.min(totalRefundAmount, cleanCashRefund);
      creditIssuedAmount = Math.max(0, totalRefundAmount - cleanCashRefund);
    }

    // 1. Restore active inventory ONLY for items marked 'resellable' (addedBackToStock === true)
    const restockMap = new Map<string, number>();
    items.forEach((it) => {
      if (it.addedBackToStock && it.quantityReturned > 0) {
        restockMap.set(it.productId, (restockMap.get(it.productId) || 0) + it.quantityReturned);
      }
    });

    const enrichedItems: CustomerReturnItem[] = items.map((it) => {
      const prod = productsRef.current.find((p) => p.id === it.productId);
      const before = prod ? prod.stockQuantity : it.stockBeforeReturn ?? 0;
      const added = it.addedBackToStock ? it.quantityReturned : 0;
      return {
        ...it,
        stockBeforeReturn: before,
        stockAfterReturn: before + added,
      };
    });

    const updatedProductsToSync: Product[] = [];
    if (restockMap.size > 0) {
      const activeBranchKey = effectiveCloudStoreId || activeStoreId;
      setProducts((prev) =>
        prev.map((prod) => {
          const addQty = restockMap.get(prod.id);
          if (!addQty) return prod;
          const nextQty = (Number(prod.stockQuantity) || 0) + addQty;
          const updatedStoreStock =
            prod.storeStock && activeBranchKey
              ? { ...prod.storeStock, [activeBranchKey]: (prod.storeStock[activeBranchKey] || 0) + addQty }
              : prod.storeStock;
          const nextProd: Product = {
            ...prod,
            stockQuantity: nextQty,
            stock: typeof prod.stock === 'number' ? prod.stock + addQty : nextQty,
            storeStock: updatedStoreStock,
            updatedAt: nowIso,
          };
          updatedProductsToSync.push(nextProd);
          return nextProd;
        })
      );
    }

    // 2. Update Original Transaction return reconciliation
    const prevReturned = Number(transaction.returnedAmount) || 0;
    const newReturnedTotal = Math.min(transaction.grandTotal, prevReturned + totalRefundAmount);
    const updatedOriginalTx: Transaction = {
      ...transaction,
      returnedAmount: newReturnedTotal,
      returnStatus: newReturnedTotal >= transaction.grandTotal - 0.01 ? 'Full Return' : 'Partial Return',
      creditNoteRef: creditNoteNumber,
      balanceDue: Math.max(0, (Number(transaction.balanceDue) || 0) - debtReducedAmount),
      updatedAt: nowIso,
    };
    setTransactions((prev) =>
      prev.map((t) => (t.id === transaction.id ? updatedOriginalTx : t))
    );

    // 3. Update Customer Balance Due & Deposit Wallet
    const latestCust = customersRef.current.find((c) => c.id === customer.id) || customer;
    const updatedCustomer: Customer = {
      ...latestCust,
      currentBalanceDue: Math.max(0, (latestCust.currentBalanceDue || 0) - debtReducedAmount),
      depositBalance: (latestCust.depositBalance || 0) + creditIssuedAmount,
      updatedAt: nowIso,
    };
    setCustomers((prev) => prev.map((c) => (c.id === customer.id ? updatedCustomer : c)));

    // 4. Create Return & Credit Note Record
    const isEtims = Boolean(transaction.isEtimsRequested || transaction.cuin);
    const returnRecord: CustomerReturnRecord = {
      id: `ret-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      returnNumber,
      creditNoteNumber,
      originalTransactionId: transaction.id,
      originalReceiptNumber: transaction.receiptNumber,
      originalCuin: transaction.cuin,
      isEtimsCreditNote: isEtims,
      creditNoteCuin: isEtims ? `CN-CUIN-2026-${Math.floor(100000 + Math.random() * 900000)}` : undefined,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerKraPin: customer.kraPin || transaction.customerKraPin,
      items: enrichedItems,
      totalRefundAmount,
      refundMode,
      cashRefundAmount: cleanCashRefund,
      cashRefundChannel: cleanCashRefund > 0 ? (cashRefundChannel || (refundMode === 'mpesa' ? 'mpesa' : 'cash')) : undefined,
      cashRefundRef: cashRefundRef?.trim() || undefined,
      creditIssuedAmount,
      debtReducedAmount,
      restockedTotalUnits,
      damagedTotalUnits,
      reason: reason.trim(),
      notes: notes?.trim() || undefined,
      processedBy: `${currentUser.name} (${currentUser.role})`,
      date: nowIso,
      updatedAt: nowIso,
    };
    setCustomerReturns((prev) => [returnRecord, ...prev]);

    // 5. Log store deposit wallet credit entry if refund went into Deposit Wallet
    let refundDepositRecord: CustomerDepositRecord | null = null;
    if (creditIssuedAmount > 0) {
      refundDepositRecord = {
        id: `dep-ret-${Date.now()}`,
        receiptRef: creditNoteNumber,
        type: 'refund_credit',
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        amount: creditIssuedAmount,
        paymentMethod: 'store_credit',
        referenceNo: returnNumber,
        linkedTransactionId: transaction.id,
        linkedReceiptNumber: transaction.receiptNumber,
        balanceAfterDebt: updatedCustomer.currentBalanceDue,
        depositBalanceAfter: updatedCustomer.depositBalance,
        notes: `Store credit issued from ${returnNumber} (${reason})`,
        recordedBy: `${currentUser.name} (${currentUser.role})`,
        date: nowIso,
        updatedAt: nowIso,
      };
      setCustomerDeposits((prev) => [refundDepositRecord!, ...prev]);
    }

    // 6. Log CASH_OUT entry if cash or M-Pesa was paid back to customer
    if (cleanCashRefund > 0) {
      const cashOutEntry: CashTransaction = {
        id: `cash-out-${Date.now()}`,
        type: 'CASH_OUT',
        category: 'Customer Return Refund',
        amount: cleanCashRefund,
        date: nowIso,
        sourceDestination: customer.name,
        referenceNo: cashRefundRef?.trim() || returnNumber,
        paymentMethod: (cashRefundChannel || refundMode) === 'mpesa' ? 'mpesa' : 'cash',
        description: `Customer goods return refund (${returnNumber} / ${creditNoteNumber}) for receipt ${transaction.receiptNumber}`,
        recordedBy: `${currentUser.name} (${currentUser.role})`,
        status: 'Completed',
        notes: `${restockedTotalUnits} unit(s) restored to stock, ${damagedTotalUnits} unit(s) marked damaged.`,
      };
      setCashTransactions((prev) => [cashOutEntry, ...prev]);
    }

    // 7. Immutable Sensitive Audit Log for Stock Restoration / Write-Off
    const auditLog = buildSensitiveActionLog({
      actionType: 'CUSTOMER_RETURN',
      actionTitle: `Customer Return ${returnNumber} (${creditNoteNumber})`,
      user: currentUser,
      authorizingRole: currentUser.role,
      targetId: returnRecord.id,
      targetName: `${customer.name} — ${transaction.receiptNumber}`,
      details: {
        summary: `Refunded KSh ${totalRefundAmount.toLocaleString()} (${refundMode}). Stock added back: +${restockedTotalUnits} unit(s); Damaged/Quarantined: ${damagedTotalUnits} unit(s).`,
        metadata: {
          returnNumber,
          creditNoteNumber,
          restockedTotalUnits,
          damagedTotalUnits,
          items: enrichedItems.map((i) => ({
            productName: i.productName,
            qtyReturned: i.quantityReturned,
            condition: i.restockCondition,
            stockBefore: i.stockBeforeReturn,
            stockAfter: i.stockAfterReturn,
          })),
        },
      },
      reason,
      severity: 'high',
    });
    handleRecordAuditLog(auditLog);

    // 8. Sync to Cloud or Pending Queue
    if (!canAutoSyncCloud()) {
      addPendingSyncItem({ type: 'customer_return', description: `Return ${returnNumber}`, data: returnRecord });
      addPendingSyncItem({ type: 'sale', description: `Return Update: ${updatedOriginalTx.receiptNumber}`, data: updatedOriginalTx });
      addPendingSyncItem({ type: 'customer', description: `Customer Return: ${updatedCustomer.name}`, data: updatedCustomer });
      if (refundDepositRecord) {
        addPendingSyncItem({ type: 'customer_deposit', description: `Refund Credit: ${customer.name}`, data: refundDepositRecord });
      }
      updatedProductsToSync.forEach((p) =>
        addPendingSyncItem({ type: 'product', description: `Return Restock: ${p.name} (+stock)`, data: p })
      );
    } else {
      saveCustomerReturnToCloud(returnRecord).catch(() =>
        addPendingSyncItem({ type: 'customer_return', description: `Return ${returnNumber}`, data: returnRecord })
      );
      saveTransactionToCloud(updatedOriginalTx).catch(() =>
        addPendingSyncItem({ type: 'sale', description: `Return Update: ${updatedOriginalTx.receiptNumber}`, data: updatedOriginalTx })
      );
      saveCustomerToCloud(updatedCustomer).catch(() =>
        addPendingSyncItem({ type: 'customer', description: `Customer Return: ${updatedCustomer.name}`, data: updatedCustomer })
      );
      if (refundDepositRecord) {
        saveCustomerDepositToCloud(refundDepositRecord).catch(() =>
          addPendingSyncItem({ type: 'customer_deposit', description: `Refund Credit: ${customer.name}`, data: refundDepositRecord })
        );
      }
      if (updatedProductsToSync.length > 0) {
        batchSaveProductsToCloud(updatedProductsToSync).catch(() =>
          updatedProductsToSync.forEach((p) =>
            addPendingSyncItem({ type: 'product', description: `Return Restock: ${p.name}`, data: p })
          )
        );
      }
    }

    return returnRecord;
  };

  const handleSaveCustomerComplaint = (complaint: CustomerComplaint) => {
    const nowIso = new Date().toISOString();
    const stamped: CustomerComplaint = {
      ...complaint,
      updatedAt: nowIso,
    };
    setCustomerComplaints((prev) => {
      const idx = prev.findIndex((c) => c.id === stamped.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = stamped;
        return copy;
      }
      return [stamped, ...prev];
    });
    if (!canAutoSyncCloud()) {
      addPendingSyncItem({
        type: 'customer_complaint',
        description: `Complaint ${stamped.complaintNumber}`,
        data: stamped,
      });
    } else {
      saveCustomerComplaintToCloud(stamped).catch(() => {
        addPendingSyncItem({
          type: 'customer_complaint',
          description: `Complaint ${stamped.complaintNumber}`,
          data: stamped,
        });
      });
    }
  };

  const handleRecordSupplierPayment = (
    supplierId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    reference?: string,
    notes?: string
  ) => {
    let supplierName = 'Supplier';
    const nowIso = new Date().toISOString();
    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id === supplierId) {
          supplierName = s.name;
          const newBalance = Math.max(0, (s.currentBalanceDue || 0) - amount);
          return {
            ...s,
            currentBalanceDue: newBalance,
            updatedAt: nowIso,
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
      if (canAutoSyncCloud()) {
        uniqueNew.forEach((c) => saveCustomerToCloud(c).catch(() => {}));
      } else {
        uniqueNew.forEach((c) => addPendingSyncItem({ type: 'customer', description: `Import Customer: ${c.name}`, data: c }));
      }
      return [...prev, ...uniqueNew];
    });
  };

  const handleImportSuppliers = (newSuppliers: Supplier[]) => {
    setSuppliers((prev) => {
      const existingNames = new Set(prev.map((s) => s.name.toLowerCase().trim()));
      const uniqueNew = newSuppliers.filter((s) => !existingNames.has(s.name.toLowerCase().trim()));
      if (canAutoSyncCloud()) {
        uniqueNew.forEach((s) => saveSupplierToCloud(s).catch(() => {}));
      } else {
        uniqueNew.forEach((s) => addPendingSyncItem({ type: 'supplier', description: `Import Supplier: ${s.name}`, data: s }));
      }
      return [...prev, ...uniqueNew];
    });
  };

  const handleSaveProduct = (prod: Product) => {
    const existing = products.find((p) => p.id === prod.id);
    const nowIso = new Date().toISOString();
    const stampedProd: Product = {
      ...prod,
      createdAt: prod.createdAt || existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    const performSave = (authorizingRole?: Role, reason?: string) => {
      unmarkProductDeletedLocally(stampedProd.id);
      if (stampedProd.imageUrl && stampedProd.imageUrl.trim() !== '') {
        saveProductImageToIndexedDB(stampedProd.id, stampedProd.imageUrl);
      }
      setProducts((prev) => {
        const idx = prev.findIndex((p) => p.id === stampedProd.id);
        if (idx > -1) {
          const copy = [...prev];
          copy[idx] = stampedProd;
          return copy;
        }
        return [stampedProd, ...prev];
      });

      // Real-Time Cloud Sync to Firestore (with pending queue safety so snapshots never revert unsynced edits)
      if (!canAutoSyncCloud()) {
        addPendingSyncItem({
          type: 'product',
          description: `Product: ${stampedProd.name} (${stampedProd.stockQuantity} ${stampedProd.unit})`,
          data: stampedProd,
        });
      } else {
        saveProductToCloud(stampedProd).catch(() => {
          addPendingSyncItem({
            type: 'product',
            description: `Product: ${stampedProd.name} (${stampedProd.stockQuantity} ${stampedProd.unit})`,
            data: stampedProd,
          });
        });
      }

      if (existing && authorizingRole) {
        const diff = computeProductDiff(existing, stampedProd);
        const diffKeys = Object.keys(diff);
        const diffSummary = diffKeys.map(
          (k) => `${k}: ${existing[k as keyof Product]} → ${stampedProd[k as keyof Product]}`
        );

        const log = buildSensitiveActionLog({
          actionType: 'MODIFY_INVENTORY',
          actionTitle: `Modified Product: ${stampedProd.name}`,
          user: currentUser,
          authorizingRole,
          targetId: stampedProd.id,
          targetName: stampedProd.name,
          details: {
            summary: diffSummary.length > 0
              ? `Updated ${diffSummary.join(', ')} on ${stampedProd.name}`
              : `Updated catalog attributes for ${stampedProd.name}`,
            before: existing,
            after: stampedProd,
            diff,
          },
          reason,
          severity: 'high',
        });
        handleRecordAuditLog(log);
      }
    };

    if (existing) {
      const diff = computeProductDiff(existing, stampedProd);
      const diffKeys = Object.keys(diff);
      if (diffKeys.length > 0) {
        const qualifyingRoles = getQualifyingRolesForAction(currentUser, 'MODIFY_INVENTORY');
        const userRoles = getUserRoles(currentUser);

        if (qualifyingRoles.length > 1 || userRoles.length > 1) {
          const diffSummary = diffKeys.map(
            (k) => `${k}: ${existing[k as keyof Product]} → ${stampedProd[k as keyof Product]}`
          );

          setRoleAuthRequest({
            actionType: 'MODIFY_INVENTORY',
            actionTitle: `Modify Product: ${stampedProd.name}`,
            targetId: stampedProd.id,
            targetName: stampedProd.name,
            qualifyingRoles: qualifyingRoles.length > 0 ? qualifyingRoles : userRoles,
            user: currentUser,
            diffSummary,
            metadata: { before: existing, after: stampedProd },
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
    const nowIso = new Date().toISOString();
    const stampedImports = importedProducts.map((p) => {
      unmarkProductDeletedLocally(p.id);
      if (p.imageUrl && p.imageUrl.trim() !== '') {
        saveProductImageToIndexedDB(p.id, p.imageUrl);
      }
      return {
        ...p,
        createdAt: p.createdAt || nowIso,
        updatedAt: nowIso,
      };
    });

    let removedProductIds: string[] = [];

    if (replaceExisting) {
      const keptIds = new Set(stampedImports.map((p) => p.id));
      removedProductIds = (productsRef.current || [])
        .map((p) => p.id)
        .filter((id) => id && !keptIds.has(id));
      if (removedProductIds.length > 0) {
        markProductsDeletedLocally(removedProductIds);
        removedProductIds.forEach((pid) => {
          clearPendingSyncItemsForRecord('product', pid);
          deleteProductImageFromIndexedDB(pid);
        });
      }
      productsRef.current = stampedImports;
      setProducts(stampedImports);
    } else {
      setProducts((prev) => {
        const existingBarcodes = new Set(prev.map((p) => p.barcode.toLowerCase()));
        const existingSkus = new Set(prev.map((p) => p.sku.toLowerCase()));

        const newUnique = stampedImports.filter(
          (p) => !existingBarcodes.has(p.barcode.toLowerCase()) && !existingSkus.has(p.sku.toLowerCase())
        );
        const nextList = [...newUnique, ...prev];
        productsRef.current = nextList;
        return nextList;
      });
    }

    // Sync imported products (and any removed IDs on replaceExisting) to Firestore cloud catalog
    if (!canAutoSyncCloud()) {
      stampedImports.forEach((p) =>
        addPendingSyncItem({
          type: 'product',
          description: `Imported Product: ${p.name}`,
          data: p,
        })
      );
      removedProductIds.forEach((pid) =>
        addPendingSyncItem({
          type: 'product',
          description: `Delete Replaced/Duplicate Product: ${pid}`,
          data: { id: pid, _deleted: true },
        })
      );
    } else {
      bulkUploadProductsToCloud(stampedImports, undefined, effectiveCloudStoreId || undefined).catch(() => {
        stampedImports.forEach((p) =>
          addPendingSyncItem({
            type: 'product',
            description: `Imported Product: ${p.name}`,
            data: p,
          })
        );
      });
      if (removedProductIds.length > 0) {
        batchDeleteProductsFromCloud(removedProductIds, effectiveCloudStoreId || undefined).catch(() => {
          removedProductIds.forEach((pid) =>
            addPendingSyncItem({
              type: 'product',
              description: `Delete Replaced/Duplicate Product: ${pid}`,
              data: { id: pid, _deleted: true },
            })
          );
        });
      }
    }
  };

  const handleBatchUpdateProducts = async (updatedProducts: Product[], summaryLabel?: string) => {
    if (!updatedProducts || updatedProducts.length === 0) return;
    const nowIso = new Date().toISOString();
    const deletedCats: string[] = safeGetJSON('retail_pos_deleted_categories', []);
    const assignedCats = new Set(
      updatedProducts.map((p) => (p.category || '').trim().toLowerCase()).filter(Boolean)
    );
    if (deletedCats.some((dc) => assignedCats.has(dc))) {
      safeSetJSON(
        'retail_pos_deleted_categories',
        deletedCats.filter((dc) => !assignedCats.has(dc))
      );
    }

    const stampedUpdates = updatedProducts.map((p) => {
      unmarkProductDeletedLocally(p.id);
      return {
        ...p,
        updatedAt: nowIso,
      };
    });

    const updatedMap = new Map(stampedUpdates.map((p) => [p.id, p]));
    setProducts((prev) => prev.map((p) => updatedMap.get(p.id) || p));

    if (!canAutoSyncCloud()) {
      stampedUpdates.forEach((p) =>
        addPendingSyncItem({
          type: 'product',
          description: `Bulk Edit: ${p.name}`,
          data: p,
        })
      );
    } else {
      try {
        await batchSaveProductsToCloud(stampedUpdates);
      } catch {
        stampedUpdates.forEach((p) =>
          addPendingSyncItem({
            type: 'product',
            description: `Bulk Edit: ${p.name}`,
            data: p,
          })
        );
      }
    }

    const qualifyingRoles = getQualifyingRolesForAction(currentUser, 'MODIFY_INVENTORY');
    const userRoles = getUserRoles(currentUser);
    const authorizingRole = qualifyingRoles[0] || userRoles[0] || 'Admin';

    const log = buildSensitiveActionLog({
      actionType: 'MODIFY_INVENTORY',
      actionTitle: `Bulk Edit: ${stampedUpdates.length} Products Updated`,
      user: currentUser,
      authorizingRole,
      details: {
        summary: summaryLabel
          ? `Batch updated ${stampedUpdates.length} product(s): ${summaryLabel}`
          : `Batch updated ${stampedUpdates.length} product(s)`,
        metadata: {
          updatedCount: stampedUpdates.length,
          productIds: stampedUpdates.slice(0, 50).map((p) => p.id),
          summary: summaryLabel || '',
        },
      },
      severity: 'high',
    });
    handleRecordAuditLog(log);
  };

  const handleDeleteProduct = (productId: string) => {
    const existing = products.find((p) => p.id === productId);
    const qualifyingRoles = getQualifyingRolesForAction(currentUser, 'DELETE_PRODUCT');
    const userRoles = getUserRoles(currentUser);

    const performDelete = (authorizingRole: Role, reason?: string) => {
      markProductDeletedLocally(productId);
      clearPendingSyncItemsForRecord('product', productId);
      deleteProductImageFromIndexedDB(productId);
      setProducts((prev) => {
        const nextList = prev.filter((p) => p.id !== productId);
        productsRef.current = nextList;
        return nextList;
      });

      if (!canAutoSyncCloud()) {
        addPendingSyncItem({
          type: 'product',
          description: `Delete Product: ${existing?.name || productId}`,
          data: { id: productId, _deleted: true },
        });
      } else {
        deleteProductFromCloud(productId, effectiveCloudStoreId || undefined).catch(() => {
          addPendingSyncItem({
            type: 'product',
            description: `Delete Product: ${existing?.name || productId}`,
            data: { id: productId, _deleted: true },
          });
        });
      }

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

  const handleBatchDeleteProducts = async (productIds: string[], summaryLabel?: string): Promise<void> => {
    const uniqueIds = Array.from(new Set((productIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
    if (uniqueIds.length === 0) return;

    const idSet = new Set(uniqueIds);
    const removedItems = (productsRef.current || []).filter((p) => idSet.has(p.id));
    const qualifyingRoles = getQualifyingRolesForAction(currentUser, 'DELETE_PRODUCT');
    const userRoles = getUserRoles(currentUser);

    const executeBatchDelete = async (authorizingRole: Role, reason?: string) => {
      markProductsDeletedLocally(uniqueIds);
      uniqueIds.forEach((pid) => {
        clearPendingSyncItemsForRecord('product', pid);
        deleteProductImageFromIndexedDB(pid);
      });

      setProducts((prev) => {
        const nextList = prev.filter((p) => !idSet.has(p.id));
        productsRef.current = nextList;
        return nextList;
      });

      if (!canAutoSyncCloud()) {
        uniqueIds.forEach((pid) => {
          const itemName = removedItems.find((p) => p.id === pid)?.name || pid;
          addPendingSyncItem({
            type: 'product',
            description: `Delete Product: ${itemName}`,
            data: { id: pid, _deleted: true },
          });
        });
      } else {
        try {
          await batchDeleteProductsFromCloud(uniqueIds, effectiveCloudStoreId || undefined);
        } catch {
          uniqueIds.forEach((pid) => {
            const itemName = removedItems.find((p) => p.id === pid)?.name || pid;
            addPendingSyncItem({
              type: 'product',
              description: `Delete Product: ${itemName}`,
              data: { id: pid, _deleted: true },
            });
          });
        }
      }

      const log = buildSensitiveActionLog({
        actionType: 'DELETE_PRODUCT',
        actionTitle: summaryLabel || `Batch Deleted ${uniqueIds.length} Product(s)`,
        user: currentUser,
        authorizingRole,
        details: {
          summary: summaryLabel || `Deleted ${uniqueIds.length} product(s) from store catalog`,
          metadata: {
            deletedCount: uniqueIds.length,
            deletedIds: uniqueIds.slice(0, 50),
            names: removedItems.slice(0, 20).map((p) => p.name),
          },
        },
        reason,
        severity: 'critical',
      });
      handleRecordAuditLog(log);
    };

    if (qualifyingRoles.length > 1 || userRoles.length > 1) {
      return new Promise<void>((resolve) => {
        setRoleAuthRequest({
          actionType: 'DELETE_PRODUCT',
          actionTitle: summaryLabel || `Delete ${uniqueIds.length} Selected Product(s)`,
          targetName: `${uniqueIds.length} catalog item(s)`,
          qualifyingRoles: qualifyingRoles.length > 0 ? qualifyingRoles : userRoles,
          user: currentUser,
          diffSummary: removedItems.slice(0, 6).map((p) => `${p.name} (SKU: ${p.sku || 'N/A'}, Stock: ${p.stockQuantity})`),
          onConfirm: async (selectedRole, reason) => {
            setRoleAuthRequest(null);
            await executeBatchDelete(selectedRole, reason);
            resolve();
          },
          onCancel: () => {
            setRoleAuthRequest(null);
            resolve();
          },
        });
      });
    }

    const singleRole = qualifyingRoles[0] || userRoles[0] || 'Staff';
    await executeBatchDelete(singleRole);
  };

  const handleMergeAndDeleteProducts = async (
    updatedPrimaries: Product[],
    removedProductIds: string[],
    summaryLabel?: string
  ): Promise<void> => {
    const uniqueRemovedIds = Array.from(
      new Set((removedProductIds || []).map((id) => String(id || '').trim()).filter(Boolean))
    );
    const removedSet = new Set(uniqueRemovedIds);
    const nowIso = new Date().toISOString();

    const stampedPrimaries = (updatedPrimaries || [])
      .filter((p) => p && p.id && !removedSet.has(p.id))
      .map((p) => {
        unmarkProductDeletedLocally(p.id);
        if (p.imageUrl && p.imageUrl.trim() !== '') {
          saveProductImageToIndexedDB(p.id, p.imageUrl);
        }
        return {
          ...p,
          updatedAt: nowIso,
        };
      });

    const primaryMap = new Map(stampedPrimaries.map((p) => [p.id, p]));

    if (uniqueRemovedIds.length > 0) {
      markProductsDeletedLocally(uniqueRemovedIds);
      uniqueRemovedIds.forEach((pid) => {
        clearPendingSyncItemsForRecord('product', pid);
        deleteProductImageFromIndexedDB(pid);
      });
    }

    setProducts((prev) => {
      const nextList = prev
        .filter((p) => !removedSet.has(p.id))
        .map((p) => primaryMap.get(p.id) || p);
      productsRef.current = nextList;
      return nextList;
    });

    if (!canAutoSyncCloud()) {
      stampedPrimaries.forEach((p) => {
        addPendingSyncItem({
          type: 'product',
          description: `Merged Primary Product: ${p.name}`,
          data: p,
        });
      });
      uniqueRemovedIds.forEach((pid) => {
        addPendingSyncItem({
          type: 'product',
          description: `Delete Duplicate Product: ${pid}`,
          data: { id: pid, _deleted: true },
        });
      });
    } else {
      if (stampedPrimaries.length > 0) {
        try {
          await batchSaveProductsToCloud(stampedPrimaries, undefined, effectiveCloudStoreId || undefined);
        } catch {
          stampedPrimaries.forEach((p) => {
            addPendingSyncItem({
              type: 'product',
              description: `Merged Primary Product: ${p.name}`,
              data: p,
            });
          });
        }
      }
      if (uniqueRemovedIds.length > 0) {
        try {
          await batchDeleteProductsFromCloud(uniqueRemovedIds, effectiveCloudStoreId || undefined);
        } catch {
          uniqueRemovedIds.forEach((pid) => {
            addPendingSyncItem({
              type: 'product',
              description: `Delete Duplicate Product: ${pid}`,
              data: { id: pid, _deleted: true },
            });
          });
        }
      }
    }

    const qualifyingRoles = getQualifyingRolesForAction(currentUser, 'MODIFY_INVENTORY');
    const userRoles = getUserRoles(currentUser);
    const authorizingRole = qualifyingRoles[0] || userRoles[0] || 'Admin';

    const log = buildSensitiveActionLog({
      actionType: 'MODIFY_INVENTORY',
      actionTitle: summaryLabel || `Merged & Deleted ${uniqueRemovedIds.length} Duplicate Item(s)`,
      user: currentUser,
      authorizingRole,
      details: {
        summary:
          summaryLabel ||
          `Merged ${stampedPrimaries.length} primary product(s) and permanently removed ${uniqueRemovedIds.length} duplicate entry/entries.`,
        metadata: {
          updatedPrimaryCount: stampedPrimaries.length,
          removedCount: uniqueRemovedIds.length,
          removedIds: uniqueRemovedIds.slice(0, 50),
        },
      },
      severity: 'high',
    });
    handleRecordAuditLog(log);
  };

  const handleDeduplicateCatalog = async () => {
    const result = deduplicateProducts(productsRef.current);
    if (result.removedProductsCount <= 0) {
      return result;
    }

    const removedIds = result.groups.flatMap((g) => g.duplicateItems.map((d) => d.id));
    const primaryIds = new Set(result.groups.map((g) => g.primaryItem.id));
    const updatedPrimaries = result.cleanedProducts.filter((p) => primaryIds.has(p.id));

    await handleMergeAndDeleteProducts(
      updatedPrimaries,
      removedIds,
      `Auto-Deleted ${result.removedProductsCount} Duplicate Item(s) & Merged +${result.mergedStockUnitsTotal} Stock`
    );

    return result;
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
    if (canAutoSyncCloud()) {
      saveRestockRecordToCloud(newRestock).catch(() => {
        addPendingSyncItem({ type: 'restock', description: `Restock Batch: ${prod.name}`, data: newRestock });
      });
    } else {
      addPendingSyncItem({ type: 'restock', description: `Restock Batch: ${prod.name}`, data: newRestock });
    }

    const updatedProd: Product = {
      ...prod,
      stockQuantity: prod.stockQuantity + quantityAdded,
      costPrice: unitCost,
      updatedAt: new Date().toISOString()
    };

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? updatedProd : p))
    );
    if (canAutoSyncCloud()) {
      saveProductToCloud(updatedProd).catch(() => {
        addPendingSyncItem({
          type: 'product',
          description: `Restock: ${updatedProd.name} (${updatedProd.stockQuantity} ${updatedProd.unit})`,
          data: updatedProd,
        });
      });
    } else {
      addPendingSyncItem({
        type: 'product',
        description: `Restock: ${updatedProd.name} (${updatedProd.stockQuantity} ${updatedProd.unit})`,
        data: updatedProd,
      });
    }

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
    if (canAutoSyncCloud()) {
      saveExpenseToCloud(restockExp).catch(() => {
        addPendingSyncItem({ type: 'expense', description: `Restock Expense: ${prod.name}`, data: restockExp });
      });
    } else {
      addPendingSyncItem({ type: 'expense', description: `Restock Expense: ${prod.name}`, data: restockExp });
    }
  };

  const handleApplyStockAdjustment = (updatedProducts: Product[], audit: StockCountAudit) => {
    const qualifyingRoles = getQualifyingRolesForAction(currentUser, 'ADJUST_STOCK');
    const userRoles = getUserRoles(currentUser);

    const performAdjustment = (authorizingRole: Role, reason?: string) => {
      const nowIso = new Date().toISOString();
      const adjustedIds = new Set((audit.items || []).map((it) => it.productId));
      const stampedProducts = updatedProducts.map((p) =>
        adjustedIds.has(p.id) ? { ...p, updatedAt: nowIso } : p
      );
      setProducts(stampedProducts);
      const changedItems = stampedProducts.filter((p) => adjustedIds.has(p.id));
      (changedItems.length > 0 ? changedItems : stampedProducts).forEach((p) => {
        if (canAutoSyncCloud()) {
          saveProductToCloud(p).catch(() => {
            addPendingSyncItem({
              type: 'product',
              description: `Stock Adjust: ${p.name}`,
              data: p,
            });
          });
        } else {
          addPendingSyncItem({
            type: 'product',
            description: `Stock Adjust: ${p.name}`,
            data: p,
          });
        }
      });

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

  const handleSingleProductStockAdjust = (productId: string, newQuantity: number, reason: string) => {
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;
    const variance = newQuantity - targetProduct.stockQuantity;
    const updatedProduct = { ...targetProduct, stockQuantity: newQuantity, updatedAt: new Date().toISOString() };
    const updatedProducts = products.map((p) => (p.id === productId ? updatedProduct : p));
    setProducts(updatedProducts);
    if (canAutoSyncCloud()) {
      saveProductToCloud(updatedProduct).catch(() => {
        addPendingSyncItem({
          type: 'product',
          description: `Audit Adjust: ${updatedProduct.name}`,
          data: updatedProduct,
        });
      });
    } else {
      addPendingSyncItem({
        type: 'product',
        description: `Audit Adjust: ${updatedProduct.name}`,
        data: updatedProduct,
      });
    }

    if (auditUrlProduct && auditUrlProduct.id === productId) {
      setAuditUrlProduct(updatedProduct);
    }

    const log = buildSensitiveActionLog({
      actionType: 'ADJUST_STOCK',
      actionTitle: `Single Item Audit Adjust: ${targetProduct.name}`,
      user: currentUser,
      authorizingRole: currentUser.role,
      details: {
        summary: `Store manager physical count adjustment for ${targetProduct.name} from ${targetProduct.stockQuantity} to ${newQuantity} ${targetProduct.unit} (Variance: ${variance > 0 ? `+${variance}` : variance})`,
        metadata: { productId, previousQuantity: targetProduct.stockQuantity, newQuantity, variance },
      },
      reason,
      severity: 'medium',
    });
    handleRecordAuditLog(log);
  };

  const handleAddExpense = (exp: Expense) => {
    const stampedExp: Expense = {
      ...exp,
      updatedAt: exp.updatedAt || new Date().toISOString(),
    };
    setExpenses((prev) => [stampedExp, ...prev]);
    if (!canAutoSyncCloud()) {
      addPendingSyncItem({
        type: 'expense',
        description: `Expense: ${stampedExp.category} (KSh ${stampedExp.amount.toLocaleString()})`,
        data: stampedExp,
      });
    } else {
      saveExpenseToCloud(stampedExp).catch(() => {
        addPendingSyncItem({
          type: 'expense',
          description: `Expense: ${stampedExp.category} (KSh ${stampedExp.amount.toLocaleString()})`,
          data: stampedExp,
        });
      });
    }
  };

  const handleDeleteExpense = (expId: string) => {
    const exp = expenses.find((e) => e.id === expId);
    const qualifyingRoles = getQualifyingRolesForAction(currentUser, 'DELETE_EXPENSE');
    const userRoles = getUserRoles(currentUser);

    const performDelete = (authorizingRole: Role, reason?: string) => {
      setExpenses((prev) => prev.filter((e) => e.id !== expId));
      if (canAutoSyncCloud()) {
        deleteExpenseFromCloud(expId).catch(() => {});
      }

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

  // Multi-Store & Multi-Branch Business Group Handlers
  const handleAddStore = (newStoreData: Omit<StoreLocation, 'id'>) => {
    const newStore: StoreLocation = {
      ...newStoreData,
      id: `store-${Date.now()}`
    };
    setStores((prev) => [...prev, newStore]);
  };

  const handleUpgradeToMultiBranch = async (businessGroupName: string) => {
    if (isClientDemoMode) {
      const cleanName = (businessGroupName || '').trim() || 'Rofani Demo Retail Group';
      setStoreProfile((prev) => (prev ? { ...prev, isMultiBranch: true, businessGroupName: cleanName } : prev));
      setGroupBranches((prev) => {
        const next = prev.map((b) => ({ ...b, isMultiBranch: true, businessGroupName: cleanName }));
        saveCachedGroupBranches(CLIENT_DEMO_STORE_ID, next);
        return next;
      });
      return;
    }
    const primaryId = primaryCloudStoreId || firebaseUser?.uid || OWNER_PRIMARY_STORE_ID;
    const updated = await upgradeStoreToMultiBranchGroup({
      primaryStoreId: primaryId,
      businessGroupName,
      currentProfile: storeProfile,
      fallbackOwnerUid: firebaseUser?.uid || primaryId,
      fallbackOwnerEmail: firebaseUser?.email || storeProfile?.ownerEmail || 'owner@rofanipos.app',
      fallbackStoreName: displayedStoreName,
      fallbackPhone: storeProfile?.phone || currentUser?.phone || '',
    });
    setStoreProfile(updated);
    safeSetJSON('rofani_pos_store_profile', updated);
    setGroupBranches((prev) => {
      const next = [
        updated,
        ...prev
          .filter((b) => b.id !== updated.id)
          .map((b) => ({ ...b, isMultiBranch: true, businessGroupName: updated.businessGroupName })),
      ];
      saveCachedGroupBranches(primaryId, next);
      return next;
    });
  };

  const handleCreateBranchInGroup = async (branchInput: {
    branchName: string;
    branchCode?: string;
    branchCity?: string;
    branchAddress?: string;
    branchPhone?: string;
    branchManagerName?: string;
  }) => {
    if (isClientDemoMode) {
      const nowIso = new Date().toISOString();
      const slug = branchInput.branchName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 18);
      const demoBranchId = `${CLIENT_DEMO_STORE_ID}_br_${slug || Date.now()}`;
      const newDemoBranch: StoreSubscriptionProfile = {
        id: demoBranchId,
        ownerUid: 'demo-owner-uid',
        ownerEmail: 'demo@rofanipos.app',
        storeName: branchInput.branchName.trim(),
        phone: branchInput.branchPhone?.trim() || '+254 734 128 888',
        planType: 'trial',
        subscriptionStatus: 'active',
        expiresAt: new Date(Date.now() + 22 * 86400000).toISOString(),
        referralCode: 'ROFANI-DEMO26',
        isMultiBranch: true,
        businessGroupName: storeProfile?.businessGroupName || 'Rofani Demo Retail Group',
        parentStoreId: CLIENT_DEMO_STORE_ID,
        isBranchStore: true,
        branchCode: branchInput.branchCode || `BR-${groupBranches.length + 1}`,
        branchCity: branchInput.branchCity || 'Nairobi',
        branchAddress: branchInput.branchAddress || 'Branch Outlet',
        branchManagerName: branchInput.branchManagerName || 'Branch Manager',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      try {
        localStorage.setItem(
          resolveTenantStorageKey('retail_pos_products', demoBranchId),
          JSON.stringify(INITIAL_PRODUCTS.slice(0, 24))
        );
        localStorage.setItem(
          resolveTenantStorageKey('retail_pos_transactions', demoBranchId),
          JSON.stringify(buildFreshDemoTransactions().slice(0, 2))
        );
        localStorage.setItem(
          resolveTenantStorageKey('retail_pos_users', demoBranchId),
          JSON.stringify(INITIAL_USERS)
        );
        localStorage.setItem(
          resolveTenantStorageKey('retail_pos_stores', demoBranchId),
          JSON.stringify(buildDemoLocations(newDemoBranch.storeName))
        );
      } catch {}
      setGroupBranches((prev) => {
        const next = [...prev.filter((b) => b.id !== demoBranchId), newDemoBranch];
        saveCachedGroupBranches(CLIENT_DEMO_STORE_ID, next);
        return next;
      });
      return;
    }

    const primaryId = primaryCloudStoreId || firebaseUser?.uid || OWNER_PRIMARY_STORE_ID;
    const ownerUid = firebaseUser?.uid || storeProfile?.ownerUid || primaryId;
    const ownerEmail = (firebaseUser?.email || storeProfile?.ownerEmail || 'owner@rofanipos.app').toLowerCase();
    const adminStaff = allUsers.filter((u) => hasRole(u, 'Admin'));
    const createdBranch = await createBranchStoreInGroup({
      primaryStoreId: primaryId,
      ownerUid,
      ownerEmail,
      businessGroupName: storeProfile?.businessGroupName || displayedStoreName,
      branchName: branchInput.branchName,
      branchCode: branchInput.branchCode,
      branchCity: branchInput.branchCity,
      branchAddress: branchInput.branchAddress,
      branchPhone: branchInput.branchPhone,
      branchManagerName: branchInput.branchManagerName,
      parentProfile: storeProfile,
      defaultStaff: adminStaff.length > 0 ? adminStaff : undefined,
    });
    setGroupBranches((prev) => {
      const base = prev.length > 0 ? prev : storeProfile ? [storeProfile] : [];
      const next = [...base.filter((b) => b.id !== createdBranch.id), createdBranch];
      saveCachedGroupBranches(primaryId, next);
      return next;
    });
  };

  const handleSwitchBranchStore = (targetStoreId: string) => {
    const primaryId = primaryCloudStoreId || firebaseUser?.uid || OWNER_PRIMARY_STORE_ID;
    const isMainBranch = targetStoreId === primaryId;
    const targetBranch = groupBranches.find((b) => b.id === targetStoreId) || storeProfile;
    const nextScope = isMainBranch
      ? isClientDemoMode
        ? CLIENT_DEMO_STORE_ID
        : isOwnerAccount
        ? OWNER_PRIMARY_STORE_ID
        : primaryId
      : targetStoreId;

    setActiveBranchCloudStoreId(isMainBranch ? null : targetStoreId);
    setActiveBranchStoreIdState(isMainBranch ? null : targetStoreId);
    prevTenantScopeRef.current = nextScope;
    reloadAppStateForTenantScope(nextScope, nextScope === OWNER_PRIMARY_STORE_ID, targetBranch);
    if (isClientDemoMode && targetBranch) {
      setStoreProfile(targetBranch);
    }
    if (targetBranch?.storeName) {
      setStores((prev) =>
        prev.map((s, idx) =>
          idx === 0 || s.id === 'store-main' ? { ...s, name: targetBranch.storeName } : s
        )
      );
    }
    setShowMultiBranchModal(false);
  };

  const handleSyncCrossBranchStaff = async (user: User, targetBranchIds: string[]) => {
    if (isClientDemoMode) {
      const updatedUser: User = {
        ...user,
        assignedBranchIds: targetBranchIds,
        updatedAt: new Date().toISOString(),
      };
      setAllUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      if (currentUser.id === updatedUser.id) {
        setCurrentUser(updatedUser);
        safeSetJSON('retail_pos_active_user', updatedUser);
      }
      return;
    }

    const allBranchIds =
      groupBranches.length > 0
        ? groupBranches.map((b) => b.id)
        : [primaryCloudStoreId || firebaseUser?.uid || OWNER_PRIMARY_STORE_ID];
    const updatedUser = await syncCrossBranchStaffAssignment({
      user,
      targetBranchIds,
      allBranchIds,
    });
    setAllUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
      safeSetJSON('retail_pos_active_user', updatedUser);
    }
  };

  const handleStartClientDemo = () => {
    try {
      localStorage.setItem(CLIENT_DEMO_MODE_KEY, '1');
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('demo', '1');
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}
    const { mainProfile, branches } = seedClientDemoSandbox();
    setActiveBranchCloudStoreId(null);
    setActiveBranchStoreIdState(null);
    setIsClientDemoMode(true);
    setStoreProfile(mainProfile);
    setGroupBranches(branches);
    prevTenantScopeRef.current = CLIENT_DEMO_STORE_ID;
    reloadAppStateForTenantScope(CLIENT_DEMO_STORE_ID, false, mainProfile);
    setIsTerminalLocked(false);
    setActiveTab('pos');
  };

  const handleResetClientDemo = () => {
    const { mainProfile, branches } = seedClientDemoSandbox();
    setActiveBranchCloudStoreId(null);
    setActiveBranchStoreIdState(null);
    setStoreProfile(mainProfile);
    setGroupBranches(branches);
    prevTenantScopeRef.current = CLIENT_DEMO_STORE_ID;
    reloadAppStateForTenantScope(CLIENT_DEMO_STORE_ID, false, mainProfile);
    setIsTerminalLocked(false);
  };

  const handleExitClientDemo = () => {
    try {
      localStorage.removeItem(CLIENT_DEMO_MODE_KEY);
      clearClientDemoStorage();
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (url.searchParams.has('demo')) {
          url.searchParams.delete('demo');
          window.history.replaceState({}, '', url.toString());
        }
      }
    } catch {}

    setActiveBranchCloudStoreId(null);
    setActiveBranchStoreIdState(null);
    setIsClientDemoMode(false);

    if (firebaseUser && isAuthorizedCloudUser(firebaseUser)) {
      const nextScope = isOwnerCloudUser(firebaseUser)
        ? OWNER_PRIMARY_STORE_ID
        : getStoreIdForUser(firebaseUser) || firebaseUser.uid;
      prevTenantScopeRef.current = nextScope;
      reloadAppStateForTenantScope(nextScope, isOwnerCloudUser(firebaseUser));
    } else if (
      allowOfflineOwnerMode &&
      typeof window !== 'undefined' &&
      localStorage.getItem(VERIFIED_OWNER_CACHE_KEY) === '1'
    ) {
      prevTenantScopeRef.current = OWNER_PRIMARY_STORE_ID;
      reloadAppStateForTenantScope(OWNER_PRIMARY_STORE_ID, true);
    } else {
      prevTenantScopeRef.current = '__unauthenticated__';
      setStoreProfile(null);
      setGroupBranches([]);
    }
  };

  const handleUpdateStoreName = (nextName: string) => {
    const trimmed = (nextName || '').trim();
    const normalizedName = !trimmed || isLegacyRofaniStoreBrand(trimmed) ? 'Rofani POS' : trimmed;
    safeSetJSON('retail_pos_store_name', normalizedName);
    safeSetJSON('rofani_settings_shop_name', normalizedName);
    setStores((prev) =>
      prev.map((s, idx) =>
        s.id === activeStoreId || s.id === 'store-main' || (idx === 0 && s.isMainBranch)
          ? { ...s, name: normalizedName }
          : s
      )
    );
    const targetCloudStoreId = effectiveCloudStoreId || getActiveTenantStoreId();
    if (!activeBranchStoreId || activeBranchStoreId === primaryCloudStoreId) {
      setStoreProfile((prev) => (prev ? { ...prev, storeName: normalizedName } : prev));
    }
    setGroupBranches((prev) =>
      prev.map((b) => (b.id === targetCloudStoreId ? { ...b, storeName: normalizedName } : b))
    );
    if (!isClientDemoMode && targetCloudStoreId && targetCloudStoreId !== '__unauthenticated__' && isAuthorizedCloudUser(firebaseUser)) {
      updateStoreProfileDetails(targetCloudStoreId, { storeName: normalizedName }).catch(() => {});
    }
  };

  const handleSaveBusinessCard = async (nextCard: DigitalBusinessCard) => {
    safeSetJSON(BUSINESS_CARD_STORAGE_KEY, nextCard);
    setStoreProfile((prev) => {
      const updated = prev ? { ...prev, businessCard: nextCard } : prev;
      if (updated) {
        safeSetJSON('rofani_pos_store_profile', updated);
      }
      return updated;
    });
    const targetCloudStoreId = effectiveCloudStoreId || getActiveTenantStoreId();
    if (!isClientDemoMode && targetCloudStoreId && targetCloudStoreId !== '__unauthenticated__' && isAuthorizedCloudUser(firebaseUser)) {
      await updateStoreProfileDetails(targetCloudStoreId, { businessCard: nextCard });
    }
  };

  const handleSelectPreferredLabelSize = (formatId: string) => {
    if (!formatId) return;
    safeSetJSON('retail_pos_print_format_id', formatId);
    setStoreProfile((prev) => {
      const updated = prev ? { ...prev, preferredLabelSizeId: formatId } : prev;
      if (updated) {
        safeSetJSON('rofani_pos_store_profile', updated);
      }
      return updated;
    });
    const targetCloudStoreId = effectiveCloudStoreId || getActiveTenantStoreId();
    if (!isClientDemoMode && targetCloudStoreId && targetCloudStoreId !== '__unauthenticated__' && isAuthorizedCloudUser(firebaseUser)) {
      updateStoreProfileDetails(targetCloudStoreId, { preferredLabelSizeId: formatId }).catch(() => {});
    }
  };

  const handleConfirmBackupEmail = async (nextEmail: string, autoBackupEnabled?: boolean) => {
    const cleanEmail = (nextEmail || '').trim();
    const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
    if (!hasValidEmail && typeof autoBackupEnabled !== 'boolean') return;

    if (hasValidEmail) {
      safeSetJSON('rofani_pos_backup_email', cleanEmail);
    }
    saveBackupSettings({
      ...(hasValidEmail ? { recipientEmail: cleanEmail, recipientEmailConfirmed: true } : {}),
      ...(typeof autoBackupEnabled === 'boolean' ? { enabled: autoBackupEnabled } : {}),
    });
    setBackupBanner((prev) => (prev?.type === 'info' ? null : prev));

    const profilePatch: Partial<StoreSubscriptionProfile> = {
      ...(hasValidEmail ? { backupEmail: cleanEmail, backupEmailConfirmed: true } : {}),
      ...(typeof autoBackupEnabled === 'boolean' ? { emailAutoBackupEnabled: autoBackupEnabled } : {}),
    };

    setStoreProfile((prev) => {
      const updated = prev ? { ...prev, ...profilePatch } : prev;
      if (updated) {
        safeSetJSON('rofani_pos_store_profile', updated);
      }
      return updated;
    });
    const targetCloudStoreId = activeCloudStoreId || getActiveTenantStoreId();
    if (targetCloudStoreId && targetCloudStoreId !== '__unauthenticated__' && isAuthorizedCloudUser(firebaseUser)) {
      await updateStoreProfileDetails(targetCloudStoreId, profilePatch);
    }
  };

  const handleDismissBackupBanner = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    setBackupBanner(null);
    safeSetJSON('rofani_pos_dismissed_backup_banner_date', dateStr);
    dismissBackupBannerForDate(dateStr);
    setStoreProfile((prev) => {
      const updated = prev ? { ...prev, dismissedBackupBannerDate: dateStr } : prev;
      if (updated) {
        safeSetJSON('rofani_pos_store_profile', updated);
      }
      return updated;
    });
    const targetCloudStoreId = activeCloudStoreId || getActiveTenantStoreId();
    if (targetCloudStoreId && targetCloudStoreId !== '__unauthenticated__' && isAuthorizedCloudUser(firebaseUser)) {
      updateStoreProfileDetails(targetCloudStoreId, { dismissedBackupBannerDate: dateStr }).catch(() => {});
    }
  };

  const handleUpdateStore = (updatedStore: StoreLocation) => {
    const cleanName = isLegacyRofaniStoreBrand(updatedStore.name) ? 'Rofani POS' : updatedStore.name.trim();
    const normalizedStore = { ...updatedStore, name: cleanName };
    setStores((prev) => prev.map((s) => (s.id === normalizedStore.id ? normalizedStore : s)));
    if (normalizedStore.id === 'store-main' || normalizedStore.isMainBranch || normalizedStore.id === activeStoreId) {
      safeSetJSON('retail_pos_store_name', cleanName);
      safeSetJSON('rofani_settings_shop_name', cleanName);
      setStoreProfile((prev) => (prev ? { ...prev, storeName: cleanName } : prev));
      const targetCloudStoreId = activeCloudStoreId || getActiveTenantStoreId();
      if (targetCloudStoreId && targetCloudStoreId !== '__unauthenticated__' && isAuthorizedCloudUser(firebaseUser)) {
        updateStoreProfileDetails(targetCloudStoreId, { storeName: cleanName }).catch(() => {});
      }
    }
  };

  const handleDeleteStore = (storeId: string) => {
    setStores((prev) => {
      const remaining = prev.filter((s) => s.id !== storeId);
      if (remaining.length === 0) return prev;
      if (activeStoreId === storeId) {
        setActiveStoreId(remaining[0].id);
      }
      const hasMain = remaining.some((s) => s.isMainBranch);
      if (!hasMain && remaining[0]) {
        remaining[0] = { ...remaining[0], isMainBranch: true };
      }
      return remaining;
    });
  };

  const handleResetDemoStores = () => {
    setStores(INITIAL_STORES);
    setActiveStoreId(INITIAL_STORES[0].id);
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
        // Deduct stock for each product with fresh updatedAt timestamp
        const orderNowIso = new Date().toISOString();
        setProducts((prev) =>
          prev.map((prod) => {
            const itemInOrder = orderObj.items.find((i) => i.product.id === prod.id);
            if (itemInOrder) {
              return {
                ...prod,
                stockQuantity: Math.max(0, prod.stockQuantity - itemInOrder.quantity),
                updatedAt: orderNowIso,
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

  const handleSwitchToBlankRofaniPos = async (options?: {
    alsoClearSalesAndExpenses?: boolean;
  }) => {
    const scope = getActiveTenantStoreId();
    const targetCloudStoreId = activeCloudStoreId || (firebaseUser?.uid ? firebaseUser.uid : '');

    // 1. Persist blank-mode guards so Rofani Electronics sample/legacy catalog never re-seeds
    safeSetJSON('rofani_pos_blank_mode', true);
    if (firebaseUser?.uid) {
      try {
        localStorage.setItem(`rofani_pos_migrated_uid_${firebaseUser.uid}`, '1');
      } catch {}
    }

    // 2. Collect all local & cloud product IDs to permanently purge inventory
    const localIds = (productsRef.current || []).map((p) => p.id).filter(Boolean);
    let cloudIds: string[] = [];
    if (targetCloudStoreId && targetCloudStoreId !== '__unauthenticated__' && isAuthorizedCloudUser(firebaseUser)) {
      try {
        const remoteProds = await fetchProductsFromCloud(targetCloudStoreId);
        cloudIds = remoteProds.map((p) => p.id).filter(Boolean);
      } catch {}
    }
    const allProductIds = Array.from(new Set([...localIds, ...cloudIds]));

    if (allProductIds.length > 0) {
      markProductsDeletedLocally(allProductIds);
      allProductIds.forEach((pid) => {
        clearPendingSyncItemsForRecord('product', pid);
        deleteProductImageFromIndexedDB(pid);
      });
    }

    // 3. Clear local & IndexedDB product catalog immediately
    productsRef.current = [];
    setProducts([]);
    safeSetJSON('retail_pos_products', []);
    saveToIDB(resolveTenantStorageKey('retail_pos_products', scope), []).catch(() => {});

    // 4. Delete cloud products if signed in and online
    if (allProductIds.length > 0 && targetCloudStoreId && targetCloudStoreId !== '__unauthenticated__' && isAuthorizedCloudUser(firebaseUser)) {
      if (canAutoSyncCloud()) {
        try {
          await batchDeleteProductsFromCloud(allProductIds, targetCloudStoreId);
        } catch {
          allProductIds.forEach((pid) => {
            addPendingSyncItem({
              type: 'product',
              description: `Clear Inventory Item: ${pid}`,
              data: { id: pid, _deleted: true },
            });
          });
        }
      } else {
        allProductIds.forEach((pid) => {
          addPendingSyncItem({
            type: 'product',
            description: `Clear Inventory Item: ${pid}`,
            data: { id: pid, _deleted: true },
          });
        });
      }
    }

    // 5. Clear custom shop name everywhere so header & receipts show pure Rofani POS
    const cleanMainStore: StoreLocation = {
      id: 'store-main',
      name: 'Rofani POS',
      code: 'MAIN-01',
      city: 'Nairobi',
      address: 'Main Branch',
      phone: storeProfile?.phone || '',
      isMainBranch: true,
      active: true,
    };
    setStores([cleanMainStore]);
    setActiveStoreId('store-main');
    safeSetJSON('retail_pos_stores', [cleanMainStore]);
    safeSetJSON('retail_pos_active_store_id', 'store-main');
    safeSetJSON('retail_pos_store_name', 'Rofani POS');
    safeSetJSON('rofani_settings_shop_name', 'Rofani POS');

    setStoreProfile((prev) =>
      prev ? { ...prev, storeName: 'Rofani POS', skipLegacySeed: true } : prev
    );
    if (targetCloudStoreId && targetCloudStoreId !== '__unauthenticated__' && isAuthorizedCloudUser(firebaseUser)) {
      await updateStoreProfileDetails(targetCloudStoreId, {
        storeName: 'Rofani POS',
        skipLegacySeed: true,
      }).catch(() => {});
    }

    // 6. Optional full register wipe (sales & expenses)
    if (options?.alsoClearSalesAndExpenses) {
      transactionsRef.current = [];
      setTransactions([]);
      expensesRef.current = [];
      setExpenses([]);
      setCashTransactions([]);
      setRestockRecords([]);
      setPurchaseOrdersState([]);
      setOnlineOrders([]);
      setStockTransfers([]);
    }

    const log = buildSensitiveActionLog({
      actionType: 'DELETE_PRODUCT',
      actionTitle: 'Switched to Clean Rofani POS (No Shop Name & 0 Inventory)',
      user: currentUser,
      authorizingRole: currentUser.role || 'Admin',
      details: {
        summary: `Cleared ${allProductIds.length} inventory item(s) and reset store branding to clean Rofani POS${
          options?.alsoClearSalesAndExpenses ? ' (also cleared sales & expense logs)' : ''
        }.`,
      },
      severity: 'critical',
    });
    handleRecordAuditLog(log);
  };

  const handleResetData = () => {
    const scope = getActiveTenantStoreId();
    const isOwnerScope = scope === OWNER_PRIMARY_STORE_ID;
    safeSetJSON('rofani_pos_blank_mode', false);
    const targetCloudStoreId = activeCloudStoreId || (firebaseUser?.uid ? firebaseUser.uid : '');
    if (targetCloudStoreId && targetCloudStoreId !== '__unauthenticated__' && isAuthorizedCloudUser(firebaseUser)) {
      updateStoreProfileDetails(targetCloudStoreId, { skipLegacySeed: false }).catch(() => {});
    }
    try {
      if (isOwnerScope) {
        const ownerKeys = [
          'retail_pos_products',
          'retail_pos_transactions',
          'pos_store_sales',
          'retail_pos_customers',
          'retail_pos_suppliers',
          'retail_pos_expenses',
          'retail_pos_attendance',
          'retail_pos_cash_transactions',
          'retail_pos_restock_records',
          'retail_pos_purchase_orders',
          'retail_pos_commission_payouts',
          'retail_pos_salary_payouts',
          'retail_pos_worker_loans',
          'retail_pos_financing_facilities',
        ];
        ownerKeys.forEach((k) => localStorage.removeItem(k));
      } else {
        const prefix = `tenant__${scope}__`;
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith(prefix)) {
            localStorage.removeItem(k);
          }
        });
      }
    } catch {}
    setProducts(isOwnerScope ? INITIAL_PRODUCTS : []);
    setCustomers(isOwnerScope ? INITIAL_CUSTOMERS : []);
    setSuppliers(isOwnerScope ? INITIAL_SUPPLIERS : []);
    setExpenses(isOwnerScope ? INITIAL_EXPENSES : []);
    setAttendanceRecords(isOwnerScope ? INITIAL_ATTENDANCE : []);
    setTransactions(isOwnerScope ? INITIAL_TRANSACTIONS : []);
    setCashTransactions(isOwnerScope ? INITIAL_CASH_TRANSACTIONS : []);
  };

  const handleImportData = (imported: any, options?: { mode?: 'merge' | 'replace' }) => {
    const mode = options?.mode === 'replace' ? 'replace' : 'merge';
    try {
      // Save emergency rollback snapshot before importing
      const backupBefore = {
        timestamp: Date.now(),
        products: productsRef.current,
        transactions: transactionsRef.current,
        customers: customersRef.current,
        suppliers: suppliersRef.current,
        expenses: expensesRef.current,
        attendanceRecords,
      };
      safeSetJSON('rofani_pos_pre_import_backup', backupBefore);
      saveToIDB(resolveTenantStorageKey('rofani_pos_pre_import_backup'), backupBefore).catch(() => {});
    } catch {}

    const mergeById = <T extends { id?: any }>(incoming: T[], existing: T[]): T[] => {
      if (mode === 'replace') return [...incoming];
      const merged = [...incoming];
      const seenIds = new Set(
        incoming
          .map((item) => (item && item.id !== undefined && item.id !== null ? String(item.id) : ''))
          .filter(Boolean)
      );
      existing.forEach((item) => {
        const key = item && item.id !== undefined && item.id !== null ? String(item.id) : '';
        if (!key || !seenIds.has(key)) {
          merged.push(item);
        }
      });
      return merged;
    };

    let nextProductsForCloud: Product[] = [];
    let nextSalesForCloud: Transaction[] = [];
    let nextCustomersForCloud: Customer[] = [];
    let nextSuppliersForCloud: Supplier[] = [];
    let nextExpensesForCloud: Expense[] = [];
    let nextUsersForCloud: User[] = [];

    if (Array.isArray(imported.products) && (imported.products.length > 0 || mode === 'replace')) {
      const merged = mergeById<Product>(imported.products, productsRef.current);
      productsRef.current = merged;
      nextProductsForCloud = merged;
      setProducts(merged);
      safeSetJSON('retail_pos_products', merged);
      saveToIDB(resolveTenantStorageKey('retail_pos_products'), merged).catch(() => {});
    }

    if (Array.isArray(imported.categories) && (imported.categories.length > 0 || mode === 'replace')) {
      const mergedCategories: any[] = [...imported.categories];
      if (mode === 'merge') {
        (categories || []).forEach((c: any) => {
          const exists = mergedCategories.some(
            (m: any) =>
              (m?.id && c?.id && m.id === c.id) ||
              (m?.name && c?.name && String(m.name).toLowerCase() === String(c.name).toLowerCase())
          );
          if (!exists) mergedCategories.push(c);
        });
      }
      setCategories(mergedCategories);
      safeSetJSON('retail_pos_categories_v2', mergedCategories);
    }

    if (Array.isArray(imported.transactions) && (imported.transactions.length > 0 || mode === 'replace')) {
      const merged = mergeById<Transaction>(imported.transactions, transactionsRef.current);
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      transactionsRef.current = merged;
      nextSalesForCloud = merged;
      setTransactions(merged);
      safeSetJSON('retail_pos_transactions', merged);
    }

    if (Array.isArray(imported.customers) && (imported.customers.length > 0 || mode === 'replace')) {
      const merged = mergeById<Customer>(imported.customers, customersRef.current);
      customersRef.current = merged;
      nextCustomersForCloud = merged;
      setCustomers(merged);
      safeSetJSON('retail_pos_customers', merged);
    }

    if (Array.isArray(imported.suppliers) && (imported.suppliers.length > 0 || mode === 'replace')) {
      const merged = mergeById<Supplier>(imported.suppliers, suppliersRef.current);
      suppliersRef.current = merged;
      nextSuppliersForCloud = merged;
      setSuppliers(merged);
      safeSetJSON('retail_pos_suppliers', merged);
    }

    if (Array.isArray(imported.expenses) && (imported.expenses.length > 0 || mode === 'replace')) {
      const merged = mergeById<Expense>(imported.expenses, expensesRef.current);
      expensesRef.current = merged;
      nextExpensesForCloud = merged;
      setExpenses(merged);
      safeSetJSON('retail_pos_expenses', merged);
    }

    if (Array.isArray(imported.attendanceRecords) && (imported.attendanceRecords.length > 0 || mode === 'replace')) {
      const merged = mergeById<AttendanceRecord>(imported.attendanceRecords, attendanceRecords);
      setAttendanceRecords(merged);
      safeSetJSON('retail_pos_attendance', merged);
    }

    if (Array.isArray(imported.allUsers) && imported.allUsers.length > 0) {
      const merged = mergeById<User>(imported.allUsers, allUsersRef.current);
      allUsersRef.current = merged;
      nextUsersForCloud = merged;
      setAllUsers(merged);
      safeSetJSON('retail_pos_users', merged);
      safeSetJSON('pos_store_staff_users', merged);
    }

    if (Array.isArray(imported.stores) && imported.stores.length > 0) {
      const merged = mergeById<StoreLocation>(imported.stores, stores);
      setStores(merged);
      safeSetJSON('retail_pos_stores', merged);
    }

    const restoredSettings = imported.storeInfo || imported.storeSettings;
    if (restoredSettings && typeof restoredSettings === 'object') {
      const sName = restoredSettings.storeName || restoredSettings.name;
      if (sName) {
        safeSetJSON('retail_pos_store_name', sName);
        safeSetJSON('rofani_settings_shop_name', sName);
      }
      if (typeof restoredSettings.kraPin === 'string') {
        safeSetJSON('retail_pos_kra_pin', restoredSettings.kraPin);
      }
      if (typeof restoredSettings.phone === 'string') {
        safeSetJSON('retail_pos_store_phone', restoredSettings.phone);
        safeSetJSON('rofani_settings_phone', restoredSettings.phone);
      }
      if (typeof restoredSettings.paybillTillNumber === 'string') {
        safeSetJSON('retail_pos_store_paybill', restoredSettings.paybillTillNumber);
      }
      if (typeof restoredSettings.kraTaxRate === 'number') {
        safeSetJSON('retail_pos_kra_tax_rate', restoredSettings.kraTaxRate);
        safeSetJSON('rofani_settings_tot_rate', restoredSettings.kraTaxRate);
      }
      if (typeof restoredSettings.branchLocation === 'string') {
        safeSetJSON('rofani_settings_branch', restoredSettings.branchLocation);
      }
      if (typeof restoredSettings.receiptFooter === 'string') {
        safeSetJSON('rofani_settings_footer', restoredSettings.receiptFooter);
      }
      if (typeof restoredSettings.enableVat === 'boolean') {
        safeSetJSON('rofani_settings_enable_vat', restoredSettings.enableVat);
      }
      if (typeof restoredSettings.pricingMode === 'string') {
        safeSetJSON('rofani_settings_pricing_mode', restoredSettings.pricingMode);
      }
      if (typeof restoredSettings.currency === 'string') {
        safeSetJSON('rofani_settings_currency', restoredSettings.currency);
      }
      if (typeof restoredSettings.taxMode === 'string') {
        safeSetJSON('rofani_settings_tax_mode', restoredSettings.taxMode);
      }
      if (
        typeof restoredSettings.mpesaShortcode === 'string' ||
        typeof restoredSettings.mpesaStoreNumber === 'string' ||
        typeof restoredSettings.mpesaShortcodeType === 'string'
      ) {
        const existingMpesa = safeGetJSON<any>('rofani_pos_mpesa_config', {});
        safeSetJSON('rofani_pos_mpesa_config', {
          ...existingMpesa,
          ...(typeof restoredSettings.mpesaShortcode === 'string'
            ? { shortcode: restoredSettings.mpesaShortcode }
            : {}),
          ...(typeof restoredSettings.mpesaStoreNumber === 'string'
            ? { storeNumber: restoredSettings.mpesaStoreNumber }
            : {}),
          ...(typeof restoredSettings.mpesaShortcodeType === 'string'
            ? { shortcodeType: restoredSettings.mpesaShortcodeType }
            : {}),
        });
      }
    }

    // Sync restored collections into active Cloud Firestore store (stores/{userId}) when online & verified
    const activeUid = auth.currentUser?.uid;
    if (getIsOnline() && isAuthorizedCloudUser(auth.currentUser) && activeUid) {
      Promise.all([
        nextProductsForCloud.length > 0
          ? batchSaveProductsToCloud(nextProductsForCloud, undefined, activeUid).catch(() => 0)
          : Promise.resolve(0),
        nextSalesForCloud.length > 0
          ? batchSaveTransactionsToCloud(nextSalesForCloud.slice(0, 200), undefined, activeUid).catch(() => 0)
          : Promise.resolve(0),
        nextCustomersForCloud.length > 0
          ? batchSaveCustomersToCloud(nextCustomersForCloud.slice(0, 200), undefined, activeUid).catch(() => 0)
          : Promise.resolve(0),
        nextSuppliersForCloud.length > 0
          ? batchSaveSuppliersToCloud(nextSuppliersForCloud, undefined, activeUid).catch(() => 0)
          : Promise.resolve(0),
        nextExpensesForCloud.length > 0
          ? batchSaveExpensesToCloud(nextExpensesForCloud.slice(0, 100), undefined, activeUid).catch(() => 0)
          : Promise.resolve(0),
        nextUsersForCloud.length > 0
          ? bulkUploadUsersToCloud(nextUsersForCloud, activeUid).catch(() => 0)
          : Promise.resolve(0),
      ]).catch(() => {});
    }
  };

  const handleUpdateTransaction = (updatedTx: Transaction, updatedProducts: Product[]) => {
    const nowIso = new Date().toISOString();
    setTransactions((prev) => {
      const next = prev.map((t) =>
        t.id === updatedTx.id ? { ...updatedTx, editedAt: nowIso, updatedAt: nowIso } : t
      );
      safeSetJSON('retail_pos_transactions', next);
      safeSetJSON('pos_store_sales', next);
      return next;
    });
    setProducts(updatedProducts);
    if (shopControls.alertOnSaleEditDelete) {
      pushActivityAlert(
        'warning',
        'Attendant Edited a Sale',
        `Receipt ${updatedTx.receiptNumber} (KSh ${(updatedTx.grandTotal || 0).toLocaleString()}) was modified by ${currentUser.name}.`
      );
    }
  };

  const handleDeleteTransaction = (txId: string, updatedProducts: Product[]) => {
    const targetTx = transactions.find((t) => t.id === txId);
    setTransactions((prev) => {
      const next = prev.filter((t) => t.id !== txId);
      safeSetJSON('retail_pos_transactions', next);
      safeSetJSON('pos_store_sales', next);
      return next;
    });
    setProducts(updatedProducts);
    if (shopControls.alertOnSaleEditDelete) {
      pushActivityAlert(
        'danger',
        'Attendant Deleted a Sale',
        `Receipt ${targetTx?.receiptNumber || txId}${targetTx ? ` (KSh ${(targetTx.grandTotal || 0).toLocaleString()})` : ''} was deleted by ${currentUser.name}.`
      );
    }
    if (isCloudAuthReady && (effectiveCloudStoreId || firebaseUser?.uid)) {
      deleteTransactionFromCloud(txId, effectiveCloudStoreId || firebaseUser!.uid).catch((err) =>
        console.warn('Cloud delete transaction notice:', err)
      );
    }
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
          onSaveProduct={handleSaveProduct}
          onBatchImportProducts={handleBatchImportProducts}
          inPhoneFrame={deviceFormat === 'phone'}
          onMobileSearchActiveChange={setIsMobileSearchActive}
          onMobileCartOpenChange={setIsMobileCartOpen}
          onMobileCartSummaryChange={setMobileCartSummary}
          externalScanTrigger={externalScanTrigger}
          externalAiScanTrigger={externalAiScanTrigger}
          externalManualBarcodeRequest={externalManualBarcodeRequest}
          externalQuickDiscountRequest={externalQuickDiscountRequest}
          externalClearDiscountTrigger={externalClearDiscountTrigger}
          storeName={displayedStoreName}
          activeStoreId={effectiveCloudStoreId || getActiveTenantStoreId()}
          storeKraPin={storeProfile?.kraPin}
          requirePinOnStartup={requirePinOnStartup}
          expenses={expenses}
          restockRecords={restockRecords}
          onlineOrders={onlineOrders}
          purchaseOrders={purchaseOrders}
          cashTransactions={cashTransactions}
          customerReturns={customerReturns}
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
          onBatchDeleteProducts={handleBatchDeleteProducts}
          onBatchImportProducts={handleBatchImportProducts}
          onBatchUpdateProducts={handleBatchUpdateProducts}
          onMergeAndDeleteProducts={handleMergeAndDeleteProducts}
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
          storeName={stores.find((s) => s.id === activeStoreId)?.name || storeProfile?.storeName || 'Rofani POS'}
          onOpenAiAssistantWithPrompt={(_prompt) => {
            setShowAiAssistantModal(true);
          }}
          restockRecords={restockRecords}
          onAddRestock={handleAddRestockRecord}
          onAdjustStockQuantity={handleSingleProductStockAdjust}
          onOpenItemAuditMiniPage={(prod) => {
            setAuditUrlProduct(prod);
            try {
              const url = new URL(window.location.href);
              url.searchParams.set('itemAudit', prod.id);
              window.history.pushState({}, '', url.toString());
            } catch {}
          }}
          onOpenCategoryManager={() => setShowCategoryManagerModal(true)}
          activeStoreId={effectiveCloudStoreId || getActiveTenantStoreId()}
        />
      )}

      {activeTab === 'purchasing' && (
        <PurchasingView
          purchaseOrders={purchaseOrders}
          setPurchaseOrders={setPurchaseOrders}
          suppliers={suppliers}
          setSuppliers={setSuppliers}
          products={products}
          setProducts={setProducts}
          currentUser={currentUser}
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
          cashTransactions={cashTransactions}
          products={products}
          currentUser={currentUser}
          offers={offers}
          customerDeposits={customerDeposits}
          customerComplaints={customerComplaints}
          customerReturns={customerReturns}
          storeName={displayedStoreName}
          storeKraPin={storeProfile?.kraPin}
          onSaveCustomer={handleSaveCustomer}
          onDeleteCustomer={handleDeleteCustomer}
          onSaveSupplier={handleSaveSupplier}
          onDeleteSupplier={handleDeleteSupplier}
          onRecordCustomerDebtPayment={handleRecordCustomerDebtPayment}
          onRecordCustomerDepositOrPayment={handleRecordCustomerDepositOrPayment}
          onProcessCustomerReturn={handleProcessCustomerReturn}
          onSaveCustomerComplaint={handleSaveCustomerComplaint}
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
          allUsers={allUsers}
          activeStoreId={effectiveCloudStoreId || getActiveTenantStoreId()}
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
          salaryPayouts={salaryPayouts}
          onPaySalary={handlePaySalary}
          onUpdateUserSalarySettings={handleUpdateUserSalarySettings}
          expenses={expenses}
          onAddExpense={handleAddExpense}
          storeName={displayedStoreName}
          activeStoreId={effectiveCloudStoreId || getActiveTenantStoreId()}
        />
      )}

      {activeTab === 'reports' && (
        <ReportsView
          transactions={transactions}
          products={products}
          customers={customers}
          suppliers={suppliers}
          expenses={expenses}
          customerReturns={customerReturns}
          auditLogs={auditLogs}
          onUpdateTransaction={handleUpdateTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          activeStoreId={effectiveCloudStoreId || getActiveTenantStoreId()}
          masterPin={masterPin}
          allUsers={allUsers}
          salaryPayouts={salaryPayouts}
          commissionPayouts={commissionPayouts}
          storeName={displayedStoreName}
          storeKraPin={storeProfile?.kraPin}
          onAddExpense={handleAddExpense}
          inPhoneFrame={deviceFormat === 'phone'}
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
          onAddUser={handleAddUser}
          onUpdateUser={handleUpdateUser}
          onDeleteUser={handleDeleteUser}
          onImportData={handleImportData}
          onDeduplicateProducts={handleDeduplicateCatalog}
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
          onTriggerSync={syncPendingQueueToCloud}
          onPullFromCloud={handlePullFromCloud}
          onEmergencyRestore={handleRestoreEmergencyBackup}
          deviceFormat={deviceFormat}
          onChangeDeviceFormat={setDeviceFormat}
          requirePinOnStartup={requirePinOnStartup}
          onToggleRequirePinOnStartup={handleToggleRequirePinOnStartup}
          masterPin={masterPin}
          onUpdateMasterPin={handleUpdateMasterPin}
          onLockNow={() => setIsTerminalLocked(true)}
          onOpenAuditLogs={() => setActiveTab('auditlogs')}
          stores={stores}
          activeStoreId={effectiveCloudStoreId || getActiveTenantStoreId()}
          activeStoreName={displayedStoreName}
          accountEmail={firebaseUser?.email || storeProfile?.ownerEmail || cachedCloudSession?.email || ''}
          ownerDisplayName={currentUser?.name || firebaseUser?.displayName || ''}
          ownerPhone={activeBranchProfile?.phone || storeProfile?.phone || currentUser?.phone || ''}
          isMultiBranch={Boolean(storeProfile?.isMultiBranch || groupBranches.length > 1)}
          businessGroupName={storeProfile?.businessGroupName || ''}
          branchCount={Math.max(1, groupBranches.length)}
          onOpenMultiBranch={() => setShowMultiBranchModal(true)}
          biometricUnlockEnabled={biometricUnlockEnabled}
          onToggleBiometricUnlock={handleToggleBiometricUnlock}
          onChangePasswordOrPin={handleChangePasswordOrPin}
          onOpenStoreManager={() => setShowStoreManagerModal(true)}
          onOpenCategoryManager={() => setShowCategoryManagerModal(true)}
          lastSyncedTime={lastSyncedTime}
          onCloudSyncSuccess={() => {
            setCloudSyncStatus('synced');
            setLastSyncedTime(new Date().toLocaleTimeString());
          }}
          onCloudSyncError={() =>
            setCloudSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error')
          }
          storeKraPin={storeProfile?.kraPin}
          onUpdateStoreKraPin={async (nextKraPin) => {
            const cleanPin = nextKraPin.trim().toUpperCase();
            if (!cleanPin) return;
            setStoreProfile((prev) => (prev ? { ...prev, kraPin: cleanPin } : prev));
            const targetCloudStoreId = primaryCloudStoreId || getActiveTenantStoreId();
            if (!isClientDemoMode && targetCloudStoreId && isAuthorizedCloudUser(firebaseUser)) {
              await updateStoreProfileDetails(targetCloudStoreId, { kraPin: cleanPin });
            }
          }}
          onUpdateStoreName={handleUpdateStoreName}
          onSwitchToBlankPos={handleSwitchToBlankRofaniPos}
          onOpenShopQrShare={() => setShowShopQrModal(true)}
          onPreview9PmSummary={() => setShow9PmSummaryModal(true)}
          confirmedBackupEmail={storeProfile?.backupEmail || ''}
          backupEmailConfirmed={Boolean(storeProfile?.backupEmailConfirmed)}
          onConfirmBackupEmail={handleConfirmBackupEmail}
        />
      )}

      {activeTab === 'menu' && (
        <AppMenuView
          onSelectTab={(tab) => setActiveTab(tab as any)}
          onOpenCloudSync={() => setShowCloudSyncModal(true)}
          onOpenStoreManager={() => setShowStoreManagerModal(true)}
          onOpenMultiBranch={() => setShowMultiBranchModal(true)}
          isMultiBranch={Boolean(storeProfile?.isMultiBranch || groupBranches.length > 1)}
          businessGroupName={storeProfile?.businessGroupName || ''}
          branchCount={Math.max(1, groupBranches.length)}
          onOpenInstallModal={() => setShowInstallModal(true)}
          onOpenEmailBackup={() => setShowDailyEmailBackupModal(true)}
          onOpenStockAlerts={() => setShowStockAlertModal(true)}
          onOpenAiAssistant={() => setShowAiAssistantModal(true)}
          onOpenBarcodePrinter={() => setShowPrintBarcodesModal(true)}
          onTriggerSync={syncPendingQueueToCloud}
          onSwitchToComputer={() => setDeviceFormat('computer')}
          lowStockCount={lowStockCount}
          storeName={displayedStoreName}
          currentUser={currentUser}
          cloudSyncStatus={cloudSyncStatus}
          inPhoneFrame={deviceFormat === 'phone'}
          isOwnerAccount={isOwnerAccount}
          storeProfile={storeProfile}
          onOpenPlansPricing={() => setShowPlansModal(true)}
          onOpenSuperAdmin={() => setShowSuperAdminModal(true)}
          onOpenAboutUs={() => setActiveTab('about')}
          onOpenShopQrShare={() => setShowShopQrModal(true)}
          onOpenDigitalBusinessCard={() => setShowBusinessCardModal(true)}
          onOpenSuggestFeature={() => setShowSuggestFeatureModal(true)}
          onSignOutCloud={async () => {
            setAllowOfflineOwnerMode(false);
            setActiveBranchCloudStoreId(null);
            setActiveBranchStoreIdState(null);
            setGroupBranches([]);
            await signOutFromCloud();
          }}
          cloudUserEmail={firebaseUser?.email}
          isClientDemoMode={isClientDemoMode}
          onStartClientDemo={handleStartClientDemo}
          onExitClientDemo={handleExitClientDemo}
        />
      )}

      {activeTab === 'about' && (
        <AboutUsView
          onBack={() => setActiveTab(deviceFormat === 'phone' ? 'menu' : 'pos')}
          onOpenPlansPricing={() => setShowPlansModal(true)}
          onOpenAiAssistant={() => setShowAiAssistantModal(true)}
          onOpenSuggestFeature={() => setShowSuggestFeatureModal(true)}
          onStartClientDemo={!isClientDemoMode ? handleStartClientDemo : undefined}
          inPhoneFrame={deviceFormat === 'phone'}
        />
      )}
    </>
    );
  };

  const hasCachedOwnerAccess =
    typeof window !== 'undefined' &&
    localStorage.getItem(VERIFIED_OWNER_CACHE_KEY) === '1';
  const hasCachedVerifiedSession =
    hasCachedOwnerAccess || Boolean(cachedCloudSession?.uid) || Boolean(storeProfile);

  // Instant Local-First Startup: if a cached verified session exists, open the POS immediately (<100ms)
  // while Firebase Auth & Firestore connect quietly in the background (max 3s check for new users).
  if (!isClientDemoMode && !isFirebaseAuthReady && !hasCachedVerifiedSession) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-7 h-7 text-sky-400 animate-spin" />
          <p className="text-xs text-slate-400 font-semibold tracking-wide">
            Connecting to Rofani POS Cloud...
          </p>
        </div>
      </div>
    );
  }

  // Never log out an active cached session just because the 3s Firebase Auth hydration timer fired early.
  // Only show MerchantAuthScreen when Firebase Auth has genuinely settled as signed-out (or for unauthenticated cold starts).
  const isWaitingForCachedAuthHydration = !hasAuthSettledFromFirebase && hasCachedVerifiedSession;
  if (
    !isClientDemoMode &&
    isFirebaseAuthReady &&
    !isWaitingForCachedAuthHydration &&
    !isAuthorizedCloudUser(firebaseUser) &&
    !allowOfflineOwnerMode
  ) {
    return (
      <MerchantAuthScreen
        hasOfflineOwnerCache={hasCachedOwnerAccess}
        initialReferralCode={pendingReferralCode}
        onReferralCodeChange={updatePendingReferralCode}
        onStartClientDemo={handleStartClientDemo}
        onContinueOfflineOwner={() => {
          setActiveTenantStoreId(OWNER_PRIMARY_STORE_ID);
          setAllowOfflineOwnerMode(true);
        }}
      />
    );
  }

  if (isAuthorizedCloudUser(firebaseUser) && !isOwnerAccount && isCheckingStoreProfile && !storeProfile) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="bg-[#1e293b] border border-slate-700/80 rounded-2xl p-6 flex flex-col items-center gap-3 shadow-xl">
          <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
          <p className="text-sm font-bold text-white">Setting Up Store Workspace...</p>
          <p className="text-xs text-slate-400">Checking your cloud store profile</p>
        </div>
      </div>
    );
  }

  if (isAuthorizedCloudUser(firebaseUser) && !isOwnerAccount && !isCheckingStoreProfile && !storeProfile) {
    return (
      <StoreOnboardingModal
        userEmail={firebaseUser?.email || ''}
        userDisplayName={firebaseUser?.displayName || undefined}
        initialReferralCode={pendingReferralCode}
        onCreateStore={async (formData) => {
          if (!firebaseUser?.uid || !firebaseUser?.email) {
            throw new Error('Verified Google session is required.');
          }
          const created = await createMerchantStoreProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || undefined,
            storeName: formData.storeName,
            phone: formData.phone,
            kraPin: formData.kraPin,
            mpesaShortcode: formData.mpesaShortcode,
            mpesaShortcodeType: formData.mpesaShortcodeType,
            referralCode: formData.referralCode || pendingReferralCode,
          });
          updatePendingReferralCode('');
          setStoreProfile(created);
          safeSetJSON('rofani_pos_store_profile', created);
          safeSetJSON('rofani_settings_tax_mode', created.taxMode || 'none');
          safeSetJSON('rofani_settings_enable_vat', false);
          if (created.referredBy) {
            setReferralRewardToast({
              kind: 'welcome',
              message: `🎁 Welcome Bonus! Referred by ${created.referredByStoreName || 'a fellow merchant'} — 22 Days Free unlocked!`,
              subtext: `You received +15 extra free trial days on top of the 7-day standard trial.`,
            });
          }
          setStores([
            {
              id: 'store-main',
              name: created.storeName,
              code: 'MAIN-01',
              city: 'Nairobi',
              address: 'Main Branch',
              phone: created.phone || '',
              isMainBranch: true,
              active: true,
            },
          ]);
          setActiveStoreId('store-main');
          setIsTerminalLocked(false);
        }}
      />
    );
  }

  const isSubscriptionExpired =
    !isClientDemoMode &&
    !isOwnerAccount &&
    Boolean(storeProfile) &&
    (storeProfile!.subscriptionStatus === 'expired' ||
      (Boolean(storeProfile!.expiresAt) && Date.parse(storeProfile!.expiresAt) <= Date.now()));

  if (!isClientDemoMode && isAuthorizedCloudUser(firebaseUser) && isSubscriptionExpired && storeProfile) {
    return (
      <div className="min-h-screen bg-[#0f172a]">
        <SubscriptionPlansModal
          isOpen={true}
          isExpiredLock={true}
          isOwnerAccount={false}
          storeId={activeCloudStoreId || firebaseUser!.uid}
          storeProfile={storeProfile}
          onSubscriptionUpdated={(updated) => setStoreProfile(updated)}
          onOpenAiAssistant={() => setShowAiAssistantModal(true)}
        />
        <AIAssistantModal
          isOpen={showAiAssistantModal}
          onClose={() => setShowAiAssistantModal(false)}
          activeStoreName={stores.find((s) => s.id === activeStoreId)?.name || storeProfile?.storeName || 'Rofani POS'}
          workerRole={currentUser.role}
          activeTab={activeTab}
          lowStockCount={lowStockCount}
          totalProductsCount={products.length}
          totalSalesToday={todaySales > 0 ? todaySales : totalGrossSales}
          products={products}
          transactions={transactions}
          onOpenPredictiveRestock={() => setActiveTab('inventory')}
        />
      </div>
    );
  }

  // If Mobile Phone Format is active, render PhoneDeviceFrame view
  if (deviceFormat === 'phone') {
    return (
      <div className="min-h-dvh h-dvh sm:h-auto sm:min-h-dvh bg-slate-900 sm:bg-slate-950 text-slate-100 flex flex-col font-sans print-unlock-overflow">
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
          storeName={displayedStoreName}
          todaySales={todaySales}
          lowStockCount={lowStockCount}
          onLockTerminal={() => setIsTerminalLocked(true)}
          onOpenStaffModal={() => setShowStaffModal(true)}
          onNewSale={handleGlobalNewSale}
          onOpenCloudSync={() => setShowCloudSyncModal(true)}
          onOpenStockAlerts={() => setShowStockAlertModal(true)}
          cloudSyncStatus={cloudSyncStatus}
          onTriggerSync={syncPendingQueueToCloud}
          conflictCount={syncConflicts.length}
          onOpenConflictAssistant={() => setIsConflictModalOpen(true)}
          hideBottomNav={activeTab === 'pos' && isMobileSearchActive}
          topDemoBanner={
            isClientDemoMode ? (
              <LiveClientDemoOverlay
                activeTab={activeTab}
                deviceFormat={deviceFormat}
                storeName={displayedStoreName}
                productsCount={products.length}
                transactionsCount={transactions.length}
                branchCount={Math.max(1, groupBranches.length)}
                isSignedInAccount={isAuthorizedCloudUser(firebaseUser)}
                onSelectTab={(tab) => setActiveTab(tab)}
                onToggleDeviceFormat={() => setDeviceFormat('computer')}
                onOpenBarcodePrinter={() => setShowPrintBarcodesModal(true)}
                onOpenMultiBranch={() => setShowMultiBranchModal(true)}
                onOpenBusinessCard={() => setShowBusinessCardModal(true)}
                onResetDemo={handleResetClientDemo}
                onExitDemo={handleExitClientDemo}
              />
            ) : undefined
          }
          quickToolsBar={
            <MobileQuickToolsBar
              placement="phoneFrame"
              hidden={shouldHideMobileQuickTools}
              activeTab={activeTab}
              onMakeSale={handleMobileMakeSaleBarClick}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenAiAssistant={() => setShowAiAssistantModal(true)}
              onOpenStoreManager={() => setShowStoreManagerModal(true)}
              activeStoreName={displayedStoreName}
              stores={stores}
              activeStoreId={activeStoreId}
              onSelectActiveStore={(id) => setActiveStoreId(id)}
              onUseCalcAmountInPos={(_amt) => {
                setActiveTab('pos');
              }}
              onOpenBarcodeScanner={handleMobileOpenBarcodeScanner}
              onScanManualBarcode={handleMobileManualBarcode}
              onOpenAiScanner={handleMobileOpenAiScanner}
              onApplyQuickDiscount={handleMobileApplyQuickDiscount}
              onClearQuickDiscount={handleMobileClearQuickDiscount}
              cartSummary={mobileCartSummary}
              canGiveDiscounts={hasWorkerPermission(currentUser, 'canGiveDiscounts')}
            />
          }
        >
          <ErrorBoundary resetKey={activeTab} fallbackTitle="Workspace View Recovered">
            {renderActiveTabContent()}
          </ErrorBoundary>
        </PhoneDeviceFrame>

        {/* Modals in Phone Format Mode */}
        <CloudSyncModal
          isOpen={showCloudSyncModal}
          onClose={() => setShowCloudSyncModal(false)}
          products={products}
          allUsers={allUsers}
          transactions={transactions}
          customers={customers}
          suppliers={suppliers}
          expenses={expenses}
          cloudSyncStatus={cloudSyncStatus}
          lastSyncedTime={lastSyncedTime}
          isQuotaExceeded={isCloudQuotaExceeded}
          onTriggerSync={syncPendingQueueToCloud}
          conflictCount={syncConflicts.length}
          onOpenConflictAssistant={() => setIsConflictModalOpen(true)}
          onSyncCatalogComplete={() => {
            setCloudSyncStatus('synced');
            setLastSyncedTime(new Date().toLocaleTimeString());
          }}
          onSyncError={() =>
            setCloudSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error')
          }
          onPullFromCloud={handlePullFromCloud}
          onEmergencyRestore={handleRestoreEmergencyBackup}
          masterPin={masterPin}
          requirePinOnStartup={requirePinOnStartup}
          onLockNow={() => setIsTerminalLocked(true)}
          recoveryEmail={ownerRecoveryEmail}
          emergencyKey={emergencyRecoveryKey}
          firebaseUser={firebaseUser}
          activeStoreId={effectiveCloudStoreId || OWNER_PRIMARY_STORE_ID}
          activeStoreName={displayedStoreName}
        />

        <SubscriptionPlansModal
          isOpen={showPlansModal}
          onClose={() => setShowPlansModal(false)}
          isExpiredLock={false}
          isOwnerAccount={isOwnerAccount}
          storeId={activeCloudStoreId || OWNER_PRIMARY_STORE_ID}
          storeProfile={storeProfile}
          onSubscriptionUpdated={(updated) => setStoreProfile(updated)}
          onOpenAiAssistant={() => setShowAiAssistantModal(true)}
        />

        {isOwnerAccount && (
          <SuperAdminSubscribersModal
            isOpen={showSuperAdminModal}
            onClose={() => setShowSuperAdminModal(false)}
          />
        )}

        <SuggestFeatureModal
          isOpen={showSuggestFeatureModal}
          onClose={() => setShowSuggestFeatureModal(false)}
          storeName={stores.find((s) => s.id === activeStoreId)?.name || storeProfile?.storeName || 'Rofani POS'}
          defaultPhone={storeProfile?.phone || currentUser?.phone || ''}
          defaultContactName={currentUser?.name || ''}
          isCloudSignedIn={isAuthorizedCloudUser(firebaseUser)}
        />

        <ConflictResolutionModal
          isOpen={isConflictModalOpen && syncConflicts.length > 0}
          conflicts={syncConflicts}
          onResolveConflict={handleResolveSyncConflict}
          onClose={() => setIsConflictModalOpen(false)}
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
          biometricUnlockEnabled={biometricUnlockEnabled}
          storeName={displayedStoreName}
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

        {/* Daily Automatic Email Backup Modal (Phone Format Mode) */}
        <DailyEmailBackupModal
          isOpen={showDailyEmailBackupModal}
          onClose={() => setShowDailyEmailBackupModal(false)}
          products={products}
          transactions={transactions}
          customers={customers}
          suppliers={suppliers}
          expenses={expenses}
          cashTransactions={cashTransactions}
          allUsers={allUsers}
          storeName={stores.find((s) => s.id === activeStoreId)?.name || storeProfile?.storeName || 'Rofani POS'}
          accountEmail={firebaseUser?.email || storeProfile?.ownerEmail || cachedCloudSession?.email || ''}
          confirmedBackupEmail={storeProfile?.backupEmail || ''}
          backupEmailConfirmed={Boolean(storeProfile?.backupEmailConfirmed)}
          onConfirmBackupEmail={handleConfirmBackupEmail}
          onNotification={(msg, type) => setBackupBanner({ message: msg, type })}
        />

        {/* Multi-Store Branch Outlets & Inter-Store Stock Transfer Manager Modal (Phone Format Mode) */}
        <StoreManagerModal
          isOpen={showStoreManagerModal}
          onClose={() => setShowStoreManagerModal(false)}
          stores={stores}
          products={products}
          stockTransfers={stockTransfers}
          onAddStore={handleAddStore}
          onUpdateStore={handleUpdateStore}
          onDeleteStore={handleDeleteStore}
          onResetDemoStores={handleResetDemoStores}
          activeStoreId={activeStoreId}
          onSelectActiveStore={(id) => {
            setActiveStoreId(id);
            setShowStoreManagerModal(false);
          }}
          onTransferStock={handleTransferStock}
          onUpdateTransferStatus={handleUpdateTransferStatus}
        />

        {/* Category & Subcategory Management Modal (Phone Format Mode) */}
        <CategoryManagerModal
          isOpen={showCategoryManagerModal}
          onClose={() => setShowCategoryManagerModal(false)}
          categories={categories}
          products={products}
          onAddCategory={handleAddCategory}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
          onAddSubcategory={handleAddSubcategory}
          onEditSubcategory={handleEditSubcategory}
          onDeleteSubcategory={handleDeleteSubcategory}
        />

        {/* Stock Alert & Daily Digest Email Notification Center Modal (Phone Format Mode) */}
        <StockAlertNotificationModal
          isOpen={showStockAlertModal}
          onClose={() => setShowStockAlertModal(false)}
          products={products}
          onRestockClick={(p) => {
            setShowStockAlertModal(false);
            setActiveTab('inventory');
            setSelectedHistoryProduct(p);
            setShowHistoryModal(true);
          }}
          onViewInventoryProduct={() => {
            setShowStockAlertModal(false);
            setActiveTab('inventory');
            setInventoryLowStockOnly(true);
          }}
        />

        {/* Batch Barcode Label Printer Utility Modal (Phone Format Mode) */}
        <PrintBarcodesUtilityModal
          isOpen={showPrintBarcodesModal}
          onClose={() => setShowPrintBarcodesModal(false)}
          scanLogs={scanLogs}
          products={products}
          storeName={stores.find((s) => s.id === activeStoreId)?.name || storeProfile?.storeName || 'Rofani POS'}
          preferredFormatId={storeProfile?.preferredLabelSizeId}
          onSelectFormatId={handleSelectPreferredLabelSize}
        />

        {/* AI Worker Assistant Modal (Phone Format Mode) */}
        <AIAssistantModal
          isOpen={showAiAssistantModal}
          onClose={() => setShowAiAssistantModal(false)}
          activeStoreName={stores.find((s) => s.id === activeStoreId)?.name || storeProfile?.storeName || 'Rofani POS'}
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

        {/* Push-Style Low Stock Alert Notification (Phone Format Mode) */}
        <LowStockPushNotification
          alerts={lowStockPushAlerts}
          onDismiss={(id) => setLowStockPushAlerts((prev) => prev.filter((a) => a.id !== id))}
          onDismissAll={() => setLowStockPushAlerts([])}
          onViewInventory={() => {
            setActiveTab('inventory');
            setInventoryLowStockOnly(true);
          }}
          onOpenStockDigest={() => setShowStockAlertModal(true)}
        />

        {/* Live Sale & Edit/Delete Protection Alert Banner (Phone Mode) */}
        {activityAlertBanner && (
          <div
            className={`fixed top-16 left-1/2 -translate-x-1/2 z-[265] w-[calc(100%-2rem)] max-w-md rounded-2xl p-3.5 shadow-2xl border flex items-start gap-3 text-xs ${
              activityAlertBanner.severity === 'danger'
                ? 'bg-rose-950/95 border-rose-500/60 text-rose-100'
                : activityAlertBanner.severity === 'warning'
                ? 'bg-amber-950/95 border-amber-500/60 text-amber-100'
                : 'bg-slate-900/95 border-emerald-500/50 text-emerald-100'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="font-extrabold">{activityAlertBanner.title}</div>
              <div className="text-[11px] opacity-90 mt-0.5">{activityAlertBanner.message}</div>
            </div>
            <button
              type="button"
              onClick={() => setActivityAlertBanner(null)}
              className="p-1 rounded-lg hover:bg-black/25 text-slate-300 hover:text-white cursor-pointer"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <ShopQrShareModal
          isOpen={showShopQrModal}
          onClose={() => setShowShopQrModal(false)}
          storeName={stores.find((s) => s.id === activeStoreId)?.name || storeProfile?.storeName || 'Rofani POS'}
          storeId={resolvedSettingsStoreId}
          referralCode={storeProfile?.referralCode}
        />

        <DigitalBusinessCardModal
          isOpen={showBusinessCardModal}
          onClose={() => setShowBusinessCardModal(false)}
          storeName={displayedStoreName}
          storeId={resolvedSettingsStoreId}
          currentUser={currentUser}
          storeProfile={storeProfile}
          onSaveCard={handleSaveBusinessCard}
        />

        <MultiBranchUpgradeModal
          isOpen={showMultiBranchModal}
          onClose={() => setShowMultiBranchModal(false)}
          primaryStoreId={primaryCloudStoreId || firebaseUser?.uid || OWNER_PRIMARY_STORE_ID}
          activeBranchStoreId={effectiveCloudStoreId || OWNER_PRIMARY_STORE_ID}
          primaryProfile={storeProfile}
          groupBranches={groupBranches}
          activeStoreName={displayedStoreName}
          allUsers={allUsers}
          products={products}
          transactions={transactions}
          expenses={expenses}
          salaryPayouts={salaryPayouts}
          commissionPayouts={commissionPayouts}
          onUpgradeToMultiBranch={handleUpgradeToMultiBranch}
          onCreateBranch={handleCreateBranchInGroup}
          onSwitchBranch={handleSwitchBranchStore}
          onSyncCrossBranchStaff={handleSyncCrossBranchStaff}
          onOpenPlansPricing={() => setShowPlansModal(true)}
        />

        <DailyEndOfDaySummaryModal
          isOpen={show9PmSummaryModal}
          onClose={() => setShow9PmSummaryModal(false)}
          onDismissForToday={() => {
            const now = new Date();
            const key = `rofani_9pm_dismissed_${resolvedSettingsStoreId}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            safeSetJSON(key, true);
            setShow9PmSummaryModal(false);
          }}
          storeName={stores.find((s) => s.id === activeStoreId)?.name || storeProfile?.storeName || 'Rofani POS'}
          transactions={transactions}
          expenses={expenses}
          restockRecords={restockRecords}
          canViewProfit={canViewGrossProfit(currentUser)}
        />

        {/* Referral Reward / Welcome Toast (Phone Mode) */}
        {referralRewardToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[260] w-[calc(100%-2rem)] max-w-md bg-slate-900 border border-amber-400/60 text-slate-100 rounded-2xl p-4 shadow-2xl flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 text-xs">
              <p className="font-extrabold text-white leading-snug">{referralRewardToast.message}</p>
              {referralRewardToast.subtext && (
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{referralRewardToast.subtext}</p>
              )}
              <button
                type="button"
                onClick={() => {
                  setReferralRewardToast(null);
                  setShowPlansModal(true);
                }}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 cursor-pointer"
              >
                View My License &amp; Referral Code →
              </button>
            </div>
            <button
              type="button"
              onClick={() => setReferralRewardToast(null)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer shrink-0"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Role Authorization Modal for Sensitive Operations in Phone Mode */}
        <RoleAuthorizationModal request={roleAuthRequest} />
        {/* Automatic Camera Authorization on App Launch */}
        <CameraStartupPrompt />
      </div>
    );
  }

  return (
    <div className={`flex min-h-dvh h-dvh w-full overflow-hidden font-sans print-unlock-overflow ${themeContainerClass} ${fontScaleClass}`}>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="print:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden cursor-pointer"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar: Professional Polish Navigation */}
      <nav
        className={`print:hidden bg-slate-900 flex flex-col border-r border-slate-800 text-slate-300 shrink-0 transition-all duration-300 z-50 ${
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
                  Rofani POS
                </span>
                <span className="text-[10px] text-slate-400 font-mono block truncate">
                  {(() => {
                    const activeName = stores.find((s) => s.id === activeStoreId)?.name || storeProfile?.storeName || '';
                    return activeName && !isLegacyRofaniStoreBrand(activeName)
                      ? activeName
                      : 'RETAIL & WHOLESALE';
                  })()}
                </span>
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
                title="Print QR Codes Utility - Batch print QR labels from scan history & catalog"
                className="w-full bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-sky-400 hover:text-white font-bold rounded-xl border border-slate-700/80 hover:border-sky-500/50 shadow-sm transition flex items-center justify-center p-2.5 cursor-pointer"
              >
                <QrCode className="w-4 h-4 shrink-0" />
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
                title="Print QR Codes Utility - Batch print QR labels from scan history & catalog"
                className="bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-sky-300 hover:text-white font-bold rounded-xl border border-slate-700/80 hover:border-sky-500/60 shadow-sm transition flex items-center gap-1.5 py-2.5 px-2.5 text-xs shrink-0 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                <span className="font-semibold">Print QR Labels</span>
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
            onClick={() => setActiveTab('purchasing')}
            title="Purchase Orders & Supplier Inventory Receiving"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition ${
              activeTab === 'purchasing'
                ? 'bg-blue-600 text-white shadow-md'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Truck className="w-4 h-4 opacity-90 shrink-0 text-emerald-400" />
              {!isSidebarCollapsed && <span>Purchasing & POs</span>}
            </div>
            {!isSidebarCollapsed && purchaseOrders.filter((p) => p.status === 'Pending').length > 0 && (
              <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-full font-mono">
                {purchaseOrders.filter((p) => p.status === 'Pending').length}
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
            title="Data Management & Store Settings"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 opacity-90 shrink-0" />
              {!isSidebarCollapsed && <span>Data &amp; Store Settings</span>}
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

          {/* Subscription Plans & Pricing Button */}
          <button
            type="button"
            onClick={() => setShowPlansModal(true)}
            title="Plans & Pricing / M-Pesa Subscription Renewal"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition bg-slate-800/80 hover:bg-amber-500/20 text-amber-200 border border-amber-500/40 hover:border-amber-400 shadow-sm cursor-pointer`}
          >
            <div className="flex items-center gap-3">
              <Award className="w-4 h-4 shrink-0 text-amber-400" />
              {!isSidebarCollapsed && <span className="font-bold">Plans &amp; Pricing</span>}
            </div>
            {!isSidebarCollapsed && (
              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded-full font-bold uppercase">
                {isOwnerAccount ? 'Owner' : storeProfile?.planType || 'Trial'}
              </span>
            )}
          </button>

          {/* Menu & Share on Social Media Hub */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('menu');
              setIsMobileMenuOpen(false);
            }}
            title="App Menu, Referral Code & Share on Social Media"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition cursor-pointer ${
              activeTab === 'menu'
                ? 'bg-blue-600 text-white shadow-md'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Share2 className="w-4 h-4 shrink-0 text-sky-400" />
              {!isSidebarCollapsed && <span>Share &amp; Menu Hub</span>}
            </div>
          </button>

          {/* About Us & Why Choose Us Screen */}
          <button
            type="button"
            id="btn-sidebar-about-us"
            onClick={() => {
              setActiveTab('about');
              setIsMobileMenuOpen(false);
            }}
            title="About Rofani POS & Support"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition cursor-pointer ${
              activeTab === 'about'
                ? 'bg-blue-600 text-white shadow-md'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Info className="w-4 h-4 shrink-0 text-orange-400" />
              {!isSidebarCollapsed && <span>About Us</span>}
            </div>
          </button>

          {/* Live Client Demo Mode Toggle */}
          <button
            type="button"
            id="btn-sidebar-client-demo"
            onClick={() => {
              if (isClientDemoMode) {
                handleExitClientDemo();
              } else {
                handleStartClientDemo();
              }
              setIsMobileMenuOpen(false);
            }}
            title={
              isClientDemoMode
                ? 'Exit Live Client Demo Sandbox'
                : 'Launch isolated Live Client Demo for new prospective customers'
            }
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition border cursor-pointer ${
              isClientDemoMode
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200 hover:bg-emerald-900/60'
                : 'bg-slate-800/70 border-slate-700/70 text-emerald-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <Play className="w-4 h-4 shrink-0 text-emerald-400 fill-current" />
              {!isSidebarCollapsed && (
                <span className="font-semibold">
                  {isClientDemoMode ? 'Exit Client Demo' : 'Live Client Demo'}
                </span>
              )}
            </div>
            {!isSidebarCollapsed && (
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
                {isClientDemoMode ? 'Active' : 'Pitch'}
              </span>
            )}
          </button>

          {/* Suggest a Special Feature */}
          <button
            type="button"
            id="btn-sidebar-suggest-feature"
            onClick={() => {
              setShowSuggestFeatureModal(true);
              setIsMobileMenuOpen(false);
            }}
            title="Suggest a Special Feature or Custom Integration"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition hover:bg-slate-800 text-amber-200 border border-amber-500/25 bg-amber-500/5 cursor-pointer`}
          >
            <div className="flex items-center gap-3">
              <Lightbulb className="w-4 h-4 shrink-0 text-amber-400" />
              {!isSidebarCollapsed && <span>Suggest a Feature</span>}
            </div>
            {!isSidebarCollapsed && (
              <span className="text-[9px] bg-sky-500/15 text-sky-300 border border-sky-500/30 px-1.5 py-0.5 rounded-full font-bold uppercase">
                Ideas
              </span>
            )}
          </button>

          {/* Owner-Only Super Admin Subscribers Panel */}
          {isOwnerAccount && (
            <button
              type="button"
              id="btn-sidebar-super-admin"
              onClick={() => setShowSuperAdminModal(true)}
              title="Super Admin: Manage Subscribers"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition bg-sky-950/90 hover:bg-sky-800 text-sky-200 border border-sky-500/50 shadow-sm cursor-pointer`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 shrink-0 text-sky-400" />
                {!isSidebarCollapsed && <span className="font-bold">Manage Subscribers</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className="text-[9px] bg-sky-500/20 text-sky-300 border border-sky-400/30 px-1.5 py-0.5 rounded-full font-bold uppercase">
                  Admin
                </span>
              )}
            </button>
          )}

          {/* Switch Layout: Mobile Phone vs Desktop Version */}
          <button
            type="button"
            id="btn-sidebar-switch-to-mobile"
            onClick={() => {
              setDeviceFormat('phone');
              setIsMobileMenuOpen(false);
            }}
            title="Switch to Mobile Phone Version"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition bg-slate-800/90 hover:bg-blue-600 text-slate-100 border border-slate-700 hover:border-blue-400 shadow-sm cursor-pointer`}
          >
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 shrink-0 text-sky-400" />
              {!isSidebarCollapsed && <span className="font-bold">Mobile Phone View</span>}
            </div>
            {!isSidebarCollapsed && (
              <span className="text-[9px] bg-sky-500/20 text-sky-300 border border-sky-400/30 px-1.5 py-0.5 rounded-full font-bold uppercase">
                Mobile
              </span>
            )}
          </button>

          {firebaseUser && (
            <button
              type="button"
              onClick={async () => {
                setAllowOfflineOwnerMode(false);
                setActiveBranchCloudStoreId(null);
                setActiveBranchStoreIdState(null);
                setGroupBranches([]);
                await signOutFromCloud();
              }}
              title="Sign Out of Cloud Account"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2 rounded-lg transition bg-slate-900/80 hover:bg-rose-950/60 text-slate-300 hover:text-rose-200 border border-slate-800 hover:border-rose-500/40 cursor-pointer`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <LogOut className="w-4 h-4 shrink-0 text-rose-400" />
                {!isSidebarCollapsed && (
                  <span className="truncate text-xs font-semibold">
                    Sign Out ({firebaseUser.email?.split('@')[0]})
                  </span>
                )}
              </div>
            </button>
          )}
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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden print-unlock-overflow">
        {isClientDemoMode && (
          <LiveClientDemoOverlay
            activeTab={activeTab}
            deviceFormat={deviceFormat}
            storeName={displayedStoreName}
            productsCount={products.length}
            transactionsCount={transactions.length}
            branchCount={Math.max(1, groupBranches.length)}
            isSignedInAccount={isAuthorizedCloudUser(firebaseUser)}
            onSelectTab={(tab) => setActiveTab(tab)}
            onToggleDeviceFormat={() => setDeviceFormat('phone')}
            onOpenBarcodePrinter={() => setShowPrintBarcodesModal(true)}
            onOpenMultiBranch={() => setShowMultiBranchModal(true)}
            onOpenBusinessCard={() => setShowBusinessCardModal(true)}
            onResetDemo={handleResetClientDemo}
            onExitDemo={handleExitClientDemo}
          />
        )}

        {/* Real-Time Offline and Pending Cloud Sync Notification Banner */}
        {!isClientDemoMode && (
          <div className="print:hidden">
            <OfflineSyncBanner
              onTriggerSync={syncPendingQueueToCloud}
              onOpenCloudSync={() => setShowCloudSyncModal(true)}
              conflictCount={syncConflicts.length}
              onOpenConflictAssistant={() => setIsConflictModalOpen(true)}
            />
          </div>
        )}

        {/* Firestore Quota Notice Banner */}
        {isCloudQuotaExceeded && showQuotaBanner && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-sm z-30 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 bg-slate-950 text-amber-300 px-2 py-0.5 rounded text-[11px] font-bold">
                <AlertTriangle className="w-3.5 h-3.5" /> Quota Notice
              </span>
              <span>
                Firebase daily free read units limit reached (resets tomorrow at midnight UTC). <strong>POS is running safely in Offline Local Storage Mode</strong>.
              </span>
              <a
                href={FIREBASE_UPGRADE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-extrabold text-slate-950 hover:text-black ml-1 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Upgrade in Firebase Console</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-slate-950/60 font-normal">|</span>
              <button
                onClick={() => setShowCloudSyncModal(true)}
                className="underline font-bold text-slate-950 hover:text-black cursor-pointer"
              >
                View Details
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

        {/* Emergency Catalog Recovery Alert Banner: Appears automatically if current catalog has < 50 items and a larger local backup exists (e.g. on Vercel) */}
        {largestRecoverableBackup && (() => {
          const largest = largestRecoverableBackup;

          return (
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 px-4 py-3 text-xs font-bold flex items-center justify-between shadow-md z-30 shrink-0 border-b border-amber-600">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 bg-black/20 text-slate-950 px-2.5 py-0.5 rounded font-black text-[11px] uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4 text-slate-950" /> Emergency Recovery Detected
                </span>
                <span>
                  Your catalog currently has {products.length} items, but an emergency snapshot with{' '}
                  <span className="underline font-black">{largest.productsCount} items</span> ({largest.formattedDate}) was found in browser storage!
                </span>
                <button
                  type="button"
                  id="btn-restore-full-catalog-banner"
                  onClick={() => handleRestoreEmergencyBackup(largest.key)}
                  className="bg-slate-950 hover:bg-slate-900 text-amber-300 px-3.5 py-1.5 rounded-xl font-black text-xs transition shadow-sm ml-2 cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Restore My {largest.productsCount} Items Now
                </button>
              </div>
              <button
                type="button"
                onClick={() => setDismissedRecoveryBanner(true)}
                className="text-slate-900 hover:text-black p-1 font-bold text-xs cursor-pointer ml-3"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          );
        })()}

        {/* Referred Merchant 22-Day Welcome Banner */}
        {storeProfile?.referredBy &&
          storeProfile.planType === 'trial' &&
          welcomeBannerDismissedForStore !== storeProfile.id &&
          (() => {
            try {
              if (localStorage.getItem(`rofani_welcome_ref_dismissed_${storeProfile.id}`) === '1') {
                return null;
              }
            } catch {}
            return (
              <div className="bg-gradient-to-r from-amber-500/20 via-emerald-500/15 to-sky-500/20 border-b border-amber-400/40 bg-slate-900 text-slate-100 px-4 py-2.5 text-xs flex items-center justify-between gap-3 shrink-0 z-30">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-extrabold text-[10px] uppercase">
                    <Gift className="w-3 h-3" /> Referral Bonus Active
                  </span>
                  <span>
                    Welcome to Rofani POS! You were referred by{' '}
                    <strong className="text-amber-300">
                      {storeProfile.referredByStoreName || 'a fellow merchant'}
                    </strong>{' '}
                    — enjoy <strong className="text-emerald-300">22 Days Free Trial</strong> (+15 extra days)!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem(`rofani_welcome_ref_dismissed_${storeProfile.id}`, '1');
                    } catch {}
                    setWelcomeBannerDismissedForStore(storeProfile.id);
                  }}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer shrink-0"
                  aria-label="Dismiss welcome bonus banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })()}

        {/* Daily Email Backup Notification Banner */}
        {backupBanner && (
          <div className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-sm z-30 shrink-0 ${
            backupBanner.type === 'success'
              ? 'bg-emerald-600 text-white'
              : backupBanner.type === 'info'
              ? 'bg-sky-600 text-white'
              : 'bg-red-600 text-white'
          }`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 bg-black/20 text-white px-2 py-0.5 rounded text-[11px] font-bold">
                <Mail className="w-3.5 h-3.5" /> Email Backup
              </span>
              <span>{backupBanner.message}</span>
              <button
                onClick={() => setShowDailyEmailBackupModal(true)}
                className="underline font-bold text-white hover:text-sky-100 cursor-pointer ml-2"
              >
                {backupBanner.type === 'info' ? 'Set Backup Email' : 'View Backup Details'}
              </button>
            </div>
            <button
              onClick={handleDismissBackupBanner}
              className="p-1 hover:bg-black/20 rounded text-white cursor-pointer ml-2"
              title="Dismiss for today"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Responsive Mobile Top Header for Smartphones & Tablets (hidden on Menu tab which has its own compact header) */}
        {activeTab !== 'menu' && (
        <div className="print:hidden lg:hidden bg-slate-900 border-b border-slate-800 shrink-0 z-20 text-white">
          {/* Primary Row: Main Menu (left), Brand, and Quick Actions (right) */}
          <div className="px-3 py-2 flex items-center justify-between gap-2 overflow-hidden">
            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition cursor-pointer shrink-0 relative z-10 border border-slate-700/70"
                title="Open Navigation Menu"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-xs shrink-0 shadow-md">
                  R
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-black text-xs tracking-wider block leading-none truncate">Rofani POS</span>
                  <span className="text-[9px] text-slate-400 font-mono block truncate">
                    {(() => {
                      const activeName = stores.find((s) => s.id === activeStoreId)?.name || storeProfile?.storeName || '';
                      return activeName && !isLegacyRofaniStoreBrand(activeName)
                        ? activeName
                        : 'Retail & Wholesale POS';
                    })()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Inline Sell, Network & Cloud Sync on wider tablets (768px-1023px) where ample space exists */}
              <div className="hidden md:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleMobileMakeSaleBarClick}
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs px-2.5 py-1.5 rounded-full flex items-center gap-1 shrink-0 shadow-sm transition cursor-pointer whitespace-nowrap"
                  title="Open POS Register / New Sale"
                  aria-label="Sell — Open POS Register"
                >
                  <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                  <span>Sell</span>
                </button>
                <NetworkStatusBadge onClick={() => setShowCloudSyncModal(true)} />

                <button
                  type="button"
                  onClick={() => setShowCloudSyncModal(true)}
                  title="Cloud Sync & Multi-Phone Share"
                  className={`px-2.5 py-1.5 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold shadow-sm cursor-pointer ${
                    cloudSyncStatus === 'quota_exceeded'
                      ? 'bg-amber-950/90 text-amber-200 border-amber-700'
                      : cloudSyncStatus === 'error'
                      ? 'bg-rose-950/90 text-rose-200 border-rose-700'
                      : 'bg-sky-500/20 text-sky-200 border-sky-400/40'
                  }`}
                >
                  <Cloud className={`w-3.5 h-3.5 ${
                    cloudSyncStatus === 'quota_exceeded'
                      ? 'text-amber-400'
                      : cloudSyncStatus === 'error'
                      ? 'text-rose-400'
                      : 'text-sky-400'
                  }`} />
                  <span>{cloudSyncStatus === 'error' ? 'Sync Retry' : cloudSyncStatus === 'syncing' ? 'Syncing...' : 'Sync & Share'}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      cloudSyncStatus === 'quota_exceeded'
                        ? 'bg-amber-400'
                        : cloudSyncStatus === 'offline'
                        ? 'bg-slate-400'
                        : cloudSyncStatus === 'error'
                        ? 'bg-rose-400'
                        : cloudSyncStatus === 'syncing'
                        ? 'bg-sky-400 animate-pulse'
                        : 'bg-emerald-400'
                    }`}
                  />
                </button>
              </div>

              {/* Clear Mobile / Desktop Mode Toggle Pill */}
              <div
                className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-700/80 shrink-0"
                role="group"
                aria-label="Switch between Mobile and Desktop view"
              >
                <button
                  type="button"
                  id="btn-mobile-header-switch-phone"
                  onClick={() => setDeviceFormat('phone')}
                  title="Switch to Mobile Phone Version"
                  className="px-2 py-1.5 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1 transition cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                  <span>Mobile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceFormat('computer')}
                  title="Desktop Version Active"
                  className="px-2 py-1.5 rounded-lg text-[11px] font-extrabold bg-blue-600 text-white flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Desktop</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleToggleSoundEffects}
                data-no-feedback="true"
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  soundEffectsEnabled
                    ? 'bg-emerald-900/70 border-emerald-500/60 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
                title={soundEffectsEnabled ? 'Button Sound Effects: ON (Tap to mute)' : 'Button Sound Effects: MUTED (Tap to turn on)'}
              >
                {soundEffectsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsTerminalLocked(true)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl cursor-pointer"
                title="Lock Terminal PIN"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Secondary Strip on Phones (<768px): Dedicated row for Network Status, Sell & Cloud Live Sync */}
          <div className="md:hidden px-3 py-1.5 bg-slate-950/75 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <NetworkStatusBadge onClick={() => setShowCloudSyncModal(true)} />

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleMobileMakeSaleBarClick}
                className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 shadow-sm transition cursor-pointer whitespace-nowrap"
                title="Open POS Register / New Sale"
                aria-label="Sell — Open POS Register"
              >
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                <span>Sell</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCloudSyncModal(true)}
                title="Cloud Sync & Multi-Phone Share"
              className={`px-2.5 py-1 rounded-xl border transition flex items-center gap-1.5 text-[11px] font-bold shadow-sm cursor-pointer shrink-0 ${
                cloudSyncStatus === 'quota_exceeded'
                  ? 'bg-amber-950/90 text-amber-200 border-amber-700'
                  : cloudSyncStatus === 'error'
                  ? 'bg-rose-950/90 text-rose-200 border-rose-700'
                  : 'bg-sky-500/20 text-sky-200 border-sky-400/40'
              }`}
            >
              <Cloud className={`w-3.5 h-3.5 ${
                cloudSyncStatus === 'quota_exceeded'
                  ? 'text-amber-400'
                  : cloudSyncStatus === 'error'
                  ? 'text-rose-400'
                  : 'text-sky-400'
              }`} />
              <span>{cloudSyncStatus === 'error' ? 'Sync Retry' : cloudSyncStatus === 'syncing' ? 'Syncing...' : 'Cloud Live Sync'}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  cloudSyncStatus === 'quota_exceeded'
                    ? 'bg-amber-400'
                    : cloudSyncStatus === 'offline'
                    ? 'bg-slate-400'
                    : cloudSyncStatus === 'error'
                    ? 'bg-rose-400'
                    : cloudSyncStatus === 'syncing'
                    ? 'bg-sky-400 animate-pulse'
                    : 'bg-emerald-400'
                }`}
              />
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Top Header Stats Bar for Desktop & Laptop Viewports */}
        <header className="print:hidden hidden lg:flex min-h-16 h-auto py-2.5 lg:h-20 bg-white border-b border-slate-200 items-center justify-between px-4 xl:px-8 shrink-0 shadow-sm z-10 gap-3">
          <div className="flex items-center gap-4 xl:gap-8 min-w-0">
            <div className="flex flex-col shrink-0">
              <span className="text-[10px] xl:text-[11px] text-slate-500 uppercase tracking-widest font-bold">
                Today's Sales
              </span>
              <span className="text-lg xl:text-xl font-extrabold text-slate-900 font-mono">
                {formatKSh(todaySales > 0 ? todaySales : totalGrossSales, { showDecimals: true })}
              </span>
            </div>

            {canViewGrossProfit(currentUser) && (
              <div className="hidden xl:flex flex-col border-l border-slate-200 pl-4 xl:pl-8 shrink-0">
                <span className="text-[11px] text-slate-500 uppercase tracking-widest font-bold">
                  Gross Profit Margin
                </span>
                <span className="text-xl font-extrabold text-emerald-600 font-mono">
                  +{profitMarginPercent.toFixed(1)}% ({formatKSh(grossProfitAmount, { showDecimals: true })})
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
            {/* Real-Time Network & Offline Status Indicator */}
            <NetworkStatusBadge onClick={() => setShowCloudSyncModal(true)} />

            {/* Stock Alert & Daily Digest Bell Button */}
            <button
              onClick={() => setShowStockAlertModal(true)}
              title="Stock Alert & Daily Email Digest Center"
              className={`relative px-3 py-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold shadow-sm shrink-0 cursor-pointer ${
                lowStockCount > 0
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300 animate-pulse'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Bell className={`w-4 h-4 ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-500'}`} />
              <span>Stock Alerts</span>
              {lowStockCount > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full shadow-sm">
                  {lowStockCount}
                </span>
              )}
            </button>

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
                  : cloudSyncStatus === 'error'
                  ? 'Last cloud sync had an error — click to view details & retry'
                  : lastSyncedTime
                  ? `Real-Time Cloud Sync Active (Last synced: ${lastSyncedTime})`
                  : 'Real-Time Cloud Synchronization & Share with Worker Mobile Phones'
              }
              className={`px-3 py-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold shadow-sm shrink-0 cursor-pointer ${
                cloudSyncStatus === 'quota_exceeded'
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300'
                  : cloudSyncStatus === 'error'
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-300'
                  : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200'
              }`}
            >
              <Cloud className={`w-4 h-4 ${
                cloudSyncStatus === 'quota_exceeded'
                  ? 'text-amber-600'
                  : cloudSyncStatus === 'error'
                  ? 'text-rose-600'
                  : 'text-sky-600'
              }`} />
              <span className="inline">
                {cloudSyncStatus === 'quota_exceeded'
                  ? 'Cloud Quota'
                  : cloudSyncStatus === 'error'
                  ? 'Sync Issue'
                  : cloudSyncStatus === 'syncing'
                  ? 'Syncing...'
                  : 'Share & Sync'}
              </span>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  cloudSyncStatus === 'quota_exceeded'
                    ? 'bg-amber-500'
                    : cloudSyncStatus === 'offline'
                    ? 'bg-slate-400'
                    : cloudSyncStatus === 'error'
                    ? 'bg-rose-500'
                    : cloudSyncStatus === 'syncing'
                    ? 'bg-sky-500 animate-pulse'
                    : 'bg-emerald-500'
                }`}
                title={
                  cloudSyncStatus === 'quota_exceeded'
                    ? 'Local storage mode'
                    : cloudSyncStatus === 'error'
                    ? 'Sync error — click to retry'
                    : 'Cloud connection active'
                }
              />
            </button>

            {/* Daily Automatic Email Backup (Gmail) Button */}
            <button
              type="button"
              id="btn-header-email-backup"
              data-feedback="backup"
              onClick={() => setShowDailyEmailBackupModal(true)}
              title="Daily Automatic Email Backup (Gmail) & Full JSON Backup"
              className="px-3 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white rounded-xl border border-emerald-400/70 ring-2 ring-emerald-400/30 transition flex items-center gap-1.5 text-xs font-extrabold shadow-md shadow-emerald-600/25 shrink-0 cursor-pointer active:scale-95"
            >
              <Mail className="w-4 h-4 text-amber-200" />
              <span className="hidden xl:inline">Full Backup</span>
            </button>

            {/* Button Sound Feedback On/Off Toggle */}
            <button
              type="button"
              data-no-feedback="true"
              onClick={handleToggleSoundEffects}
              title={soundEffectsEnabled ? 'Button Sound & Highlight: ON (Click to mute sound)' : 'Button Sound: MUTED (Click to enable sound)'}
              className={`p-2 lg:px-2.5 lg:py-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold shadow-sm shrink-0 cursor-pointer ${
                soundEffectsEnabled
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200'
              }`}
            >
              {soundEffectsEnabled ? <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <VolumeX className="w-4 h-4 text-slate-500 shrink-0" />}
              <span className="hidden 2xl:inline">{soundEffectsEnabled ? 'Sound On' : 'Muted'}</span>
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
                {displayedStoreName}
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

            {/* Format Selector: Clear Desktop vs Mobile Phone Switch */}
            <div
              className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700 shadow-sm shrink-0"
              role="group"
              aria-label="Switch between Desktop and Mobile Phone view"
            >
              <button
                type="button"
                id="btn-desktop-header-switch-computer"
                onClick={() => setDeviceFormat('computer')}
                className="px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 bg-blue-600 text-white shadow-sm cursor-pointer"
                title="Desktop Computer Format (Active)"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                id="btn-desktop-header-switch-phone"
                onClick={() => setDeviceFormat('phone')}
                className="px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                title="Switch to Mobile Phone Version"
              >
                <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                <span>Mobile View</span>
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
        <div
          className={`flex-1 min-h-0 overflow-y-auto print-unlock-overflow ${
            activeTab === 'pos' && isMobileSearchActive ? 'pb-4 lg:pb-0' : 'pb-28 lg:pb-0'
          } ${
            activeTab === 'menu'
              ? 'bg-[#0f172a] text-slate-100'
              : 'bg-slate-900 text-slate-100 lg:bg-slate-50 lg:text-slate-900'
          }`}
        >
          <ErrorBoundary resetKey={activeTab} fallbackTitle="Workspace View Recovered">
            {renderActiveTabContent()}
          </ErrorBoundary>
        </div>

        {/* Floating 9-Dot Shortcuts & Calculator Suite Trigger */}
        <div className="print:hidden">
          <MobileQuickToolsBar
            placement="responsiveMobile"
            hidden={shouldHideMobileQuickTools}
            activeTab={activeTab}
            onMakeSale={handleMobileMakeSaleBarClick}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenAiAssistant={() => setShowAiAssistantModal(true)}
            onOpenStoreManager={() => setShowStoreManagerModal(true)}
            activeStoreName={displayedStoreName}
            stores={stores}
            activeStoreId={activeStoreId}
            onSelectActiveStore={(id) => setActiveStoreId(id)}
            onUseCalcAmountInPos={(_amt) => {
              setActiveTab('pos');
            }}
            onOpenBarcodeScanner={handleMobileOpenBarcodeScanner}
            onScanManualBarcode={handleMobileManualBarcode}
            onOpenAiScanner={handleMobileOpenAiScanner}
            onApplyQuickDiscount={handleMobileApplyQuickDiscount}
            onClearQuickDiscount={handleMobileClearQuickDiscount}
            cartSummary={mobileCartSummary}
            canGiveDiscounts={hasWorkerPermission(currentUser, 'canGiveDiscounts')}
          />
        </div>

        {/* Fixed 5-Tab Dark Bottom Navigation Bar (Mobile Screens — hidden when POS search keyboard is active) */}
        {!(activeTab === 'pos' && isMobileSearchActive) && (
        <nav
          aria-label="Mobile Bottom Navigation"
          className="print:hidden lg:hidden fixed bottom-0 left-0 right-0 z-50 min-h-16 bg-slate-900 border-t border-slate-800 px-1 pt-1 pb-safe grid grid-cols-5 items-center"
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('pos');
              setIsMobileMenuOpen(false);
            }}
            className={`min-h-[44px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'pos' ? 'text-[#38bdf8] font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold tracking-tight whitespace-nowrap">HOME</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('reports');
              setIsMobileMenuOpen(false);
            }}
            className={`min-h-[44px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'reports' ? 'text-[#38bdf8] font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold tracking-tight whitespace-nowrap">DASHBOARD</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('inventory');
              setIsMobileMenuOpen(false);
            }}
            className={`min-h-[44px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'inventory' ? 'text-[#38bdf8] font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold tracking-tight whitespace-nowrap">ITEMS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('menu');
              setIsMobileMenuOpen(false);
            }}
            className={`min-h-[44px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'menu' ? 'text-[#38bdf8] font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold tracking-tight whitespace-nowrap">MENU</span>
          </button>

          <button
            type="button"
            id="btn-bottom-nav-switch-mode"
            onClick={() => {
              setDeviceFormat('phone');
              setIsMobileMenuOpen(false);
            }}
            className="min-h-[44px] flex flex-col items-center justify-center py-1 rounded-xl transition text-slate-300 hover:text-[#38bdf8] cursor-pointer"
            title="Switch to Mobile Phone Version"
          >
            <Smartphone className="w-5 h-5 mb-0.5 text-[#38bdf8]" />
            <span className="text-[9px] font-bold tracking-tight whitespace-nowrap">MOBILE VIEW</span>
          </button>
        </nav>
        )}

        {/* Bottom Status & Quick Action Bar (Desktop Screens) */}
        <footer className="print:hidden hidden lg:flex h-12 bg-white border-t border-slate-200 items-center px-6 justify-between shrink-0 text-xs font-semibold text-slate-600">
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
        biometricUnlockEnabled={biometricUnlockEnabled}
        storeName={displayedStoreName}
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
        transactions={transactions}
        customers={customers}
        suppliers={suppliers}
        expenses={expenses}
        cloudSyncStatus={cloudSyncStatus}
        lastSyncedTime={lastSyncedTime}
        isQuotaExceeded={isCloudQuotaExceeded}
        onTriggerSync={syncPendingQueueToCloud}
        conflictCount={syncConflicts.length}
        onOpenConflictAssistant={() => setIsConflictModalOpen(true)}
        onSyncCatalogComplete={() => {
          setCloudSyncStatus('synced');
          setLastSyncedTime(new Date().toLocaleTimeString());
        }}
        onSyncError={() =>
          setCloudSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error')
        }
        onPullFromCloud={handlePullFromCloud}
        onEmergencyRestore={handleRestoreEmergencyBackup}
        masterPin={masterPin}
        requirePinOnStartup={requirePinOnStartup}
        onLockNow={() => setIsTerminalLocked(true)}
        recoveryEmail={ownerRecoveryEmail}
        emergencyKey={emergencyRecoveryKey}
        firebaseUser={firebaseUser}
        activeStoreId={effectiveCloudStoreId || OWNER_PRIMARY_STORE_ID}
        activeStoreName={displayedStoreName}
      />

      {/* Subscription Plans & M-Pesa Payment Modal */}
      <SubscriptionPlansModal
        isOpen={showPlansModal}
        onClose={() => setShowPlansModal(false)}
        isExpiredLock={false}
        isOwnerAccount={isOwnerAccount}
        storeId={activeCloudStoreId || OWNER_PRIMARY_STORE_ID}
        storeProfile={storeProfile}
        onSubscriptionUpdated={(updated) => setStoreProfile(updated)}
        onOpenAiAssistant={() => setShowAiAssistantModal(true)}
      />

      {/* Owner-Only Super Admin Subscribers Control Panel */}
      {isOwnerAccount && (
        <SuperAdminSubscribersModal
          isOpen={showSuperAdminModal}
          onClose={() => setShowSuperAdminModal(false)}
        />
      )}

      {/* Client Special Feature Request Modal */}
      <SuggestFeatureModal
        isOpen={showSuggestFeatureModal}
        onClose={() => setShowSuggestFeatureModal(false)}
        storeName={stores.find((s) => s.id === activeStoreId)?.name || storeProfile?.storeName || 'Rofani POS'}
        defaultPhone={storeProfile?.phone || currentUser?.phone || ''}
        defaultContactName={currentUser?.name || ''}
        isCloudSignedIn={isAuthorizedCloudUser(firebaseUser)}
      />

      {/* Conflict Resolution Assistant Modal */}
      <ConflictResolutionModal
        isOpen={isConflictModalOpen && syncConflicts.length > 0}
        conflicts={syncConflicts}
        onResolveConflict={handleResolveSyncConflict}
        onClose={() => setIsConflictModalOpen(false)}
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
        onResetDemoStores={handleResetDemoStores}
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
        storeName={stores.find((s) => s.id === activeStoreId)?.name || storeProfile?.storeName || 'Rofani POS'}
        preferredFormatId={storeProfile?.preferredLabelSizeId}
        onSelectFormatId={handleSelectPreferredLabelSize}
      />

      {/* Store Manager Dedicated Item Audit Mini-Page Terminal (Scanned via QR Code or Opened Directly) */}
      {auditUrlProduct && (
        <div className="fixed inset-0 z-[3000] bg-slate-950 overflow-y-auto animate-in fade-in duration-200">
          <ItemAuditMiniPage
            product={auditUrlProduct}
            restockRecords={restockRecords}
            transactions={transactions}
            storeName={stores.find((s) => s.id === activeStoreId)?.name || storeProfile?.storeName || 'Rofani POS'}
            currentUser={currentUser}
            onBack={() => {
              setAuditUrlProduct(null);
              try {
                const url = new URL(window.location.href);
                url.searchParams.delete('itemAudit');
                window.history.replaceState({}, '', url.toString());
              } catch {}
            }}
            onAddRestock={handleAddRestockRecord}
            onAdjustStockQuantity={handleSingleProductStockAdjust}
          />
        </div>
      )}

      {/* AI Worker Assistant Modal */}
      <AIAssistantModal
        isOpen={showAiAssistantModal}
        onClose={() => setShowAiAssistantModal(false)}
        activeStoreName={stores.find((s) => s.id === activeStoreId)?.name || storeProfile?.storeName || 'Rofani POS'}
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
      {/* Stock Alert & Daily Digest Email Notification Center Modal */}
      <StockAlertNotificationModal
        isOpen={showStockAlertModal}
        onClose={() => setShowStockAlertModal(false)}
        products={products}
        onRestockClick={(p) => {
          setShowStockAlertModal(false);
          setActiveTab('inventory');
          // Select product or trigger restock modal
          setSelectedHistoryProduct(p);
          setShowHistoryModal(true);
        }}
        onViewInventoryProduct={(p) => {
          setShowStockAlertModal(false);
          setActiveTab('inventory');
          setInventoryLowStockOnly(true);
        }}
      />
      {/* Role Authorization Modal for Sensitive Operations (Modifying Inventory, Deleting Expenses, Stock Count Adjustment) */}
      <RoleAuthorizationModal request={roleAuthRequest} />

      {/* Daily Automatic Email Backup Modal (Desktop/Laptop Mode) */}
      <DailyEmailBackupModal
        isOpen={showDailyEmailBackupModal}
        onClose={() => setShowDailyEmailBackupModal(false)}
        products={products}
        transactions={transactions}
        customers={customers}
        suppliers={suppliers}
        expenses={expenses}
        cashTransactions={cashTransactions}
        allUsers={allUsers}
        storeName={stores.find((s) => s.id === activeStoreId)?.name || storeProfile?.storeName || 'Rofani POS'}
        accountEmail={firebaseUser?.email || storeProfile?.ownerEmail || cachedCloudSession?.email || ''}
        confirmedBackupEmail={storeProfile?.backupEmail || ''}
        backupEmailConfirmed={Boolean(storeProfile?.backupEmailConfirmed)}
        onConfirmBackupEmail={handleConfirmBackupEmail}
        onNotification={(msg, type) => setBackupBanner({ message: msg, type })}
      />

      {/* Category & Subcategory Management Modal */}
      <CategoryManagerModal
        isOpen={showCategoryManagerModal}
        onClose={() => setShowCategoryManagerModal(false)}
        categories={categories}
        products={products}
        onAddCategory={handleAddCategory}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
        onAddSubcategory={handleAddSubcategory}
        onEditSubcategory={handleEditSubcategory}
        onDeleteSubcategory={handleDeleteSubcategory}
      />

      {/* Push-Style Low Stock Alert Notification (Desktop Mode) */}
      <LowStockPushNotification
        alerts={lowStockPushAlerts}
        onDismiss={(id) => setLowStockPushAlerts((prev) => prev.filter((a) => a.id !== id))}
        onDismissAll={() => setLowStockPushAlerts([])}
        onViewInventory={() => {
          setActiveTab('inventory');
          setInventoryLowStockOnly(true);
        }}
        onOpenStockDigest={() => setShowStockAlertModal(true)}
      />

      {/* Referral Reward / Welcome Toast (Desktop Mode) */}
      {referralRewardToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[260] w-[calc(100%-2rem)] max-w-md bg-slate-900 border border-amber-400/60 text-slate-100 rounded-2xl p-4 shadow-2xl flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 text-xs">
            <p className="font-extrabold text-white leading-snug">{referralRewardToast.message}</p>
            {referralRewardToast.subtext && (
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{referralRewardToast.subtext}</p>
            )}
            <button
              type="button"
              onClick={() => {
                setReferralRewardToast(null);
                setShowPlansModal(true);
              }}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 cursor-pointer"
            >
              View My License &amp; Referral Code →
            </button>
          </div>
          <button
            type="button"
            onClick={() => setReferralRewardToast(null)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer shrink-0"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Live Sale & Edit/Delete Protection Alert Banner (Desktop Mode) */}
      {activityAlertBanner && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-[265] w-[calc(100%-2rem)] max-w-md rounded-2xl p-3.5 shadow-2xl border flex items-start gap-3 text-xs ${
            activityAlertBanner.severity === 'danger'
              ? 'bg-rose-950/95 border-rose-500/60 text-rose-100'
              : activityAlertBanner.severity === 'warning'
              ? 'bg-amber-950/95 border-amber-500/60 text-amber-100'
              : 'bg-slate-900/95 border-emerald-500/50 text-emerald-100'
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="font-extrabold">{activityAlertBanner.title}</div>
            <div className="text-[11px] opacity-90 mt-0.5">{activityAlertBanner.message}</div>
          </div>
          <button
            type="button"
            onClick={() => setActivityAlertBanner(null)}
            className="p-1 rounded-lg hover:bg-black/25 text-slate-300 hover:text-white cursor-pointer"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <ShopQrShareModal
        isOpen={showShopQrModal}
        onClose={() => setShowShopQrModal(false)}
        storeName={stores.find((s) => s.id === activeStoreId)?.name || storeProfile?.storeName || 'Rofani POS'}
        storeId={resolvedSettingsStoreId}
        referralCode={storeProfile?.referralCode}
      />

      <DigitalBusinessCardModal
        isOpen={showBusinessCardModal}
        onClose={() => setShowBusinessCardModal(false)}
        storeName={displayedStoreName}
        storeId={resolvedSettingsStoreId}
        currentUser={currentUser}
        storeProfile={storeProfile}
        onSaveCard={handleSaveBusinessCard}
      />

      <MultiBranchUpgradeModal
        isOpen={showMultiBranchModal}
        onClose={() => setShowMultiBranchModal(false)}
        primaryStoreId={primaryCloudStoreId || firebaseUser?.uid || OWNER_PRIMARY_STORE_ID}
        activeBranchStoreId={effectiveCloudStoreId || OWNER_PRIMARY_STORE_ID}
        primaryProfile={storeProfile}
        groupBranches={groupBranches}
        activeStoreName={displayedStoreName}
        allUsers={allUsers}
        products={products}
        transactions={transactions}
        expenses={expenses}
        salaryPayouts={salaryPayouts}
        commissionPayouts={commissionPayouts}
        onUpgradeToMultiBranch={handleUpgradeToMultiBranch}
        onCreateBranch={handleCreateBranchInGroup}
        onSwitchBranch={handleSwitchBranchStore}
        onSyncCrossBranchStaff={handleSyncCrossBranchStaff}
        onOpenPlansPricing={() => setShowPlansModal(true)}
      />

      <DailyEndOfDaySummaryModal
        isOpen={show9PmSummaryModal}
        onClose={() => setShow9PmSummaryModal(false)}
        onDismissForToday={() => {
          const now = new Date();
          const key = `rofani_9pm_dismissed_${resolvedSettingsStoreId}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          safeSetJSON(key, true);
          setShow9PmSummaryModal(false);
        }}
        storeName={stores.find((s) => s.id === activeStoreId)?.name || storeProfile?.storeName || 'Rofani POS'}
        transactions={transactions}
        expenses={expenses}
        restockRecords={restockRecords}
        canViewProfit={canViewGrossProfit(currentUser)}
      />

      {/* Automatic Camera Authorization on App Launch */}
      <CameraStartupPrompt />
    </div>
  );
}
