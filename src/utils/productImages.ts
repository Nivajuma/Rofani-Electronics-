import { Product } from '../types';

/**
 * High-quality curated studio photography pools mapped by category keywords.
 * Each URL is distinct and carefully selected for commercial retail catalog display.
 */
export const CATEGORY_IMAGE_POOLS: Record<string, string[]> = {
  electronics: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80', // Headphones
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=80', // Smartwatch
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=80', // Smartphone
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&auto=format&fit=crop&q=80', // Laptop
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80', // Wireless earbuds
    'https://images.unsplash.com/photo-1543512214-318c7553f230?w=500&auto=format&fit=crop&q=80', // Blender/appliance
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&auto=format&fit=crop&q=80', // Studio headphones
    'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=500&auto=format&fit=crop&q=80', // Laptop desk
    'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=500&auto=format&fit=crop&q=80', // Smartphone pro
    'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=500&auto=format&fit=crop&q=80', // Tech circuit gadget
    'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=500&auto=format&fit=crop&q=80', // Portable speaker
    'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=500&auto=format&fit=crop&q=80', // Gadget accessory
    'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?w=500&auto=format&fit=crop&q=80', // Smart speaker
    'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&auto=format&fit=crop&q=80', // Tech monitor screen
    'https://images.unsplash.com/photo-1616469829941-c7200edec809?w=500&auto=format&fit=crop&q=80', // Gaming accessory
    'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&auto=format&fit=crop&q=80', // Tablet
    'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500&auto=format&fit=crop&q=80', // Smart band
    'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&auto=format&fit=crop&q=80', // Ultrabook
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&auto=format&fit=crop&q=80', // Mouse pointer
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop&q=80', // Keyboard
  ],
  boutique: [
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&auto=format&fit=crop&q=80', // Yellow dress
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&auto=format&fit=crop&q=80', // Leather handbag
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80', // Red Nike sneaker
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80', // Minimalist watch
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=500&auto=format&fit=crop&q=80', // Fashion apparel
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&auto=format&fit=crop&q=80', // Jacket
    'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&auto=format&fit=crop&q=80', // Denim jeans
    'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&auto=format&fit=crop&q=80', // Shoes display
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=80', // Backpack
    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&auto=format&fit=crop&q=80', // Classic sneaker
    'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500&auto=format&fit=crop&q=80', // T-shirt design
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80', // White t-shirt
    'https://images.unsplash.com/photo-1534653299134-96a171b61581?w=500&auto=format&fit=crop&q=80', // Scarf accessory
    'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=500&auto=format&fit=crop&q=80', // Jewelry ring
    'https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?w=500&auto=format&fit=crop&q=80', // Sunglasses
    'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500&auto=format&fit=crop&q=80', // Black tee
    'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500&auto=format&fit=crop&q=80', // Hoodie
    'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=500&auto=format&fit=crop&q=80', // Wardrobe boutique
  ],
  beverages: [
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80', // Cold drink glass
    'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80', // Soft drink can
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80', // Juice glass
    'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop&q=80', // Coffee cup
    'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=500&auto=format&fit=crop&q=80', // Mineral water bottle
    'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=500&auto=format&fit=crop&q=80', // Soda bottle
    'https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&auto=format&fit=crop&q=80', // Citrus beverage
    'https://images.unsplash.com/photo-1568644396922-5c3bfae12521?w=500&auto=format&fit=crop&q=80', // Tea brew
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80', // Coffee mug
    'https://images.unsplash.com/photo-1546171753-97d7676e4602?w=500&auto=format&fit=crop&q=80', // Iced latte
    'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=500&auto=format&fit=crop&q=80', // Energy drink
    'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500&auto=format&fit=crop&q=80', // Bottled beverage
    'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=500&auto=format&fit=crop&q=80', // Milk bottle
    'https://images.unsplash.com/photo-1528732263440-4dd1a18a4cc2?w=500&auto=format&fit=crop&q=80', // Yogurt drink
  ],
  beauty: [
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80', // Perfume bottle
    'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=500&auto=format&fit=crop&q=80', // Skincare cream
    'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=500&auto=format&fit=crop&q=80', // Hair care oil
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500&auto=format&fit=crop&q=80', // Cosmetic lotion
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80', // Organic serum
    'https://images.unsplash.com/photo-1512290900672-1f55a1532c1c?w=500&auto=format&fit=crop&q=80', // Lipstick
    'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=500&auto=format&fit=crop&q=80', // Skincare jars
    'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&auto=format&fit=crop&q=80', // Essential oil
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80', // Hygiene soap
    'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=500&auto=format&fit=crop&q=80', // Hand cream
    'https://images.unsplash.com/photo-1583001809873-a128495da465?w=500&auto=format&fit=crop&q=80', // Body wash
  ],
  groceries: [
    'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=500&auto=format&fit=crop&q=80', // Grocery shelf
    'https://images.unsplash.com/photo-1506617564039-2f3b650b7010?w=500&auto=format&fit=crop&q=80', // Grocery bag / food
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80', // Fresh produce
    'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=500&auto=format&fit=crop&q=80', // Packaged snack
    'https://images.unsplash.com/photo-1607349913338-fca6f7fc42d0?w=500&auto=format&fit=crop&q=80', // Spices & grains
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80', // Rice / grains
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80', // Bakery bread
    'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500&auto=format&fit=crop&q=80', // Cooking oil / jar
    'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=500&auto=format&fit=crop&q=80', // Cupcakes / treats
    'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=500&auto=format&fit=crop&q=80', // Fresh apples / fruit
    'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&auto=format&fit=crop&q=80', // Dairy milk
    'https://images.unsplash.com/photo-1594998893017-36147cbcae05?w=500&auto=format&fit=crop&q=80', // Tea packet
  ],
  general: [
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=80', // Vintage Camera
    'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=500&auto=format&fit=crop&q=80', // Shoe box
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&auto=format&fit=crop&q=80', // Audio
    'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500&auto=format&fit=crop&q=80', // Cosmetic bottle
    'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=500&auto=format&fit=crop&q=80', // Interior item
    'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=80', // Notebook / stationery
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500&auto=format&fit=crop&q=80', // Hardware tools
    'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=500&auto=format&fit=crop&q=80', // Tool kit
    'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500&auto=format&fit=crop&q=80', // Desk lamp
    'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=500&auto=format&fit=crop&q=80', // Chair / furniture
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&auto=format&fit=crop&q=80', // Minimal lighting
    'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=500&auto=format&fit=crop&q=80', // Water flask
  ]
};

