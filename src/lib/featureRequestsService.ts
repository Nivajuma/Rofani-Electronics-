import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  isAuthorizedCloudUser,
  isOwnerCloudUser,
  isQuotaExceededError,
  OperationType,
} from './firebase';
import { withFirestoreTimeout } from './cloudSync';
import { safeGetJSON, safeSetJSON } from '../utils/safeStorage';
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP_TEL } from '../utils/supportConfig';
import {
  FeatureRequest,
  FeatureRequestCategory,
  FeatureRequestPriority,
  FeatureRequestStatus,
} from '../types';

export const FEATURE_REQUEST_CATEGORIES: readonly FeatureRequestCategory[] = [
  'POS & Checkout',
  'M-Pesa & Payments',
  'Inventory & Stock',
  'Reports & Tax',
  'Multi-Shop & Staff',
  'Custom Integration',
  'Other',
] as const;

export const FEATURE_REQUEST_PRIORITIES: readonly FeatureRequestPriority[] = [
  'Nice to Have',
  'Important for My Shop',
  'Urgent Custom Build',
] as const;

export const FEATURE_REQUEST_STATUSES: readonly FeatureRequestStatus[] = [
  'Pending',
  'Planned',
  'In Progress',
  'Completed',
  'Declined',
] as const;

// Synchronized verbatim with firebase-blueprint.json & firestore.rules
export const FEATURE_REQUEST_BOUNDS = {
  idMax: 128,
  idPattern: /^[a-zA-Z0-9_-]+$/,
  ownerEmailMax: 200,
  storeNameMin: 1,
  storeNameMax: 200,
  subjectMin: 3,
  subjectMax: 140,
  descriptionMin: 10,
  descriptionMax: 1500,
  contactPhoneMax: 64,
  contactNameMax: 120,
  adminNotesMax: 1000,
} as const;

const LOCAL_FEATURE_REQUESTS_KEY = 'rofani_pos_feature_requests_local';
const COLLECTION_NAME = 'feature_requests';

function toIsoString(value: unknown, fallbackIso: string): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value && typeof (value as any).toDate === 'function') {
    try {
      return (value as any).toDate().toISOString();
    } catch {
      return fallbackIso;
    }
  }
  return fallbackIso;
}

function normalizeDocSnapshot(id: string, data: Record<string, any>): FeatureRequest {
  const nowIso = new Date().toISOString();
  return {
    id,
    ownerUid: String(data.ownerUid || ''),
    ownerEmail: String(data.ownerEmail || ''),
    storeId: String(data.storeId || ''),
    storeName: String(data.storeName || 'Rofani Shop'),
    subject: String(data.subject || ''),
    category: FEATURE_REQUEST_CATEGORIES.includes(data.category)
      ? data.category
      : 'Other',
    priority: FEATURE_REQUEST_PRIORITIES.includes(data.priority)
      ? data.priority
      : 'Important for My Shop',
    description: String(data.description || ''),
    contactPhone: typeof data.contactPhone === 'string' ? data.contactPhone : undefined,
    contactName: typeof data.contactName === 'string' ? data.contactName : undefined,
    status: FEATURE_REQUEST_STATUSES.includes(data.status)
      ? data.status
      : 'Pending',
    adminNotes: typeof data.adminNotes === 'string' ? data.adminNotes : undefined,
    createdAt: toIsoString(data.createdAt, nowIso),
    updatedAt: toIsoString(data.updatedAt, nowIso),
    pendingCloudSync: false,
  };
}

