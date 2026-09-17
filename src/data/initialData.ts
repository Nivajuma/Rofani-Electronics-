import { Product, Customer, Supplier, Expense, AttendanceRecord, Transaction, User, CashTransaction, RestockRecord, StaffCommissionPayout, StoreLocation, OfferDeal, OnlineOrder, StockTransferRecord, WorkerLoan, FinancingFacility, BarcodeScanLog } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'John Doe (Admin)',
    role: 'Admin',
    email: 'admin@rofani.co.ke',
    pin: '1234',
    commissionRate: 5,
    commissionType: 'percentage',
    dailySalesTarget: 50000,
  },
  {
    id: 'usr-2',
    name: 'Sarah Miller (Manager)',
    role: 'Manager',
    email: 'sarah@rofani.co.ke',
    pin: '2222',
    commissionRate: 7.5,
    commissionType: 'tiered',
    commissionTiers: [
      { minSales: 0, maxSales: 30000, rate: 5 },
      { minSales: 30000, maxSales: 70000, rate: 7.5 },
      { minSales: 70000, rate: 10 },
    ],
    dailySalesTarget: 40000,
  },
  {
    id: 'usr-3',
    name: 'Alex Johnson (Cashier)',
    role: 'Cashier',
    email: 'alex@rofani.co.ke',
    pin: '1111',
    commissionRate: 5,
    commissionType: 'percentage',
    dailySalesTarget: 30000,
  },
  {
    id: 'usr-4',
    name: 'David Smith (Stock Staff)',
    role: 'Inventory Staff',
    email: 'david@rofani.co.ke',
    pin: '3333',
    commissionRate: 4,
    commissionType: 'profit_share',
    profitShareRate: 15,
    dailySalesTarget: 25000,
  },
];

export const INITIAL_COMMISSION_PAYOUTS: StaffCommissionPayout[] = [
  {
    id: 'payout-101',
    employeeId: 'usr-3',
    employeeName: 'Alex Johnson (Cashier)',
    date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    totalSalesAmount: 48500,
    salesCount: 6,
    commissionRate: 5,
    commissionEarned: 2425,
    paidAmount: 2425,
    status: 'Paid',
    paidAt: new Date(Date.now() - 86400000).toISOString(),
    paidBy: 'John Doe (Admin)',
    paymentMethod: 'mpesa',
    notes: 'Cleared daily 5% sales commission via M-Pesa'
  }
];

export const INITIAL_WORKER_LOANS: WorkerLoan[] = [
  {
    id: 'wln-1001',
    loanNumber: 'WLN-2026-001',
    workerId: 'usr-3',
    workerName: 'Alex Johnson (Cashier)',
    role: 'Cashier',
    principalAmount: 12000,
    totalRepaid: 4000,
    balanceDue: 8000,
    issueDate: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 16 * 86400000).toISOString().slice(0, 10),
    disbursementMethod: 'mpesa',
    disbursementRef: 'MPESA-ADV-9921',
    purpose: 'Rent Advance & Medical Emergency Support',
    status: 'Active',
    approvedBy: 'John Doe (Admin)',
    repayments: [
      {
        id: 'rep-501',
        loanId: 'wln-1001',
        amount: 4000,
        date: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
        paymentMethod: 'salary_deduction',
        referenceNo: 'DEDUCT-SALARY-WK2',
        recordedBy: 'Sarah Miller (Manager)',
        notes: 'Mid-month salary deduction repayment'
      }
    ],
    notes: 'Approved 2-stage repayment from weekly payroll'
  },
  {
    id: 'wln-1002',
    loanNumber: 'WLN-2026-002',
    workerId: 'usr-4',
    workerName: 'David Smith (Stock Staff)',
    role: 'Inventory Staff',
    principalAmount: 6000,
    totalRepaid: 6000,
    balanceDue: 0,
    issueDate: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    dueDate: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
    disbursementMethod: 'cash',
    disbursementRef: 'PETTY-CASH-881',
    purpose: 'School Fees Support Advance',
    status: 'Fully Repaid',
    approvedBy: 'Sarah Miller (Manager)',
    repayments: [
      {
        id: 'rep-502',
        loanId: 'wln-1002',
        amount: 6000,
        date: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
        paymentMethod: 'cash',
        referenceNo: 'CASH-REC-1042',
        recordedBy: 'John Doe (Admin)',
        notes: 'Full cash clearance paid at store counter'
      }
    ],
    notes: 'Cleared in full on time'
  }
];

