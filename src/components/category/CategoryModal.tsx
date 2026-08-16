import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Tag, Layers } from 'lucide-react';
import { useCategoriesStore } from '../../store/useCategoriesStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Category } from '../../shared/types';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export const CategoryModal: React.FC = () => {
  const {
    categories,
    isCategoryModalOpen,
    setIsCategoryModalOpen,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useCategoriesStore();

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
  };

  const handleResetForm = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingCategory) {
      const ok = await updateCategory(editingCategory.id, name, description);
      if (ok) handleResetForm();
    } else {
      const ok = await addCategory(name, description);
      if (ok) handleResetForm();
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingId !== null) {
      await deleteCategory(deletingId);
      setDeletingId(null);
    }
  };

  return (
    <>
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          handleResetForm();
        }}
        title="إدارة أقسام وفئات الملابس"
        maxWidth="xl"
      >
        <div className="space-y-6">
          {/* Add / Edit Form */}
          <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-400" />
              <span>{editingCategory ? 'تعديل بيانات القسم' : 'إضافة قسم جديد'}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="اسم القسم (مثال: قمصان رجالي)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                placeholder="وصف مختصر (اختياري)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              {editingCategory && (
                <Button type="button" variant="outline" size="sm" onClick={handleResetForm}>
                  إلغاء التعديل
                </Button>
              )}
              <Button type="submit" variant="primary" size="sm">
                <Plus className="w-3.5 h-3.5" />
                <span>{editingCategory ? 'حفظ التعديلات' : 'إضافة القسم'}</span>
              </Button>
            </div>
          </form>

          {/* Categories List Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400">الأقسام الحالية ({categories.length})</h4>
            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">اسم القسم</th>
                    <th className="px-4 py-2.5">الوصف</th>
                    <th className="px-4 py-2.5">المنتجات المرتبطة</th>
                    <th className="px-4 py-2.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-900/40">
                      <td className="px-4 py-2.5 font-bold flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                        <span>{cat.name}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">{cat.description || '-'}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px]">
                          {cat.productCount || 0} منتجات
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(cat)}
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingId(cat.id)}
                            title="حذف"
                            className="text-rose-400 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      {/* Category Delete Confirmation */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="تأكيد حذف القسم"
        message="هل أنت أصلح متأكد من رغبتك في حذف هذا القسم؟ لن يتم الحذف في حال وجود منتجات مرتبطة به لحماية بيانات المخزون."
      />
    </>
  );
};