function sortNewestFirst(items: FeatureRequest[]): FeatureRequest[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

export function loadLocalFeatureRequests(): FeatureRequest[] {
  const saved = safeGetJSON<FeatureRequest[]>(LOCAL_FEATURE_REQUESTS_KEY, []);
  return Array.isArray(saved) ? sortNewestFirst(saved) : [];
}

function saveLocalFeatureRequests(items: FeatureRequest[]): void {
  safeSetJSON(LOCAL_FEATURE_REQUESTS_KEY, sortNewestFirst(items).slice(0, 100));
}

function mergeWithPendingLocal(cloudItems: FeatureRequest[]): FeatureRequest[] {
  const local = loadLocalFeatureRequests();
  const cloudIds = new Set(cloudItems.map((c) => c.id));
  const pendingLocal = local.filter((l) => l.pendingCloudSync && !cloudIds.has(l.id));
  const merged = sortNewestFirst([...cloudItems, ...pendingLocal]);
  saveLocalFeatureRequests(merged);
  return merged;
}

export interface SubmitFeatureRequestInput {
  subject: string;
  category: FeatureRequestCategory;
  priority: FeatureRequestPriority;
  description: string;
  storeName?: string;
  contactPhone?: string;
  contactName?: string;
}

export function validateFeatureRequestInput(input: SubmitFeatureRequestInput): string | null {
  const subject = input.subject.trim();
  const description = input.description.trim();

  if (subject.length < FEATURE_REQUEST_BOUNDS.subjectMin) {
    return `Please enter a feature subject (at least ${FEATURE_REQUEST_BOUNDS.subjectMin} characters).`;
  }
  if (subject.length > FEATURE_REQUEST_BOUNDS.subjectMax) {
    return `Feature subject must be ${FEATURE_REQUEST_BOUNDS.subjectMax} characters or fewer.`;
  }
  if (!FEATURE_REQUEST_CATEGORIES.includes(input.category)) {
    return 'Please select a valid feature category.';
  }
  if (!FEATURE_REQUEST_PRIORITIES.includes(input.priority)) {
    return 'Please select a valid priority level.';
  }
  if (description.length < FEATURE_REQUEST_BOUNDS.descriptionMin) {
    return `Please describe how the feature should work (at least ${FEATURE_REQUEST_BOUNDS.descriptionMin} characters).`;
  }
  if (description.length > FEATURE_REQUEST_BOUNDS.descriptionMax) {
    return `Feature details must be ${FEATURE_REQUEST_BOUNDS.descriptionMax} characters or fewer.`;
  }
  return null;
}

export async function submitFeatureRequest(input: SubmitFeatureRequestInput): Promise<{
  request: FeatureRequest;
  syncedToCloud: boolean;
  notice?: string;
}> {
  const validationError = validateFeatureRequestInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const nowIso = new Date().toISOString();
  const rand = Math.random().toString(36).slice(2, 8);
  const id = `feat-${Date.now()}-${rand}`.slice(0, FEATURE_REQUEST_BOUNDS.idMax);

  const user = auth.currentUser;
  const canUseCloud = isAuthorizedCloudUser(user) && Boolean(user?.uid) && Boolean(user?.email);
  const ownerUid = (user?.uid || 'local-merchant').slice(0, FEATURE_REQUEST_BOUNDS.idMax);
  const ownerEmail = (user?.email || 'merchant@rofanipos.local')
    .trim()
    .toLowerCase()
    .slice(0, FEATURE_REQUEST_BOUNDS.ownerEmailMax);

  // Use authenticated user's UID as canonical storeId (matches /stores/{uid} and firestore.rules)
  const storeId = ownerUid;
  const storeName = (input.storeName?.trim() || 'Rofani Shop').slice(0, FEATURE_REQUEST_BOUNDS.storeNameMax);
  const subject = input.subject.trim().slice(0, FEATURE_REQUEST_BOUNDS.subjectMax);
  const description = input.description.trim().slice(0, FEATURE_REQUEST_BOUNDS.descriptionMax);
  const contactPhone = input.contactPhone?.trim()
    ? input.contactPhone.trim().slice(0, FEATURE_REQUEST_BOUNDS.contactPhoneMax)
    : undefined;
  const contactName = input.contactName?.trim()
    ? input.contactName.trim().slice(0, FEATURE_REQUEST_BOUNDS.contactNameMax)
    : undefined;

  const localRecord: FeatureRequest = {
    id,
    ownerUid,
    ownerEmail,
    storeId,
    storeName,
    subject,
    category: input.category,
    priority: input.priority,
    description,
    ...(contactPhone ? { contactPhone } : {}),
    ...(contactName ? { contactName } : {}),
    status: 'Pending',
    createdAt: nowIso,
    updatedAt: nowIso,
    pendingCloudSync: true,
  };

  // Persist immediately in local tenant storage for instant offline resilience
  const existingLocal = loadLocalFeatureRequests();
  saveLocalFeatureRequests([localRecord, ...existingLocal.filter((r) => r.id !== id)]);

  if (!canUseCloud) {
    return {
      request: localRecord,
      syncedToCloud: false,
      notice:
        'Saved locally on this device. Sign in with your verified Google store account or send directly via WhatsApp/Email below.',
    };
  }

  const path = `${COLLECTION_NAME}/${id}`;
  const firestorePayload: Record<string, any> = {
    id,
    ownerUid,
    ownerEmail,
    storeId,
    storeName,
    subject,
    category: input.category,
    priority: input.priority,
    description,
    status: 'Pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (contactPhone) firestorePayload.contactPhone = contactPhone;
  if (contactName) firestorePayload.contactName = contactName;

  try {
    await withFirestoreTimeout(
      setDoc(doc(db, COLLECTION_NAME, id), firestorePayload),
      'submitting your feature request'
    );

    const syncedRecord: FeatureRequest = { ...localRecord, pendingCloudSync: false };
    saveLocalFeatureRequests([
      syncedRecord,
      ...loadLocalFeatureRequests().filter((r) => r.id !== id),
    ]);
    return { request: syncedRecord, syncedToCloud: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);

    const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (
      isQuotaExceededError(error) ||
      msg.includes('offline') ||
      msg.includes('timed out') ||
      msg.includes('unavailable') ||
      msg.includes('network')
    ) {
      return {
        request: localRecord,
        syncedToCloud: false,
        notice:
          'Saved locally while offline or cloud-busy. We will sync it automatically, or you can send via WhatsApp right now.',
      };
    }
    throw error;
  }
}

export async function syncPendingFeatureRequestsToCloud(): Promise<number> {
  const user = auth.currentUser;
  if (!isAuthorizedCloudUser(user) || !user?.uid || !user?.email) {
    return 0;
  }

  const pending = loadLocalFeatureRequests().filter((r) => r.pendingCloudSync);
  if (pending.length === 0) return 0;

  let syncedCount = 0;
  for (const item of pending) {
    const path = `${COLLECTION_NAME}/${item.id}`;
    const payload: Record<string, any> = {
      id: item.id,
      ownerUid: user.uid,
      ownerEmail: user.email.trim().toLowerCase().slice(0, FEATURE_REQUEST_BOUNDS.ownerEmailMax),
      storeId: user.uid,
      storeName: (item.storeName || 'Rofani Shop').slice(0, FEATURE_REQUEST_BOUNDS.storeNameMax),
      subject: item.subject.slice(0, FEATURE_REQUEST_BOUNDS.subjectMax),
      category: item.category,
      priority: item.priority,
      description: item.description.slice(0, FEATURE_REQUEST_BOUNDS.descriptionMax),
      status: 'Pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (item.contactPhone) {
      payload.contactPhone = item.contactPhone.slice(0, FEATURE_REQUEST_BOUNDS.contactPhoneMax);
    }
    if (item.contactName) {
      payload.contactName = item.contactName.slice(0, FEATURE_REQUEST_BOUNDS.contactNameMax);
    }

    try {
      await withFirestoreTimeout(setDoc(doc(db, COLLECTION_NAME, item.id), payload), 'syncing feature request', 8000);
      syncedCount++;
      const current = loadLocalFeatureRequests().map((r) =>
        r.id === item.id ? { ...r, ownerUid: user.uid, storeId: user.uid, pendingCloudSync: false } : r
      );
      saveLocalFeatureRequests(current);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      break;
    }
  }
  return syncedCount;
}

export function subscribeToMyFeatureRequests(
  onUpdate: (requests: FeatureRequest[]) => void,
  onError?: (err: any) => void
): () => void {
  const user = auth.currentUser;
  if (!isAuthorizedCloudUser(user) || !user?.uid) {
    onUpdate(loadLocalFeatureRequests());
    return () => {};
  }

  const q = query(collection(db, COLLECTION_NAME), where('ownerUid', '==', user.uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const cloudItems: FeatureRequest[] = [];
      snapshot.forEach((d) => {
        cloudItems.push(normalizeDocSnapshot(d.id, d.data() as Record<string, any>));
      });
      onUpdate(mergeWithPendingLocal(cloudItems));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      if (onError) onError(error);
    }
  );
}

export async function fetchMyFeatureRequests(): Promise<FeatureRequest[]> {
  const user = auth.currentUser;
  if (!isAuthorizedCloudUser(user) || !user?.uid) {
    return loadLocalFeatureRequests();
  }

  try {
    const q = query(collection(db, COLLECTION_NAME), where('ownerUid', '==', user.uid));
    const snap = await withFirestoreTimeout(getDocs(q), 'loading your feature requests', 10000);
    const cloudItems: FeatureRequest[] = [];
    snap.forEach((d) => {
      cloudItems.push(normalizeDocSnapshot(d.id, d.data() as Record<string, any>));
    });
    return mergeWithPendingLocal(cloudItems);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    return loadLocalFeatureRequests();
  }
}

export async function deleteMyPendingFeatureRequest(requestId: string): Promise<void> {
  const remaining = loadLocalFeatureRequests().filter((r) => r.id !== requestId);
  saveLocalFeatureRequests(remaining);

  const user = auth.currentUser;
  if (!isAuthorizedCloudUser(user) || !user?.uid) {
    return;
  }

  const path = `${COLLECTION_NAME}/${requestId}`;
  try {
    await withFirestoreTimeout(
      deleteDoc(doc(db, COLLECTION_NAME, requestId)),
      'removing pending feature request'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ---------------- SUPER ADMIN / OWNER TRIAGE ----------------

export function subscribeToAllFeatureRequestsForAdmin(
  onUpdate: (requests: FeatureRequest[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!isOwnerCloudUser(auth.currentUser)) {
    return () => {};
  }

  return onSnapshot(
    collection(db, COLLECTION_NAME),
    (snapshot) => {
      const list: FeatureRequest[] = [];
      snapshot.forEach((d) => {
        list.push(normalizeDocSnapshot(d.id, d.data() as Record<string, any>));
      });
      onUpdate(sortNewestFirst(list));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      if (onError) onError(error);
    }
  );
}

export async function fetchAllFeatureRequestsForAdmin(): Promise<FeatureRequest[]> {
  if (!isOwnerCloudUser(auth.currentUser)) {
    throw new Error('Super Admin privileges required.');
  }

  try {
    const snap = await withFirestoreTimeout(
      getDocs(collection(db, COLLECTION_NAME)),
      'fetching all client feature requests',
      12000
    );
    const list: FeatureRequest[] = [];
    snap.forEach((d) => {
      list.push(normalizeDocSnapshot(d.id, d.data() as Record<string, any>));
    });
    return sortNewestFirst(list);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    throw error;
  }
}

export async function superAdminUpdateFeatureRequest(
  requestId: string,
  updates: { status: FeatureRequestStatus; adminNotes?: string }
): Promise<void> {
  if (!isOwnerCloudUser(auth.currentUser)) {
    throw new Error('Only the app owner can update feature request status.');
  }

  const path = `${COLLECTION_NAME}/${requestId}`;
  const cleanNotes =
    typeof updates.adminNotes === 'string'
      ? updates.adminNotes.trim().slice(0, FEATURE_REQUEST_BOUNDS.adminNotesMax)
      : undefined;

  const patch: Record<string, any> = {
    status: updates.status,
    updatedAt: serverTimestamp(),
  };
  if (cleanNotes !== undefined) {
    patch.adminNotes = cleanNotes;
  }

  try {
    await withFirestoreTimeout(
      updateDoc(doc(db, COLLECTION_NAME, requestId), patch),
      'updating feature request status'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

// ---------------- OPTIONAL DIRECT WHATSAPP / EMAIL ESCALATION ----------------

export function buildFeatureRequestWhatsAppUrl(req: {
  subject: string;
  category: string;
  priority: string;
  description: string;
  storeName?: string;
  contactPhone?: string;
}): string {
  const digits = SUPPORT_WHATSAPP_TEL.replace(/[^\d]/g, '');
  const lines = [
    `*Rofani POS — Special Feature Request*`,
    `Shop: ${req.storeName || 'Rofani Shop'}`,
    `Subject: ${req.subject}`,
    `Category: ${req.category}`,
    `Priority: ${req.priority}`,
    req.contactPhone ? `Phone: ${req.contactPhone}` : '',
    ``,
    `Details:`,
    req.description,
  ].filter(Boolean);
  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function buildFeatureRequestEmailHref(req: {
  subject: string;
  category: string;
  priority: string;
  description: string;
  storeName?: string;
  contactPhone?: string;
}): string {
  const subject = `[Rofani POS Feature Request] ${req.subject}`;
  const body = [
    `Shop Name: ${req.storeName || 'Rofani Shop'}`,
    `Category: ${req.category}`,
    `Priority: ${req.priority}`,
    req.contactPhone ? `Contact Phone: ${req.contactPhone}` : '',
    ``,
    `Feature Description:`,
    req.description,
  ]
    .filter(Boolean)
    .join('\n');
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
