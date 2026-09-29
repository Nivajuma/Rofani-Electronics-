/**
 * Utility for accessing mobile device phone book contacts via the Contact Picker API
 * and parsing vCard (.vcf) exports from Android / iPhone / Google Contacts.
 */

import { Customer, Supplier } from '../types';

export interface PickedContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  company?: string;
  notes?: string;
}

let _contactPickerBlockedCached = false;

export const markContactPickerBlocked = () => {
  _contactPickerBlockedCached = true;
};

/**
 * Check if running inside an embedded iframe or webview container.
 * The Web Contact Picker API is restricted by Chromium to top-level frames only.
 */
export const isRunningInIframe = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (_contactPickerBlockedCached) return true;
  try {
    if (window.self !== window.top) return true;
    if (window.parent !== window.self) return true;
    if (window.frameElement !== null) return true;
    const loc = window.location as any;
    if (loc && loc.ancestorOrigins && loc.ancestorOrigins.length > 0) {
      return true;
    }
  } catch {
    // Cross-origin iframe throws on window.top or parent access
    return true;
  }
  return false;
};

/**
 * Check if running inside top-level window/tab (not an embedded iframe).
 */
export const isTopFrame = (): boolean => {
  return !isRunningInIframe();
};

/**
 * Check if the Web Contact Picker API is supported in the current browser/device.
 * Native Contact Picker is supported in Chrome Android, Samsung Internet, Edge Android
 * AND requires execution in the top frame.
 */
export const isContactPickerSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'contacts' in navigator &&
    'ContactsManager' in window &&
    typeof (navigator as any).contacts?.select === 'function' &&
    !isRunningInIframe()
  );
};

/**
 * Clean and standardize phone numbers
 */
export const cleanPhoneNumber = (raw: string): string => {
  if (!raw) return '';
  // Remove non-numeric characters except leading +
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (hasPlus) {
    return `+${digitsOnly}`;
  }

  // Format Kenyan numbers if they start with 07 or 01
  if (digitsOnly.length === 10 && (digitsOnly.startsWith('07') || digitsOnly.startsWith('01'))) {
    return `+254 ${digitsOnly.slice(1, 4)} ${digitsOnly.slice(4)}`;
  }

  return trimmed;
};

/**
 * Launch the native device phone book contact picker.
 * Allows user to pick single or multiple contacts from their phone.
 */
