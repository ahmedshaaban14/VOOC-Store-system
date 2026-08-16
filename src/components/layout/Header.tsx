import React, { useState, useEffect } from 'react';
import { Menu, Search, WifiOff, User, Clock, Key, LogOut, ChevronDown, Sun, Moon } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';

export const Header: React.FC = () => {
  const { toggleSidebar } = useAppStore();
  const { currentUser, logout, setIsChangePasswordModalOpen } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [time, setTime] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="h-16 bg-slate-900/90 border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
        {/* Left side actions (Sidebar toggle & Search shortcut) */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="تبديل القائمة">
            <Menu className="w-5 h-5 text-slate-300" />
          </Button>

          <div className="relative hidden md:flex items-center w-64">
            <Search className="w-4 h-4 absolute right-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="بحث سريع (F3)..."
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg py-1.5 pr-9 pl-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Right side indicators (Offline badge, Time clock, Theme Toggle, Profile) */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
            title={theme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
            className="p-2 rounded-xl border border-slate-800 bg-slate-800/60 hover:bg-slate-700/60 transition-colors flex items-center justify-center text-slate-300 hover:text-amber-400"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-blue-500" />
            )}
          </button>

          {/* Offline Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/50 text-emerald-400 text-xs font-medium">
            <WifiOff className="w-3.5 h-3.5" />
            <span>يعمل بدون إنترنت</span>
          </div>

          {/* Realtime Clock */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/60 text-slate-300 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{time}</span>
          </div>

          {/* User Profile Dropdown Menu */}
          <div className="relative border-r border-slate-800 pr-3">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-800/60 transition-colors text-right"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
                <User className="w-4 h-4" />
              </div>

              <div className="hidden md:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-200 leading-tight">
                    {currentUser?.displayName || 'المستخدم'}
                  </span>
                  <Badge variant={currentUser?.role === 'ADMIN' ? 'danger' : 'info'}>
                    {currentUser?.role === 'ADMIN' ? 'مدير' : 'بائع'}
                  </Badge>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">@{currentUser?.username}</span>
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu Popup */}
            {isDropdownOpen && (
              <div className="absolute left-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1 z-50 text-xs text-right animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-slate-800/80">
                  <p className="font-bold text-slate-100">{currentUser?.displayName}</p>
                  <p className="text-[10px] text-slate-400 font-mono">@{currentUser?.username}</p>
                </div>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setIsChangePasswordModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-slate-300 hover:bg-slate-800 flex items-center gap-2 transition-colors"
                >
                  <Key className="w-3.5 h-3.5 text-blue-400" />
                  <span>تغيير كلمة المرور</span>
                </button>

                <button
                  onClick={async () => {
                    setIsDropdownOpen(false);
                    await logout();
                  }}
                  className="w-full px-3 py-2 text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors border-t border-slate-800/80"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      <ChangePasswordModal />
    </>
  );
};
