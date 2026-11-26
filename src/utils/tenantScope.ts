// Multi-tenant local storage & IndexedDB scope helper
// Preserves legacy unprefixed keys for primary owner store ('rofani-pos')
// while isolating every other merchant under 'tenant__<storeId>__<key>'.

export const OWNER_PRIMARY_STORE_ID = 'rofani-pos';
export const CLIENT_DEMO_STORE_ID = 'demo-sandbox';
export const ACTIVE_SCOPE_STORAGE_KEY = 'rofani_saas_active_store_scope';
export const ACTIVE_BRANCH_CLOUD_STORE_KEY = 'rofani_saas_active_branch_cloud_store_id';
export const VERIFIED_OWNER_CACHE_KEY = 'rofani_pos_verified_owner_email';
export const CLIENT_DEMO_MODE_KEY = 'rofani_client_demo_active';

const GLOBAL_UI_KEYS = new Set<string>([
  'retail_pos_device_format',
  'retail_pos_phone_orientation',
  'retail_pos_phone_model',
  'retail_pos_display_theme',
  'retail_pos_font_scale',
  'retail_pos_sidebar_collapsed',
  'retail_pos_sound_effects',
  ACTIVE_SCOPE_STORAGE_KEY,
  ACTIVE_BRANCH_CLOUD_STORE_KEY,
  VERIFIED_OWNER_CACHE_KEY,
  CLIENT_DEMO_MODE_KEY,
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

let _activeBranchCloudStoreId: string | null = (() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(ACTIVE_BRANCH_CLOUD_STORE_KEY);
      return val && val.trim() ? val.trim() : null;
    }
  } catch {
    // Ignore storage read failures
  }
  return null;
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

export function getActiveBranchCloudStoreId(): string | null {
  return _activeBranchCloudStoreId && _activeBranchCloudStoreId.trim()
    ? _activeBranchCloudStoreId.trim()
    : null;
}

export function setActiveBranchCloudStoreId(branchStoreId: string | null | undefined): string | null {
  const next = branchStoreId && branchStoreId.trim() ? branchStoreId.trim() : null;
  _activeBranchCloudStoreId = next;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (next) {
        window.localStorage.setItem(ACTIVE_BRANCH_CLOUD_STORE_KEY, next);
      } else {
        window.localStorage.removeItem(ACTIVE_BRANCH_CLOUD_STORE_KEY);
      }
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

export function isClientDemoScope(storeId?: string | null): boolean {
  const id = (storeId || getActiveTenantStoreId() || '').trim();
  return id === CLIENT_DEMO_STORE_ID || id.startsWith(`${CLIENT_DEMO_STORE_ID}_br_`);
}

export function clearClientDemoStorage(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const keysToRemove: string[] = [];
    const demoPrefix = `tenant__${CLIENT_DEMO_STORE_ID}`;
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && (k.startsWith(demoPrefix) || k.includes(`_${CLIENT_DEMO_STORE_ID}`))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => {
      try {
        window.localStorage.removeItem(k);
      } catch {}
    });
  } catch {
    // Ignore storage cleanup errors
  }
}
