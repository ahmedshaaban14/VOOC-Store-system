// Shared TypeScript Interfaces & Types for VOOC Store

export interface Product {
  id: number;
  barcode: string;
  name: string;
  image?: string | null;
  categoryId: number | null;
  categoryName?: string;
  purchasePrice: number;
  salePrice: number;
  currentStock: number;
  minStockLevel: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string | null;
  productCount?: number;
  createdAt: string;
}

export interface Supplier {
  id: number;
  name: string;
  phone?: string | null;
  address?: string | null;
  balance: number;
  invoiceCount?: number;
  createdAt: string;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  points: number;
  balance: number;
  salesCount?: number;
  totalPurchased?: number;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateCustomerInput {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface Expense {
  id: number;
  category: string;
  amount: number;
  notes?: string | null;
  expenseDate: string;
  userId?: number | null;
  userName?: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateExpenseInput {
  category: string;
  amount: number;
  notes?: string;
  expenseDate: string;
}

export interface UpdateExpenseInput {
  category?: string;
  amount?: number;
  notes?: string;
  expenseDate?: string;
}

export interface ExpenseFilterInput {
  category?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

// Phase 6: User Roles & User DTOs
export type UserRole = 'ADMIN' | 'SELLER';

export interface User {
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export type StockMovementType = 'PURCHASE' | 'SALE' | 'SALE_RETURN' | 'PURCHASE_RETURN' | 'ADJUSTMENT';

export interface StockMovement {
  id: number;
  productId: number;
  productName?: string;
  productBarcode?: string;
  movementType: StockMovementType;
  quantityChange: number;
  previousStock: number;
  newStock: number;
  referenceId?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface StockAdjustmentInput {
  productId: number;
  movementType: StockMovementType;
  quantityChange: number;
  referenceId?: string;
  notes?: string;
}

export interface CartItem {
  productId: number;
  barcode: string;
  name: string;
  salePrice: number;
  quantity: number;
  currentStock: number;
  lineTotal: number;
}

export interface PurchaseCartItem {
  productId: number;
  barcode: string;
  name: string;
  unitCost: number;
  quantity: number;
  lineTotal: number;
}

export interface CreateSaleItemInput {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface CreateSaleInput {
  customerId?: number | null;
  items: CreateSaleItemInput[];
  discountAmount: number;
  paidAmount: number;
  paymentType: 'CASH' | 'CARD';
}

export interface Sale {
  id: number;
  customerId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  invoiceNumber: string;
  totalAmount: number;
  discountAmount: number;
  netAmount: number;
  paidAmount: number;
  paymentType: 'CASH' | 'CARD';
  createdByUserId?: number | null;
  createdByName?: string | null;
  createdAt: string;
}

export interface SaleItem {
  id: number;
  saleId: number;
  productId: number;
  productName?: string;
  productBarcode?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SaleWithItems extends Sale {
  items: SaleItem[];
}

export interface CreatePurchaseItemInput {
  productId: number;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseInput {
  supplierId?: number | null;
  items: CreatePurchaseItemInput[];
  paidAmount: number;
  paymentType?: 'CASH' | 'CARD';
}

export interface Purchase {
  id: number;
  supplierId?: number | null;
  supplierName?: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  paymentType?: 'CASH' | 'CARD';
  createdAt: string;
}

export interface PurchaseItem {
  id: number;
  purchaseId: number;
  productId: number;
  productName?: string;
  productBarcode?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseWithItems extends Purchase {
  items: PurchaseItem[];
}

// Phase 5: Sales Return Interfaces
export interface SalesReturn {
  id: number;
  returnNumber: string;
  saleId: number;
  invoiceNumber?: string;
  saleInvoiceNumber?: string;
  totalAmount: number;
  refundAmount: number;
  paymentType: 'CASH' | 'CARD';
  notes?: string | null;
  createdAt: string;
  items?: any[];
}

export interface SalesReturnItemInput {
  productId: number;
  quantity: number;
  unitPrice: number;
  returnQty?: number;
}

export interface CreateSalesReturnInput {
  saleId: number;
  items: SalesReturnItemInput[];
  paymentType: 'CASH' | 'CARD';
  notes?: string;
}

export interface ReturnableSaleItem {
  productId: number;
  productName: string;
  productBarcode: string;
  originalSoldQty: number;
  alreadyReturnedQty: number;
  returnableQty: number;
  unitPrice: number;
  returnQty?: number;
  quantity?: number;
}

// Phase 5: Purchase Return Interfaces
export interface PurchaseReturn {
  id: number;
  returnNumber: string;
  purchaseId: number;
  invoiceNumber?: string;
  purchaseInvoiceNumber?: string;
  totalAmount: number;
  refundAmount: number;
  paymentType: 'CASH' | 'CARD';
  notes?: string | null;
  createdAt: string;
  items?: any[];
}

export interface PurchaseReturnItemInput {
  productId: number;
  quantity: number;
  unitCost: number;
  returnQty?: number;
}

export interface CreatePurchaseReturnInput {
  purchaseId: number;
  items: PurchaseReturnItemInput[];
  paymentType: 'CASH' | 'CARD';
  notes?: string;
}

export interface ReturnablePurchaseItem {
  productId: number;
  productName: string;
  productBarcode: string;
  originalPurchasedQty: number;
  alreadyReturnedQty: number;
  returnableQty: number;
  currentStock: number;
  unitCost: number;
  returnQty?: number;
  quantity?: number;
}

// Phase 5: Cash Register Interfaces
export interface CashTransaction {
  id: number;
  type: 'IN' | 'OUT';
  amount: number;
  category: string;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface CashRegisterSummary {
  openingBalance: number;
  cashSales: number;
  cashPurchases: number;
  salesReturns: number;
  purchaseReturns: number;
  manualIn: number;
  manualOut: number;
  currentBalance: number;
  transactionCount: number;
}

export interface Expense {
  id: number;
  category: string;
  amount: number;
  notes?: string | null;
  expenseDate: string;
  createdAt: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  description?: string | null;
  updatedAt: string;
}

// Navigation Tab identifiers
export type NavigationTab =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'purchases'
  | 'sales'
  | 'sales_returns'
  | 'purchase_returns'
  | 'inventory'
  | 'inventory_movements'
  | 'customers'
  | 'suppliers'
  | 'cash_register'
  | 'expenses'
  | 'reports'
  | 'print_settings'
  | 'users'
  | 'backup'
  | 'audit_logs';

// Phase 7: Audit Log Types
export type AuditLogAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CHANGE_PASSWORD'
  | 'CREATE_SALE'
  | 'CREATE_SALES_RETURN'
  | 'CREATE_PURCHASE'
  | 'CREATE_PURCHASE_RETURN'
  | 'CREATE_PRODUCT'
  | 'UPDATE_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'CREATE_CUSTOMER'
  | 'UPDATE_CUSTOMER'
  | 'DELETE_CUSTOMER'
  | 'CREATE_EXPENSE'
  | 'UPDATE_EXPENSE'
  | 'DELETE_EXPENSE'
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'ACTIVATE_USER'
  | 'DEACTIVATE_USER'
  | 'OPEN_CASH_REGISTER'
  | 'CASH_IN'
  | 'CASH_OUT'
  | 'BACKUP_DATABASE'
  | 'RESTORE_DATABASE'
  | 'PRINT_SALE'
  | 'REPRINT_SALE'
  | 'EXPORT_SALES_REPORT'
  | 'EXPORT_PURCHASE_REPORT'
  | 'EXPORT_PROFIT_REPORT'
  | 'EXPORT_INVENTORY_REPORT'
  | 'EXPORT_CASH_REPORT';

// Phase 8: Printing & Receipts Types
export interface PrinterInfo {
  name: string;
  displayName?: string;
  description?: string;
  status?: number;
  isDefault: boolean;
}

export interface PrintSettings {
  autoPrint: boolean;
  printerName: string;
  paperWidth: '80mm';
  showPreviewBeforePrint: boolean;
  storeName?: string;
  storePhone?: string;
  storeAddress?: string;
  footerNote?: string;
}

export interface InvoicePrintItem {
  productName: string;
  productBarcode?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoicePrintData {
  invoiceNumber: string;
  createdAt: string;
  items: InvoicePrintItem[];
  totalAmount: number;
  discountAmount: number;
  netAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentType: string;
  sellerName?: string;
  customerName?: string;
  storeName?: string;
  storePhone?: string;
  storeAddress?: string;
  footerNote?: string;
}

export interface PrintResult {
  success: boolean;
  message?: string;
  error?: string;
}

// Phase 9: Reports & Analytics Types
export type ReportDatePreset =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom';

export interface ReportFilter {
  fromDate?: string;
  toDate?: string;
  sellerId?: number;
  paymentType?: string;
  supplierId?: number;
  categoryId?: number;
  productId?: number;
  invoiceNumber?: string;
}

export interface DashboardAnalytics {
  totalSales: number;
  netSales: number;
  totalInvoices: number;
  totalPurchases?: number;
  totalSalesReturns: number;
  totalPurchaseReturns?: number;
  grossProfit?: number;
  profitMargin?: number;
  inventoryValue?: number;
  currentCashBalance?: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  salesTrend: { date: string; sales: number; netSales: number; invoicesCount: number }[];
  salesByPaymentType: { type: string; total: number; count: number }[];
  topProducts: { productId: number; productName: string; quantitySold: number; totalRevenue: number }[];
}

export interface SalesReportRow {
  id: number;
  invoiceNumber: string;
  createdAt: string;
  sellerName?: string;
  paymentType: string;
  totalAmount: number;
  discountAmount: number;
  netAmount: number;
  paidAmount: number;
  changeAmount: number;
  itemsCount: number;
}

export interface SalesReport {
  summary: {
    totalInvoices: number;
    grossSales: number;
    totalDiscounts: number;
    totalReturns: number;
    netSales: number;
    totalCash: number;
    totalCard: number;
  };
  rows: SalesReportRow[];
}

export interface PurchaseReportRow {
  id: number;
  invoiceNumber: string;
  createdAt: string;
  supplierName?: string;
  totalAmount: number;
  paidAmount: number;
  itemsCount: number;
}

export interface PurchaseReport {
  summary: {
    totalPurchases: number;
    totalAmount: number;
    totalReturns: number;
    netPurchases: number;
  };
  rows: PurchaseReportRow[];
}

export interface ProfitReportRow {
  productId: number;
  productName: string;
  productBarcode?: string;
  quantitySold: number;
  revenue: number;
  returnedQty: number;
  netRevenue: number;
  historicalUnitCost: number;
  totalCogs: number;
  grossProfit: number;
  profitMarginPercent: number;
}

export interface ProfitReport {
  summary: {
    grossSales: number;
    totalDiscounts: number;
    salesReturnsAmount: number;
    netSales: number;
    totalCogs: number;
    grossProfit: number;
    profitMarginPercent: number;
  };
  rows: ProfitReportRow[];
}

export interface InventoryReportRow {
  id: number;
  name: string;
  barcode: string;
  categoryName?: string;
  currentStock: number;
  minStockLevel: number;
  salePrice: number;
  purchasePrice?: number;
  totalValue?: number;
  status: 'NORMAL' | 'LOW' | 'OUT';
}

export interface InventoryReport {
  summary: {
    totalProducts: number;
    totalStockQuantity: number;
    inStockCount: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalInventoryValue?: number;
  };
  rows: InventoryReportRow[];
}

export interface CashReportRow {
  id: number;
  createdAt: string;
  type: 'IN' | 'OUT';
  amount: number;
  category: string;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
}

export interface CashReport {
  summary: {
    openingBalance: number;
    totalIn: number;
    totalOut: number;
    cashSales: number;
    salesReturns: number;
    cashPurchases: number;
    purchaseReturns: number;
    manualIn: number;
    manualOut: number;
    currentBalance: number;
  };
  rows: CashReportRow[];
}

export interface ReportExportOptions {
  title: string;
  filename: string;
  format: 'csv' | 'pdf';
  headers: string[];
  rows: (string | number)[][];
  summary?: { label: string; value: string | number }[];
  dateRangeText?: string;
}

export interface ReportExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface AuditLog {
  id: number;
  userId?: number | null;
  username: string;
  displayName: string;
  action: AuditLogAction;
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: string | null;
  createdAt: string;
}

export interface AuditLogFilterInput {
  userId?: number;
  action?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

// Phase 7: Backup & Restore Types
export interface BackupInfo {
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  formattedFileSize: string;
  backupCreatedAt: string;
  productCount: number;
  salesCount: number;
  purchaseCount: number;
  userCount: number;
}

export interface BackupValidationResult {
  isValid: boolean;
  errorMessage?: string;
  info?: BackupInfo;
}

export interface RestoreResult {
  success: boolean;
  message?: string;
  safetyBackupPath?: string;
  error?: string;
}

// Dashboard summary data structure
export interface DashboardSummary {
  todaySales: number;
  todayPurchases: number;
  todayProfit: number;
  currentInventoryValue: number;
  totalProductsCount: number;
  lowStockProductsCount: number;
}

// Standard Service Response
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// IPC Channels contract
export interface ElectronAPI {
  // Authentication
  login: (username: string, password: string) => Promise<ServiceResult<User>>;
  logout: () => Promise<ServiceResult<boolean>>;
  getCurrentUser: () => Promise<User | null>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<ServiceResult<boolean>>;

  // Users Management (Admin Only)
  getUsers: () => Promise<User[]>;
  createUser: (data: { username: string; password: string; displayName: string; role: UserRole }) => Promise<ServiceResult<User>>;
  updateUser: (id: number, data: { displayName?: string; role?: UserRole; username?: string }) => Promise<ServiceResult<User>>;
  setUserActive: (id: number, isActive: boolean) => Promise<ServiceResult<boolean>>;

  // Products
  getProducts: () => Promise<Product[]>;
  getProductByBarcode: (barcode: string) => Promise<Product | null>;
  createProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ServiceResult<Product>>;
  updateProduct: (id: number, product: Partial<Product>) => Promise<ServiceResult<Product>>;
  deleteProduct: (id: number) => Promise<ServiceResult<boolean>>;
  saveProductImage: (fileData: ArrayBuffer, fileName: string) => Promise<ServiceResult<string>>;
  getProductImageData: (imagePathOrName?: string | null) => Promise<ServiceResult<string | null>>;

  // Categories
  getCategories: () => Promise<Category[]>;
  createCategory: (data: { name: string; description?: string }) => Promise<ServiceResult<Category>>;
  updateCategory: (id: number, data: { name?: string; description?: string }) => Promise<ServiceResult<Category>>;
  deleteCategory: (id: number) => Promise<ServiceResult<boolean>>;

  // Customers
  getCustomers: (search?: string) => Promise<Customer[]>;
  getCustomerById: (id: number) => Promise<Customer | null>;
  createCustomer: (data: CreateCustomerInput) => Promise<ServiceResult<Customer>>;
  updateCustomer: (id: number, data: UpdateCustomerInput) => Promise<ServiceResult<Customer>>;
  deleteCustomer: (id: number) => Promise<ServiceResult<boolean>>;

  // Expenses
  getExpenses: (filter?: ExpenseFilterInput) => Promise<Expense[]>;
  getExpenseById: (id: number) => Promise<Expense | null>;
  createExpense: (data: CreateExpenseInput) => Promise<ServiceResult<Expense>>;
  updateExpense: (id: number, data: UpdateExpenseInput) => Promise<ServiceResult<Expense>>;
  deleteExpense: (id: number) => Promise<ServiceResult<boolean>>;

  // Suppliers
  getSuppliers: () => Promise<Supplier[]>;
  createSupplier: (data: { name: string; phone?: string; address?: string }) => Promise<ServiceResult<Supplier>>;
  updateSupplier: (id: number, data: { name?: string; phone?: string; address?: string }) => Promise<ServiceResult<Supplier>>;
  deleteSupplier: (id: number) => Promise<ServiceResult<boolean>>;

  // Inventory & Movements
  getInventoryItems: () => Promise<Product[]>;
  getStockMovements: () => Promise<StockMovement[]>;
  adjustStock: (input: StockAdjustmentInput) => Promise<ServiceResult<Product>>;

  // Sales & POS
  createSale: (input: CreateSaleInput) => Promise<ServiceResult<SaleWithItems>>;
  getSalesList: () => Promise<Sale[]>;
  getSaleDetails: (id: number) => Promise<SaleWithItems | null>;

  // Purchases
  createPurchase: (input: CreatePurchaseInput) => Promise<ServiceResult<PurchaseWithItems>>;
  getPurchasesList: () => Promise<Purchase[]>;
  getPurchaseDetails: (id: number) => Promise<PurchaseWithItems | null>;

  // Sales Returns
  getSalesReturnsList: () => Promise<SalesReturn[]>;
  getReturnableSaleDetails: (saleId: number) => Promise<{ sale: Sale; items: ReturnableSaleItem[] } | null>;
  createSalesReturn: (input: CreateSalesReturnInput) => Promise<ServiceResult<SalesReturn>>;

  // Purchase Returns
  getPurchaseReturnsList: () => Promise<PurchaseReturn[]>;
  getReturnablePurchaseDetails: (purchaseId: number) => Promise<{ purchase: Purchase; items: ReturnablePurchaseItem[] } | null>;
  createPurchaseReturn: (input: CreatePurchaseReturnInput) => Promise<ServiceResult<PurchaseReturn>>;

  // Cash Register
  getCashRegisterSummary: () => Promise<CashRegisterSummary>;
  getCashTransactions: () => Promise<CashTransaction[]>;
  openCashRegister: (amount: number) => Promise<ServiceResult<CashTransaction>>;
  manualCashIn: (amount: number, notes?: string) => Promise<ServiceResult<CashTransaction>>;
  manualCashOut: (amount: number, notes?: string) => Promise<ServiceResult<CashTransaction>>;

  // Dashboard & System
  getDashboardSummary: () => Promise<DashboardSummary>;
  getSystemInfo: () => Promise<{ appName: string; version: string; isOffline: boolean; dbPath: string }>;

  // Phase 7: Backup & Restore (Admin Only)
  backup?: {
    create: () => Promise<ServiceResult<{ filePath: string }>>;
    validate: (filePath?: string) => Promise<ServiceResult<BackupValidationResult>>;
    restore: (filePath: string) => Promise<ServiceResult<RestoreResult>>;
  };

  // Phase 7: Audit Log (Admin Only)
  auditLogs?: {
    get: (filters?: AuditLogFilterInput) => Promise<ServiceResult<AuditLog[]>>;
    getDetails: (id: number) => Promise<ServiceResult<AuditLog | null>>;
  };

  // Phase 8: Printing & Receipts
  printing?: {
    getPrinters: () => Promise<ServiceResult<PrinterInfo[]>>;
    getDefaultPrinter: () => Promise<ServiceResult<PrinterInfo | null>>;
    getSettings: () => Promise<ServiceResult<PrintSettings>>;
    updateSettings: (settings: Partial<PrintSettings>) => Promise<ServiceResult<PrintSettings>>;
    printInvoice: (data: InvoicePrintData) => Promise<ServiceResult<PrintResult>>;
    testPrint: (printerName?: string) => Promise<ServiceResult<PrintResult>>;
  };

  // Phase 9: Reports & Analytics
  reports?: {
    getDashboard: (filter?: ReportFilter) => Promise<ServiceResult<DashboardAnalytics>>;
    getSales: (filter?: ReportFilter) => Promise<ServiceResult<SalesReport>>;
    getPurchases: (filter?: ReportFilter) => Promise<ServiceResult<PurchaseReport>>;
    getProfit: (filter?: ReportFilter) => Promise<ServiceResult<ProfitReport>>;
    getInventory: (filter?: ReportFilter) => Promise<ServiceResult<InventoryReport>>;
    getCash: (filter?: ReportFilter) => Promise<ServiceResult<CashReport>>;
    getTopProducts: (limit?: number, filter?: ReportFilter) => Promise<ServiceResult<DashboardAnalytics['topProducts']>>;
    getSalesTrend: (filter?: ReportFilter) => Promise<ServiceResult<DashboardAnalytics['salesTrend']>>;
    exportCsv: (options: ReportExportOptions) => Promise<ServiceResult<ReportExportResult>>;
    exportPdf: (options: ReportExportOptions) => Promise<ServiceResult<ReportExportResult>>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
