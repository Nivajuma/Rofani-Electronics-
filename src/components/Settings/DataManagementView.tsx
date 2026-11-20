import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  FileSpreadsheet,
  Check,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Clock,
  Save,
  ShieldCheck,
  Building2,
  Receipt,
  FileJson,
  Palette,
  Sun,
  Moon,
  Monitor,
  LayoutGrid,
  ZoomIn,
  PanelLeft,
  PanelLeftClose,
  Maximize2,
  ExternalLink,
  Sparkles,
  Cloud,
  Share2,
  Smartphone,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Mail,
  RotateCcw,
  History,
  BatteryCharging,
  Wifi,
  Send,
  X
} from 'lucide-react';
import { Product, Customer, Supplier, Transaction, Expense, AttendanceRecord, User, StoreLocation } from '../../types';
import { detectDuplicateProducts, deduplicateProducts } from '../../utils/deduplicate';
import { DataSnapshotModal } from './DataSnapshotModal';
import { DailyEmailBackupModal } from './DailyEmailBackupModal';
import { CameraPermissionsCard } from './CameraPermissionsCard';
import { SettingsDashboardView } from './SettingsDashboardView';
import { safeGetJSON, safeSetJSON, getLocalStorageUsageStats } from '../../utils/safeStorage';
import { findRecoverableBackups } from '../../utils/backupRecovery';
import {
  getIsOnline,
  useAggressiveAutoSync,
  useNetworkStatus,
  useSyncHistory,
  addSyncHistoryEntry,
  SyncHistoryEntry,
} from '../../utils/offlineSync';
import { playBackupSuccessSound, playButtonSound } from '../../utils/uiFeedback';
import {
  batchSaveProductsToCloud,
  batchSaveTransactionsToCloud,
  batchSaveCustomersToCloud,
  batchSaveSuppliersToCloud,
  batchSaveExpensesToCloud,
  bulkUploadUsersToCloud,
  fetchProductsFromCloud,
  fetchTransactionsFromCloud,
} from '../../lib/cloudSync';
import {
  LastBackupMeta,
  ParsedBackupPreview,
  getLastBackupMeta,
  recordLastBackupMeta,
  formatLastBackupTimestamp,
  formatBackupMethodLabel,
  getStoreBackupFileName,
  buildCompleteStoreBackupPayload,
  buildHumanReadableStoreSummaryCSV,
  triggerBrowserDownload,
  canUseNativeFileShare,
  shareOrEmailStoreBackup,
  parseStoreBackupFile,
} from '../../utils/storeBackup';

interface DataManagementViewProps {
  products: Product[];
  categories: any[];
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
  expenses: Expense[];
  attendanceRecords: AttendanceRecord[];
  allUsers: User[];
  onAddUser?: (newUser: User) => void;
  onUpdateUser?: (updatedUser: User) => void;
  onDeleteUser?: (userId: string) => void;
  stores?: StoreLocation[];
  activeStoreId?: string | null;
  activeStoreName?: string;
  accountEmail?: string;
  onOpenStoreManager?: () => void;
  onImportData: (data: any, options?: { mode?: 'merge' | 'replace' }) => void;
  onResetSampleData: () => void;
  onClearTransactions: () => void;
  onClearExpenses: () => void;
  displayTheme?: 'light' | 'dark' | 'contrast';
  onChangeDisplayTheme?: (theme: 'light' | 'dark' | 'contrast') => void;
  fontScale?: 'normal' | 'large';
  onChangeFontScale?: (scale: 'normal' | 'large') => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenCloudSync?: () => void;
  onTriggerSync?: () => Promise<any> | void;
  onPullFromCloud?: () => Promise<any>;
  onEmergencyRestore?: (sourceKey?: string) => Promise<boolean> | boolean;
  deviceFormat?: 'computer' | 'phone';
  onChangeDeviceFormat?: (format: 'computer' | 'phone') => void;
  requirePinOnStartup?: boolean;
  onToggleRequirePinOnStartup?: (require: boolean) => void;
  masterPin?: string;
  onUpdateMasterPin?: (newPin: string) => void;
  onLockNow?: () => void;
  onOpenAuditLogs?: () => void;
  onOpenCategoryManager?: () => void;
  lastSyncedTime?: string | null;
  onCloudSyncSuccess?: () => void;
  onCloudSyncError?: () => void;
}

