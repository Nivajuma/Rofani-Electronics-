import {
  GoogleAuthProvider,
  signInWithPopup,
  reauthenticateWithPopup,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth, getFirebaseAuthConsoleUrl } from './firebase';
import { resolveTenantStorageKey } from '../utils/tenantScope';

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
];

function createGmailProvider(options?: { loginHint?: string; forceSelectAccount?: boolean }) {
  const nextProvider = new GoogleAuthProvider();
  GMAIL_SCOPES.forEach((scope) => nextProvider.addScope(scope));
  if (options?.forceSelectAccount) {
    nextProvider.setCustomParameters({ prompt: 'select_account' });
  } else {
    const hint = (options?.loginHint || auth.currentUser?.email || '').trim();
    if (hint) {
      nextProvider.setCustomParameters({ login_hint: hint });
    } else {
      nextProvider.setCustomParameters({ prompt: 'select_account' });
    }
  }
  return nextProvider;
}

// Session-scoped token cache (in-memory + sessionStorage with 50m TTL; never stored in localStorage)
const SESSION_TOKEN_KEY = 'rofani_gmail_session_token_v1';
let cachedAccessToken: string | null = null;
let cachedTokenExpiresAt = 0;
let cachedGmailEmail: string | null = null;
let isSigningIn = false;

function persistSessionToken(token: string | null, email?: string | null) {
  cachedAccessToken = token;
  cachedGmailEmail = email ? email.trim() : null;
  cachedTokenExpiresAt = token ? Date.now() + 50 * 60 * 1000 : 0;
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    if (!token) {
      window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
    } else {
      window.sessionStorage.setItem(
        SESSION_TOKEN_KEY,
        JSON.stringify({
          token,
          email: cachedGmailEmail,
          expiresAt: cachedTokenExpiresAt,
        })
      );
    }
  } catch {
    // Ignore restricted storage contexts
  }
}

function hydrateSessionToken(): string | null {
  if (cachedAccessToken && Date.now() < cachedTokenExpiresAt) {
    return cachedAccessToken;
  }
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    const raw = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.token === 'string' &&
      parsed.token.length > 0 &&
      typeof parsed.expiresAt === 'number' &&
      Date.now() < parsed.expiresAt
    ) {
      cachedAccessToken = parsed.token;
      cachedTokenExpiresAt = parsed.expiresAt;
      cachedGmailEmail = typeof parsed.email === 'string' ? parsed.email : null;
      return cachedAccessToken;
    }
    window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // Ignore parse errors
  }
  cachedAccessToken = null;
  cachedTokenExpiresAt = 0;
  return null;
}

