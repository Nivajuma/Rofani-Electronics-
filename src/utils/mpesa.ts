// Safaricom M-PESA Daraja & Express STK Push Utility
import { safeGetJSON, safeSetJSON } from './safeStorage';
import { saveMpesaConfigToCloud } from '../lib/cloudSync';

export interface MpesaConfig {
  shortcode: string; // Till or Paybill number e.g. "1833804"
  storeNumber?: string; // Store / Head Office Number from Safaricom (if different from Till)
  shortcodeType: 'till' | 'paybill';
  storeDisplayName: string;
  passkey?: string;
  consumerKey?: string;
  consumerSecret?: string;
  environment: 'sandbox' | 'production';
  mode: 'instant_demo' | 'live_daraja';
  autoSimulatePinDelaySeconds?: number;
}

export interface StkPushRequest {
  phoneNumber: string; // e.g. 0712345678, 254712345678, +254...
  amount: number;
  accountReference?: string; // e.g. Order # or POS-INV
  transactionDesc?: string;
  storeName?: string;
}

export interface StkPushResponse {
  success: boolean;
  checkoutRequestId: string;
  merchantRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
  formattedPhone: string;
}

export interface StkStatusResponse {
  checkoutRequestId: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'TIMEOUT';
  mpesaReceiptNumber?: string;
  amount?: number;
  phoneNumber?: string;
  transactionDate?: string;
  smsNotification?: string;
  errorMessage?: string;
  message?: string;
  resultDesc?: string;
}

const STORAGE_KEY = 'rofani_pos_mpesa_config';

const env = (import.meta as any)?.env || {};

export const DEFAULT_MPESA_CONFIG: MpesaConfig = {
  shortcode: env.VITE_MPESA_SHORTCODE || env.VITE_MPESA_TILL || '1833804',
  storeNumber: env.VITE_MPESA_STORE_NUMBER || '1365369',
  shortcodeType: (env.VITE_MPESA_SHORTCODE_TYPE as any) || 'till',
  storeDisplayName: env.VITE_STORE_NAME || 'ROFANI ELECTRONICS & BOUTIQUE',
  passkey: env.VITE_MPESA_PASSKEY || env.VITE_DARAJA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
  consumerKey: env.VITE_MPESA_CONSUMER_KEY || env.VITE_DARAJA_CONSUMER_KEY || env.MPESA_CONSUMER_KEY || '',
  consumerSecret: env.VITE_MPESA_CONSUMER_SECRET || env.VITE_DARAJA_CONSUMER_SECRET || env.MPESA_CONSUMER_SECRET || '',
  environment: (env.VITE_MPESA_ENV as any) || 'production',
  mode: (env.VITE_MPESA_MODE as any) || 'live_daraja',
  autoSimulatePinDelaySeconds: 4,
};

export const loadMpesaConfig = (): MpesaConfig => {
  const saved = safeGetJSON<MpesaConfig>(STORAGE_KEY, DEFAULT_MPESA_CONFIG);
  return {
    ...saved,
    consumerKey: saved.consumerKey || DEFAULT_MPESA_CONFIG.consumerKey,
    consumerSecret: saved.consumerSecret || DEFAULT_MPESA_CONFIG.consumerSecret,
    passkey: saved.passkey || DEFAULT_MPESA_CONFIG.passkey,
    shortcode: saved.shortcode || DEFAULT_MPESA_CONFIG.shortcode,
  };
};

export const saveMpesaConfig = (config: MpesaConfig): void => {
  safeSetJSON(STORAGE_KEY, config);
  saveMpesaConfigToCloud(config).catch((err) => {
    console.warn('[M-PESA Cloud Sync Notice] Could not save config to cloud:', err);
  });
};

/**
 * Normalizes any Kenyan phone number to standard 254XXXXXXXXX format
 */