export const DataManagementView: React.FC<DataManagementViewProps> = ({
  products,
  categories,
  customers,
  suppliers,
  transactions,
  expenses,
  attendanceRecords,
  allUsers,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onImportData,
  onResetSampleData,
  onClearTransactions,
  onClearExpenses,
  displayTheme = 'light',
  onChangeDisplayTheme,
  fontScale = 'normal',
  onChangeFontScale,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenCloudSync,
  onTriggerSync,
  onPullFromCloud,
  deviceFormat = 'computer',
  onChangeDeviceFormat,
  requirePinOnStartup = true,
  onToggleRequirePinOnStartup,
  masterPin = '1234',
  onUpdateMasterPin,
  onLockNow,
  onOpenAuditLogs,
  stores = [],
  activeStoreId = null,
  activeStoreName = 'Rofani POS',
  accountEmail = '',
  onOpenStoreManager,
  onEmergencyRestore,
  onOpenCategoryManager,
  lastSyncedTime = null,
  onCloudSyncSuccess,
  onCloudSyncError,
}) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aggressiveAutoSync, setAggressiveAutoSync] = useAggressiveAutoSync();
  const { pendingCount } = useNetworkStatus();
  const { history: syncHistory, clearHistory: clearCloudSyncHistory } = useSyncHistory();
  const [showSyncHistoryModal, setShowSyncHistoryModal] = useState(false);
  const [syncHistoryFilter, setSyncHistoryFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ label: string; percent: number } | null>(null);
  const [cloudSyncFeedback, setCloudSyncFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    title: string;
    details: string;
    timestamp: string;
  } | null>(null);
  const restoreFileInputRef = useRef<HTMLInputElement | null>(null);
  const [lastBackupMeta, setLastBackupMeta] = useState<LastBackupMeta | null>(() => getLastBackupMeta());
  const [showShareEmailModal, setShowShareEmailModal] = useState(false);
  const [backupEmailInput, setBackupEmailInput] = useState<string>(() => {
    const saved = safeGetJSON<string>('rofani_pos_backup_email', '');
    return saved || accountEmail || '';
  });
  const [isSharingBackup, setIsSharingBackup] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [pendingRestorePreview, setPendingRestorePreview] = useState<ParsedBackupPreview | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [restorePinInput, setRestorePinInput] = useState('');
  const [showRestorePin, setShowRestorePin] = useState(false);
  const [restorePinError, setRestorePinError] = useState<string | null>(null);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);

  useEffect(() => {
    if (accountEmail && !backupEmailInput.trim()) {
      setBackupEmailInput(accountEmail);
    }
  }, [accountEmail]);

  useEffect(() => {
    const onBackupRecorded = (e: Event) => {
      const detail = (e as CustomEvent<LastBackupMeta>).detail;
      setLastBackupMeta(detail || getLastBackupMeta());
    };
    window.addEventListener('rofani:backup-recorded', onBackupRecorded);
    return () => window.removeEventListener('rofani:backup-recorded', onBackupRecorded);
  }, []);

  const handleToggleAggressiveAutoSync = () => {
    const nextVal = !aggressiveAutoSync;
    setAggressiveAutoSync(nextVal);
    playButtonSound('tap');
    triggerNotify(
      nextVal
        ? 'Aggressive Auto-Sync enabled — queued changes will upload automatically as soon as connectivity returns.'
        : 'Battery & Mobile Data Saver enabled — automatic reconnect sync paused until you tap "Retry All Pending Syncs".'
    );
  };

  const handleUploadLocalDataToCloud = async () => {
    if (!getIsOnline()) {
      const offlineMsg = 'Your internet connection appears offline. Local changes are safely stored on this device. Reconnect and click "Sync Local Data to Cloud".';
      addSyncHistoryEntry({
        operation: 'full_upload',
        status: 'failed',
        syncedCount: 0,
        failedCount: 1,
        summary: 'Manual Cloud Upload skipped — device offline',
        errorDetails: offlineMsg,
      });
      setCloudSyncFeedback({
        type: 'error',
        title: 'Sync Did Not Run — Device Offline',
        details: offlineMsg,
        timestamp: new Date().toLocaleTimeString(),
      });
      return;
    }

    setIsCloudSyncing(true);
    setErrorMessage(null);
    setCloudSyncFeedback(null);
    setUploadProgress({
      label: `Step 1/5: Uploading ${products.length} products in safe batches...`,
      percent: 5,
    });

    try {
      let prodCount = 0;
      if (products.length > 0) {
        prodCount = await batchSaveProductsToCloud(products, (uploaded, total, batch, totalBatches) => {
          const pct = Math.min(55, 5 + Math.round((uploaded / Math.max(total, 1)) * 50));
          setUploadProgress({
            label: `Step 1/5: Products batch ${batch}/${totalBatches} (${uploaded}/${total} items)`,
            percent: pct,
          });
        });
      }

      let usersCount = 0;
      if (allUsers && allUsers.length > 0) {
        setUploadProgress({
          label: `Step 2/5: Syncing ${allUsers.length} staff users...`,
          percent: 60,
        });
        usersCount = await bulkUploadUsersToCloud(allUsers);
      }

      let salesCount = 0;
      const recentTx = transactions.slice(0, 200);
      if (recentTx.length > 0) {
        setUploadProgress({
          label: `Step 3/5: Batch uploading ${recentTx.length} sales transactions...`,
          percent: 68,
        });
        salesCount = await batchSaveTransactionsToCloud(recentTx, (uploaded, total, batch, totalBatches) => {
          setUploadProgress({
            label: `Step 3/5: Sales batch ${batch}/${totalBatches} (${uploaded}/${total})`,
            percent: 68 + Math.round((uploaded / Math.max(total, 1)) * 12),
          });
        });
      }

      let customersCount = 0;
      const recentCusts = customers.slice(0, 200);
      if (recentCusts.length > 0) {
        setUploadProgress({
          label: `Step 4/5: Batch uploading ${recentCusts.length} customers & ${suppliers.length} suppliers...`,
          percent: 82,
        });
        customersCount = await batchSaveCustomersToCloud(recentCusts);
      }

      let suppliersCount = 0;
      if (suppliers.length > 0) {
        suppliersCount = await batchSaveSuppliersToCloud(suppliers);
      }

      let expensesCount = 0;
      const recentExps = expenses.slice(0, 100);
      if (recentExps.length > 0) {
        setUploadProgress({
          label: `Step 5/5: Batch uploading ${recentExps.length} expenses...`,
          percent: 92,
        });
        expensesCount = await batchSaveExpensesToCloud(recentExps);
      }

      const nowTime = new Date().toLocaleTimeString();
      const summaryParts: string[] = [`${prodCount} products`];
      if (usersCount > 0) summaryParts.push(`${usersCount} staff`);
      if (salesCount > 0) summaryParts.push(`${salesCount} sales`);
      if (customersCount > 0) summaryParts.push(`${customersCount} customers`);
      if (suppliersCount > 0) summaryParts.push(`${suppliersCount} suppliers`);
      if (expensesCount > 0) summaryParts.push(`${expensesCount} expenses`);

      const summaryMsg = `Successfully synced ${summaryParts.join(', ')} to Cloud Firestore.`;
      const totalUploaded = prodCount + usersCount + salesCount + customersCount + suppliersCount + expensesCount;
      addSyncHistoryEntry({
        operation: 'full_upload',
        status: 'success',
        syncedCount: totalUploaded,
        failedCount: 0,
        summary: summaryMsg,
      });
      setCloudSyncFeedback({
        type: 'success',
        title: 'Cloud Sync Confirmed & Completed',
        details: summaryMsg,
        timestamp: nowTime,
      });
      triggerNotify(summaryMsg);
      if (onCloudSyncSuccess) onCloudSyncSuccess();
    } catch (err: any) {
      if (onCloudSyncError) onCloudSyncError();
      const errMsg = err?.message || 'Failed to sync local data to cloud. Check network connection and retry.';
      addSyncHistoryEntry({
        operation: 'full_upload',
        status: 'failed',
        syncedCount: 0,
        failedCount: 1,
        summary: 'Manual full upload to Cloud Firestore failed',
        errorDetails: errMsg,
      });
      setCloudSyncFeedback({
        type: 'error',
        title: 'Cloud Sync Failed or Timed Out',
        details: errMsg,
        timestamp: new Date().toLocaleTimeString(),
      });
      setErrorMessage(errMsg);
    } finally {
      setUploadProgress(null);
      setIsCloudSyncing(false);
    }
  };

  const [isPullingData, setIsPullingData] = useState(false);

  const handlePullDataFromCloud = async () => {
    if (!getIsOnline()) {
      setCloudSyncFeedback({
        type: 'error',
        title: 'Pull Did Not Run — Device Offline',
        details: 'Your internet connection appears offline. Reconnect and click "Pull / Restore from Cloud".',
        timestamp: new Date().toLocaleTimeString(),
      });
      return;
    }

    setIsPullingData(true);
    setErrorMessage(null);
    setCloudSyncFeedback(null);
    setUploadProgress({
      label: 'Downloading & merging inventory, sales, and contacts from Cloud Firestore...',
      percent: 45,
    });
    try {
      if (onPullFromCloud) {
        const stats = await onPullFromCloud();
        const nowTime = new Date().toLocaleTimeString();
        if (stats && (stats.productsCount > 0 || stats.salesCount > 0 || stats.customersCount > 0)) {
          const msg = `Pulled & safely merged ${stats.productsCount || 0} products, ${stats.salesCount || 0} sales, ${stats.customersCount || 0} customers, ${stats.suppliersCount || 0} suppliers, and ${stats.expensesCount || 0} expenses. All local records preserved.`;
          setCloudSyncFeedback({
            type: 'success',
            title: 'Cloud Pull Confirmed & Merged',
            details: msg,
            timestamp: nowTime,
          });
          triggerNotify(msg);
        } else {
          const msg = 'Cloud database is currently empty (0 items found). Click "Sync Local Data to Cloud" to upload your local data first.';
          setCloudSyncFeedback({
            type: 'warning',
            title: 'Cloud Database Empty (0 Items)',
            details: msg,
            timestamp: nowTime,
          });
          setErrorMessage(msg);
        }
      } else {
        const prods = await fetchProductsFromCloud();
        const txs = await fetchTransactionsFromCloud();
        const nowTime = new Date().toLocaleTimeString();
        if (prods.length === 0 && txs.length === 0) {
          const msg = 'Cloud database is currently empty (0 items found). Click "Sync Local Data to Cloud" to upload your local inventory catalog first.';
          setCloudSyncFeedback({
            type: 'warning',
            title: 'Cloud Database Empty (0 Items)',
            details: msg,
            timestamp: nowTime,
          });
          setErrorMessage(msg);
        } else {
          const msg = `Retrieved and safely merged ${prods.length} products and ${txs.length} transactions from Cloud Firestore!`;
          setCloudSyncFeedback({
            type: 'success',
            title: 'Cloud Pull Confirmed & Merged',
            details: msg,
            timestamp: nowTime,
          });
          triggerNotify(msg);
          if (onImportData) {
            onImportData({ products: prods, transactions: txs });
          }
        }
      }
    } catch (err: any) {
      if (onCloudSyncError) onCloudSyncError();
      const errMsg = err?.message || 'Failed to pull data from Cloud Firestore.';
      setCloudSyncFeedback({
        type: 'error',
        title: 'Failed to Pull from Cloud',
        details: errMsg,
        timestamp: new Date().toLocaleTimeString(),
      });
      setErrorMessage(errMsg);
    } finally {
      setUploadProgress(null);
      setIsPullingData(false);
    }
  };

  // Store Master PIN edit state
  const [inputMasterPin, setInputMasterPin] = useState(masterPin);
  const [showMasterPin, setShowMasterPin] = useState(false);

  // Business settings state stored in local state for header/receipt customization
  const [storeName, setStoreName] = useState(() =>
    safeGetJSON<string>('retail_pos_store_name', 'Rofani POS', (val) => typeof val === 'string' && val.trim().length > 0)
  );
  useEffect(() => {
    safeSetJSON('retail_pos_store_name', storeName);
  }, [storeName]);

  const [kraPin, setKraPin] = useState(() =>
    safeGetJSON<string>('retail_pos_kra_pin', 'P051234567X', (val) => typeof val === 'string')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_kra_pin', kraPin);
  }, [kraPin]);

  const [storePhone, setStorePhone] = useState(() =>
    safeGetJSON<string>('retail_pos_store_phone', '+254 700 000 000', (val) => typeof val === 'string')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_store_phone', storePhone);
  }, [storePhone]);

  const [paybillTillNumber, setPaybillTillNumber] = useState(() =>
    safeGetJSON<string>('retail_pos_store_paybill', 'Till 1833804', (val) => typeof val === 'string')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_store_paybill', paybillTillNumber);
  }, [paybillTillNumber]);

  const [kraTaxRate, setKraTaxRate] = useState(() =>
    safeGetJSON<number>('retail_pos_kra_tax_rate', 1.5, (val) => typeof val === 'number')
  );
  useEffect(() => {
    safeSetJSON('retail_pos_kra_tax_rate', kraTaxRate);
  }, [kraTaxRate]);

  const [isSavedSettings, setIsSavedSettings] = useState(false);

  // Confirm dialogs state
  const [confirmModal, setConfirmModal] = useState<'reset' | 'clear_tx' | 'clear_exp' | null>(null);

  // Full Data Snapshot Modal state
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [showEmailBackupModal, setShowEmailBackupModal] = useState(false);

  const triggerNotify = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4500);
  };

  const resolvedStoreName = (activeStoreName || storeName || 'Rofani POS').trim();
  const resolvedStoreId = (activeStoreId || '').trim() || 'active-store';
  const nativeFileShareSupported = canUseNativeFileShare();

  const buildActiveStoreSnapshot = () =>
    buildCompleteStoreBackupPayload({
      storeId: resolvedStoreId,
      accountEmail,
      storeName: resolvedStoreName,
      storeSettingsOverrides: {
        storeName: resolvedStoreName,
        kraPin,
        phone: storePhone,
        paybillTillNumber,
        kraTaxRate,
      },
      products,
      categories,
      transactions,
      customers,
      suppliers,
      expenses,
      attendanceRecords,
      allUsers,
      stores,
    });

  // 1. Export entire active store database to timestamped JSON
  const handleExportFullDatabaseJSON = () => {
    const fullBackup = buildActiveStoreSnapshot();
    const fileName = getStoreBackupFileName(resolvedStoreName, 'json', 'RofaniPOS_Backup');
    const jsonString = JSON.stringify(fullBackup, null, 2);

    triggerBrowserDownload(jsonString, fileName, 'application/json');
    const meta = recordLastBackupMeta({
      timestamp: new Date().toISOString(),
      method: 'local_download',
      fileName,
      productsCount: fullBackup.summary.totalProducts,
      categoriesCount: fullBackup.summary.totalCategories,
      salesCount: fullBackup.summary.totalTransactions,
      customersCount: fullBackup.summary.totalCustomers,
      storeId: resolvedStoreId,
      storeName: resolvedStoreName,
    });
    setLastBackupMeta(meta);

    playBackupSuccessSound();
    triggerNotify('✅ Backup saved to your Downloads folder!');
  };

  // 1b. Export human-readable CSV summary (Store Overview + Products + Sales)
  const handleExportStoreSummaryCSV = () => {
    const fullBackup = buildActiveStoreSnapshot();
    const fileName = getStoreBackupFileName(resolvedStoreName, 'csv', 'RofaniPOS_Summary');
    const csvContent = buildHumanReadableStoreSummaryCSV(fullBackup);

    triggerBrowserDownload(csvContent, fileName, 'text/csv;charset=utf-8;');
    const meta = recordLastBackupMeta({
      timestamp: new Date().toISOString(),
      method: 'csv_summary',
      fileName,
      productsCount: fullBackup.summary.totalProducts,
      categoriesCount: fullBackup.summary.totalCategories,
      salesCount: fullBackup.summary.totalTransactions,
      customersCount: fullBackup.summary.totalCustomers,
      storeId: resolvedStoreId,
      storeName: resolvedStoreName,
    });
    setLastBackupMeta(meta);

    playBackupSuccessSound();
    triggerNotify(`✅ Store CSV summary saved to Downloads (${fileName})!`);
  };

  // 1c. Share or Email backup copy using Web Share API or mailto: fallback
  const handleExecuteShareOrEmailBackup = async (preferNativeShare = true) => {
    const trimmedEmail = backupEmailInput.trim();
    if (!preferNativeShare && (!trimmedEmail || !trimmedEmail.includes('@'))) {
      setShareFeedback({
        type: 'error',
        message: 'Please enter a valid email address to prepare your email backup draft.',
      });
      return;
    }

    if (trimmedEmail) {
      safeSetJSON('rofani_pos_backup_email', trimmedEmail);
    }

    setIsSharingBackup(true);
    setShareFeedback(null);
    try {
      const payload = buildActiveStoreSnapshot();
      const result = await shareOrEmailStoreBackup({
        payload,
        recipientEmail: trimmedEmail || accountEmail || '',
        preferNativeShare,
      });

      if (result.outcome === 'web_share') {
        setLastBackupMeta(getLastBackupMeta());
        playBackupSuccessSound();
        setShareFeedback({
          type: 'success',
          message: `✅ Backup file (${result.fileName}) shared successfully!`,
        });
        triggerNotify(`✅ Backup shared (${result.fileName})!`);
      } else if (result.outcome === 'mailto_fallback') {
        setLastBackupMeta(getLastBackupMeta());
        playBackupSuccessSound();
        setShareFeedback({
          type: 'success',
          message: `✅ Backup saved to Downloads (${result.fileName}) and your email draft was opened. Tap Attach and select "${result.fileName}" before sending.`,
        });
        triggerNotify(`✅ Email draft opened & ${result.fileName} saved to Downloads!`);
      } else {
        setShareFeedback({
          type: 'info',
          message: 'Share sheet closed — no changes were made.',
        });
      }
    } catch (err: any) {
      setShareFeedback({
        type: 'error',
        message: err?.message || 'Could not share or prepare email backup.',
      });
    } finally {
      setIsSharingBackup(false);
    }
  };

  // 2. Export Products as CSV
  const handleExportProductsCSV = () => {
    let csv = 'ID,Name,Category,SKU,Barcode,CostPrice(KSh),SellingPrice(KSh),StockQuantity,Unit,Supplier\n';
    products.forEach((p) => {
      csv += `"${p.id}","${p.name.replace(/"/g, '""')}","${p.category}","${p.sku || ''}","${p.barcode || ''}",${p.costPrice},${p.sellingPrice},${p.stockQuantity},"${p.unit}","${p.supplierId || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rofani_Products_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerNotify('Products CSV export generated successfully!');
  };

  // 3. Export Sales Transactions CSV
  const handleExportTransactionsCSV = () => {
    let csv = 'ReceiptNumber,Date,Customer,ItemsCount,Subtotal(KSh),Discount(KSh),GrandTotal(KSh),AmountPaid(KSh),BalanceDue(KSh),Status,PaymentMethods\n';
    transactions.forEach((tx) => {
      const pm = tx.payments.map((p) => `${p.method}:${p.amount}`).join(';');
      csv += `"${tx.receiptNumber}","${tx.date}","${tx.customerName || 'Walk-in'}",${tx.items.length},${tx.subtotal},${tx.discountTotal},${tx.grandTotal},${tx.amountPaid},${tx.balanceDue},"${tx.paymentStatus}","${pm}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rofani_Sales_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerNotify('Sales Transactions CSV export generated successfully!');
  };

  // 4. Import / Restore JSON Backup (Opens Admin PIN-Protected Preview Modal)
  const handleImportJSONFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const preview = parseStoreBackupFile(String(event.target?.result || ''), file.name);
        setRestoreMode('merge');
        setRestorePinInput('');
        setShowRestorePin(false);
        setRestorePinError(null);
        setPendingRestorePreview(preview);
        setErrorMessage(null);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to parse JSON backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmPinProtectedRestore = () => {
    if (!pendingRestorePreview) return;
    const enteredPin = restorePinInput.trim();
    if (!enteredPin) {
      setRestorePinError('Enter your Admin PIN to authorize restoring this backup.');
      return;
    }

    const isMasterValid = enteredPin === (masterPin || '1234');
    const isAdminWorkerPinValid = (allUsers || []).some(
      (u) =>
        u.status !== 'inactive' &&
        (u.role === 'Admin' || u.role === 'Manager' || (u.roles || []).includes('Admin')) &&
        String(u.pin || '').trim() === enteredPin
    );

    if (!isMasterValid && !isAdminWorkerPinValid) {
      setRestorePinError('Incorrect Admin PIN. Please enter the Store Master PIN or an Admin PIN.');
      return;
    }

    setIsRestoringBackup(true);
    try {
      const { importPayload } = pendingRestorePreview;
      onImportData(importPayload, { mode: restoreMode });

      if (importPayload.storeInfo) {
        const si: any = importPayload.storeInfo;
        if (si.storeName || si.name) setStoreName(si.storeName || si.name);
        if (typeof si.kraPin === 'string') setKraPin(si.kraPin);
        if (typeof si.phone === 'string') setStorePhone(si.phone);
        if (typeof si.paybillTillNumber === 'string') setPaybillTillNumber(si.paybillTillNumber);
        if (typeof si.kraTaxRate === 'number') setKraTaxRate(si.kraTaxRate);
      }

      const restoredParts: string[] = [];
      if (pendingRestorePreview.productsCount > 0) restoredParts.push(`${pendingRestorePreview.productsCount} products`);
      if (pendingRestorePreview.categoriesCount > 0) restoredParts.push(`${pendingRestorePreview.categoriesCount} categories`);
      if (pendingRestorePreview.salesCount > 0) restoredParts.push(`${pendingRestorePreview.salesCount} sales`);
      if (pendingRestorePreview.customersCount > 0) restoredParts.push(`${pendingRestorePreview.customersCount} customers`);

      playBackupSuccessSound();
      triggerNotify(
        `✅ ${restoreMode === 'replace' ? 'Restored' : 'Safely merged'} ${restoredParts.join(', ') || 'store records'} into ${resolvedStoreName}!`
      );
      setPendingRestorePreview(null);
      setRestorePinInput('');
      setRestorePinError(null);
    } catch (err: any) {
      setRestorePinError(err?.message || 'Restore failed. Please check the backup file and try again.');
    } finally {
      setIsRestoringBackup(false);
    }
  };

  const handleSaveStoreSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavedSettings(true);
    triggerNotify('Store Tax & Profile Settings updated!');
    setTimeout(() => setIsSavedSettings(false), 3000);
  };

  // Calculate system storage metrics
  const totalDbRecords =
    products.length +
    categories.length +
    customers.length +
    suppliers.length +
    transactions.length +
    expenses.length +
    attendanceRecords.length;

  const estimatedStorageKb = Math.round(
    JSON.stringify({ products, transactions, customers, suppliers, expenses, attendanceRecords }).length / 1024
  );

  return (
    <div className="space-y-8">
      {/* Modern List-Style Settings Dashboard Menu */}
      <SettingsDashboardView
        products={products}
        categories={categories}
        customers={customers}
        suppliers={suppliers}
        transactions={transactions}
        expenses={expenses}
        attendanceRecords={attendanceRecords}
        allUsers={allUsers}
        onAddUser={onAddUser}
        onUpdateUser={onUpdateUser}
        onDeleteUser={onDeleteUser}
        stores={stores}
        activeStoreId={resolvedStoreId}
        activeStoreName={resolvedStoreName}
        onOpenStoreManager={onOpenStoreManager}
        onImportData={onImportData}
        displayTheme={displayTheme}
        onChangeDisplayTheme={onChangeDisplayTheme}
        fontScale={fontScale}
        onChangeFontScale={onChangeFontScale}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={onToggleSidebar}
        onOpenCloudSync={onOpenCloudSync}
        onTriggerSync={onTriggerSync}
        onOpenDataManagement={() => {
          const el = document.getElementById('local-email-backup-center') || document.getElementById('data-management-section');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
        onExportFullBackup={handleExportFullDatabaseJSON}
        onOpenEmailBackup={() => {
          setShareFeedback(null);
          setShowShareEmailModal(true);
        }}
        deviceFormat={deviceFormat}
        onChangeDeviceFormat={onChangeDeviceFormat}
        requirePinOnStartup={requirePinOnStartup}
        onToggleRequirePinOnStartup={onToggleRequirePinOnStartup}
        masterPin={masterPin}
        onUpdateMasterPin={onUpdateMasterPin}
        onLockNow={onLockNow}
        onOpenAuditLogs={onOpenAuditLogs}
        onOpenCategoryManager={onOpenCategoryManager}
      />

      <div id="data-management-section" className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto border-t border-slate-800 pt-8">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/30">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-100">Data Settings, Sync &amp; Backups</h2>
            <p className="text-xs text-slate-400">
              One-tap local phone backup, email &amp; WhatsApp share, PIN-protected file restore, and Cloud Firestore sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs px-3 py-1.5 rounded-xl font-mono flex items-center gap-1.5 font-semibold border ${
              lastBackupMeta
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              Last Backup:{' '}
              {lastBackupMeta
                ? `${formatLastBackupTimestamp(lastBackupMeta.timestamp)} (${formatBackupMethodLabel(lastBackupMeta.method)})`
                : 'Never'}
            </span>
          </span>
          <span className="bg-slate-800 border border-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-xl font-mono flex items-center gap-1.5 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> {totalDbRecords} Records
          </span>
        </div>
      </div>

      {/* Prominent Local Device & Email Backup Center */}
      <div
        id="local-email-backup-center"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 shadow-xl space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base text-white">Local Device &amp; Email Backup</h3>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-sky-300 border border-slate-700">
                  Store: {resolvedStoreName}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Package your complete store snapshot ({products.length} products, {categories.length} categories, {transactions.length} sales, {customers.length} customers &amp; settings) into <code className="text-slate-300">{getStoreBackupFileName(resolvedStoreName, 'json')}</code>.
              </p>
            </div>
          </div>

          <div
            className={`px-3 py-2 rounded-xl border text-xs font-mono flex items-center gap-2 shrink-0 ${
              lastBackupMeta
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                : 'bg-slate-800/80 border-slate-700 text-slate-300'
            }`}
          >
            <Clock className={`w-4 h-4 shrink-0 ${lastBackupMeta ? 'text-emerald-400' : 'text-amber-400'}`} />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Last Backup Date &amp; Time
              </div>
              <div className="font-bold text-xs">
                {lastBackupMeta
                  ? `${formatLastBackupTimestamp(lastBackupMeta.timestamp)} • ${formatBackupMethodLabel(lastBackupMeta.method)}`
                  : 'No backup created yet'}
              </div>
            </div>
          </div>
        </div>

        {/* Store Scope Snapshot Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Products</div>
            <div className="text-base font-black font-mono text-sky-400 mt-0.5">{products.length}</div>
          </div>
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Categories</div>
            <div className="text-base font-black font-mono text-indigo-400 mt-0.5">{categories.length}</div>
          </div>
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sales Receipts</div>
            <div className="text-base font-black font-mono text-emerald-400 mt-0.5">{transactions.length}</div>
          </div>
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customers</div>
            <div className="text-base font-black font-mono text-purple-400 mt-0.5">{customers.length}</div>
          </div>
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-3 col-span-2 sm:col-span-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Store Scope</div>
            <div className="text-xs font-mono font-bold text-slate-200 mt-1 truncate" title={`stores/${resolvedStoreId}`}>
              stores/{resolvedStoreId.slice(0, 12)}{resolvedStoreId.length > 12 ? '…' : ''}
            </div>
          </div>
        </div>

        {/* Hidden file input shared by Restore from File button */}
        <input
          ref={restoreFileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImportJSONFile}
          className="hidden"
        />

        {/* 3 Primary Actions: Download Local, Email/Share Copy, Restore from File */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            id="btn-download-backup-phone"
            data-feedback="backup"
            onClick={handleExportFullDatabaseJSON}
            className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white p-4 rounded-xl border border-emerald-400/50 shadow-lg shadow-emerald-950/50 transition text-left space-y-1.5 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-white/15">
                <Download className="w-5 h-5 text-white group-hover:translate-y-0.5 transition" />
              </div>
              <span className="text-[10px] font-black font-mono bg-slate-950/40 px-2 py-0.5 rounded-full text-emerald-100">
                .JSON SNAPSHOT
              </span>
            </div>
            <div className="font-extrabold text-sm text-white">Download Backup to Phone</div>
            <div className="text-[11px] text-emerald-100/90">
              Save complete store backup directly to Downloads (~{estimatedStorageKb} KB)
            </div>
          </button>

          <button
            type="button"
            id="btn-email-backup-copy"
            data-feedback="backup"
            onClick={() => {
              setShareFeedback(null);
              setShowShareEmailModal(true);
            }}
            className="bg-sky-600 hover:bg-sky-500 active:scale-95 text-white p-4 rounded-xl border border-sky-400/50 shadow-lg shadow-sky-950/50 transition text-left space-y-1.5 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-white/15">
                <Mail className="w-5 h-5 text-white group-hover:scale-105 transition" />
              </div>
              <span className="text-[10px] font-black font-mono bg-slate-950/40 px-2 py-0.5 rounded-full text-sky-100">
                {nativeFileShareSupported ? 'GMAIL / WHATSAPP' : 'EMAIL DRAFT'}
              </span>
            </div>
            <div className="font-extrabold text-sm text-white">Email Backup Copy</div>
            <div className="text-[11px] text-sky-100/90">
              Send backup file to Gmail, Yahoo, or WhatsApp in one tap
            </div>
          </button>

          <button
            type="button"
            id="btn-restore-from-file"
            onClick={() => restoreFileInputRef.current?.click()}
            className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-100 p-4 rounded-xl border border-slate-700 shadow-lg transition text-left space-y-1.5 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Upload className="w-5 h-5 group-hover:-translate-y-0.5 transition" />
              </div>
              <span className="text-[10px] font-black font-mono bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 rounded-full text-amber-300 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> PIN PROTECTED
              </span>
            </div>
            <div className="font-extrabold text-sm text-white">Restore from File</div>
            <div className="text-[11px] text-slate-300">
              Upload a saved .json backup, preview counts, and restore with Admin PIN
            </div>
          </button>
        </div>

        {/* Optional CSV Summary & Advanced Backup Shortcuts */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportStoreSummaryCSV}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Download CSV Summary (Products &amp; Sales)</span>
            </button>
            <button
              type="button"
              onClick={() => setShowEmailBackupModal(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Daily Scheduled Gmail Backup</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowSnapshotModal(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
          >
            <Lock className="w-4 h-4 text-indigo-400" />
            <span>AES-256 Encrypted Snapshot</span>
          </button>
        </div>
      </div>

      {/* Success / Error Toast Alerts (Fixed Floating Toast + Inline Banner) */}
      {successMessage && (
        <>
          <div
            role="status"
            aria-live="polite"
            className="bg-emerald-900/70 border border-emerald-500/60 text-emerald-100 text-xs p-3.5 rounded-xl flex items-center gap-2 font-semibold shadow-lg"
          >
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[140] bg-emerald-950 border border-emerald-400/70 text-emerald-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold max-w-[92vw] animate-in fade-in slide-in-from-bottom-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        </>
      )}

      {/* Storage Health & Usage Indicator Card */}
      {(() => {
        const stats = getLocalStorageUsageStats();
        return (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-800">Local Storage Health & Space Utilization</h3>
              </div>
              <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
                {stats.usedKb} KB used ({stats.percentUsed}% of ~5MB limit)
              </span>
            </div>

            <div className="space-y-2">
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    stats.percentUsed > 80 ? 'bg-rose-500' : stats.percentUsed > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.max(3, stats.percentUsed)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>0 KB</span>
                <span>Rolling Sales Archive Active (Max 5,000 txs)</span>
                <span>~5,000 KB (5 MB)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
              {stats.breakdown.slice(0, 4).map((item) => (
                <div key={item.key} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 truncate" title={item.key}>{item.key}</div>
                  <div className="text-xs font-bold text-slate-800 font-mono">{item.sizeKb} KB</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Real-Time Cloud Synchronization & Worker Phone Sharing Highlight Card */}
      <div className="bg-gradient-to-r from-sky-900/90 via-blue-900/90 to-indigo-900/90 border border-sky-500/40 rounded-2xl p-5 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 bg-sky-500/20 text-sky-300 rounded-xl flex items-center justify-center border border-sky-400/40 shrink-0">
            <Cloud className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white">Live Multi-Phone Cloud Synchronization</h3>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Firebase Realtime Active
              </span>
            </div>
            <p className="text-xs text-sky-200 mt-1 max-w-2xl">
              All inventory, prices, sales, and stock counts automatically sync in real-time across every worker's phone or computer. Share the app URL or QR code with staff to keep everyone in sync.
            </p>
          </div>
        </div>

        {onOpenCloudSync && (
          <button
            type="button"
            onClick={onOpenCloudSync}
            className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition shrink-0"
          >
            <Share2 className="w-4 h-4" />
            <span>Open Sync & Share Hub</span>
          </button>
        )}
      </div>

      {/* One-Tap Migration Tool ("Sync Local Data to Cloud") */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-sky-500/20 text-sky-400 rounded-xl flex items-center justify-center border border-sky-400/30 shrink-0">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-slate-100">Upload Local Data to Cloud Firestore</h3>
                {lastSyncedTime && (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3" /> Last synced: {lastSyncedTime}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Instantly push all {products.length} products, sales, customers, suppliers, and expenses into Cloud Firestore in fast 25-item batches.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handlePullDataFromCloud}
              disabled={isPullingData || isCloudSyncing}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-100 font-bold rounded-xl text-xs flex items-center gap-2 border border-slate-700 shadow-md transition shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <Download className={`w-4 h-4 ${isPullingData ? 'animate-spin' : ''}`} />
              <span>{isPullingData ? 'Pulling from Cloud...' : 'Pull / Restore from Cloud'}</span>
            </button>
            <button
              type="button"
              onClick={handleUploadLocalDataToCloud}
              disabled={isCloudSyncing || isPullingData}
              className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <Upload className={`w-4 h-4 ${isCloudSyncing ? 'animate-spin' : ''}`} />
              <span>{isCloudSyncing ? 'Uploading to Cloud...' : 'Sync Local Data to Cloud'}</span>
            </button>
          </div>
        </div>

        {/* Live Upload/Pull Progress Bar */}
        {uploadProgress && (
          <div className="bg-sky-950/70 border border-sky-500/50 text-sky-100 text-xs p-3.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold min-w-0">
                <RefreshCw className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                <span className="truncate">{uploadProgress.label}</span>
              </div>
              <span className="font-mono font-bold text-sky-300 shrink-0">{uploadProgress.percent}%</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-sky-800/60">
              <div
                className="bg-sky-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(4, uploadProgress.percent)}%` }}
              />
            </div>
          </div>
        )}

        {/* Inline Sync Confirmation / Error Card right inside the Sync section */}
        {cloudSyncFeedback && (
          <div
            role="status"
            aria-live="polite"
            className={`text-xs p-3.5 rounded-xl border flex items-start gap-2.5 ${
              cloudSyncFeedback.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-100'
                : cloudSyncFeedback.type === 'warning'
                ? 'bg-amber-950/70 border-amber-500/60 text-amber-100'
                : 'bg-rose-950/70 border-rose-500/60 text-rose-100'
            }`}
          >
            {cloudSyncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  cloudSyncFeedback.type === 'warning' ? 'text-amber-400' : 'text-rose-400'
                }`}
              />
            )}
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-extrabold">{cloudSyncFeedback.title}</span>
                <span className="text-[10px] font-mono opacity-80">{cloudSyncFeedback.timestamp}</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-95">{cloudSyncFeedback.details}</p>
            </div>
          </div>
        )}

        {/* Cloud Sync History & Reliability Overview Strip */}
        {(() => {
          const successOps = syncHistory.filter((e) => e.status === 'success').length;
          const failedOps = syncHistory.filter((e) => e.status !== 'success').length;
          const latestEntry: SyncHistoryEntry | undefined = syncHistory[0];

          return (
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/35 flex items-center justify-center shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-slate-100">Cloud Sync History &amp; Reliability Log</h4>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {successOps} Succeeded
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      failedOps > 0
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {failedOps} Failed
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {latestEntry
                      ? `Latest (${new Date(latestEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}): ${latestEntry.summary}`
                      : 'No sync events recorded yet. Operations will appear here automatically as sales and edits sync.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-open-cloud-sync-history"
                onClick={() => setShowSyncHistoryModal(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white border border-sky-500/40 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 cursor-pointer self-end sm:self-center"
              >
                <History className="w-4 h-4" />
                <span>View Sync History ({syncHistory.length})</span>
              </button>
            </div>
          );
        })()}

        {/* Aggressive Auto-Sync Toggle (Battery & Mobile Data Optimization) */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                aggressiveAutoSync
                  ? 'bg-sky-500/15 text-sky-400 border-sky-500/40'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/40'
              }`}
            >
              {aggressiveAutoSync ? (
                <Wifi className="w-5 h-5" />
              ) : (
                <BatteryCharging className="w-5 h-5" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm text-slate-100">Aggressive Auto-Sync on Connection</h4>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${
                    aggressiveAutoSync
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {aggressiveAutoSync ? 'Enabled (Instant Sync)' : 'Paused (Battery & Data Saver)'}
                </span>
                {!aggressiveAutoSync && pendingCount > 0 && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-orange-500 text-slate-950">
                    {pendingCount} Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                {aggressiveAutoSync
                  ? 'Automatically flushes queued offline sales, edits, and inventory updates to Cloud Firestore the moment internet connectivity is detected or restored.'
                  : 'Saves mobile data and battery life by holding offline queue uploads until you manually tap "Retry All Pending Syncs" or "Sync Local Data to Cloud".'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
            <span className="text-xs font-bold text-slate-300">
              {aggressiveAutoSync ? 'Auto-Sync ON' : 'Data Saver ON'}
            </span>
            <button
              type="button"
              id="toggle-aggressive-auto-sync"
              role="switch"
              aria-checked={aggressiveAutoSync}
              aria-label="Toggle Aggressive Auto-Sync"
              onClick={handleToggleAggressiveAutoSync}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                aggressiveAutoSync ? 'bg-sky-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  aggressiveAutoSync ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* EMERGENCY RECOVERY CARD: Detects if any larger local snapshot exists (e.g. 500+ items vs current 29) */}
      {(() => {
        const backups = findRecoverableBackups();
        if (backups.length === 0) return null;
        const largest = backups[0];
        const hasMoreThanCurrent = largest.productsCount > products.length;

        return (
          <div
            className={`rounded-2xl p-5 border-2 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
              hasMoreThanCurrent
                ? 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-amber-500 text-amber-100'
                : 'bg-slate-900 border-slate-800 text-slate-200'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                  hasMoreThanCurrent
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-400/50'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <History className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-sm text-white">Emergency Catalog Rollback & Snapshots</h4>
                  {hasMoreThanCurrent ? (
                    <span className="bg-amber-500 text-slate-950 text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wide animate-pulse">
                      {largest.productsCount} Items Recoverable
                    </span>
                  ) : (
                    <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
                      {backups.length} Snapshots Available
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {hasMoreThanCurrent
                    ? `Found emergency snapshot "${largest.label}" containing ${largest.productsCount} products and ${largest.salesCount} sales from ${largest.formattedDate}. If pulling from cloud truncated your catalog to ${products.length} items, click below to restore your full catalog instantly.`
                    : `Saved local snapshots detected in browser storage. Current inventory has ${products.length} items.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                id="btn-restore-largest-snapshot"
                onClick={async () => {
                  if (onEmergencyRestore) {
                    const ok = await onEmergencyRestore(largest.key);
                    if (ok) {
                      triggerNotify(`✨ Restored ${largest.productsCount} products from ${largest.label}!`);
                    }
                  }
                }}
                className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-md transition shrink-0 cursor-pointer ${
                  hasMoreThanCurrent
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95 shadow-amber-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restore {largest.productsCount} Items Snapshot</span>
              </button>
            </div>
          </div>
        );
      })()}

      {errorMessage && (
        <div className="bg-rose-900/60 border border-rose-500/50 text-rose-200 text-xs p-3.5 rounded-xl flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Persistent Camera & Barcode Auto-Permission Settings */}
      <CameraPermissionsCard />

      {/* Main Grid: Settings & Backup Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Display Appearance & Business Profile */}
        <div className="lg:col-span-1 space-y-6">
          {/* Display & Appearance Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Palette className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-sm text-slate-800">Display Appearance & Layout</h3>
            </div>

            {/* Theme Mode Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Display Theme Mode</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChangeDisplayTheme?.('light');
                    triggerNotify('Display theme changed to Light Mode');
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition gap-1.5 ${
                    displayTheme === 'light'
                      ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onChangeDisplayTheme?.('dark');
                    triggerNotify('Display theme changed to Dark Mode');
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition gap-1.5 ${
                    displayTheme === 'dark'
                      ? 'bg-slate-900 border-slate-800 text-white font-bold shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Moon className="w-4 h-4 text-sky-400" />
                  <span>Dark Slate</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onChangeDisplayTheme?.('contrast');
                    triggerNotify('Display theme changed to High Contrast');
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition gap-1.5 ${
                    displayTheme === 'contrast'
                      ? 'bg-indigo-950 border-indigo-600 text-amber-300 font-bold shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Monitor className="w-4 h-4 text-amber-400" />
                  <span>Contrast</span>
                </button>
              </div>
            </div>

            {/* Font / Touch Scale */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">UI & Font Density</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChangeFontScale?.('normal');
                    triggerNotify('UI font density set to Standard');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                    fontScale === 'normal'
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Standard (100%)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onChangeFontScale?.('large');
                    triggerNotify('UI font density set to Touch Friendly / Large');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                    fontScale === 'large'
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Touch Large (+15%)</span>
                </button>
              </div>
            </div>

            {/* Display Layout / Format: Full Version vs Mobile Frame */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">Display Layout & View Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="btn-settings-switch-to-computer"
                  onClick={() => {
                    onChangeDeviceFormat?.('computer');
                    triggerNotify('Switched to Full Version (Computer / Desktop)');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    deviceFormat === 'computer'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Monitor className="w-4 h-4 text-blue-300" />
                  <span>Full PC View</span>
                </button>

                <button
                  type="button"
                  id="btn-settings-switch-to-phone"
                  onClick={() => {
                    onChangeDeviceFormat?.('phone');
                    triggerNotify('Switched to Mobile Phone Format');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    deviceFormat === 'phone'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Mobile Phone View</span>
                </button>
              </div>
            </div>

            {/* Layout Canvas Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">Display Layout Shortcuts</label>
              <div className="space-y-1.5 text-xs">
                {onToggleSidebar && (
                  <button
                    type="button"
                    onClick={onToggleSidebar}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-slate-800 font-semibold transition"
                  >
                    <div className="flex items-center gap-2">
                      {isSidebarCollapsed ? <PanelLeft className="w-4 h-4 text-blue-600" /> : <PanelLeftClose className="w-4 h-4 text-slate-500" />}
                      <span>{isSidebarCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Sidebar for Full Workspace'}</span>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!document.fullscreenElement) {
                      document.documentElement.requestFullscreen().catch(() => {});
                    } else if (document.exitFullscreen) {
                      document.exitFullscreen();
                    }
                  }}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-slate-800 font-semibold transition"
                >
                  <div className="flex items-center gap-2">
                    <Maximize2 className="w-4 h-4 text-blue-600" />
                    <span>Toggle Fullscreen Display Mode</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-slate-800 font-semibold transition"
                >
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-emerald-600" />
                    <span>Open in Full Unframed Window Tab</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Store Branches & Multi-Outlet Settings Card */}
          {onOpenStoreManager && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-800">Store Branches & Multi-Outlet Settings</h3>
                </div>
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold">
                  {stores?.length || 4} Outlets
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Edit store branch names, street address, manager assignments, customize demo outlets, and manage inter-branch stock transfers.
              </p>
              <button
                type="button"
                onClick={onOpenStoreManager}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                <span>Open Branch & Store Editor</span>
              </button>
            </div>
          )}

          {/* Business Profile */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-800">Business & KRA Tax Profile</h3>
            </div>

          <form onSubmit={handleSaveStoreSettings} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Store Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">KRA PIN Number</label>
              <input
                type="text"
                value={kraPin}
                onChange={(e) => setKraPin(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. P051234567X"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">KRA Turnover Tax (TOT) Rate %</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={kraTaxRate}
                  onChange={(e) => setKraTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-amber-600 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="font-bold text-slate-500">%</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Standard Kenya KRA TOT rate is 1.5% for sales &lt; KSh 25M</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Store Phone / M-Pesa Contact</label>
              <input
                type="text"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">M-Pesa Paybill / Till Number</label>
              <input
                type="text"
                value={paybillTillNumber}
                onChange={(e) => setPaybillTillNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 mt-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSavedSettings ? 'Settings Saved!' : 'Save Profile & Tax Settings'}</span>
            </button>
          </form>
        </div>

        {/* Terminal Login PIN & Sharing Security Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-800">Login PIN & Sharing Security</h3>
              <p className="text-[11px] text-slate-400">Lock app with PIN before sharing with workers</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Require PIN on Startup Toggle */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-purple-600" />
                  <span>Require Login PIN on Startup</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requirePinOnStartup}
                    onChange={(e) => {
                      onToggleRequirePinOnStartup?.(e.target.checked);
                      triggerNotify(
                        e.target.checked
                          ? 'Login PIN required on app load enabled!'
                          : 'PIN requirement on load disabled'
                      );
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                When active, anyone opening the app or sharing link must enter a security PIN before accessing your store.
              </p>
            </div>

            {/* Store Master PIN Settings */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700">Store Master PIN Code</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showMasterPin ? 'text' : 'password'}
                    maxLength={8}
                    value={inputMasterPin}
                    onChange={(e) => setInputMasterPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 1234"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMasterPin(!showMasterPin)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showMasterPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (inputMasterPin.length < 4) {
                      setErrorMessage('Master PIN must be at least 4 digits.');
                      return;
                    }
                    onUpdateMasterPin?.(inputMasterPin);
                    triggerNotify('Master Store PIN updated successfully.');
                  }}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition shadow-sm"
                >
                  Save PIN
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Staff can also authenticate using their own individual worker security PINs.
              </p>
            </div>

            {/* Lock Now Button */}
            {onLockNow && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  id="btn-settings-lock-terminal"
                  onClick={onLockNow}
                  className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Lock Terminal Now (Before Sharing)</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-1.5">
                  Locks the screen instantly so you can pass your phone or computer safely.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Middle Column: Export & Import Center (Dark Mode) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Backup & Export Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Export &amp; Backup Database</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg">
                ~{estimatedStorageKb} KB
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Download complete backups or individual spreadsheets of your store inventory and sales history.
            </p>

            {/* DAILY AUTOMATIC EMAIL BACKUP CARD */}
            <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 border-2 border-sky-500/60 rounded-2xl p-4.5 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 bg-sky-500/20 border border-sky-400/40 rounded-xl flex items-center justify-center text-sky-300 shrink-0 shadow-inner">
                  <Mail className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-sm text-white">Daily Automatic Email Backup</h4>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                      ● {accountEmail || 'Scheduled Gmail Dispatch'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Automated daily database snapshot emailed every evening with complete JSON database, products CSV, and financial summary.
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-open-email-backup-modal"
                data-feedback="backup"
                onClick={() => setShowEmailBackupModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-sky-600/30 ring-2 ring-sky-400/40 transition shrink-0 active:scale-95 cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>Configure Schedule</span>
              </button>
            </div>

            {/* FULL ENCRYPTED DATA SNAPSHOT CARD */}
            <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border border-indigo-500/50 rounded-2xl p-4.5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 bg-indigo-500/20 border border-indigo-400/40 rounded-xl flex items-center justify-center text-indigo-300 shrink-0 shadow-inner">
                  <Lock className="w-5 h-5 text-sky-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm text-white">Download Encrypted Data Snapshot</h4>
                    <span className="bg-sky-500/20 text-sky-200 border border-sky-400/40 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                      AES-256 / Unified CSV
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Export all collections ({products.length} products, {transactions.length} sales, {customers.length} customers) into a password-encrypted JSON or unified CSV file.
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-open-full-data-snapshot"
                data-feedback="backup"
                onClick={() => setShowSnapshotModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/40 transition shrink-0 active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Encrypted Snapshot</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                id="btn-full-system-backup-json"
                data-feedback="backup"
                onClick={handleExportFullDatabaseJSON}
                className="bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:via-teal-500 hover:to-sky-500 text-white p-3.5 rounded-xl transition text-left space-y-1.5 shadow-lg shadow-emerald-900/30 border border-emerald-400/60 group cursor-pointer active:scale-95"
              >
                <div className="flex items-center justify-between">
                  <div className="p-1.5 bg-white/15 rounded-lg">
                    <FileJson className="w-5 h-5 text-amber-200 group-hover:scale-110 transition" />
                  </div>
                  <span className="text-[10px] font-black font-mono bg-amber-300 text-slate-950 px-2 py-0.5 rounded-full shadow-sm">
                    FULL BACKUP • JSON
                  </span>
                </div>
                <div className="font-extrabold text-xs text-white">Download Backup to Phone</div>
                <div className="text-[10px] text-emerald-100">Products, Categories, Sales, Customers &amp; Settings</div>
              </button>

              <button
                type="button"
                onClick={handleExportProductsCSV}
                className="bg-slate-800 hover:bg-slate-700 text-slate-100 p-3.5 rounded-xl border border-slate-700 transition text-left space-y-1.5 group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition" />
                  <span className="text-[10px] font-mono text-slate-400">CSV</span>
                </div>
                <div className="font-bold text-xs text-white">Products Inventory CSV</div>
                <div className="text-[10px] text-slate-400">{products.length} SKU items list</div>
              </button>

              <button
                type="button"
                onClick={handleExportTransactionsCSV}
                className="bg-slate-800 hover:bg-slate-700 text-slate-100 p-3.5 rounded-xl border border-slate-700 transition text-left space-y-1.5 group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <Receipt className="w-5 h-5 text-sky-400 group-hover:scale-110 transition" />
                  <span className="text-[10px] font-mono text-slate-400">CSV</span>
                </div>
                <div className="font-bold text-xs text-white">Sales Transactions CSV</div>
                <div className="text-[10px] text-slate-400">{transactions.length} receipts history</div>
              </button>

              {onOpenAuditLogs && (
                <button
                  type="button"
                  onClick={onOpenAuditLogs}
                  className="bg-purple-950/50 hover:bg-purple-900/50 text-purple-100 p-3.5 rounded-xl border border-purple-500/40 transition text-left space-y-1.5 group md:col-span-3 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 text-purple-300 rounded-lg group-hover:scale-110 transition">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">Worker Role Authorization Audit Trail</div>
                      <div className="text-[10px] text-purple-200/80">Inspect full audit ledger of worker roles authorizing sensitive actions (expense deletions, catalog edits)</div>
                    </div>
                  </div>
                  <span className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-sm transition shrink-0">
                    View Audit Logs →
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Import / Restore Database Box (Dark Mode + PIN Protected) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-sm text-white">Restore Data from Backup File</h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Admin PIN Required
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Select a previously saved `.json` backup file to preview its item &amp; sales count, enter your Admin PIN, and safely merge or restore into your store (<code className="text-slate-300">stores/{resolvedStoreId}</code>).
            </p>

            <div className="border-2 border-dashed border-slate-700 hover:border-sky-500 bg-slate-950/70 hover:bg-slate-800/60 rounded-2xl p-6 text-center transition cursor-pointer relative">
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImportJSONFile}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-11 h-11 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-full flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-xs text-white block">Tap to Select or Drag &amp; Drop Backup File</span>
                  <span className="text-[11px] text-slate-400">Supports Rofani POS `.json` store backup files</span>
                </div>
              </div>
            </div>
          </div>

          {/* System Storage & Database Purge Tools */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-slate-700" />
                <h3 className="font-bold text-sm text-slate-800">Data Purge & Reset Actions</h3>
              </div>
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                Admin Caution Area
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => {
                  const result = deduplicateProducts(products);
                  if (result.removedProductsCount > 0) {
                    onImportData({ products: result.cleanedProducts });
                    triggerNotify(`✨ Auto-deleted ${result.removedProductsCount} repeated items & merged ${result.mergedStockUnitsTotal} stock units into unique catalog items!`);
                  } else {
                    triggerNotify('✨ No repeated or duplicate items found in catalog!');
                  }
                }}
                className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 p-3.5 rounded-xl transition text-left space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-800">
                    <Sparkles className="w-4 h-4 text-indigo-600" /> Auto Delete Duplicates
                  </div>
                  {detectDuplicateProducts(products).length > 0 && (
                    <span className="bg-indigo-600 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {detectDuplicateProducts(products).length}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-indigo-700">Merge duplicate stock & remove repeated SKUs</div>
              </button>

              <button
                onClick={() => setConfirmModal('reset')}
                className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 p-3.5 rounded-xl transition text-left space-y-1"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                  <RefreshCw className="w-4 h-4 text-amber-600" /> Reset Sample Data
                </div>
                <div className="text-[10px] text-amber-700">Restore default Kenyan store items</div>
              </button>

              <button
                onClick={() => setConfirmModal('clear_tx')}
                className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 p-3.5 rounded-xl transition text-left space-y-1"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-rose-800">
                  <Trash2 className="w-4 h-4 text-rose-600" /> Clear Sales History
                </div>
                <div className="text-[10px] text-rose-700">Purge {transactions.length} receipt records</div>
              </button>

              <button
                onClick={() => setConfirmModal('clear_exp')}
                className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 p-3.5 rounded-xl transition text-left space-y-1"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-rose-800">
                  <Trash2 className="w-4 h-4 text-rose-600" /> Clear Expense Logs
                </div>
                <div className="text-[10px] text-rose-700">Purge {expenses.length} operating expenses</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center border border-rose-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">
                  {confirmModal === 'reset' && 'Reset to Default Sample Database?'}
                  {confirmModal === 'clear_tx' && 'Purge All Sales Receipts?'}
                  {confirmModal === 'clear_exp' && 'Purge All Expense Records?'}
                </h3>
                <p className="text-xs text-slate-400">This action cannot be undone without a backup file.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
              {confirmModal === 'reset' &&
                'This will replace your current store inventory, transactions, customers, and expenses with the default Rofani POS retail & wholesale sample dataset.'}
              {confirmModal === 'clear_tx' &&
                `Are you sure you want to delete all ${transactions.length} sales transactions? Your inventory product stock counts will remain intact.`}
              {confirmModal === 'clear_exp' &&
                `Are you sure you want to clear all ${expenses.length} recorded operating expenses?`}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmModal === 'reset') {
                    onResetSampleData();
                    triggerNotify('Sample database restored successfully!');
                  } else if (confirmModal === 'clear_tx') {
                    onClearTransactions();
                    triggerNotify('Sales history purged!');
                  } else if (confirmModal === 'clear_exp') {
                    onClearExpenses();
                    triggerNotify('Expense logs purged!');
                  }
                  setConfirmModal(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 transition"
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL DATA SNAPSHOT MODAL */}
      <DataSnapshotModal
        isOpen={showSnapshotModal}
        onClose={() => setShowSnapshotModal(false)}
        products={products}
        transactions={transactions}
        customers={customers}
        suppliers={suppliers}
        expenses={expenses}
        attendanceRecords={attendanceRecords}
        allUsers={allUsers}
        stores={stores}
        storeName={resolvedStoreName}
        masterPin={masterPin}
        onRestoreSnapshot={onImportData}
      />

      {/* DAILY AUTOMATIC EMAIL BACKUP MODAL */}
      <DailyEmailBackupModal
        isOpen={showEmailBackupModal}
        onClose={() => setShowEmailBackupModal(false)}
        products={products}
        transactions={transactions}
        customers={customers}
        suppliers={suppliers}
        expenses={expenses}
        allUsers={allUsers}
        storeName={resolvedStoreName}
      />

      {/* ONE-TAP EMAIL & SHARE BACKUP MODAL */}
      {showShareEmailModal && (
        <div
          className="fixed inset-0 z-[135] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowShareEmailModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Email or Share Store Backup</h3>
                  <p className="text-xs text-slate-400">
                    Attach {getStoreBackupFileName(resolvedStoreName, 'json')} to Gmail, Yahoo, or WhatsApp
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareEmailModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                aria-label="Close Email Backup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {shareFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2 ${
                    shareFeedback.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                      : shareFeedback.type === 'error'
                      ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                      : 'bg-sky-950/60 border-sky-500/50 text-sky-200'
                  }`}
                >
                  {shareFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{shareFeedback.message}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Destination Email Address
                </label>
                <input
                  type="email"
                  value={backupEmailInput}
                  onChange={(e) => setBackupEmailInput(e.target.value)}
                  placeholder="Enter your email (e.g. shopowner@gmail.com)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[11px] text-slate-400">
                  Defaults to your registered account email. On mobile, tap Share to send the attached `.json` file directly to Gmail, Yahoo, or WhatsApp.
                </p>
              </div>

              <div className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-3.5 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-semibold">Included Store Snapshot:</span>
                  <span className="font-mono text-[11px] text-sky-300">{resolvedStoreName}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-400 font-mono pt-1">
                  <span>• Products: <b className="text-white">{products.length}</b></span>
                  <span>• Categories: <b className="text-white">{categories.length}</b></span>
                  <span>• Sales Receipts: <b className="text-white">{transactions.length}</b></span>
                  <span>• Customers: <b className="text-white">{customers.length}</b></span>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                {nativeFileShareSupported && (
                  <button
                    type="button"
                    disabled={isSharingBackup}
                    onClick={() => handleExecuteShareOrEmailBackup(true)}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{isSharingBackup ? 'Preparing Backup File...' : 'Share Backup File (Gmail / Yahoo / WhatsApp)'}</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={isSharingBackup}
                  onClick={() => handleExecuteShareOrEmailBackup(false)}
                  className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSharingBackup
                      ? 'Preparing Email Draft...'
                      : 'Save Backup & Open Email Draft'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowShareEmailModal(false);
                    setShowEmailBackupModal(true);
                  }}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Open Scheduled Daily Gmail Auto-Backup</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN PIN-PROTECTED RESTORE PREVIEW MODAL */}
      {pendingRestorePreview && (
        <div
          className="fixed inset-0 z-[136] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setPendingRestorePreview(null)}
        >
          <div
            className="bg-slate-900 border border-amber-500/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Preview &amp; Authorize Store Restore</h3>
                  <p className="text-xs text-slate-400 truncate max-w-[260px]">
                    {pendingRestorePreview.fileName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingRestorePreview(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                aria-label="Cancel Restore"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Source Metadata */}
              <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-3.5 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Backup Store:</span>
                  <span className="font-bold text-white">{pendingRestorePreview.sourceStoreName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Exported On:</span>
                  <span className="font-mono text-slate-200">
                    {pendingRestorePreview.exportedAt
                      ? formatLastBackupTimestamp(pendingRestorePreview.exportedAt)
                      : 'Unknown date'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Target Store:</span>
                  <span className="font-mono text-sky-300">stores/{resolvedStoreId}</span>
                </div>
              </div>

              {/* Record Counts Preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Products</div>
                  <div className="text-base font-black font-mono text-sky-400">
                    {pendingRestorePreview.productsCount}
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Categories</div>
                  <div className="text-base font-black font-mono text-indigo-400">
                    {pendingRestorePreview.categoriesCount}
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Sales</div>
                  <div className="text-base font-black font-mono text-emerald-400">
                    {pendingRestorePreview.salesCount}
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Customers</div>
                  <div className="text-base font-black font-mono text-purple-400">
                    {pendingRestorePreview.customersCount}
                  </div>
                </div>
              </div>

              {/* Restore Mode Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">Restore Strategy</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestoreMode('merge')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      restoreMode === 'merge'
                        ? 'bg-emerald-950/60 border-emerald-500 text-white'
                        : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold text-xs">Merge Safely (Recommended)</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Adds &amp; updates backup records while keeping existing store items
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestoreMode('replace')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      restoreMode === 'replace'
                        ? 'bg-amber-950/60 border-amber-500 text-white'
                        : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold text-xs">Full Store Restore</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Replaces current lists with exact snapshot from this backup file
                    </div>
                  </button>
                </div>
              </div>

              {/* Admin PIN Verification */}
              <div className="space-y-1.5 bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Enter Admin PIN to Confirm Restore</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type={showRestorePin ? 'text' : 'password'}
                    inputMode="numeric"
                    value={restorePinInput}
                    onChange={(e) => {
                      setRestorePinInput(e.target.value);
                      if (restorePinError) setRestorePinError(null);
                    }}
                    placeholder="Enter 4-digit Admin PIN"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRestorePin((v) => !v)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                    aria-label="Toggle PIN visibility"
                  >
                    {showRestorePin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {restorePinError && (
                  <p className="text-[11px] text-rose-400 font-semibold mt-1">{restorePinError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setPendingRestorePreview(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRestoringBackup}
                  onClick={handleConfirmPinProtectedRestore}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isRestoringBackup ? 'Restoring...' : 'Authorize & Restore Backup'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLOUD SYNC HISTORY & RELIABILITY MODAL */}
      {showSyncHistoryModal && (() => {
        const totalOps = syncHistory.length;
        const successOps = syncHistory.filter((e) => e.status === 'success').length;
        const failedOps = syncHistory.filter((e) => e.status !== 'success').length;
        const reliabilityPct = totalOps > 0 ? Math.round((successOps / totalOps) * 100) : 100;

        const visibleEntries = syncHistory.filter((e) => {
          if (syncHistoryFilter === 'success') return e.status === 'success';
          if (syncHistoryFilter === 'failed') return e.status !== 'success';
          return true;
        });

        const getOpLabel = (op: SyncHistoryEntry['operation']) => {
          switch (op) {
            case 'realtime_sale':
              return 'Live Sale Sync';
            case 'queue_flush':
              return 'Offline Queue Sync';
            case 'full_upload':
              return 'Full Cloud Upload';
            case 'cloud_pull':
              return 'Cloud Pull / Restore';
            default:
              return 'Cloud Sync';
          }
        };

        return (
          <div
            className="fixed inset-0 z-[130] bg-slate-950/85 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowSyncHistoryModal(false)}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[88vh] my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/35 text-sky-400 flex items-center justify-center shrink-0">
                    <History className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-white truncate">
                      Cloud Sync History &amp; Reliability
                    </h3>
                    <p className="text-xs text-slate-400">
                      Recent successful Firestore syncs and failed attempts
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSyncHistoryModal(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
                  aria-label="Close Sync History"
                >
                  <span className="text-xs font-bold px-1">✕</span>
                </button>
              </div>

              {/* KPI Summary Strip */}
              <div className="grid grid-cols-3 gap-2.5 p-4 bg-slate-950/40 border-b border-slate-800">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Successful Syncs
                  </div>
                  <div className="text-lg font-black font-mono tabular-nums text-emerald-400 mt-0.5">
                    {successOps}
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Failed / Partial
                  </div>
                  <div className={`text-lg font-black font-mono tabular-nums mt-0.5 ${failedOps > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                    {failedOps}
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Sync Reliability
                  </div>
                  <div className={`text-lg font-black font-mono tabular-nums mt-0.5 ${
                    reliabilityPct >= 90 ? 'text-sky-400' : reliabilityPct >= 60 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {totalOps > 0 ? `${reliabilityPct}%` : '—'}
                  </div>
                </div>
              </div>

              {/* Filter Tabs & Quick Actions */}
              <div className="px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-900">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSyncHistoryFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      syncHistoryFilter === 'all'
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({totalOps})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncHistoryFilter('success')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      syncHistoryFilter === 'success'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Succeeded ({successOps})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncHistoryFilter('failed')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      syncHistoryFilter === 'failed'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Failed ({failedOps})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {onTriggerSync && (
                    <button
                      type="button"
                      onClick={() => Promise.resolve(onTriggerSync()).catch(() => {})}
                      className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Run Sync Now</span>
                    </button>
                  )}
                  {totalOps > 0 && (
                    <button
                      type="button"
                      onClick={clearCloudSyncHistory}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-rose-950/70 border border-slate-700 hover:border-rose-700/60 text-slate-300 hover:text-rose-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Chronological Log List */}
              <div className="p-4 overflow-y-auto flex-1 space-y-2.5 text-xs">
                {visibleEntries.length === 0 ? (
                  <div className="py-10 text-center space-y-2 border-2 border-dashed border-slate-800 rounded-2xl text-slate-400">
                    <Cloud className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="font-bold text-slate-200">No matching sync logs yet</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Cloud uploads, pulls, live POS sales, and offline queue retries will automatically appear here with full status details.
                    </p>
                  </div>
                ) : (
                  visibleEntries.map((entry) => {
                    const isOk = entry.status === 'success';
                    const isPartial = entry.status === 'partial';
                    return (
                      <div
                        key={entry.id}
                        className={`p-3 rounded-xl border space-y-1.5 ${
                          isOk
                            ? 'bg-slate-950/80 border-emerald-500/30'
                            : isPartial
                            ? 'bg-amber-950/25 border-amber-500/40'
                            : 'bg-rose-950/25 border-rose-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            {isOk ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <AlertTriangle
                                className={`w-4 h-4 shrink-0 ${
                                  isPartial ? 'text-amber-400' : 'text-rose-400'
                                }`}
                              />
                            )}
                            <span className="font-bold text-slate-100">{getOpLabel(entry.operation)}</span>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                isOk
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                                  : isPartial
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                                  : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                              }`}
                            >
                              {isOk ? 'Success' : isPartial ? 'Partial' : 'Failed'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                            {entry.syncedCount > 0 && (
                              <span className="text-emerald-400 font-bold">+{entry.syncedCount} synced</span>
                            )}
                            {entry.failedCount > 0 && (
                              <span className="text-rose-400 font-bold">{entry.failedCount} failed</span>
                            )}
                            <span>
                              {new Date(entry.timestamp).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        <p className="text-slate-200 leading-snug">{entry.summary}</p>

                        {entry.errorDetails && (
                          <div className="bg-slate-950 border border-rose-900/60 text-rose-300 px-2.5 py-1.5 rounded-lg font-mono text-[11px] break-words">
                            {entry.errorDetails}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 border-t border-slate-800 bg-slate-950/70 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowSyncHistoryModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  </div>
);
};
