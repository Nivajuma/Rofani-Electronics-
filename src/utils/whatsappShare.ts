/**
 * WhatsApp Direct Link & Message Generator Utility
 * 
 * Generates dynamic https://wa.me/{phone}?text={message} URLs
 * with proper phone number sanitization, international dial codes,
 * and UTF-8 URI encoding.
 */

export interface WhatsAppProductDetails {
  itemName: string;
  price: number | string;
  currency?: string;
  originalPrice?: number | string;
  offerDetails?: string;
  sku?: string;
  storeName?: string;
  validUntil?: string;
  actionCallout?: string;
}

export interface BuildWhatsAppUrlOptions {
  phone?: string;
  defaultCountryCode?: string; // e.g. '254' for Kenya, '1' for US/Canada, '44' for UK
  message: string;
}

/**
 * Normalizes phone numbers to standard international format without '+' or spaces.
 * E.g., '0712 345 678' -> '254712345678' (if default country code is 254)
 * E.g., '+254 712-345-678' -> '254712345678'
 */
export function sanitizeWhatsAppPhone(phone?: string, defaultCountryCode = '254'): string {
  if (!phone) return '';
  
  // Remove all non-digit characters except leading plus
  let cleaned = phone.trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('0')) {
    // Replace leading local trunk zero with the default country code
    cleaned = `${defaultCountryCode}${cleaned.substring(1)}`;
  } else if (cleaned.length <= 9 && defaultCountryCode) {
    // If entered without leading 0 or country code (e.g. 712345678)
    cleaned = `${defaultCountryCode}${cleaned}`;
  }

  // Remove any remaining non-digit characters
  return cleaned.replace(/\D/g, '');
}

/**
 * 1. JavaScript logic to construct a `https://wa.me/{phone}?text={message}` link dynamically.
 * If phone is provided, targets that user directly.
 * If phone is empty/omitted, opens WhatsApp contact chooser with prefilled message.
 */
export function buildWhatsAppLink({ phone, defaultCountryCode = '254', message }: BuildWhatsAppUrlOptions): string {
  const cleanPhone = sanitizeWhatsAppPhone(phone, defaultCountryCode);
  const encodedMessage = encodeURIComponent(message.trim());

  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  }

  // Without phone: allows user to pick a chat or group in WhatsApp
  return `https://wa.me/?text=${encodedMessage}`;
}

/**
 * 2. Formats product details (Item Name, Price, Offer Details)
 * into a clean, pre-filled WhatsApp message URL encoded with encodeURIComponent().
 * Uses WhatsApp formatting (*bold*, _italic_, ~strikethrough~).
 */
export function formatProductWhatsAppMessage(
  product: WhatsAppProductDetails,
  customerName?: string
): string {
  const currency = product.currency || 'KES';
  const formattedPrice = typeof product.price === 'number' 
    ? product.price.toLocaleString() 
    : product.price;

  const lines: string[] = [];

  // Greeting
  if (customerName && customerName.trim()) {
    lines.push(`Hello *${customerName.trim()}*! 👋`);
  } else {
    lines.push(`Hello! 👋`);
  }

  if (product.storeName) {
    lines.push(`Greetings from *${product.storeName}*!`);
  }

  lines.push(''); // Empty line spacer

  // Offer header or item announcement
  if (product.offerDetails) {
    lines.push(`🔥 *SPECIAL OFFER ALERT* 🔥`);
  } else {
    lines.push(`📦 *PRODUCT DETAILS*`);
  }

  // Item name & price
  lines.push(`🛍️ *Item:* ${product.itemName}`);

  if (product.originalPrice && Number(product.originalPrice) > Number(product.price)) {
    const orig = typeof product.originalPrice === 'number' 
      ? product.originalPrice.toLocaleString() 
      : product.originalPrice;
    lines.push(`💰 *Price:* ~${currency} ${orig}~ ➡️ *${currency} ${formattedPrice}* (Save!)`);
  } else {
    lines.push(`💰 *Price:* *${currency} ${formattedPrice}*`);
  }

  if (product.sku) {
    lines.push(`🏷️ *SKU/Code:* ${product.sku}`);
  }

  // Offer details / notes
  if (product.offerDetails) {
    lines.push(`✨ *Offer Details:* ${product.offerDetails}`);
  }

  if (product.validUntil) {
    lines.push(`⏳ *Valid Until:* ${product.validUntil}`);
  }

  lines.push('');
  const actionText = product.actionCallout || 'Reply to this message or visit our store to reserve this item today!';
  lines.push(`👉 _${actionText}_`);

  return lines.join('\n');
}

/**
 * Creates the ready-to-launch WhatsApp URL directly from product parameters.
 */
export function getProductWhatsAppUrl(
  product: WhatsAppProductDetails,
  phone?: string,
  customerName?: string,
  defaultCountryCode = '254'
): string {
  const message = formatProductWhatsAppMessage(product, customerName);
  return buildWhatsAppLink({ phone, defaultCountryCode, message });
}
