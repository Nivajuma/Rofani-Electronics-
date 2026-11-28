import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { safeGetJSON, safeSetJSON } from './safeStorage';

export type AppLanguageCode =
  | 'en'
  | 'sw'
  | 'fr'
  | 'ar'
  | 'pt'
  | 'es'
  | 'de'
  | 'zh'
  | 'hi';

export interface LanguageOption {
  code: AppLanguageCode;
  label: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'sw', label: 'Kiswahili', nativeName: 'Kiswahili', dir: 'ltr' },
  { code: 'fr', label: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'pt', label: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  { code: 'es', label: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'de', label: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'zh', label: 'Chinese', nativeName: '中文', dir: 'ltr' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
];

export const DEFAULT_APP_LANGUAGE: AppLanguageCode = 'en';
export const STORE_LANGUAGE_EVENT = 'rofani:store-language-updated';

export function normalizeLanguageCode(raw: unknown): AppLanguageCode {
  if (typeof raw !== 'string') return DEFAULT_APP_LANGUAGE;
  const val = raw.trim().toLowerCase();
  if (val === 'en' || val === 'english') return 'en';
  if (val === 'sw' || val === 'swahili' || val === 'kiswahili') return 'sw';
  if (val === 'fr' || val === 'french' || val === 'français' || val === 'francais') return 'fr';
  if (val === 'ar' || val === 'arabic' || val === 'العربية') return 'ar';
  if (val === 'pt' || val === 'portuguese' || val === 'português' || val === 'portugues') return 'pt';
  if (val === 'es' || val === 'spanish' || val === 'español' || val === 'espanol') return 'es';
  if (val === 'de' || val === 'german' || val === 'deutsch') return 'de';
  if (val === 'zh' || val === 'chinese' || val === '中文') return 'zh';
  if (val === 'hi' || val === 'hindi' || val === 'हिन्दी') return 'hi';
  return DEFAULT_APP_LANGUAGE;
}

export function getLanguageConfig(code: AppLanguageCode): LanguageOption {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) || SUPPORTED_LANGUAGES[0];
}

export function getStoreLanguageStorageKey(storeId?: string): string {
  const cleanStore = (storeId || 'default').trim() || 'default';
  return `rofani_store_language_${cleanStore}`;
}

export function loadStoreLanguageLocal(storeId?: string): AppLanguageCode {
  const key = getStoreLanguageStorageKey(storeId);
  const stored = safeGetJSON<string>(key, '');
  if (stored) {
    return normalizeLanguageCode(stored);
  }
  return DEFAULT_APP_LANGUAGE;
}

export function saveStoreLanguageLocal(
  language: AppLanguageCode,
  storeId?: string
): AppLanguageCode {
  const normalized = normalizeLanguageCode(language);
  const key = getStoreLanguageStorageKey(storeId);
  safeSetJSON(key, normalized);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(STORE_LANGUAGE_EVENT, {
        detail: { storeId: storeId || 'default', language: normalized },
      })
    );
  }
  return normalized;
}

const EN_DICT = {
  // Bottom Nav & Core Navigation
  'nav.home': 'HOME',
  'nav.dashboard': 'DASHBOARD',
  'nav.items': 'ITEMS',
  'nav.menu': 'MENU',
  'nav.mobileView': 'MOBILE VIEW',
  'nav.desktopView': 'DESKTOP VIEW',
  'nav.back': 'Back',
  'nav.close': 'Close',
  'nav.settings': 'Settings',

  // Header & Sidebar
  'header.sell': 'Sell',
  'header.newSale': 'New Sale',
  'header.todaysSales': "Today's Sales",
  'header.grossProfitMargin': 'Gross Profit Margin',
  'header.lowStockAlert': 'Low Stock Alert',
  'header.stockAlerts': 'Stock Alerts',
  'sidebar.pos': 'Point of Sale',
  'sidebar.inventory': 'Inventory Control',
  'sidebar.purchasing': 'Purchasing & POs',
  'sidebar.stocktake': 'Physical Audit',
  'sidebar.contacts': 'Contacts & CRM',
  'sidebar.cashInOut': 'Cash In & Out',
  'sidebar.expenses': 'Expense Manager',
  'sidebar.workersLoans': 'Workers & Loans',
  'sidebar.reports': 'Reports Central',
  'sidebar.auditTrail': 'Audit Trail',
  'sidebar.onlineStore': 'Online E-Store',
  'sidebar.ordersDeals': 'Orders & Deals',
  'sidebar.multiStore': 'Multi-Store Outlets',
  'sidebar.dataSettings': 'Data & Store Settings',

  // Sub-page Titles
  'subpage.inventory': 'Stock & Inventory',
  'subpage.purchasing': 'Suppliers & Orders',
  'subpage.stocktake': 'Stock Audit',
  'subpage.contacts': 'Customers & Suppliers',
  'subpage.cashmanagement': 'Cash In & Out',
  'subpage.expenses': 'Expenses',
  'subpage.attendance': 'Staff & Attendance',
  'subpage.reports': 'Reports & Analytics',
  'subpage.auditlogs': 'Audit Logs',
  'subpage.settings': 'Store Settings',
  'subpage.about': 'About Rofani POS',

  // POS & Checkout
  'pos.cash': 'Cash',
  'pos.mpesa': 'M-Pesa',
  'pos.mpesaPush': 'M-Pesa Push',
  'pos.mpesaStkPush': 'M-Pesa STK Push',
  'pos.creditCard': 'Credit Card',
  'pos.cheque': 'Cheque',
  'pos.bankTransfer': 'Mobile Bank Transfer',
  'pos.total': 'Total',
  'pos.grandTotal': 'Grand Total',
  'pos.totalBillAmount': 'Total Bill Amount',
  'pos.totalPaidNow': 'Total Paid Now',
  'pos.change': 'Change',
  'pos.changeToReturn': 'Change to Return to Customer',
  'pos.remainingBalance': 'Remaining Balance (Added to Customer Credit)',
  'pos.fullyPaid': 'Fully Paid',
  'pos.completeSale': 'Complete Sale',
  'pos.saveSale': 'Save Sale',
  'pos.printReceipt': 'Print Receipt',
  'pos.completeSaleAndPrint': 'Complete Sale & Print',
  'pos.completePayment': 'Complete Payment',
  'pos.paymentBreakdown': 'Payment Breakdown',
  'pos.addSplitMethod': 'Add Split Method',
  'pos.cancel': 'Cancel',
  'pos.customer': 'Customer',
  'pos.salesRep': 'Sales Rep',
  'pos.status': 'Status',
  'pos.offlineMode': 'Offline Mode (Syncs upon reconnect)',
  'pos.searchPlaceholder': 'Scan barcode or search items...',
  'pos.subtotal': 'Subtotal',
  'pos.discount': 'Discount',

  // Stock / Expenses / Reports Headings
  'inventory.heading': 'Stock & Inventory Catalog',
  'inventory.addNewItem': 'Add New Item',
  'inventory.addNewInventoryItem': 'Add New Inventory Item',
  'inventory.editItemDetails': 'Edit Item Details',
  'expenses.heading': 'Store Expense Management',
  'expenses.subtitle': 'Log utilities, rent, transport, salaries, and operating overheads for P&L net profit accounting',
  'expenses.addExpense': 'Record Expense',
  'reports.heading': 'Reports & Business Analytics',
  'reports.subtitle': 'Rofani POS • Tap any report to view specialized views',
  'reports.salesSummary': 'Daily Sales & Revenue Summary',
  'reports.purchaseReport': 'Purchase Report',
  'reports.grossProfit': 'Gross Profit',
  'reports.transactionsCount': 'Transactions Count',

  // Settings & Language Selector
  'settings.title': 'Store Settings & Preferences',
  'settings.subtitle': 'Configure Rofani POS preferences, language, business type, tax defaults, and POS terminals',
  'settings.languageLabel': 'Language / Lugha',
  'settings.languageHint': 'Choose display language for navigation, checkout, stock, reports, and AI Co-Pilot',
  'settings.generalTitle': 'General',
  'settings.itemSettingsTitle': 'Item / Inventory Defaults',
  'settings.shopControlsTitle': 'Shop Controls, Protection & Summary',
  'settings.businessTypeTitle': 'Business Type & Starter Setup',
  'settings.savedNotice': 'Store language updated!',
  'onboarding.languageLabel': 'Language / Lugha',
  'onboarding.setupTitle': 'Set Up Your Private Store',

  // Menu & AI Co-Pilot
  'menu.title': 'Menu & Tools',
  'ai.title': 'ROFANI AI Co-Pilot',
  'ai.subtitle': 'Instant POS steps, stock alerts & profit guidance',
  'ai.answering': 'AI Co-Pilot is answering...',
  'ai.askPlaceholder': 'Ask anything...',
  'ai.send': 'Send',
  'ai.topics': 'Topics',
} as const;

