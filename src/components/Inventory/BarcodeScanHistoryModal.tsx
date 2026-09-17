import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Scan,
  Barcode,
  Clock,
  User as UserIcon,
  Search,
  Filter,
  Download,
  Printer,
  Trash2,
  Camera,
  CheckCircle2,
  AlertCircle,
  X,
  Maximize2,
  Minimize2,
  ChevronRight,
  Eye,
  RefreshCw,
  Zap,
  Package,
  ShieldCheck,
  Calendar,
  CalendarRange,
  CalendarDays,
  RotateCcw,
  Layers,
  Sparkles,
  ArrowUpDown,
  Laptop
} from 'lucide-react';
import { BarcodeScanLog, Product, User } from '../../types';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export interface BarcodeScanHistoryProps {
  isOpen?: boolean;
  onClose?: () => void;
  isEmbedded?: boolean;
  scanLogs: BarcodeScanLog[];
  products: Product[];
  currentUser: User;
  allUsers: User[];
  onRecordScanLog: (log: BarcodeScanLog) => void;
  onClearScanLogs: () => void;
  onSelectProductForEdit?: (product: Product) => void;
}

export const BarcodeScanHistoryContent: React.FC<BarcodeScanHistoryProps> = ({
  isOpen = true,
  onClose,
  isEmbedded = false,
  scanLogs,
  products,
  currentUser,
  allUsers,
  onRecordScanLog,
  onClearScanLogs,
  onSelectProductForEdit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('all');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showLiveScanner, setShowLiveScanner] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [scanFeedbackMessage, setScanFeedbackMessage] = useState<{ type: 'success' | 'warn'; text: string } | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [selectedLogDetail, setSelectedLogDetail] = useState<BarcodeScanLog | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const html5QrcodeScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'barcode-history-camera-box';

  // Format local date for HTML5 <input type="date" />
  const formatLocalDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to switch date presets cleanly
  const setDatePreset = (preset: 'all' | 'today' | 'yesterday' | 'week' | 'month') => {
    setSelectedDateFilter(preset);
    const now = new Date();
    if (preset === 'today') {
      const todayStr = formatLocalDateForInput(now);
      setCustomStartDate(todayStr);
      setCustomEndDate(todayStr);
      setShowCustomDateRange(false);
    } else if (preset === 'yesterday') {
      const y = new Date(now.getTime() - 86400000);
      const yStr = formatLocalDateForInput(y);
      setCustomStartDate(yStr);
      setCustomEndDate(yStr);
      setShowCustomDateRange(false);
    } else if (preset === 'week') {
      const sevenDaysAgo = new Date(now.getTime() - 6 * 86400000);
      setCustomStartDate(formatLocalDateForInput(sevenDaysAgo));
      setCustomEndDate(formatLocalDateForInput(now));
      setShowCustomDateRange(false);
    } else if (preset === 'month') {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setCustomStartDate(formatLocalDateForInput(firstOfMonth));
      setCustomEndDate(formatLocalDateForInput(now));
      setShowCustomDateRange(false);
    } else {
      setCustomStartDate('');
      setCustomEndDate('');
      setShowCustomDateRange(false);
    }
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    setSelectedDateFilter('custom');
    setShowCustomDateRange(true);
  };

  const getActiveDateRangeDescription = (): string => {
    if (selectedDateFilter === 'today') return 'Today';
    if (selectedDateFilter === 'yesterday') return 'Yesterday';
    if (selectedDateFilter === 'week') return 'Last 7 Days';
    if (selectedDateFilter === 'month') return 'This Month';
    if (selectedDateFilter === 'custom' || customStartDate || customEndDate) {
      if (customStartDate && customEndDate) {
        if (customStartDate === customEndDate) return `Date: ${customStartDate}`;
        return `${customStartDate} → ${customEndDate}`;
      }
      if (customStartDate) return `From ${customStartDate}`;
      if (customEndDate) return `Up to ${customEndDate}`;
    }
    return 'All Time';
  };

  const isAnyFilterActive =
    Boolean(searchTerm.trim()) ||
    selectedDateFilter !== 'all' ||
    Boolean(customStartDate) ||
    Boolean(customEndDate) ||
    selectedUserFilter !== 'all' ||
    selectedLocationFilter !== 'all';

  const handleResetAllFilters = () => {
    setSearchTerm('');
    setSelectedDateFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setShowCustomDateRange(false);
    setSelectedUserFilter('all');
    setSelectedLocationFilter('all');
  };

  // Format date helper
  const formatTimestamp = (isoString: string): { dateStr: string; timeStr: string; relative: string } => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return { dateStr: isoString, timeStr: '', relative: '' };
      return {
        dateStr: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        timeStr: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
        relative: getRelativeTime(d)
      };
    } catch {
      return { dateStr: isoString, timeStr: '', relative: '' };
    }
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  // Perform a new scan log entry
  const handleProcessBarcodeScan = (scannedCode: string, deviceType: 'camera' | 'barcode_gun' | 'manual' = 'barcode_gun') => {
    const trimmed = scannedCode.trim();
    if (!trimmed) return;

    // Lookup in catalog
    const matchedProduct = products.find(
      (p) => p.barcode.toLowerCase() === trimmed.toLowerCase() || p.sku.toLowerCase() === trimmed.toLowerCase()
    );

    const newLog: BarcodeScanLog = {
      id: `scan-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      barcode: trimmed,
      productId: matchedProduct?.id,
      productName: matchedProduct ? matchedProduct.name : `Unregistered Barcode (${trimmed})`,
      category: matchedProduct?.category || 'Uncategorized',
      subcategory: matchedProduct?.subcategory || 'General',
      sku: matchedProduct?.sku || `SKU-${trimmed.slice(-4)}`,
      sellingPrice: matchedProduct?.sellingPrice,
      costPrice: matchedProduct?.costPrice,
      stockQuantity: matchedProduct?.stockQuantity,
      imageUrl: matchedProduct?.imageUrl,
      scannedAt: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      scanLocation: 'inventory',
      deviceType,
      actionTaken: 'stock_audit',
      notes: matchedProduct
        ? `Audited in Inventory catalog: ${matchedProduct.stockQuantity} ${matchedProduct.unit || 'units'} on hand`
        : 'Scanned barcode not currently registered in catalog',
    };

    onRecordScanLog(newLog);

    // Audio & Haptic feedback
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(80);
      } catch (e) {}
    }

    if (matchedProduct) {
      setScanFeedbackMessage({
        type: 'success',
        text: `Scanned: "${matchedProduct.name}" (Barcode: ${trimmed}) by ${currentUser.name}`,
      });
    } else {
      setScanFeedbackMessage({
        type: 'warn',
        text: `Logged new scan for unregistered barcode: "${trimmed}" by ${currentUser.name}`,
      });
    }

    setManualCodeInput('');

    // Clear feedback after 4 seconds
    setTimeout(() => {
      setScanFeedbackMessage(null);
    }, 4000);
  };

  // Handle hardware barcode gun input on window or input field
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCodeInput.trim()) {
      handleProcessBarcodeScan(manualCodeInput.trim(), 'barcode_gun');
    }
  };

  // Camera scanner lifecycle
  useEffect(() => {
    if (!showLiveScanner) {
      if (html5QrcodeScannerRef.current) {
        if (html5QrcodeScannerRef.current.isScanning) {
          html5QrcodeScannerRef.current.stop().then(() => html5QrcodeScannerRef.current?.clear()).catch(() => {});
        } else {
          html5QrcodeScannerRef.current.clear();
        }
        html5QrcodeScannerRef.current = null;
      }
      return;
    }

    let isSubscribed = true;
    let scannerInstance: Html5Qrcode | null = null;

    const startCamera = async () => {
      try {
        const el = document.getElementById(scannerContainerId);
        if (!el) return;

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.ITF,
        ];

        scannerInstance = new Html5Qrcode(scannerContainerId, { formatsToSupport, verbose: false });
        html5QrcodeScannerRef.current = scannerInstance;

        await scannerInstance.start(
          { facingMode },
          { fps: 15, qrbox: { width: 250, height: 160 }, aspectRatio: 1.7777 },
          (decodedText) => {
            if (!isSubscribed) return;
            handleProcessBarcodeScan(decodedText, 'camera');
          },
          () => {}
        );
      } catch (err) {
        console.error('Failed to start camera for barcode history scan:', err);
      }
    };

    const timer = setTimeout(() => {
      startCamera();
    }, 150);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      if (scannerInstance) {
        if (scannerInstance.isScanning) {
          scannerInstance.stop().then(() => scannerInstance?.clear()).catch(() => {});
        } else {
          scannerInstance.clear();
        }
      }
    };
  }, [showLiveScanner, facingMode]);

  // Filtered logs calculation
  const filteredLogs = useMemo(() => {
    return scanLogs.filter((log) => {
      // Multi-field search term matching
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = log.productName?.toLowerCase().includes(q);
        const matchBarcode = log.barcode?.toLowerCase().includes(q);
        const matchSku = log.sku?.toLowerCase().includes(q);
        const matchCategory = log.category?.toLowerCase().includes(q);
        const matchSubcategory = log.subcategory?.toLowerCase().includes(q);
        const matchUser = log.userName?.toLowerCase().includes(q);
        const matchRole = log.userRole?.toLowerCase().includes(q);
        const matchLocation = log.scanLocation?.toLowerCase().includes(q);
        const matchDevice = log.deviceType?.toLowerCase().includes(q);
        const matchAction = log.actionTaken?.toLowerCase().includes(q);
        const matchNotes = log.notes?.toLowerCase().includes(q);
        if (
          !matchName &&
          !matchBarcode &&
          !matchSku &&
          !matchCategory &&
          !matchSubcategory &&
          !matchUser &&
          !matchRole &&
          !matchLocation &&
          !matchDevice &&
          !matchAction &&
          !matchNotes
        ) {
          return false;
        }
      }

      // User filter
      if (selectedUserFilter !== 'all') {
        if (log.userId !== selectedUserFilter && log.userName !== selectedUserFilter) {
          return false;
        }
      }

      // Location filter
      if (selectedLocationFilter !== 'all') {
        if (log.scanLocation !== selectedLocationFilter) {
          return false;
        }
      }

      // Date Range filter
      const logDate = new Date(log.scannedAt);
      const logTime = logDate.getTime();
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const endOfToday = startOfToday + 86400000 - 1;

      if (selectedDateFilter === 'today') {
        if (logTime < startOfToday || logTime > endOfToday) return false;
      } else if (selectedDateFilter === 'yesterday') {
        const startOfYesterday = startOfToday - 86400000;
        if (logTime < startOfYesterday || logTime >= startOfToday) return false;
      } else if (selectedDateFilter === 'week') {
        const sevenDaysAgo = startOfToday - 6 * 86400000;
        if (logTime < sevenDaysAgo || logTime > endOfToday) return false;
      } else if (selectedDateFilter === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        if (logTime < startOfMonth || logTime > endOfToday) return false;
      } else if (selectedDateFilter === 'custom' || customStartDate || customEndDate) {
        if (customStartDate) {
          const startLimit = new Date(`${customStartDate}T00:00:00`).getTime();
          if (!isNaN(startLimit) && logTime < startLimit) return false;
        }
        if (customEndDate) {
          const endLimit = new Date(`${customEndDate}T23:59:59.999`).getTime();
          if (!isNaN(endLimit) && logTime > endLimit) return false;
        }
      }

      return true;
    });
  }, [scanLogs, searchTerm, selectedUserFilter, selectedDateFilter, customStartDate, customEndDate, selectedLocationFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalScans = scanLogs.length;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const scansToday = scanLogs.filter((l) => new Date(l.scannedAt).getTime() >= startOfToday).length;

    const uniqueProducts = new Set(scanLogs.map((l) => l.barcode)).size;
    const uniqueUsers = new Set(scanLogs.map((l) => l.userName)).size;

    return { totalScans, scansToday, uniqueProducts, uniqueUsers };
  }, [scanLogs]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = [
      'Scan ID',
      'Date & Time',
      'Barcode',
      'Product Name',
      'SKU',
      'Category',
      'Selling Price (KSh)',
      'Stock Quantity',
      'User Name',
      'User Role',
      'Location / Context',
      'Device Type',
      'Notes',
    ];

    const rows = filteredLogs.map((log) => [
      `"${log.id}"`,
      `"${new Date(log.scannedAt).toLocaleString()}"`,
      `"${log.barcode}"`,
      `"${(log.productName || '').replace(/"/g, '""')}"`,
      `"${log.sku || ''}"`,
      `"${log.category || ''}"`,
      log.sellingPrice || 0,
      log.stockQuantity ?? 'N/A',
      `"${(log.userName || '').replace(/"/g, '""')}"`,
      `"${log.userRole || ''}"`,
      `"${log.scanLocation || ''}"`,
      `"${log.deviceType || ''}"`,
      `"${(log.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `barcode_scan_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Log Report
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = filteredLogs
      .map((log, idx) => {
        const d = new Date(log.scannedAt);
        const timeFormatted = isNaN(d.getTime()) ? log.scannedAt : d.toLocaleString();
        return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 6px 8px; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-weight: 600; white-space: nowrap;">${timeFormatted}</td>
          <td style="padding: 6px 8px; font-family: monospace; font-weight: bold; color: #0284c7;">${log.barcode}</td>
          <td style="padding: 6px 8px; font-weight: 600;">${log.productName}</td>
          <td style="padding: 6px 8px; color: #64748b;">${log.sku || '-'}</td>
          <td style="padding: 6px 8px;">${log.userName} <span style="font-size: 9px; color: #64748b; display: block;">(${log.userRole || 'Staff'})</span></td>
          <td style="padding: 6px 8px; text-align: center;"><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${log.scanLocation}</span></td>
          <td style="padding: 6px 8px; text-align: right; font-weight: 600;">KSh ${(log.sellingPrice || 0).toLocaleString()}</td>
        </tr>
      `;
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode Scanner History Audit Log</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; margin: 0; }
            h1 { font-size: 20px; margin: 0 0 4px 0; }
            p { margin: 0 0 16px 0; font-size: 12px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; }
            .header-box { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; }
            .stats-bar { display: flex; gap: 20px; background: #f1f5f9; padding: 10px 16px; border-radius: 6px; font-size: 11px; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div>
              <h1>ROFANI SMART RETAIL POS</h1>
              <p>Barcode Scanner Activity & Staff Scans Audit Log</p>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748b;">
              <div>Generated: ${new Date().toLocaleString()}</div>
              <div>Report Generated By: <strong>${currentUser.name}</strong> (${currentUser.role})</div>
            </div>
          </div>

          <div class="stats-bar">
            <div>Total Scans in Report: <strong>${filteredLogs.length}</strong></div>
            <div>Date Range: <strong>${getActiveDateRangeDescription()}</strong></div>
            ${searchTerm ? `<div>Search Query: <strong>"${searchTerm}"</strong></div>` : ''}
            <div>Unique Barcodes: <strong>${new Set(filteredLogs.map((l) => l.barcode)).size}</strong></div>
            <div>Active Users: <strong>${new Set(filteredLogs.map((l) => l.userName)).size}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: center; width: 30px;">#</th>
                <th>Timestamp</th>
                <th>Barcode</th>
                <th>Item Description</th>
                <th>SKU</th>
                <th>Scanned By</th>
                <th style="text-align: center;">Source</th>
                <th style="text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; border-top: 1px dashed #cbd5e1; pt: 16px;">
            <div>Inventory Controller Signature: _______________________</div>
            <div>Store Manager Approval: _______________________</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  if (!isEmbedded && !isOpen) return null;

  const innerContent = (
    <>
      <div
        className={`bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col transition-all duration-200 overflow-hidden text-slate-100 ${
          isEmbedded
            ? 'w-full min-h-[600px] shadow-xl'
            : isFullScreen
            ? 'w-full h-full rounded-none'
            : 'w-full max-w-6xl max-h-[92vh]'
        }`}
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30 shadow-inner">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-base sm:text-lg flex items-center gap-2">
                  Barcode Scan History & Staff Audit Log
                </h3>
                <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {scanLogs.length} Total Scans
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Detailed audit trail of all products scanned by barcode scanner, with exact timestamps and staff members.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Action Buttons */}
            <button
              onClick={() => setShowLiveScanner(!showLiveScanner)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                showLiveScanner
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-500/40'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{showLiveScanner ? 'Close Scanner' : 'Scan Item Now'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              title="Export filtered scans to CSV"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={handlePrintReport}
              disabled={filteredLogs.length === 0}
              title="Print formal barcode audit report"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Print Log</span>
            </button>

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition"
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {scanFeedbackMessage && (
          <div
            className={`px-4 py-2 text-xs flex items-center justify-between border-b transition-all ${
              scanFeedbackMessage.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-200 border-emerald-800/80'
                : 'bg-amber-950/80 text-amber-200 border-amber-800/80'
            }`}
          >
            <div className="flex items-center gap-2">
              {scanFeedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span className="font-medium">{scanFeedbackMessage.text}</span>
            </div>
            <button onClick={() => setScanFeedbackMessage(null)} className="text-slate-400 hover:text-slate-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* LIVE CAMERA SCANNER ACCORDION */}
        {showLiveScanner && (
          <div className="bg-slate-950 border-b border-slate-800 p-4 shrink-0">
            <div className="max-w-md mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-300">
                  <Camera className="w-4 h-4 text-sky-400" />
                  <span>Camera Barcode Scanner (Active)</span>
                </div>
                <button
                  onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 rounded-lg flex items-center gap-1 border border-slate-700"
                >
                  <RefreshCw className="w-3 h-3 text-sky-400" />
                  <span>Switch Camera ({facingMode === 'environment' ? 'Rear' : 'Front'})</span>
                </button>
              </div>

              <div className="relative bg-black rounded-2xl overflow-hidden border border-sky-500/40 aspect-[16/9] flex items-center justify-center shadow-lg">
                <div id={scannerContainerId} className="w-full h-full object-cover" />
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-3">
                  <div className="text-[10px] font-semibold text-sky-200 bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-sky-500/30">
                    Align barcode within scan area
                  </div>
                  <div className="text-[10px] text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded">
                    Logging as: <strong>{currentUser.name}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FAST SCAN INPUT BAR (HARDWARE BARCODE GUN / MANUAL ENTRY) */}
        <div className="p-3 sm:px-5 bg-slate-950/60 border-b border-slate-800 shrink-0">
          <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan barcode with USB/Bluetooth scanner gun or enter barcode number..."
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 shadow"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Record Scan</span>
            </button>
          </form>
        </div>

        {/* KPI STATS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 p-3 sm:px-5 bg-slate-900/50 border-b border-slate-800 shrink-0">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-2.5 sm:p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Total Scans</p>
              <p className="text-base font-bold text-slate-100">{stats.totalScans}</p>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-2.5 sm:p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Scans Today</p>
              <p className="text-base font-bold text-emerald-400">{stats.scansToday}</p>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-2.5 sm:p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Unique Items</p>
              <p className="text-base font-bold text-purple-300">{stats.uniqueProducts}</p>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-2.5 sm:p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Active Staff</p>
              <p className="text-base font-bold text-amber-300">{stats.uniqueUsers}</p>
            </div>
          </div>
        </div>

        {/* FILTERS & SEARCH TOOLBAR */}
        <div className="p-3 sm:px-5 bg-slate-950/60 border-b border-slate-800 flex flex-col gap-3 shrink-0">
          {/* PRIMARY SEARCH ROW */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-400" />
              <input
                type="text"
                placeholder="Search scans by barcode, product name, SKU, staff member, role, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700/90 hover:border-slate-600 focus:border-sky-500 rounded-xl pl-10 pr-24 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 shadow-inner transition"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-md transition"
                    title="Clear search text"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
                  {filteredLogs.length} {filteredLogs.length === 1 ? 'scan' : 'scans'}
                </span>
              </div>
            </div>

            {/* Quick Presets Toggle: Today, My Scans, POS */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (selectedDateFilter === 'today') {
                    setDatePreset('all');
                  } else {
                    setDatePreset('today');
                  }
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap flex items-center gap-1.5 border ${
                  selectedDateFilter === 'today'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 font-semibold shadow-sm'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                }`}
                title="Filter scans made today"
              >
                <Clock className="w-3 h-3 text-sky-400" />
                <span>Today</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedUserFilter === currentUser.id) {
                    setSelectedUserFilter('all');
                  } else {
                    setSelectedUserFilter(currentUser.id);
                  }
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap flex items-center gap-1.5 border ${
                  selectedUserFilter === currentUser.id
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 font-semibold shadow-sm'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                }`}
                title="Filter scans made by you"
              >
                <UserIcon className="w-3 h-3 text-purple-400" />
                <span>My Scans</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedLocationFilter === 'pos') {
                    setSelectedLocationFilter('all');
                  } else {
                    setSelectedLocationFilter('pos');
                  }
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap flex items-center gap-1.5 border ${
                  selectedLocationFilter === 'pos'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold shadow-sm'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                }`}
                title="Filter scans from POS Register"
              >
                <Laptop className="w-3 h-3 text-emerald-400" />
                <span>POS</span>
              </button>
            </div>
          </div>

          {/* DATE RANGE FILTER CONTROLS & DROPDOWNS ROW */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              {/* Date Filter Preset Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200">
                <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">Date:</span>
                <select
                  value={selectedDateFilter}
                  onChange={(e: any) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setSelectedDateFilter('custom');
                      setShowCustomDateRange(true);
                      if (!customStartDate && !customEndDate) {
                        const now = new Date();
                        const sevenDaysAgo = new Date(now.getTime() - 6 * 86400000);
                        setCustomStartDate(formatLocalDateForInput(sevenDaysAgo));
                        setCustomEndDate(formatLocalDateForInput(now));
                      }
                    } else {
                      setDatePreset(val);
                    }
                  }}
                  className="bg-transparent text-slate-100 text-xs font-medium focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-slate-200">All Time</option>
                  <option value="today" className="bg-slate-900 text-slate-200">Today</option>
                  <option value="yesterday" className="bg-slate-900 text-slate-200">Yesterday</option>
                  <option value="week" className="bg-slate-900 text-slate-200">Last 7 Days</option>
                  <option value="month" className="bg-slate-900 text-slate-200">This Month</option>
                  <option value="custom" className="bg-slate-900 text-slate-200">Custom Date Range...</option>
                </select>
              </div>

              {/* Custom Date Range Picker (Start Date & End Date Inputs) */}
              {(selectedDateFilter === 'custom' || showCustomDateRange || customStartDate || customEndDate) && (
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/95 border border-sky-600/70 rounded-xl p-1 px-2.5 text-xs shadow-md">
                  <CalendarDays className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">From</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => handleCustomDateChange(e.target.value, customEndDate)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 [color-scheme:dark] focus:outline-none focus:border-sky-500"
                    placeholder="Start date"
                    title="From start date"
                  />
                  <span className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">To</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => handleCustomDateChange(customStartDate, e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 [color-scheme:dark] focus:outline-none focus:border-sky-500"
                    placeholder="End date"
                    title="To end date"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCustomStartDate('');
                      setCustomEndDate('');
                      setSelectedDateFilter('all');
                      setShowCustomDateRange(false);
                    }}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition"
                    title="Clear date range"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Toggle button to open Custom Date Range if not currently shown */}
              {selectedDateFilter !== 'custom' && !showCustomDateRange && !customStartDate && !customEndDate && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomDateRange(true);
                    setSelectedDateFilter('custom');
                    const now = new Date();
                    const sevenDaysAgo = new Date(now.getTime() - 6 * 86400000);
                    setCustomStartDate(formatLocalDateForInput(sevenDaysAgo));
                    setCustomEndDate(formatLocalDateForInput(now));
                  }}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700/80 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
                  title="Pick a custom start and end date range"
                >
                  <CalendarRange className="w-3.5 h-3.5 text-sky-400" />
                  <span>Custom Range</span>
                </button>
              )}

              {/* Filter by Staff Member */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200">
                <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedUserFilter}
                  onChange={(e) => setSelectedUserFilter(e.target.value)}
                  className="bg-transparent text-slate-100 text-xs font-medium focus:outline-none cursor-pointer max-w-[140px] truncate"
                >
                  <option value="all" className="bg-slate-900 text-slate-200">
                    All Staff
                  </option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Location / Context */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedLocationFilter}
                  onChange={(e) => setSelectedLocationFilter(e.target.value)}
                  className="bg-transparent text-slate-100 text-xs font-medium focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-slate-200">
                    All Locations
                  </option>
                  <option value="inventory" className="bg-slate-900 text-slate-200">
                    Inventory Tab
                  </option>
                  <option value="pos" className="bg-slate-900 text-slate-200">
                    POS Register
                  </option>
                  <option value="stocktake" className="bg-slate-900 text-slate-200">
                    Physical Stocktake
                  </option>
                </select>
              </div>
            </div>

            {/* Clear Log Option */}
            <div className="flex items-center gap-2 shrink-0">
              {scanLogs.length > 0 && (
                <button
                  onClick={() => setConfirmClearOpen(true)}
                  className="px-2.5 py-1.5 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 rounded-xl text-xs transition flex items-center gap-1"
                  title="Clear barcode scan history log"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Clear Log</span>
                </button>
              )}
            </div>
          </div>

          {/* ACTIVE FILTER BADGES ROW */}
          {isAnyFilterActive && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mr-1">
                  <Filter className="w-3 h-3 text-sky-400" /> Active filters:
                </span>

                {searchTerm.trim() && (
                  <span className="inline-flex items-center gap-1 bg-sky-950/80 text-sky-300 border border-sky-800/60 px-2 py-0.5 rounded-lg text-[11px]">
                    <span>Search: "{searchTerm}"</span>
                    <button
                      onClick={() => setSearchTerm('')}
                      className="hover:text-white ml-0.5"
                      title="Remove search filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {(selectedDateFilter !== 'all' || customStartDate || customEndDate) && (
                  <span className="inline-flex items-center gap-1 bg-amber-950/80 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded-lg text-[11px]">
                    <Calendar className="w-3 h-3 text-amber-400" />
                    <span>Date: {getActiveDateRangeDescription()}</span>
                    <button
                      onClick={() => {
                        setSelectedDateFilter('all');
                        setCustomStartDate('');
                        setCustomEndDate('');
                        setShowCustomDateRange(false);
                      }}
                      className="hover:text-white ml-0.5"
                      title="Clear date filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {selectedUserFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-purple-950/80 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded-lg text-[11px]">
                    <UserIcon className="w-3 h-3 text-purple-400" />
                    <span>Staff: {allUsers.find((u) => u.id === selectedUserFilter)?.name || selectedUserFilter}</span>
                    <button
                      onClick={() => setSelectedUserFilter('all')}
                      className="hover:text-white ml-0.5"
                      title="Clear staff filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {selectedLocationFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-lg text-[11px]">
                    <Laptop className="w-3 h-3 text-emerald-400" />
                    <span>Context: {selectedLocationFilter.toUpperCase()}</span>
                    <button
                      onClick={() => setSelectedLocationFilter('all')}
                      className="hover:text-white ml-0.5"
                      title="Clear location filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>

              <button
                onClick={handleResetAllFilters}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 hover:underline transition ml-auto"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset all filters</span>
              </button>
            </div>
          )}
        </div>

        {/* LOG DATA TABLE / LIST */}
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-800/80">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-slate-800/60 border border-slate-700 flex items-center justify-center text-slate-500">
                <Barcode className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">No Barcode Scans Found</p>
                <p className="text-xs text-slate-400 max-w-md">
                  {isAnyFilterActive
                    ? `No scans match your search query or the date filter (${getActiveDateRangeDescription()}). Try modifying or resetting your search parameters.`
                    : 'No barcode scans have been recorded yet. Use your barcode scanner or camera to start scanning!'}
                </p>
              </div>
              {isAnyFilterActive && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition"
                    >
                      Clear Search
                    </button>
                  )}
                  {(selectedDateFilter !== 'all' || customStartDate || customEndDate) && (
                    <button
                      onClick={() => {
                        setSelectedDateFilter('all');
                        setCustomStartDate('');
                        setCustomEndDate('');
                        setShowCustomDateRange(false);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition"
                    >
                      Clear Date Filter
                    </button>
                  )}
                  <button
                    onClick={handleResetAllFilters}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white rounded-xl transition flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset All Filters</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950/80 sticky top-0 z-10 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3 pl-4">Timestamp</th>
                    <th className="p-3">Scanned By User</th>
                    <th className="p-3">Item Name & SKU</th>
                    <th className="p-3">Barcode</th>
                    <th className="p-3">Stock & Price</th>
                    <th className="p-3">Context</th>
                    <th className="p-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredLogs.map((log) => {
                    const timeInfo = formatTimestamp(log.scannedAt);
                    const matchedProduct = products.find(
                      (p) => p.id === log.productId || p.barcode === log.barcode
                    );

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        onClick={() => setSelectedLogDetail(log)}
                      >
                        {/* Timestamp */}
                        <td className="p-3 pl-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <div>
                              <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                                <span>{timeInfo.timeStr}</span>
                                <span className="text-[10px] font-normal text-sky-400/80 bg-sky-950/60 px-1.5 py-0.2 rounded border border-sky-800/40">
                                  {timeInfo.relative}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500">{timeInfo.dateStr}</div>
                            </div>
                          </div>
                        </td>

                        {/* User who performed scan */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300 shrink-0">
                              {log.userName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-200 text-xs">{log.userName}</div>
                              <div className="flex items-center gap-1">
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    log.userRole === 'Admin'
                                      ? 'bg-purple-950 text-purple-300 border border-purple-800/50'
                                      : log.userRole === 'Manager'
                                      ? 'bg-blue-950 text-blue-300 border border-blue-800/50'
                                      : log.userRole === 'Inventory Staff'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                                      : 'bg-amber-950 text-amber-300 border border-amber-800/50'
                                  }`}
                                >
                                  {log.userRole || 'Staff'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Item Name & SKU */}
                        <td className="p-3">
                          <div className="flex items-center gap-2.5 max-w-xs sm:max-w-md">
                            {log.imageUrl ? (
                              <img
                                src={log.imageUrl}
                                alt={log.productName}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0 bg-slate-800"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                            <div className="truncate">
                              <p className="font-bold text-slate-200 text-xs truncate">{log.productName}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span>{log.category || 'General'}</span>
                                {log.sku && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono text-slate-400">{log.sku}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Barcode */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded-lg">
                              {log.barcode}
                            </span>
                          </div>
                        </td>

                        {/* Stock & Price */}
                        <td className="p-3 whitespace-nowrap">
                          <div>
                            <span className="font-bold text-emerald-400 text-xs">
                              KSh {(log.sellingPrice || 0).toLocaleString()}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {log.stockQuantity !== undefined ? (
                                <span>
                                  Stock: <strong>{log.stockQuantity}</strong>
                                </span>
                              ) : (
                                <span className="text-slate-500">Stock not cached</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Scan Context */}
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              log.scanLocation === 'pos'
                                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60'
                                : log.scanLocation === 'stocktake'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {log.scanLocation === 'pos'
                              ? 'POS Register'
                              : log.scanLocation === 'stocktake'
                              ? 'Stock Audit'
                              : 'Inventory'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3 pr-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {matchedProduct && onSelectProductForEdit && (
                              <button
                                onClick={() => {
                                  onSelectProductForEdit(matchedProduct);
                                  onClose();
                                }}
                                title="Open this product in Inventory edit dialog"
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-[11px] font-medium transition flex items-center gap-1 border border-slate-700"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Inspect</span>
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedLogDetail(log)}
                              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition"
                              title="View full audit log details"
                            >
                              <ChevronRight className="w-4 h-4" />
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

        {/* MODAL FOOTER */}
        <div className="p-3 sm:px-5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              Real-time audit log active: Every hardware and camera scan automatically associates staff ID and
              timestamp.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>
              Logged in as: <strong className="text-slate-200">{currentUser.name}</strong> ({currentUser.role})
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRM CLEAR MODAL */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-slate-100">Clear Barcode Scan History?</h4>
              <p className="text-xs text-slate-400">
                Are you sure you want to clear all {scanLogs.length} scan records? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmClearOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearScanLogs();
                  setConfirmClearOpen(false);
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow"
              >
                Clear All Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE SCAN DETAIL DRAWER / POPUP */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                  <Barcode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-100">Barcode Scan Audit Entry</h4>
                  <p className="text-[10px] text-slate-400">Log ID: {selectedLogDetail.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Product Card */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center gap-3">
                {selectedLogDetail.imageUrl ? (
                  <img
                    src={selectedLogDetail.imageUrl}
                    alt={selectedLogDetail.productName}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-700 bg-slate-800"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                    <Package className="w-6 h-6" />
                  </div>
                )}
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="font-bold text-slate-200 text-sm truncate">{selectedLogDetail.productName}</p>
                  <p className="text-slate-400 text-[11px]">
                    SKU: <span className="font-mono text-slate-300">{selectedLogDetail.sku || 'N/A'}</span>
                  </p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="font-bold text-emerald-400">
                      KSh {(selectedLogDetail.sellingPrice || 0).toLocaleString()}
                    </span>
                    {selectedLogDetail.stockQuantity !== undefined && (
                      <span className="text-slate-400">• {selectedLogDetail.stockQuantity} in stock</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Scan Meta Details */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Exact Timestamp</span>
                  <span className="text-slate-200 font-mono text-[11px] font-semibold">
                    {new Date(selectedLogDetail.scannedAt).toLocaleString()}
                  </span>
                </div>

                <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Barcode Scanned</span>
                  <span className="text-sky-400 font-mono text-[11px] font-bold">
                    {selectedLogDetail.barcode}
                  </span>
                </div>

                <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Specific User</span>
                  <span className="text-slate-200 text-xs font-semibold block">{selectedLogDetail.userName}</span>
                  <span className="text-[10px] text-purple-400 font-bold">{selectedLogDetail.userRole || 'Staff'}</span>
                </div>

                <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Scan Context & Device</span>
                  <span className="text-slate-200 text-xs font-semibold capitalize">
                    {selectedLogDetail.scanLocation} ({selectedLogDetail.deviceType || 'scanner'})
                  </span>
                </div>
              </div>

              {/* Notes */}
              {selectedLogDetail.notes && (
                <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Action & Audit Notes</span>
                  <p className="text-slate-300 text-xs mt-0.5">{selectedLogDetail.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              {onSelectProductForEdit && selectedLogDetail.productId && (
                <button
                  onClick={() => {
                    const prod = products.find((p) => p.id === selectedLogDetail.productId);
                    if (prod) {
                      onSelectProductForEdit(prod);
                      setSelectedLogDetail(null);
                      onClose();
                    }
                  }}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Edit Product in Inventory</span>
                </button>
              )}
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (isEmbedded) {
    return innerContent;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      {innerContent}
    </div>
  );
};

export const BarcodeScanHistoryModal: React.FC<BarcodeScanHistoryProps> = (props) => {
  return <BarcodeScanHistoryContent {...props} isEmbedded={false} />;
};

export const BarcodeScanHistoryView: React.FC<BarcodeScanHistoryProps> = (props) => {
  return <BarcodeScanHistoryContent {...props} isEmbedded={true} />;
};