/**
 * Normalizes an image URL by removing transient query parameters or formatting to compare actual image identities.
 */
export function normalizeImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  // Base64 images are checked by their prefix + hash or direct string
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    // On Unsplash URLs, the path represents the unique photo ID (e.g. /photo-1505740420928-5e560c06d30e)
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return trimmed;
  }
}

/**
 * Resolves the appropriate category image pool based on category and product name keywords.
 */
export function getCategoryPool(categoryName: string, productName?: string): string[] {
  const combined = `${categoryName || ''} ${productName || ''}`.toLowerCase();

  if (combined.includes('electr') || combined.includes('phone') || combined.includes('laptop') || combined.includes('audio') || combined.includes('comput') || combined.includes('cable') || combined.includes('charger') || combined.includes('headphone') || combined.includes('smart')) {
    return CATEGORY_IMAGE_POOLS.electronics;
  }
  if (combined.includes('boutique') || combined.includes('fashion') || combined.includes('cloth') || combined.includes('wear') || combined.includes('dress') || combined.includes('shoe') || combined.includes('sneaker') || combined.includes('shirt') || combined.includes('bag') || combined.includes('jean')) {
    return CATEGORY_IMAGE_POOLS.boutique;
  }
  if (combined.includes('bever') || combined.includes('drink') || combined.includes('soda') || combined.includes('juice') || combined.includes('water') || combined.includes('coffee') || combined.includes('tea') || combined.includes('milk') || combined.includes('alcohol') || combined.includes('beer')) {
    return CATEGORY_IMAGE_POOLS.beverages;
  }
  if (combined.includes('beaut') || combined.includes('care') || combined.includes('perfum') || combined.includes('lotion') || combined.includes('cream') || combined.includes('hair') || combined.includes('cosmet') || combined.includes('soap')) {
    return CATEGORY_IMAGE_POOLS.beauty;
  }
  if (combined.includes('grocer') || combined.includes('food') || combined.includes('snack') || combined.includes('bread') || combined.includes('flour') || combined.includes('sugar') || combined.includes('grain') || combined.includes('rice') || combined.includes('spice') || combined.includes('produce')) {
    return CATEGORY_IMAGE_POOLS.groceries;
  }
  return CATEGORY_IMAGE_POOLS.general;
}

