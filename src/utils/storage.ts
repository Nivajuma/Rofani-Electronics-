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
  const data = localStorage.getItem(KEYS.CATEGORIES);
  return data ? JSON.parse(data) : INITIAL_CATEGORIES;
};

export const saveCategories = (categories: any[]) => {
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
};

export const getStoredSuppliers = (): Supplier[] => {
  const data = localStorage.getItem(KEYS.SUPPLIERS);
  return data ? JSON.parse(data) : INITIAL_SUPPLIERS;
};

export const saveSuppliers = (suppliers: Supplier[]) => {
  localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
};

export const getStoredCustomers = (): Customer[] => {
  const data = localStorage.getItem(KEYS.CUSTOMERS);
  return data ? JSON.parse(data) : INITIAL_CUSTOMERS;
};

export const saveCustomers = (customers: Customer[]) => {
  localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
};

export const getStoredExpenses = (): Expense[] => {
  const data = localStorage.getItem(KEYS.EXPENSES);
  return data ? JSON.parse(data) : INITIAL_EXPENSES;
};

export const saveExpenses = (expenses: Expense[]) => {
  localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
};

export const getStoredAttendance = (): AttendanceRecord[] => {
  const data = localStorage.getItem(KEYS.ATTENDANCE);
  return data ? JSON.parse(data) : INITIAL_ATTENDANCE;
};

export const saveAttendance = (records: AttendanceRecord[]) => {
  localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(records));
};

export const getStoredTransactions = (): Transaction[] => {
  const data = localStorage.getItem(KEYS.TRANSACTIONS);
  return data ? JSON.parse(data) : INITIAL_TRANSACTIONS;
};

export const saveTransactions = (txs: Transaction[]) => {
  localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs));
};

export const getStoredUsers = (): User[] => {
  const data = localStorage.getItem(KEYS.USERS);
  return data ? JSON.parse(data) : INITIAL_USERS;
};

export const saveUsers = (users: User[]) => {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
};

export const getCurrentUser = (): User => {
  const data = localStorage.getItem(KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : INITIAL_USERS[0]; // Admin by default
};

export const setCurrentUser = (user: User) => {
  localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
};

export const resetToSampleData = () => {
  localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
  localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(INITIAL_SUPPLIERS));
  localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
  localStorage.setItem(KEYS.EXPENSES, JSON.stringify(INITIAL_EXPENSES));
  localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(INITIAL_ATTENDANCE));
  localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
  localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
  localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
};
