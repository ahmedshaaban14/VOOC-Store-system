import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  barcode: text('barcode').notNull().unique(),
  name: text('name').notNull(),
  image: text('image'),
  categoryId: integer('category_id').references(() => categories.id),
  purchasePrice: real('purchase_price').notNull().default(0),
  salePrice: real('sale_price').notNull().default(0),
  currentStock: integer('current_stock').notNull().default(0),
  minStockLevel: integer('min_stock_level').notNull().default(5),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const suppliers = sqliteTable('suppliers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone'),
  address: text('address'),
  balance: real('balance').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone'),
  address: text('address'),
  notes: text('notes'),
  points: integer('points').notNull().default(0),
  balance: real('balance').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at'),
});

// Phase 6: Users Table
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role').notNull().default('SELLER'), // 'ADMIN', 'SELLER'
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  lastLoginAt: text('last_login_at'),
});

// Phase 6: Sessions Table
export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull(),
  lastActivityAt: text('last_activity_at').notNull(),
});

export const stockMovements = sqliteTable('stock_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id),
  movementType: text('movement_type').notNull(), // 'PURCHASE', 'SALE', 'SALE_RETURN', 'PURCHASE_RETURN', 'ADJUSTMENT'
  quantityChange: integer('quantity_change').notNull(),
  previousStock: integer('previous_stock').notNull(),
  newStock: integer('new_stock').notNull(),
  referenceId: text('reference_id'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

export const purchases = sqliteTable('purchases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  invoiceNumber: text('invoice_number').notNull().unique(),
  totalAmount: real('total_amount').notNull(),
  paidAmount: real('paid_amount').notNull(),
  status: text('status').notNull().default('COMPLETED'),
  createdAt: text('created_at').notNull(),
});

export const purchaseItems = sqliteTable('purchase_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  purchaseId: integer('purchase_id').notNull().references(() => purchases.id),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  unitCost: real('unit_cost').notNull(),
  totalCost: real('total_cost').notNull(),
});

export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: integer('customer_id').references(() => customers.id),
  invoiceNumber: text('invoice_number').notNull().unique(),
  totalAmount: real('total_amount').notNull(),
  discountAmount: real('discount_amount').notNull().default(0),
  netAmount: real('net_amount').notNull(),
  paidAmount: real('paid_amount').notNull(),
  paymentType: text('payment_type').notNull().default('CASH'), // 'CASH', 'CARD', 'SPLIT'
  createdByUserId: integer('created_by_user_id').references(() => users.id),
  createdAt: text('created_at').notNull(),
});

export const saleItems = sqliteTable('sale_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').notNull().references(() => sales.id),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  totalPrice: real('total_price').notNull(),
  unitCost: real('unit_cost').notNull().default(0),
  totalCost: real('total_cost').notNull().default(0),
});

// Phase 5: Sales Returns
export const salesReturns = sqliteTable('sales_returns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  returnNumber: text('return_number').notNull().unique(),
  saleId: integer('sale_id').notNull().references(() => sales.id),
  totalAmount: real('total_amount').notNull(),
  refundAmount: real('refund_amount').notNull(),
  paymentType: text('payment_type').notNull().default('CASH'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

export const salesReturnItems = sqliteTable('sales_return_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  returnId: integer('return_id').notNull().references(() => salesReturns.id),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  totalPrice: real('total_price').notNull(),
  unitCost: real('unit_cost').notNull().default(0),
  totalCost: real('total_cost').notNull().default(0),
});

// Phase 5: Purchase Returns
export const purchaseReturns = sqliteTable('purchase_returns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  returnNumber: text('return_number').notNull().unique(),
  purchaseId: integer('purchase_id').notNull().references(() => purchases.id),
  totalAmount: real('total_amount').notNull(),
  refundAmount: real('refund_amount').notNull(),
  paymentType: text('payment_type').notNull().default('CASH'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

export const purchaseReturnItems = sqliteTable('purchase_return_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  returnId: integer('return_id').notNull().references(() => purchaseReturns.id),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  unitCost: real('unit_cost').notNull(),
  totalCost: real('total_cost').notNull(),
});

export const cashTransactions = sqliteTable('cash_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(), // 'IN', 'OUT'
  amount: real('amount').notNull(),
  category: text('category').notNull(),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull(),
  amount: real('amount').notNull(),
  notes: text('notes'),
  expenseDate: text('expense_date').notNull(),
  userId: integer('user_id').references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at'),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: text('updated_at').notNull(),
});

// Phase 7: Audit Logs Table
export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  username: text('username').notNull(),
  displayName: text('display_name').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  description: text('description').notNull(),
  metadata: text('metadata'),
  createdAt: text('created_at').notNull(),
});