export const INITIAL_CATEGORIES = [
  {
    id: 'cat-household',
    name: 'Household',
    subcategories: ['Kitchenware', 'Cleaning Supplies', 'Home Decor & Lighting', 'Bedding & Towels', 'Storage & Organization', 'Small Appliances']
  },
  {
    id: 'cat-electronics',
    name: 'Electronics',
    subcategories: ['TVs & Home Audio', 'Laptops & Computers', 'Speakers & Amplifiers', 'Power Banks & Solar', 'Gaming & Consoles', 'Cables & Adapters']
  },
  {
    id: 'cat-beauty',
    name: 'Beauty Products',
    subcategories: ['Skincare & Body Lotion', 'Haircare & Weaves', 'Makeup & Cosmetics', 'Perfumes & Fragrances', 'Personal Hygiene & Soaps']
  },
  {
    id: 'cat-hardware',
    name: 'Hardware Products',
    subcategories: ['Tools & Power Tools', 'Plumbing & Fittings', 'Electrical Wiring & Switches', 'Paints & Building Supplies', 'Fasteners & Padlocks', 'Safety Gear & Boots']
  },
  {
    id: 'cat-phones',
    name: 'Phones & Accessories',
    subcategories: ['Smartphones', 'Feature Phones (Kabambe)', 'Phone Covers & Cases', 'Screen Protectors', 'Chargers & Fast Power', 'Earphones & AirPods', 'Memory Cards & Flash Drives']
  },
  {
    id: 'cat-clothes',
    name: 'Clothes (Men, Women & Kids Wear)',
    subcategories: ['Men Wear', 'Women Wear', 'Kids Wear & Baby Clothing', 'Jackets & Coats', 'Dresses & Tops', 'Innerwear & Socks']
  },
  {
    id: 'cat-shoes',
    name: 'Shoes',
    subcategories: ['Men Shoes & Sneakers', 'Women Heels & Flats', 'Kids Shoes', 'Sports & Running Shoes', 'Sandals & Slippers', 'Boots & Safety Shoes']
  }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Apex Electronics Nairobi',
    contactPerson: 'Michael Green',
    phone: '+254 722 000111',
    email: 'sales@apexelectronics.co.ke',
    address: 'Luthuli Avenue, Nairobi CBD',
    totalSuppliedValue: 350000,
    currentBalanceDue: 45000,
    kraPin: 'P051234567X',
    paymentTerms: 'Net 30 Days',
    bankDetails: 'Equity Bank - Acc #0180293847291 (Paybill 247247 Acc 0180293)',
    categorySpecialty: 'Electronics & Audio Hardware',
    notes: 'Primary supplier for headphones, power banks, and sound systems. Delivers on Tuesdays.',
    createdAt: '2026-01-05',
    updatedAt: '2026-08-20'
  },
  {
    id: 'sup-2',
    name: 'East Africa Fashion Wholesalers',
    contactPerson: 'Anita Roy',
    phone: '+254 733 444555',
    email: 'orders@eafashion.co.ke',
    address: 'Eastleigh Section 1, 1st Avenue, Nairobi',
    totalSuppliedValue: 280000,
    currentBalanceDue: 18500,
    kraPin: 'P059876543Z',
    paymentTerms: 'Net 15 Days',
    bankDetails: 'KCB Bank - Acc #1192837465 (Paybill 522522 Acc 1192837)',
    categorySpecialty: 'Boutique Apparel, Jackets & Footwear',
    notes: 'Premium Turkish and Dubai imported clothing and leather shoes.',
    createdAt: '2026-01-12',
    updatedAt: '2026-08-22'
  },
  {
    id: 'sup-3',
    name: 'Global Goods Distributors',
    contactPerson: 'Kevin Vance',
    phone: '+254 711 888999',
    email: 'supply@globalgoods.co.ke',
    address: 'Industrial Area, Commercial St, Nairobi',
    totalSuppliedValue: 190000,
    currentBalanceDue: 0,
    kraPin: 'P053334445W',
    paymentTerms: 'Cash on Delivery (COD)',
    bankDetails: 'Standard Chartered - Acc #01002345678',
    categorySpecialty: 'Cosmetics & Personal Grooming',
    notes: 'Provides branded fragrances, grooming shavers, and hair accessories.',
    createdAt: '2026-02-01',
    updatedAt: '2026-08-15'
  },
  {
    id: 'sup-4',
    name: 'Safaricom Direct Dealer & Accessories',
    contactPerson: 'Dennis Kiprono',
    phone: '+254 722 999888',
    email: 'b2b@safaccessories.co.ke',
    address: 'Kimathi Street, Nairobi CBD',
    totalSuppliedValue: 220000,
    currentBalanceDue: 12000,
    kraPin: 'P057778889Q',
    paymentTerms: 'Net 14 Days',
    bankDetails: 'M-Pesa Buy Goods Till #789012',
    categorySpecialty: 'Smartphones & Certified Charging Cables',
    notes: 'Supplies fast chargers, original cables, and tempered glass screens.',
    createdAt: '2026-02-10',
    updatedAt: '2026-08-24'
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Walk-in Customer',
    phone: 'N/A',
    totalPurchases: 45000,
    currentBalanceDue: 0,
    customerType: 'Individual',
    notes: 'General over-the-counter cash/M-Pesa buyers'
  },
  {
    id: 'cust-2',
    name: 'Robert Chen',
    phone: '+254 720 123456',
    email: 'robert.chen@gmail.com',
    address: 'Westlands, Rhapta Road, Nairobi',
    totalPurchases: 18500,
    currentBalanceDue: 2500,
    kraPin: 'A009182736K',
    creditLimit: 15000,
    customerType: 'VIP',
    notes: 'Regular buyer of sound gear and boutique suits. Enjoys 5% loyal discount.',
    createdAt: '2026-01-15'
  },
  {
    id: 'cust-3',
    name: 'Grace Wanjiku',
    phone: '+254 712 345678',
    email: 'grace.w@outlook.com',
    address: 'Kileleshwa, Mandera Rd, Nairobi',
    totalPurchases: 32000,
    currentBalanceDue: 0,
    kraPin: 'A004829104P',
    creditLimit: 20000,
    customerType: 'Individual',
    notes: 'Prefers prompt M-Pesa payments. Buys designer handbags and boutique dresses.',
    createdAt: '2026-01-20'
  },
  {
    id: 'cust-4',
    name: 'Rajesh Patel',
    phone: '+254 735 987654',
    email: 'r.patel@yahoo.com',
    address: 'Parklands, 4th Avenue, Nairobi',
    totalPurchases: 54000,
    currentBalanceDue: 4800,
    kraPin: 'P058192847M',
    creditLimit: 30000,
    customerType: 'Wholesaler',
    notes: 'Wholesale client for bulk phone screen guards and phone accessories.',
    createdAt: '2026-02-05'
  },
  {
    id: 'cust-5',
    name: 'Sarah Ndung\'u',
    phone: '+254 701 555666',
    email: 'sarah.ndungu@corporate.co.ke',
    address: 'Kilimani, Argwings Kodhek, Nairobi',
    totalPurchases: 41200,
    currentBalanceDue: 7500,
    kraPin: 'A003399112L',
    creditLimit: 25000,
    customerType: 'Corporate',
    notes: 'Corporate office purchaser for power banks and electronics.',
    createdAt: '2026-02-18'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Wireless Bluetooth Headphones',
    sku: 'ELEC-SND-001',
    barcode: '8901234567891',
    category: 'Electronics',
    subcategory: 'Audio',
    sizeCapacity: 'Over-Ear',
    description: 'Noise cancelling over-ear bluetooth headphone with 30hr battery.',
    costPrice: 2800.00,
    sellingPrice: 4500.00,
    stockQuantity: 42,
    minStockAlert: 10,
    unit: 'pcs',
    supplierId: 'sup-1',
    supplierName: 'Apex Electronics Nairobi',
    createdAt: '2026-01-10',
    updatedAt: '2026-07-20',
  },
  {
    id: 'prod-2',
    name: 'Boutique Silk Evening Dress',
    sku: 'BTQ-DRS-002',
    barcode: '8901234567892',
    category: 'Boutique & Fashion',
    subcategory: 'Women Dresses',
    sizeCapacity: 'Medium / Emerald Green',
    description: 'Elegant silk evening gown with embroidered neckline.',
    costPrice: 3200.00,
    sellingPrice: 5800.00,
    stockQuantity: 8, // Low stock!
    minStockAlert: 15,
    unit: 'pcs',
    supplierId: 'sup-2',
    supplierName: 'East Africa Fashion Wholesalers',
    createdAt: '2026-02-14',
    updatedAt: '2026-07-21',
  },
  {
    id: 'prod-3',
    name: 'Fast Charger USB-C 65W',
    sku: 'ELEC-ACC-003',
    barcode: '8901234567893',
    category: 'Electronics',
    subcategory: 'Accessories',
    sizeCapacity: '65 Watts Dual Port',
    description: 'GaN technology fast power adapter compatible with laptops and phones.',
    costPrice: 1500.00,
    sellingPrice: 2800.00,
    stockQuantity: 65,
    minStockAlert: 12,
    unit: 'pcs',
    supplierId: 'sup-1',
    supplierName: 'Apex Electronics Nairobi',
    createdAt: '2026-03-01',
    updatedAt: '2026-07-18',
  },
  {
    id: 'prod-4',
    name: 'Designer Leather Handbag',
    sku: 'BTQ-BAG-004',
    barcode: '8901234567894',
    category: 'Boutique & Fashion',
    subcategory: 'Handbags & Shoes',
    sizeCapacity: 'Standard / Tan Brown',
    description: 'Genuine leather handbag with gold accents and shoulder strap.',
    costPrice: 2200.00,
    sellingPrice: 4200.00,
    stockQuantity: 4, // Low stock alert!
    minStockAlert: 10,
    unit: 'pcs',
    supplierId: 'sup-2',
    supplierName: 'East Africa Fashion Wholesalers',
    createdAt: '2026-04-12',
    updatedAt: '2026-07-22',
  },
  {
    id: 'prod-5',
    name: 'Men Cotton Polo Shirt',
    sku: 'BTQ-MEN-005',
    barcode: '8901234567895',
    category: 'Boutique & Fashion',
    subcategory: 'Men Wear',
    sizeCapacity: 'Large / Navy Blue',
    description: '100% breathable combed cotton casual polo shirt with collar.',
    costPrice: 1200.00,
    sellingPrice: 2200.00,
    stockQuantity: 28,
    minStockAlert: 8,
    unit: 'pcs',
    supplierId: 'sup-2',
    supplierName: 'East Africa Fashion Wholesalers',
    createdAt: '2026-05-02',
    updatedAt: '2026-07-15',
  },
  {
    id: 'prod-6',
    name: 'Smart Fitness Watch Series 8',
    sku: 'ELEC-WTC-006',
    barcode: '8901234567896',
    category: 'Electronics',
    subcategory: 'Smartphones',
    sizeCapacity: '44mm / OLED Display',
    description: 'Heart rate monitor, SPO2 sensor, GPS and water resistant.',
    costPrice: 4500.00,
    sellingPrice: 8500.00,
    stockQuantity: 50,
    minStockAlert: 15,
    unit: 'pcs',
    supplierId: 'sup-1',
    supplierName: 'Apex Electronics Nairobi',
    createdAt: '2026-05-20',
    updatedAt: '2026-07-19',
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  { id: 'exp-1', date: '2026-07-01', category: 'Rent', description: 'Monthly Shop Rent - Nairobi CBD', amount: 45000.00, paymentMethod: 'credit_card', recordedBy: 'Sarah Miller', receiptNo: 'REC-RNT-07', recurringType: 'Monthly', nextDueDate: '2026-08-01', isRecurring: true, status: 'Paid' },
  { id: 'exp-2', date: '2026-07-05', category: 'Utilities', description: 'Kenya Power Electricity & Fibre Internet', amount: 12500.00, paymentMethod: 'mpesa', recordedBy: 'Sarah Miller', receiptNo: 'UTIL-0722', recurringType: 'Monthly', nextDueDate: '2026-08-05', isRecurring: true, status: 'Paid' },
  { id: 'exp-3', date: '2026-07-10', category: 'Transport', description: 'Daily Local Rider Cargo Delivery Float', amount: 1500.00, paymentMethod: 'mpesa', recordedBy: 'David Smith', receiptNo: 'TRN-882', recurringType: 'Daily', nextDueDate: '2026-07-24', isRecurring: true, status: 'Due' },
  { id: 'exp-4', date: '2026-07-15', category: 'Salaries', description: 'Staff Monthly Payroll & Allowances', amount: 85000.00, paymentMethod: 'mpesa', recordedBy: 'John Doe', receiptNo: 'SAL-ADV-01', recurringType: 'Monthly', nextDueDate: '2026-08-15', isRecurring: true, status: 'Paid' },
  { id: 'exp-5', date: '2026-01-15', category: 'Maintenance', description: 'Annual KRA ETR / County Business Trading Permit', amount: 18000.00, paymentMethod: 'cheque', recordedBy: 'John Doe', receiptNo: 'PRM-2026-01', recurringType: 'Yearly', nextDueDate: '2027-01-15', isRecurring: true, status: 'Paid' }
];

