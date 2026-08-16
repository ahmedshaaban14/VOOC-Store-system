import React, { useEffect, useState, useTransition } from 'react';
import { Truck, Search, Plus, Edit2, Trash2, Phone, MapPin, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useSuppliersStore } from '../store/useSuppliersStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

// Supplier Zod Form Schema
const supplierSchema = z.object({
  name: z.string().min(2, 'اسم المورد مطلوب (حرفين على الأقل)'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

export const SuppliersPage: React.FC = () => {
  const {
    suppliers,
    searchQuery,
    isLoading,
    isModalOpen,
    editingSupplier,
    setSearchQuery,
    setIsModalOpen,
    setEditingSupplier,
    loadSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
  } = useSuppliersStore();

  const [deletingSupplierId, setDeletingSupplierId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
  });

  useEffect(() => {
    if (editingSupplier) {
      reset({
        name: editingSupplier.name,
        phone: editingSupplier.phone || '',
        address: editingSupplier.address || '',
      });
    } else {
      reset({ name: '', phone: '', address: '' });
    }
  }, [editingSupplier, reset, isModalOpen]);

  const onSubmit = async (data: SupplierFormData) => {
    if (editingSupplier) {
      const ok = await updateSupplier(editingSupplier.id, data.name, data.phone, data.address);
      if (ok) {
        setIsModalOpen(false);
        setEditingSupplier(null);
      }
    } else {
      const ok = await addSupplier(data.name, data.phone, data.address);
      if (ok) {
        setIsModalOpen(false);
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingSupplierId !== null) {
      await deleteSupplier(deletingSupplierId);
      setDeletingSupplierId(null);
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.phone && s.phone.includes(searchQuery))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-500" />
            <span>إدارة الموردين وشركات الملابس</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            دليل مصانع وتجار الجملة والشركة الموردة ومتابعة الفواتير المرتبطة بكل مورد
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadSuppliers()}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingSupplier(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مورد جديد</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث باسم المورد أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
            className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Suppliers Cards Grid */}
      {filteredSuppliers.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
          <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-xs">لا يوجد موردون مسجلون حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((s) => (
            <div
              key={s.id}
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">{s.name}</h3>
                      <span className="text-[10px] text-slate-400">مورد معتمد</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingSupplier(s)}
                      title="تعديل"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingSupplierId(s.id)}
                      title="حذف"
                      className="text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  {s.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-mono text-slate-300">{s.phone}</span>
                    </div>
                  )}

                  {s.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="text-slate-400">{s.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-400">فواتير الشراء:</span>
                <span className="font-mono font-bold text-blue-400">
                  {s.invoiceCount || 0} فواتير
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSupplier(null);
        }}
        title={editingSupplier ? 'تعديل بيانات المورد' : 'تسجيل مورد جديد'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-right">
          <Input
            label="اسم المورد / اسم الشركة (مطلوب)"
            placeholder="مثال: مصنع النيل للملابس الجاهزة"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="رقم الهاتف / الموبايل (اختياري)"
            placeholder="01012345678"
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            label="العنوان / المدينة (اختياري)"
            placeholder="القاهرة - العتبة"
            error={errors.address?.message}
            {...register('address')}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsModalOpen(false);
                setEditingSupplier(null);
              }}
            >
              إلغاء
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting
                ? 'جاري الحفظ...'
                : editingSupplier
                ? 'حفظ التعديلات'
                : 'حفظ المورد الجديد'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Supplier Delete Safety Confirmation */}
      <ConfirmDialog
        isOpen={deletingSupplierId !== null}
        onClose={() => setDeletingSupplierId(null)}
        onConfirm={handleConfirmDelete}
        title="تأكيد حذف المورد"
        message="هل أنت أصلح متأكد من رغبتك في حذف هذا المورد؟ لن يتم الحذف في حال وجود فواتير شراء مرتبطة بحسابه."
      />
    </div>
  );
};