export const normalizeKenyanPhone = (rawPhone: string): { normalized: string; isValid: boolean; displayFormatted: string } => {
  if (!rawPhone) {
    return { normalized: '', isValid: false, displayFormatted: '' };
  }

  // Strip all spaces, dashes, parentheses
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '254' + cleaned;
  }

  // Valid Kenyan phone must be 254 followed by 9 digits (total 12 digits), starting with 2547... or 2541...
  const isValid = /^254(7|1)\d{8}$/.test(cleaned);

  // Format nicely for human display: +254 712 345 678
  let displayFormatted = cleaned;
  if (cleaned.length === 12 && cleaned.startsWith('254')) {
    displayFormatted = `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }

  return {
    normalized: cleaned,
    isValid,
    displayFormatted,
  };
};

/**
 * Generate authentic-looking M-PESA Receipt code (e.g. QHK78M32KL)
 */
export const generateMpesaReceiptCode = (): string => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const alphanumeric = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  
  // Usually starts with Q, R, S, T, or U in recent years
  const prefixYears = ['Q', 'R', 'S', 'T'];
  const startChar = prefixYears[Math.floor(Math.random() * prefixYears.length)];
  
  let code = startChar;
  for (let i = 0; i < 9; i++) {
    code += alphanumeric.charAt(Math.floor(Math.random() * alphanumeric.length));
  }
  return code;
};

/**
 * Formats a realistic Safaricom M-PESA SMS text message
 */
export const formatMpesaConfirmationSms = (
  receiptCode: string,
  amount: number,
  storeName: string,
  tillOrPaybill: string,
  balance: number = 18450.0
): string => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB'); // DD/MM/YYYY
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  
  return `${receiptCode} Confirmed. Ksh ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} sent to ${storeName.toUpperCase()} ${tillOrPaybill ? `(Till ${tillOrPaybill})` : ''} on ${dateStr} at ${timeStr}. New M-PESA balance is Ksh ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}. Transaction cost, Ksh 0.00.`;
};

/**
 * Send STK Push request to backend or execute simulated prompt
 */
export const requestMpesaStkPush = async (
  request: StkPushRequest,
  config: MpesaConfig = loadMpesaConfig()
): Promise<StkPushResponse> => {
  const { normalized, isValid, displayFormatted } = normalizeKenyanPhone(request.phoneNumber);
  
  if (!isValid) {
    throw new Error(`Invalid Kenyan phone number (${request.phoneNumber}). Please enter a valid Safaricom/Airtel number like 0712345678 or 0110123456.`);
  }

  const checkoutRequestId = `ws_CO_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const merchantRequestId = `REQ_${Date.now()}`;

  // Try backend proxy if available
  try {
    const res = await fetch('/api/mpesa/stkpush', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: normalized,
        amount: request.amount,
        accountReference: request.accountReference || 'POS-SALE',
        transactionDesc: request.transactionDesc || `Payment to ${config.storeDisplayName}`,
        storeName: config.storeDisplayName,
        tillNumber: config.shortcode,
        storeNumber: config.storeNumber || config.shortcode,
        shortcodeType: config.shortcodeType,
        consumerKey: config.consumerKey,
        consumerSecret: config.consumerSecret,
        passkey: config.passkey,
        checkoutRequestId,
        merchantRequestId,
        mode: config.mode,
        environment: config.environment || 'production',
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok) {
      if (contentType.includes('application/json')) {
        const data = await res.json();
        return {
          ...data,
          formattedPhone: displayFormatted,
        };
      }
    } else {
      let errorMsg = `Server error (${res.status})`;
      if (contentType.includes('application/json')) {
        const errData = await res.json();
        errorMsg = errData.error || errData.responseDescription || errData.message || errorMsg;
      }
      throw new Error(errorMsg);
    }
  } catch (err: any) {
    if (config.mode === 'live_daraja' || (config.consumerKey && config.consumerSecret)) {
      throw err;
    }
    console.warn('Backend STK push call failed, falling back to local simulator:', err);
  }

  // Client-side fallback for instant demo mode
  return {
    success: true,
    checkoutRequestId,
    merchantRequestId,
    responseCode: '0',
    responseDescription: 'Success. Request accepted for processing',
    customerMessage: `Success. Lipa Na M-PESA prompt dispatched to customer mobile (${displayFormatted}).`,
    formattedPhone: displayFormatted,
  };
};

/**
 * Query STK Push status
 */
export const queryMpesaStkStatus = async (
  checkoutRequestId: string,
  config?: MpesaConfig,
  amount?: number
): Promise<StkStatusResponse | null> => {
  if (!checkoutRequestId) return null;
  const currentConfig = config || loadMpesaConfig();
  const queryParams = new URLSearchParams({
    checkoutRequestId,
    consumerKey: currentConfig.consumerKey || '',
    consumerSecret: currentConfig.consumerSecret || '',
    passkey: currentConfig.passkey || '',
    storeNumber: currentConfig.storeNumber || currentConfig.shortcode || '1365369',
    tillNumber: currentConfig.shortcode || '1833804',
    shortcodeType: currentConfig.shortcodeType || 'till',
    environment: currentConfig.environment || 'production',
    mode: currentConfig.mode || 'live_daraja',
    amount: amount ? String(amount) : '',
  });

  try {
    // Try primary path /api/mpesa/query/:checkoutRequestId with query parameters
    let res = await fetch(`/api/mpesa/query/${encodeURIComponent(checkoutRequestId)}?${queryParams.toString()}`);
    if (!res.ok && res.status === 404) {
      // Fallback for serverless query route
      res = await fetch(`/api/mpesa/query?${queryParams.toString()}`);
    }
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('Query STK status error:', err);
  }
  return null;
};