export const INITIAL_RESTOCK_RECORDS: RestockRecord[] = [
  {
    id: 'rst-001',
    productId: 'prod-1',
    productName: 'Wireless Bluetooth Headphones',
    quantityAdded: 50,
    unitCost: 2800.00,
    totalCost: 140000.00,
    supplierName: 'Apex Electronics Nairobi',
    supplierId: 'sup-1',
    date: '2026-06-15T10:00:00Z',
    receivedBy: 'David Smith (Stock Staff)',
    batchNo: 'BATCH-ELEC-2026A',
    notes: 'Bulk purchase shipment received in original packaging.'
  },
  {
    id: 'rst-002',
    productId: 'prod-2',
    productName: 'Boutique Silk Evening Dress',
    quantityAdded: 20,
    unitCost: 3200.00,
    totalCost: 64000.00,
    supplierName: 'East Africa Fashion Wholesalers',
    supplierId: 'sup-2',
    date: '2026-06-20T14:30:00Z',
    receivedBy: 'Sarah Miller (Manager)',
    batchNo: 'BATCH-FASH-881',
    notes: 'Restocked sizes M, L and XL.'
  },
  {
    id: 'rst-003',
    productId: 'prod-3',
    productName: 'Fast Charger USB-C 65W',
    quantityAdded: 80,
    unitCost: 1500.00,
    totalCost: 120000.00,
    supplierName: 'Apex Electronics Nairobi',
    supplierId: 'sup-1',
    date: '2026-07-02T11:15:00Z',
    receivedBy: 'David Smith (Stock Staff)',
    batchNo: 'BATCH-ACC-902',
    notes: 'Fast charging wall adapters.'
  },
  {
    id: 'rst-004',
    productId: 'prod-4',
    productName: 'Designer Leather Handbag',
    quantityAdded: 15,
    unitCost: 2200.00,
    totalCost: 33000.00,
    supplierName: 'East Africa Fashion Wholesalers',
    supplierId: 'sup-2',
    date: '2026-07-10T16:00:00Z',
    receivedBy: 'David Smith (Stock Staff)',
    batchNo: 'BATCH-BAG-04',
    notes: 'Assorted colors tan brown and black.'
  },
  {
    id: 'rst-005',
    productId: 'prod-5',
    productName: 'Men Cotton Polo Shirt',
    quantityAdded: 40,
    unitCost: 1200.00,
    totalCost: 48000.00,
    supplierName: 'East Africa Fashion Wholesalers',
    supplierId: 'sup-2',
    date: '2026-07-12T09:20:00Z',
    receivedBy: 'David Smith (Stock Staff)',
    batchNo: 'BATCH-MEN-12',
    notes: 'Premium combed cotton stock.'
  },
  {
    id: 'rst-006',
    productId: 'prod-6',
    productName: 'Smart Fitness Watch Series 8',
    quantityAdded: 60,
    unitCost: 4500.00,
    totalCost: 270000.00,
    supplierName: 'Apex Electronics Nairobi',
    supplierId: 'sup-1',
    date: '2026-07-18T13:45:00Z',
    receivedBy: 'Sarah Miller (Manager)',
    batchNo: 'BATCH-WTC-88',
    notes: 'Initial launch inventory.'
  }
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  { id: 'att-1', employeeId: 'usr-1', employeeName: 'John Doe', role: 'Admin', date: '2026-07-22', clockInTime: '08:00', status: 'Present', workHours: 8 },
  { id: 'att-2', employeeId: 'usr-2', employeeName: 'Sarah Miller', role: 'Manager', date: '2026-07-22', clockInTime: '08:15', status: 'Present', workHours: 8 },
  { id: 'att-3', employeeId: 'usr-3', employeeName: 'Alex Johnson', role: 'Cashier', date: '2026-07-22', clockInTime: '08:45', status: 'Late', notes: 'Traffic delay' },
  { id: 'att-4', employeeId: 'usr-4', employeeName: 'David Smith', role: 'Inventory Staff', date: '2026-07-22', clockInTime: '08:02', status: 'Present' },
  { id: 'att-5', employeeId: 'usr-3', employeeName: 'Alex Johnson', role: 'Cashier', date: '2026-07-21', clockInTime: '08:00', clockOutTime: '17:00', status: 'Present', workHours: 9 },
  { id: 'att-6', employeeId: 'usr-4', employeeName: 'David Smith', role: 'Inventory Staff', date: '2026-07-21', clockInTime: '08:05', clockOutTime: '17:00', status: 'Present', workHours: 8.9 },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-101',
    receiptNumber: 'INV-20260721-001',
    date: '2026-07-21T10:15:00Z',
    items: [
      { product: INITIAL_PRODUCTS[0], quantity: 1, unitPrice: 4500.00, discount: 0, total: 4500.00 },
      { product: INITIAL_PRODUCTS[2], quantity: 2, unitPrice: 2800.00, discount: 0, total: 5600.00 },
    ],
    subtotal: 10100.00,
    discountTotal: 0,
    taxTotal: 151.50, // 1.5% KRA TOT
    grandTotal: 10100.00,
    amountPaid: 10100.00,
    balanceDue: 0,
    paymentStatus: 'Paid',
    payments: [
      { method: 'mpesa', amount: 10100.00, reference: 'QFH8839210' }
    ],
    customerId: 'cust-3',
    customerName: 'Grace Wanjiku',
    customerPhone: '+254 712 345678',
    cashierName: 'Alex Johnson',
    cashierId: 'usr-3',
    notes: 'Paid via M-Pesa mobile payment'
  },
  {
    id: 'tx-102',
    receiptNumber: 'INV-20260721-002',
    date: '2026-07-21T14:30:00Z',
    items: [
      { product: INITIAL_PRODUCTS[1], quantity: 1, unitPrice: 5800.00, discount: 0, total: 5800.00 },
      { product: INITIAL_PRODUCTS[4], quantity: 1, unitPrice: 2200.00, discount: 0, total: 2200.00 },
    ],
    subtotal: 8000.00,
    discountTotal: 0,
    taxTotal: 120.00, // 1.5% KRA TOT
    grandTotal: 8000.00,
    amountPaid: 8000.00,
    balanceDue: 0,
    paymentStatus: 'Paid',
    payments: [
      { method: 'cash', amount: 8000.00 }
    ],
    customerId: 'cust-1',
    customerName: 'Walk-in Customer',
    cashierName: 'Alex Johnson',
    cashierId: 'usr-3'
  },
  {
    id: 'tx-103',
    receiptNumber: 'INV-20260722-003',
    date: '2026-07-22T09:05:00Z',
    items: [
      { product: INITIAL_PRODUCTS[5], quantity: 1, unitPrice: 8500.00, discount: 500, total: 8000.00 },
      { product: INITIAL_PRODUCTS[3], quantity: 1, unitPrice: 4200.00, discount: 0, total: 4200.00 },
    ],
    subtotal: 12700.00,
    discountTotal: 500.00,
    taxTotal: 183.00, // 1.5% KRA TOT
    grandTotal: 12200.00,
    amountPaid: 10000.00,
    balanceDue: 2200.00,
    paymentStatus: 'Partial',
    payments: [
      { method: 'mpesa', amount: 10000.00, reference: 'RKT9912040' }
    ],
    customerId: 'cust-2',
    customerName: 'Robert Chen',
    customerPhone: '+254 720 123456',
    cashierName: 'Sarah Miller',
    cashierId: 'usr-2',
    notes: 'Partial payment. Remaining KSh 2,200 on store credit.'
  },
  {
    id: 'tx-104',
    receiptNumber: 'INV-20260722-004',
    date: '2026-07-22T11:40:00Z',
    items: [
      { product: INITIAL_PRODUCTS[2], quantity: 6, unitPrice: 2800.00, discount: 0, total: 16800.00 },
      { product: INITIAL_PRODUCTS[0], quantity: 3, unitPrice: 4500.00, discount: 0, total: 13500.00 },
    ],
    subtotal: 30300.00,
    discountTotal: 0,
    taxTotal: 454.50,
    grandTotal: 30300.00,
    amountPaid: 30300.00,
    balanceDue: 0,
    paymentStatus: 'Paid',
    payments: [
      { method: 'mpesa', amount: 30300.00, reference: 'QKL4491022' }
    ],
    customerId: 'cust-3',
    customerName: 'Grace Wanjiku',
    cashierName: 'Alex Johnson',
    cashierId: 'usr-3'
  },
  {
    id: 'tx-105',
    receiptNumber: 'INV-20260722-005',
    date: '2026-07-22T15:20:00Z',
    items: [
      { product: INITIAL_PRODUCTS[2], quantity: 4, unitPrice: 2800.00, discount: 0, total: 11200.00 },
      { product: INITIAL_PRODUCTS[4], quantity: 3, unitPrice: 2200.00, discount: 0, total: 6600.00 },
    ],
    subtotal: 17800.00,
    discountTotal: 0,
    taxTotal: 267.00,
    grandTotal: 17800.00,
    amountPaid: 17800.00,
    balanceDue: 0,
    paymentStatus: 'Paid',
    payments: [
      { method: 'cash', amount: 17800.00 }
    ],
    customerId: 'cust-1',
    customerName: 'Walk-in Customer',
    cashierName: 'Alex Johnson',
    cashierId: 'usr-3'
  }
];

