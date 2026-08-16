import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  MapPin,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useCustomersStore } from '../store/useCustomersStore';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { formatCurrency } from '../utils/formatters';

export const CustomersPage: React.FC = () => {
  const {
    customers,
    searchQuery,
    isLoading,
    isModalOpen,
    editingCustomer,
    deletingCustomerId,
    setSearchQuery,
    openCreateModal,
    openEditModal,
    closeModal,
    setDeletingCustomerId,
    loadCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  } = useCustomersStore();

  const { currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'ADMIN';

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (editingCustomer) {
      setName(editingCustomer.name);
      setPhone(editingCustomer.phone || '');
      setAddress(editingCustomer.address || '');
      setNotes(editingCustomer.notes || '');
    } else {
      setName('');
      setPhone('');
      setAddress('');
      setNotes('');
    }
    setFormError(null);
  }, [editingCustomer, isModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('يرجى إدخال اسم العميل');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, payload);
    } else {
      await createCustomer(payload);
    }

    setIsSubmitting(false);
  };

  const deletingCustomer = customers.find((c) => c.id === deletingCustomerId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            <span>إدارة العملاء</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            سجل بيانات العملاء ومتابعة إجمالي مشترياتهم وفواتيرهم السابقة
          </p>
        </div>

        <Button onClick={openCreateModal} className="flex items-center gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>إضافة عميل جديد</span>
        </Button>
      </div>

      {/* Search Bar & Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Search Input (8 Cols) */}
        <div className="md:col-span-8 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث باسم العميل أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Customer Count Stat (4 Cols) */}
        <div className="md:col-span-4 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex items-center justify-between px-4">
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block">إجمالي العملاء</span>
            <span className="text-sm font-bold font-mono text-blue-400 mt-0.5 block">
              {customers.length} عميل
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Users className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Customers List Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span>قائمة العملاء المسجلين ({customers.length})</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">اسم العميل</th>
                <th className="px-4 py-3">رقم الهاتف</th>
                <th className="px-4 py-3">العنوان</th>
                <th className="px-4 py-3 text-center">عدد الفواتير</th>
                <th className="px-4 py-3">إجمالي المسحوبات</th>
                <th className="px-4 py-3">تاريخ التسجيل</th>
                <th className="px-4 py-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>جاري تحميل العملاء...</span>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 text-xs">
                    {searchQuery ? 'لا توجد نتائج مطابقة لبحثك' : 'لا يوجد عملاء مسجلين حالياً. اضغط "إضافة عميل جديد" للبدء.'}
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-100 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-950/80 border border-blue-800/50 flex items-center justify-center text-blue-400 shrink-0 font-bold text-xs">
                        {c.name.slice(0, 1)}
                      </div>
                      <div>
                        <span>{c.name}</span>
                        {c.notes && (
                          <span className="block text-[10px] text-slate-500 font-normal truncate max-w-xs">
                            {c.notes}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      {c.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{c.phone}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {c.address ? (
                        <span className="flex items-center gap-1 truncate max-w-xs">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{c.address}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-blue-400">
                      {c.salesCount || 0}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                      {formatCurrency(c.totalPurchased || 0)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 rounded-lg bg-slate-800/80 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setDeletingCustomerId(c.id)}
                            className="p-1.5 rounded-lg bg-slate-800/80 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">اسم العميل *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="أدخل اسم العميل بالكامل..."
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">رقم الهاتف</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="مثال: 01012345678"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">العنوان</label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="المدينة / المنطقة / الشارع..."
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">ملاحظات إضافية</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="أي ملاحظات خاصة بالعميل..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="ghost" type="button" onClick={closeModal} disabled={isSubmitting}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : editingCustomer ? 'حفظ التعديلات' : 'إضافة العميل'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Customer Confirmation Modal */}
      {deletingCustomerId && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingCustomerId(null)}
          title="تأكيد حذف العميل"
        >
          <div className="space-y-4 font-sans text-xs">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-300">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <p>
                هل أنت متأكد من رغبتك في حذف العميل{' '}
                <span className="font-bold text-slate-100">[{deletingCustomer?.name}]</span>؟
                <span className="block text-[11px] text-slate-400 mt-1">
                  ملاحظة: لن يسمح النظام بالحذف إذا كان للعميل فواتير مبيعات مسجلة لحماية السجلات التاريخية.
                </span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setDeletingCustomerId(null)}>
                إلغاء
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteCustomer(deletingCustomerId)}
              >
                تأكيد الحذف
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
