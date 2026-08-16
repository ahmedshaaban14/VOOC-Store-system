import { BrowserWindow, dialog } from 'electron';
import { eq, sql, and, gte, lte, desc } from 'drizzle-orm';
import fs from 'fs';
import { getDb } from '../db/client';
import {
  sales,
  saleItems,
  salesReturns,
  salesReturnItems,
  purchases,
  purchaseReturns,
  products,
  categories,
  suppliers,
  cashTransactions,
  users,
} from '../db/schema';
import {
  ReportFilter,
  DashboardAnalytics,
  SalesReport,
  SalesReportRow,
  PurchaseReport,
  PurchaseReportRow,
  ProfitReport,
  ProfitReportRow,
  InventoryReport,
  InventoryReportRow,
  CashReport,
  CashReportRow,
  ReportExportOptions,
  ReportExportResult,
  ServiceResult,
} from '../../src/shared/types';
import { AuthService } from './AuthService';
import { AuthorizationService } from './AuthorizationService';
import { AuditLogService } from './AuditLogService';

export class ReportsService {
  /**
   * Helper: Normalize date bounds for SQLite ISO string comparisons
   */
  private static parseDateBounds(filter?: ReportFilter): { fromIso?: string; toIso?: string } {
    if (!filter) return {};
    let fromIso: string | undefined = undefined;
    let toIso: string | undefined = undefined;

    if (filter.fromDate) {
      fromIso = `${filter.fromDate}T00:00:00.000Z`;
    }
    if (filter.toDate) {
      toIso = `${filter.toDate}T23:59:59.999Z`;
    }

    return { fromIso, toIso };
  }

  /**
   * 1. Dashboard Analytics (Role-Aware with Seller Confidentiality)
   */
  static async getDashboardAnalytics(filter?: ReportFilter): Promise<ServiceResult<DashboardAnalytics>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const currentUser = await AuthService.getCurrentUser();
      const isAdmin = currentUser?.role === 'ADMIN';
      const { fromIso, toIso } = this.parseDateBounds(filter);

      // Build Sales conditions
      const salesConditions: any[] = [];
      if (fromIso) salesConditions.push(gte(sales.createdAt, fromIso));
      if (toIso) salesConditions.push(lte(sales.createdAt, toIso));
      if (filter?.sellerId) salesConditions.push(eq(sales.createdByUserId, filter.sellerId));
      if (filter?.paymentType) salesConditions.push(eq(sales.paymentType, filter.paymentType));

      const salesWhere = salesConditions.length > 0 ? and(...salesConditions) : undefined;

      // 1. Sales Aggregation
      const salesAgg = db
        .select({
          totalSales: sql<number>`COALESCE(SUM(${sales.totalAmount}), 0)`.mapWith(Number),
          totalDiscounts: sql<number>`COALESCE(SUM(${sales.discountAmount}), 0)`.mapWith(Number),
          netSales: sql<number>`COALESCE(SUM(${sales.netAmount}), 0)`.mapWith(Number),
          invoicesCount: sql<number>`COUNT(${sales.id})`.mapWith(Number),
        })
        .from(sales)
        .where(salesWhere)
        .get();

      // Build Returns conditions
      const returnsConditions: any[] = [];
      if (fromIso) returnsConditions.push(gte(salesReturns.createdAt, fromIso));
      if (toIso) returnsConditions.push(lte(salesReturns.createdAt, toIso));
      const returnsWhere = returnsConditions.length > 0 ? and(...returnsConditions) : undefined;

      const returnsAgg = db
        .select({
          totalRefunds: sql<number>`COALESCE(SUM(${salesReturns.refundAmount}), 0)`.mapWith(Number),
          returnsCount: sql<number>`COUNT(${salesReturns.id})`.mapWith(Number),
        })
        .from(salesReturns)
        .where(returnsWhere)
        .get();

      const grossSales = salesAgg?.totalSales || 0;
      const rawNetSales = salesAgg?.netSales || 0;
      const totalSalesReturns = returnsAgg?.totalRefunds || 0;
      const finalNetSales = Math.max(0, rawNetSales - totalSalesReturns);
      const totalInvoices = salesAgg?.invoicesCount || 0;

      // 2. Inventory Counts
      const allProds = db.select().from(products).all();
      const totalProducts = allProds.length;
      let lowStockCount = 0;
      let outOfStockCount = 0;
      let totalInventoryVal = 0;

      for (const p of allProds) {
        if (p.currentStock <= 0) {
          outOfStockCount++;
        } else if (p.currentStock <= p.minStockLevel) {
          lowStockCount++;
        }
        if (isAdmin) {
          totalInventoryVal += Math.max(0, p.currentStock) * (p.purchasePrice || 0);
        }
      }