export const INITIAL_FINANCING_FACILITIES: FinancingFacility[] = [
  {
    id: 'fac-101',
    facilityNumber: 'FAC-KCB-2026-001',
    name: 'KCB SME Business Expansion Loan',
    facilityType: 'Bank Loan',
    lenderOrGroupName: 'KCB Bank Kenya Ltd (Kipande House Branch)',
    contactPerson: 'Dennis Mutua (Loan Officer)',
    contactPhone: '+254 722 555 100',
    principalAmount: 500000.00,
    interestRatePercentage: 13.0,
    totalRepayableAmount: 565000.00,
    totalRepaid: 49000.00,
    balanceRemaining: 516000.00,
    disbursementDate: '2026-07-15',
    dueDate: '2028-07-15',
    installmentAmount: 24500.00,
    repaymentFrequency: 'Monthly',
    disbursementMethod: 'bank_transfer',
    disbursementRef: 'EFT-KCB-88019',
    status: 'Active',
    purpose: 'Boutique and electronics inventory expansion & store renovation',
    notes: '24-month structured term facility with automated monthly standing order.',
    repayments: [
      {
        id: 'fr-1',
        facilityId: 'fac-101',
        amount: 24500.00,
        date: '2026-07-22T08:30:00Z',
        paymentMethod: 'bank_transfer',
        referenceNo: 'EFT-KCB-2026-0722',
        recordedBy: 'John Doe (Admin)',
        notes: 'July Monthly installment'
      },
      {
        id: 'fr-2',
        facilityId: 'fac-101',
        amount: 24500.00,
        date: '2026-08-22T09:15:00Z',
        paymentMethod: 'bank_transfer',
        referenceNo: 'EFT-KCB-2026-0822',
        recordedBy: 'John Doe (Admin)',
        notes: 'August Monthly installment'
      }
    ]
  },
  {
    id: 'fac-102',
    facilityNumber: 'CHAMA-USH-2026-004',
    name: 'Ushirika Entrepreneurs Chama Investment Group',
    facilityType: 'Chama / Merry-Go-Round',
    lenderOrGroupName: 'Ushirika Traders Table Banking & Chama',
    contactPerson: 'Mama Beatrice Njeri (Chairlady & Treasurer)',
    contactPhone: '+254 710 443 892',
    principalAmount: 200000.00,
    interestRatePercentage: 5.0,
    totalRepayableAmount: 210000.00,
    totalRepaid: 35000.00,
    balanceRemaining: 175000.00,
    disbursementDate: '2026-08-01',
    dueDate: '2026-12-31',
    installmentAmount: 35000.00,
    repaymentFrequency: 'Monthly',
    disbursementMethod: 'mpesa',
    disbursementRef: 'MPESA-CHM-99120',
    status: 'Active',
    purpose: 'Merry-go-round lump sum payout for bulk wholesale purchase discounts',
    notes: 'Monthly contribution KSh 15,000 + Table banking loan repayment KSh 20,000.',
    repayments: [
      {
        id: 'fr-3',
        facilityId: 'fac-102',
        amount: 35000.00,
        date: '2026-08-15T14:20:00Z',
        paymentMethod: 'mpesa',
        referenceNo: 'MPESA-QRT7781',
        recordedBy: 'Sarah Miller (Manager)',
        notes: 'August Chama share contribution + Table loan installment'
      }
    ]
  },
  {
    id: 'fac-103',
    facilityNumber: 'SACCO-STIMA-2026',
    name: 'Stima SACCO Working Capital Micro-Facility',
    facilityType: 'SACCO Loan',
    lenderOrGroupName: 'Stima DT SACCO Society',
    contactPerson: 'Evans Omondi (Credit Manager)',
    contactPhone: '+254 703 091 000',
    principalAmount: 300000.00,
    interestRatePercentage: 10.0,
    totalRepayableAmount: 330000.00,
    totalRepaid: 60000.00,
    balanceRemaining: 270000.00,
    disbursementDate: '2026-06-10',
    dueDate: '2027-06-10',
    installmentAmount: 27500.00,
    repaymentFrequency: 'Monthly',
    disbursementMethod: 'bank_transfer',
    disbursementRef: 'SACCO-DISB-4421',
    status: 'Active',
    purpose: 'Capital procurement of fast-moving soundbars and smart TVs',
    notes: 'Member dividend-backed emergency capital facility.'
  },
  {
    id: 'fac-104',
    facilityNumber: 'MOB-MSHWARI-091',
    name: 'Safaricom Lipa Na M-Pesa Merchant Business Float',
    facilityType: 'Mobile / Merchant Float',
    lenderOrGroupName: 'NCBA / Safaricom Business Loan',
    contactPerson: 'Safaricom Business Support',
    contactPhone: '+254 722 000 222',
    principalAmount: 80000.00,
    interestRatePercentage: 8.0,
    totalRepayableAmount: 86400.00,
    totalRepaid: 86400.00,
    balanceRemaining: 0.00,
    disbursementDate: '2026-07-01',
    dueDate: '2026-07-31',
    installmentAmount: 86400.00,
    repaymentFrequency: 'Lump Sum',
    disbursementMethod: 'mpesa',
    disbursementRef: 'MPESA-FUL-33290',
    status: 'Fully Cleared',
    purpose: 'Short-term weekend stock float clearance',
    notes: 'Fully settled from till collections.'
  }
];