export type TranslationKey = keyof typeof EN_DICT;

export const TRANSLATIONS: Record<AppLanguageCode, Partial<Record<TranslationKey, string>>> = {
  en: EN_DICT,

  sw: {
    'nav.home': 'NYUMBANI',
    'nav.dashboard': 'DASHIBODI',
    'nav.items': 'BIDHAA',
    'nav.menu': 'MENYU',
    'nav.mobileView': 'SIMU',
    'nav.desktopView': 'KOMPYUTA',
    'nav.back': 'Rudi',
    'nav.close': 'Funga',
    'nav.settings': 'Mipangilio',

    'header.sell': 'Uza',
    'header.newSale': 'Mauzo Mapya',
    'header.todaysSales': 'Mauzo ya Leo',
    'header.grossProfitMargin': 'Faida ya Jumla',
    'header.lowStockAlert': 'Tahadhari ya Stoo',
    'header.stockAlerts': 'Tahadhari za Stoo',
    'sidebar.pos': 'Sehemu ya Mauzo (POS)',
    'sidebar.inventory': 'Usimamizi wa Stoo',
    'sidebar.purchasing': 'Manunuzi na PO',
    'sidebar.stocktake': 'Ukaguzi wa Stoo',
    'sidebar.contacts': 'Wateja na Wasambazaji',
    'sidebar.cashInOut': 'Fedha Ndani/Nje',
    'sidebar.expenses': 'Matumizi ya Duka',
    'sidebar.workersLoans': 'Wafanyakazi na Mikopo',
    'sidebar.reports': 'Kituo cha Ripoti',
    'sidebar.auditTrail': 'Kumbukumbu ya Ukaguzi',
    'sidebar.onlineStore': 'Duka la Mtandaoni',
    'sidebar.ordersDeals': 'Oda na Ofa',
    'sidebar.multiStore': 'Matawi Mengi',
    'sidebar.dataSettings': 'Data na Mipangilio',

    'subpage.inventory': 'Stoo na Bidhaa',
    'subpage.purchasing': 'Wasambazaji na Oda',
    'subpage.stocktake': 'Ukaguzi wa Stoo',
    'subpage.contacts': 'Wateja na Wasambazaji',
    'subpage.cashmanagement': 'Fedha Ndani na Nje',
    'subpage.expenses': 'Matumizi',
    'subpage.attendance': 'Wafanyakazi na Mahudhurio',
    'subpage.reports': 'Ripoti na Uchambuzi',
    'subpage.auditlogs': 'Kumbukumbu za Ukaguzi',
    'subpage.settings': 'Mipangilio ya Duka',
    'subpage.about': 'Kuhusu Rofani POS',

    'pos.cash': 'Taslimu (Cash)',
    'pos.mpesa': 'M-Pesa',
    'pos.mpesaPush': 'Tuma M-Pesa',
    'pos.mpesaStkPush': 'M-Pesa STK Push',
    'pos.creditCard': 'Kadi ya Benki',
    'pos.cheque': 'Hundi',
    'pos.bankTransfer': 'Benki ya Simu',
    'pos.total': 'Jumla',
    'pos.grandTotal': 'Jumla Kuu',
    'pos.totalBillAmount': 'Jumla ya Bili',
    'pos.totalPaidNow': 'Kiasi Kilicholipwa Sasa',
    'pos.change': 'Chenji',
    'pos.changeToReturn': 'Chenji ya Kurudishia Mteja',
    'pos.remainingBalance': 'Salio Lililobaki (Deni la Mteja)',
    'pos.fullyPaid': 'Imelipwa Kamili',
    'pos.completeSale': 'Kamilisha Mauzo',
    'pos.saveSale': 'Hifadhi Mauzo',
    'pos.printReceipt': 'Chapa Risiti',
    'pos.completeSaleAndPrint': 'Kamilisha na Chapa Risiti',
    'pos.completePayment': 'Kamilisha Malipo',
    'pos.paymentBreakdown': 'Mchanganuo wa Malipo',
    'pos.addSplitMethod': 'Ongeza Njia Nyingine',
    'pos.cancel': 'Ghairi',
    'pos.customer': 'Mteja',
    'pos.salesRep': 'Muuzaji',
    'pos.status': 'Hali',
    'pos.offlineMode': 'Hali ya Nje ya Mtandao (Itasawazishwa mtandao ukirudi)',
    'pos.searchPlaceholder': 'Skani msimbo pau au tafuta bidhaa...',
    'pos.subtotal': 'Jumla Ndogo',
    'pos.discount': 'Punguzo',

    'inventory.heading': 'Orodha ya Stoo na Bidhaa',
    'inventory.addNewItem': 'Ongeza Bidhaa Mpya',
    'inventory.addNewInventoryItem': 'Ongeza Bidhaa Mpya ya Stoo',
    'inventory.editItemDetails': 'Hariri Maelezo ya Bidhaa',
    'expenses.heading': 'Usimamizi wa Matumizi ya Duka',
    'expenses.subtitle': 'Rekodi umeme, kodi, usafiri, mishahara na gharama za uendeshaji kwa mahesabu ya faida halisi',
    'expenses.addExpense': 'Rekodi Matumizi',
    'reports.heading': 'Ripoti na Uchambuzi wa Biashara',
    'reports.subtitle': 'Rofani POS • Gusa ripoti yoyote kuona maelezo ya kina',
    'reports.salesSummary': 'Muhtasari wa Mauzo na Mapato ya Kila Siku',
    'reports.purchaseReport': 'Ripoti ya Manunuzi',
    'reports.grossProfit': 'Faida ya Jumla',
    'reports.transactionsCount': 'Idadi ya Miamala',

    'settings.title': 'Mipangilio na Mapendeleo ya Duka',
    'settings.subtitle': 'Sanidi lugha ya Rofani POS, aina ya biashara, kodi na vituo vya mauzo',
    'settings.languageLabel': 'Language / Lugha',
    'settings.languageHint': 'Chagua lugha ya kuonyesha kwenye menyu, malipo, stoo, ripoti na AI Co-Pilot',
    'settings.generalTitle': 'Mipangilio ya Jumla',
    'settings.itemSettingsTitle': 'Mipangilio ya Bidhaa na Stoo',
    'settings.shopControlsTitle': 'Udhibiti wa Duka na Ulinzi',
    'settings.businessTypeTitle': 'Aina ya Biashara na Mpangilio wa Awali',
    'settings.savedNotice': 'Lugha ya duka imesasishwa!',
    'onboarding.languageLabel': 'Lugha ya Duka / Language',
    'onboarding.setupTitle': 'Anzisha Duka Lako Binafsi',

    'menu.title': 'Menyu na Zana',
    'ai.title': 'ROFANI AI Co-Pilot',
    'ai.subtitle': 'Maelekezo ya haraka ya POS, tahadhari za stoo na ushauri wa faida',
    'ai.answering': 'AI Co-Pilot inajibu...',
    'ai.askPlaceholder': 'Uliza chochote...',
    'ai.send': 'Tuma',
    'ai.topics': 'Mada',
  },

  fr: {
    'nav.home': 'ACCUEIL',
    'nav.dashboard': 'TABLEAU',
    'nav.items': 'ARTICLES',
    'nav.menu': 'MENU',
    'nav.mobileView': 'MOBILE',
    'nav.desktopView': 'BUREAU',
    'nav.back': 'Retour',
    'nav.close': 'Fermer',
    'nav.settings': 'Paramètres',

    'header.sell': 'Vendre',
    'header.newSale': 'Nouvelle vente',
    'header.todaysSales': 'Ventes du jour',
    'header.grossProfitMargin': 'Marge bénéficiaire',
    'header.lowStockAlert': 'Stock faible',
    'header.stockAlerts': 'Alertes stock',
    'sidebar.pos': 'Point de vente',
    'sidebar.inventory': 'Gestion des stocks',
    'sidebar.purchasing': 'Achats & Commandes',
    'sidebar.stocktake': 'Inventaire physique',
    'sidebar.contacts': 'Clients & Fournisseurs',
    'sidebar.cashInOut': 'Caisse Entrées/Sorties',
    'sidebar.expenses': 'Dépenses',
    'sidebar.workersLoans': 'Personnel & Prêts',
    'sidebar.reports': 'Centre de rapports',
    'sidebar.auditTrail': "Journal d'audit",
    'sidebar.onlineStore': 'Boutique en ligne',
    'sidebar.ordersDeals': 'Commandes & Offres',
    'sidebar.multiStore': 'Multi-Boutiques',
    'sidebar.dataSettings': 'Données & Paramètres',

    'subpage.inventory': 'Stock & Inventaire',
    'subpage.purchasing': 'Fournisseurs & Commandes',
    'subpage.stocktake': 'Audit de stock',
    'subpage.contacts': 'Clients & Fournisseurs',
    'subpage.cashmanagement': 'Entrées & Sorties Caisse',
    'subpage.expenses': 'Dépenses',
    'subpage.attendance': 'Personnel & Présence',
    'subpage.reports': 'Rapports & Analyses',
    'subpage.auditlogs': "Journaux d'audit",
    'subpage.settings': 'Paramètres boutique',
    'subpage.about': 'À propos de Rofani POS',

    'pos.cash': 'Espèces',
    'pos.mpesa': 'M-Pesa',
    'pos.mpesaPush': 'M-Pesa Push',
    'pos.mpesaStkPush': 'M-Pesa STK Push',
    'pos.creditCard': 'Carte bancaire',
    'pos.cheque': 'Chèque',
    'pos.bankTransfer': 'Virement mobile',
    'pos.total': 'Total',
    'pos.grandTotal': 'Total général',
    'pos.totalBillAmount': 'Montant total facture',
    'pos.totalPaidNow': 'Montant payé',
    'pos.change': 'Monnaie',
    'pos.changeToReturn': 'Monnaie à rendre',
    'pos.remainingBalance': 'Solde restant (Crédit client)',
    'pos.fullyPaid': 'Payé intégralement',
    'pos.completeSale': 'Valider la vente',
    'pos.saveSale': 'Enregistrer vente',
    'pos.printReceipt': 'Imprimer reçu',
    'pos.completeSaleAndPrint': 'Valider et imprimer',
    'pos.completePayment': 'Finaliser le paiement',
    'pos.paymentBreakdown': 'Répartition du paiement',
    'pos.addSplitMethod': 'Ajouter un mode',
    'pos.cancel': 'Annuler',
    'pos.customer': 'Client',
    'pos.salesRep': 'Vendeur',
    'pos.status': 'Statut',
    'pos.offlineMode': 'Mode hors ligne (Synchronisation au retour)',
    'pos.searchPlaceholder': 'Scanner code-barres ou rechercher...',
    'pos.subtotal': 'Sous-total',
    'pos.discount': 'Remise',

    'inventory.heading': 'Catalogue & Stock Inventaire',
    'inventory.addNewItem': 'Nouvel article',
    'inventory.addNewInventoryItem': 'Ajouter un nouvel article',
    'inventory.editItemDetails': "Modifier l'article",
    'expenses.heading': 'Gestion des Dépenses',
    'expenses.subtitle': 'Suivez loyer, salaires, transport et charges pour le calcul du bénéfice net',
    'expenses.addExpense': 'Ajouter dépense',
    'reports.heading': 'Rapports & Analyses',
    'reports.subtitle': 'Rofani POS • Touchez un rapport pour voir les détails',
    'reports.salesSummary': 'Résumé quotidien des ventes',
    'reports.purchaseReport': "Rapport d'achats",
    'reports.grossProfit': 'Bénéfice brut',
    'reports.transactionsCount': 'Transactions',

    'settings.title': 'Paramètres de la boutique',
    'settings.subtitle': 'Configurez la langue, le type d’activité, la fiscalité et les caisses',
    'settings.languageLabel': 'Language / Lugha',
    'settings.languageHint': "Choisissez la langue de l'interface, caisse, stock, rapports et IA Co-Pilot",
    'settings.generalTitle': 'Général',
    'settings.itemSettingsTitle': 'Paramètres des articles',
    'settings.shopControlsTitle': 'Contrôles & Protection',
    'settings.businessTypeTitle': "Type d'activité",
    'settings.savedNotice': 'Langue mise à jour !',
    'onboarding.languageLabel': 'Langue / Language',
    'onboarding.setupTitle': 'Configurer votre boutique privée',

    'menu.title': 'Menu & Outils',
    'ai.title': 'ROFANI AI Co-Pilot',
    'ai.subtitle': 'Aide caisse instantanée, alertes stock & conseils profit',
    'ai.answering': 'AI Co-Pilot répond...',
    'ai.askPlaceholder': 'Posez votre question...',
    'ai.send': 'Envoyer',
    'ai.topics': 'Sujets',
  },

  ar: {
    'nav.home': 'الرئيسية',
    'nav.dashboard': 'التقارير',
    'nav.items': 'المخزون',
    'nav.menu': 'القائمة',
    'nav.mobileView': 'الجوال',
    'nav.desktopView': 'الكمبيوتر',
    'nav.back': 'رجوع',
    'nav.close': 'إغلاق',
    'nav.settings': 'الإعدادات',

    'header.sell': 'بيع',
    'header.newSale': 'عملية بيع جديدة',
    'header.todaysSales': 'مبيعات اليوم',
    'header.grossProfitMargin': 'هامش الربح الإجمالي',
    'header.lowStockAlert': 'تنبيه نقص المخزون',
    'header.stockAlerts': 'تنبيهات المخزون',
    'sidebar.pos': 'نقطة البيع',
    'sidebar.inventory': 'إدارة المخزون',
    'sidebar.purchasing': 'المشتريات والطلبات',
    'sidebar.stocktake': 'الجرد الفعلي',
    'sidebar.contacts': 'العملاء والموردون',
    'sidebar.cashInOut': 'الصندوق الوارد والصادر',
    'sidebar.expenses': 'إدارة المصروفات',
    'sidebar.workersLoans': 'الموظفون والسلف',
    'sidebar.reports': 'مركز التقارير',
    'sidebar.auditTrail': 'سجل التدقيق',
    'sidebar.onlineStore': 'المتجر الإلكتروني',
    'sidebar.ordersDeals': 'الطلبات والعروض',
    'sidebar.multiStore': 'الفروع المتعددة',
    'sidebar.dataSettings': 'البيانات والإعدادات',

    'subpage.inventory': 'المخزون والمنتجات',
    'subpage.purchasing': 'الموردون والطلبات',
    'subpage.stocktake': 'جرد المخزون',
    'subpage.contacts': 'العملاء والموردون',
    'subpage.cashmanagement': 'حركة النقدية',
    'subpage.expenses': 'المصروفات',
    'subpage.attendance': 'الموظفون والحضور',
    'subpage.reports': 'التقارير والتحليلات',
    'subpage.auditlogs': 'سجلات التدقيق',
    'subpage.settings': 'إعدادات المتجر',
    'subpage.about': 'حول Rofani POS',

    'pos.cash': 'نقداً',
    'pos.mpesa': 'M-Pesa',
    'pos.mpesaPush': 'دفع M-Pesa',
    'pos.mpesaStkPush': 'M-Pesa STK Push',
    'pos.creditCard': 'بطاقة ائتمان',
    'pos.cheque': 'شيك',
    'pos.bankTransfer': 'تحويل بنكي عبر الجوال',
    'pos.total': 'الإجمالي',
    'pos.grandTotal': 'المجموع الكلي',
    'pos.totalBillAmount': 'إجمالي الفاتورة',
    'pos.totalPaidNow': 'المبلغ المدفوع الآن',
    'pos.change': 'الباقي',
    'pos.changeToReturn': 'الباقي المستحق للعميل',
    'pos.remainingBalance': 'الرصيد المتبقي (آجل)',
    'pos.fullyPaid': 'مدفوع بالكامل',
    'pos.completeSale': 'إتمام البيع',
    'pos.saveSale': 'حفظ البيع',
    'pos.printReceipt': 'طباعة الإيصال',
    'pos.completeSaleAndPrint': 'إتمام البيع والطباعة',
    'pos.completePayment': 'إتمام الدفع',
    'pos.paymentBreakdown': 'تفاصيل الدفع',
    'pos.addSplitMethod': 'إضافة وسيلة دفع',
    'pos.cancel': 'إلغاء',
    'pos.customer': 'العميل',
    'pos.salesRep': 'البائع',
    'pos.status': 'الحالة',
    'pos.offlineMode': 'وضع عدم الاتصال (تتم المزامنة عند العودة)',
    'pos.searchPlaceholder': 'امسح الباركود أو ابحث عن منتج...',
    'pos.subtotal': 'المجموع الفرعي',
    'pos.discount': 'الخصم',

    'inventory.heading': 'كتالوج المخزون والمنتجات',
    'inventory.addNewItem': 'إضافة منتج',
    'inventory.addNewInventoryItem': 'إضافة منتج جديد للمخزون',
    'inventory.editItemDetails': 'تعديل بيانات المنتج',
    'expenses.heading': 'إدارة مصروفات المتجر',
    'expenses.subtitle': 'سجل الإيجار والمرافق والنقل والرواتب لحساب صافي الربح بدقة',
    'expenses.addExpense': 'تسجيل مصروف',
    'reports.heading': 'التقارير وتحليلات الأعمال',
    'reports.subtitle': 'Rofani POS • اضغط على أي تقرير لعرض التفاصيل',
    'reports.salesSummary': 'ملخص المبيعات والإيرادات اليومية',
    'reports.purchaseReport': 'تقرير المشتريات',
    'reports.grossProfit': 'إجمالي الربح',
    'reports.transactionsCount': 'عدد المعاملات',

    'settings.title': 'إعدادات وتفضيلات المتجر',
    'settings.subtitle': 'تخصيص اللغة ونوع النشاط والضرائب ونقاط البيع في Rofani POS',
    'settings.languageLabel': 'Language / اللغة',
    'settings.languageHint': 'اختر لغة العرض للقوائم والدفع والمخزون والتقارير ومساعد AI Co-Pilot',
    'settings.generalTitle': 'عام',
    'settings.itemSettingsTitle': 'إعدادات المنتجات والمخزون',
    'settings.shopControlsTitle': 'حماية المتجر والتحكم',
    'settings.businessTypeTitle': 'نوع النشاط التجاري',
    'settings.savedNotice': 'تم تحديث لغة المتجر!',
    'onboarding.languageLabel': 'اللغة / Language',
    'onboarding.setupTitle': 'إعداد متجرك الخاص',

    'menu.title': 'القائمة والأدوات',
    'ai.title': 'مساعد ROFANI AI',
    'ai.subtitle': 'إرشادات البيع الفوري وتنبيهات المخزون والأرباح',
    'ai.answering': 'المساعد الذكي يكتب الإجابة...',
    'ai.askPlaceholder': 'اسأل عن أي شيء...',
    'ai.send': 'إرسال',
    'ai.topics': 'المواضيع',
  },

  pt: {
    'nav.home': 'INÍCIO',
    'nav.dashboard': 'PAINEL',
    'nav.items': 'ITENS',
    'nav.menu': 'MENU',
    'nav.mobileView': 'MÓVEL',
    'nav.desktopView': 'PC',
    'nav.back': 'Voltar',
    'nav.close': 'Fechar',
    'nav.settings': 'Definições',

    'header.sell': 'Vender',
    'header.newSale': 'Nova Venda',
    'header.todaysSales': 'Vendas de Hoje',
    'header.grossProfitMargin': 'Margem Bruta',
    'header.lowStockAlert': 'Alerta de Estoque',
    'header.stockAlerts': 'Alertas de Estoque',
    'sidebar.pos': 'Ponto de Venda',
    'sidebar.inventory': 'Controle de Estoque',
    'sidebar.purchasing': 'Compras e Pedidos',
    'sidebar.stocktake': 'Auditoria Física',
    'sidebar.contacts': 'Clientes e Fornecedores',
    'sidebar.cashInOut': 'Caixa Entrada/Saída',
    'sidebar.expenses': 'Gestor de Despesas',
    'sidebar.workersLoans': 'Equipe e Empréstimos',
    'sidebar.reports': 'Central de Relatórios',
    'sidebar.auditTrail': 'Registo de Auditoria',
    'sidebar.onlineStore': 'Loja Online',
    'sidebar.ordersDeals': 'Pedidos e Ofertas',
    'sidebar.multiStore': 'Multi-Lojas',
    'sidebar.dataSettings': 'Dados e Configurações',

    'subpage.inventory': 'Estoque & Inventário',
    'subpage.purchasing': 'Fornecedores & Pedidos',
    'subpage.stocktake': 'Auditoria de Estoque',
    'subpage.contacts': 'Clientes & Fornecedores',
    'subpage.cashmanagement': 'Caixa Entradas & Saídas',
    'subpage.expenses': 'Despesas',
    'subpage.attendance': 'Equipe & Presença',
    'subpage.reports': 'Relatórios & Análises',
    'subpage.auditlogs': 'Logs de Auditoria',
    'subpage.settings': 'Configurações da Loja',
    'subpage.about': 'Sobre o Rofani POS',

    'pos.cash': 'Dinheiro',
    'pos.mpesa': 'M-Pesa',
    'pos.mpesaPush': 'M-Pesa Push',
    'pos.mpesaStkPush': 'M-Pesa STK Push',
    'pos.creditCard': 'Cartão de Crédito',
    'pos.cheque': 'Cheque',
    'pos.bankTransfer': 'Transferência Bancária',
    'pos.total': 'Total',
    'pos.grandTotal': 'Total Geral',
    'pos.totalBillAmount': 'Valor Total da Conta',
    'pos.totalPaidNow': 'Total Pago Agora',
    'pos.change': 'Troco',
    'pos.changeToReturn': 'Troco a Devolver',
    'pos.remainingBalance': 'Saldo Restante (Crédito)',
    'pos.fullyPaid': 'Totalmente Pago',
    'pos.completeSale': 'Concluir Venda',
    'pos.saveSale': 'Salvar Venda',
    'pos.printReceipt': 'Imprimir Recibo',
    'pos.completeSaleAndPrint': 'Concluir e Imprimir',
    'pos.completePayment': 'Concluir Pagamento',
    'pos.paymentBreakdown': 'Detalhamento do Pagamento',
    'pos.addSplitMethod': 'Adicionar Método',
    'pos.cancel': 'Cancelar',
    'pos.customer': 'Cliente',
    'pos.salesRep': 'Vendedor',
    'pos.status': 'Estado',
    'pos.offlineMode': 'Modo Offline (Sincroniza ao reconectar)',
    'pos.searchPlaceholder': 'Ler código de barras ou buscar item...',
    'pos.subtotal': 'Subtotal',
    'pos.discount': 'Desconto',

    'inventory.heading': 'Catálogo de Estoque & Itens',
    'inventory.addNewItem': 'Novo Item',
    'inventory.addNewInventoryItem': 'Adicionar Novo Item ao Estoque',
    'inventory.editItemDetails': 'Editar Detalhes do Item',
    'expenses.heading': 'Gestão de Despesas da Loja',
    'expenses.subtitle': 'Registre aluguel, serviços, transporte e salários para o cálculo do lucro líquido',
    'expenses.addExpense': 'Registrar Despesa',
    'reports.heading': 'Relatórios & Análises',
    'reports.subtitle': 'Rofani POS • Toque em qualquer relatório para detalhar',
    'reports.salesSummary': 'Resumo Diário de Vendas e Receita',
    'reports.purchaseReport': 'Relatório de Compras',
    'reports.grossProfit': 'Lucro Bruto',
    'reports.transactionsCount': 'Transações',

    'settings.title': 'Configurações da Loja',
    'settings.subtitle': 'Configure idioma, tipo de negócio, impostos e terminais do Rofani POS',
    'settings.languageLabel': 'Language / Idioma',
    'settings.languageHint': 'Escolha o idioma da interface, checkout, estoque, relatórios e IA Co-Pilot',
    'settings.generalTitle': 'Geral',
    'settings.itemSettingsTitle': 'Configurações de Itens',
    'settings.shopControlsTitle': 'Controles e Proteção',
    'settings.businessTypeTitle': 'Tipo de Negócio',
    'settings.savedNotice': 'Idioma da loja atualizado!',
    'onboarding.languageLabel': 'Idioma / Language',
    'onboarding.setupTitle': 'Configurar Sua Loja Privada',

    'menu.title': 'Menu & Ferramentas',
    'ai.title': 'ROFANI AI Co-Pilot',
    'ai.subtitle': 'Passos rápidos no POS, alertas de estoque e lucros',
    'ai.answering': 'AI Co-Pilot está respondendo...',
    'ai.askPlaceholder': 'Pergunte qualquer coisa...',
    'ai.send': 'Enviar',
    'ai.topics': 'Tópicos',
  },

  es: {
    'nav.home': 'INICIO',
    'nav.dashboard': 'PANEL',
    'nav.items': 'ARTÍCULOS',
    'nav.menu': 'MENÚ',
    'nav.mobileView': 'MÓVIL',
    'nav.desktopView': 'ESCRITORIO',
    'nav.back': 'Volver',
    'nav.close': 'Cerrar',
    'nav.settings': 'Ajustes',

    'header.sell': 'Vender',
    'header.newSale': 'Nueva Venta',
    'header.todaysSales': 'Ventas de Hoy',
    'header.grossProfitMargin': 'Margen Bruto',
    'header.lowStockAlert': 'Stock Bajo',
    'header.stockAlerts': 'Alertas de Stock',
    'sidebar.pos': 'Punto de Venta',
    'sidebar.inventory': 'Control de Inventario',
    'sidebar.purchasing': 'Compras y Pedidos',
    'sidebar.stocktake': 'Auditoría Física',
    'sidebar.contacts': 'Clientes y Proveedores',
    'sidebar.cashInOut': 'Caja Entradas/Salidas',
    'sidebar.expenses': 'Gestor de Gastos',
    'sidebar.workersLoans': 'Personal y Préstamos',
    'sidebar.reports': 'Centro de Reportes',
    'sidebar.auditTrail': 'Registro de Auditoría',
    'sidebar.onlineStore': 'Tienda Online',
    'sidebar.ordersDeals': 'Pedidos y Ofertas',
    'sidebar.multiStore': 'Multi-Tiendas',
    'sidebar.dataSettings': 'Datos y Ajustes',

    'subpage.inventory': 'Stock e Inventario',
    'subpage.purchasing': 'Proveedores y Pedidos',
    'subpage.stocktake': 'Auditoría de Stock',
    'subpage.contacts': 'Clientes y Proveedores',
    'subpage.cashmanagement': 'Entradas y Salidas de Caja',
    'subpage.expenses': 'Gastos',
    'subpage.attendance': 'Personal y Asistencia',
    'subpage.reports': 'Reportes y Análisis',
    'subpage.auditlogs': 'Registros de Auditoría',
    'subpage.settings': 'Ajustes de Tienda',
    'subpage.about': 'Acerca de Rofani POS',

    'pos.cash': 'Efectivo',
    'pos.mpesa': 'M-Pesa',
    'pos.mpesaPush': 'M-Pesa Push',
    'pos.mpesaStkPush': 'M-Pesa STK Push',
    'pos.creditCard': 'Tarjeta',
    'pos.cheque': 'Cheque',
    'pos.bankTransfer': 'Transferencia Móvil',
    'pos.total': 'Total',
    'pos.grandTotal': 'Total General',
    'pos.totalBillAmount': 'Total de la Cuenta',
    'pos.totalPaidNow': 'Total Pagado Ahora',
    'pos.change': 'Cambio',
    'pos.changeToReturn': 'Cambio a Devolver',
    'pos.remainingBalance': 'Saldo Pendiente (Crédito)',
    'pos.fullyPaid': 'Pagado Totalmente',
    'pos.completeSale': 'Completar Venta',
    'pos.saveSale': 'Guardar Venta',
    'pos.printReceipt': 'Imprimir Recibo',
    'pos.completeSaleAndPrint': 'Completar e Imprimir',
    'pos.completePayment': 'Completar Pago',
    'pos.paymentBreakdown': 'Desglose de Pago',
    'pos.addSplitMethod': 'Agregar Método',
    'pos.cancel': 'Cancelar',
    'pos.customer': 'Cliente',
    'pos.salesRep': 'Vendedor',
    'pos.status': 'Estado',
    'pos.offlineMode': 'Modo Sin Conexión (Se sincronizará al volver)',
    'pos.searchPlaceholder': 'Escanear código o buscar artículo...',
    'pos.subtotal': 'Subtotal',
    'pos.discount': 'Descuento',

    'inventory.heading': 'Catálogo de Stock e Inventario',
    'inventory.addNewItem': 'Nuevo Artículo',
    'inventory.addNewInventoryItem': 'Agregar Nuevo Artículo',
    'inventory.editItemDetails': 'Editar Detalles del Artículo',
    'expenses.heading': 'Gestión de Gastos de Tienda',
    'expenses.subtitle': 'Registra alquiler, servicios, transporte y salarios para el cálculo de ganancia neta',
    'expenses.addExpense': 'Registrar Gasto',
    'reports.heading': 'Reportes y Análisis',
    'reports.subtitle': 'Rofani POS • Toca cualquier reporte para ver detalles',
    'reports.salesSummary': 'Resumen Diario de Ventas e Ingresos',
    'reports.purchaseReport': 'Reporte de Compras',
    'reports.grossProfit': 'Ganancia Bruta',
    'reports.transactionsCount': 'Transacciones',

    'settings.title': 'Ajustes y Preferencias',
    'settings.subtitle': 'Configura idioma, tipo de negocio, impuestos y terminales de Rofani POS',
    'settings.languageLabel': 'Language / Idioma',
    'settings.languageHint': 'Elige el idioma de navegación, caja, stock, reportes y AI Co-Pilot',
    'settings.generalTitle': 'General',
    'settings.itemSettingsTitle': 'Ajustes de Artículos',
    'settings.shopControlsTitle': 'Controles y Protección',
    'settings.businessTypeTitle': 'Tipo de Negocio',
    'settings.savedNotice': '¡Idioma de tienda actualizado!',
    'onboarding.languageLabel': 'Idioma / Language',
    'onboarding.setupTitle': 'Configura Tu Tienda Privada',

    'menu.title': 'Menú y Herramientas',
    'ai.title': 'ROFANI AI Co-Pilot',
    'ai.subtitle': 'Pasos rápidos POS, alertas de stock y ganancias',
    'ai.answering': 'AI Co-Pilot está respondiendo...',
    'ai.askPlaceholder': 'Pregunta cualquier cosa...',
    'ai.send': 'Enviar',
    'ai.topics': 'Temas',
  },

  de: {
    'nav.home': 'START',
    'nav.dashboard': 'DASHBOARD',
    'nav.items': 'ARTIKEL',
    'nav.menu': 'MENÜ',
    'nav.mobileView': 'MOBIL',
    'nav.desktopView': 'DESKTOP',
    'nav.back': 'Zurück',
    'nav.close': 'Schließen',
    'nav.settings': 'Einstellungen',

    'header.sell': 'Verkaufen',
    'header.newSale': 'Neuer Verkauf',
    'header.todaysSales': 'Heutige Umsätze',
    'header.grossProfitMargin': 'Bruttomarge',
    'header.lowStockAlert': 'Niedriger Bestand',
    'header.stockAlerts': 'Bestandswarnungen',
    'sidebar.pos': 'Kasse (POS)',
    'sidebar.inventory': 'Lagerverwaltung',
    'sidebar.purchasing': 'Einkauf & Bestellungen',
    'sidebar.stocktake': 'Inventur',
    'sidebar.contacts': 'Kunden & Lieferanten',
    'sidebar.cashInOut': 'Kasse Ein/Aus',
    'sidebar.expenses': 'Ausgaben',
    'sidebar.workersLoans': 'Personal & Vorschüsse',
    'sidebar.reports': 'Berichtszentrale',
    'sidebar.auditTrail': 'Prüfprotokoll',
    'sidebar.onlineStore': 'Online-Shop',
    'sidebar.ordersDeals': 'Bestellungen & Angebote',
    'sidebar.multiStore': 'Filialverwaltung',
    'sidebar.dataSettings': 'Daten & Einstellungen',

    'subpage.inventory': 'Lager & Bestand',
    'subpage.purchasing': 'Lieferanten & Bestellungen',
    'subpage.stocktake': 'Bestandsprüfung',
    'subpage.contacts': 'Kunden & Lieferanten',
    'subpage.cashmanagement': 'Kasse Ein & Aus',
    'subpage.expenses': 'Ausgaben',
    'subpage.attendance': 'Personal & Anwesenheit',
    'subpage.reports': 'Berichte & Analysen',
    'subpage.auditlogs': 'Prüfprotokolle',
    'subpage.settings': 'Shop-Einstellungen',
    'subpage.about': 'Über Rofani POS',

    'pos.cash': 'Bargeld',
    'pos.mpesa': 'M-Pesa',
    'pos.mpesaPush': 'M-Pesa Push',
    'pos.mpesaStkPush': 'M-Pesa STK Push',
    'pos.creditCard': 'Kreditkarte',
    'pos.cheque': 'Scheck',
    'pos.bankTransfer': 'Mobile Überweisung',
    'pos.total': 'Gesamt',
    'pos.grandTotal': 'Gesamtbetrag',
    'pos.totalBillAmount': 'Rechnungsbetrag',
    'pos.totalPaidNow': 'Jetzt bezahlt',
    'pos.change': 'Wechselgeld',
    'pos.changeToReturn': 'Rückgeld an Kunden',
    'pos.remainingBalance': 'Restbetrag (Kredit)',
    'pos.fullyPaid': 'Vollständig bezahlt',
    'pos.completeSale': 'Verkauf abschließen',
    'pos.saveSale': 'Verkauf speichern',
    'pos.printReceipt': 'Beleg drucken',
    'pos.completeSaleAndPrint': 'Abschließen & Drucken',
    'pos.completePayment': 'Zahlung abschließen',
    'pos.paymentBreakdown': 'Zahlungsaufteilung',
    'pos.addSplitMethod': 'Zahlungsart hinzufügen',
    'pos.cancel': 'Abbrechen',
    'pos.customer': 'Kunde',
    'pos.salesRep': 'Verkäufer',
    'pos.status': 'Status',
    'pos.offlineMode': 'Offline-Modus (Synchronisiert bei Verbindung)',
    'pos.searchPlaceholder': 'Barcode scannen oder Artikel suchen...',
    'pos.subtotal': 'Zwischensumme',
    'pos.discount': 'Rabatt',

    'inventory.heading': 'Lager- & Artikelkatalog',
    'inventory.addNewItem': 'Neuer Artikel',
    'inventory.addNewInventoryItem': 'Neuen Lagerartikel hinzufügen',
    'inventory.editItemDetails': 'Artikeldetails bearbeiten',
    'expenses.heading': 'Filial-Ausgabenverwaltung',
    'expenses.subtitle': 'Erfassen Sie Miete, Strom, Transport und Gehälter für die Gewinnrechnung',
    'expenses.addExpense': 'Ausgabe erfassen',
    'reports.heading': 'Berichte & Geschäftsanalysen',
    'reports.subtitle': 'Rofani POS • Tippen Sie auf einen Bericht für Details',
    'reports.salesSummary': 'Tägliche Umsatzübersicht',
    'reports.purchaseReport': 'Einkaufsbericht',
    'reports.grossProfit': 'Bruttogewinn',
    'reports.transactionsCount': 'Transaktionen',

    'settings.title': 'Shop-Einstellungen',
    'settings.subtitle': 'Sprache, Geschäftstyp, Steuern und POS-Terminals konfigurieren',
    'settings.languageLabel': 'Language / Sprache',
    'settings.languageHint': 'Anzeigesprache für Navigation, Kasse, Lager, Berichte und AI Co-Pilot wählen',
    'settings.generalTitle': 'Allgemein',
    'settings.itemSettingsTitle': 'Artikeleinstellungen',
    'settings.shopControlsTitle': 'Schutz & Steuerung',
    'settings.businessTypeTitle': 'Geschäftstyp',
    'settings.savedNotice': 'Shop-Sprache aktualisiert!',
    'onboarding.languageLabel': 'Sprache / Language',
    'onboarding.setupTitle': 'Privaten Shop einrichten',

    'menu.title': 'Menü & Werkzeuge',
    'ai.title': 'ROFANI AI Co-Pilot',
    'ai.subtitle': 'Schnelle POS-Schritte, Bestandswarnungen & Gewinntipps',
    'ai.answering': 'AI Co-Pilot antwortet...',
    'ai.askPlaceholder': 'Fragen Sie etwas...',
    'ai.send': 'Senden',
    'ai.topics': 'Themen',
  },

  zh: {
    'nav.home': '首页',
    'nav.dashboard': '报表',
    'nav.items': '商品',
    'nav.menu': '菜单',
    'nav.mobileView': '手机视图',
    'nav.desktopView': '电脑视图',
    'nav.back': '返回',
    'nav.close': '关闭',
    'nav.settings': '设置',

    'header.sell': '收银',
    'header.newSale': '新建销售',
    'header.todaysSales': '今日销售额',
    'header.grossProfitMargin': '毛利率',
    'header.lowStockAlert': '低库存预警',
    'header.stockAlerts': '库存提醒',
    'sidebar.pos': '收银台 (POS)',
    'sidebar.inventory': '库存管理',
    'sidebar.purchasing': '采购与订单',
    'sidebar.stocktake': '库存盘点',
    'sidebar.contacts': '客户与供应商',
    'sidebar.cashInOut': '现金收支',
    'sidebar.expenses': '支出管理',
    'sidebar.workersLoans': '员工与借支',
    'sidebar.reports': '报表中心',
    'sidebar.auditTrail': '审计日志',
    'sidebar.onlineStore': '线上网店',
    'sidebar.ordersDeals': '订单与优惠',
    'sidebar.multiStore': '多店管理',
    'sidebar.dataSettings': '数据与设置',

    'subpage.inventory': '库存与商品',
    'subpage.purchasing': '供应商与订单',
    'subpage.stocktake': '库存盘点',
    'subpage.contacts': '客户与供应商',
    'subpage.cashmanagement': '现金收支',
    'subpage.expenses': '支出',
    'subpage.attendance': '员工考勤',
    'subpage.reports': '报表与分析',
    'subpage.auditlogs': '审计日志',
    'subpage.settings': '门店设置',
    'subpage.about': '关于 Rofani POS',

    'pos.cash': '现金',
    'pos.mpesa': 'M-Pesa',
    'pos.mpesaPush': 'M-Pesa 推送',
    'pos.mpesaStkPush': 'M-Pesa STK 推送',
    'pos.creditCard': '银行卡',
    'pos.cheque': '支票',
    'pos.bankTransfer': '手机银行转账',
    'pos.total': '合计',
    'pos.grandTotal': '总金额',
    'pos.totalBillAmount': '账单总额',
    'pos.totalPaidNow': '本次实付',
    'pos.change': '找零',
    'pos.changeToReturn': '应找零金额',
    'pos.remainingBalance': '剩余欠款 (记入客户赊账)',
    'pos.fullyPaid': '已全额付款',
    'pos.completeSale': '完成收款',
    'pos.saveSale': '保存销售',
    'pos.printReceipt': '打印小票',
    'pos.completeSaleAndPrint': '完成并打印小票',
    'pos.completePayment': '完成支付',
    'pos.paymentBreakdown': '支付明细',
    'pos.addSplitMethod': '添加组合支付',
    'pos.cancel': '取消',
    'pos.customer': '客户',
    'pos.salesRep': '销售员',
    'pos.status': '状态',
    'pos.offlineMode': '离线模式（联网后自动同步）',
    'pos.searchPlaceholder': '扫描条码或搜索商品...',
    'pos.subtotal': '小计',
    'pos.discount': '折扣',

    'inventory.heading': '库存与商品目录',
    'inventory.addNewItem': '新增商品',
    'inventory.addNewInventoryItem': '添加新库存商品',
    'inventory.editItemDetails': '编辑商品详情',
    'expenses.heading': '门店支出管理',
    'expenses.subtitle': '记录水电、房租、运输和工资等运营支出以核算净利润',
    'expenses.addExpense': '记录支出',
    'reports.heading': '报表与经营分析',
    'reports.subtitle': 'Rofani POS • 点击任意报表查看详情',
    'reports.salesSummary': '每日销售与营收汇总',
    'reports.purchaseReport': '采购报表',
    'reports.grossProfit': '毛利润',
    'reports.transactionsCount': '交易笔数',

    'settings.title': '门店设置与偏好',
    'settings.subtitle': '配置 Rofani POS 语言、行业类型、税务和终端参数',
    'settings.languageLabel': 'Language / 语言',
    'settings.languageHint': '选择导航、收银、库存、报表及 AI Co-Pilot 的显示语言',
    'settings.generalTitle': '通用设置',
    'settings.itemSettingsTitle': '商品与库存设置',
    'settings.shopControlsTitle': '门店控制与保护',
    'settings.businessTypeTitle': '行业类型与初始设置',
    'settings.savedNotice': '门店语言已更新！',
    'onboarding.languageLabel': '语言 / Language',
    'onboarding.setupTitle': '设置您的专属门店',

    'menu.title': '菜单与工具',
    'ai.title': 'ROFANI AI 助手',
    'ai.subtitle': '即时 POS 指引、库存提醒与利润建议',
    'ai.answering': 'AI 助手正在回答...',
    'ai.askPlaceholder': '输入任何问题...',
    'ai.send': '发送',
    'ai.topics': '快捷主题',
  },

  hi: {
    'nav.home': 'होम',
    'nav.dashboard': 'डैशबोर्ड',
    'nav.items': 'आइटम',
    'nav.menu': 'मेनू',
    'nav.mobileView': 'मोबाइल',
    'nav.desktopView': 'डेस्कटॉप',
    'nav.back': 'वापस',
    'nav.close': 'बंद करें',
    'nav.settings': 'सेटिंग्स',

    'header.sell': 'बेचें',
    'header.newSale': 'नई बिक्री',
    'header.todaysSales': 'आज की बिक्री',
    'header.grossProfitMargin': 'सकल लाभ मार्जिन',
    'header.lowStockAlert': 'कम स्टॉक अलर्ट',
    'header.stockAlerts': 'स्टॉक अलर्ट',
    'sidebar.pos': 'पॉइंट ऑफ सेल',
    'sidebar.inventory': 'इन्वेंटरी नियंत्रण',
    'sidebar.purchasing': 'खरीद और ऑर्डर',
    'sidebar.stocktake': 'भौतिक ऑडिट',
    'sidebar.contacts': 'ग्राहक और सप्लायर',
    'sidebar.cashInOut': 'कैश इन और आउट',
    'sidebar.expenses': 'खर्च प्रबंधक',
    'sidebar.workersLoans': 'कर्मचारी और ऋण',
    'sidebar.reports': 'रिपोर्ट्स केंद्र',
    'sidebar.auditTrail': 'ऑडिट लॉग',
    'sidebar.onlineStore': 'ऑनलाइन स्टोर',
    'sidebar.ordersDeals': 'ऑर्डर और ऑफर',
    'sidebar.multiStore': 'मल्टी-स्टोर शाखाएँ',
    'sidebar.dataSettings': 'डेटा और सेटिंग्स',

    'subpage.inventory': 'स्टॉक और इन्वेंटरी',
    'subpage.purchasing': 'सप्लायर और ऑर्डर',
    'subpage.stocktake': 'स्टॉक ऑडिट',
    'subpage.contacts': 'ग्राहक और सप्लायर',
    'subpage.cashmanagement': 'कैश इन और आउट',
    'subpage.expenses': 'खर्च',
    'subpage.attendance': 'स्टाफ और उपस्थिति',
    'subpage.reports': 'रिपोर्ट्स और विश्लेषण',
    'subpage.auditlogs': 'ऑडिट लॉग',
    'subpage.settings': 'स्टोर सेटिंग्स',
    'subpage.about': 'Rofani POS के बारे में',

    'pos.cash': 'नकद',
    'pos.mpesa': 'M-Pesa',
    'pos.mpesaPush': 'M-Pesa पुश',
    'pos.mpesaStkPush': 'M-Pesa STK पुश',
    'pos.creditCard': 'क्रेडिट कार्ड',
    'pos.cheque': 'चेक',
    'pos.bankTransfer': 'मोबाइल बैंक ट्रांसफर',
    'pos.total': 'कुल',
    'pos.grandTotal': 'कुल योग',
    'pos.totalBillAmount': 'कुल बिल राशि',
    'pos.totalPaidNow': 'अभी भुगतान किया गया',
    'pos.change': 'बकाया वापसी',
    'pos.changeToReturn': 'ग्राहक को वापस करने के लिए छुट्टे',
    'pos.remainingBalance': 'शेष राशि (ग्राहक उधार)',
    'pos.fullyPaid': 'पूर्ण भुगतान',
    'pos.completeSale': 'बिक्री पूरी करें',
    'pos.saveSale': 'बिक्री सहेजें',
    'pos.printReceipt': 'रसीद प्रिंट करें',
    'pos.completeSaleAndPrint': 'पूरा करें और प्रिंट करें',
    'pos.completePayment': 'भुगतान पूरा करें',
    'pos.paymentBreakdown': 'भुगतान विवरण',
    'pos.addSplitMethod': 'अतिरिक्त माध्यम जोड़ें',
    'pos.cancel': 'रद्द करें',
    'pos.customer': 'ग्राहक',
    'pos.salesRep': 'विक्रेता',
    'pos.status': 'स्थिति',
    'pos.offlineMode': 'ऑफ़लाइन मोड (ऑनलाइन होने पर सिंक होगा)',
    'pos.searchPlaceholder': 'बारकोड स्कैन करें या आइटम खोजें...',
    'pos.subtotal': 'उप-योग',
    'pos.discount': 'छूट',

    'inventory.heading': 'स्टॉक और इन्वेंटरी कैटलॉग',
    'inventory.addNewItem': 'नया आइटम जोड़ें',
    'inventory.addNewInventoryItem': 'नया इन्वेंटरी आइटम जोड़ें',
    'inventory.editItemDetails': 'आइटम विवरण संपादित करें',
    'expenses.heading': 'स्टोर खर्च प्रबंधन',
    'expenses.subtitle': 'शुद्ध लाभ गणना के लिए किराया, बिजली, परिवहन और वेतन दर्ज करें',
    'expenses.addExpense': 'खर्च दर्ज करें',
    'reports.heading': 'रिपोर्ट्स और व्यापार विश्लेषण',
    'reports.subtitle': 'Rofani POS • विस्तृत रिपोर्ट देखने के लिए टैप करें',
    'reports.salesSummary': 'दैनिक बिक्री और राजस्व सारांश',
    'reports.purchaseReport': 'खरीद रिपोर्ट',
    'reports.grossProfit': 'सकल लाभ',
    'reports.transactionsCount': 'लेन-देन संख्या',

    'settings.title': 'स्टोर सेटिंग्स और प्राथमिकताएँ',
    'settings.subtitle': 'भाषा, व्यापार प्रकार, टैक्स और POS टर्मिनल कॉन्फ़िगर करें',
    'settings.languageLabel': 'Language / भाषा',
    'settings.languageHint': 'नेविगेशन, चेकआउट, स्टॉक, रिपोर्ट्स और AI Co-Pilot के लिए भाषा चुनें',
    'settings.generalTitle': 'सामान्य',
    'settings.itemSettingsTitle': 'आइटम सेटिंग्स',
    'settings.shopControlsTitle': 'शॉप नियंत्रण और सुरक्षा',
    'settings.businessTypeTitle': 'व्यापार का प्रकार',
    'settings.savedNotice': 'स्टोर की भाषा अपडेट हो गई!',
    'onboarding.languageLabel': 'भाषा / Language',
    'onboarding.setupTitle': 'अपना निजी स्टोर सेटअप करें',

    'menu.title': 'मेनू और टूल्स',
    'ai.title': 'ROFANI AI Co-Pilot',
    'ai.subtitle': 'तुरंत POS मदद, स्टॉक अलर्ट और लाभ मार्गदर्शन',
    'ai.answering': 'AI Co-Pilot जवाब दे रहा है...',
    'ai.askPlaceholder': 'कुछ भी पूछें...',
    'ai.send': 'भेजें',
    'ai.topics': 'विषय',
  },
};