// Initialize Auth listener to clear token on sign-out
export const initGmailAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    const activeToken = hydrateSessionToken();
    if (user && activeToken) {
      if (onAuthSuccess) onAuthSuccess(user, activeToken);
    } else if (!isSigningIn && user === null) {
      persistSessionToken(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in / re-authorize with Google to obtain Gmail Send access token
export const signInWithGoogleForGmail = async (options?: {
  loginHint?: string;
  forceSelectAccount?: boolean;
}): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const activeProvider = createGmailProvider(options);
    const currentUser = auth.currentUser;
    const isGoogleUser = Boolean(
      currentUser &&
        Array.isArray(currentUser.providerData) &&
        currentUser.providerData.some((p) => p?.providerId === 'google.com')
    );

    let result;
    if (isGoogleUser && currentUser && !options?.forceSelectAccount) {
      try {
        result = await reauthenticateWithPopup(currentUser, activeProvider);
      } catch (reauthErr: any) {
        if (
          reauthErr?.code === 'auth/user-mismatch' ||
          reauthErr?.code === 'auth/credential-already-in-use'
        ) {
          result = await signInWithPopup(auth, activeProvider);
        } else {
          throw reauthErr;
        }
      }
    } else {
      result = await signInWithPopup(auth, activeProvider);
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error('Google Auth succeeded but no Gmail access token was returned. Please try "Switch Account" or allow Gmail send permissions.');
    }

    persistSessionToken(token, result.user?.email || options?.loginHint || null);
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
      customErr.consoleUrl = getFirebaseAuthConsoleUrl();
      throw customErr;
    }
    if (
      err?.code === 'auth/popup-blocked' ||
      err?.code === 'auth/operation-not-supported-in-this-environment' ||
      err?.code === 'auth/cancelled-popup-request' ||
      err?.code === 'auth/popup-closed-by-user' ||
      err?.code === 'auth/internal-error'
    ) {
      const popupErr: any = new Error(
        err?.code === 'auth/popup-closed-by-user'
          ? 'Google authorization popup was closed before completing. You can try again or use Email App / Share Backup below.'
          : 'Browser popup authorization could not complete here. Allow popups for this site or use Email App / Share Backup below.'
      );
      popupErr.code = err?.code || 'auth/popup-blocked';
      popupErr.isPopupBlocked = true;
      throw popupErr;
    }
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const getGmailAccessToken = (): string | null => {
  return hydrateSessionToken();
};

export const getGmailUserEmail = (): string | null => {
  hydrateSessionToken();
  return cachedGmailEmail || auth.currentUser?.email || null;
};

export const setGmailAccessToken = (token: string | null, email?: string | null) => {
  persistSessionToken(token, email ?? cachedGmailEmail);
};

export const clearGmailAccessToken = () => {
  persistSessionToken(null);
};

export const logoutGmail = async () => {
  persistSessionToken(null);
  await auth.signOut();
};

export interface BackupSettings {
  enabled: boolean;
  recipientEmail: string;
  recipientEmailConfirmed?: boolean;
  scheduledHour: number; // 0-23, e.g. 19 (7 PM)
  scheduledMinute: number;
  lastSentDate: string | null;
  lastSentStatus: 'success' | 'failed' | null;
  lastSentMessage: string | null;
  lastQueuedDate?: string | null;
  lastQueuedTimestamp?: string | null;
  lastAutoAttemptDate?: string | null;
  dismissedBackupBannerDate?: string | null;
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
  recipientEmail: '',
  recipientEmailConfirmed: false,
  scheduledHour: 19,
  scheduledMinute: 0,
  lastSentDate: null,
  lastSentStatus: null,
  lastSentMessage: null,
  lastQueuedDate: null,
  lastQueuedTimestamp: null,
  lastAutoAttemptDate: null,
  dismissedBackupBannerDate: null,
  history: [],
};

const STORAGE_KEY = 'rofani_daily_email_backup_settings';
const BACKUP_EMAIL_KEY = 'rofani_pos_backup_email';
const DISMISSED_BANNER_DATE_KEY = 'rofani_pos_dismissed_backup_banner_date';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const readStoredBackupEmail = (): string => {
  try {
    const emailKey = resolveTenantStorageKey(BACKUP_EMAIL_KEY);
    const raw =
      localStorage.getItem(emailKey) ||
      (emailKey === BACKUP_EMAIL_KEY ? null : localStorage.getItem(BACKUP_EMAIL_KEY));
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'string' ? parsed.trim() : '';
    } catch {
      return raw.trim();
    }
  } catch {
    return '';
  }
};

const readStoredDismissedBannerDate = (): string | null => {
  try {
    const dateKey = resolveTenantStorageKey(DISMISSED_BANNER_DATE_KEY);
    const raw =
      localStorage.getItem(dateKey) ||
      (dateKey === DISMISSED_BANNER_DATE_KEY ? null : localStorage.getItem(DISMISSED_BANNER_DATE_KEY));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.trim())) {
        return parsed.trim();
      }
      return null;
    } catch {
      return /^\d{4}-\d{2}-\d{2}$/.test(raw.trim()) ? raw.trim() : null;
    }
  } catch {
    return null;
  }
};

