import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
];

const provider = new GoogleAuthProvider();
GMAIL_SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

// In-memory token cache (never stored in localStorage for security compliance)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize Auth listener to clear token on sign-out
export const initGmailAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google to obtain Gmail Send access token
export const signInWithGoogleForGmail = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error('Google Auth succeeded but no access token was returned.');
    }

    cachedAccessToken = token;
    return { user: result.user, accessToken: token };
  } catch (err: any) {
    console.error('Google Gmail Sign-in Error:', err);
    if (
      err?.code === 'auth/unauthorized-domain' ||
      err?.message?.includes('unauthorized-domain')
    ) {
      const customErr: any = new Error(
        `Firebase Error (auth/unauthorized-domain): The domain '${typeof window !== 'undefined' ? window.location.hostname : 'vercel.app'}' is not authorized in Firebase. Please add 'vercel.app' to Authorized Domains in your Firebase Console.`
      );
      customErr.code = 'auth/unauthorized-domain';
      customErr.isUnauthorizedDomain = true;
      customErr.hostname = typeof window !== 'undefined' ? window.location.hostname : 'vercel.app';
      customErr.consoleUrl = 'https://console.firebase.google.com/project/gen-lang-client-0043475796/authentication/settings';
      throw customErr;
    }
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const getGmailAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setGmailAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logoutGmail = async () => {
  cachedAccessToken = null;
  await auth.signOut();
};

export interface BackupSettings {
  enabled: boolean;
  recipientEmail: string;
  scheduledHour: number; // 0-23, e.g. 23 (11 PM)
  scheduledMinute: number;
  lastSentDate: string | null;
  lastSentStatus: 'success' | 'failed' | null;
  lastSentMessage: string | null;
  history: Array<{
    id: string;
    timestamp: string;
    recipient: string;
    productsCount: number;
    transactionsCount: number;
    fileSizeKB: number;
    status: 'success' | 'failed';
    message: string;
  }>;
}

const DEFAULT_SETTINGS: BackupSettings = {
  enabled: true,
  recipientEmail: 'NivaJuma@gmail.com',
  scheduledHour: 19,
  scheduledMinute: 0,
  lastSentDate: null,
  lastSentStatus: null,
  lastSentMessage: null,
  history: [],
};

const STORAGE_KEY = 'rofani_daily_email_backup_settings';

export const getBackupSettings = (): BackupSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (_) {}
  return DEFAULT_SETTINGS;
};

export const saveBackupSettings = (settings: Partial<BackupSettings>): BackupSettings => {
  const current = getBackupSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (_) {}
  return updated;
};

// High-performance chunked base64 encoder for multi-megabyte catalog payloads
const uint8ToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
};

