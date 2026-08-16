import React, { useEffect, useState, useTransition } from 'react';
import {
  Plus,
  Search,
  Grid,
  List,
  Edit2,
  Trash2,
  Barcode,
  Package,
  AlertCircle,
  Tag,
  Upload,
  X,
  RefreshCw,
  FolderPlus,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useProductsStore } from '../store/useProductsStore';
import { useCategoriesStore } from '../store/useCategoriesStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { CategoryModal } from '../components/category/CategoryModal';
import { ProductImage } from '../components/ui/ProductImage';
import { formatCurrency } from '../utils/formatters';

// Zod Product Schema (Arabic messages & strict non-negative rules)
const productSchema = z.object({
  barcode: z.string().min(1, 'الباركود مطلوب ومهم للتعرف على المنتج'),
  name: z.string().min(2, 'اسم المنتج مطلوب (حرفين على الأقل)'),
  categoryId: z.coerce.number().nullable().optional(),
  purchasePrice: z.coerce.number().min(0, 'سعر الشراء يجب أن يكون 0 أو أكثر'),
  salePrice: z.coerce.number().min(0, 'سعر البيع يجب أن يكون 0 أو أكثر'),
  currentStock: z.coerce.number().min(0, 'كمية المخزون لا يمكن أن تكون بالسالب'),
  minStockLevel: z.coerce.number().min(0, 'الحد الأدنى للمخزون يجب أن يكون 0 أو أكثر'),
});

type ProductFormData = z.infer<typeof productSchema>;

