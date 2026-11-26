import {
  AttendanceRecord,
  CustomerComplaint,
  CustomerDepositRecord,
  CustomerReturnRecord,
  Expense,
  StoreLocation,
  StoreSubscriptionProfile,
  Transaction,
} from '../types';
import {
  INITIAL_ATTENDANCE,
  INITIAL_CASH_TRANSACTIONS,
  INITIAL_COMMISSION_PAYOUTS,
  INITIAL_CUSTOMERS,
  INITIAL_EXPENSES,
  INITIAL_FINANCING_FACILITIES,
  INITIAL_OFFERS,
  INITIAL_ONLINE_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_RESTOCK_RECORDS,
  INITIAL_STOCK_TRANSFERS,
  INITIAL_STORES,
  INITIAL_SUPPLIERS,
  INITIAL_TRANSACTIONS,
  INITIAL_USERS,
  INITIAL_WORKER_LOANS,
  INITIAL_BARCODE_SCAN_LOGS,
} from '../data/initialData';
import { saveCachedGroupBranches } from '../lib/cloudSync';
import {
  CLIENT_DEMO_STORE_ID,
  clearClientDemoStorage,
  resolveTenantStorageKey,
} from './tenantScope';

export const CLIENT_DEMO_BRANCH_WESTLANDS_ID = `${CLIENT_DEMO_STORE_ID}_br_westlands`;

