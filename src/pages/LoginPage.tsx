import React, { useState } from 'react';
import { Shirt, Lock, User as UserIcon, Eye, EyeOff, LogIn, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { Button } from '../components/ui/Button';

export const LoginPage: React.FC = () => {
  const { login } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const u = username.trim();
    if (!u || !password) {
      setErrorMessage('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setIsSubmitting(true);
    const res = await login(u, password);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'اسم المستخدم أو كلمة المرور غير صحيحة.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 dir-rtl font-sans selection:bg-blue-500 selection:text-white relative">
      {/* Theme Toggle in Login Screen */}
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
          title={theme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
          className="p-2.5 rounded-2xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-amber-400 transition-colors shadow-lg"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-blue-500" />
          )}
        </button>
      </div>

      {/* Background Subtle Gradient Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header Logo Card */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 mx-auto flex items-center justify-center text-white shadow-xl shadow-blue-600/20 border border-white/10">
            <Shirt className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">VOOC Store POS</h1>
            <p className="text-xs text-slate-400 mt-1">نظام إدارة ومبيعات متجر الملابس (Offline)</p>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="text-right">
            <h2 className="text-base font-bold text-slate-200">تسجيل الدخول للنظام</h2>
            <p className="text-xs text-slate-400 mt-0.5">ادخل اسم المستخدم وكلمة المرور الخاصة بك</p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-right font-medium animate-shake">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-right">
            {/* Username Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">اسم المستخدم</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">كلمة المرور</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting || !username.trim() || !password}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 mt-2"
            >
              <LogIn className="w-5 h-5" />
              <span>{isSubmitting ? 'جاري التحقق...' : 'تسجيل الدخول'}</span>
            </Button>
          </form>

          <div className="pt-2 text-center border-t border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">
              الحساب الافتراضي للمرة الأولى: <span className="font-mono text-blue-400 font-bold">admin</span> /{' '}
              <span className="font-mono text-blue-400 font-bold">admin123</span>
            </span>
          </div>
        </div>

        {/* Subtle Developer Attribution */}
        <div className="text-center pt-1 space-y-0.5 select-none">
          <p className="text-[11px] text-slate-500 font-medium tracking-tight">Made by: Eng Ahmed Shaaban</p>
          <p className="text-[10px] text-slate-600 font-mono">01112112568</p>
        </div>
      </div>
    </div>
  );
};
