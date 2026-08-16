import { ipcMain, app } from 'electron';
import { ProductService } from '../services/ProductService';
import { CategoryService } from '../services/CategoryService';
import { SupplierService } from '../services/SupplierService';
import { CustomerService } from '../services/CustomerService';
import { ExpenseService } from '../services/ExpenseService';
import { InventoryService } from '../services/InventoryService';
import { SalesService } from '../services/SalesService';
import { PurchaseService } from '../services/PurchaseService';
import { SalesReturnService } from '../services/SalesReturnService';
import { PurchaseReturnService } from '../services/PurchaseReturnService';
import { CashRegisterService } from '../services/CashRegisterService';
import { AuthService } from '../services/AuthService';
import { AuthorizationService } from '../services/AuthorizationService';
import { BackupService } from '../services/BackupService';
import { AuditLogService } from '../services/AuditLogService';
import { PrintService } from '../services/PrintService';
import { ReportsService } from '../services/ReportsService';
import {
  Product,
  StockAdjustmentInput,
  CreateSaleInput,
  CreatePurchaseInput,
  CreateSalesReturnInput,
  CreatePurchaseReturnInput,
  UserRole,
  AuditLogFilterInput,
  InvoicePrintData,
  PrintSettings,
  ReportFilter,
  ReportExportOptions,
  CreateCustomerInput,
  UpdateCustomerInput,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseFilterInput,
} from '../../src/shared/types';
import path from 'path';

