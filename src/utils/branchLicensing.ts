import { StoreSubscriptionProfile, SubscriptionPlanType, SubscriptionStatus } from '../types';
import { OWNER_PRIMARY_STORE_ID, isSuperAdminEmail } from '../lib/firebase';

export type PaidSubscriptionPlanKey = Exclude<SubscriptionPlanType, 'trial'>;

export interface BranchPlanOption {
  id: PaidSubscriptionPlanKey;
  title: string;
  name: string;
  price: number;
  regularPrice: number;
  durationDays: number;
  subtitle: string;
  featured?: boolean;
  badge?: string;
}

export const PRIMARY_BRANCH_MONTHLY_PRICE = 500;
export const PRIMARY_BRANCH_ANNUAL_PRICE = 5000;
export const EXTRA_BRANCH_MONTHLY_PRICE = 250;
export const EXTRA_BRANCH_ANNUAL_PRICE = 2500;

export function getPlanOptionsForBranch(isExtraBranch: boolean): BranchPlanOption[] {
  if (isExtraBranch) {
    return [
      {
        id: 'monthly',
        title: '30 Days',
        name: '30 Days Branch License',
        price: EXTRA_BRANCH_MONTHLY_PRICE,
        regularPrice: PRIMARY_BRANCH_MONTHLY_PRICE,
        durationDays: 30,
        subtitle: '50% Multi-Branch Discount',
        badge: '50% OFF',
      },
      {
        id: 'quarterly',
        title: '3 Months',
        name: '3 Months Branch License',
        price: 700,
        regularPrice: 1350,
        durationDays: 90,
        subtitle: '50% Multi-Branch Discount',
      },
      {
        id: 'biannual',
        title: '6 Months',
        name: '6 Months Branch License',
        price: 1350,
        regularPrice: 2650,
        durationDays: 180,
        subtitle: '50% Multi-Branch Discount',
        featured: true,
        badge: 'POPULAR · 50% OFF',
      },
      {
        id: 'annual',
        title: '12 Months',
        name: '12 Months Branch License',
        price: EXTRA_BRANCH_ANNUAL_PRICE,
        regularPrice: PRIMARY_BRANCH_ANNUAL_PRICE,
        durationDays: 365,
        subtitle: '50% Multi-Branch Discount',
        badge: 'SAVE KSh 2,500',
      },
    ];
  }

  return [
    {
      id: 'monthly',
      title: '30 Days',
      name: '30 Days Unlimited',
      price: PRIMARY_BRANCH_MONTHLY_PRICE,
      regularPrice: PRIMARY_BRANCH_MONTHLY_PRICE,
      durationDays: 30,
      subtitle: 'Primary Shop License',
    },
    {
      id: 'quarterly',
      title: '3 Months',
      name: '3 Months Unlimited',
      price: 1350,
      regularPrice: 1350,
      durationDays: 90,
      subtitle: 'Primary Shop License',
    },
    {
      id: 'biannual',
      title: '6 Months',
      name: '6 Months Unlimited',
      price: 2650,
      regularPrice: 2650,
      durationDays: 180,
      subtitle: 'Primary Shop License',
      featured: true,
      badge: 'POPULAR',
    },
    {
      id: 'annual',
      title: '12 Months',
      name: '12 Months Unlimited',
      price: PRIMARY_BRANCH_ANNUAL_PRICE,
      regularPrice: PRIMARY_BRANCH_ANNUAL_PRICE,
      durationDays: 365,
      subtitle: 'Primary Shop License',
    },
  ];
}

export function resolveIsPrimaryBranch(
  profile: StoreSubscriptionProfile | null | undefined,
  primaryStoreId?: string | null
): boolean {
  if (!profile) return true;
  if (profile.isPrimaryBranch === true) return true;
  if (profile.isPrimaryBranch === false || profile.isBranchStore === true) return false;
  if (primaryStoreId && profile.id && profile.id !== primaryStoreId) return false;
  return true;
}

export function isMasterOwnerStore(profile: StoreSubscriptionProfile | null | undefined): boolean {
  if (!profile) return false;
  return profile.id === OWNER_PRIMARY_STORE_ID || isSuperAdminEmail(profile.ownerEmail);
}

export function getEffectiveBranchStatus(
  profile: StoreSubscriptionProfile | null | undefined,
  forceOwnerMaster: boolean = false
): SubscriptionStatus {
  if (!profile) return 'trial';
  if (forceOwnerMaster || isMasterOwnerStore(profile)) {
    return 'active';
  }
  if (profile.subscriptionStatus === 'suspended') {
    return 'suspended';
  }
  const expIso = profile.expiresAt || profile.expiryDate || '';
  const expMs = expIso ? Date.parse(expIso) : 0;
  if (
    profile.licensePendingActivation === true ||
    profile.subscriptionStatus === 'expired' ||
    (expMs > 0 && expMs <= Date.now())
  ) {
    return 'expired';
  }
  if (profile.subscriptionStatus === 'trial' || profile.planType === 'trial') {
    return 'trial';
  }
  return 'active';
}

export function isBranchLicenseUnlocked(
  profile: StoreSubscriptionProfile | null | undefined,
  forceOwnerMaster: boolean = false
): boolean {
  const status = getEffectiveBranchStatus(profile, forceOwnerMaster);
  return status === 'active' || status === 'trial';
}

export function getBranchDaysRemaining(profile: StoreSubscriptionProfile | null | undefined): number {
  const expIso = profile?.expiresAt || profile?.expiryDate || '';
  const expMs = expIso ? Date.parse(expIso) : 0;
  if (!Number.isFinite(expMs) || expMs <= Date.now()) return 0;
  return Math.max(0, Math.ceil((expMs - Date.now()) / 86400000));
}

export function getOwnerMaxAllowedBranches(
  branches: StoreSubscriptionProfile[],
  primaryProfile?: StoreSubscriptionProfile | null
): number {
  let maxVal = 1;
  if (primaryProfile && typeof primaryProfile.maxAllowedBranches === 'number') {
    maxVal = Math.max(maxVal, Math.floor(primaryProfile.maxAllowedBranches));
  }
  for (const b of branches) {
    if (typeof b.maxAllowedBranches === 'number') {
      maxVal = Math.max(maxVal, Math.floor(b.maxAllowedBranches));
    }
  }
  return maxVal;
}

export function calculateOwnerBundlePricing(branchCount: number): {
  totalBranches: number;
  extraBranches: number;
  monthlyTotal: number;
  annualTotal: number;
  monthlySavings: number;
  annualSavings: number;
} {
  const totalBranches = Math.max(1, Math.floor(branchCount));
  const extraBranches = Math.max(0, totalBranches - 1);
  const monthlyTotal = PRIMARY_BRANCH_MONTHLY_PRICE + extraBranches * EXTRA_BRANCH_MONTHLY_PRICE;
  const annualTotal = PRIMARY_BRANCH_ANNUAL_PRICE + extraBranches * EXTRA_BRANCH_ANNUAL_PRICE;
  const monthlySavings = extraBranches * (PRIMARY_BRANCH_MONTHLY_PRICE - EXTRA_BRANCH_MONTHLY_PRICE);
  const annualSavings = extraBranches * (PRIMARY_BRANCH_ANNUAL_PRICE - EXTRA_BRANCH_ANNUAL_PRICE);
  return {
    totalBranches,
    extraBranches,
    monthlyTotal,
    annualTotal,
    monthlySavings,
    annualSavings,
  };
}
