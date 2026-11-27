import { BusinessTypeId } from '../types';

export interface BusinessTypeStarterCategory {
  name: string;
  subcategories: string[];
}

export interface BusinessTypeItemHints {
  namePlaceholder: string;
  variantLabel: string;
  variantPlaceholder: string;
  subcategoryPlaceholder: string;
  helperBanner: string;
  unitHint: string;
}

export interface BusinessTypeConfig {
  id: BusinessTypeId;
  label: string;
  shortLabel: string;
  subtitle: string;
  emoji: string;
  defaultUnit: string;
  suggestExpiryTracking?: boolean;
  starterCategories: BusinessTypeStarterCategory[];
  itemHints: BusinessTypeItemHints;
}

export const DEFAULT_BUSINESS_TYPE: BusinessTypeId = 'general';

export const BUSINESS_TYPES: BusinessTypeConfig[] = [
  {
    id: 'boutique',
    label: 'Boutique & Fashion',
    shortLabel: 'Boutique',
    subtitle: 'Clothes, Shoes, Bags, Accessories; size/color notes',
    emoji: '👗',
    defaultUnit: 'pcs',
    starterCategories: [
      {
        name: 'Clothes',
        subcategories: [
          'Women Wear',
          'Men Wear',
          'Kids Wear',
          'Dresses & Tops',
          'Trousers & Jeans',
          'Jackets & Coats',
        ],
      },
      {
        name: 'Shoes',
        subcategories: [
          'Men Shoes & Sneakers',
          'Women Heels & Flats',
          'Kids Shoes',
          'Sandals & Slippers',
          'Sports Shoes',
        ],
      },
      {
        name: 'Bags',
        subcategories: ['Handbags', 'Backpacks', 'Travel Bags', 'Wallets & Clutches'],
      },
      {
        name: 'Accessories',
        subcategories: ['Watches & Jewelry', 'Belts & Hats', 'Sunglasses', 'Socks & Innerwear'],
      },
    ],
    itemHints: {
      namePlaceholder: 'e.g. Ladies Denim Jacket, Men Sneakers, Leather Tote Bag...',
      variantLabel: 'Size / Color / Variant',
      variantPlaceholder: 'e.g. Size M / Black, EU 42 / Navy, Free Size / Gold',
      subcategoryPlaceholder: 'e.g. Dresses, Sneakers, Handbags...',
      helperBanner:
        'Boutique tip: Use Size / Color / Variant for garment sizes (S, M, L, EU 42) and colors.',
      unitHint: 'pcs / pair',
    },
  },
  {
    id: 'salon',
    label: 'Salon & Barber Shop',
    shortLabel: 'Salon & Barber',
    subtitle: 'Services, Styling, Beauty Products; attendant/stylist commissions',
    emoji: '💈',
    defaultUnit: 'service',
    starterCategories: [
      {
        name: 'Services',
        subcategories: [
          'Haircut & Barbering',
          'Wash & Blowdry',
          'Silk Press & Treatment',
          'Manicure & Pedicure',
          'Facial & Spa',
        ],
      },
      {
        name: 'Styling',
        subcategories: [
          'Braids & Knotless',
          'Weaves & Wigs',
          'Dreadlocks & Retouch',
          'Bridal & Event Styling',
        ],
      },
      {
        name: 'Beauty Products',
        subcategories: [
          'Hair Oils & Shampoos',
          'Skincare & Lotions',
          'Makeup & Cosmetics',
          'Braids & Extensions',
          'Barber & Beard Care',
        ],
      },
    ],
    itemHints: {
      namePlaceholder: 'e.g. Knotless Braids, Executive Fade Cut, Argan Hair Oil 250ml...',
      variantLabel: 'Service / Stylist / Pack Note',
      variantPlaceholder: 'e.g. 45 mins / Senior Stylist, 250ml Bottle, 3-Pack',
      subcategoryPlaceholder: 'e.g. Haircut, Braids, Hair Oils...',
      helperBanner:
        'Salon tip: Record attendant/stylist commissions in Workers & Wages and note duration or stylist tier in the variant field.',
      unitHint: 'service / bottle / pcs',
    },
  },
  {
    id: 'hardware',
    label: 'Hardware & Building Materials',
    shortLabel: 'Hardware',
    subtitle: 'Building, Plumbing, Electrical, Paint; units like piece, bag, meter, kg',
    emoji: '🛠️',
    defaultUnit: 'pcs',
    starterCategories: [
      {
        name: 'Building',
        subcategories: [
          'Cement & Lime',
          'Steel & Iron Bars',
          'Roofing Sheets',
          'Timber & Plywood',
          'Nails & Binding Wire',
        ],
      },
      {
        name: 'Plumbing',
        subcategories: [
          'PVC & PPR Pipes',
          'Taps & Mixers',
          'Valves, Elbows & Tees',
          'Water Tanks & Pumps',
        ],
      },
      {
        name: 'Electrical',
        subcategories: [
          'Cables & Wires',
          'Switches & Sockets',
          'Breakers & Distribution Boards',
          'Bulbs & Floodlights',
        ],
      },
      {
        name: 'Paint',
        subcategories: [
          'Interior & Exterior Paint',
          'Undercoats & Primers',
          'Thinners & Varnish',
          'Brushes & Rollers',
        ],
      },
      {
        name: 'Tools & Fasteners',
        subcategories: ['Hand Tools', 'Power Tools', 'Padlocks & Hinges', 'Bolts & Screws'],
      },
    ],
    itemHints: {
      namePlaceholder: 'e.g. Bamburi Cement 50kg, PPR Pipe 20mm, Crown Silk Paint 4L...',
      variantLabel: 'Unit / Gauge / Spec',
      variantPlaceholder: 'e.g. 50kg Bag, 4m Length, 2.5mm Twin Cable, 4L Tin',
      subcategoryPlaceholder: 'e.g. Cement, Pipes, Cables, Paint...',
      helperBanner:
        'Hardware tip: Select piece, bag, meter (m), or kg under Unit of Measure and add gauge/size details above.',
      unitHint: 'pcs / bag / m / kg',
    },
  },
  {
    id: 'hospitality',
    label: 'Hotel, Restaurant & Cafe',
    shortLabel: 'Hotel & Cafe',
    subtitle: 'Meals, Drinks, Snacks, Orders; table/order notes',
    emoji: '🍽️',
    defaultUnit: 'pcs',
    starterCategories: [
      {
        name: 'Meals',
        subcategories: [
          'Breakfast & Combos',
          'Main Dishes & Grills',
          'Fish & Chicken',
          'Rice, Ugali & Sides',
        ],
      },
      {
        name: 'Drinks',
        subcategories: [
          'Tea, Coffee & Chai',
          'Fresh Juices & Smoothies',
          'Sodas & Water',
          'Milkshakes & Iced Drinks',
        ],
      },
      {
        name: 'Snacks',
        subcategories: ['Mandazi & Samosas', 'Cakes & Pastries', 'Burgers & Sandwiches', 'Chips & Bites'],
      },
      {
        name: 'Orders',
        subcategories: ['Takeaway Packs', 'Table Specials', 'Platters & Catering'],
      },
    ],
    itemHints: {
      namePlaceholder: 'e.g. Grilled Tilapia & Ugali, Masala Chai Cup, Beef Burger...',
      variantLabel: 'Portion / Table / Order Note',
      variantPlaceholder: 'e.g. Full Plate, Takeaway Box, Extra Spicy, 500ml Cup',
      subcategoryPlaceholder: 'e.g. Breakfast, Main Dishes, Hot Drinks...',
      helperBanner:
        'Hospitality tip: Add portion or prep notes in the variant field and use checkout notes for Table # or takeaway instructions.',
      unitHint: 'pcs / bottle / pack',
    },
  },
  {
    id: 'general',
    label: 'General Shop / Mini-Mart',
    shortLabel: 'General Shop',
    subtitle: 'Groceries, Household, Beverages; quick barcode retail',
    emoji: '🛒',
    defaultUnit: 'pcs',
    starterCategories: [
      {
        name: 'Groceries',
        subcategories: [
          'Flour, Rice & Sugar',
          'Cooking Oil & Fats',
          'Tea, Coffee & Spices',
          'Bread, Eggs & Dairy',
        ],
      },
      {
        name: 'Household',
        subcategories: [
          'Soaps & Detergents',
          'Tissue & Cleaning',
          'Kitchenware & Storage',
          'Personal Hygiene',
        ],
      },
      {
        name: 'Beverages',
        subcategories: ['Sodas & Juices', 'Bottled Water', 'Energy Drinks', 'Milk & Yoghurt'],
      },
      {
        name: 'Snacks & Quick Retail',
        subcategories: ['Biscuits & Sweets', 'Crisps & Nuts', 'Airtime & Scratch Cards'],
      },
    ],
    itemHints: {
      namePlaceholder: 'e.g. Maize Flour 2kg, Fresh Milk 500ml, Washing Powder 1kg...',
      variantLabel: 'Pack Size / Weight / Variant',
      variantPlaceholder: 'e.g. 500ml, 1kg, 2kg Bale, Pack of 12',
      subcategoryPlaceholder: 'e.g. Cold Drinks, Dairy, Detergents...',
      helperBanner:
        'Mini-Mart tip: Scan manufacturer barcodes into Item QR / Barcode for fast POS checkout.',
      unitHint: 'pcs / pack / kg',
    },
  },
  {
    id: 'electronics',
    label: 'Electronics & Phone Accessories',
    shortLabel: 'Electronics',
    subtitle: 'Phones, Accessories, Audio, Repairs; IMEI/serial/warranty notes',
    emoji: '📱',
    defaultUnit: 'pcs',
    starterCategories: [
      {
        name: 'Phones',
        subcategories: ['Smartphones', 'Feature Phones (Kabambe)', 'Tablets & Smartwatches'],
      },
      {
        name: 'Accessories',
        subcategories: [
          'Chargers & Fast Cables',
          'Phone Covers & Cases',
          'Screen Protectors',
          'Power Banks & Solar',
          'Memory Cards & Flash Drives',
        ],
      },
      {
        name: 'Audio',
        subcategories: [
          'Earphones & AirPods',
          'Bluetooth Speakers',
          'Home Audio & TVs',
          'Microphones & Stands',
        ],
      },
      {
        name: 'Repairs',
        subcategories: [
          'Screens & LCDs',
          'Replacement Batteries',
          'Charging Ports & Spares',
          'Diagnostics & Repair Service',
        ],
      },
    ],
    itemHints: {
      namePlaceholder: 'e.g. Samsung Galaxy A15 128GB, Oraimo Power Bank 20000mAh...',
      variantLabel: 'IMEI / Serial / Warranty Note',
      variantPlaceholder: 'e.g. 128GB / 12-Month Warranty / Serial / Dual SIM',
      subcategoryPlaceholder: 'e.g. Smartphones, Chargers, Speakers...',
      helperBanner:
        'Electronics tip: Capture storage/warranty notes above and record IMEI or serial numbers in Barcode/SKU or checkout notes.',
      unitHint: 'pcs / box',
    },
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy / Agrovet / Other',
    shortLabel: 'Pharmacy / Agrovet',
    subtitle: 'Health/Farm supplies; automatically suggests expiry tracking',
    emoji: '💊',
    defaultUnit: 'pack',
    suggestExpiryTracking: true,
    starterCategories: [
      {
        name: 'Pharmacy & Health',
        subcategories: [
          'Pain & Fever Relief',
          'Antibiotics & Treatments',
          'Vitamins & Supplements',
          'First Aid & Surgical',
        ],
      },
      {
        name: 'Agrovet & Animal Health',
        subcategories: [
          'Dewormers & Vaccines',
          'Mineral Licks & Supplements',
          'Poultry & Dairy Care',
          'Acaricides & Tick Control',
        ],
      },
      {
        name: 'Farm Inputs & Seeds',
        subcategories: [
          'Certified Seeds',
          'Fertilizers & Foliar Feeds',
          'Crop Protection',
          'Sprayers & Farm Tools',
        ],
      },
      {
        name: 'Personal & Baby Care',
        subcategories: ['Mother & Baby', 'Skincare & Antiseptics', 'Masks & Sanitizers'],
      },
    ],
    itemHints: {
      namePlaceholder: 'e.g. Paracetamol 500mg Strip, Dairy Mineral Lick 2kg, Dewormer 100ml...',
      variantLabel: 'Dosage / Batch / Pack Note',
      variantPlaceholder: 'e.g. 500mg x10 Tabs, 100ml Vial, Batch #B2409, 2kg Pack',
      subcategoryPlaceholder: 'e.g. Pain Relief, Dewormers, Seeds...',
      helperBanner:
        'Pharmacy / Agrovet tip: Expiry date tracking is strongly recommended — fill in Expiry Date below for automatic expiry warnings!',
      unitHint: 'pack / bottle / pcs',
    },
  },
];