export function createClientDemoProfiles(): {
  mainProfile: StoreSubscriptionProfile;
  westlandsBranch: StoreSubscriptionProfile;
  branches: StoreSubscriptionProfile[];
} {
  const nowIso = new Date().toISOString();
  const expiresAtIso = new Date(Date.now() + 22 * 86400000).toISOString();

  const mainProfile: StoreSubscriptionProfile = {
    id: CLIENT_DEMO_STORE_ID,
    ownerUid: 'demo-owner-uid',
    ownerEmail: 'demo@rofanipos.app',
    storeName: 'Rofani Demo Flagship',
    phone: '+254 734 128 888',
    kraPin: 'P051829402K',
    mpesaShortcode: '4098210',
    mpesaShortcodeType: 'till',
    planType: 'trial',
    subscriptionStatus: 'active',
    expiresAt: expiresAtIso,
    referralCode: 'ROFANI-DEMO26',
    trialDaysGranted: 22,
    taxMode: 'none',
    transactionWiseTax: false,
    preferredLabelSizeId: 'medium-3x2',
    isMultiBranch: true,
    businessGroupId: 'grp-demo-retail',
    businessGroupName: 'Rofani Demo Retail Group',
    branchCode: 'MAIN-01',
    branchCity: 'Nairobi CBD',
    branchAddress: 'Kimathi Street, Ground Floor',
    branchManagerName: 'Sarah Miller',
    businessCard: {
      ownerName: 'Sarah Miller',
      roleTitle: 'Store Director',
      tagline: 'Quality Electronics, Fashion & Same-Day Nairobi Delivery',
      shopName: 'Rofani Demo Flagship',
      phone: '+254 734 128 888',
      whatsapp: '+254 713 128 888',
      email: 'rofanipos@gmail.com',
      referralLink: 'https://rofani-electronics.vercel.app/?ref=ROFANI-DEMO26',
      accentColor: 'sky',
      updatedAt: nowIso,
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const westlandsBranch: StoreSubscriptionProfile = {
    id: CLIENT_DEMO_BRANCH_WESTLANDS_ID,
    ownerUid: 'demo-owner-uid',
    ownerEmail: 'demo@rofanipos.app',
    storeName: 'Rofani Demo Westlands',
    phone: '+254 713 128 888',
    kraPin: 'P051829402K',
    mpesaShortcode: '4098211',
    mpesaShortcodeType: 'till',
    planType: 'trial',
    subscriptionStatus: 'active',
    expiresAt: expiresAtIso,
    referralCode: 'ROFANI-DEMO26',
    trialDaysGranted: 22,
    taxMode: 'none',
    transactionWiseTax: false,
    preferredLabelSizeId: 'medium-3x2',
    isMultiBranch: true,
    businessGroupId: 'grp-demo-retail',
    businessGroupName: 'Rofani Demo Retail Group',
    parentStoreId: CLIENT_DEMO_STORE_ID,
    isBranchStore: true,
    branchCode: 'BR-WST',
    branchCity: 'Westlands',
    branchAddress: 'Sarit Centre Arcade, Shop 14',
    branchManagerName: 'Alex Johnson',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return {
    mainProfile,
    westlandsBranch,
    branches: [mainProfile, westlandsBranch],
  };
}

function isoDateDaysAgo(daysAgo: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() > Date.now()) {
    return new Date(Date.now() - Math.max(10, minute) * 60000).toISOString();
  }
  return d.toISOString();
}

function yyyyMmDdDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function buildFreshDemoTransactions(): Transaction[] {
  const scheduleOffsets: Array<[number, number, number]> = [
    [0, 9, 15],
    [0, 10, 42],
    [0, 11, 50],
    [1, 14, 20],
    [1, 16, 10],
    [2, 11, 30],
    [3, 15, 45],
  ];

  return INITIAL_TRANSACTIONS.map((tx, idx) => {
    const [daysAgo, hr, min] = scheduleOffsets[idx % scheduleOffsets.length];
    const freshDate = isoDateDaysAgo(daysAgo, hr, min);
    const baseTx: Transaction = {
      ...tx,
      date: freshDate,
      timestamp: Date.parse(freshDate),
      storeId: 'store-main',
      storeName: 'Rofani Demo Flagship',
    };
    if (tx.id === 'tx-101') {
      return {
        ...baseTx,
        isEtimsRequested: true,
        customerKraPin: 'A004829104P',
        cuin: 'CUIN-2026-481920',
        cusn: 'CUSN-KENYA-88392014',
        etimsComplianceMode: 'etims_ready',
      };
    }
    if (tx.id === 'tx-104') {
      return {
        ...baseTx,
        isEtimsRequested: true,
        customerKraPin: 'A004829104P',
        cuin: 'CUIN-2026-772104',
        cusn: 'CUSN-KENYA-99401233',
        returnedAmount: 2800,
        returnStatus: 'Partial Return',
        creditNoteRef: 'CN-2026-001',
        etimsComplianceMode: 'etims_ready',
      };
    }
    return baseTx;
  });
}

export function buildFreshDemoExpenses(): Expense[] {
  return INITIAL_EXPENSES.map((exp, idx) => ({
    ...exp,
    date: yyyyMmDdDaysAgo(idx === 0 ? 0 : idx),
    storeId: 'store-main',
  }));
}

export function buildFreshDemoAttendance(): AttendanceRecord[] {
  const todayStr = yyyyMmDdDaysAgo(0);
  const yesterdayStr = yyyyMmDdDaysAgo(1);
  return INITIAL_ATTENDANCE.map((rec, idx) => ({
    ...rec,
    date: idx < 4 ? todayStr : yesterdayStr,
  }));
}

export function buildDemoLocations(storeName: string): StoreLocation[] {
  if (INITIAL_STORES.length > 0) {
    return INITIAL_STORES.map((s, idx) =>
      idx === 0 ? { ...s, name: storeName } : s
    );
  }
  return [
    {
      id: 'store-main',
      name: storeName,
      code: 'MAIN-01',
      city: 'Nairobi CBD',
      address: 'Kimathi Street, Ground Floor',
      phone: '+254 734 128 888',
      isMainBranch: true,
      active: true,
    },
  ];
}

export function buildFreshDemoCustomerDeposits(): CustomerDepositRecord[] {
  return [
    {
      id: 'dep-demo-1',
      receiptRef: 'DEP-2026-001',
      type: 'deposit',
      customerId: 'cust-3',
      customerName: 'Grace Wanjiku',
      customerPhone: '+254 712 345678',
      amount: 3500,
      paymentMethod: 'mpesa',
      referenceNo: 'UHK9910421',
      balanceAfterDebt: 0,
      depositBalanceAfter: 3500,
      notes: 'Advance deposit held for upcoming boutique order',
      recordedBy: 'Sarah Miller',
      date: isoDateDaysAgo(1, 11, 20),
    },
    {
      id: 'dep-demo-2',
      receiptRef: 'PAY-2026-002',
      type: 'partial_payment',
      customerId: 'cust-2',
      customerName: 'Robert Chen',
      customerPhone: '+254 720 123456',
      amount: 1500,
      paymentMethod: 'mpesa',
      referenceNo: 'UHL3302914',
      linkedTransactionId: 'tx-103',
      linkedReceiptNumber: 'INV-20260722-003',
      balanceAfterDebt: 2500,
      depositBalanceAfter: 0,
      notes: 'Partial installment received via M-Pesa',
      recordedBy: 'Alex Johnson',
      date: isoDateDaysAgo(0, 10, 5),
    },
  ];
}

export function buildFreshDemoCustomerComplaints(): CustomerComplaint[] {
  return [
    {
      id: 'cmp-demo-1',
      complaintNumber: 'CMP-2026-001',
      customerId: 'cust-2',
      customerName: 'Robert Chen',
      customerPhone: '+254 720 123456',
      linkedTransactionId: 'tx-103',
      linkedReceiptNumber: 'INV-20260722-003',
      productId: INITIAL_PRODUCTS[3]?.id,
      productName: INITIAL_PRODUCTS[3]?.name,
      category: 'Product Quality / Defect',
      priority: 'High',
      status: 'Open',
      subject: 'Charging cable intermittent connection',
      description: 'Customer reported fast-charging adapter disconnects intermittently after 2 days of use. Scheduled for bench check.',
      assignedTo: 'Sarah Miller',
      createdBy: 'Alex Johnson',
      createdAt: isoDateDaysAgo(0, 9, 40),
      updatedAt: isoDateDaysAgo(0, 9, 40),
    },
    {
      id: 'cmp-demo-2',
      complaintNumber: 'CMP-2026-002',
      customerId: 'cust-3',
      customerName: 'Grace Wanjiku',
      customerPhone: '+254 712 345678',
      linkedTransactionId: 'tx-104',
      linkedReceiptNumber: 'INV-20260722-004',
      productId: INITIAL_PRODUCTS[2]?.id,
      productName: INITIAL_PRODUCTS[2]?.name,
      category: 'Wrong / Missing Item',
      priority: 'Low',
      status: 'Resolved',
      subject: '1 extra unit returned undamaged',
      description: 'Customer requested return of 1 extra sealed unit from bulk order; stock restored and M-Pesa refund processed.',
      resolutionNotes: 'Accepted back into resellable stock and issued KSh 2,800 Credit Note CN-2026-001.',
      resolvedAt: isoDateDaysAgo(1, 15, 10),
      resolvedBy: 'Sarah Miller',
      assignedTo: 'Sarah Miller',
      createdBy: 'Sarah Miller',
      createdAt: isoDateDaysAgo(1, 14, 50),
      updatedAt: isoDateDaysAgo(1, 15, 10),
    },
  ];
}

export function buildFreshDemoCustomerReturns(): CustomerReturnRecord[] {
  const prod = INITIAL_PRODUCTS[2];
  return [
    {
      id: 'ret-demo-1',
      returnNumber: 'RET-2026-001',
      creditNoteNumber: 'CN-2026-001',
      originalTransactionId: 'tx-104',
      originalReceiptNumber: 'INV-20260722-004',
      originalCuin: 'CUIN-2026-772104',
      isEtimsCreditNote: true,
      creditNoteCuin: 'CN-CUIN-2026-904112',
      customerId: 'cust-3',
      customerName: 'Grace Wanjiku',
      customerPhone: '+254 712 345678',
      customerKraPin: 'A004829104P',
      items: [
        {
          productId: prod?.id || 'prod-3',
          productName: prod?.name || 'Retail Item',
          sku: prod?.sku,
          unit: prod?.unit || 'pcs',
          quantitySold: 6,
          quantityReturned: 1,
          unitPrice: 2800,
          refundSubtotal: 2800,
          restockCondition: 'resellable',
          addedBackToStock: true,
          stockBeforeReturn: prod ? prod.stockQuantity - 1 : 10,
          stockAfterReturn: prod ? prod.stockQuantity : 11,
        },
      ],
      totalRefundAmount: 2800,
      refundMode: 'mpesa',
      cashRefundAmount: 2800,
      cashRefundChannel: 'mpesa',
      cashRefundRef: 'UHM8821045',
      creditIssuedAmount: 0,
      debtReducedAmount: 0,
      restockedTotalUnits: 1,
      damagedTotalUnits: 0,
      reason: 'Customer ordered excess quantity — returned sealed',
      notes: 'Inspected seal intact; added +1 unit back into active shelf stock.',
      processedBy: 'Sarah Miller',
      date: isoDateDaysAgo(1, 15, 5),
    },
  ];
}

export function seedClientDemoSandbox(): {
  mainProfile: StoreSubscriptionProfile;
  branches: StoreSubscriptionProfile[];
} {
  clearClientDemoStorage();
  const { mainProfile, westlandsBranch, branches } = createClientDemoProfiles();

  const writeScoped = (scopeId: string, key: string, value: unknown) => {
    try {
      localStorage.setItem(resolveTenantStorageKey(key, scopeId), JSON.stringify(value));
    } catch {
      // Ignore storage quota issues in demo seed
    }
  };

  // Seed main flagship sandbox store ('demo-sandbox')
  const freshTx = buildFreshDemoTransactions();
  const freshExp = buildFreshDemoExpenses();
  const freshAtt = buildFreshDemoAttendance();
  const demoCustomers = INITIAL_CUSTOMERS.map((c) =>
    c.id === 'cust-3' ? { ...c, depositBalance: 3500 } : c
  );

  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_products', INITIAL_PRODUCTS);
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_transactions', freshTx);
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_customers', demoCustomers);
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_customer_deposits', buildFreshDemoCustomerDeposits());
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_customer_complaints', buildFreshDemoCustomerComplaints());
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_customer_returns', buildFreshDemoCustomerReturns());
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_suppliers', INITIAL_SUPPLIERS);
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_expenses', freshExp);
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_attendance', freshAtt);
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_cash_transactions', INITIAL_CASH_TRANSACTIONS);
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_restock_records', INITIAL_RESTOCK_RECORDS);
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_purchase_orders', INITIAL_PURCHASE_ORDERS);
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_commission_payouts', INITIAL_COMMISSION_PAYOUTS);
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_worker_loans', INITIAL_WORKER_LOANS);
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_financing_facilities', INITIAL_FINANCING_FACILITIES);
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_offers', INITIAL_OFFERS);
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_online_orders', INITIAL_ONLINE_ORDERS);
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_stock_transfers', INITIAL_STOCK_TRANSFERS);
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_barcode_scan_logs', INITIAL_BARCODE_SCAN_LOGS);
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_users', INITIAL_USERS);
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_active_user', INITIAL_USERS[0]);
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_require_pin_startup', false);
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_terminal_locked', false);
  writeScoped(CLIENT_DEMO_STORE_ID, 'retail_pos_stores', buildDemoLocations(mainProfile.storeName));
  writeScoped(CLIENT_DEMO_STORE_ID, 'rofani_pos_store_profile', mainProfile);
  if (mainProfile.businessCard) {
    writeScoped(CLIENT_DEMO_STORE_ID, 'rofani_digital_business_card', mainProfile.businessCard);
  }

  // Seed Westlands Demo Branch ('demo-sandbox_br_westlands') so Multi-Branch switching feels authentic
  const branchProducts = INITIAL_PRODUCTS.slice(0, 45).map((p, i) => ({
    ...p,
    stockQuantity: Math.max(4, (p.stockQuantity || 12) - (i % 5)),
    stock: Math.max(4, (p.stockQuantity || 12) - (i % 5)),
  }));
  const branchTx = freshTx.slice(0, 3).map((tx, idx) => ({
    ...tx,
    id: `wst-${tx.id}-${idx}`,
    receiptNumber: `WST-${tx.receiptNumber}`,
    storeName: westlandsBranch.storeName,
    cashierName: 'Alex Johnson',
  }));
  const branchExp = freshExp.slice(0, 2);

  writeScoped(CLIENT_DEMO_BRANCH_WESTLANDS_ID, 'retail_pos_products', branchProducts);
  writeScoped(CLIENT_DEMO_BRANCH_WESTLANDS_ID, 'retail_pos_transactions', branchTx);
  writeScoped(CLIENT_DEMO_BRANCH_WESTLANDS_ID, 'retail_pos_customers', INITIAL_CUSTOMERS.slice(0, 5));
  writeScoped(CLIENT_DEMO_BRANCH_WESTLANDS_ID, 'retail_pos_customer_deposits', []);
  writeScoped(CLIENT_DEMO_BRANCH_WESTLANDS_ID, 'retail_pos_customer_complaints', []);
  writeScoped(CLIENT_DEMO_BRANCH_WESTLANDS_ID, 'retail_pos_customer_returns', []);
  writeScoped(CLIENT_DEMO_BRANCH_WESTLANDS_ID, 'retail_pos_suppliers', INITIAL_SUPPLIERS);
  writeScoped(CLIENT_DEMO_BRANCH_WESTLANDS_ID, 'retail_pos_expenses', branchExp);
  writeScoped(CLIENT_DEMO_BRANCH_WESTLANDS_ID, 'retail_pos_attendance', freshAtt.slice(0, 2));
  writeScoped(CLIENT_DEMO_BRANCH_WESTLANDS_ID, 'retail_pos_users', INITIAL_USERS);
  writeScoped(CLIENT_DEMO_BRANCH_WESTLANDS_ID, 'retail_pos_active_user', INITIAL_USERS[0]);
  writeScoped(CLIENT_DEMO_BRANCH_WESTLANDS_ID, 'retail_pos_require_pin_startup', false);
  writeScoped(CLIENT_DEMO_BRANCH_WESTLANDS_ID, 'retail_pos_terminal_locked', false);
  writeScoped(
    CLIENT_DEMO_BRANCH_WESTLANDS_ID,
    'retail_pos_stores',
    buildDemoLocations(westlandsBranch.storeName)
  );
  writeScoped(CLIENT_DEMO_BRANCH_WESTLANDS_ID, 'rofani_pos_store_profile', westlandsBranch);

  saveCachedGroupBranches(CLIENT_DEMO_STORE_ID, branches);

  return { mainProfile, branches };
}
