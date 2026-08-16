import React, { useEffect, useState } from 'react';
import {
  Printer,
  RefreshCw,
  Sliders,
  AlertTriangle,
  Store,
  Phone,
  MapPin,
  FileText,
  Eye,
  Zap,
  Save,
} from 'lucide-react';
import { usePrintStore } from '../store/usePrintStore';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PrintSettings } from '../shared/types';

export const PrintSettingsPage: React.FC = () => {
  const {
    printers,
    defaultPrinter,
    settings,
    isLoadingPrinters,
    isSavingSettings,
    isTestPrinting,
    loadPrinters,
    loadSettings,
    saveSettings,
    testPrint,
  } = usePrintStore();

  const { currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [formSettings, setFormSettings] = useState<PrintSettings>(settings);

  useEffect(() => {
    loadPrinters();
    loadSettings();
  }, [loadPrinters, loadSettings]);

  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings(formSettings);
  };

  const handleTestPrint = async () => {
    await testPrint(formSettings.printerName);
  };

  if (!isAdmin) {
    return (
      <div className="p-12 text-center text-slate-400">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-200">غير مصرح بالوصول</h2>
        <p className="text-xs text-slate-400 mt-1">
          إعدادات الطابعات والطباعة مخصصة فقط لمدير النظام (Admin).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Printer className="w-6 h-6 text-blue-500" />
            <span>إعدادات طباعة الفواتير (Thermal 80mm)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            إدارة الطابعات الحرارية الموصولة بالنظام، وضبط التخصيص التلقائي للفواتير ومعاينة الطباعة
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPrinters()}
            disabled={isLoadingPrinters}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingPrinters ? 'animate-spin' : ''}`} />
            <span>تحديث الطابعات</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleTestPrint}
            disabled={isTestPrinting}
            className="bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30"
          >
            <Zap className={`w-4 h-4 text-amber-400 ${isTestPrinting ? 'animate-pulse' : ''}`} />
            <span>{isTestPrinting ? 'جاري الطباعة التجريبية...' : 'اختبار الطباعة'}</span>
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Printer Selection Card */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-blue-400" />
            <span>اختيار الطابعة الافتراضية للفواتير</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                الطابعة المحددة للطباعة
              </label>
              <select
                value={formSettings.printerName || ''}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, printerName: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="">(الطابعة الافتراضية للنظام - {defaultPrinter?.name || 'غير محددة'})</option>
                {printers.map((p, idx) => (
                  <option key={idx} value={p.name}>
                    {p.displayName || p.name} {p.isDefault ? ' (الافتراضية)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                {printers.length > 0
                  ? `تم العثور على (${printers.length}) طابعة بنظام Windows.`
                  : 'لم يتم العثور على أي طابعات مثبتة بالجهاز.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                مقاس ونوع ورق الفاتورة
              </label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                <Badge variant="info">80mm Thermal</Badge>
                <span className="text-slate-400 text-[11px]">
                  طابعات الإيصالات الحرارية القياسية (Receipt Printers)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Automation & Behavior Toggles */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Zap className="w-4 h-4 text-blue-400" />
            <span>سلوك وتلقائية الطباعة</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Auto Print Toggle */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-xs text-slate-200">
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>الطباعة التلقائية بعد إتمام البيع</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  إرسال أمر الطباعة فوراً وبشكل تلقائي بمجرد نجاح حفظ فاتورة البيع في نقطة البيع (POS).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={formSettings.autoPrint}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, autoPrint: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Show Preview Toggle */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-xs text-slate-200">
                  <Eye className="w-4 h-4 text-blue-400" />
                  <span>عرض نافذة المعاينة قبل الطباعة</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  إظهار نافذة منبثقة لمعاينة شكل الإيصال الحراري ومراجعته قبل الإرسال المباشر للطابعة.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={formSettings.showPreviewBeforePrint}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      showPreviewBeforePrint: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Store Header & Footer Receipt Customization */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Store className="w-4 h-4 text-blue-400" />
            <span>بيانات المحل والترويسة على الفاتورة</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-slate-400" />
                <span>اسم المحل / المتجر</span>
              </label>
              <input
                type="text"
                value={formSettings.storeName || ''}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, storeName: e.target.value })
                }
                placeholder="VOOC Store"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>رقم هاتف المحل</span>
              </label>
              <input
                type="text"
                value={formSettings.storePhone || ''}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, storePhone: e.target.value })
                }
                placeholder="01555600508"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>عنوان المحل / الفرع</span>
              </label>
              <input
                type="text"
                value={formSettings.storeAddress || ''}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, storeAddress: e.target.value })
                }
                placeholder="العنوان (اختياري)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>ملاحظات وتذييل الفاتورة (سياسة الاستبدال والاسترجاع)</span>
            </label>
            <textarea
              rows={3}
              value={formSettings.footerNote || ''}
              onChange={(e) =>
                setFormSettings({ ...formSettings, footerNote: e.target.value })
              }
              placeholder="شكراً لزيارتكم... البضاعة المباعة ترد وتستبدل خلال 14 يوماً بالفاتورة"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Save Controls */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSavingSettings}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
          >
            <Save className="w-4 h-4" />
            <span>{isSavingSettings ? 'جاري الحفظ...' : 'حفظ إعدادات الطباعة'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