export const INITIAL_CASH_TRANSACTIONS: CashTransaction[] = [
  {
    id: 'ct-101',
    type: 'CASH_IN',
    category: 'Bank Loan',
    amount: 500000.00,
    date: '2026-07-15T10:30:00Z',
    sourceDestination: 'KCB Bank Kenya Ltd (SME Expansion Loan)',
    referenceNo: 'LOAN-KCB-2026-8801',
    paymentMethod: 'bank_transfer',
    description: 'Bank Loan disbursement for shop inventory stock expansion and store renovation',
    recordedBy: 'John Doe (Admin)',
    status: 'Completed',
    facilityId: 'fac-101',
    notes: 'Approved 24-month term loan at 13% APR.'
  },
  {
    id: 'ct-102',
    type: 'CASH_IN',
    category: 'Chama / Merry-Go-Round Payout',
    amount: 200000.00,
    date: '2026-08-01T11:00:00Z',
    sourceDestination: 'Ushirika Entrepreneurs Chama Group',
    referenceNo: 'CHAMA-USH-2026-004',
    paymentMethod: 'mpesa',
    description: 'Chama merry-go-round monthly lump-sum payout received for bulk inventory procurement',
    recordedBy: 'Sarah Miller (Manager)',
    status: 'Completed',
    facilityId: 'fac-102',
    notes: 'Disbursed directly to M-Pesa business till.'
  },
  {
    id: 'ct-103',
    type: 'CASH_IN',
    category: 'SACCO / Microfinance Loan',
    amount: 300000.00,
    date: '2026-06-10T14:30:00Z',
    sourceDestination: 'Stima SACCO Working Capital Facility',
    referenceNo: 'SACCO-DISB-4421',
    paymentMethod: 'bank_transfer',
    description: 'Stima SACCO working capital loan disbursement for electronics stock',
    recordedBy: 'John Doe (Admin)',
    status: 'Completed',
    facilityId: 'fac-103'
  },
  {
    id: 'ct-104',
    type: 'CASH_IN',
    category: 'Owner Capital / Equity',
    amount: 150000.00,
    date: '2026-07-18T09:00:00Z',
    sourceDestination: 'Director Equity Investment',
    referenceNo: 'CAP-2026-001',
    paymentMethod: 'bank_transfer',
    description: 'Additional capital injection by managing director for store liquidity float',
    recordedBy: 'John Doe (Admin)',
    status: 'Completed'
  },
  {
    id: 'ct-105',
    type: 'CASH_OUT',
    category: 'Bank Deposit (Vault to Bank)',
    amount: 180000.00,
    date: '2026-07-20T16:45:00Z',
    sourceDestination: 'Equity Bank Corporate Account',
    referenceNo: 'SLIP-EQB-99210',
    paymentMethod: 'cash',
    description: 'EOD physical cash drawer & vault deposit sent to Equity Bank branch',
    recordedBy: 'Sarah Miller (Manager)',
    status: 'Completed'
  },
  {
    id: 'ct-106',
    type: 'CASH_IN',
    category: 'Customer Debt Payment',
    amount: 12500.00,
    date: '2026-07-21T11:15:00Z',
    sourceDestination: 'Grace Wanjiku (Account #cust-3)',
    referenceNo: 'MPESA-QFH8839',
    paymentMethod: 'mpesa',
    description: 'Customer settled outstanding credit balance for previous wholesale purchase',
    recordedBy: 'Alex Johnson (Cashier)',
    status: 'Completed'
  },
  {
    id: 'ct-107',
    type: 'CASH_OUT',
    category: 'Bank / SACCO Loan Repayment',
    amount: 24500.00,
    date: '2026-07-22T08:30:00Z',
    sourceDestination: 'KCB Bank Loan A/C #110029301',
    referenceNo: 'EFT-KCB-2026-0722',
    paymentMethod: 'bank_transfer',
    description: 'KCB SME Business Expansion Loan July Monthly Installment (Principal + Interest)',
    recordedBy: 'John Doe (Admin)',
    status: 'Completed',
    facilityId: 'fac-101'
  },
  {
    id: 'ct-108',
    type: 'CASH_OUT',
    category: 'Chama Contribution / Table Banking',
    amount: 35000.00,
    date: '2026-08-15T14:20:00Z',
    sourceDestination: 'Ushirika Entrepreneurs Chama Group',
    referenceNo: 'MPESA-QRT7781',
    paymentMethod: 'mpesa',
    description: 'Monthly Chama table banking savings contribution & loan installment payout',
    recordedBy: 'Sarah Miller (Manager)',
    status: 'Completed',
    facilityId: 'fac-102'
  },
  {
    id: 'ct-109',
    type: 'CASH_OUT',
    category: 'Supplier Cash Payment',
    amount: 45000.00,
    date: '2026-07-22T09:40:00Z',
    sourceDestination: 'East Africa Fashion Wholesalers',
    referenceNo: 'PV-2026-094',
    paymentMethod: 'cash',
    description: 'Cash payment voucher for urgent boutique stock replenishment delivery',
    recordedBy: 'Sarah Miller (Manager)',
    status: 'Completed'
  },
  {
    id: 'ct-110',
    type: 'CASH_OUT',
    category: 'Petty Cash Payout',
    amount: 4200.00,
    date: '2026-08-10T10:15:00Z',
    sourceDestination: 'Store Operations & Courier Supplies',
    referenceNo: 'PETTY-2026-041',
    paymentMethod: 'cash',
    description: 'Store cleaning supplies, receipt paper rolls, courier packaging bags & staff water',
    recordedBy: 'Alex Johnson (Cashier)',
    status: 'Completed'
  }
];