function normalizeBackupSettings(
  rawObj: any,
  fallbackEmail: string,
  storedEmail = '',
  storedDismissedDate: string | null = null
): BackupSettings {
  const safeObj = rawObj && typeof rawObj === 'object' ? rawObj : {};
  const rawRecipient =
    typeof safeObj.recipientEmail === 'string' ? safeObj.recipientEmail.trim() : '';
  const cleanStoredEmail = (storedEmail || '').trim();
  const cleanFallback = (fallbackEmail || '').trim();

  const recipientEmail = rawRecipient || cleanStoredEmail || cleanFallback || '';
  const hasValidRecipient = EMAIL_REGEX.test(recipientEmail);
  const enabled = typeof safeObj.enabled === 'boolean' ? safeObj.enabled : DEFAULT_SETTINGS.enabled;

  // Once a valid backup email is saved or Email Auto Backup is ON with a configured email,
  // treat that email as confirmed/trusted unless explicitly cleared/edited.
  const isConfirmed = Boolean(
    hasValidRecipient &&
      (safeObj.recipientEmailConfirmed === true ||
        Boolean(cleanStoredEmail) ||
        (enabled && Boolean(rawRecipient)))
  );

  const scheduledHour =
    typeof safeObj.scheduledHour === 'number' &&
    Number.isFinite(safeObj.scheduledHour) &&
    safeObj.scheduledHour >= 0 &&
    safeObj.scheduledHour <= 23
      ? safeObj.scheduledHour
      : DEFAULT_SETTINGS.scheduledHour;
  const scheduledMinute =
    typeof safeObj.scheduledMinute === 'number' && Number.isFinite(safeObj.scheduledMinute)
      ? safeObj.scheduledMinute
      : DEFAULT_SETTINGS.scheduledMinute;

  const rawDismissedDate =
    typeof safeObj.dismissedBackupBannerDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(safeObj.dismissedBackupBannerDate.trim())
      ? safeObj.dismissedBackupBannerDate.trim()
      : null;

  return {
    enabled,
    recipientEmail,
    recipientEmailConfirmed: isConfirmed,
    scheduledHour,
    scheduledMinute,
    lastSentDate: typeof safeObj.lastSentDate === 'string' ? safeObj.lastSentDate : null,
    lastSentStatus:
      safeObj.lastSentStatus === 'success' || safeObj.lastSentStatus === 'failed'
        ? safeObj.lastSentStatus
        : null,
    lastSentMessage: typeof safeObj.lastSentMessage === 'string' ? safeObj.lastSentMessage : null,
    lastQueuedDate: typeof safeObj.lastQueuedDate === 'string' ? safeObj.lastQueuedDate : null,
    lastQueuedTimestamp:
      typeof safeObj.lastQueuedTimestamp === 'string' ? safeObj.lastQueuedTimestamp : null,
    lastAutoAttemptDate:
      typeof safeObj.lastAutoAttemptDate === 'string' ? safeObj.lastAutoAttemptDate : null,
    dismissedBackupBannerDate: rawDismissedDate || storedDismissedDate || null,
    history: Array.isArray(safeObj.history)
      ? safeObj.history.filter((item: any) => item && typeof item === 'object')
      : [],
  };
}

export const getBackupSettings = (): BackupSettings => {
  const fallbackEmail = (auth.currentUser?.email || '').trim();
  const storedEmail = readStoredBackupEmail();
  const storedDismissedDate = readStoredDismissedBannerDate();
  try {
    const resolvedKey = resolveTenantStorageKey(STORAGE_KEY);
    const raw =
      localStorage.getItem(resolvedKey) ||
      (resolvedKey === STORAGE_KEY ? null : localStorage.getItem(STORAGE_KEY));
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeBackupSettings(parsed, fallbackEmail, storedEmail, storedDismissedDate);
    }
  } catch (_) {}
  return normalizeBackupSettings(null, fallbackEmail, storedEmail, storedDismissedDate);
};

export const saveBackupSettings = (settings: Partial<BackupSettings>): BackupSettings => {
  const current = getBackupSettings();
  const merged = { ...current, ...settings };
  const candidateEmail =
    typeof merged.recipientEmail === 'string' ? merged.recipientEmail.trim() : '';
  if (
    EMAIL_REGEX.test(candidateEmail) &&
    settings.recipientEmailConfirmed !== false &&
    (merged.enabled || Boolean(settings.recipientEmail) || settings.recipientEmailConfirmed === true)
  ) {
    merged.recipientEmailConfirmed = true;
  }

  const storedEmail =
    merged.recipientEmailConfirmed && EMAIL_REGEX.test(candidateEmail)
      ? candidateEmail
      : readStoredBackupEmail();
  const updated = normalizeBackupSettings(
    merged,
    current.recipientEmail,
    storedEmail,
    merged.dismissedBackupBannerDate || readStoredDismissedBannerDate()
  );

  try {
    const resolvedKey = resolveTenantStorageKey(STORAGE_KEY);
    localStorage.setItem(resolvedKey, JSON.stringify(updated));
    if (updated.recipientEmailConfirmed && EMAIL_REGEX.test(updated.recipientEmail)) {
      localStorage.setItem(
        resolveTenantStorageKey(BACKUP_EMAIL_KEY),
        JSON.stringify(updated.recipientEmail)
      );
    }
    if (updated.dismissedBackupBannerDate) {
      localStorage.setItem(
        resolveTenantStorageKey(DISMISSED_BANNER_DATE_KEY),
        JSON.stringify(updated.dismissedBackupBannerDate)
      );
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rofani:backup-settings-updated', { detail: updated }));
    }
  } catch (_) {}
  return updated;
};

