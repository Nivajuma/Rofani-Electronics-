// Multi-tenant local storage & IndexedDB scope helper
// Preserves legacy unprefixed keys for primary owner store ('rofani-pos')
// while isolating every other merchant under 'tenant__<storeId>__<key>'.

export const OWNER_PRIMARY_STORE_ID = 'rofani-pos';
export const ACTIVE_SCOPE_STORAGE_KEY = 'rofani_saas_active_store_scope';
export const VERIFIED_OWNER_CACHE_KEY = 'rofani_pos_verified_owner_email';

const GLOBAL_UI_KEYS = new Set<string>([
  'retail_pos_device_format',
  'retail_pos_phone_orientation',
  'retail_pos_phone_model',
  'retail_pos_display_theme',
  'retail_pos_font_scale',
  'retail_pos_sidebar_collapsed',
  'retail_pos_sound_effects',
  ACTIVE_SCOPE_STORAGE_KEY,
  VERIFIED_OWNER_CACHE_KEY,
]);

let _activeTenantStoreId: string = (() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(ACTIVE_SCOPE_STORAGE_KEY) || OWNER_PRIMARY_STORE_ID;
    }
  } catch {
    // Ignore storage read failures
  }
  return OWNER_PRIMARY_STORE_ID;
})();

export function getActiveTenantStoreId(): string {
  return _activeTenantStoreId || OWNER_PRIMARY_STORE_ID;
}

export function setActiveTenantStoreId(storeId: string | null | undefined): string {
  const next = storeId && storeId.trim() ? storeId.trim() : OWNER_PRIMARY_STORE_ID;
  _activeTenantStoreId = next;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ACTIVE_SCOPE_STORAGE_KEY, next);
    }
  } catch {
    // Ignore storage write failures
  }
  return next;
}

export function resolveTenantStorageKey(baseKey: string, explicitStoreId?: string | null): string {
  if (!baseKey) return baseKey;
  if (GLOBAL_UI_KEYS.has(baseKey)) return baseKey;
  if (baseKey.startsWith('tenant__')) return baseKey;

  const storeId = explicitStoreId && explicitStoreId.trim()
    ? explicitStoreId.trim()
    : getActiveTenantStoreId();

  if (!storeId || storeId === OWNER_PRIMARY_STORE_ID) {
    return baseKey;
  }

  return `tenant__${storeId}__${baseKey}`;
}