export const INITIAL_STORES: StoreLocation[] = [
  {
    id: 'store-main',
    name: 'Main Flagship Branch',
    code: 'HQ-CBD',
    city: 'Nairobi',
    address: 'Kenyatta Avenue, City Center, Nairobi',
    phone: '+254 700 111 222',
    isMainBranch: true,
    active: true,
    managerName: 'Sarah Miller'
  },
  {
    id: 'store-westlands',
    name: 'Westlands Mall Branch',
    code: 'WST-02',
    city: 'Nairobi',
    address: 'Sarit Centre, 2nd Floor, Westlands',
    phone: '+254 722 333 444',
    isMainBranch: false,
    active: true,
    managerName: 'John Doe'
  },
  {
    id: 'store-mombasa',
    name: 'Mombasa Coastal Outlet',
    code: 'MBA-03',
    city: 'Mombasa',
    address: 'Nyerere Avenue, Mombasa Island',
    phone: '+254 733 555 666',
    isMainBranch: false,
    active: true,
    managerName: 'David Smith'
  },
  {
    id: 'store-online',
    name: 'Online E-Store Portal',
    code: 'WEB-ECOM',
    city: 'Nationwide Express',
    address: 'https://rofani-store.co.ke',
    phone: '+254 711 000 999',
    isOnlineStorefront: true,
    active: true,
    managerName: 'E-Commerce Logistics Team'
  }
];