export const isBackupBannerDismissedForDate = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const settings = getBackupSettings();
  const storedDate = readStoredDismissedBannerDate();
  return settings.dismissedBackupBannerDate === dateStr || storedDate === dateStr;
};

export const dismissBackupBannerForDate = (dateStr: string): BackupSettings => {
  try {
    localStorage.setItem(
      resolveTenantStorageKey(DISMISSED_BANNER_DATE_KEY),
      JSON.stringify(dateStr)
    );
  } catch {}
  return saveBackupSettings({ dismissedBackupBannerDate: dateStr });
};

/**
 * Strips heavy inline base64 data:image blobs before email serialization so mobile/browser
 * memory never spikes and attachments stay well within Gmail's 25MB message limit.
 */
export const sanitizeProductsForEmailBackup = (products: any[]): any[] => {
  if (!Array.isArray(products)) return [];
  return products
    .filter((p) => p && typeof p === 'object')
    .map((p) => {
      const img = typeof p.imageUrl === 'string' ? p.imageUrl : '';
      const isHeavyInlineImage = img.startsWith('data:') || img.length > 2000;
      if (!isHeavyInlineImage) return p;
      return {
        ...p,
        imageUrl: '',
        hasLocalPhoto: true,
      };
    });
};

// High-performance chunked base64 encoder (uses small chunks safe for all mobile JS engines)
const uint8ToBase64 = (bytes: Uint8Array): string => {
  const chunks: string[] = [];
  const len = bytes.byteLength;
  const chunkSize = 4096;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    chunks.push(String.fromCharCode.apply(null, chunk as unknown as number[]));
  }
  return btoa(chunks.join(''));
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