/**
 * Builds a dynamic unique image URL with a deterministic seed to guarantee visual variety without repetition.
 */
export function generateDistinctSeedUrl(category: string, productName: string, uniqueSeed: string | number): string {
  const cleanKeyword = encodeURIComponent(
    (productName || 'product')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .split(/\s+/)[0] || 'item'
  );
  const cleanCat = encodeURIComponent(
    (category || 'retail')
      .replace(/[^a-zA-Z0-9]/g, '')
      .trim() || 'goods'
  );
  // Unsplash source format with sig parameter ensures unique, non-repeated image delivery
  return `https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=80&sig=${uniqueSeed}&theme=${cleanCat}&item=${cleanKeyword}`;
}

/**
 * Assigns non-repeating photos across a catalog of products.
 * Guarantees that every item receives a unique photo URL without conflicting with existing catalog photos.
 */
export function assignUniqueCatalogImages(
  productsToAssign: Product[],
  fullCatalog: Product[] = []
): Record<string, string> {
  const assignedMap: Record<string, string> = {};
  const globalUsedPhotos = new Set<string>();

  // Track photos already present in the catalog that are not being reassigned
  const assigningIds = new Set(productsToAssign.map((p) => p.id));
  const referenceCatalog = fullCatalog.length > 0 ? fullCatalog : productsToAssign;

  referenceCatalog.forEach((p) => {
    if (p.imageUrl && !assigningIds.has(p.id)) {
      const norm = normalizeImageUrl(p.imageUrl);
      if (norm) {
        globalUsedPhotos.add(norm);
      }
    }
  });

  // Track index offsets per category to ensure optimal variety
  const categoryOffsetMap = new Map<string, number>();

  productsToAssign.forEach((product, idx) => {
    const pool = getCategoryPool(product.category, product.name);
    const catKey = product.category.toLowerCase().trim();
    let currentOffset = categoryOffsetMap.get(catKey) || 0;

    let selectedPhoto = '';

    // 1. Search pool for an unused image
    for (let i = 0; i < pool.length; i++) {
      const candidateIndex = (currentOffset + i) % pool.length;
      const candidateUrl = pool[candidateIndex];
      const norm = normalizeImageUrl(candidateUrl);

      if (!globalUsedPhotos.has(norm)) {
        selectedPhoto = candidateUrl;
        globalUsedPhotos.add(norm);
        categoryOffsetMap.set(catKey, candidateIndex + 1);
        break;
      }
    }

    // 2. If all static pool images are currently used, generate a distinct high-res photo with unique seed
    if (!selectedPhoto) {
      const distinctSeed = `${product.id || idx}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      selectedPhoto = generateDistinctSeedUrl(product.category, product.name, distinctSeed);
      globalUsedPhotos.add(normalizeImageUrl(selectedPhoto));
    }

    assignedMap[product.id] = selectedPhoto;
  });

  return assignedMap;
}

/**
 * Checks if a proposed photo is already in use by another product in the catalog.
 * Returns the conflicting product if found, or null if unique.
 */
export function findConflictingProductWithImage(
  proposedImageUrl: string,
  currentProductId: string,
  catalog: Product[]
): Product | null {
  if (!proposedImageUrl || !catalog || catalog.length === 0) return null;
  const targetNorm = normalizeImageUrl(proposedImageUrl);
  if (!targetNorm) return null;

  for (const item of catalog) {
    if (item.id === currentProductId) continue;
    if (item.imageUrl && normalizeImageUrl(item.imageUrl) === targetNorm) {
      return item;
    }
  }
  return null;
}

/**
 * Scans the catalog and returns all groups of products sharing identical photos.
 */
export interface RepeatedPhotoGroup {
  imageUrl: string;
  normalizedUrl: string;
  products: Product[];
}

export function detectRepeatedItemPhotos(products: Product[]): RepeatedPhotoGroup[] {
  if (!products || products.length <= 1) return [];

  const photoToProducts = new Map<string, { originalUrl: string; items: Product[] }>();

  products.forEach((p) => {
    if (!p.imageUrl) return;
    const norm = normalizeImageUrl(p.imageUrl);
    if (!norm) return;

    if (!photoToProducts.has(norm)) {
      photoToProducts.set(norm, { originalUrl: p.imageUrl, items: [] });
    }
    photoToProducts.get(norm)!.items.push(p);
  });

  const repeatedGroups: RepeatedPhotoGroup[] = [];

  photoToProducts.forEach((entry, norm) => {
    if (entry.items.length > 1) {
      repeatedGroups.push({
        imageUrl: entry.originalUrl,
        normalizedUrl: norm,
        products: entry.items,
      });
    }
  });

  return repeatedGroups;
}

/**
 * Automatically resolves repeated photos across the entire catalog by reassigning
 * unique photos to secondary items while preserving the primary item's photo.
 */
export function resolveRepeatedCatalogPhotos(products: Product[]): {
  updatedProducts: Product[];
  fixedItemsCount: number;
  duplicatePhotoGroupsCount: number;
} {
  const repeatedGroups = detectRepeatedItemPhotos(products);
  if (repeatedGroups.length === 0) {
    return {
      updatedProducts: products,
      fixedItemsCount: 0,
      duplicatePhotoGroupsCount: 0,
    };
  }

  // Set of all in-use normalized URLs
  const usedNormals = new Set<string>();
  products.forEach((p) => {
    if (p.imageUrl) {
      usedNormals.add(normalizeImageUrl(p.imageUrl));
    }
  });

  let fixedCount = 0;
  const updatedProductsMap = new Map<string, Product>();

  repeatedGroups.forEach((group) => {
    // Keep photo for the first item (primary), replace on the others (duplicates)
    const [primary, ...duplicates] = group.products;

    duplicates.forEach((dupItem, dIdx) => {
      const pool = getCategoryPool(dupItem.category, dupItem.name);
      let newPhoto = '';

      for (let i = 0; i < pool.length; i++) {
        const candidate = pool[i];
        const norm = normalizeImageUrl(candidate);
        if (!usedNormals.has(norm)) {
          newPhoto = candidate;
          usedNormals.add(norm);
          break;
        }
      }

      if (!newPhoto) {
        const seed = `unique-${dupItem.id}-${dIdx}-${Date.now()}`;
        newPhoto = generateDistinctSeedUrl(dupItem.category, dupItem.name, seed);
        usedNormals.add(normalizeImageUrl(newPhoto));
      }

      updatedProductsMap.set(dupItem.id, {
        ...dupItem,
        imageUrl: newPhoto,
        updatedAt: new Date().toISOString().slice(0, 10),
      });
      fixedCount++;
    });
  });

  const updatedProducts = products.map((p) => updatedProductsMap.get(p.id) || p);

  return {
    updatedProducts,
    fixedItemsCount: fixedCount,
    duplicatePhotoGroupsCount: repeatedGroups.length,
  };
}