export const pickFromDevicePhonebook = async (multiple: boolean = true): Promise<PickedContact[]> => {
  if (isRunningInIframe()) {
    markContactPickerBlocked();
    throw new Error(
      'Notice: Browser security policy restricts direct address book popups inside embedded web frames. Please use the .vcf / .csv contacts file upload or paste contacts text.'
    );
  }

  if (!isContactPickerSupported()) {
    throw new Error(
      'Contact Picker API is not supported in this browser context. Please use the .vcf / .csv contacts file upload or paste contacts text.'
    );
  }

  try {
    const navContacts = (navigator as any).contacts;
    const propsToQuery = ['name', 'tel', 'email', 'address'];

    // Query supported properties if possible
    let availableProps = propsToQuery;
    if (typeof navContacts.getProperties === 'function') {
      try {
        const supported = await navContacts.getProperties();
        availableProps = propsToQuery.filter((p) => supported.includes(p));
      } catch {
        availableProps = ['name', 'tel'];
      }
    }

    const results = await navContacts.select(availableProps, { multiple });

    if (!Array.isArray(results) || results.length === 0) {
      return [];
    }

    return results.map((item: any, idx: number) => {
      const rawName = Array.isArray(item.name) ? item.name[0] : item.name || 'Unnamed Contact';
      const rawTel = Array.isArray(item.tel) ? item.tel[0] : item.tel || '';
      const rawEmail = Array.isArray(item.email) ? item.email[0] : item.email || '';
      const rawAddress = Array.isArray(item.address)
        ? typeof item.address[0] === 'object'
          ? [item.address[0].addressLine, item.address[0].city].filter(Boolean).join(', ')
          : String(item.address[0])
        : '';

      return {
        id: `phone-contact-${Date.now()}-${idx}`,
        name: rawName.trim(),
        phone: cleanPhoneNumber(rawTel) || 'N/A',
        email: rawEmail.trim() || undefined,
        address: rawAddress.trim() || undefined,
      };
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      // User cancelled the contact picker
      return [];
    }
    if (
      err.name === 'SecurityError' ||
      (err.message && (
        err.message.toLowerCase().includes('top frame') ||
        err.message.toLowerCase().includes('contactsmanager') ||
        err.message.toLowerCase().includes('select')
      ))
    ) {
      markContactPickerBlocked();
      throw new Error(
        'Notice: Browser security policy restricts direct address book popups inside embedded web frames. Please use the .vcf / .csv contacts file upload or paste contacts text.'
      );
    }
    throw err;
  }
};

/**
 * Parse vCard (.vcf) text format into structured contacts.
 * Compatible with vCard versions 2.1, 3.0, and 4.0 exported from iPhone / Android / Google Contacts.
 */
export const parseVCardText = (vcfText: string): PickedContact[] => {
  const contacts: PickedContact[] = [];
  if (!vcfText || !vcfText.includes('BEGIN:VCARD')) {
    return contacts;
  }

  // Split into individual vCard cards
  const cards = vcfText.split(/BEGIN:VCARD/i).filter((c) => c.trim().length > 0);

  cards.forEach((card, idx) => {
    const lines = card.split(/\r\n|\r|\n/);
    let name = '';
    let phone = '';
    let email = '';
    let address = '';
    let org = '';
    let note = '';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      // Handle folded lines in vCard (lines starting with space or tab)
      while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
        i++;
        line += lines[i].trim();
      }

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const keyPart = line.slice(0, colonIdx).toUpperCase();
      const valPart = line.slice(colonIdx + 1).trim();

      if (keyPart === 'FN' || keyPart.startsWith('FN;')) {
        name = valPart;
      } else if (!name && (keyPart === 'N' || keyPart.startsWith('N;'))) {
        // N:Last;First;Middle;Prefix;Suffix
        const parts = valPart.split(';').map((p) => p.trim()).filter(Boolean);
        if (parts.length > 0) {
          name = parts.reverse().join(' ');
        }
      } else if (keyPart === 'TEL' || keyPart.startsWith('TEL;') || keyPart.startsWith('TEL:')) {
        if (!phone) {
          phone = cleanPhoneNumber(valPart);
        }
      } else if (keyPart === 'EMAIL' || keyPart.startsWith('EMAIL;')) {
        if (!email) {
          email = valPart;
        }
      } else if (keyPart === 'ADR' || keyPart.startsWith('ADR;')) {
        // ADR:;;Street;City;Region;PostCode;Country
        const parts = valPart.split(';').map((p) => p.trim()).filter(Boolean);
        if (parts.length > 0 && !address) {
          address = parts.join(', ');
        }
      } else if (keyPart === 'ORG' || keyPart.startsWith('ORG;')) {
        org = valPart.split(';')[0]?.trim() || '';
      } else if (keyPart === 'NOTE' || keyPart.startsWith('NOTE;')) {
        note = valPart;
      }
    }

    if (name.trim() || phone.trim()) {
      contacts.push({
        id: `vcf-${Date.now()}-${idx}`,
        name: (name.trim() || org.trim() || `Contact ${idx + 1}`).replace(/\\,/g, ',').replace(/\\;/g, ';'),
        phone: phone.trim() || 'N/A',
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        company: org.trim() || undefined,
        notes: note.trim() || undefined,
      });
    }
  });

  return contacts;
};

/**
 * Parse simple text with names and phone numbers
 * e.g. "John Doe 0712345678" or "Jane Doe, +254722123456, jane@gmail.com"
 */
export const parseRawTextContacts = (text: string): PickedContact[] => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const contacts: PickedContact[] = [];

  lines.forEach((line, idx) => {
    // Check if line contains CSV / tab / comma
    if (line.includes(',') || line.includes('\t') || line.includes(';')) {
      const parts = line.split(/[,;\t]/).map((p) => p.trim().replace(/^"|"$/g, ''));
      if (parts[0]) {
        contacts.push({
          id: `raw-${Date.now()}-${idx}`,
          name: parts[0],
          phone: cleanPhoneNumber(parts[1] || '') || 'N/A',
          email: parts[2] && parts[2].includes('@') ? parts[2] : undefined,
          address: parts[3] || undefined,
        });
      }
    } else {
      // Regex match phone number inside text
      const phoneRegex = /(?:\+?254|0)[17]\d{8}|\+?\d{8,15}/;
      const match = line.match(phoneRegex);
      if (match) {
        const phone = cleanPhoneNumber(match[0]);
        const name = line.replace(match[0], '').replace(/[-–—:]/g, '').trim() || `Contact ${idx + 1}`;
        contacts.push({
          id: `raw-${Date.now()}-${idx}`,
          name,
          phone,
        });
      } else {
        contacts.push({
          id: `raw-${Date.now()}-${idx}`,
          name: line.trim(),
          phone: 'N/A',
        });
      }
    }
  });

  return contacts;
};