// Encode UTF-8 strings to Base64URL for Gmail REST API
const base64UrlEncode = (str: string): string => {
  const utf8Bytes = new TextEncoder().encode(str);
  const b64 = uint8ToBase64(utf8Bytes);
  return b64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

// Send email with attached database JSON backup using Gmail REST API
export const sendBackupEmailViaGmail = async ({
  accessToken,
  recipientEmail,
  subject,
  htmlContent,
  backupFileName,
  backupJsonString,
}: {
  accessToken: string;
  recipientEmail: string;
  subject: string;
  htmlContent: string;
  backupFileName: string;
  backupJsonString: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const boundary = `====_Boundary_${Date.now()}_====`;
    // Clean UTF-8 binary encoding without deprecated unescape()
    const jsonBytes = new TextEncoder().encode(backupJsonString);
    const attachmentBase64 = uint8ToBase64(jsonBytes);

    const messageParts = [
      `To: ${recipientEmail}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      htmlContent,
      '',
      `--${boundary}`,
      `Content-Type: application/json; name="${backupFileName}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${backupFileName}"`,
      '',
      attachmentBase64,
      '',
      `--${boundary}--`,
    ];

    const rawMessage = messageParts.join('\r\n');
    const encodedRaw = base64UrlEncode(rawMessage);

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedRaw }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `Gmail API returned HTTP ${response.status}`;
      return { success: false, error: errMsg };
    }

    const resData = await response.json();
    return { success: true, messageId: resData.id };
  } catch (err: any) {
    console.error('Failed to send email via Gmail:', err);
    return { success: false, error: err.message || 'Unknown network error' };
  }
};

export interface BuildBackupParams {
  accessToken: string;
  recipientEmail: string;
  products: any[];
  transactions: any[];
  customers: any[];
  suppliers: any[];
  expenses: any[];
  cashTransactions?: any[];
  allUsers?: any[];
  storeName?: string;
}

export const buildAndDispatchStoreBackup = async ({
  accessToken,
  recipientEmail,
  products,
  transactions,
  customers,
  suppliers,
  expenses,
  cashTransactions = [],
  allUsers = [],
  storeName = 'ROFANI ELECTRONICS AND BOUTIQUE',
}: BuildBackupParams): Promise<{
  success: boolean;
  messageId?: string;
  fileSizeKB?: number;
  error?: string;
}> => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const friendlyDate = new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const inventoryValue = products.reduce(
      (sum, p) => sum + (p.sellingPrice || 0) * (p.stockQuantity || 0),
      0
    );
    const grossSales = transactions.reduce(
      (sum, t) => sum + (t.grandTotal || 0),
      0
    );

    const payload = {
      app: 'ROFANI ELECTRONICS AND BOUTIQUE POS',
      version: '2.5.0',
      exportType: 'daily_email_auto_backup',
      storeName,
      exportedAt: new Date().toISOString(),
      summary: {
        totalProducts: products.length,
        totalTransactions: transactions.length,
        totalCustomers: customers.length,
        totalSuppliers: suppliers.length,
        totalExpenses: expenses.length,
        totalCashTransactions: cashTransactions.length,
        totalEmployees: allUsers.length,
        totalInventoryValueKSh: inventoryValue,
        totalGrossSalesKSh: grossSales,
      },
      collections: {
        products,
        transactions,
        customers,
        suppliers,
        expenses,
        cashTransactions,
        employees: allUsers.map((u: any) => ({
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

    const jsonString = JSON.stringify(payload, null, 2);
    const fileSizeKB = Math.round(new Blob([jsonString]).size / 1024);
    const fileName = `Rofani_Store_Backup_${todayStr}.json`;
    const subject = `ROFANI POS Daily Backup • ${todayStr} (${products.length} Items)`;

    const htmlBody = `
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
            <h1 class="title">${storeName}</h1>
            <p class="subtitle">Official Daily Store Database Snapshot • ${friendlyDate}</p>
          </div>
          <p style="font-size: 14px; line-height: 1.5; color: #e2e8f0;">
            Hello Store Owner,
            <br><br>
            Your daily store data backup for <b>${friendlyDate}</b> has been compiled and is securely attached to this email as a verified JSON database backup file.
          </p>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-label">Active Catalog Items</div>
              <div class="stat-value">${products.length.toLocaleString()} Items</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Total Transactions</div>
              <div class="stat-value">${transactions.length.toLocaleString()} Sales</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Stock Valuation</div>
              <div class="stat-value">KSh ${inventoryValue.toLocaleString()}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Cumulative Sales</div>
              <div class="stat-value">KSh ${grossSales.toLocaleString()}</div>
            </div>
          </div>
          <div style="background-color: #022c22; border: 1px solid #059669; border-radius: 10px; padding: 14px; margin-top: 16px;">
            <div style="font-size: 12px; font-weight: bold; color: #34d399;">✓ Backup File Attached: ${fileName} (${fileSizeKB} KB)</div>
            <div style="font-size: 11px; color: #a7f3d0; margin-top: 4px;">
              Contains complete verified records for Products, Inventory, Sales Transactions, Customers, Suppliers, and Expenses.
            </div>
          </div>
          <div class="footer">
            ${storeName} POS System • Automated Backup Service
            <br>Keep this email for your financial and inventory auditing records.
          </div>
        </div>
      </body>
      </html>
    `;

    const sendRes = await sendBackupEmailViaGmail({
      accessToken,
      recipientEmail,
      subject,
      htmlContent: htmlBody,
      backupFileName: fileName,
      backupJsonString: jsonString,
    });

    if (sendRes.success) {
      const historyEntry = {
        id: `hist_${Date.now()}`,
        timestamp: new Date().toISOString(),
        recipient: recipientEmail,
        productsCount: products.length,
        transactionsCount: transactions.length,
        fileSizeKB,
        status: 'success' as const,
        message: `Delivered via Gmail (ID: ${sendRes.messageId?.slice(0, 8) || 'verified'})`,
      };
      saveBackupSettings({
        recipientEmail,
        lastSentDate: todayStr,
        lastSentStatus: 'success',
        lastSentMessage: `Successfully emailed to ${recipientEmail}`,
        history: [historyEntry, ...getBackupSettings().history.slice(0, 19)],
      });
      return { success: true, messageId: sendRes.messageId, fileSizeKB };
    } else {
      const historyEntry = {
        id: `hist_${Date.now()}`,
        timestamp: new Date().toISOString(),
        recipient: recipientEmail,
        productsCount: products.length,
        transactionsCount: transactions.length,
        fileSizeKB,
        status: 'failed' as const,
        message: sendRes.error || 'Failed to send',
      };
      saveBackupSettings({
        lastSentStatus: 'failed',
        lastSentMessage: sendRes.error || 'Send failed',
        history: [historyEntry, ...getBackupSettings().history.slice(0, 19)],
      });
      return { success: false, error: sendRes.error };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to compile or send backup' };
  }
};
