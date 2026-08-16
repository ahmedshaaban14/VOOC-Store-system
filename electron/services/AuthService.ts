import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { getDb, saveDatabaseToDisk } from '../db/client';
import { users, sessions } from '../db/schema';
import { User, UserRole, ServiceResult } from '../../src/shared/types';
import { AuditLogService } from './AuditLogService';

export class AuthService {
  // Password hashing helper (PBKDF2 SHA-512 with 600,000 iterations)
  private static hashPassword(password: string, salt?: string, iterations: number = 600000): string {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, s, iterations, 64, 'sha512').toString('hex');
    return `${iterations}:${s}:${hash}`;
  }

  private static verifyPassword(password: string, storedHash: string): boolean {
    try {
      if (!storedHash || typeof storedHash !== 'string') return false;
      const parts = storedHash.split(':');

      if (parts.length === 3) {
        // Hardened self-describing format: 600000:salt:hash
        const [iterationsStr, salt, hash] = parts;
        const iterations = parseInt(iterationsStr, 10) || 600000;
        const newHash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
        const bufA = Buffer.from(hash, 'utf-8');
        const bufB = Buffer.from(newHash, 'utf-8');
        if (bufA.length !== bufB.length) return false;
        return crypto.timingSafeEqual(bufA, bufB);
      } else if (parts.length === 2) {
        // Legacy format: salt:hash (1000 iterations sha256)
        const [salt, hash] = parts;
        const newHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
        const bufA = Buffer.from(hash, 'utf-8');
        const bufB = Buffer.from(newHash, 'utf-8');
        if (bufA.length !== bufB.length) return false;
        return crypto.timingSafeEqual(bufA, bufB);
      }
      return false;
    } catch (err) {
      console.error('[AUTH] Exception in verifyPassword:', err);
      return false;
    }
  }

  // Seed default admin account if users table is empty or admin account needs initialization
  static initDefaultAdmin() {
    const db = getDb();
    if (!db) return;

    try {
      const adminUser = db.select().from(users).where(eq(users.username, 'admin')).get();
      const defaultHash = this.hashPassword('admin123');

      if (!adminUser) {
        const now = new Date().toISOString();
        db.insert(users)
          .values({
            username: 'admin',
            passwordHash: defaultHash,
            displayName: 'المدير الرئيسي',
            role: 'ADMIN',
            isActive: 1,
            createdAt: now,
            updatedAt: now,
          })
          .run();

        saveDatabaseToDisk();
        console.log('[AUTH] Successfully seeded default admin user (600,000 iterations SHA-512): admin / admin123');
      } else if (!this.verifyPassword('admin123', adminUser.passwordHash)) {
        // If admin account exists but hash cannot be verified with admin123, reset to default admin123
        db.update(users)
          .set({ passwordHash: defaultHash, isActive: 1, updatedAt: new Date().toISOString() })
          .where(eq(users.id, adminUser.id))
          .run();
        saveDatabaseToDisk();
        console.log('[AUTH] Reset default admin user password to: admin123');
      } else {
        console.log('[AUTH] Default admin account verified and ready: admin');
      }
    } catch (err) {
      console.error('[AUTH] Error seeding default admin user:', err);
    }
  }

  // Login
  static async login(username: string, password: string): Promise<ServiceResult<User>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const trimmedUsername = username.trim().toLowerCase();
      if (!trimmedUsername || !password) {
        return { success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور' };
      }

      console.log(`[AUTH] Login attempt for username: ${trimmedUsername}`);
      const user = db.select().from(users).where(eq(users.username, trimmedUsername)).get();

      console.log(`[AUTH] User found: ${!!user}`);

      if (!user) {
        return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
      }

      console.log(`[AUTH] User active: ${user.isActive === 1}`);
      if (user.isActive !== 1) {
        return { success: false, error: 'هذا الحساب غير مفعل. يرجى مراجعة مدير النظام.' };
      }

      const isNewFormat = user.passwordHash.split(':').length === 3;
      console.log(`[AUTH] Password hash format: ${isNewFormat ? 'new (600,000)' : 'legacy (1,000)'}`);

      const isValidPassword = this.verifyPassword(password, user.passwordHash);
      console.log(`[AUTH] Password verification result: ${isValidPassword}`);

      if (!isValidPassword) {
        return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
      }

      const now = new Date().toISOString();

      // Auto-Upgrade / Rehash legacy 1,000-iteration passwords to 600,000 iterations SHA-512
      let newHashToSave: string | undefined = undefined;
      if (!user.passwordHash.startsWith('600000:')) {
        newHashToSave = this.hashPassword(password);
      }

      // Clear existing local sessions & create new session
      db.delete(sessions).run();
      db.insert(sessions)
        .values({
          userId: user.id,
          createdAt: now,
          lastActivityAt: now,
        })
        .run();

      // Update last login (and rehashed password if upgraded)
      db.update(users)
        .set({
          lastLoginAt: now,
          updatedAt: now,
          ...(newHashToSave && { passwordHash: newHashToSave }),
        })
        .where(eq(users.id, user.id))
        .run();

      saveDatabaseToDisk();

      const sanitizedUser: User = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role as UserRole,
        isActive: user.isActive === 1,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: now,
      };

      await AuditLogService.log(
        'LOGIN',
        'USER',
        user.id,
        `قام المستخدم ${user.displayName} (${user.username}) بتسجيل الدخول إلى النظام`
      );

      return { success: true, data: sanitizedUser };
    } catch (err: any) {
      console.error('Error during login:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء تسجيل الدخول.' };
    }
  }

  // Logout
  static async logout(): Promise<ServiceResult<boolean>> {
    const db = getDb();
    if (!db) return { success: true, data: true };

    try {
      const currentUser = await this.getCurrentUser();
      if (currentUser) {
        await AuditLogService.log(
          'LOGOUT',
          'USER',
          currentUser.id,
          `قام المستخدم ${currentUser.displayName} (${currentUser.username}) بتسجيل الخروج من النظام`
        );
      }
      db.delete(sessions).run();
      saveDatabaseToDisk();
      return { success: true, data: true };
    } catch (err) {
      console.error('Error during logout:', err);
      return { success: true, data: true };
    }
  }

  // Get current logged-in user from local session
  static async getCurrentUser(): Promise<User | null> {
    const db = getDb();
    if (!db) return null;

    try {
      const activeSession = db.select().from(sessions).orderBy(desc(sessions.createdAt)).get();
      if (!activeSession) return null;

      const user = db.select().from(users).where(eq(users.id, activeSession.userId)).get();
      if (!user || user.isActive !== 1) {
        // Clear stale/deactivated user session
        db.delete(sessions).run();
        saveDatabaseToDisk();
        return null;
      }

      // Refresh session last activity
      const now = new Date().toISOString();
      db.update(sessions)
        .set({ lastActivityAt: now })
        .where(eq(sessions.id, activeSession.id))
        .run();

      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role as UserRole,
        isActive: user.isActive === 1,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt || undefined,
      };
    } catch (err) {
      console.error('Error fetching current user:', err);
      return null;
    }
  }

  // Change Password
  static async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<ServiceResult<boolean>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const user = db.select().from(users).where(eq(users.id, userId)).get();
      if (!user) {
        return { success: false, error: 'المستخدم غير موجود' };
      }

      if (!this.verifyPassword(currentPassword, user.passwordHash)) {
        return { success: false, error: 'كلمة المرور الحالية غير صحيحة.' };
      }

      if (!newPassword || newPassword.length < 4) {
        return { success: false, error: 'كلمة المرور الجديدة قصيرة جداً (4 أحرف على الأقل).' };
      }

      const now = new Date().toISOString();
      const newHash = this.hashPassword(newPassword);

      db.update(users)
        .set({
          passwordHash: newHash,
          updatedAt: now,
        })
        .where(eq(users.id, userId))
        .run();

      saveDatabaseToDisk();

      await AuditLogService.log(
        'CHANGE_PASSWORD',
        'USER',
        userId,
        `تم تغيير كلمة المرور للمستخدم: ${user.displayName}`
      );

      return { success: true, data: true };
    } catch (err: any) {
      console.error('Error changing password:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء تغيير كلمة المرور' };
    }
  }

  // Get All Users (Admin Only)
  static async getUsers(): Promise<User[]> {
    const db = getDb();
    if (!db) return [];

    try {
      const result = db.select().from(users).orderBy(desc(users.createdAt)).all();
      return result.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        role: u.role as UserRole,
        isActive: u.isActive === 1,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        lastLoginAt: u.lastLoginAt || undefined,
      }));
    } catch (err) {
      console.error('Error fetching users:', err);
      return [];
    }
  }

  // Create User (Admin Only)
  static async createUser(data: {
    username: string;
    password: string;
    displayName: string;
    role: UserRole;
  }): Promise<ServiceResult<User>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const trimmedUsername = data.username.trim().toLowerCase();
      const trimmedName = data.displayName.trim();

      if (!trimmedUsername || !data.password || !trimmedName) {
        return { success: false, error: 'جميع البيانات الأساسية مطلوبة' };
      }

      const existing = db.select().from(users).where(eq(users.username, trimmedUsername)).get();
      if (existing) {
        return { success: false, error: 'اسم المستخدم هذا مسجل بالفعل مستخدم آخر' };
      }

      const now = new Date().toISOString();
      const passwordHash = this.hashPassword(data.password);

      const inserted = db
        .insert(users)
        .values({
          username: trimmedUsername,
          passwordHash,
          displayName: trimmedName,
          role: data.role,
          isActive: 1,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();

      saveDatabaseToDisk();

      await AuditLogService.log(
        'CREATE_USER',
        'USER',
        inserted.id,
        `تم إضافة مستخدم جديد: ${inserted.displayName} (${inserted.username}) بدور ${inserted.role === 'ADMIN' ? 'مدير' : 'بائع'}`
      );

      return {
        success: true,
        data: {
          id: inserted.id,
          username: inserted.username,
          displayName: inserted.displayName,
          role: inserted.role as UserRole,
          isActive: inserted.isActive === 1,
          createdAt: inserted.createdAt,
          updatedAt: inserted.updatedAt,
        },
      };
    } catch (err: any) {
      console.error('Error creating user:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء إضافة المستخدم' };
    }
  }

  // Update User (Admin Only)
  static async updateUser(
    id: number,
    data: { displayName?: string; role?: UserRole; username?: string }
  ): Promise<ServiceResult<User>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const user = db.select().from(users).where(eq(users.id, id)).get();
      if (!user) return { success: false, error: 'المستخدم غير موجود' };

      const now = new Date().toISOString();
      const updated = db
        .update(users)
        .set({
          ...(data.displayName && { displayName: data.displayName.trim() }),
          ...(data.role && { role: data.role }),
          ...(data.username && { username: data.username.trim().toLowerCase() }),
          updatedAt: now,
        })
        .where(eq(users.id, id))
        .returning()
        .get();

      saveDatabaseToDisk();

      await AuditLogService.log(
        'UPDATE_USER',
        'USER',
        updated.id,
        `تم تعديل بيانات المستخدم: ${updated.displayName} (${updated.username})`
      );

      return {
        success: true,
        data: {
          id: updated.id,
          username: updated.username,
          displayName: updated.displayName,
          role: updated.role as UserRole,
          isActive: updated.isActive === 1,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      };
    } catch (err: any) {
      console.error('Error updating user:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء تعديل بيانات المستخدم' };
    }
  }

  // Set User Active / Inactive (Admin Only)
  static async setUserActive(id: number, isActive: boolean): Promise<ServiceResult<boolean>> {
    const db = getDb();
    if (!db) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات المحلّية' };

    try {
      const currentUser = await this.getCurrentUser();
      if (currentUser && currentUser.id === id && !isActive) {
        return { success: false, error: 'لا يمكنك تعطيل حسابك الحالي المسجل به الدخول!' };
      }

      const now = new Date().toISOString();
      db.update(users)
        .set({
          isActive: isActive ? 1 : 0,
          updatedAt: now,
        })
        .where(eq(users.id, id))
        .run();

      saveDatabaseToDisk();

      await AuditLogService.log(
        isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        'USER',
        id,
        `تم ${isActive ? 'تفعيل' : 'تعطيل'} حساب المستخدم رقم #${id}`
      );

      return { success: true, data: true };
    } catch (err: any) {
      console.error('Error setting user active status:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء تغيير حالة الحساب' };
    }
  }
}