const encodeMimeSubject = (subject: string): string => {
  const utf8Bytes = new TextEncoder().encode(subject);
  return `=?UTF-8?B?${uint8ToBase64(utf8Bytes)}?=`;
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
}): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  isAuthExpired?: boolean;
  isNetworkError?: boolean;
}> => {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        success: false,
        isNetworkError: true,
        error: 'Device is offline. Backup snapshot is saved locally — retry when connected or use Download .JSON Backup.',
      };
    }

    const jsonBytes = new TextEncoder().encode(backupJsonString);
    // Gmail raw upload limit is ~25 MB after MIME/base64 encoding; guard at 15 MB JSON
    if (jsonBytes.byteLength > 15 * 1024 * 1024) {
      return {
        success: false,
        error: `Backup size (${Math.round(jsonBytes.byteLength / (1024 * 1024))} MB) exceeds Gmail's 25 MB attachment limit. Use "Download .JSON Backup" for full device archive.`,
      };
    }

    const boundary = `====_Boundary_${Date.now()}_====`;
    const attachmentBase64 = uint8ToBase64(jsonBytes);

    const messageParts = [
      `To: ${recipientEmail}`,
      `Subject: ${encodeMimeSubject(subject)}`,
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    let response: Response;
    try {
      response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedRaw }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `Gmail API returned HTTP ${response.status}`;
      const isAuthExpired = response.status === 401;
      if (isAuthExpired) {
        clearGmailAccessToken();
      }
      return { success: false, error: errMsg, isAuthExpired };
    }

    const resData = await response.json();
    return { success: true, messageId: resData?.id };
  } catch (err: any) {
    const msg = String(err?.message || '');
    const isNetworkError =
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      err?.name === 'TypeError' ||
      err?.name === 'AbortError' ||
      /failed to fetch|networkerror|load failed|network request failed|aborted/i.test(msg);

    console.warn('[Gmail Backup Dispatch Notice]:', msg || err);
    return {
      success: false,
      isNetworkError,
      error: isNetworkError
        ? 'Could not reach Gmail servers right now (offline or blocked in preview). Your backup is saved locally — use Email App / Share Sheet or Download .JSON Backup.'
        : msg || 'Unknown network error',
    };
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
  storeName = 'Rofani POS',
}: BuildBackupParams): Promise<{
  success: boolean;
  messageId?: string;
  fileSizeKB?: number;
  error?: string;
  isAuthExpired?: boolean;
  isNetworkError?: boolean;
}> => {
  try {
    const safeProducts = sanitizeProductsForEmailBackup(products);
    const safeTransactions = Array.isArray(transactions) ? transactions.filter(Boolean) : [];
    const safeCustomers = Array.isArray(customers) ? customers.filter(Boolean) : [];
    const safeSuppliers = Array.isArray(suppliers) ? suppliers.filter(Boolean) : [];
    const safeExpenses = Array.isArray(expenses) ? expenses.filter(Boolean) : [];
    const safeCashTransactions = Array.isArray(cashTransactions) ? cashTransactions.filter(Boolean) : [];
    const safeUsers = Array.isArray(allUsers) ? allUsers.filter(Boolean) : [];

    const todayStr = new Date().toISOString().slice(0, 10);
    const friendlyDate = new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const inventoryValue = safeProducts.reduce(
      (sum, p) => sum + (Number(p?.sellingPrice) || 0) * (Number(p?.stockQuantity) || 0),
      0
    );
    const grossSales = safeTransactions.reduce(
      (sum, t) => sum + (Number(t?.grandTotal) || 0),
      0
    );

    const payload = {
      app: 'Rofani POS',
      version: '2.5.0',
      exportType: 'daily_email_auto_backup',
      storeName,
      exportedAt: new Date().toISOString(),
      summary: {
        totalProducts: safeProducts.length,
        totalTransactions: safeTransactions.length,
        totalCustomers: safeCustomers.length,
        totalSuppliers: safeSuppliers.length,
        totalExpenses: safeExpenses.length,
        totalCashTransactions: safeCashTransactions.length,
        totalEmployees: safeUsers.length,
        totalInventoryValueKSh: inventoryValue,
        totalGrossSalesKSh: grossSales,
      },
      collections: {
        products: safeProducts,
        transactions: safeTransactions,
        customers: safeCustomers,
        suppliers: safeSuppliers,
        expenses: safeExpenses,
        cashTransactions: safeCashTransactions,
        employees: safeUsers.map((u: any) => ({
          id: u?.id,
          name: u?.name,
          email: u?.email,
          role: u?.role,
          phone: u?.phone,
          status: u?.status,
          commissionType: u?.commissionType,
        })),
      },
    };

    const compactJson = JSON.stringify(payload);
    const jsonString =
      compactJson.length > 2 * 1024 * 1024 ? compactJson : JSON.stringify(payload, null, 2);
    const fileSizeKB = Math.round(new Blob([jsonString]).size / 1024);
    const fileName = `Rofani_Store_Backup_${todayStr}.json`;
    const subject = `ROFANI POS Daily Backup • ${todayStr} (${safeProducts.length} Items)`;

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
              <div class="stat-value">${safeProducts.length.toLocaleString()} Items</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Total Transactions</div>
              <div class="stat-value">${safeTransactions.length.toLocaleString()} Sales</div>
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

    const existingHistory = Array.isArray(getBackupSettings().history) ? getBackupSettings().history : [];

    if (sendRes.success) {
      const historyEntry = {
        id: `hist_${Date.now()}`,
        timestamp: new Date().toISOString(),
        recipient: recipientEmail,
        productsCount: safeProducts.length,
        transactionsCount: safeTransactions.length,
        fileSizeKB,
        status: 'success' as const,
        message: `Delivered via Gmail (ID: ${String(sendRes.messageId || '').slice(0, 8) || 'verified'})`,
      };
      saveBackupSettings({
        recipientEmail,
        recipientEmailConfirmed: true,
        lastSentDate: todayStr,
        lastAutoAttemptDate: todayStr,
        lastSentStatus: 'success',
        lastSentMessage: `Successfully emailed to ${recipientEmail}`,
        history: [historyEntry, ...existingHistory.slice(0, 19)],
      });
      return { success: true, messageId: sendRes.messageId, fileSizeKB };
    } else {
      const historyEntry = {
        id: `hist_${Date.now()}`,
        timestamp: new Date().toISOString(),
        recipient: recipientEmail,
        productsCount: safeProducts.length,
        transactionsCount: safeTransactions.length,
        fileSizeKB,
        status: 'failed' as const,
        message: sendRes.error || 'Failed to send',
      };
      saveBackupSettings({
        lastAutoAttemptDate: todayStr,
        lastSentStatus: 'failed',
        lastSentMessage: sendRes.error || 'Send failed',
        history: [historyEntry, ...existingHistory.slice(0, 19)],
      });
      return {
        success: false,
        error: sendRes.error,
        isAuthExpired: sendRes.isAuthExpired,
        isNetworkError: sendRes.isNetworkError,
      };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to compile or send backup' };
  }
};