/**
 * Parse CSV format exported from Google Contacts, Excel, or mobile phones.
 */
export const parseCsvContacts = (csvText: string): PickedContact[] => {
  if (!csvText || !csvText.trim()) return [];
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Parse CSV line taking quotes into account
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === ',' || char === ';' || char === '\t') && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  // Find indices for name, phone, email, address, company
  let nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('displayname') || h.includes('fullname'));
  const firstNameIdx = headers.findIndex((h) => h.includes('firstname') || h.includes('givenname'));
  const lastNameIdx = headers.findIndex((h) => h.includes('lastname') || h.includes('familyname'));
  const phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('tel') || h.includes('mobile'));
  const emailIdx = headers.findIndex((h) => h.includes('mail'));
  const addressIdx = headers.findIndex((h) => h.includes('address') || h.includes('location') || h.includes('city'));
  const orgIdx = headers.findIndex((h) => h.includes('org') || h.includes('company') || h.includes('business'));

  // If no identifiable headers matched, treat as raw lines
  if (nameIdx === -1 && phoneIdx === -1 && firstNameIdx === -1) {
    return parseRawTextContacts(csvText);
  }

  const contacts: PickedContact[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.length === 0 || cols.every((c) => !c)) continue;

    let name = '';
    if (nameIdx !== -1 && cols[nameIdx]) {
      name = cols[nameIdx];
    } else if (firstNameIdx !== -1 || lastNameIdx !== -1) {
      name = [cols[firstNameIdx] || '', cols[lastNameIdx] || ''].filter(Boolean).join(' ');
    }
    if (!name) name = `Contact ${i}`;

    const phone = phoneIdx !== -1 && cols[phoneIdx] ? cleanPhoneNumber(cols[phoneIdx]) : 'N/A';
    const email = emailIdx !== -1 && cols[emailIdx] ? cols[emailIdx] : undefined;
    const address = addressIdx !== -1 && cols[addressIdx] ? cols[addressIdx] : undefined;
    const company = orgIdx !== -1 && cols[orgIdx] ? cols[orgIdx] : undefined;

    contacts.push({
      id: `csv-contact-${Date.now()}-${i}`,
      name: name.trim(),
      phone,
      email,
      address,
      company,
    });
  }
  return contacts;
};

/**
 * Universal contact file parser supporting .vcf (vCard), .csv (Google/Excel), and raw text.
 */
export const parseContactFile = (content: string): PickedContact[] => {
  const trimmed = (content || '').trim();
  if (trimmed.includes('BEGIN:VCARD')) {
    return parseVCardText(trimmed);
  }
  if (trimmed.includes(',') || trimmed.includes(';') || trimmed.includes('\t')) {
    const csvParsed = parseCsvContacts(trimmed);
    if (csvParsed.length > 0) return csvParsed;
  }
  return parseRawTextContacts(trimmed);
};

/**
 * Convert PickedContact[] to Customer[]
 */
export const convertToCustomers = (
  contacts: PickedContact[],
  customerType: Customer['customerType'] = 'Individual',
  defaultCreditLimit?: number
): Customer[] => {
  const today = new Date().toISOString().slice(0, 10);
  return contacts.map((c, idx) => ({
    id: `cust-phone-${Date.now()}-${idx}`,
    name: c.name,
    phone: c.phone || 'N/A',
    email: c.email,
    address: c.address,
    customerType,
    creditLimit: defaultCreditLimit,
    totalPurchases: 0,
    currentBalanceDue: 0,
    notes: c.notes ? `${c.notes} • Imported from Phone Book` : 'Imported from Phone Book Contacts',
    createdAt: today,
    updatedAt: today,
  }));
};

/**
 * Convert PickedContact[] to Supplier[]
 */
export const convertToSuppliers = (
  contacts: PickedContact[],
  categorySpecialty: string = 'General Merchandise',
  paymentTerms: string = 'Net 30 Days'
): Supplier[] => {
  const today = new Date().toISOString().slice(0, 10);
  return contacts.map((c, idx) => ({
    id: `sup-phone-${Date.now()}-${idx}`,
    name: c.company || c.name,
    contactPerson: c.company ? c.name : 'Account Manager',
    phone: c.phone || 'N/A',
    email: c.email || 'orders@vendor.co.ke',
    address: c.address || 'Nairobi, Kenya',
    categorySpecialty,
    paymentTerms,
    totalSuppliedValue: 0,
    currentBalanceDue: 0,
    notes: c.notes ? `${c.notes} • Imported from Phone Book` : 'Imported from Phone Book Contacts',
    createdAt: today,
    updatedAt: today,
  }));
};
