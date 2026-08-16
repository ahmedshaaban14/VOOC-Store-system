import { create } from 'zustand';
import { User, ServiceResult } from '../shared/types';
import { useToastStore } from './useToastStore';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isChangePasswordModalOpen: boolean;

  setIsChangePasswordModalOpen: (open: boolean) => void;

  loadCurrentUser: () => Promise<void>;
  login: (username: string, password: string) => Promise<ServiceResult<User>>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  isLoading: true,
  isChangePasswordModalOpen: false,

  setIsChangePasswordModalOpen: (isChangePasswordModalOpen) => set({ isChangePasswordModalOpen }),

  loadCurrentUser: async () => {
    set({ isLoading: true });
    const api = window.electronAPI || (window as any).electronAPI;
    const getCurrentUserFn = api?.auth?.getCurrentUser || api?.getCurrentUser;

    if (getCurrentUserFn) {
      try {
        const user = await getCurrentUserFn();
        if (user) {
          set({ currentUser: user, isAuthenticated: true });
        } else {
          set({ currentUser: null, isAuthenticated: false });
        }
      } catch (err) {
        console.error('[RENDERER] Error loading active session user:', err);
        set({ currentUser: null, isAuthenticated: false });
      }
    }
    set({ isLoading: false });
  },

  login: async (username, password) => {
    const { addToast } = useToastStore.getState();
    set({ isLoading: true });

    const api = window.electronAPI || (window as any).electronAPI;
    const loginFn = api?.auth?.login || api?.login;

    if (loginFn) {
      console.log('[LOGIN] Calling main process for:', username);
      const res = await loginFn(username, password);
      set({ isLoading: false });

      if (res && res.success && res.data) {
        set({ currentUser: res.data, isAuthenticated: true });
        addToast(`أهلاً بك مجدداً يا ${res.data.displayName}!`, 'success');
        return res;
      } else {
        const errorMsg = res?.error || 'اسم المستخدم أو كلمة المرور غير صحيحة.';
        return { success: false, error: errorMsg };
      }
    }

    set({ isLoading: false });
    const err = 'تعذر الاتصال بالبرنامج الرئيسي';
    return { success: false, error: err };
  },

  logout: async () => {
    const { addToast } = useToastStore.getState();
    const api = window.electronAPI || (window as any).electronAPI;
    const logoutFn = api?.auth?.logout || api?.logout;

    if (logoutFn) {
      await logoutFn();
    }
    set({ currentUser: null, isAuthenticated: false });
    addToast('تم تسجيل الخروج بنجاح.', 'info');
  },

  changePassword: async (currentPassword, newPassword) => {
    const { addToast } = useToastStore.getState();
    const api = window.electronAPI || (window as any).electronAPI;
    const changePasswordFn = api?.auth?.changePassword || api?.changePassword;

    if (changePasswordFn) {
      const res = await changePasswordFn(currentPassword, newPassword);
      if (res && res.success) {
        addToast('تم تغيير كلمة المرور بنجاح.', 'success');
        set({ isChangePasswordModalOpen: false });
        return true;
      } else {
        addToast(res?.error || 'فشل تغيير كلمة المرور', 'error');
        return false;
      }
    }
    return false;
  },
}));
