import { create } from 'zustand';
import { AuditLog, AuditLogFilterInput } from '../shared/types';
import { useToastStore } from './useToastStore';

interface AuditLogState {
  logs: AuditLog[];
  selectedLog: AuditLog | null;
  isLoading: boolean;
  error: string | null;
  filters: AuditLogFilterInput;

  setFilters: (filters: Partial<AuditLogFilterInput>) => void;
  resetFilters: () => void;
  fetchLogs: () => Promise<void>;
  fetchLogDetails: (id: number) => Promise<void>;
  setSelectedLog: (log: AuditLog | null) => void;
}

const initialFilters: AuditLogFilterInput = {
  userId: undefined,
  action: '',
  search: '',
  startDate: '',
  endDate: '',
};

export const useAuditLogStore = create<AuditLogState>((set, get) => ({
  logs: [],
  selectedLog: null,
  isLoading: false,
  error: null,
  filters: initialFilters,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    get().fetchLogs();
  },

  resetFilters: () => {
    set({ filters: initialFilters });
    get().fetchLogs();
  },

  fetchLogs: async () => {
    const { addToast } = useToastStore.getState();
    set({ isLoading: true, error: null });

    const api = window.electronAPI;
    const getAuditLogsFn = api?.auditLogs?.get;

    if (getAuditLogsFn) {
      try {
        const res = await getAuditLogsFn(get().filters);
        set({ isLoading: false });

        if (res.success && res.data) {
          set({ logs: res.data });
        } else {
          const err = res.error || 'تعذر جلب سجلات العمليات';
          set({ error: err });
          addToast(err, 'error');
        }
      } catch (err: any) {
        console.error('[RENDERER] Error fetching audit logs:', err);
        const errMsg = err.message || 'حدث خطأ في الاتصال أثناء جلب السجلات';
        set({ isLoading: false, error: errMsg });
        addToast(errMsg, 'error');
      }
    } else {
      set({ isLoading: false, error: 'خدمة سجل العمليات غير متوفرة في بيئة المترجم' });
    }
  },

  fetchLogDetails: async (id: number) => {
    const { addToast } = useToastStore.getState();
    const api = window.electronAPI;
    const getDetailsFn = api?.auditLogs?.getDetails;

    if (getDetailsFn) {
      try {
        const res = await getDetailsFn(id);
        if (res.success && res.data) {
          set({ selectedLog: res.data });
        } else if (res.error) {
          addToast(res.error, 'error');
        }
      } catch (err: any) {
        console.error('[RENDERER] Error fetching log detail:', err);
        addToast('تعذر جلب تفاصيل السجل', 'error');
      }
    }
  },

  setSelectedLog: (selectedLog) => set({ selectedLog }),
}));
