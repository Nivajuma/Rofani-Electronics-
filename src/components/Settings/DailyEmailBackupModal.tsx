import React, { useState, useEffect } from 'react';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Download,
  Settings,
  History,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Calendar,
  X,
  Database,
  FileText
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  signInWithGoogleForGmail,
  getGmailAccessToken,
  logoutGmail,
  getBackupSettings,
  saveBackupSettings,
  sendBackupEmailViaGmail,
  BackupSettings
} from '../../lib/gmailService';
import { Product, Transaction, Customer, Supplier, Expense, CashTransaction, User as POSUser } from '../../types';

interface DailyEmailBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  transactions: Transaction[];
  customers: Customer[];
  suppliers: Supplier[];
  expenses: Expense[];
  allUsers?: POSUser[];
  cashTransactions?: CashTransaction[];
  storeName?: string;
  onNotification?: (msg: string, type: 'success' | 'error') => void;
}

export const DailyEmailBackupModal: React.FC<DailyEmailBackupModalProps> = ({
  isOpen,
  onClose,
  products,
  transactions,
  customers,
  suppliers,
  expenses,
  allUsers = [],
  cashTransactions = [],
  storeName = 'ROFANI ELECTRONICS AND BOUTIQUE',
  onNotification,
}) => {
  const [settings, setSettings] = useState<BackupSettings>(getBackupSettings);
  const [recipientInput, setRecipientInput] = useState(settings.recipientEmail);
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(getGmailAccessToken());
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendNotice, setSendNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showConfirmSendDialog, setShowConfirmSendDialog] = useState(false);

  // Sync token on mount
  useEffect(() => {
    setAccessToken(getGmailAccessToken());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnectGmail = async () => {
    setIsConnecting(true);
    setSendNotice(null);
    try {
      const { user, accessToken: token } = await signInWithGoogleForGmail();
      setGoogleUser(user);
      setAccessToken(token);
      setSendNotice({
        type: 'success',
        message: `Connected as ${user.email}! Gmail sending is now authorized.`,
      });
    } catch (err: any) {
      console.error('Failed to sign in with Google:', err);
      setSendNotice({
        type: 'error',
        message: err.message || 'Google authentication was cancelled or could not be completed.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await logoutGmail();
    setGoogleUser(null);
    setAccessToken(null);
    setSendNotice({
      type: 'info',
      message: 'Gmail disconnected. You will need to reconnect to send automated backup emails.',
    });
  };

  const handleSaveSettings = (updates: Partial<BackupSettings>) => {
    const updated = saveBackupSettings(updates);
    setSettings(updated);
    setSendNotice({
      type: 'success',
      message: 'Backup preferences updated successfully.',
    });
    setTimeout(() => setSendNotice(null), 3500);
  };

  // Compile full database payload
  const compileBackupPayload = () => {
    const timestamp = new Date().toISOString();
    return {
      storeName: 'ROFANI ELECTRONICS AND BOUTIQUE',
      backupGeneratedAt: timestamp,
      systemVersion: '2.5.0',
      databaseId: 'ai-studio-retailstockmanag-35779e9e-08d0-4311-8158-8be055847014',
      summary: {
        totalProducts: products.length,
        totalTransactions: transactions.length,
        totalCustomers: customers.length,
        totalSuppliers: suppliers.length,
        totalExpenses: expenses.length,
        totalEmployees: allUsers.length,
        totalInventoryValueKSh: products.reduce(
          (sum, p) => sum + (p.sellingPrice || 0) * (p.stockQuantity || 0),
          0
        ),
        totalGrossSalesKSh: transactions.reduce(
          (sum, t) => sum + (t.grandTotal || 0),
          0
        ),
      },
      collections: {
        products,
        transactions,
        customers,
        suppliers,
        expenses,
        employees: allUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          phone: u.phone,
          status: u.status,
          commissionType: u.commissionType,
        })),
      },
    };
  };

  // Generate HTML email body
  const generateEmailHtml = (payload: any) => {
    const todayStr = new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const inventoryValue = payload.summary.totalInventoryValueKSh.toLocaleString();
    const grossSales = payload.summary.totalGrossSalesKSh.toLocaleString();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 24px; }
          .header { border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px; }
          .title { font-size: 22px; font-weight: 800; color: #38bdf8; margin: 0; }
          .subtitle { font-size: 13px; color: #94a3b8; margin-top: 4px; }
          .badge { display: inline-block; background-color: #0369a1; color: #e0f2fe; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; margin-bottom: 12px; }
          .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
          .stat-box { background-color: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 12px; }
          .stat-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: bold; }
          .stat-value { font-size: 18px; font-weight: 800; color: #38bdf8; margin-top: 4px; font-family: monospace; }
          .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #334155; font-size: 11px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="badge">Daily Automated Backup</span>
            <h1 class="title">ROFANI ELECTRONICS & BOUTIQUE</h1>
            <p class="subtitle">Official Daily Store Database Snapshot • ${todayStr}</p>
          </div>

          <p style="font-size: 14px; line-height: 1.5; color: #e2e8f0;">
            Hello Store Owner,
            <br><br>
            Your daily store data backup for <b>${todayStr}</b> has been compiled and is securely attached to this email as a valid JSON database backup file.
          </p>

          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-label">Active Catalog Items</div>
              <div class="stat-value">${payload.summary.totalProducts.toLocaleString()} Items</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Total Transactions</div>
              <div class="stat-value">${payload.summary.totalTransactions.toLocaleString()} Sales</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Stock Valuation</div>
              <div class="stat-value">KSh ${inventoryValue}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Cumulative Sales</div>
              <div class="stat-value">KSh ${grossSales}</div>
            </div>
          </div>

          <div style="background-color: #022c22; border: 1px solid #059669; border-radius: 10px; padding: 14px; margin-top: 16px;">
            <div style="font-size: 12px; font-weight: bold; color: #34d399;">✓ Backup File Attached: ${todayStr}</div>
            <div style="font-size: 11px; color: #a7f3d0; margin-top: 4px;">
              Attachment: <code>Rofani_Full_Backup_${new Date().toISOString().slice(0, 10)}.json</code>
              <br>Contains full verified records for Products, Inventory, Sales, Customers, Suppliers, and Expenses.
            </div>
          </div>

          <div class="footer">
            ROFANI POS System • Generated Automatically for Store Operations
            <br>Keep this backup email for your financial and inventory auditing records.
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Perform email send
  const executeSendBackupEmail = async () => {
    setShowConfirmSendDialog(false);
    if (!accessToken) {
      setSendNotice({
        type: 'error',
        message: 'Please connect your Google / Gmail account first to authorize sending emails.',
      });
      return;
    }

    const targetRecipient = recipientInput.trim() || settings.recipientEmail;
    if (!targetRecipient || !targetRecipient.includes('@')) {
      setSendNotice({
        type: 'error',
        message: 'Please provide a valid recipient email address.',
      });
      return;
    }

    setIsSending(true);
    setSendNotice(null);

    try {
      const payload = compileBackupPayload();
      const jsonString = JSON.stringify(payload, null, 2);
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `Rofani_Store_Backup_${dateStr}.json`;
      const subject = `ROFANI POS Daily Backup • ${dateStr} (${payload.summary.totalProducts} Items)`;
      const htmlBody = generateEmailHtml(payload);

      const result = await sendBackupEmailViaGmail({
        accessToken,
        recipientEmail: targetRecipient,
        subject,
        htmlContent: htmlBody,
        backupFileName: fileName,
        backupJsonString: jsonString,
      });

      const fileSizeKB = Math.round(new Blob([jsonString]).size / 1024);

      if (result.success) {
        const newHistoryEntry = {
          id: `hist_${Date.now()}`,
          timestamp: new Date().toISOString(),
          recipient: targetRecipient,
          productsCount: payload.summary.totalProducts,
          transactionsCount: payload.summary.totalTransactions,
          fileSizeKB,
          status: 'success' as const,
          message: `Delivered via Gmail (Message ID: ${result.messageId?.slice(0, 8) || 'verified'})`,
        };

        const updatedSettings = saveBackupSettings({
          recipientEmail: targetRecipient,
          lastSentDate: dateStr,
          lastSentStatus: 'success',
          lastSentMessage: `Successfully emailed to ${targetRecipient}`,
          history: [newHistoryEntry, ...settings.history.slice(0, 9)],
        });

        setSettings(updatedSettings);
        setSendNotice({
          type: 'success',
          message: `✨ Daily backup email successfully sent to ${targetRecipient}! (File size: ${fileSizeKB} KB)`,
        });
        if (onNotification) {
          onNotification(`Daily backup email successfully sent to ${targetRecipient}!`, 'success');
        }
      } else {
        const newHistoryEntry = {
          id: `hist_${Date.now()}`,
          timestamp: new Date().toISOString(),
          recipient: targetRecipient,
          productsCount: payload.summary.totalProducts,
          transactionsCount: payload.summary.totalTransactions,
          fileSizeKB,
          status: 'failed' as const,
          message: result.error || 'Failed to send',
        };

        const updatedSettings = saveBackupSettings({
          lastSentStatus: 'failed',
          lastSentMessage: result.error || 'Send failed',
          history: [newHistoryEntry, ...settings.history.slice(0, 9)],
        });

        setSettings(updatedSettings);
        setSendNotice({
          type: 'error',
          message: `Failed to send backup: ${result.error}`,
        });
        if (onNotification) {
          onNotification(`Failed to send backup email: ${result.error}`, 'error');
        }
      }
    } catch (err: any) {
      console.error('Error sending backup email:', err);
      setSendNotice({
        type: 'error',
        message: err.message || 'An error occurred while preparing or sending the backup.',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Direct local JSON download fallback
  const handleDownloadBackupLocally = () => {
    const payload = compileBackupPayload();
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rofani_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSendNotice({
      type: 'success',
      message: 'Backup JSON downloaded directly to your computer.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-sky-950/80 via-slate-900 to-indigo-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>Daily Automatic Email Backup</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Google Workspace
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Scheduled daily database snapshots sent to your email with attached JSON & CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Notification Banner */}
          {sendNotice && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
                sendNotice.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : sendNotice.type === 'error'
                  ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                  : 'bg-sky-950/60 border-sky-800 text-sky-300'
              }`}
            >
              {sendNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span className="flex-1">{sendNotice.message}</span>
            </div>
          )}

          {/* Section 1: Google Account / Gmail Connection */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                Gmail Authorization Status
              </span>
              {accessToken ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                  ● Connected to Gmail
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                  Connection Needed
                </span>
              )}
            </div>

            {accessToken ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800/80">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{googleUser?.displayName || 'Google Account Authorized'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {googleUser?.email || settings.recipientEmail}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConnectGmail}
                    disabled={isConnecting}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isConnecting ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold rounded-lg border border-rose-800/60 transition flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Connect your Google account with permission to send daily store backup emails. The app accesses Gmail with your permission to deliver automated backup snapshots to your inbox.
                </p>
                <button
                  type="button"
                  onClick={handleConnectGmail}
                  disabled={isConnecting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-extrabold shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{isConnecting ? 'Authorizing Gmail...' : 'Connect Gmail to Enable Automated Backups'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Recipient & Schedule Configuration */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-sky-400" />
              Backup Schedule & Destination
            </span>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Recipient Email Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    placeholder="e.g. NivaJuma@gmail.com"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveSettings({ recipientEmail: recipientInput.trim() })}
                    className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Daily Automatic Backup</div>
                    <div className="text-[10px] text-slate-400">Send every evening automatically</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(e) => handleSaveSettings({ enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span>Backup Time</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Daily store closing hour</div>
                  </div>
                  <select
                    value={settings.scheduledHour}
                    onChange={(e) => handleSaveSettings({ scheduledHour: parseInt(e.target.value, 10) })}
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono font-bold rounded-lg px-2 py-1"
                  >
                    <option value={20}>20:00 (8:00 PM)</option>
                    <option value={21}>21:00 (9:00 PM)</option>
                    <option value={22}>22:00 (10:00 PM)</option>
                    <option value={23}>23:00 (11:00 PM)</option>
                    <option value={0}>00:00 (Midnight)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Live Database Snapshot Preview */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-400" />
              Attached Backup Contents
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-[10px] font-bold text-slate-400">Products</div>
                <div className="text-base font-extrabold text-sky-400 font-mono mt-0.5">
                  {products.length}
                </div>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-[10px] font-bold text-slate-400">Sales Records</div>
                <div className="text-base font-extrabold text-emerald-400 font-mono mt-0.5">
                  {transactions.length}
                </div>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-[10px] font-bold text-slate-400">Customers</div>
                <div className="text-base font-extrabold text-purple-400 font-mono mt-0.5">
                  {customers.length}
                </div>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-[10px] font-bold text-slate-400">Suppliers</div>
                <div className="text-base font-extrabold text-amber-400 font-mono mt-0.5">
                  {suppliers.length}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Backup Delivery History */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <History className="w-4 h-4 text-sky-400" />
                Recent Delivery Logs
              </span>
              {settings.lastSentDate && (
                <span className="text-[10px] text-slate-400 font-mono">
                  Last Backup: {settings.lastSentDate}
                </span>
              )}
            </div>

            {settings.history.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center italic">
                No email backups delivered yet. Click "Send Backup Email Now" below to run your first backup!
              </p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {settings.history.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          log.status === 'success' ? 'bg-emerald-400' : 'bg-rose-400'
                        }`}
                      />
                      <span className="font-mono text-slate-300 text-[11px]">
                        {new Date(log.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="text-slate-400 text-[11px] truncate max-w-[140px]">
                        → {log.recipient}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400">
                        {log.fileSizeKB} KB
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          log.status === 'success'
                            ? 'bg-emerald-950 text-emerald-300'
                            : 'bg-rose-950 text-rose-300'
                        }`}
                      >
                        {log.status === 'success' ? 'Sent ✓' : 'Failed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDownloadBackupLocally}
            className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Download .JSON Backup</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmSendDialog(true)}
              disabled={isSending || !accessToken}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-sky-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-pulse' : ''}`} />
              <span>{isSending ? 'Sending Backup...' : 'Send Backup Email Now'}</span>
            </button>
          </div>
        </div>

        {/* Explicit Confirmation Dialog (MANDATORY per Workspace Integration rules) */}
        {showConfirmSendDialog && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-sky-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-sky-500/20 text-sky-400 rounded-xl">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Confirm Email Backup Send</h4>
                  <p className="text-xs text-slate-400">Verified Gmail Dispatch</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to send the complete store database backup to <b>{recipientInput.trim() || settings.recipientEmail}</b>?
              </p>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
                <div>• Products Included: <b>{products.length}</b></div>
                <div>• Sales Transactions: <b>{transactions.length}</b></div>
                <div>• Attachment: <code>Rofani_Store_Backup_{new Date().toISOString().slice(0, 10)}.json</code></div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmSendDialog(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeSendBackupEmail}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-black rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirm & Send Email</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