export function isValidBusinessTypeId(value: unknown): value is BusinessTypeId {
  return (
    typeof value === 'string' &&
    BUSINESS_TYPES.some((bt) => bt.id === value)
  );
}

export function getBusinessTypeConfig(id?: string | null): BusinessTypeConfig {
  const found = BUSINESS_TYPES.find((bt) => bt.id === id);
  return found || BUSINESS_TYPES.find((bt) => bt.id === DEFAULT_BUSINESS_TYPE)!;
}

export interface CategoryRecord {
  id: string;
  name: string;
  subcategories: string[];
}

/**
 * Non-destructively merges starter categories for a business type into existing categories.
 * Never removes or overwrites existing categories, products, or sales.
 */
export function mergeStarterCategories(
  existingCategories: CategoryRecord[] | any[],
  businessTypeId: BusinessTypeId,
  options?: { prioritizeNew?: boolean }
): {
  nextCategories: CategoryRecord[];
  addedCategoriesCount: number;
  addedSubcategoriesCount: number;
} {
  const config = getBusinessTypeConfig(businessTypeId);
  const currentList: CategoryRecord[] = Array.isArray(existingCategories)
    ? existingCategories
        .filter((c) => c && typeof c.name === 'string' && c.name.trim().length > 0)
        .map((c) => ({
          id: String(c.id || `cat-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`),
          name: String(c.name).trim(),
          subcategories: Array.isArray(c.subcategories) && c.subcategories.length > 0
            ? c.subcategories.map((s: any) => String(s).trim()).filter(Boolean)
            : ['General'],
        }))
    : [];

  let addedCategoriesCount = 0;
  let addedSubcategoriesCount = 0;
  const newlyCreated: CategoryRecord[] = [];
  const merged = currentList.map((c) => ({
    ...c,
    subcategories: [...c.subcategories],
  }));

  config.starterCategories.forEach((starter, idx) => {
    const existingIdx = merged.findIndex(
      (c) => c.name.toLowerCase() === starter.name.toLowerCase()
    );
    if (existingIdx === -1) {
      const slug = starter.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      newlyCreated.push({
        id: `cat-${config.id}-${slug}-${Date.now()}-${idx}`,
        name: starter.name,
        subcategories: [...starter.subcategories],
      });
      addedCategoriesCount += 1;
      addedSubcategoriesCount += starter.subcategories.length;
    } else {
      const target = merged[existingIdx];
      starter.subcategories.forEach((sub) => {
        const hasSub = target.subcategories.some(
          (existingSub) => existingSub.toLowerCase() === sub.toLowerCase()
        );
        if (!hasSub) {
          target.subcategories.push(sub);
          addedSubcategoriesCount += 1;
        }
      });
    }
  });

  const nextCategories = options?.prioritizeNew
    ? [...newlyCreated, ...merged]
    : [...merged, ...newlyCreated];

  return {
    nextCategories,
    addedCategoriesCount,
    addedSubcategoriesCount,
  };
}
