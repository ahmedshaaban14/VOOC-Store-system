import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  Package,
  ShoppingCart,
  ShoppingBag,
  Users,
  HardDrive,
  RefreshCw,
  Lock,
  X,
} from 'lucide-react';
import { useBackupStore } from '../store/useBackupStore';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';

export const BackupRestorePage: React.FC = () => {
  const { currentUser } = useAuthStore();
  const {
    isBackingUp,
    isValidating,
    isRestoring,
    validationResult,
    lastBackupPath,
    selectedBackupFile,
    createBackup,
    validateBackup,
    restoreBackup,
    resetValidation,
  } = useBackupStore();

  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className="p-8 text-center dir-rtl">
        <div className="max-w-md mx-auto p-6 rounded-3xl bg-slate-900 border border-slate-800 text-slate-300 space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">غير مسموح بالوصول</h2>
          <p className="text-xs text-slate-400">
            خدمات النسخ الاحتياطي واستعادة البيانات تقتصر حصرياً على مدير النظام (Admin).
          </p>
        </div>
      </div>
    );
  }

  const handleSelectAndValidate = async () => {
    await validateBackup();
  };

  const handleExecuteRestore = async () => {
    if (!selectedBackupFile) return;
    setShowRestoreConfirmModal(false);
    await restoreBackup(selectedBackupFile);
  };

  return (
    <div className="p-6 space-y-6 dir-rtl font-sans text-slate-100 max-w-6xl mx-auto">
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100 tracking-tight">النسخ الاحتياطي واستعادة البيانات</h1>
            <p className="text-xs text-slate-400 mt-1">
              حماية بياناتك المحلّية وإجراء عمليات النسخ الاحتياطي والتصذير والاستعادة الآمنة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>قاعدة البيانات محفوطة ومؤمنة (Offline)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BACKUP SECTION */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">تصدير نسخة احتياطية (Create Backup)</h2>
                <p className="text-xs text-slate-400">حفظ نسخة احتياطية كاملة من قاعدة البيانات على جهازك</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="flex items-start gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  يتم حفظ النسخة باسم افتراضي منظم يحمل التاريخ والوقت (مثل:
                  <code className="font-mono text-blue-300 mx-1">VOOC_Store_Backup_2026-08-12.db</code>)
                </span>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>تحتوي النسخة الاحتياطية على كافة الاصناف، المنتجات، المبيعات، المشتريات والمستخدمين.</span>
              </div>
            </div>

            {lastBackupPath && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>آخر عملية تصدير ناجحة:</span>
                </div>
                <div className="font-mono text-[11px] text-emerald-200 truncate dir-ltr text-right">
                  {lastBackupPath}
                </div>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            size="lg"
            disabled={isBackingUp}
            onClick={() => createBackup()}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
          >
            <Download className={`w-5 h-5 ${isBackingUp ? 'animate-bounce' : ''}`} />
            <span>{isBackingUp ? 'جاري تصدير النسخة الاحتياطية...' : 'إنشاء نسخة احتياطية جديدة الآن'}</span>
          </Button>
        </div>

        {/* RESTORE SECTION */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">استعادة قاعدة البيانات (Restore Backup)</h2>
                <p className="text-xs text-slate-400">فحص واستعادة قاعدة بيانات من نسخة احتياطية سابقة</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>تأمين حماية البيانات قبل الاستعادة:</span>
              </div>
              <p className="text-amber-200/90 text-[11px] leading-relaxed">
                قبل استبدال البيانات، يقوم النظام تلقائياً بإنشاء نسخة أمان من قاعدة البيانات الحالية برمز (PreRestore)
                لضمان عدم فقدان أي بيانات في حال التراجع.
              </p>
            </div>

            {/* Validation & Info Card */}
            {validationResult && (
              <div
                className={`p-4 rounded-2xl border text-xs space-y-3 ${
                  validationResult.isValid
                    ? 'bg-slate-950 border-emerald-500/40'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold">
                    {validationResult.isValid ? (
                      <>
                        <FileCheck className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">الملف صالح وجاهز للاستعادة</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span className="text-rose-400">ملف غير صالح</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={resetValidation}
                    className="text-slate-400 hover:text-slate-200 text-[11px] underline"
                  >
                    إلغاء الاختيار
                  </button>
                </div>

                {!validationResult.isValid && validationResult.errorMessage && (
                  <p className="text-rose-300 text-xs font-medium">{validationResult.errorMessage}</p>
                )}

                {validationResult.isValid && validationResult.info && (
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">اسم الملف:</span>
                        <span className="font-mono text-slate-200 truncate block">
                          {validationResult.info.fileName}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">حجم الملف:</span>
                        <span className="font-mono text-slate-200">{validationResult.info.formattedFileSize}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-2 text-center text-[10px]">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <Package className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                        <span className="block font-bold text-slate-200">{validationResult.info.productCount}</span>
                        <span className="text-slate-400">منتجات</span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <ShoppingCart className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
                        <span className="block font-bold text-slate-200">{validationResult.info.salesCount}</span>
                        <span className="text-slate-400">مبيعات</span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <ShoppingBag className="w-3.5 h-3.5 text-cyan-400 mx-auto mb-1" />
                        <span className="block font-bold text-slate-200">{validationResult.info.purchaseCount}</span>
                        <span className="text-slate-400">مشتريات</span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <Users className="w-3.5 h-3.5 text-purple-400 mx-auto mb-1" />
                        <span className="block font-bold text-slate-200">{validationResult.info.userCount}</span>
                        <span className="text-slate-400">مستخدمين</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            {!validationResult?.isValid ? (
              <Button
                variant="outline"
                size="lg"
                disabled={isValidating}
                onClick={handleSelectAndValidate}
                className="w-full border-slate-700 hover:bg-slate-800 text-slate-200 font-bold py-3.5 flex items-center justify-center gap-2"
              >
                <HardDrive className={`w-5 h-5 ${isValidating ? 'animate-spin' : ''}`} />
                <span>{isValidating ? 'جاري فحص الملف...' : 'اختيار ملف النسخة الاحتياطية وفحصه'}</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                disabled={isRestoring}
                onClick={() => setShowRestoreConfirmModal(true)}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-3.5 shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-5 h-5 ${isRestoring ? 'animate-spin' : ''}`} />
                <span>{isRestoring ? 'جاري استعادة قاعدة البيانات...' : 'تأكيد واستعادة قاعدة البيانات الآن'}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Pre-Restore Safety Warning Modal */}
      {showRestoreConfirmModal && selectedBackupFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-amber-500/40 shadow-2xl p-6 space-y-5 relative text-right animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>تأكيد استعادة قاعدة البيانات</span>
              </div>
              <button
                onClick={() => setShowRestoreConfirmModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p className="font-bold text-slate-100 text-sm">هل أنت متأكد من تنفيذ عملية الاستعادة الآن؟</p>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                <div className="font-bold text-amber-300">تنبيه حماية البيانات:</div>
                <p>
                  سيتم تلقائياً إنشاء نسخة أمان من البيانات الحالية باسم
                  <code className="font-mono text-white mx-1">VOOC_Store_PreRestore_...db</code> قبل استبدال البيانات.
                </p>
              </div>

              <p className="text-slate-400">
                الملف المحدد للاستعادة: <span className="font-mono text-blue-300">{selectedBackupFile}</span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setShowRestoreConfirmModal(false)}>
                إلغاء
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteRestore}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
              >
                موافق، ابدأ الاستعادة الآن
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
