import { BrowserWindow } from 'electron';
import { eq } from 'drizzle-orm';
import { getDb, saveDatabaseToDisk } from '../db/client';
import { settings } from '../db/schema';
import {
  PrinterInfo,
  PrintSettings,
  InvoicePrintData,
  PrintResult,
  ServiceResult,
} from '../../src/shared/types';
import { AuthorizationService } from './AuthorizationService';
import { AuditLogService } from './AuditLogService';

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  autoPrint: true,
  printerName: '',
  paperWidth: '80mm',
  showPreviewBeforePrint: false,
  storeName: 'VOOC Store',
  storePhone: '01555600508',
  storeAddress: '',
  footerNote: 'شكراً لزيارتكم ونتمنى رؤيتكم دائماً\nالبضاعة المباعة ترد وتستبدل خلال 14 يوماً مع إحضار أصل الفاتورة',
};

const SETTINGS_KEY = 'print_settings';

export class PrintService {
  /**
   * Get current print settings from SQLite
   */
  static async getSettings(): Promise<ServiceResult<PrintSettings>> {
    const db = getDb();
    if (!db) {
      return { success: true, data: DEFAULT_PRINT_SETTINGS };
    }

    try {
      const row = db.select().from(settings).where(eq(settings.key, SETTINGS_KEY)).get();
      if (!row || !row.value) {
        return { success: true, data: DEFAULT_PRINT_SETTINGS };
      }

      const parsed = JSON.parse(row.value);
      return {
        success: true,
        data: {
          ...DEFAULT_PRINT_SETTINGS,
          ...parsed,
        },
      };
    } catch (err: any) {
      console.error('[PrintService] Error reading print settings:', err);
      return { success: true, data: DEFAULT_PRINT_SETTINGS };
    }
  }

  /**
   * Update print settings in SQLite (Admin Only)
   */
  static async updateSettings(
    newSettings: Partial<PrintSettings>
  ): Promise<ServiceResult<PrintSettings>> {
    try {
      await AuthorizationService.requireAdmin();
      const db = getDb();
      if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

      const currentRes = await this.getSettings();
      const current = currentRes.data || DEFAULT_PRINT_SETTINGS;
      const merged: PrintSettings = {
        ...current,
        ...newSettings,
        paperWidth: '80mm', // Always enforce 80mm thermal
      };

      const now = new Date().toISOString();
      const jsonValue = JSON.stringify(merged);

      const existing = db.select().from(settings).where(eq(settings.key, SETTINGS_KEY)).get();
      if (existing) {
        db.update(settings)
          .set({
            value: jsonValue,
            updatedAt: now,
          })
          .where(eq(settings.key, SETTINGS_KEY))
          .run();
      } else {
        db.insert(settings)
          .values({
            key: SETTINGS_KEY,
            value: jsonValue,
            description: 'إعدادات طباعة الفواتير الحرارية 80mm',
            updatedAt: now,
          })
          .run();
      }

      saveDatabaseToDisk();

      return { success: true, data: merged };
    } catch (err: any) {
      console.error('[PrintService] Error saving print settings:', err);
      return { success: false, error: err.message || 'فشل حفظ إعدادات الطباعة' };
    }
  }

  /**
   * Discover available Windows printers
   */
  static async getPrinters(): Promise<ServiceResult<PrinterInfo[]>> {
    try {
      let targetWebContents = BrowserWindow.getAllWindows()[0]?.webContents;

      // If no window is currently available, create a temporary headless one to query printers
      let tempWin: BrowserWindow | null = null;
      if (!targetWebContents) {
        tempWin = new BrowserWindow({ show: false, width: 100, height: 100 });
        targetWebContents = tempWin.webContents;
      }

      const printersList = await targetWebContents.getPrintersAsync();

      if (tempWin) {
        tempWin.destroy();
      }

      const mapped: PrinterInfo[] = printersList.map((p) => ({
        name: p.name,
        displayName: p.displayName || p.name,
        description: p.description,
        status: p.status,
        isDefault: p.isDefault,
      }));

      return { success: true, data: mapped };
    } catch (err: any) {
      console.error('[PrintService] Error discovering printers:', err);
      return { success: false, error: err.message || 'تعذر اكتشاف الطابعات المتاحة' };
    }
  }