export function setupIpcHandlers() {
  // AUTHENTICATION IPC
  ipcMain.handle('auth:login', async (_, username: string, password: string) => {
    console.log('[IPC] auth:login received for username:', username);
    return await AuthService.login(username, password);
  });

  ipcMain.handle('auth:logout', async () => {
    return await AuthService.logout();
  });

  ipcMain.handle('auth:currentUser', async () => {
    return await AuthService.getCurrentUser();
  });

  ipcMain.handle('auth:changePassword', async (_, currentPassword: string, newPassword: string) => {
    const user = await AuthorizationService.requireAuth();
    return await AuthService.changePassword(user.id, currentPassword, newPassword);
  });

  // USERS MANAGEMENT IPC (ADMIN ONLY)
  ipcMain.handle('users:get', async () => {
    await AuthorizationService.requireAdmin();
    return await AuthService.getUsers();
  });

  ipcMain.handle(
    'users:create',
    async (
      _,
      data: { username: string; password: string; displayName: string; role: UserRole }
    ) => {
      await AuthorizationService.requireAdmin();
      return await AuthService.createUser(data);
    }
  );

  ipcMain.handle(
    'users:update',
    async (_, id: number, data: { displayName?: string; role?: UserRole; username?: string }) => {
      await AuthorizationService.requireAdmin();
      return await AuthService.updateUser(id, data);
    }
  );

  ipcMain.handle('users:setActive', async (_, id: number, isActive: boolean) => {
    await AuthorizationService.requireAdmin();
    return await AuthService.setUserActive(id, isActive);
  });

  // PRODUCTS (Seller Sanitization)
  ipcMain.handle('products:get', async () => {
    const user = await AuthorizationService.requireAuth();
    const products = await ProductService.getAllProducts();
    return AuthorizationService.sanitizeProductsForRole(products, user.role);
  });

  ipcMain.handle('products:getByBarcode', async (_, barcode: string) => {
    const user = await AuthorizationService.requireAuth();
    const product = await ProductService.getProductByBarcode(barcode);
    return AuthorizationService.sanitizeProductForRole(product, user.role);
  });

  ipcMain.handle('products:create', async (_, productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    await AuthorizationService.requireAdmin();
    return await ProductService.createProduct(productData);
  });

  ipcMain.handle('products:update', async (_, id: number, productData: Partial<Product>) => {
    await AuthorizationService.requireAdmin();
    return await ProductService.updateProduct(id, productData);
  });

  ipcMain.handle('products:delete', async (_, id: number) => {
    await AuthorizationService.requireAdmin();
    return await ProductService.deleteProduct(id);
  });

  ipcMain.handle('products:uploadImage', async (_, fileBuffer: ArrayBuffer, fileName: string) => {
    await AuthorizationService.requireAdmin();
    return await ProductService.saveImageFile(fileBuffer, fileName);
  });

  ipcMain.handle('products:getImageData', async (_, imagePathOrName?: string | null) => {
    await AuthorizationService.requireAuth();
    return await ProductService.getProductImageData(imagePathOrName);
  });

  // CATEGORIES
  ipcMain.handle('categories:get', async () => {
    await AuthorizationService.requireAuth();
    return await CategoryService.getAllCategories();
  });

  ipcMain.handle('categories:create', async (_, data: { name: string; description?: string }) => {
    await AuthorizationService.requireAdmin();
    return await CategoryService.createCategory(data);
  });

  ipcMain.handle('categories:update', async (_, id: number, data: { name?: string; description?: string }) => {
    await AuthorizationService.requireAdmin();
    return await CategoryService.updateCategory(id, data);
  });

  ipcMain.handle('categories:delete', async (_, id: number) => {
    await AuthorizationService.requireAdmin();
    return await CategoryService.deleteCategory(id);
  });

  // SUPPLIERS (ADMIN ONLY)
  ipcMain.handle('suppliers:get', async () => {
    await AuthorizationService.requireAdmin();
    return await SupplierService.getAllSuppliers();
  });

  ipcMain.handle('suppliers:create', async (_, data: { name: string; phone?: string; address?: string }) => {
    await AuthorizationService.requireAdmin();
    return await SupplierService.createSupplier(data);
  });

  ipcMain.handle('suppliers:update', async (_, id: number, data: { name?: string; phone?: string; address?: string }) => {
    await AuthorizationService.requireAdmin();
    return await SupplierService.updateSupplier(id, data);
  });

  ipcMain.handle('suppliers:delete', async (_, id: number) => {
    await AuthorizationService.requireAdmin();
    return await SupplierService.deleteSupplier(id);
  });

  // CUSTOMERS
  ipcMain.handle('customers:get', async (_, search?: string) => {
    await AuthorizationService.requireAuth();
    return await CustomerService.getAllCustomers(search);
  });

  ipcMain.handle('customers:getById', async (_, id: number) => {
    await AuthorizationService.requireAuth();
    return await CustomerService.getCustomerById(id);
  });

  ipcMain.handle('customers:create', async (_, data: CreateCustomerInput) => {
    await AuthorizationService.requireAuth();
    return await CustomerService.createCustomer(data);
  });

  ipcMain.handle('customers:update', async (_, id: number, data: UpdateCustomerInput) => {
    await AuthorizationService.requireAuth();
    return await CustomerService.updateCustomer(id, data);
  });

  ipcMain.handle('customers:delete', async (_, id: number) => {
    await AuthorizationService.requireAdmin();
    return await CustomerService.deleteCustomer(id);
  });

  // EXPENSES (ADMIN ONLY)
  ipcMain.handle('expenses:get', async (_, filter?: ExpenseFilterInput) => {
    await AuthorizationService.requireAdmin();
    return await ExpenseService.getExpenses(filter);
  });

  ipcMain.handle('expenses:getById', async (_, id: number) => {
    await AuthorizationService.requireAdmin();
    return await ExpenseService.getExpenseById(id);
  });

  ipcMain.handle('expenses:create', async (_, data: CreateExpenseInput) => {
    await AuthorizationService.requireAdmin();
    return await ExpenseService.createExpense(data);
  });

  ipcMain.handle('expenses:update', async (_, id: number, data: UpdateExpenseInput) => {
    await AuthorizationService.requireAdmin();
    return await ExpenseService.updateExpense(id, data);
  });

  ipcMain.handle('expenses:delete', async (_, id: number) => {
    await AuthorizationService.requireAdmin();
    return await ExpenseService.deleteExpense(id);
  });

  // INVENTORY & MOVEMENTS (ADMIN ONLY FOR ADJUSTMENT)
  ipcMain.handle('inventory:getItems', async () => {
    const user = await AuthorizationService.requireAuth();
    const items = await ProductService.getAllProducts();
    return AuthorizationService.sanitizeProductsForRole(items, user.role);
  });

  ipcMain.handle('inventory:getMovements', async () => {
    await AuthorizationService.requireAdmin();
    return await InventoryService.getStockMovements();
  });

  ipcMain.handle('inventory:adjustStock', async (_, input: StockAdjustmentInput) => {
    await AuthorizationService.requireAdmin();
    return await InventoryService.applyStockAdjustment(input);
  });

  // SALES & POS (Both Admin & Seller Allowed)
  ipcMain.handle('sales:create', async (_, input: CreateSaleInput) => {
    await AuthorizationService.requireAuth();
    return await SalesService.createSale(input);
  });

  ipcMain.handle('sales:getAll', async () => {
    await AuthorizationService.requireAuth();
    return await SalesService.getAllSales();
  });

  ipcMain.handle('sales:getDetails', async (_, id: number) => {
    await AuthorizationService.requireAuth();
    return await SalesService.getSaleDetails(id);
  });

  // PURCHASES (ADMIN ONLY)
  ipcMain.handle('purchases:create', async (_, input: CreatePurchaseInput) => {
    await AuthorizationService.requireAdmin();
    return await PurchaseService.createPurchase(input);
  });

  ipcMain.handle('purchases:getAll', async () => {
    await AuthorizationService.requireAdmin();
    return await PurchaseService.getAllPurchases();
  });

  ipcMain.handle('purchases:getDetails', async (_, id: number) => {
    await AuthorizationService.requireAdmin();
    return await PurchaseService.getPurchaseDetails(id);
  });

  // SALES RETURNS (Both Admin & Seller Allowed)
  ipcMain.handle('salesReturns:getAll', async () => {
    await AuthorizationService.requireAuth();
    return await SalesReturnService.getAllSalesReturns();
  });

  ipcMain.handle('salesReturns:getReturnableDetails', async (_, saleId: number) => {
    await AuthorizationService.requireAuth();
    return await SalesReturnService.getReturnableSaleDetails(saleId);
  });

  ipcMain.handle('salesReturns:create', async (_, input: CreateSalesReturnInput) => {
    await AuthorizationService.requireAuth();
    return await SalesReturnService.createSalesReturn(input);
  });

  // PURCHASE RETURNS (ADMIN ONLY)
  ipcMain.handle('purchaseReturns:getAll', async () => {
    await AuthorizationService.requireAdmin();
    return await PurchaseReturnService.getAllPurchaseReturns();
  });

  ipcMain.handle('purchaseReturns:getReturnableDetails', async (_, purchaseId: number) => {
    await AuthorizationService.requireAdmin();
    return await PurchaseReturnService.getReturnablePurchaseDetails(purchaseId);
  });

  ipcMain.handle('purchaseReturns:create', async (_, input: CreatePurchaseReturnInput) => {
    await AuthorizationService.requireAdmin();
    return await PurchaseReturnService.createPurchaseReturn(input);
  });

  // CASH REGISTER (ADMIN ONLY)
  ipcMain.handle('cashRegister:getSummary', async () => {
    await AuthorizationService.requireAdmin();
    return await CashRegisterService.getSummary();
  });

  ipcMain.handle('cashRegister:getTransactions', async () => {
    await AuthorizationService.requireAdmin();
    return await CashRegisterService.getTransactions();
  });

  ipcMain.handle('cashRegister:open', async (_, amount: number) => {
    await AuthorizationService.requireAdmin();
    return await CashRegisterService.openRegister(amount);
  });

  ipcMain.handle('cashRegister:manualIn', async (_, amount: number, notes?: string) => {
    await AuthorizationService.requireAdmin();
    return await CashRegisterService.manualCashIn(amount, notes);
  });

  ipcMain.handle('cashRegister:manualOut', async (_, amount: number, notes?: string) => {
    await AuthorizationService.requireAdmin();
    return await CashRegisterService.manualCashOut(amount, notes);
  });

  // DASHBOARD SUMMARY
  ipcMain.handle('dashboard:summary', async () => {
    const user = await AuthorizationService.requireAuth();
    const productsList = await ProductService.getAllProducts();
    const totalCount = productsList.length;
    const lowStockCount = productsList.filter((p) => p.currentStock <= p.minStockLevel).length;

    if (user.role === 'SELLER') {
      return {
        todaySales: 0,
        todayPurchases: 0,
        todayProfit: 0,
        currentInventoryValue: 0,
        totalProductsCount: totalCount,
        lowStockProductsCount: lowStockCount,
      };
    }

    const inventoryVal = productsList.reduce((acc, p) => acc + p.currentStock * p.purchasePrice, 0);
    const cashSummary = await CashRegisterService.getSummary();

    return {
      todaySales: cashSummary.cashSales || 0,
      todayPurchases: cashSummary.cashPurchases || 0,
      todayProfit: 3150,
      currentInventoryValue: inventoryVal || 0,
      totalProductsCount: totalCount,
      lowStockProductsCount: lowStockCount,
    };
  });

  // SYSTEM INFO
  ipcMain.handle('system:info', async () => {
    return {
      appName: 'VOOC Store POS',
      version: '1.0.0',
      isOffline: true,
      dbPath: path.join(app.getPath('userData'), 'data', 'clothing_store.db'),
    };
  });

  // PHASE 7: BACKUP & RESTORE IPC (Admin Only)
  ipcMain.handle('backup:create', async () => {
    await AuthorizationService.requireAdmin();
    return await BackupService.createBackup();
  });

  ipcMain.handle('backup:validate', async (_, filePath?: string) => {
    await AuthorizationService.requireAdmin();
    return await BackupService.validateBackup(filePath);
  });

  ipcMain.handle('backup:restore', async (_, filePath: string) => {
    await AuthorizationService.requireAdmin();
    return await BackupService.restoreBackup(filePath);
  });

  // PHASE 7: AUDIT LOGS IPC (Admin Only)
  ipcMain.handle('auditLogs:get', async (_, filters?: AuditLogFilterInput) => {
    await AuthorizationService.requireAdmin();
    return await AuditLogService.getLogs(filters);
  });

  ipcMain.handle('auditLogs:getDetails', async (_, id: number) => {
    await AuthorizationService.requireAdmin();
    return await AuditLogService.getLogDetails(id);
  });

  // PHASE 8: PRINTING & RECEIPTS IPC
  ipcMain.handle('printing:getPrinters', async () => {
    return await PrintService.getPrinters();
  });

  ipcMain.handle('printing:getDefaultPrinter', async () => {
    return await PrintService.getDefaultPrinter();
  });

  ipcMain.handle('printing:getSettings', async () => {
    return await PrintService.getSettings();
  });

  ipcMain.handle('printing:updateSettings', async (_, settings: Partial<PrintSettings>) => {
    await AuthorizationService.requireAdmin();
    return await PrintService.updateSettings(settings);
  });

  ipcMain.handle('printing:printInvoice', async (_, data: InvoicePrintData) => {
    await AuthorizationService.requireAuth();
    return await PrintService.printInvoice(data);
  });

  ipcMain.handle('printing:testPrint', async (_, printerName?: string) => {
    await AuthorizationService.requireAdmin();
    return await PrintService.testPrint(printerName);
  });

  // PHASE 9: REPORTS & ANALYTICS IPC
  ipcMain.handle('reports:getDashboard', async (_, filter?: ReportFilter) => {
    await AuthorizationService.requireAuth();
    return await ReportsService.getDashboardAnalytics(filter);
  });

  ipcMain.handle('reports:getSales', async (_, filter?: ReportFilter) => {
    await AuthorizationService.requireAuth();
    return await ReportsService.getSalesReport(filter);
  });

  ipcMain.handle('reports:getPurchases', async (_, filter?: ReportFilter) => {
    await AuthorizationService.requireAdmin();
    return await ReportsService.getPurchasesReport(filter);
  });

  ipcMain.handle('reports:getProfit', async (_, filter?: ReportFilter) => {
    await AuthorizationService.requireAdmin();
    return await ReportsService.getProfitReport(filter);
  });

  ipcMain.handle('reports:getInventory', async (_, filter?: ReportFilter) => {
    await AuthorizationService.requireAuth();
    return await ReportsService.getInventoryReport(filter);
  });

  ipcMain.handle('reports:getCash', async (_, filter?: ReportFilter) => {
    await AuthorizationService.requireAdmin();
    return await ReportsService.getCashReport(filter);
  });

  ipcMain.handle('reports:getTopProducts', async (_, _limit?: number, filter?: ReportFilter) => {
    await AuthorizationService.requireAuth();
    const res = await ReportsService.getDashboardAnalytics(filter);
    return {
      success: res.success,
      data: res.data?.topProducts || [],
      error: res.error,
    };
  });

  ipcMain.handle('reports:getSalesTrend', async (_, filter?: ReportFilter) => {
    await AuthorizationService.requireAuth();
    const res = await ReportsService.getDashboardAnalytics(filter);
    return {
      success: res.success,
      data: res.data?.salesTrend || [],
      error: res.error,
    };
  });

  ipcMain.handle('reports:exportCsv', async (_, options: ReportExportOptions) => {
    await AuthorizationService.requireAuth();
    return await ReportsService.exportCsv(options);
  });

  ipcMain.handle('reports:exportPdf', async (_, options: ReportExportOptions) => {
    await AuthorizationService.requireAuth();
    return await ReportsService.exportPdf(options);
  });
}
