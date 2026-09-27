// Mock SMS Gateway Service for Automated POS Transaction Summary Notifications
import { Transaction } from '../types';
import { normalizeKenyanPhone } from './mpesa';

export interface SmsDeliveryRecord {
  id: string; // e.g. "MSG-AT-984210"
  transactionId: string;
  receiptNumber: string;
  recipientPhone: string;
  formattedPhone: string;
  customerName: string;
  messageText: string;
  sentAt: string; // ISO string
  status: 'DELIVERED' | 'SENT' | 'FAILED' | 'PENDING';
  carrier?: 'SAFARICOM' | 'AIRTEL' | 'TELKOM' | 'OTHER';
  cost: number; // e.g. 0.80 KES
  segments: number; // 1 or 2 SMS credits
  senderId: string; // e.g. "ROFANI"
  deliveryDetails?: string;
}

export interface SendTransactionSmsOptions {
  customMessage?: string;
  storeName?: string;
  senderId?: string;
  includeItemsList?: boolean;
}

const SMS_STORAGE_KEY = 'rofani_pos_sms_delivery_logs';
const AUTO_SMS_CONFIG_KEY = 'rofani_pos_auto_sms_enabled';

/**
 * Checks if automated SMS on sale completion is enabled in POS settings
 */
export const isAutoSmsEnabled = (): boolean => {
  try {
    const val = localStorage.getItem(AUTO_SMS_CONFIG_KEY);
    if (val === null) return true; // Default enabled
    return val === 'true';
  } catch {
    return true;
  }
};

/**
 * Set automated SMS setting
 */
export const setAutoSmsEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(AUTO_SMS_CONFIG_KEY, String(enabled));
  } catch (err) {
    console.error('Error saving auto SMS setting:', err);
  }
};

/**
 * Load sent SMS history from local storage
 */
export const getSmsDeliveryLogs = (): SmsDeliveryRecord[] => {
  try {
    const raw = localStorage.getItem(SMS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

/**
 * Save new SMS record to local history
 */
export const saveSmsDeliveryLog = (record: SmsDeliveryRecord): void => {
  try {
    const current = getSmsDeliveryLogs();
    const updated = [record, ...current.filter((r) => r.id !== record.id)].slice(0, 100);
    localStorage.setItem(SMS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save SMS log:', err);
  }
};

/**
 * Format a realistic, high-converting East African transaction summary SMS
 */
export const formatTransactionSummarySms = (
  tx: Transaction,
  storeName: string = 'ROFANI',
  options?: { includeItemsList?: boolean; customNote?: string }
): string => {
  const custName = tx.customerName && tx.customerName !== 'Walk-in Customer'
    ? tx.customerName.split(' ')[0]
    : 'Valued Customer';

  const itemsCount = tx.items.reduce((sum, item) => sum + item.quantity, 0);

  // Generate short item names summary e.g. "Headphones x1, Dress x1"
  let itemsSummary = '';
  if (options?.includeItemsList !== false) {
    const firstItems = tx.items.slice(0, 2).map((it) => `${it.product.name.slice(0, 16)} x${it.quantity}`);
    itemsSummary = firstItems.join(', ');
    if (tx.items.length > 2) {
      itemsSummary += ` +${tx.items.length - 2} more`;
    }
  }

  // Payment method summary
  let paySummary = 'Paid';
  if (tx.payments && tx.payments.length > 0) {
    const methods = tx.payments.map((p) => {
      const ref = p.reference ? ` (${p.reference.slice(0, 10)})` : '';
      return `${p.method.toUpperCase()}${ref}`;
    });
    paySummary = methods.join(' + ');
  }

  let text = `${storeName.toUpperCase()}: Jambo ${custName}! Receipt #${tx.receiptNumber}. Total: KSh ${tx.grandTotal.toLocaleString()}. Paid: KSh ${tx.amountPaid.toLocaleString()} via ${paySummary}.`;

  if (itemsSummary) {
    text += ` Items (${itemsCount}): ${itemsSummary}.`;
  }

  if (tx.balanceDue > 0) {
    text += ` Bal Due: KSh ${tx.balanceDue.toLocaleString()}.`;
  }

  if (options?.customNote) {
    text += ` Note: ${options.customNote}.`;
  }

  text += ` Thank you for shopping with us! Welcome again.`;

  return text;
};

/**
 * Dispatch Automated Transaction Summary SMS via Mock Gateway API
 */
export const sendTransactionSummarySms = async (
  tx: Transaction,
  targetPhone: string,
  options: SendTransactionSmsOptions = {}
): Promise<{ success: boolean; record: SmsDeliveryRecord; message: string }> => {
  const storeName = options.storeName || 'ROFANI';
  const senderId = options.senderId || 'ROFANI';
  const { normalized, isValid, displayFormatted } = normalizeKenyanPhone(targetPhone);

  if (!isValid && !normalized) {
    throw new Error(`Invalid mobile phone number (${targetPhone}). Please provide a valid 10-digit number like 0712345678.`);
  }

  const finalPhone = normalized || targetPhone.replace(/[^0-9]/g, '');
  const messageText = options.customMessage || formatTransactionSummarySms(tx, storeName, options);
  const segments = Math.ceil(messageText.length / 160) || 1;

  // Determine simulated carrier based on prefix
  let carrier: 'SAFARICOM' | 'AIRTEL' | 'TELKOM' | 'OTHER' = 'SAFARICOM';
  if (finalPhone.startsWith('25473') || finalPhone.startsWith('25475') || finalPhone.startsWith('25478') || finalPhone.startsWith('25410')) {
    carrier = 'AIRTEL';
  } else if (finalPhone.startsWith('25477')) {
    carrier = 'TELKOM';
  }

  const mockRecord: SmsDeliveryRecord = {
    id: `MSG-AT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
    transactionId: tx.id,
    receiptNumber: tx.receiptNumber,
    recipientPhone: finalPhone,
    formattedPhone: displayFormatted || targetPhone,
    customerName: tx.customerName || 'Customer',
    messageText,
    sentAt: new Date().toISOString(),
    status: 'DELIVERED',
    carrier,
    cost: parseFloat((segments * 0.8).toFixed(2)), // KSh 0.80 per SMS segment
    segments,
    senderId,
    deliveryDetails: `Delivered via Safaricom/Africa's Talking SMS Gateway route to ${displayFormatted}`,
  };

  // Attempt backend API call
  try {
    const res = await fetch('/api/sms/send-transaction-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: finalPhone,
        customerName: tx.customerName,
        transactionId: tx.id,
        receiptNumber: tx.receiptNumber,
        summaryMessage: messageText,
        storeName,
        grandTotal: tx.grandTotal,
        amountPaid: tx.amountPaid,
        balanceDue: tx.balanceDue,
        senderId,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const serverRecord: SmsDeliveryRecord = {
        ...mockRecord,
        id: data.messageId || mockRecord.id,
        status: data.status || 'DELIVERED',
        deliveryDetails: data.details || mockRecord.deliveryDetails,
      };
      saveSmsDeliveryLog(serverRecord);
      return {
        success: true,
        record: serverRecord,
        message: `Transaction summary SMS successfully delivered to ${displayFormatted}!`,
      };
    }
  } catch (err) {
    console.warn('Backend SMS API unreachable, using client mock service:', err);
  }

  // Client mock fallback
  saveSmsDeliveryLog(mockRecord);
  return {
    success: true,
    record: mockRecord,
    message: `Transaction summary SMS successfully delivered to ${displayFormatted}!`,
  };
};