export function translate(lang: AppLanguageCode, key: TranslationKey | string): string {
  const dict = TRANSLATIONS[lang];
  const localized = dict?.[key as TranslationKey];
  if (typeof localized === 'string' && localized.trim().length > 0) {
    return localized;
  }
  const fallback = TRANSLATIONS.en[key as TranslationKey];
  if (typeof fallback === 'string' && fallback.trim().length > 0) {
    return fallback;
  }
  return key;
}

export function getAiWelcomeText(lang: AppLanguageCode, storeName: string): string {
  const safeStore = storeName || 'Rofani POS';
  switch (lang) {
    case 'sw':
      return `Hujambo! Karibu **${safeStore}**.\n\nMimi ni **ROFANI AI Co-Pilot** wako. Gusa mada yoyote hapo juu au niulize kuhusu:\n- Mauzo ya haraka & **M-Pesa Setup**\n- Tahadhari za **Low Stock** na kujaza stoo\n- Mauzo ya kila siku, matumizi & **Faida**\n- Kuongeza matawi, uhamisho & nakala za akiba`;
    case 'fr':
      return `Bonjour ! Bienvenue sur **${safeStore}**.\n\nJe suis votre **ROFANI AI Co-Pilot**. Choisissez un sujet ci-dessus ou posez-moi vos questions sur :\n- Ventes rapides & **M-Pesa Setup**\n- Alertes **Stock faible** & réapprovisionnement\n- Ventes quotidiennes, dépenses & **Bénéfices**\n- Boutiques multiples, transferts & sauvegardes`;
    case 'ar':
      return `مرحباً! أهلاً بك في **${safeStore}**.\n\nأنا مساعدك الذكي **ROFANI AI Co-Pilot**. اختر أي موضوع أعلاه أو اسألني عن:\n- المبيعات السريعة وإعداد **M-Pesa**\n- تنبيهات **نقص المخزون** وإعادة التزويد\n- المبيعات اليومية والمصروفات و**صافي الربح**\n- إدارة الفروع والتحويلات والنسخ الاحتياطي`;
    case 'pt':
      return `Olá! Bem-vindo à **${safeStore}**.\n\nEu sou o seu **ROFANI AI Co-Pilot**. Toque em um tópico acima ou pergunte sobre:\n- Vendas rápidas e **M-Pesa**\n- Alertas de **Estoque Baixo** e reposição\n- Vendas diárias, despesas e **Lucro**\n- Múltiplas lojas, transferências e backups`;
    case 'es':
      return `¡Hola! Bienvenido a **${safeStore}**.\n\nSoy tu **ROFANI AI Co-Pilot**. Toca cualquier tema arriba o pregúntame sobre:\n- Ventas rápidas y **M-Pesa**\n- Alertas de **Stock Bajo** y reposición\n- Ventas diarias, gastos y **Ganancias**\n- Múltiples tiendas, transferencias y copias`;
    case 'de':
      return `Hallo! Willkommen bei **${safeStore}**.\n\nIch bin Ihr **ROFANI AI Co-Pilot**. Tippen Sie oben auf ein Thema oder fragen Sie nach:\n- Schnellen Verkäufen & **M-Pesa**\n- **Niedrigem Bestand** & Nachbestellungen\n- Tagesumsatz, Ausgaben & **Gewinn**\n- Mehrere Filialen, Transfers & Backups`;
    case 'zh':
      return `您好！欢迎来到 **${safeStore}**。\n\n我是您的 **ROFANI AI 助手**。点击上方快捷主题或向我咨询：\n- 快速收银与 **M-Pesa** 设置\n- **低库存**预警与补货建议\n- 每日销售、支出与**利润**统计\n- 多店管理、调拨与数据备份`;
    case 'hi':
      return `नमस्ते! **${safeStore}** में आपका स्वागत है।\n\nमैं आपका **ROFANI AI Co-Pilot** हूँ। ऊपर किसी भी विषय पर टैप करें या मुझसे पूछें:\n- तेज़ बिक्री और **M-Pesa** सेटअप\n- **कम स्टॉक** अलर्ट और रीस्टॉकिंग\n- दैनिक बिक्री, खर्च और **लाभ**\n- कई दुकानें, ट्रांसफर और बैकअप`;
    default:
      return `Hujambo! Welcome to **${safeStore}**.\n\nI am your **ROFANI AI Co-Pilot**. Tap any quick topic above or ask me about:\n- Fast POS sales & **M-Pesa Setup**\n- **Low Stock** alerts & replenishment\n- Daily sales, expenses & **Daily Profit**\n- Adding shops, transfers & backups`;
  }
}

