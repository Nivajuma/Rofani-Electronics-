import { Product, Customer, Supplier, Expense, AttendanceRecord, Transaction, User } from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_SUPPLIERS,
  INITIAL_CUSTOMERS,
  INITIAL_EXPENSES,
  INITIAL_ATTENDANCE,
  INITIAL_TRANSACTIONS,
  INITIAL_USERS
} from '../data/initialData';

import { safeSetJSON, safeGetJSON } from './safeStorage';
import { saveAllProductImagesToIndexedDB } from './imageStorage';

const KEYS = {
  PRODUCTS: 'retail_pos_products',
  CATEGORIES: 'retail_pos_categories',
  SUPPLIERS: 'retail_pos_suppliers',
  CUSTOMERS: 'retail_pos_customers',
  EXPENSES: 'retail_pos_expenses',
  ATTENDANCE: 'retail_pos_attendance',
  TRANSACTIONS: 'retail_pos_transactions',
  USERS: 'retail_pos_users',
  CURRENT_USER: 'retail_pos_current_user',
  CURRENCY: 'retail_pos_currency_code',
};

export const getStoredProducts = (): Product[] => {
  return safeGetJSON(KEYS.PRODUCTS, INITIAL_PRODUCTS);
};

export const saveProducts = (products: Product[]) => {
  saveAllProductImagesToIndexedDB(products);
  safeSetJSON(KEYS.PRODUCTS, products);
};

export const getStoredCategories = () => {
  return safeGetJSON(KEYS.CATEGORIES, INITIAL_CATEGORIES);
};

export const saveCategories = (categories: any[]) => {
  safeSetJSON(KEYS.CATEGORIES, categories);
};

export const getStoredSuppliers = (): Supplier[] => {
  return safeGetJSON<Supplier[]>(KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
};

export const saveSuppliers = (suppliers: Supplier[]) => {
  safeSetJSON(KEYS.SUPPLIERS, suppliers);
};

export const getStoredCustomers = (): Customer[] => {
  return safeGetJSON<Customer[]>(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
};

export const saveCustomers = (customers: Customer[]) => {
  safeSetJSON(KEYS.CUSTOMERS, customers);
};

export const getStoredExpenses = (): Expense[] => {
  return safeGetJSON<Expense[]>(KEYS.EXPENSES, INITIAL_EXPENSES);
};

export const saveExpenses = (expenses: Expense[]) => {
  safeSetJSON(KEYS.EXPENSES, expenses);
};

export const getStoredAttendance = (): AttendanceRecord[] => {
  return safeGetJSON<AttendanceRecord[]>(KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
};

export const saveAttendance = (records: AttendanceRecord[]) => {
  safeSetJSON(KEYS.ATTENDANCE, records);
};

export const getStoredTransactions = (): Transaction[] => {
  return safeGetJSON<Transaction[]>(KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
};

export const saveTransactions = (txs: Transaction[]) => {
  safeSetJSON(KEYS.TRANSACTIONS, txs);
};

export const getStoredUsers = (): User[] => {
  return safeGetJSON<User[]>(KEYS.USERS, INITIAL_USERS);
};

export const saveUsers = (users: User[]) => {
  safeSetJSON(KEYS.USERS, users);
};

export const getCurrentUser = (): User => {
  return safeGetJSON<User>(KEYS.CURRENT_USER, INITIAL_USERS[0]);
};

export const setCurrentUser = (user: User) => {
  safeSetJSON(KEYS.CURRENT_USER, user);
};

export const resetToSampleData = () => {
  saveProducts(INITIAL_PRODUCTS);
  safeSetJSON(KEYS.CATEGORIES, INITIAL_CATEGORIES);
  safeSetJSON(KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  safeSetJSON(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  safeSetJSON(KEYS.EXPENSES, INITIAL_EXPENSES);
  safeSetJSON(KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
  safeSetJSON(KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  safeSetJSON(KEYS.USERS, INITIAL_USERS);
  safeSetJSON(KEYS.CURRENT_USER, INITIAL_USERS[0]);
};