export const ProductsPage: React.FC = () => {
  const {
    products,
    categories,
    searchQuery,
    selectedCategory,
    viewMode,
    isAddModalOpen,
    editingProduct,
    isLoading,
    setSearchQuery,
    setSelectedCategory,
    setViewMode,
    setIsAddModalOpen,
    setEditingProduct,
    loadProducts,
    addProduct,
    updateProduct,
    deleteProduct,
  } = useProductsStore();

  const { setIsCategoryModalOpen, loadCategories } = useCategoriesStore();

  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingImageBuffer, setPendingImageBuffer] = useState<{ buffer: ArrayBuffer; name: string } | null>(null);
  const [, startTransition] = useTransition();

  // Load real data from DB on mount
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  // Sync form when editing product changes
  useEffect(() => {
    if (editingProduct) {
      reset({
        barcode: editingProduct.barcode,
        name: editingProduct.name,
        categoryId: editingProduct.categoryId || null,
        purchasePrice: editingProduct.purchasePrice,
        salePrice: editingProduct.salePrice,
        currentStock: editingProduct.currentStock,
        minStockLevel: editingProduct.minStockLevel,
      });
      setImagePreview(editingProduct.image || null);
    } else {
      reset({
        barcode: '',
        name: '',
        categoryId: null,
        purchasePrice: 0,
        salePrice: 0,
        currentStock: 0,
        minStockLevel: 5,
      });
      setImagePreview(null);
    }
    setPendingImageBuffer(null);
  }, [editingProduct, reset, isAddModalOpen]);

  // Handle local image file picker
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        if (buffer) {
          setPendingImageBuffer({ buffer, name: file.name });
          setImagePreview(URL.createObjectURL(file));
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Form Submission
  const onSubmit = async (data: ProductFormData) => {
    let finalImagePath = imagePreview;

    // Save image to local offline directory via IPC if user selected a new file
    if (pendingImageBuffer && window.electronAPI) {
      const imgRes = await window.electronAPI.saveProductImage(
        pendingImageBuffer.buffer,
        pendingImageBuffer.name
      );
      if (imgRes.success && imgRes.data) {
        finalImagePath = imgRes.data;
      }
    }

    if (editingProduct) {
      const ok = await updateProduct(editingProduct.id, {
        ...data,
        categoryId: data.categoryId ? Number(data.categoryId) : null,
        image: finalImagePath,
      });
      if (ok) {
        setIsAddModalOpen(false);
        setEditingProduct(null);
      }
    } else {
      const ok = await addProduct({
        ...data,
        categoryId: data.categoryId ? Number(data.categoryId) : null,
        image: finalImagePath,
      });
      if (ok) {
        setIsAddModalOpen(false);
      }
    }
  };

  // Confirm delete handler
  const handleConfirmDelete = async () => {
    if (deletingProductId !== null) {
      await deleteProduct(deletingProductId);
      setDeletingProductId(null);
    }
  };

  // Filtered Products List
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);
    const matchesCategory =
      selectedCategory === 'ALL' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-500" />
            <span>إدارة المنتجات والملابس</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            إضافة وتعديل أصناف الملابس ومتابعة أسعار الشراء والبيع والكميات بالمخزن
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCategoryModalOpen(true)}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <FolderPlus className="w-4 h-4 text-amber-400" />
            <span>إدارة الأقسام</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingProduct(null);
              setIsAddModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span>إضافة منتج جديد</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Action Controls */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث باسم المنتج أو الباركود..."
              value={searchQuery}
              onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
              className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Tag className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(
                  e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                )
              }
              className="w-full sm:w-48 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">جميع الأقسام ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Switcher & Reload */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadProducts()}
            title="تحديث البيانات"
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="عرض كروت"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="عرض جدول"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800/80">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-300">جاري تحميل المنتجات من قاعدة البيانات...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/80 text-center p-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-500 mb-4">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-200">لا توجد منتجات مسجلة</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
            لم يتم العثور على أي منتج يطابق خيارات البحث الحالية. يمكنك إضافة منتج جديد بسهولة.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingProduct(null);
              setIsAddModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span>إضافة منتج الآن</span>
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p) => {
            const isOut = p.currentStock === 0;
            const isLow = p.currentStock <= p.minStockLevel && !isOut;

            return (
              <div
                key={p.id}
                className="group p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Image & Stock Badge */}
                  <div className="relative h-40 w-full rounded-xl bg-slate-950 overflow-hidden mb-3 border border-slate-800/60">
                    <ProductImage
                      src={p.image}
                      alt={p.name}
                      fallbackIconSize={36}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    <div className="absolute top-2.5 right-2.5">
                      {isOut ? (
                        <Badge variant="danger">نفذت الكمية</Badge>
                      ) : isLow ? (
                        <Badge variant="warning">مخزون منخفض</Badge>
                      ) : (
                        <Badge variant="success">متوفر</Badge>
                      )}
                    </div>
                  </div>

                  {/* Name & Barcode */}
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-1">
                    {p.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1 font-mono">
                    <Barcode className="w-3.5 h-3.5 text-slate-500" />
                    <span>{p.barcode}</span>
                  </div>

                  {/* Pricing & Stock Details */}
                  <div className="mt-4 pt-3 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">سعر البيع</span>
                      <span className="font-bold text-emerald-400">{formatCurrency(p.salePrice)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">سعر الشراء</span>
                      <span className="font-semibold text-slate-300">{formatCurrency(p.purchasePrice)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <div className="text-xs">
                    <span className="text-slate-400">الكمية بالمخزن: </span>
                    <span className={`font-mono font-bold ${isOut ? 'text-rose-400' : 'text-slate-200'}`}>
                      {p.currentStock} قطعة
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingProduct(p)}
                      title="تعديل المنتج"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingProductId(p.id)}
                      title="حذف المنتج"
                      className="text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">المنتج</th>
                <th className="px-4 py-3">الباركود</th>
                <th className="px-4 py-3">القسم</th>
                <th className="px-4 py-3">سعر الشراء</th>
                <th className="px-4 py-3">سعر البيع</th>
                <th className="px-4 py-3">المخزون الحالي</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredProducts.map((p) => {
                const isOut = p.currentStock === 0;
                const isLow = p.currentStock <= p.minStockLevel && !isOut;

                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-bold flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center text-slate-600">
                        <ProductImage
                          src={p.image}
                          alt={p.name}
                          fallbackIconSize={16}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span>{p.name}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">{p.barcode}</td>
                    <td className="px-4 py-3 text-slate-300">{p.categoryName || 'غير محدد'}</td>
                    <td className="px-4 py-3 text-slate-400">{formatCurrency(p.purchasePrice)}</td>
                    <td className="px-4 py-3 font-bold text-emerald-400">{formatCurrency(p.salePrice)}</td>
                    <td className="px-4 py-3 font-mono font-bold">{p.currentStock} قطعة</td>
                    <td className="px-4 py-3">
                      {isOut ? (
                        <Badge variant="danger">نفذت</Badge>
                      ) : isLow ? (
                        <Badge variant="warning">منخفض</Badge>
                      ) : (
                        <Badge variant="success">متوفر</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingProduct(p)}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingProductId(p.id)}
                          className="text-rose-400 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProduct(null);
        }}
        title={editingProduct ? 'تعديل بيانات المنتج' : 'إضافة صنف ملابس جديد'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-right">
          {/* Image Picker */}
          <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="relative w-20 h-20 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center text-slate-600">
              <ProductImage
                src={imagePreview}
                alt="معاينة الصورة"
                fallbackIconSize={32}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">صورة المنتج</label>
              <p className="text-[10px] text-slate-400">يتم حفظ الصور محلياً في جهاز الكمبيوتر بدون إنترنت</p>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold cursor-pointer transition-colors border border-blue-500/30">
                <Upload className="w-3.5 h-3.5" />
                <span>اختر صورة</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="الباركود (Barcode)"
              placeholder="امسح الباركود أو أدخله يدوياً"
              icon={<Barcode className="w-4 h-4 text-slate-400" />}
              error={errors.barcode?.message}
              {...register('barcode')}
            />

            <Input
              label="اسم المنتج (النوع/الوصف)"
              placeholder="مثال: قميص قطن كاجوال"
              error={errors.name?.message}
              {...register('name')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category Select with inline add modal trigger */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">القسم / الفئة</label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>قسم جديد</span>
                </button>
              </div>
              <select
                {...register('categoryId')}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="">بدون قسم (عام)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="الحد الأدنى للتنبيه بالمخزون"
              type="number"
              placeholder="5"
              error={errors.minStockLevel?.message}
              {...register('minStockLevel')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="سعر الشراء (التكلفة)"
              type="number"
              step="0.01"
              placeholder="0.00"
              error={errors.purchasePrice?.message}
              {...register('purchasePrice')}
            />

            <Input
              label="سعر البيع للجمهور"
              type="number"
              step="0.01"
              placeholder="0.00"
              error={errors.salePrice?.message}
              {...register('salePrice')}
            />

            <Input
              label="الكمية الافتتاحية للمخزون"
              type="number"
              placeholder="0"
              disabled={editingProduct !== null} // Only editable through inventory adjustment
              error={errors.currentStock?.message}
              {...register('currentStock')}
            />
          </div>

          {editingProduct && (
            <p className="text-[11px] text-amber-400 bg-amber-950/30 p-2.5 rounded-lg border border-amber-800/40 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>تنويه: يتم تعديل كميات المخزون للمنتجات الموجودة من خلال قسم حركة وسجل المخزون فقط.</span>
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingProduct(null);
              }}
            >
              إلغاء
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting
                ? 'جاري الحفظ...'
                : editingProduct
                ? 'حفظ التغييرات'
                : 'حفظ المنتج الجديد'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deletingProductId !== null}
        onClose={() => setDeletingProductId(null)}
        onConfirm={handleConfirmDelete}
        title="تأكيد حذف المنتج"
        message="هل أنت أصلح متأكد من رغبتك في حذف هذا المنتج نهائياً من قاعدة البيانات والملفات المحلّية؟"
      />

      {/* Category Management Modal */}
      <CategoryModal />
    </div>
  );
};