export interface LanguageContextValue {
  lang: AppLanguageCode;
  langConfig: LanguageOption;
  dir: 'ltr' | 'rtl';
  isRtl: boolean;
  t: (key: TranslationKey | string) => string;
  setLanguage: (next: AppLanguageCode) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: DEFAULT_APP_LANGUAGE,
  langConfig: SUPPORTED_LANGUAGES[0],
  dir: 'ltr',
  isRtl: false,
  t: (key) => translate(DEFAULT_APP_LANGUAGE, key),
  setLanguage: () => {},
});

export const LanguageProvider: React.FC<{
  storeId?: string;
  remoteLanguage?: AppLanguageCode | string | null;
  onPersistLanguage?: (lang: AppLanguageCode) => void;
  children: React.ReactNode;
}> = ({ storeId, remoteLanguage, onPersistLanguage, children }) => {
  const [lang, setLangState] = useState<AppLanguageCode>(() => loadStoreLanguageLocal(storeId));

  // Sync when store changes
  useEffect(() => {
    setLangState(loadStoreLanguageLocal(storeId));
  }, [storeId]);

  // Sync when remote store language updates from Firestore
  useEffect(() => {
    if (typeof remoteLanguage === 'string' && remoteLanguage.trim()) {
      const normalized = normalizeLanguageCode(remoteLanguage);
      setLangState(normalized);
      saveStoreLanguageLocal(normalized, storeId);
    }
  }, [remoteLanguage, storeId]);

  // Listen to local store language events
  useEffect(() => {
    const onLangEvent = (ev: Event) => {
      const custom = ev as CustomEvent<{ storeId?: string; language?: AppLanguageCode }>;
      if (custom?.detail?.language) {
        if (!storeId || !custom.detail.storeId || custom.detail.storeId === storeId) {
          setLangState(normalizeLanguageCode(custom.detail.language));
          return;
        }
      }
      setLangState(loadStoreLanguageLocal(storeId));
    };
    window.addEventListener(STORE_LANGUAGE_EVENT, onLangEvent);
    return () => window.removeEventListener(STORE_LANGUAGE_EVENT, onLangEvent);
  }, [storeId]);

  // Update <html lang> attribute cleanly while keeping root layout predictable
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLanguage = useCallback(
    (next: AppLanguageCode) => {
      const normalized = saveStoreLanguageLocal(next, storeId);
      setLangState(normalized);
      onPersistLanguage?.(normalized);
    },
    [storeId, onPersistLanguage]
  );

  const langConfig = getLanguageConfig(lang);
  const t = useCallback(
    (key: TranslationKey | string) => translate(lang, key),
    [lang]
  );

  return React.createElement(
    LanguageContext.Provider,
    {
      value: {
        lang,
        langConfig,
        dir: langConfig.dir,
        isRtl: langConfig.dir === 'rtl',
        t,
        setLanguage,
      },
    },
    children
  );
};

export function useI18n(): LanguageContextValue {
  return useContext(LanguageContext);
}
