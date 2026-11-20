import { safeGetJSON } from './safeStorage';

export const ROFANI_MASTER_KRA_PIN = 'A003466239X';

export const SUPPORT_WHATSAPP_NUMBER = '+254 734 128 888';
export const SUPPORT_WHATSAPP_TEL = '+254734128888';
export const SUPPORT_WHATSAPP_URL =
  'https://wa.me/254734128888?text=Hello%20Rofani%20POS%20Support%2C%20I%20need%20assistance';

export const SUPPORT_PHONE_PRIMARY = '+254 734 128 888';
export const SUPPORT_PHONE_PRIMARY_HREF = 'tel:+254734128888';

export const SUPPORT_PHONE_SECONDARY = '+254 713 128 888';
export const SUPPORT_PHONE_SECONDARY_HREF = 'tel:+254713128888';

export const SUPPORT_EMAIL = 'rofanipos@gmail.com';
export const SUPPORT_EMAIL_HREF = 'mailto:rofanipos@gmail.com';

/**
 * Resolves the active client shop's own KRA PIN for retail/wholesale receipts.
 * Keeps each client store's KRA PIN independent under stores/{storeId} without
 * overwriting client shop receipts with Rofani POS's master SaaS PIN.
 */
export function resolveActiveStoreKraPin(storeProfileKraPin?: string): string {
  const fromProfile = (storeProfileKraPin || '').trim().toUpperCase();
  if (fromProfile) return fromProfile;

  const fromTaxSettings = safeGetJSON<{ kraPinNumber?: string }>('printAndTaxSettings', {});
  const fromPrintTax = (fromTaxSettings?.kraPinNumber || '').trim().toUpperCase();
  if (fromPrintTax) return fromPrintTax;

  const fromLocal = safeGetJSON<string>('retail_pos_kra_pin', '');
  if (fromLocal && fromLocal.trim()) return fromLocal.trim().toUpperCase();

  return '';
}