export const INITIAL_OFFERS: OfferDeal[] = [
  {
    id: 'offer-1',
    code: 'WELCOME10',
    title: '10% First Order Discount',
    description: 'Enjoy 10% off your entire online order when shopping on our e-store portal.',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 1000,
    bannerTag: '🎉 New Customer',
    active: true,
    storeId: 'all'
  },
  {
    id: 'offer-2',
    code: 'WEEKEND20',
    title: '20% Weekend Electronics Special',
    description: 'Get 20% off all smartphones, audio headsets, and smart accessories!',
    discountType: 'percentage',
    discountValue: 20,
    applicableCategory: 'Electronics',
    bannerTag: '⚡ Flash Sale',
    active: true,
    storeId: 'all'
  },
  {
    id: 'offer-3',
    code: 'FLATSAVE500',
    title: 'KSh 500 Off Big Orders',
    description: 'Flat KSh 500 instant discount on any purchase over KSh 5,000.',
    discountType: 'fixed',
    discountValue: 500,
    minOrderAmount: 5000,
    bannerTag: '🔥 Hot Deal',
    active: true,
    storeId: 'all'
  },
  {
    id: 'offer-4',
    code: 'FREESHIP',
    title: 'Free Express Delivery',
    description: 'Zero delivery charges for online home deliveries above KSh 3,000.',
    discountType: 'fixed',
    discountValue: 350,
    minOrderAmount: 3000,
    bannerTag: '🚚 Free Shipping',
    active: true,
    storeId: 'all'
  }
];

