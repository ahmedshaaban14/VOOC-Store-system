import { app, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import { createRequire } from 'module';
import { saveDatabaseToDisk, initDatabase } from '../db/client';
import { AuthorizationService } from './AuthorizationService';
import { AuditLogService } from './AuditLogService';
import {
  BackupInfo,
  BackupValidationResult,
  RestoreResult,
  ServiceResult,
} from '../../src/shared/types';

export class BackupService {
  /**
   * Helper to format file size in human-readable Arabic format
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 ميجابايت';
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Helper to get current database file path
   */
  private static getDbFilePath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'data', 'clothing_store.db');
  }

  /**
   * Helper to load sql.js instance for inspecting offline backup files
   */
  private static async getSqlInstance() {
    let wasmBinary: Uint8Array | undefined = undefined;
    try {
      const candidates: (string | undefined)[] = [
        path.join(process.resourcesPath || '', 'sql-wasm.wasm'),
        path.join(process.resourcesPath || '', 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
      ];
      try {
        const require = createRequire(import.meta.url);
        candidates.push(require.resolve('sql.js/dist/sql-wasm.wasm'));
      } catch (_e) {}

      for (const wasmPath of candidates) {
        if (wasmPath && fs.existsSync(wasmPath)) {
          wasmBinary = new Uint8Array(fs.readFileSync(wasmPath));
          break;
        }
      }
    } catch (_err) {
      // Fallback
    }

    return await initSqlJs(
      wasmBinary
        ? ({
            wasmBinary,
            locateFile: (file: string) => file,
          } as any)
        : undefined
    );
  }

  /**
   * Create database backup (ADMIN only).
   */
  static async createBackup(): Promise<ServiceResult<{ filePath: string }>> {
    try {
      await AuthorizationService.requireAdmin();

      // 1. Ensure current in-memory database is saved to disk first
      saveDatabaseToDisk();

      const currentDbPath = this.getDbFilePath();
      if (!fs.existsSync(currentDbPath)) {
        return { success: false, error: 'تعذر العثور على ملف قاعدة البيانات الحالي' };
      }

      // 2. Generate default timestamped filename
      const now = new Date();
      const timestamp = now
        .toISOString()
        .replace(/T/, '_')
        .replace(/:/g, '-')
        .replace(/\..+/, '');
      const defaultFileName = `VOOC_Store_Backup_${timestamp}.db`;

      // 3. Show native Electron save dialog
      const saveDialogResult = await dialog.showSaveDialog({
        title: 'تصدير نسخة احتياطية من قاعدة البيانات',
        defaultPath: defaultFileName,
        filters: [{ name: 'ملفات قاعدة البيانات SQLite (*.db)', extensions: ['db'] }],
      });

      if (saveDialogResult.canceled || !saveDialogResult.filePath) {
        return { success: false, error: 'تم إلغاء عملية التصدير' };
      }

      const destFilePath = saveDialogResult.filePath;

      // 4. Copy database file to selected destination
      fs.copyFileSync(currentDbPath, destFilePath);

      // 5. Write BACKUP_DATABASE to audit log
      await AuditLogService.log(
        'BACKUP_DATABASE',
        'SYSTEM',
        null,
        `تم إنشاء نسخة احتياطية نجاح في المسار: ${path.basename(destFilePath)}`,
        { destFilePath, fileName: path.basename(destFilePath) }
      );

      return {
        success: true,
        data: { filePath: destFilePath },
      };
    } catch (err: any) {
      console.error('[BackupService] Error creating database backup:', err);
      return { success: false, error: err.message || 'فشلت عملية إنشاء النسخة الاحتياطية' };
    }
  }

  /**
   * Internal helper to extract BackupInfo from a database file buffer
   */
  private static async inspectBackupFile(filePath: string): Promise<BackupInfo> {
    const stats = fs.statSync(filePath);
    const fileBuffer = new Uint8Array(fs.readFileSync(filePath));
    const SQL = await this.getSqlInstance();
    const tempDb = new SQL.Database(fileBuffer);

    let productCount = 0;
    let salesCount = 0;
    let purchaseCount = 0;
    let userCount = 0;

    const countQuery = (tableName: string): number => {
      try {
        const res = tempDb.exec(`SELECT COUNT(*) as cnt FROM ${tableName}`);
        if (res && res[0] && res[0].values && res[0].values[0]) {
          return Number(res[0].values[0][0]) || 0;
        }
      } catch (_e) {
        // Table might not exist in an older backup
      }
      return 0;
    };

    productCount = countQuery('products');
    salesCount = countQuery('sales');
    purchaseCount = countQuery('purchases');
    userCount = countQuery('users');

    tempDb.close();

    return {
      filePath,
      fileName: path.basename(filePath),
      fileSizeBytes: stats.size,
      formattedFileSize: this.formatBytes(stats.size),
      backupCreatedAt: stats.mtime.toISOString(),
      productCount,
      salesCount,
      purchaseCount,
      userCount,
    };
  }

  /**
   * Validate backup database file (ADMIN only).
   */
  static async validateBackup(targetFilePath?: string): Promise<ServiceResult<BackupValidationResult>> {
    try {
      await AuthorizationService.requireAdmin();

      let selectedPath = targetFilePath;

      if (!selectedPath) {
        const openDialogResult = await dialog.showOpenDialog({
          title: 'اختر ملف النسخة الاحتياطية للتحقق منه',
          properties: ['openFile'],
          filters: [{ name: 'ملفات قاعدة البيانات SQLite (*.db)', extensions: ['db'] }],
        });

        if (openDialogResult.canceled || openDialogResult.filePaths.length === 0) {
          return {
            success: false,
            data: { isValid: false, errorMessage: 'تم إلغاء اختيار الملف' },
          };
        }
        selectedPath = openDialogResult.filePaths[0];
      }

      // 1. Verify file existence and readability
      if (!fs.existsSync(selectedPath)) {
        return {
          success: true,
          data: { isValid: false, errorMessage: 'الملف المحدد غير موجود على القرص' },
        };
      }

      // 2. Check header magic bytes for SQLite format ("SQLite format 3\0")
      const buffer = Buffer.alloc(16);
      const fd = fs.openSync(selectedPath, 'r');
      fs.readSync(fd, buffer, 0, 16, 0);
      fs.closeSync(fd);

      const magicString = buffer.toString('utf-8', 0, 15);
      if (magicString !== 'SQLite format 3') {
        return {
          success: true,
          data: {
            isValid: false,
            errorMessage: 'الملف المحدد ليس قاعدة بيانات SQLite صالحة أو أنه تالف',
          },
        };
      }

      // 3. Load into memory via sql.js to verify table structure
      try {
        const info = await this.inspectBackupFile(selectedPath);

        // Verification requirement: check if key tables exist
        const fileBuffer = new Uint8Array(fs.readFileSync(selectedPath));
        const SQL = await this.getSqlInstance();
        const tempDb = new SQL.Database(fileBuffer);

        const tablesResult = tempDb.exec(`SELECT name FROM sqlite_master WHERE type='table'`);
        const tableNames = tablesResult[0]?.values.map((row) => String(row[0])) || [];
        tempDb.close();

        // Must contain at least core tables (products, sales, or users)
        const requiredCoreTables = ['products', 'sales'];
        const hasCoreTables = requiredCoreTables.some((t) => tableNames.includes(t));

        if (!hasCoreTables) {
          return {
            success: true,
            data: {
              isValid: false,
              errorMessage: 'ملف قاعدة البيانات لا يحتوي على هياكل الجداول الأساسية للتطبيق',
            },
          };
        }

        return {
          success: true,
          data: {
            isValid: true,
            info,
          },
        };
      } catch (dbErr: any) {
        return {
          success: true,
          data: {
            isValid: false,
            errorMessage: `فشلت قراءة جداول قاعدة البيانات: ${dbErr.message || 'ملف غير صالح'}`,
          },
        };
      }
    } catch (err: any) {
      console.error('[BackupService] Error validating backup:', err);
      return {
        success: false,
        error: err.message || 'تعذر التحقق من ملف النسخة الاحتياطية',
      };
    }
  }

  /**
   * Read backup file information (ADMIN only).
   */
  static async getBackupInfo(filePath: string): Promise<ServiceResult<BackupInfo>> {
    try {
      await AuthorizationService.requireAdmin();
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'الملف المحدد غير موجود' };
      }
      const info = await this.inspectBackupFile(filePath);
      return { success: true, data: info };
    } catch (err: any) {
      console.error('[BackupService] Error getting backup info:', err);
      return { success: false, error: err.message || 'تعذر جلب معلومات ملف النسخة الاحتياطية' };
    }
  }

  /**
   * Safe Restore from Backup (ADMIN only).
   * Creates a safety pre-restore backup first before replacing the database.
   */
  static async restoreBackup(filePath: string): Promise<ServiceResult<RestoreResult>> {
    let safetyBackupPath: string | undefined = undefined;
    try {
      await AuthorizationService.requireAdmin();

      // 1. Validate backup file first
      const validationRes = await this.validateBackup(filePath);
      if (!validationRes.success || !validationRes.data?.isValid) {
        return {
          success: false,
          error: validationRes.data?.errorMessage || 'ملف النسخة الاحتياطية غير صالح ولا يمكن استعادته',
        };
      }

      // 2. Ensure current database is saved to disk
      saveDatabaseToDisk();
      const currentDbPath = this.getDbFilePath();

      // 3. Create Safety Pre-Restore Backup
      const userDataPath = app.getPath('userData');
      const safetyBackupDir = path.join(userDataPath, 'data', 'backups');
      if (!fs.existsSync(safetyBackupDir)) {
        fs.mkdirSync(safetyBackupDir, { recursive: true });
      }

      const now = new Date();
      const timestamp = now
        .toISOString()
        .replace(/T/, '_')
        .replace(/:/g, '-')
        .replace(/\..+/, '');
      safetyBackupPath = path.join(safetyBackupDir, `VOOC_Store_PreRestore_${timestamp}.db`);

      if (fs.existsSync(currentDbPath)) {
        fs.copyFileSync(currentDbPath, safetyBackupPath);
        console.log(`[BackupService] Pre-Restore safety backup created at: ${safetyBackupPath}`);
      }

      // 4. Overwrite current database file with selected backup file
      try {
        fs.copyFileSync(filePath, currentDbPath);
      } catch (copyErr: any) {
        // Rollback attempt if file copy fails
        if (safetyBackupPath && fs.existsSync(safetyBackupPath)) {
          fs.copyFileSync(safetyBackupPath, currentDbPath);
        }
        return {
          success: false,
          error: `فشل استبدال ملف قاعدة البيانات: ${copyErr.message || 'خطأ في النسخ'}`,
        };
      }

      // 5. Reload database layer safely
      try {
        await initDatabase(true);
      } catch (reloadErr: any) {
        // If reinitialization fails, attempt rollback from safety backup
        console.error('[BackupService] Database reinitialization failed after restore. Rolling back...', reloadErr);
        if (safetyBackupPath && fs.existsSync(safetyBackupPath)) {
          fs.copyFileSync(safetyBackupPath, currentDbPath);
          await initDatabase(true);
        }
        return {
          success: false,
          error: `فشلت إعادة تهيئة قاعدة البيانات: ${reloadErr.message || 'تم التراجع تلقائياً إلى نسخة الأمان'}`,
        };
      }

      // 6. Write RESTORE_DATABASE to audit log
      await AuditLogService.log(
        'RESTORE_DATABASE',
        'SYSTEM',
        null,
        `تم استعادة قاعدة البيانات من الملف: ${path.basename(filePath)}`,
        { restoredFilePath: filePath, safetyBackupPath }
      );

      return {
        success: true,
        data: {
          success: true,
          message: 'تمت استعادة قاعدة البيانات وإعادة تشغيل المحرك بنجاح.',
          safetyBackupPath,
        },
      };
    } catch (err: any) {
      console.error('[BackupService] Error restoring database backup:', err);
      return {
        success: false,
        error: err.message || 'حدث خطأ أثناء عملية استعادة قاعدة البيانات',
      };
    }
  }
}
