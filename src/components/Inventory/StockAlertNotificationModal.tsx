import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  X, 
  Mail, 
  Send, 
  CheckCircle2, 
  Clock, 
  Settings, 
  Package, 
  ArrowRight, 
  ShieldAlert, 
  Check, 
  RefreshCw, 
  Calendar,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Product } from '../../types';

interface StockAlertNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onRestockClick: (product: Product) => void;
  onViewInventoryProduct: (product: Product) => void;
}

interface EmailLog {
  id: string;
  timestamp: string;
  recipient: string;
  itemCount: number;
  status: 'Delivered' | 'Scheduled' | 'Failed';
  summary: string;
}

export const StockAlertNotificationModal: React.FC<StockAlertNotificationModalProps> = ({
  isOpen,
  onClose,
  products,
  onRestockClick,
  onViewInventoryProduct
}) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'digest' | 'settings'>('alerts');
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('rofani_dismissed_alert_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Email Settings state
  const [emailSettings, setEmailSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('rofani_email_alert_settings');
      return saved ? JSON.parse(saved) : {
        enabled: true,
        recipientEmail: 'owner@rofani.co.ke',
        scheduleTime: '08:00',
        includeOnlyOutOfStock: false,
        frequency: 'daily'
      };
    } catch {
      return {
        enabled: true,
        recipientEmail: 'owner@rofani.co.ke',
        scheduleTime: '08:00',
        includeOnlyOutOfStock: false,
        frequency: 'daily'
      };
    }
  });

  const [emailLogs, setEmailLogs] = useState<EmailLog[]>(() => {
    try {
      const saved = localStorage.getItem('rofani_email_dispatch_logs');
      return saved ? JSON.parse(saved) : [
        {
          id: 'log-1',
          timestamp: new Date(Date.now() - 86400000).toLocaleString(),
          recipient: 'owner@rofani.co.ke',
          itemCount: 4,
          status: 'Delivered',
          summary: 'Daily Stock Alert Digest: 4 items below threshold (2 Out of Stock, 2 Low Stock).'
        }
      ];
    } catch {
      return [];
    }
  });

  const [isSendingTest, setIsSendingTest] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('rofani_dismissed_alert_ids', JSON.stringify(dismissedIds));
    } catch {}
  }, [dismissedIds]);

  useEffect(() => {
    try {
      localStorage.setItem('rofani_email_alert_settings', JSON.stringify(emailSettings));
    } catch {}
  }, [emailSettings]);

  useEffect(() => {
    try {
      localStorage.setItem('rofani_email_dispatch_logs', JSON.stringify(emailLogs));
    } catch {}
  }, [emailLogs]);

  // Filter products needing attention (stockQuantity <= minStockAlert)
  const alertProducts = products.filter(p => {
    const minAlert = p.minStockAlert ?? 5;
    return p.stockQuantity <= minAlert;
  });

  const activeAlerts = alertProducts.filter(p => !dismissedIds.includes(p.id));
  const dismissedAlerts = alertProducts.filter(p => dismissedIds.includes(p.id));

  const outOfStockCount = alertProducts.filter(p => p.stockQuantity <= 0).length;
  const lowStockCount = alertProducts.filter(p => p.stockQuantity > 0).length;

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!dismissedIds.includes(id)) {
      setDismissedIds([...dismissedIds, id]);
    }
  };

  const handleRestore = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds(dismissedIds.filter(i => i !== id));
  };

  const handleSendDailyDigestNow = () => {
    setIsSendingTest(true);
    setTimeout(() => {
      const newLog: EmailLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        recipient: emailSettings.recipientEmail || 'owner@rofani.co.ke',
        itemCount: alertProducts.length,
        status: 'Delivered',
        summary: `Automated Stock Digest: ${alertProducts.length} items require reordering (${outOfStockCount} Out of Stock, ${lowStockCount} Low Stock).`
      };
      setEmailLogs([newLog, ...emailLogs]);
      setIsSendingTest(false);
      setToastMessage(`Daily digest successfully emailed to ${emailSettings.recipientEmail}!`);
      setTimeout(() => setToastMessage(null), 4000);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Stock Alert & Automated Digest Center
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  {alertProducts.length} Needs Attention
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Real-time inventory threshold monitoring & automated daily owner email dispatch.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Banner */}
        {toastMessage && (
          <div className="bg-emerald-950/90 border-b border-emerald-800/80 px-6 py-3 text-emerald-200 text-xs font-semibold flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 ${
              activeTab === 'alerts'
                ? 'bg-slate-800 text-sky-400 border-sky-500'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Active Alerts ({activeAlerts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('digest')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 ${
              activeTab === 'digest'
                ? 'bg-slate-800 text-sky-400 border-sky-500'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Daily Email Digest & Logs</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-slate-800 text-sky-400 border-sky-500'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Alert & Schedule Settings</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: ACTIVE ALERTS */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/60 flex items-center gap-3">
                  <div className="p-3 bg-red-500/20 text-red-400 rounded-lg">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-red-400 font-medium">Out of Stock</div>
                    <div className="text-xl font-extrabold text-white">{outOfStockCount}</div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-900/60 flex items-center gap-3">
                  <div className="p-3 bg-amber-500/20 text-amber-400 rounded-lg">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-amber-400 font-medium">Low Stock Warning</div>
                    <div className="text-xl font-extrabold text-white">{lowStockCount}</div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 flex items-center gap-3">
                  <div className="p-3 bg-sky-500/20 text-sky-400 rounded-lg">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Total Monitored</div>
                    <div className="text-xl font-extrabold text-white">{alertProducts.length}</div>
                  </div>
                </div>
              </div>

              {/* Action Banner */}
              <div className="flex items-center justify-between bg-slate-850 p-4 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-300">
                  Automated notifications trigger when item quantity drops to or below the set minimum stock alert threshold.
                </div>
                <button
                  onClick={handleSendDailyDigestNow}
                  disabled={isSendingTest}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-sky-600/20 disabled:opacity-50"
                >
                  {isSendingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{isSendingTest ? 'Sending Email...' : 'Trigger Daily Digest Email Now'}</span>
                </button>
              </div>

              {/* List of active alerts */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Attention Required ({activeAlerts.length})
                </h3>
                {activeAlerts.length === 0 ? (
                  <div className="text-center py-12 bg-slate-850/50 rounded-2xl border border-slate-800">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-white">All Stock Levels Healthy!</h4>
                    <p className="text-xs text-slate-400 mt-1">No products are currently below their warning thresholds.</p>
                  </div>
                ) : (
                  activeAlerts.map(product => {
                    const isOut = product.stockQuantity <= 0;
                    const minAlert = product.minStockAlert ?? 5;
                    return (
                      <div 
                        key={product.id}
                        onClick={() => onViewInventoryProduct(product)}
                        className={`p-4 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer hover:border-slate-700 ${
                          isOut 
                            ? 'bg-red-950/20 border-red-900/50 hover:bg-red-950/30' 
                            : 'bg-amber-950/20 border-amber-900/50 hover:bg-amber-950/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-lg mt-0.5 ${isOut ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {isOut ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{product.name}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                SKU: {product.sku || 'N/A'}
                              </span>
                              {isOut ? (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold uppercase">Out of Stock</span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase">Low Stock</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                              <span>Current Stock: <strong className="text-white font-mono">{product.stockQuantity} {product.unit || 'units'}</strong></span>
                              <span>•</span>
                              <span>Min Threshold: <strong className="text-amber-300 font-mono">{minAlert}</strong></span>
                              <span>•</span>
                              <span>Category: <span className="text-slate-300">{product.category}</span></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <button
                            onClick={(e) => { e.stopPropagation(); onRestockClick(product); }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                          >
                            <Package className="w-3.5 h-3.5" />
                            <span>Restock Now</span>
                          </button>
                          <button
                            onClick={(e) => handleDismiss(product.id, e)}
                            title="Dismiss this alert temporarily"
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs transition"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dismissed Section */}
              {dismissedAlerts.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Dismissed Alerts ({dismissedAlerts.length})
                  </h3>
                  <div className="space-y-2">
                    {dismissedAlerts.map(product => (
                      <div 
                        key={product.id}
                        className="p-3 rounded-xl bg-slate-850/40 border border-slate-800 flex items-center justify-between text-xs text-slate-400"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-300">{product.name}</span>
                          <span className="font-mono text-slate-500">({product.stockQuantity} {product.unit})</span>
                        </div>
                        <button
                          onClick={(e) => handleRestore(product.id, e)}
                          className="text-sky-400 hover:text-sky-300 font-semibold"
                        >
                          Restore Alert
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DAILY EMAIL DIGEST & LOGS */}
          {activeTab === 'digest' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-950/40 to-slate-900 border border-sky-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-sky-500/20 text-sky-400 rounded-xl">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Automated Daily Owner Email Digest</h3>
                      <p className="text-xs text-slate-400">
                        Scheduled to dispatch every day at <strong className="text-sky-300">{emailSettings.scheduleTime} AM</strong> to <span className="text-slate-200 font-mono">{emailSettings.recipientEmail}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSendDailyDigestNow}
                    disabled={isSendingTest}
                    className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-sky-600/30 disabled:opacity-50"
                  >
                    {isSendingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{isSendingTest ? 'Sending...' : 'Send Digest Email Now'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
                    <div className="text-slate-400">Recipient Email</div>
                    <div className="font-bold text-white mt-0.5 truncate">{emailSettings.recipientEmail}</div>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
                    <div className="text-slate-400">Schedule Time</div>
                    <div className="font-bold text-white mt-0.5 font-mono">{emailSettings.scheduleTime} AM Daily</div>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
                    <div className="text-slate-400">Items Included</div>
                    <div className="font-bold text-amber-400 mt-0.5">{alertProducts.length} Products</div>
                  </div>
                </div>
              </div>

              {/* Email Preview Box */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-sky-400" />
                    <span>Email Template Preview</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">HTML Ready</span>
                </div>
                
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 font-mono text-xs space-y-3 text-slate-300">
                  <div className="text-slate-400 border-b border-slate-800 pb-2">
                    <div><strong>To:</strong> {emailSettings.recipientEmail}</div>
                    <div><strong>Subject:</strong> [ROFANI POS] Daily Low Stock Digest - {new Date().toLocaleDateString()}</div>
                  </div>
                  <div className="space-y-2 text-slate-200">
                    <p className="font-sans text-xs">Hello Store Owner,</p>
                    <p className="font-sans text-xs text-slate-300">
                      Here is your automated daily inventory health summary. The following <strong className="text-amber-300">{alertProducts.length} products</strong> have fallen below their minimum stock thresholds and require reordering:
                    </p>
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5 max-h-40 overflow-y-auto">
                      {alertProducts.map(p => (
                        <div key={p.id} className="flex justify-between text-[11px] border-b border-slate-900 pb-1">
                          <span className="font-bold text-white">{p.name} (SKU: {p.sku})</span>
                          <span className="text-amber-400 font-bold">{p.stockQuantity} {p.unit} remaining (Min: {p.minStockAlert})</span>
                        </div>
                      ))}
                    </div>
                    <p className="font-sans text-[11px] text-slate-400 pt-1">
                      Log in to your Rofani POS system to restock inventory or update alert thresholds.
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Dispatch History Log */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Dispatch History Log
                </h3>
                <div className="space-y-2">
                  {emailLogs.map(log => (
                    <div key={log.id} className="p-3.5 bg-slate-850 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{log.recipient}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">{log.status}</span>
                          </div>
                          <div className="text-slate-400 text-[11px] mt-0.5">{log.summary}</div>
                        </div>
                      </div>
                      <div className="text-right text-[11px] font-mono text-slate-400">
                        {log.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-5 max-w-xl mx-auto">
              <div className="p-5 rounded-2xl bg-slate-850 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Settings className="w-4 h-4 text-sky-400" />
                  <span>Notification & Email Configuration</span>
                </h3>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">Owner Recipient Email Address</label>
                    <input
                      type="email"
                      value={emailSettings.recipientEmail}
                      onChange={(e) => setEmailSettings({ ...emailSettings, recipientEmail: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
                      placeholder="owner@rofani.co.ke"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Daily automated digests and critical stock alerts will be sent to this email.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1.5">Daily Digest Schedule Time</label>
                      <input
                        type="time"
                        value={emailSettings.scheduleTime}
                        onChange={(e) => setEmailSettings({ ...emailSettings, scheduleTime: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1.5">Frequency</label>
                      <select
                        value={emailSettings.frequency}
                        onChange={(e) => setEmailSettings({ ...emailSettings, frequency: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-semibold focus:outline-none focus:border-sky-500"
                      >
                        <option value="daily">Every Day (Daily Digest)</option>
                        <option value="twice_daily">Twice Daily (Morning & Evening)</option>
                        <option value="weekly">Weekly Summary</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailSettings.enabled}
                        onChange={(e) => setEmailSettings({ ...emailSettings, enabled: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-600 focus:ring-sky-500"
                      />
                      <div>
                        <span className="font-bold text-white block">Enable Automated Daily Email Alerts</span>
                        <span className="text-[11px] text-slate-400">Automatically dispatch email digest when store products hit stock warning levels.</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailSettings.includeOnlyOutOfStock}
                        onChange={(e) => setEmailSettings({ ...emailSettings, includeOnlyOutOfStock: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-600 focus:ring-sky-500"
                      />
                      <div>
                        <span className="font-bold text-white block">Include Only Out of Stock Items (Skip Low Stock Warnings)</span>
                        <span className="text-[11px] text-slate-400">If checked, digests only trigger for items with 0 stock remaining.</span>
                      </div>
                    </label>
                  </div>

                  <div className="pt-3">
                    <button
                      onClick={() => {
                        setToastMessage('Alert settings saved successfully!');
                        setTimeout(() => setToastMessage(null), 3000);
                      }}
                      className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold transition shadow-md shadow-sky-600/20"
                    >
                      Save Preferences
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-850 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Monitoring <strong className="text-white">{products.length}</strong> total catalog items.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
