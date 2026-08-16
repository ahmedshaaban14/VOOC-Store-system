const { contextBridge, ipcRenderer } = require('electron');

console.log('[PRELOAD] preload loaded');
console.log('[PRELOAD] exposing electronAPI');

const authAPI = {
  login: (username: string, password: string) => {
    console.log('[PRELOAD] invoking auth:login for:', username);
    return ipcRenderer.invoke('auth:login', username, password);
  },
  logout: () => ipcRenderer.invoke('auth:logout'),
  getCurrentUser: () => ipcRenderer.invoke('auth:currentUser'),
  changePassword: (currentPassword: string, newPassword: string) =>
    ipcRenderer.invoke('auth:changePassword', currentPassword, newPassword),
};

const mainAPI = {
  // Authentication methods (both direct and nested under auth namespace)
  ...authAPI,
  auth: authAPI,

  // Users Management (Admin Only)
  getUsers: () => ipcRenderer.invoke('users:get'),
  createUser: (data: any) => ipcRenderer.invoke('users:create', data),
  updateUser: (id: number, data: any) => ipcRenderer.invoke('users:update', id, data),
  setUserActive: (id: number, isActive: boolean) => ipcRenderer.invoke('users:setActive', id, isActive),

  // Products
  getProducts: () => ipcRenderer.invoke('products:get'),
  getProductByBarcode: (barcode: string) => ipcRenderer.invoke('products:getByBarcode', barcode),
  createProduct: (product: any) => ipcRenderer.invoke('products:create', product),
  updateProduct: (id: number, product: any) => ipcRenderer.invoke('products:update', id, product),
  deleteProduct: (id: number) => ipcRenderer.invoke('products:delete', id),
  saveProductImage: (fileData: ArrayBuffer, fileName: string) =>
    ipcRenderer.invoke('products:uploadImage', fileData, fileName),
  getProductImageData: (imagePathOrName?: string | null) =>
    ipcRenderer.invoke('products:getImageData', imagePathOrName),

  // Categories
  getCategories: () => ipcRenderer.invoke('categories:get'),
  createCategory: (data: any) => ipcRenderer.invoke('categories:create', data),
  updateCategory: (id: number, data: any) => ipcRenderer.invoke('categories:update', id, data),
  deleteCategory: (id: number) => ipcRenderer.invoke('categories:delete', id),

  // Suppliers
  getSuppliers: () => ipcRenderer.invoke('suppliers:get'),
  createSupplier: (data: any) => ipcRenderer.invoke('suppliers:create', data),
  updateSupplier: (id: number, data: any) => ipcRenderer.invoke('suppliers:update', id, data),
  deleteSupplier: (id: number) => ipcRenderer.invoke('suppliers:delete', id),

  // Customers
  getCustomers: (search?: string) => ipcRenderer.invoke('customers:get', search),
  getCustomerById: (id: number) => ipcRenderer.invoke('customers:getById', id),
  createCustomer: (data: any) => ipcRenderer.invoke('customers:create', data),
  updateCustomer: (id: number, data: any) => ipcRenderer.invoke('customers:update', id, data),
  deleteCustomer: (id: number) => ipcRenderer.invoke('customers:delete', id),

  // Expenses
  getExpenses: (filter?: any) => ipcRenderer.invoke('expenses:get', filter),
  getExpenseById: (id: number) => ipcRenderer.invoke('expenses:getById', id),
  createExpense: (data: any) => ipcRenderer.invoke('expenses:create', data),
  updateExpense: (id: number, data: any) => ipcRenderer.invoke('expenses:update', id, data),
  deleteExpense: (id: number) => ipcRenderer.invoke('expenses:delete', id),

  // Inventory & Movements
  getInventoryItems: () => ipcRenderer.invoke('inventory:getItems'),
  getStockMovements: () => ipcRenderer.invoke('inventory:getMovements'),
  adjustStock: (input: any) => ipcRenderer.invoke('inventory:adjustStock', input),

  // Sales & POS
  createSale: (input: any) => ipcRenderer.invoke('sales:create', input),
  getSalesList: () => ipcRenderer.invoke('sales:getAll'),
  getSaleDetails: (id: number) => ipcRenderer.invoke('sales:getDetails', id),

  // Purchases
  createPurchase: (input: any) => ipcRenderer.invoke('purchases:create', input),
  getPurchasesList: () => ipcRenderer.invoke('purchases:getAll'),
  getPurchaseDetails: (id: number) => ipcRenderer.invoke('purchases:getDetails', id),

  // Sales Returns
  getSalesReturnsList: () => ipcRenderer.invoke('salesReturns:getAll'),
  getReturnableSaleDetails: (saleId: number) => ipcRenderer.invoke('salesReturns:getReturnableDetails', saleId),
  createSalesReturn: (input: any) => ipcRenderer.invoke('salesReturns:create', input),

  // Purchase Returns
  getPurchaseReturnsList: () => ipcRenderer.invoke('purchaseReturns:getAll'),
  getReturnablePurchaseDetails: (purchaseId: number) =>
    ipcRenderer.invoke('purchaseReturns:getReturnableDetails', purchaseId),
  createPurchaseReturn: (input: any) => ipcRenderer.invoke('purchaseReturns:create', input),

  // Cash Register
  getCashRegisterSummary: () => ipcRenderer.invoke('cashRegister:getSummary'),
  getCashTransactions: () => ipcRenderer.invoke('cashRegister:getTransactions'),
  openCashRegister: (amount: number) => ipcRenderer.invoke('cashRegister:open', amount),
  manualCashIn: (amount: number, notes?: string) => ipcRenderer.invoke('cashRegister:manualIn', amount, notes),
  manualCashOut: (amount: number, notes?: string) => ipcRenderer.invoke('cashRegister:manualOut', amount, notes),

  // Dashboard & System
  getDashboardSummary: () => ipcRenderer.invoke('dashboard:summary'),
  getSystemInfo: () => ipcRenderer.invoke('system:info'),

  // Phase 7: Backup & Restore (Admin Only)
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    validate: (filePath?: string) => ipcRenderer.invoke('backup:validate', filePath),
    restore: (filePath: string) => ipcRenderer.invoke('backup:restore', filePath),
  },

  // Phase 7: Audit Logs (Admin Only)
  auditLogs: {
    get: (filters?: any) => ipcRenderer.invoke('auditLogs:get', filters),
    getDetails: (id: number) => ipcRenderer.invoke('auditLogs:getDetails', id),
  },

  // Phase 8: Printing & Receipts
  printing: {
    getPrinters: () => ipcRenderer.invoke('printing:getPrinters'),
    getDefaultPrinter: () => ipcRenderer.invoke('printing:getDefaultPrinter'),
    getSettings: () => ipcRenderer.invoke('printing:getSettings'),
    updateSettings: (settings: any) => ipcRenderer.invoke('printing:updateSettings', settings),
    printInvoice: (data: any) => ipcRenderer.invoke('printing:printInvoice', data),
    testPrint: (printerName?: string) => ipcRenderer.invoke('printing:testPrint', printerName),
  },

  // Phase 9: Reports & Analytics
  reports: {
    getDashboard: (filter?: any) => ipcRenderer.invoke('reports:getDashboard', filter),
    getSales: (filter?: any) => ipcRenderer.invoke('reports:getSales', filter),
    getPurchases: (filter?: any) => ipcRenderer.invoke('reports:getPurchases', filter),
    getProfit: (filter?: any) => ipcRenderer.invoke('reports:getProfit', filter),
    getInventory: (filter?: any) => ipcRenderer.invoke('reports:getInventory', filter),
    getCash: (filter?: any) => ipcRenderer.invoke('reports:getCash', filter),
    getTopProducts: (limit?: number, filter?: any) => ipcRenderer.invoke('reports:getTopProducts', limit, filter),
    getSalesTrend: (filter?: any) => ipcRenderer.invoke('reports:getSalesTrend', filter),
    exportCsv: (options: any) => ipcRenderer.invoke('reports:exportCsv', options),
    exportPdf: (options: any) => ipcRenderer.invoke('reports:exportPdf', options),
  },
};

contextBridge.exposeInMainWorld('electronAPI', mainAPI);
console.log('[PRELOAD] electronAPI exposed');