export const INITIAL_ONLINE_ORDERS: OnlineOrder[] = [
  {
    id: 'ord-1001',
    orderNumber: 'ORD-1001',
    storeId: 'store-main',
    storeName: 'Main Flagship Branch',
    customerName: 'Robert Chen',
    customerPhone: '+254 720 123456',
    customerEmail: 'robert.chen@gmail.com',
    deliveryAddress: 'Apt 4B, Westlands Heights, Nairobi',
    deliveryType: 'Delivery',
    items: [
      {
        product: {
          id: 'prod-1',
          name: 'Wireless Bluetooth Headphones',
          sku: 'ELEC-SND-001',
          barcode: '8901234567891',
          category: 'Electronics',
          subcategory: 'Audio',
          sizeCapacity: 'Over-Ear',
          description: 'Noise cancelling over-ear bluetooth headphone with 30hr battery.',
          costPrice: 2800.0,
          sellingPrice: 4200.0,
          stockQuantity: 45,
          minStockAlert: 10,
          unit: 'pcs',
          supplierId: 'sup-1',
          supplierName: 'Apex Electronics Nairobi',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        quantity: 1,
        unitPrice: 4200.0,
        discount: 0,
        total: 4200.0
      }
    ],
    subtotal: 4200.0,
    promoCodeApplied: 'WELCOME10',
    discountAmount: 420.0,
    deliveryFee: 300.0,
    grandTotal: 4080.0,
    paymentMethod: 'mpesa',
    paymentStatus: 'Paid',
    orderStatus: 'Preparing',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    notes: 'Please call on arrival at security gate.'
  },
  {
    id: 'ord-1002',
    orderNumber: 'ORD-1002',
    storeId: 'store-westlands',
    storeName: 'Westlands Mall Branch',
    customerName: 'Grace Wanjiku',
    customerPhone: '+254 712 345678',
    customerEmail: 'grace.w@outlook.com',
    deliveryAddress: 'Sarit Centre Pickup Counter',
    deliveryType: 'Store Pickup',
    items: [
      {
        product: {
          id: 'prod-3',
          name: 'Designer Silk Evening Dress',
          sku: 'FASH-DRS-008',
          barcode: '8901234567893',
          category: 'Boutique & Fashion',
          subcategory: 'Women Dresses',
          sizeCapacity: 'Medium / Emerald Green',
          description: 'Premium imported silk gown with elegant floral stitching.',
          costPrice: 3200.0,
          sellingPrice: 5800.0,
          stockQuantity: 18,
          minStockAlert: 5,
          unit: 'pcs',
          supplierId: 'sup-2',
          supplierName: 'East Africa Fashion Wholesalers',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        quantity: 1,
        unitPrice: 5800.0,
        discount: 0,
        total: 5800.0
      }
    ],
    subtotal: 5800.0,
    promoCodeApplied: 'FLATSAVE500',
    discountAmount: 500.0,
    deliveryFee: 0,
    grandTotal: 5300.0,
    paymentMethod: 'mpesa',
    paymentStatus: 'Paid',
    orderStatus: 'Pending',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    notes: 'Customer will collect around 4:00 PM.'
  }
];

export const INITIAL_STOCK_TRANSFERS: StockTransferRecord[] = [
  {
    id: 'trf-101',
    transferNumber: 'TRF-2026-001',
    sourceStoreId: 'store-main',
    sourceStoreName: 'Main Flagship Branch',
    targetStoreId: 'store-westlands',
    targetStoreName: 'Westlands Mall Branch',
    productId: 'prod-1',
    productName: 'Wireless Bluetooth Headphones',
    sku: 'ELEC-SND-001',
    quantity: 10,
    status: 'Completed',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    transferredBy: 'Sarah Miller (Manager)',
    notes: 'Transfer requested for weekend sales surge at Westlands Mall.'
  },
  {
    id: 'trf-102',
    transferNumber: 'TRF-2026-002',
    sourceStoreId: 'store-main',
    sourceStoreName: 'Main Flagship Branch',
    targetStoreId: 'store-mombasa',
    targetStoreName: 'Mombasa Coastal Outlet',
    productId: 'prod-3',
    productName: 'Designer Silk Evening Dress',
    sku: 'FASH-DRS-008',
    quantity: 5,
    status: 'In Transit',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    transferredBy: 'John Doe (Admin)',
    notes: 'Dispatched via G4S Express Courier.'
  }
];

export const INITIAL_BARCODE_SCAN_LOGS: BarcodeScanLog[] = [
  {
    id: 'scan-log-1',
    barcode: '8901234567891',
    productId: 'prod-1',
    productName: 'Wireless Bluetooth Headphones',
    sku: 'ELEC-SND-001',
    category: 'Electronics',
    subcategory: 'Audio',
    sellingPrice: 4500,
    costPrice: 2800,
    stockQuantity: 28,
    scannedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18 mins ago
    userId: 'usr-1',
    userName: 'John Doe (Admin)',
    userRole: 'Admin',
    scanLocation: 'inventory',
    deviceType: 'barcode_gun',
    actionTaken: 'stock_audit',
    notes: 'Shelf inventory spot check in Section A-3'
  },
  {
    id: 'scan-log-2',
    barcode: '8901234567892',
    productId: 'prod-2',
    productName: 'USB-C Fast Charger 65W',
    sku: 'ELEC-CHG-002',
    category: 'Electronics',
    subcategory: 'Accessories',
    sellingPrice: 1800,
    costPrice: 950,
    stockQuantity: 45,
    scannedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    userId: 'usr-4',
    userName: 'David Smith (Stock Staff)',
    userRole: 'Inventory Staff',
    scanLocation: 'inventory',
    deviceType: 'camera',
    actionTaken: 'view_details',
    notes: 'Stock intake verification from supplier'
  },
  {
    id: 'scan-log-3',
    barcode: '8901234567893',
    productId: 'prod-3',
    productName: 'Designer Silk Evening Dress',
    sku: 'FASH-DRS-008',
    category: 'Fashion & Apparel',
    subcategory: 'Dresses',
    sellingPrice: 8500,
    costPrice: 4800,
    stockQuantity: 12,
    scannedAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(), // ~1.5 hours ago
    userId: 'usr-3',
    userName: 'Alex Johnson (Cashier)',
    userRole: 'Cashier',
    scanLocation: 'pos',
    deviceType: 'barcode_gun',
    actionTaken: 'added_to_cart',
    notes: 'Scanned at Counter 1 checkout'
  },
  {
    id: 'scan-log-4',
    barcode: '8901234567894',
    productId: 'prod-4',
    productName: 'Smart Fitness Tracker Watch',
    sku: 'ELEC-WTC-014',
    category: 'Electronics',
    subcategory: 'Wearables',
    sellingPrice: 6200,
    costPrice: 3800,
    stockQuantity: 19,
    scannedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
    userId: 'usr-2',
    userName: 'Sarah Miller (Manager)',
    userRole: 'Manager',
    scanLocation: 'inventory',
    deviceType: 'barcode_gun',
    actionTaken: 'price_check',
    notes: 'Price audit & label check'
  },
  {
    id: 'scan-log-5',
    barcode: '8901234567895',
    productId: 'prod-5',
    productName: 'Organic Green Tea (100 Bags)',
    sku: 'GROC-TEA-005',
    category: 'Groceries & Foods',
    subcategory: 'Beverages',
    sellingPrice: 750,
    costPrice: 420,
    stockQuantity: 60,
    scannedAt: new Date(Date.now() - 1000 * 60 * 320).toISOString(), // ~5 hours ago
    userId: 'usr-4',
    userName: 'David Smith (Stock Staff)',
    userRole: 'Inventory Staff',
    scanLocation: 'stocktake',
    deviceType: 'camera',
    actionTaken: 'stock_audit',
    notes: 'Weekly cycle count'
  },
  {
    id: 'scan-log-6',
    barcode: '8901234567896',
    productId: 'prod-6',
    productName: 'Stainless Steel Insulated Flask 750ml',
    sku: 'HOME-FLK-006',
    category: 'Home & Kitchen',
    subcategory: 'Cookware',
    sellingPrice: 2200,
    costPrice: 1200,
    stockQuantity: 34,
    scannedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1 - 1000 * 60 * 40).toISOString(), // Yesterday
    userId: 'usr-1',
    userName: 'John Doe (Admin)',
    userRole: 'Admin',
    scanLocation: 'inventory',
    deviceType: 'barcode_gun',
    actionTaken: 'view_details',
    notes: 'Audited aisle 2 inventory tags'
  },
  {
    id: 'scan-log-7',
    barcode: '8901234567897',
    productId: 'prod-7',
    productName: 'Leather Bifold Mens Wallet',
    sku: 'FASH-WAL-007',
    category: 'Fashion & Apparel',
    subcategory: 'Accessories',
    sellingPrice: 2800,
    costPrice: 1400,
    stockQuantity: 22,
    scannedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    userId: 'usr-3',
    userName: 'Alex Johnson (Cashier)',
    userRole: 'Cashier',
    scanLocation: 'pos',
    deviceType: 'barcode_gun',
    actionTaken: 'added_to_cart',
    notes: 'POS Register scan'
  }
];


