import { getDb, saveDatabaseToDisk } from '../db/client';
import { auditLogs } from '../db/schema';
import { AuthService } from './AuthService';
import { AuthorizationService } from './AuthorizationService';
import { AuditLog, AuditLogAction, AuditLogFilterInput, ServiceResult } from '../../src/shared/types';
import { desc, eq, and, gte, lte, like, or } from 'drizzle-orm';

export class AuditLogService {
  /**
   * Log an audit event.
   * Resolves current logged-in user from AuthService.
   * Fails silently (logs to console) so it NEVER interrupts core business operations.
   */
  static async log(
    action: AuditLogAction,
    entityType: string,
    entityId?: string | number | null,
    description?: string,
    metadata?: Record<string, any> | string | null
  ): Promise<void> {
    try {
      const db = getDb();
      if (!db) {
        console.warn('[AuditLogService] Database instance not ready to log audit event.');
        return;
      }

      // 1. Resolve current user from main process session
      const currentUser = await AuthService.getCurrentUser();

      const userId = currentUser ? currentUser.id : null;
      const username = currentUser ? currentUser.username : 'SYSTEM';
      const displayName = currentUser ? currentUser.displayName : 'نظام التشغيل';

      // 2. Sanitize metadata — NEVER store passwords or password hashes
      let sanitizedMetadataString: string | null = null;
      if (metadata) {
        if (typeof metadata === 'object') {
          const sanitizedObj = { ...metadata };
          delete sanitizedObj.password;
          delete sanitizedObj.currentPassword;
          delete sanitizedObj.newPassword;
          delete sanitizedObj.passwordHash;
          delete sanitizedObj.password_hash;
          sanitizedMetadataString = JSON.stringify(sanitizedObj);
        } else {
          sanitizedMetadataString = String(metadata);
        }
      }

      const defaultDescription = description || `قام المستخدم ${displayName} بعملية ${action} على ${entityType}`;

      // 3. Insert audit log record
      await db.insert(auditLogs).values({
        userId,
        username,
        displayName,
        action,
        entityType,
        entityId: entityId !== undefined && entityId !== null ? String(entityId) : null,
        description: defaultDescription,
        metadata: sanitizedMetadataString,
        createdAt: new Date().toISOString(),
      });

      // 4. Save DB state to disk
      saveDatabaseToDisk();
    } catch (err) {
      // Audit log MUST NOT break the original business operation!
      console.error('[AuditLogService] Non-fatal error while writing audit log:', err);
    }
  }

  /**
   * Fetch audit logs list with optional filtering (ADMIN only).
   */
  static async getLogs(filters?: AuditLogFilterInput): Promise<ServiceResult<AuditLog[]>> {
    try {
      await AuthorizationService.requireAdmin();
      const db = getDb();
      if (!db) {
        return { success: false, error: 'قاعدة البيانات غير متصلة' };
      }

      let query = db.select().from(auditLogs);
      const conditions = [];

      if (filters?.userId) {
        conditions.push(eq(auditLogs.userId, filters.userId));
      }

      if (filters?.action && filters.action.trim() !== '') {
        conditions.push(eq(auditLogs.action, filters.action.trim()));
      }

      if (filters?.startDate && filters.startDate.trim() !== '') {
        conditions.push(gte(auditLogs.createdAt, filters.startDate.trim()));
      }

      if (filters?.endDate && filters.endDate.trim() !== '') {
        // Include full end date timestamp
        const endDateTime = filters.endDate.trim().includes('T')
          ? filters.endDate.trim()
          : `${filters.endDate.trim()}T23:59:59.999Z`;
        conditions.push(lte(auditLogs.createdAt, endDateTime));
      }

      if (filters?.search && filters.search.trim() !== '') {
        const term = `%${filters.search.trim()}%`;
        conditions.push(
          or(
            like(auditLogs.username, term),
            like(auditLogs.displayName, term),
            like(auditLogs.description, term),
            like(auditLogs.entityId, term),
            like(auditLogs.entityType, term)
          )
        );
      }

      let resultLogs;
      if (conditions.length > 0) {
        resultLogs = await query.where(and(...conditions)).orderBy(desc(auditLogs.id));
      } else {
        resultLogs = await query.orderBy(desc(auditLogs.id));
      }

      const formattedLogs: AuditLog[] = resultLogs.map((log) => ({
        id: log.id,
        userId: log.userId,
        username: log.username,
        displayName: log.displayName,
        action: log.action as any,
        entityType: log.entityType,
        entityId: log.entityId,
        description: log.description,
        metadata: log.metadata,
        createdAt: log.createdAt,
      }));

      return { success: true, data: formattedLogs };
    } catch (err: any) {
      console.error('[AuditLogService] Error fetching audit logs:', err);
      return { success: false, error: err.message || 'تعذر جلب سجلات العمليات' };
    }
  }

  /**
   * Fetch single audit log detail (ADMIN only).
   */
  static async getLogDetails(id: number): Promise<ServiceResult<AuditLog | null>> {
    try {
      await AuthorizationService.requireAdmin();
      const db = getDb();
      if (!db) {
        return { success: false, error: 'قاعدة البيانات غير متصلة' };
      }

      const logs = await db.select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1);
      if (logs.length === 0) {
        return { success: true, data: null };
      }

      const log = logs[0];
      const formattedLog: AuditLog = {
        id: log.id,
        userId: log.userId,
        username: log.username,
        displayName: log.displayName,
        action: log.action as any,
        entityType: log.entityType,
        entityId: log.entityId,
        description: log.description,
        metadata: log.metadata,
        createdAt: log.createdAt,
      };

      return { success: true, data: formattedLog };
    } catch (err: any) {
      console.error('[AuditLogService] Error fetching audit log detail:', err);
      return { success: false, error: err.message || 'تعذر جلب تفاصيل سجل العملية' };
    }
  }
}