      // 3. Sales Trend (Daily Buckets)
      const allSalesList = db
        .select({
          dateStr: sql<string>`substr(${sales.createdAt}, 1, 10)`,
          total: sales.totalAmount,
          net: sales.netAmount,
        })
        .from(sales)
        .where(salesWhere)
        .all();

      const trendMap = new Map<string, { sales: number; netSales: number; invoicesCount: number }>();
      for (const s of allSalesList) {
        const d = s.dateStr || 'غير محدد';
        const existing = trendMap.get(d) || { sales: 0, netSales: 0, invoicesCount: 0 };
        existing.sales += s.total;
        existing.netSales += s.net;
        existing.invoicesCount += 1;
        trendMap.set(d, existing);
      }

      const salesTrend = Array.from(trendMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, val]) => ({
          date,
          sales: Number(val.sales.toFixed(2)),
          netSales: Number(val.netSales.toFixed(2)),
          invoicesCount: val.invoicesCount,
        }));

      // 4. Sales by Payment Type
      const paymentAgg = db
        .select({
          type: sales.paymentType,
          total: sql<number>`COALESCE(SUM(${sales.netAmount}), 0)`.mapWith(Number),
          count: sql<number>`COUNT(${sales.id})`.mapWith(Number),
        })
        .from(sales)
        .where(salesWhere)
        .groupBy(sales.paymentType)
        .all();

      const salesByPaymentType = paymentAgg.map((p) => ({
        type: p.type === 'CARD' ? 'بطاقة (Card)' : 'نقدي (Cash)',
        total: Number(p.total.toFixed(2)),
        count: p.count,
      }));

      // 5. Top Selling Products
      const topItems = db
        .select({
          productId: saleItems.productId,
          productName: products.name,
          quantitySold: sql<number>`COALESCE(SUM(${saleItems.quantity}), 0)`.mapWith(Number),
          totalRevenue: sql<number>`COALESCE(SUM(${saleItems.totalPrice}), 0)`.mapWith(Number),
        })
        .from(saleItems)
        .leftJoin(products, eq(saleItems.productId, products.id))
        .leftJoin(sales, eq(saleItems.saleId, sales.id))
        .where(salesWhere)
        .groupBy(saleItems.productId)
        .orderBy(desc(sql`SUM(${saleItems.quantity})`))
        .limit(5)
        .all();

      const topProducts = topItems.map((i) => ({
        productId: i.productId,
        productName: i.productName || `منتج #${i.productId}`,
        quantitySold: i.quantitySold,
        totalRevenue: Number(i.totalRevenue.toFixed(2)),
      }));

      // Base Seller Data (Strictly Sanitized)
      const analytics: DashboardAnalytics = {
        totalSales: Number(grossSales.toFixed(2)),
        netSales: Number(finalNetSales.toFixed(2)),
        totalInvoices,
        totalSalesReturns: Number(totalSalesReturns.toFixed(2)),
        totalProducts,
        lowStockCount,
        outOfStockCount,
        salesTrend,
        salesByPaymentType,
        topProducts,
      };

      // Admin Only Financial Metrics
      if (isAdmin) {
        // Purchases Aggregation
        const purchasesConditions: any[] = [];
        if (fromIso) purchasesConditions.push(gte(purchases.createdAt, fromIso));
        if (toIso) purchasesConditions.push(lte(purchases.createdAt, toIso));
        const purchasesWhere = purchasesConditions.length > 0 ? and(...purchasesConditions) : undefined;

        const purchAgg = db
          .select({
            totalPurchases: sql<number>`COALESCE(SUM(${purchases.totalAmount}), 0)`.mapWith(Number),
          })
          .from(purchases)
          .where(purchasesWhere)
          .get();

        const purchReturnsConditions: any[] = [];
        if (fromIso) purchReturnsConditions.push(gte(purchaseReturns.createdAt, fromIso));
        if (toIso) purchReturnsConditions.push(lte(purchaseReturns.createdAt, toIso));
        const purchReturnsWhere = purchReturnsConditions.length > 0 ? and(...purchReturnsConditions) : undefined;

        const purchReturnsAgg = db
          .select({
            totalPurchReturns: sql<number>`COALESCE(SUM(${purchaseReturns.refundAmount}), 0)`.mapWith(Number),
          })
          .from(purchaseReturns)
          .where(purchReturnsWhere)
          .get();

        const totalPurchases = purchAgg?.totalPurchases || 0;
        const totalPurchaseReturns = purchReturnsAgg?.totalPurchReturns || 0;

        // Historical COGS Calculation from sale_items.total_cost
        const cogsAgg = db
          .select({
            totalCogs: sql<number>`COALESCE(SUM(${saleItems.totalCost}), 0)`.mapWith(Number),
          })
          .from(saleItems)
          .leftJoin(sales, eq(saleItems.saleId, sales.id))
          .where(salesWhere)
          .get();

        const returnCogsAgg = db
          .select({
            refundedCogs: sql<number>`COALESCE(SUM(${salesReturnItems.totalCost}), 0)`.mapWith(Number),
          })
          .from(salesReturnItems)
          .leftJoin(salesReturns, eq(salesReturnItems.returnId, salesReturns.id))
          .where(returnsWhere)
          .get();

        const rawCogs = cogsAgg?.totalCogs || 0;
        const returnedCogs = returnCogsAgg?.refundedCogs || 0;
        const netCogs = Math.max(0, rawCogs - returnedCogs);

        const grossProfit = finalNetSales - netCogs;
        const profitMargin = finalNetSales > 0 ? (grossProfit / finalNetSales) * 100 : 0;

        // Cash Balance
        const cashIn = db
          .select({ total: sql<number>`COALESCE(SUM(${cashTransactions.amount}), 0)`.mapWith(Number) })
          .from(cashTransactions)
          .where(eq(cashTransactions.type, 'IN'))
          .get()?.total || 0;

        const cashOut = db
          .select({ total: sql<number>`COALESCE(SUM(${cashTransactions.amount}), 0)`.mapWith(Number) })
          .from(cashTransactions)
          .where(eq(cashTransactions.type, 'OUT'))
          .get()?.total || 0;

        const currentCashBalance = cashIn - cashOut;

        analytics.totalPurchases = Number(totalPurchases.toFixed(2));
        analytics.totalPurchaseReturns = Number(totalPurchaseReturns.toFixed(2));
        analytics.grossProfit = Number(grossProfit.toFixed(2));
        analytics.profitMargin = Number(profitMargin.toFixed(2));
        analytics.inventoryValue = Number(totalInventoryVal.toFixed(2));
        analytics.currentCashBalance = Number(currentCashBalance.toFixed(2));
      }

      return { success: true, data: analytics };
    } catch (err: any) {
      console.error('[ReportsService] Error generating dashboard analytics:', err);
      return { success: false, error: err.message || 'فشل توليد لوحة التحليلات' };
    }
  }

  /**
   * 2. Sales Report
   */
  static async getSalesReport(filter?: ReportFilter): Promise<ServiceResult<SalesReport>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      await AuthorizationService.requireAuth();
      const { fromIso, toIso } = this.parseDateBounds(filter);

      const conditions: any[] = [];
      if (fromIso) conditions.push(gte(sales.createdAt, fromIso));
      if (toIso) conditions.push(lte(sales.createdAt, toIso));
      if (filter?.sellerId) conditions.push(eq(sales.createdByUserId, filter.sellerId));
      if (filter?.paymentType) conditions.push(eq(sales.paymentType, filter.paymentType));
      if (filter?.invoiceNumber) conditions.push(sql`${sales.invoiceNumber} LIKE ${`%${filter.invoiceNumber}%`}`);

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const allSales = db
        .select({
          id: sales.id,
          invoiceNumber: sales.invoiceNumber,
          createdAt: sales.createdAt,
          paymentType: sales.paymentType,
          totalAmount: sales.totalAmount,
          discountAmount: sales.discountAmount,
          netAmount: sales.netAmount,
          paidAmount: sales.paidAmount,
          sellerName: users.displayName,
          itemsCount: sql<number>`(SELECT COUNT(*) FROM sale_items WHERE sale_items.sale_id = ${sales.id})`.mapWith(Number),
        })
        .from(sales)
        .leftJoin(users, eq(sales.createdByUserId, users.id))
        .where(whereClause)
        .orderBy(desc(sales.createdAt))
        .all();

      // Returns within same date bounds
      const returnConditions: any[] = [];
      if (fromIso) returnConditions.push(gte(salesReturns.createdAt, fromIso));
      if (toIso) returnConditions.push(lte(salesReturns.createdAt, toIso));
      const returnsWhere = returnConditions.length > 0 ? and(...returnConditions) : undefined;

      const totalReturns = db
        .select({
          total: sql<number>`COALESCE(SUM(${salesReturns.refundAmount}), 0)`.mapWith(Number),
        })
        .from(salesReturns)
        .where(returnsWhere)
        .get()?.total || 0;

      let grossSales = 0;
      let totalDiscounts = 0;
      let netSalesRaw = 0;
      let totalCash = 0;
      let totalCard = 0;

      const rows: SalesReportRow[] = allSales.map((s) => {
        grossSales += s.totalAmount;
        totalDiscounts += s.discountAmount;
        netSalesRaw += s.netAmount;

        if (s.paymentType === 'CARD') {
          totalCard += s.netAmount;
        } else {
          totalCash += s.netAmount;
        }

        const changeAmount = Math.max(0, s.paidAmount - s.netAmount);

        return {
          id: s.id,
          invoiceNumber: s.invoiceNumber,
          createdAt: s.createdAt,
          sellerName: s.sellerName || 'غير محدد',
          paymentType: s.paymentType === 'CARD' ? 'بطاقة' : 'كاش',
          totalAmount: Number(s.totalAmount.toFixed(2)),
          discountAmount: Number(s.discountAmount.toFixed(2)),
          netAmount: Number(s.netAmount.toFixed(2)),
          paidAmount: Number(s.paidAmount.toFixed(2)),
          changeAmount: Number(changeAmount.toFixed(2)),
          itemsCount: s.itemsCount || 0,
        };
      });

      const netSales = Math.max(0, netSalesRaw - totalReturns);

      return {
        success: true,
        data: {
          summary: {
            totalInvoices: rows.length,
            grossSales: Number(grossSales.toFixed(2)),
            totalDiscounts: Number(totalDiscounts.toFixed(2)),
            totalReturns: Number(totalReturns.toFixed(2)),
            netSales: Number(netSales.toFixed(2)),
            totalCash: Number(totalCash.toFixed(2)),
            totalCard: Number(totalCard.toFixed(2)),
          },
          rows,
        },
      };
    } catch (err: any) {
      console.error('[ReportsService] Error generating sales report:', err);
      return { success: false, error: err.message || 'فشل توليد تقرير المبيعات' };
    }
  }

  /**
   * 3. Purchases Report (Admin Only)
   */
  static async getPurchasesReport(filter?: ReportFilter): Promise<ServiceResult<PurchaseReport>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      await AuthorizationService.requireAdmin();
      const { fromIso, toIso } = this.parseDateBounds(filter);

      const conditions: any[] = [];
      if (fromIso) conditions.push(gte(purchases.createdAt, fromIso));
      if (toIso) conditions.push(lte(purchases.createdAt, toIso));
      if (filter?.supplierId) conditions.push(eq(purchases.supplierId, filter.supplierId));
      if (filter?.invoiceNumber) conditions.push(sql`${purchases.invoiceNumber} LIKE ${`%${filter.invoiceNumber}%`}`);

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const allPurchases = db
        .select({
          id: purchases.id,
          invoiceNumber: purchases.invoiceNumber,
          createdAt: purchases.createdAt,
          totalAmount: purchases.totalAmount,
          paidAmount: purchases.paidAmount,
          supplierName: suppliers.name,
          itemsCount: sql<number>`(SELECT COUNT(*) FROM purchase_items WHERE purchase_items.purchase_id = ${purchases.id})`.mapWith(Number),
        })
        .from(purchases)
        .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
        .where(whereClause)
        .orderBy(desc(purchases.createdAt))
        .all();

      const returnsConditions: any[] = [];
      if (fromIso) returnsConditions.push(gte(purchaseReturns.createdAt, fromIso));
      if (toIso) returnsConditions.push(lte(purchaseReturns.createdAt, toIso));
      const returnsWhere = returnsConditions.length > 0 ? and(...returnsConditions) : undefined;

      const totalReturns = db
        .select({
          total: sql<number>`COALESCE(SUM(${purchaseReturns.refundAmount}), 0)`.mapWith(Number),
        })
        .from(purchaseReturns)
        .where(returnsWhere)
        .get()?.total || 0;

      let grossPurchases = 0;
      const rows: PurchaseReportRow[] = allPurchases.map((p) => {
        grossPurchases += p.totalAmount;
        return {
          id: p.id,
          invoiceNumber: p.invoiceNumber,
          createdAt: p.createdAt,
          supplierName: p.supplierName || 'مورد عام',
          totalAmount: Number(p.totalAmount.toFixed(2)),
          paidAmount: Number(p.paidAmount.toFixed(2)),
          itemsCount: p.itemsCount || 0,
        };
      });

      const netPurchases = Math.max(0, grossPurchases - totalReturns);

      return {
        success: true,
        data: {
          summary: {
            totalPurchases: rows.length,
            totalAmount: Number(grossPurchases.toFixed(2)),
            totalReturns: Number(totalReturns.toFixed(2)),
            netPurchases: Number(netPurchases.toFixed(2)),
          },
          rows,
        },
      };
    } catch (err: any) {
      console.error('[ReportsService] Error generating purchase report:', err);
      return { success: false, error: err.message || 'فشل توليد تقرير المشتريات' };
    }
  }

  /**
   * 4. Profit Report with 100% Historical Cost Protection (Admin Only)
   */
  static async getProfitReport(filter?: ReportFilter): Promise<ServiceResult<ProfitReport>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      await AuthorizationService.requireAdmin();
      const { fromIso, toIso } = this.parseDateBounds(filter);

      const salesConditions: any[] = [];
      if (fromIso) salesConditions.push(gte(sales.createdAt, fromIso));
      if (toIso) salesConditions.push(lte(sales.createdAt, toIso));
      if (filter?.sellerId) salesConditions.push(eq(sales.createdByUserId, filter.sellerId));
      if (filter?.productId) salesConditions.push(eq(saleItems.productId, filter.productId));

      const salesWhere = salesConditions.length > 0 ? and(...salesConditions) : undefined;

      // Group by Product using historical saleItems unitCost and totalCost
      const itemsList = db
        .select({
          productId: saleItems.productId,
          productName: products.name,
          productBarcode: products.barcode,
          quantitySold: sql<number>`COALESCE(SUM(${saleItems.quantity}), 0)`.mapWith(Number),
          revenue: sql<number>`COALESCE(SUM(${saleItems.totalPrice}), 0)`.mapWith(Number),
          totalCogs: sql<number>`COALESCE(SUM(${saleItems.totalCost}), 0)`.mapWith(Number),
          avgUnitCost: sql<number>`COALESCE(AVG(${saleItems.unitCost}), 0)`.mapWith(Number),
        })
        .from(saleItems)
        .leftJoin(sales, eq(saleItems.saleId, sales.id))
        .leftJoin(products, eq(saleItems.productId, products.id))
        .where(salesWhere)
        .groupBy(saleItems.productId)
        .all();

      // Returns by Product
      const returnConditions: any[] = [];
      if (fromIso) returnConditions.push(gte(salesReturns.createdAt, fromIso));
      if (toIso) returnConditions.push(lte(salesReturns.createdAt, toIso));
      const returnsWhere = returnConditions.length > 0 ? and(...returnConditions) : undefined;

      const returnItemsList = db
        .select({
          productId: salesReturnItems.productId,
          returnedQty: sql<number>`COALESCE(SUM(${salesReturnItems.quantity}), 0)`.mapWith(Number),
          returnedAmount: sql<number>`COALESCE(SUM(${salesReturnItems.totalPrice}), 0)`.mapWith(Number),
          returnedCogs: sql<number>`COALESCE(SUM(${salesReturnItems.totalCost}), 0)`.mapWith(Number),
        })
        .from(salesReturnItems)
        .leftJoin(salesReturns, eq(salesReturnItems.returnId, salesReturns.id))
        .where(returnsWhere)
        .groupBy(salesReturnItems.productId)
        .all();

      const returnsMap = new Map<number, { qty: number; amount: number; cogs: number }>();
      for (const r of returnItemsList) {
        returnsMap.set(r.productId, {
          qty: r.returnedQty,
          amount: r.returnedAmount,
          cogs: r.returnedCogs,
        });
      }

      let totalGrossSales = 0;
      let totalNetRevenue = 0;
      let totalOverallCogs = 0;

      const rows: ProfitReportRow[] = itemsList.map((item) => {
        const ret = returnsMap.get(item.productId) || { qty: 0, amount: 0, cogs: 0 };
        const netRev = Math.max(0, item.revenue - ret.amount);
        const netCogs = Math.max(0, item.totalCogs - ret.cogs);
        const profit = netRev - netCogs;
        const margin = netRev > 0 ? (profit / netRev) * 100 : 0;

        totalGrossSales += item.revenue;
        totalNetRevenue += netRev;
        totalOverallCogs += netCogs;

        return {
          productId: item.productId,
          productName: item.productName || `منتج #${item.productId}`,
          productBarcode: item.productBarcode || undefined,
          quantitySold: item.quantitySold,
          revenue: Number(item.revenue.toFixed(2)),
          returnedQty: ret.qty,
          netRevenue: Number(netRev.toFixed(2)),
          historicalUnitCost: Number(item.avgUnitCost.toFixed(2)),
          totalCogs: Number(netCogs.toFixed(2)),
          grossProfit: Number(profit.toFixed(2)),
          profitMarginPercent: Number(margin.toFixed(2)),
        };
      });

      // Overall discounts and returns
      const salesDiscounts = db
        .select({
          totalDiscounts: sql<number>`COALESCE(SUM(${sales.discountAmount}), 0)`.mapWith(Number),
        })
        .from(sales)
        .where(salesWhere)
        .get()?.totalDiscounts || 0;

      const overallReturnAmount = db
        .select({
          total: sql<number>`COALESCE(SUM(${salesReturns.refundAmount}), 0)`.mapWith(Number),
        })
        .from(salesReturns)
        .where(returnsWhere)
        .get()?.total || 0;

      const finalNetSales = Math.max(0, totalGrossSales - salesDiscounts - overallReturnAmount);
      const overallGrossProfit = finalNetSales - totalOverallCogs;
      const overallMarginPercent = finalNetSales > 0 ? (overallGrossProfit / finalNetSales) * 100 : 0;

      return {
        success: true,
        data: {
          summary: {
            grossSales: Number(totalGrossSales.toFixed(2)),
            totalDiscounts: Number(salesDiscounts.toFixed(2)),
            salesReturnsAmount: Number(overallReturnAmount.toFixed(2)),
            netSales: Number(finalNetSales.toFixed(2)),
            totalCogs: Number(totalOverallCogs.toFixed(2)),
            grossProfit: Number(overallGrossProfit.toFixed(2)),
            profitMarginPercent: Number(overallMarginPercent.toFixed(2)),
          },
          rows,
        },
      };
    } catch (err: any) {
      console.error('[ReportsService] Error generating profit report:', err);
      return { success: false, error: err.message || 'فشل توليد تقرير الأرباح' };
    }
  }

  /**
   * 5. Inventory Report (Role-Aware)
   */
  static async getInventoryReport(filter?: ReportFilter): Promise<ServiceResult<InventoryReport>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const currentUser = await AuthService.getCurrentUser();
      const isAdmin = currentUser?.role === 'ADMIN';

      const conditions: any[] = [];
      if (filter?.categoryId) conditions.push(eq(products.categoryId, filter.categoryId));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const prodsList = db
        .select({
          id: products.id,
          name: products.name,
          barcode: products.barcode,
          categoryName: categories.name,
          currentStock: products.currentStock,
          minStockLevel: products.minStockLevel,
          salePrice: products.salePrice,
          purchasePrice: products.purchasePrice,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(whereClause)
        .all();

      let totalStockQuantity = 0;
      let inStockCount = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;
      let totalInventoryVal = 0;

      const rows: InventoryReportRow[] = prodsList.map((p) => {
        totalStockQuantity += p.currentStock;

        let status: 'NORMAL' | 'LOW' | 'OUT' = 'NORMAL';
        if (p.currentStock <= 0) {
          status = 'OUT';
          outOfStockCount++;
        } else if (p.currentStock <= p.minStockLevel) {
          status = 'LOW';
          lowStockCount++;
        } else {
          inStockCount++;
        }

        const lineVal = isAdmin ? Math.max(0, p.currentStock) * (p.purchasePrice || 0) : undefined;
        if (lineVal !== undefined) totalInventoryVal += lineVal;

        return {
          id: p.id,
          name: p.name,
          barcode: p.barcode,
          categoryName: p.categoryName || 'بدون قسم',
          currentStock: p.currentStock,
          minStockLevel: p.minStockLevel,
          salePrice: Number(p.salePrice.toFixed(2)),
          purchasePrice: isAdmin ? Number((p.purchasePrice || 0).toFixed(2)) : undefined,
          totalValue: lineVal !== undefined ? Number(lineVal.toFixed(2)) : undefined,
          status,
        };
      });

      return {
        success: true,
        data: {
          summary: {
            totalProducts: rows.length,
            totalStockQuantity,
            inStockCount,
            lowStockCount,
            outOfStockCount,
            totalInventoryValue: isAdmin ? Number(totalInventoryVal.toFixed(2)) : undefined,
          },
          rows,
        },
      };
    } catch (err: any) {
      console.error('[ReportsService] Error generating inventory report:', err);
      return { success: false, error: err.message || 'فشل توليد تقرير المخزون' };
    }
  }

  /**
   * 6. Cash Register Report (Admin Only)
   */
  static async getCashReport(filter?: ReportFilter): Promise<ServiceResult<CashReport>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      await AuthorizationService.requireAdmin();
      const { fromIso, toIso } = this.parseDateBounds(filter);

      const conditions: any[] = [];
      if (fromIso) conditions.push(gte(cashTransactions.createdAt, fromIso));
      if (toIso) conditions.push(lte(cashTransactions.createdAt, toIso));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const transactions = db
        .select()
        .from(cashTransactions)
        .where(whereClause)
        .orderBy(desc(cashTransactions.createdAt))
        .all();

      let openingBalance = 0;
      let totalIn = 0;
      let totalOut = 0;
      let cashSales = 0;
      let salesReturns = 0;
      let cashPurchases = 0;
      let purchaseReturns = 0;
      let manualIn = 0;
      let manualOut = 0;

      const rows: CashReportRow[] = transactions.map((t) => {
        const amt = t.amount || 0;
        if (t.type === 'IN') totalIn += amt;
        if (t.type === 'OUT') totalOut += amt;

        if (t.category === 'رصيد افتتاحي') openingBalance += amt;
        else if (t.category === 'مبيعات نقدية') cashSales += amt;
        else if (t.category === 'مرتجع مبيعات') salesReturns += amt;
        else if (t.category === 'مشتريات نقدية') cashPurchases += amt;
        else if (t.category === 'مرتجع مشتريات') purchaseReturns += amt;
        else if (t.category === 'إيداع نقدي') manualIn += amt;
        else if (t.category === 'سحب نقدي') manualOut += amt;

        return {
          id: t.id,
          createdAt: t.createdAt,
          type: t.type as 'IN' | 'OUT',
          amount: Number(amt.toFixed(2)),
          category: t.category,
          referenceType: t.referenceType || undefined,
          referenceId: t.referenceId || undefined,
          notes: t.notes || undefined,
        };
      });

      const currentBalance = totalIn - totalOut;

      return {
        success: true,
        data: {
          summary: {
            openingBalance: Number(openingBalance.toFixed(2)),
            totalIn: Number(totalIn.toFixed(2)),
            totalOut: Number(totalOut.toFixed(2)),
            cashSales: Number(cashSales.toFixed(2)),
            salesReturns: Number(salesReturns.toFixed(2)),
            cashPurchases: Number(cashPurchases.toFixed(2)),
            purchaseReturns: Number(purchaseReturns.toFixed(2)),
            manualIn: Number(manualIn.toFixed(2)),
            manualOut: Number(manualOut.toFixed(2)),
            currentBalance: Number(currentBalance.toFixed(2)),
          },
          rows,
        },
      };
    } catch (err: any) {
      console.error('[ReportsService] Error generating cash report:', err);
      return { success: false, error: err.message || 'فشل توليد تقرير الخزينة' };
    }
  }

  /**
   * 7. Export CSV with UTF-8 BOM
   */
  static async exportCsv(options: ReportExportOptions): Promise<ServiceResult<ReportExportResult>> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      const isAdmin = currentUser?.role === 'ADMIN';

      // Ensure sensitive reports cannot be exported by Seller
      if (
        (options.filename.includes('profit') ||
          options.filename.includes('purchase') ||
          options.filename.includes('cash')) &&
        !isAdmin
      ) {
        return { success: false, error: 'غير مصرح لك بتصدير هذا التقرير' };
      }

      const defaultName = `${options.filename}_${new Date().toISOString().slice(0, 10)}.csv`;
      const saveDialogResult = await dialog.showSaveDialog({
        title: `تصدير ${options.title} (CSV)`,
        defaultPath: defaultName,
        filters: [{ name: 'CSV File (*.csv)', extensions: ['csv'] }],
      });

      if (saveDialogResult.canceled || !saveDialogResult.filePath) {
        return { success: true, data: { success: false, error: 'تم إلغاء التصدير' } };
      }

      // Format CSV rows with quotes escaping
      const escapeCsvCell = (cell: any) => {
        const str = String(cell !== undefined && cell !== null ? cell : '');
        return `"${str.replace(/"/g, '""')}"`;
      };

      const lines: string[] = [];

      // Add Summary block if provided
      if (options.summary && options.summary.length > 0) {
        lines.push(escapeCsvCell(options.title));
        if (options.dateRangeText) lines.push(escapeCsvCell(`الفترة: ${options.dateRangeText}`));
        lines.push('');
        lines.push(['"المؤشر"', '"القيمة"'].join(','));
        for (const s of options.summary) {
          lines.push([escapeCsvCell(s.label), escapeCsvCell(s.value)].join(','));
        }
        lines.push('');
      }

      // Add Table
      lines.push(options.headers.map(escapeCsvCell).join(','));
      for (const row of options.rows) {
        lines.push(row.map(escapeCsvCell).join(','));
      }

      // UTF-8 BOM (\uFEFF) for Arabic Excel compatibility
      const csvContent = '\uFEFF' + lines.join('\r\n');
      fs.writeFileSync(saveDialogResult.filePath, csvContent, 'utf-8');

      // Audit Log
      AuditLogService.log(
        'EXPORT_SALES_REPORT',
        'REPORT',
        null,
        `تم تصدير ملف CSV للتقرير: ${options.title}`,
        { filename: options.filename, filePath: saveDialogResult.filePath }
      ).catch(() => {});

      return {
        success: true,
        data: {
          success: true,
          filePath: saveDialogResult.filePath,
        },
      };
    } catch (err: any) {
      console.error('[ReportsService] Error exporting CSV:', err);
      return { success: false, error: err.message || 'فشل تصدير ملف CSV' };
    }
  }

  /**
   * 8. Export PDF via Headless Chromium printToPDF
   */
  static async exportPdf(options: ReportExportOptions): Promise<ServiceResult<ReportExportResult>> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      const isAdmin = currentUser?.role === 'ADMIN';

      if (
        (options.filename.includes('profit') ||
          options.filename.includes('purchase') ||
          options.filename.includes('cash')) &&
        !isAdmin
      ) {
        return { success: false, error: 'غير مصرح لك بتصدير هذا التقرير' };
      }

      const defaultName = `${options.filename}_${new Date().toISOString().slice(0, 10)}.pdf`;
      const saveDialogResult = await dialog.showSaveDialog({
        title: `تصدير ${options.title} (PDF)`,
        defaultPath: defaultName,
        filters: [{ name: 'PDF Document (*.pdf)', extensions: ['pdf'] }],
      });

      if (saveDialogResult.canceled || !saveDialogResult.filePath) {
        return { success: true, data: { success: false, error: 'تم إلغاء التصدير' } };
      }

      const summaryHtml =
        options.summary && options.summary.length > 0
          ? `
        <div class="summary-grid">
          ${options.summary
            .map(
              (s) => `
            <div class="summary-card">
              <div class="summary-label">${s.label}</div>
              <div class="summary-val">${s.value}</div>
            </div>
          `
            )
            .join('')}
        </div>
      `
          : '';

      const tableHeaderHtml = options.headers.map((h) => `<th>${h}</th>`).join('');
      const tableRowsHtml = options.rows
        .map((row) => `<tr>${row.map((c) => `<td>${c !== undefined && c !== null ? c : '-'}</td>`).join('')}</tr>`)
        .join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>${options.title}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; line-height: 1.4; padding: 5px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 15px; }
            .store-name { font-size: 18px; font-weight: bold; color: #1e3a8a; }
            .report-title { font-size: 15px; font-weight: bold; color: #0f172a; margin-top: 3px; }
            .meta-info { font-size: 10px; color: #64748b; text-align: left; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; }
            .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center; }
            .summary-label { font-size: 10px; color: #64748b; font-weight: 600; }
            .summary-val { font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 3px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10.5px; font-weight: bold; text-align: right; color: #334155; }
            td { border: 1px solid #e2e8f0; padding: 5px 8px; font-size: 10px; text-align: right; }
            tr:nth-child(even) { background: #f8fafc; }
            .footer { margin-top: 20px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="store-name">VOOC Store</div>
              <div class="report-title">${options.title}</div>
              ${options.dateRangeText ? `<div style="font-size: 10px; color: #475569; margin-top: 2px;">الفترة: ${options.dateRangeText}</div>` : ''}
            </div>
            <div class="meta-info">
              <div>تاريخ الإصدار: ${new Date().toLocaleString('ar-EG')}</div>
              <div>المستخدم: ${currentUser?.displayName || 'مدير النظام'}</div>
            </div>
          </div>

          ${summaryHtml}

          <table>
            <thead>
              <tr>${tableHeaderHtml}</tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <div class="footer">
            تم استخراج هذا التقرير تلقائياً بواسطة نظام إدارة المتاجر ونقاط البيع (VOOC Store POS)
          </div>
        </body>
        </html>
      `;

      const pdfWindow = new BrowserWindow({
        show: false,
        width: 800,
        height: 1000,
        webPreferences: { nodeIntegration: false, sandbox: true },
      });

      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);

      return new Promise<ServiceResult<ReportExportResult>>((resolve) => {
        pdfWindow.webContents.once('did-finish-load', async () => {
          try {
            const pdfData = await pdfWindow.webContents.printToPDF({
              pageSize: 'A4',
              printBackground: true,
              margins: { marginType: 'default' },
            });

            if (!pdfWindow.isDestroyed()) pdfWindow.destroy();

            fs.writeFileSync(saveDialogResult.filePath!, pdfData);

            AuditLogService.log(
              'EXPORT_SALES_REPORT',
              'REPORT',
              null,
              `تم تصدير ملف PDF للتقرير: ${options.title}`,
              { filename: options.filename, filePath: saveDialogResult.filePath }
            ).catch(() => {});

            resolve({
              success: true,
              data: { success: true, filePath: saveDialogResult.filePath },
            });
          } catch (pdfErr: any) {
            if (!pdfWindow.isDestroyed()) pdfWindow.destroy();
            resolve({ success: false, error: pdfErr.message || 'فشل توليد مستند PDF' });
          }
        });

        pdfWindow.loadURL(dataUrl);
      });
    } catch (err: any) {
      console.error('[ReportsService] Error exporting PDF:', err);
      return { success: false, error: err.message || 'فشل تصدير مستند PDF' };
    }
  }
}
