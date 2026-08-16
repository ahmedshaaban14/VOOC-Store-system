import { create } from 'zustand';
import { BackupValidationResult, RestoreResult } from '../shared/types';
import { useToastStore } from './useToastStore';

interface BackupState {
  isBackingUp: boolean;
  isValidating: boolean;
  isRestoring: boolean;
  validationResult: BackupValidationResult | null;
  lastBackupPath: string | null;
  selectedBackupFile: string | null;

  createBackup: () => Promise<boolean>;
  validateBackup: (filePath?: string) => Promise<BackupValidationResult | null>;
  restoreBackup: (filePath: string) => Promise<RestoreResult | null>;
  resetValidation: () => void;
}

export const useBackupStore = create<BackupState>((set) => ({
  isBackingUp: false,
  isValidating: false,
  isRestoring: false,
  validationResult: null,
  lastBackupPath: null,
  selectedBackupFile: null,

  createBackup: async () => {
    const { addToast } = useToastStore.getState();
    set({ isBackingUp: true });

    const api = window.electronAPI;
    const createFn = api?.backup?.create;

    if (createFn) {
      try {
        const res = await createFn();
        set({ isBackingUp: false });

        if (res.success && res.data) {
          set({ lastBackupPath: res.data.filePath });
          addToast('تم تصدير النسخة الاحتياطية بنجاح!', 'success');
          return true;
        } else if (res.error) {
          if (!res.error.includes('إلغاء')) {
            addToast(res.error, 'error');
          }
          return false;
        }
      } catch (err: any) {
        console.error('[RENDERER] Error creating backup:', err);
        set({ isBackingUp: false });
        addToast(err.message || 'حدث خطأ أثناء تصدير النسخة الاحتياطية', 'error');
        return false;
      }
    } else {
      set({ isBackingUp: false });
      addToast('خدمة النسخ الاحتياطي غير متوفرة', 'error');
    }
    return false;
  },

  validateBackup: async (filePath?: string) => {
    const { addToast } = useToastStore.getState();
    set({ isValidating: true, validationResult: null });

    const api = window.electronAPI;
    const validateFn = api?.backup?.validate;

    if (validateFn) {
      try {
        const res = await validateFn(filePath);
        set({ isValidating: false });

        if (res.success && res.data) {
          set({
            validationResult: res.data,
            selectedBackupFile: res.data.info?.filePath || filePath || null,
          });

          if (res.data.isValid) {
            addToast('تمت الفحص بنجاح: ملف النسخة الاحتياطية مجهّز وصالح للاستعادة', 'success');
          } else {
            addToast(res.data.errorMessage || 'ملف غير صالح للاستعادة', 'error');
          }
          return res.data;
        } else if (res.error) {
          addToast(res.error, 'error');
        }
      } catch (err: any) {
        console.error('[RENDERER] Error validating backup:', err);
        set({ isValidating: false });
        addToast(err.message || 'حدث خطأ أثناء فحص النسخة الاحتياطية', 'error');
      }
    } else {
      set({ isValidating: false });
      addToast('خدمة فحص النسخ الاحتياطي غير متوفرة', 'error');
    }
    return null;
  },

  restoreBackup: async (filePath: string) => {
    const { addToast } = useToastStore.getState();
    set({ isRestoring: true });

    const api = window.electronAPI;
    const restoreFn = api?.backup?.restore;

    if (restoreFn) {
      try {
        const res = await restoreFn(filePath);
        set({ isRestoring: false });

        if (res.success && res.data) {
          addToast(res.data.message || 'تمت استعادة قاعدة البيانات بنجاح!', 'success');
          return res.data;
        } else {
          const errMsg = res.error || 'فشلت عملية استعادة قاعدة البيانات';
          addToast(errMsg, 'error');
          return { success: false, error: errMsg };
        }
      } catch (err: any) {
        console.error('[RENDERER] Error restoring backup:', err);
        set({ isRestoring: false });
        const errMsg = err.message || 'حدث خطأ أثناء استعادة قاعدة البيانات';
        addToast(errMsg, 'error');
        return { success: false, error: errMsg };
      }
    } else {
      set({ isRestoring: false });
      addToast('خدمة الاستعادة غير متوفرة', 'error');
    }
    return null;
  },

  resetValidation: () => {
    set({ validationResult: null, selectedBackupFile: null });
  },
}));
