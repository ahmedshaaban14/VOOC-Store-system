import { eq } from 'drizzle-orm';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { getDb, saveDatabaseToDisk } from '../db/client';
import { products, categories } from '../db/schema';
import { Product, ServiceResult } from '../../src/shared/types';
import { AuditLogService } from './AuditLogService';

export class ProductService {
  // Directory where local product images are stored
  private static getImagesDirectory(): string {
    const userDataPath = app.getPath('userData');
    const imagesDir = path.join(userDataPath, 'product_images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    return imagesDir;
  }

  // Get all products with category names
  static async getAllProducts(): Promise<Product[]> {
    const db = getDb();
    if (!db) return [];

    try {
      const result = db
        .select({
          id: products.id,
          barcode: products.barcode,
          name: products.name,
          image: products.image,
          categoryId: products.categoryId,
          categoryName: categories.name,
          purchasePrice: products.purchasePrice,
          salePrice: products.salePrice,
          currentStock: products.currentStock,
          minStockLevel: products.minStockLevel,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .all();

      return result as Product[];
    } catch (err) {
      console.error('Failed to get products:', err);
      return [];
    }
  }

  // Get product by exact barcode
  static async getProductByBarcode(barcode: string): Promise<Product | null> {
    const db = getDb();
    if (!db) return null;

    try {
      const trimmedBarcode = barcode.trim();
      const product = db
        .select({
          id: products.id,
          barcode: products.barcode,
          name: products.name,
          image: products.image,
          categoryId: products.categoryId,
          categoryName: categories.name,
          purchasePrice: products.purchasePrice,
          salePrice: products.salePrice,
          currentStock: products.currentStock,
          minStockLevel: products.minStockLevel,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(products.barcode, trimmedBarcode))
        .get();

      return (product as Product) || null;
    } catch (err) {
      console.error('Error finding product by barcode:', err);
      return null;
    }
  }

  // Create product with barcode uniqueness check
  static async createProduct(
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ServiceResult<Product>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      // 1. Check if barcode already exists
      const existingBarcode = db
        .select()
        .from(products)
        .where(eq(products.barcode, productData.barcode))
        .get();

      if (existingBarcode) {
        return {
          success: false,
          error: `الباركود [${productData.barcode}] مستخدم بالفعل لمنتج آخر!`,
        };
      }

      const now = new Date().toISOString();
      const inserted = db
        .insert(products)
        .values({
          barcode: productData.barcode.trim(),
          name: productData.name.trim(),
          image: productData.image || null,
          categoryId: productData.categoryId || null,
          purchasePrice: Number(productData.purchasePrice),
          salePrice: Number(productData.salePrice),
          currentStock: Number(productData.currentStock || 0),
          minStockLevel: Number(productData.minStockLevel || 5),
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();

      saveDatabaseToDisk();

      await AuditLogService.log(
        'CREATE_PRODUCT',
        'PRODUCT',
        inserted.id,
        `تم إضافة صنف جديد: ${inserted.name} (بار كود: ${inserted.barcode})`,
        { barcode: inserted.barcode, name: inserted.name, salePrice: inserted.salePrice }
      );

      return { success: true, data: inserted as Product };
    } catch (err: any) {
      console.error('Error creating product:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء إضافة المنتج' };
    }
  }

  // Update product
  static async updateProduct(
    id: number,
    productData: Partial<Product>
  ): Promise<ServiceResult<Product>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      // If barcode changed, check uniqueness
      if (productData.barcode) {
        const existing = db
          .select()
          .from(products)
          .where(eq(products.barcode, productData.barcode))
          .get();

        if (existing && existing.id !== id) {
          return {
            success: false,
            error: `الباركود [${productData.barcode}] مستخدم بالفعل لمنتج آخر!`,
          };
        }
      }

      const now = new Date().toISOString();
      const updated = db
        .update(products)
        .set({
          ...(productData.name && { name: productData.name.trim() }),
          ...(productData.barcode && { barcode: productData.barcode.trim() }),
          ...(productData.image !== undefined && { image: productData.image }),
          ...(productData.categoryId !== undefined && { categoryId: productData.categoryId }),
          ...(productData.purchasePrice !== undefined && { purchasePrice: Number(productData.purchasePrice) }),
          ...(productData.salePrice !== undefined && { salePrice: Number(productData.salePrice) }),
          ...(productData.currentStock !== undefined && { currentStock: Number(productData.currentStock) }),
          ...(productData.minStockLevel !== undefined && { minStockLevel: Number(productData.minStockLevel) }),
          updatedAt: now,
        })
        .where(eq(products.id, id))
        .returning()
        .get();

      saveDatabaseToDisk();

      await AuditLogService.log(
        'UPDATE_PRODUCT',
        'PRODUCT',
        updated.id,
        `تم تعديل بيانات الصنف: ${updated.name} (بار كود: ${updated.barcode})`,
        { barcode: updated.barcode, name: updated.name }
      );

      return { success: true, data: updated as Product };
    } catch (err: any) {
      console.error('Error updating product:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء تعديل المنتج' };
    }
  }

  // Delete product
  static async deleteProduct(id: number): Promise<ServiceResult<boolean>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const product = db.select().from(products).where(eq(products.id, id)).get();
      if (!product) return { success: false, error: 'المنتج غير موجود' };

      // Delete product record
      db.delete(products).where(eq(products.id, id)).run();

      // Remove local image file if present inside app data folder
      if (product.image && fs.existsSync(product.image)) {
        try {
          fs.unlinkSync(product.image);
        } catch (e) {
          console.warn('Failed to cleanup image file:', e);
        }
      }

      saveDatabaseToDisk();

      await AuditLogService.log(
        'DELETE_PRODUCT',
        'PRODUCT',
        id,
        `تم حذف الصنف: ${product.name} (بار كود: ${product.barcode})`
      );

      return { success: true, data: true };
    } catch (err: any) {
      console.error('Error deleting product:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء حذف المنتج' };
    }
  }

  // Save product image file to local userData/product_images/ folder
  static async saveImageFile(fileData: ArrayBuffer, fileName: string): Promise<ServiceResult<string>> {
    try {
      const imagesDir = this.getImagesDirectory();
      const ext = path.extname(fileName) || '.jpg';
      const uniqueName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      const targetPath = path.join(imagesDir, uniqueName);

      const buffer = Buffer.from(fileData);
      fs.writeFileSync(targetPath, buffer);

      // Return path string for offline rendering
      return { success: true, data: targetPath };
    } catch (err: any) {
      console.error('Error saving image file:', err);
      return { success: false, error: 'تعذر حفظ ملف الصورة في مجلد البيانات المحلّية' };
    }
  }

  // Read and return product image as safe data URL with strict path validation
  static async getProductImageData(imagePathOrName?: string | null): Promise<ServiceResult<string | null>> {
    try {
      if (!imagePathOrName) {
        return { success: true, data: null };
      }

      const filename = path.basename(imagePathOrName.trim());
      if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return { success: false, error: 'مسار الصورة غير صالح' };
      }

      const imagesDir = this.getImagesDirectory();
      const safeFilePath = path.resolve(path.join(imagesDir, filename));

      // Security validation: verify path stays strictly inside imagesDir
      if (!safeFilePath.startsWith(path.resolve(imagesDir)) || !fs.existsSync(safeFilePath)) {
        return { success: true, data: null };
      }

      const ext = path.extname(filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
      };
      const mimeType = mimeTypes[ext] || 'image/jpeg';
      const buffer = fs.readFileSync(safeFilePath);
      const base64 = buffer.toString('base64');
      return { success: true, data: `data:${mimeType};base64,${base64}` };
    } catch (err: any) {
      console.error('Error loading product image data:', err);
      return { success: false, error: 'تعذر قراءة ملف الصورة' };
    }
  }
}