  /**
   * Get default Windows printer
   */
  static async getDefaultPrinter(): Promise<ServiceResult<PrinterInfo | null>> {
    const listRes = await this.getPrinters();
    if (!listRes.success || !listRes.data) {
      return { success: false, error: listRes.error || 'تعذر جلب الطابعة الافتراضية' };
    }

    const defaultPrinter = listRes.data.find((p) => p.isDefault) || listRes.data[0] || null;
    return { success: true, data: defaultPrinter };
  }

  /**
   * Generate 80mm Thermal Receipt HTML
   */
  static formatReceiptHtml(data: InvoicePrintData, settings: PrintSettings): string {
    const storeName = data.storeName || settings.storeName || 'VOOC Store';
    const storePhone = data.storePhone || settings.storePhone || '';
    const storeAddress = data.storeAddress || settings.storeAddress || '';
    const footerNote = data.footerNote || settings.footerNote || '';
    const formattedDate = new Date(data.createdAt).toLocaleString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const itemsRows = data.items
      .map(
        (item) => `
        <tr>
          <td class="item-name">${item.productName}</td>
          <td class="item-qty">${item.quantity}</td>
          <td class="item-price">${Number(item.unitPrice).toFixed(2)}</td>
          <td class="item-total">${Number(item.totalPrice).toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    const discountRow =
      data.discountAmount > 0
        ? `
        <div class="summary-row">
          <span>الخصم المطبق:</span>
          <span>- ${Number(data.discountAmount).toFixed(2)} ج.م</span>
        </div>
      `
        : '';

    return `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>فاتورة ${data.invoiceNumber}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            width: 78mm;
            margin: 0 auto;
            padding: 4mm 3mm;
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            font-size: 11px;
            color: #000;
            background: #fff;
            line-height: 1.35;
          }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          
          .header {
            text-align: center;
            padding-bottom: 5px;
            border-bottom: 1px dashed #000;
            margin-bottom: 6px;
          }
          .store-name {
            font-size: 15px;
            font-weight: bold;
            margin-bottom: 3px;
          }
          .store-info {
            font-size: 10px;
            color: #222;
          }
          
          .meta-section {
            font-size: 10px;
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 1px dashed #000;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
          }
          th {
            font-size: 10px;
            border-bottom: 1px solid #000;
            padding: 3px 1px;
            text-align: right;
          }
          th.item-qty, th.item-price, th.item-total { text-align: center; }
          td {
            padding: 3px 1px;
            vertical-align: top;
            font-size: 10px;
          }
          .item-name { width: 44%; font-weight: 600; }
          .item-qty { width: 14%; text-align: center; font-weight: bold; }
          .item-price { width: 20%; text-align: center; }
          .item-total { width: 22%; text-align: left; font-weight: bold; }

          .summary-section {
            border-top: 1px dashed #000;
            padding-top: 5px;
            margin-bottom: 6px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            margin-bottom: 2px;
          }
          .net-total {
            font-size: 14px;
            font-weight: bold;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 4px 0;
            margin: 4px 0;
          }

          .footer {
            text-align: center;
            padding-top: 5px;
            border-top: 1px dashed #000;
            font-size: 9.5px;
            white-space: pre-line;
            color: #111;
          }
          .barcode-container {
            margin-top: 6px;
            text-align: center;
            font-family: monospace;
            font-size: 12px;
            letter-spacing: 2px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">${storeName}</div>
          ${storeAddress ? `<div class="store-info">${storeAddress}</div>` : ''}
          ${storePhone ? `<div class="store-info">هاتف: ${storePhone}</div>` : ''}
        </div>

        <div class="meta-section">
          <div class="meta-row">
            <span>رقم الفاتورة:</span>
            <span class="font-bold">${data.invoiceNumber}</span>
          </div>
          <div class="meta-row">
            <span>التاريخ:</span>
            <span>${formattedDate}</span>
          </div>
          ${
            data.sellerName
              ? `
            <div class="meta-row">
              <span>الكاشير / البائع:</span>
              <span>${data.sellerName}</span>
            </div>
          `
              : ''
          }
          ${
            data.customerName
              ? `
            <div class="meta-row">
              <span>العميل:</span>
              <span>${data.customerName}</span>
            </div>
          `
              : ''
          }
          <div class="meta-row">
            <span>طريقة الدفع:</span>
            <span>${data.paymentType === 'CARD' ? 'بطاقة بنكية (Card)' : 'نقدي (Cash)'}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="item-name">الصنف</th>
              <th class="item-qty">الكمية</th>
              <th class="item-price">السعر</th>
              <th class="item-total">المجموع</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="summary-section">
          <div class="summary-row">
            <span>المجموع الفرعي:</span>
            <span>${Number(data.totalAmount).toFixed(2)} ج.م</span>
          </div>
          ${discountRow}
          <div class="summary-row net-total">
            <span>المجموع الصافي:</span>
            <span>${Number(data.netAmount).toFixed(2)} ج.م</span>
          </div>
          <div class="summary-row">
            <span>المدفوع:</span>
            <span>${Number(data.paidAmount).toFixed(2)} ج.م</span>
          </div>
          <div class="summary-row">
            <span>المتبقي (الباقي):</span>
            <span>${Number(data.changeAmount || 0).toFixed(2)} ج.م</span>
          </div>
        </div>

        <div class="barcode-container">
          * ${data.invoiceNumber} *
        </div>

        ${
          footerNote
            ? `
          <div class="footer">
            ${footerNote}
          </div>
        `
            : ''
        }
      </body>
      </html>
    `;
  }

  /**
   * Print Invoice to selected 80mm thermal printer
   */
  static async printInvoice(data: InvoicePrintData): Promise<ServiceResult<PrintResult>> {
    try {
      await AuthorizationService.requireAuth();

      const settingsRes = await this.getSettings();
      const settings = settingsRes.data || DEFAULT_PRINT_SETTINGS;

      const htmlContent = this.formatReceiptHtml(data, settings);

      // Create a hidden printing window
      const printWindow = new BrowserWindow({
        show: false,
        width: 320,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          sandbox: true,
        },
      });

      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);

      return new Promise<ServiceResult<PrintResult>>((resolve) => {
        let isResolved = false;

        const cleanup = () => {
          if (!printWindow.isDestroyed()) {
            printWindow.destroy();
          }
        };

        const timeoutId = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            cleanup();
            resolve({
              success: false,
              error: 'استغرقت عملية الطباعة وقتاً أطول من المتوقع (انتهت المهلة)',
            });
          }
        }, 15000);

        printWindow.webContents.once('did-finish-load', () => {
          printWindow.webContents.print(
            {
              silent: true,
              deviceName: settings.printerName || undefined,
              printBackground: true,
              margins: { marginType: 'none' },
            },
            (success, failureReason) => {
              clearTimeout(timeoutId);
              if (!isResolved) {
                isResolved = true;
                cleanup();

                if (success) {
                  // Non-fatal Audit Log
                  AuditLogService.log(
                    'PRINT_SALE',
                    'SALE',
                    null,
                    `تمت طباعة الفاتورة رقم ${data.invoiceNumber}`,
                    { invoiceNumber: data.invoiceNumber, printer: settings.printerName || 'الافتراضية' }
                  ).catch(() => {});

                  resolve({
                    success: true,
                    data: {
                      success: true,
                      message: 'تم إرسال الفاتورة إلى الطابعة بنجاح',
                    },
                  });
                } else {
                  console.error('[PrintService] Print failure reason:', failureReason);
                  resolve({
                    success: false,
                    error: `تعذرت الطباعة: ${failureReason || 'تأكد من توصيل وتشغيل الطابعة'}`,
                  });
                }
              }
            }
          );
        });

        printWindow.webContents.once('did-fail-load', (_event, errorCode, errorDescription) => {
          clearTimeout(timeoutId);
          if (!isResolved) {
            isResolved = true;
            cleanup();
            resolve({
              success: false,
              error: `فشل تحميل قالب الفاتورة: ${errorDescription} (${errorCode})`,
            });
          }
        });

        printWindow.loadURL(dataUrl);
      });
    } catch (err: any) {
      console.error('[PrintService] Error during printInvoice:', err);
      return {
        success: false,
        error: err.message || 'حدث خطأ غير متوقع أثناء الطباعة',
      };
    }
  }

  /**
   * Test Print a Sample 80mm Receipt (Admin Only)
   */
  static async testPrint(printerName?: string): Promise<ServiceResult<PrintResult>> {
    try {
      await AuthorizationService.requireAdmin();

      const settingsRes = await this.getSettings();
      const settings = settingsRes.data || DEFAULT_PRINT_SETTINGS;
      const targetPrinter = printerName !== undefined ? printerName : settings.printerName;

      const testData: InvoicePrintData = {
        invoiceNumber: 'TEST-000001',
        createdAt: new Date().toISOString(),
        items: [
          {
            productName: 'صنف تجريبي (قميص قطن)',
            productBarcode: '123456789012',
            quantity: 2,
            unitPrice: 250,
            totalPrice: 500,
          },
          {
            productName: 'صنف تجريبي (بنطلون جينز)',
            productBarcode: '987654321098',
            quantity: 1,
            unitPrice: 350,
            totalPrice: 350,
          },
        ],
        totalAmount: 850,
        discountAmount: 50,
        netAmount: 800,
        paidAmount: 1000,
        changeAmount: 200,
        paymentType: 'CASH',
        sellerName: 'مدير النظام (اختبار)',
        customerName: 'عميل تجريبي',
        storeName: settings.storeName,
        storePhone: settings.storePhone,
        storeAddress: settings.storeAddress,
        footerNote: 'هذه فاتورة تجريبية لاختبار الطابعة الحرارية.\nلم يتم تسجيل أي عملية بيع أو تغيير في المخزون.',
      };

      const customSettings = {
        ...settings,
        printerName: targetPrinter,
      };

      const htmlContent = this.formatReceiptHtml(testData, customSettings);

      const printWindow = new BrowserWindow({
        show: false,
        width: 320,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          sandbox: true,
        },
      });

      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);

      return new Promise<ServiceResult<PrintResult>>((resolve) => {
        let isResolved = false;

        const cleanup = () => {
          if (!printWindow.isDestroyed()) {
            printWindow.destroy();
          }
        };

        const timeoutId = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            cleanup();
            resolve({
              success: false,
              error: 'انتهت مهلة اختبار الطباعة',
            });
          }
        }, 15000);

        printWindow.webContents.once('did-finish-load', () => {
          printWindow.webContents.print(
            {
              silent: true,
              deviceName: targetPrinter || undefined,
              printBackground: true,
              margins: { marginType: 'none' },
            },
            (success, failureReason) => {
              clearTimeout(timeoutId);
              if (!isResolved) {
                isResolved = true;
                cleanup();

                if (success) {
                  resolve({
                    success: true,
                    data: {
                      success: true,
                      message: 'تمت طباعة الفاتورة التجريبية بنجاح',
                    },
                  });
                } else {
                  console.error('[PrintService] Test print failed:', failureReason);
                  resolve({
                    success: false,
                    error: `فشل اختبار الطباعة: ${failureReason || 'تأكد من تشغيل الطابعة'}`,
                  });
                }
              }
            }
          );
        });

        printWindow.loadURL(dataUrl);
      });
    } catch (err: any) {
      console.error('[PrintService] Error during testPrint:', err);
      return {
        success: false,
        error: err.message || 'حدث خطأ أثناء اختبار الطباعة',
      };
    }
  }
}
