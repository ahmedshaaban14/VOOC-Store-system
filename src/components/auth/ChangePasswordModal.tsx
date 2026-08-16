import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export const ChangePasswordModal: React.FC = () => {
  const { isChangePasswordModalOpen, setIsChangePasswordModalOpen, changePassword } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg(null);
    setIsChangePasswordModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg('جميع الحقول مطلوبة');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('كلمتا المرور غير متطابقتين.');
      return;
    }

    if (newPassword.length < 4) {
      setErrorMsg('كلمة المرور الجديدة قصيرة جداً.');
      return;
    }

    setIsSubmitting(true);
    const ok = await changePassword(currentPassword, newPassword);
    setIsSubmitting(false);

    if (ok) {
      handleClose();
    }
  };

  return (
    <Modal
      isOpen={isChangePasswordModalOpen}
      onClose={handleClose}
      title="تغيير كلمة المرور الشخصية"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-300 block">كلمة المرور الحالية</label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-300 block">كلمة المرور الجديدة</label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-300 block">تأكيد كلمة المرور الجديدة</label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={handleClose}>
            إلغاء
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
            {isSubmitting ? 'جاري التغيير...' : 'حفظ كلمة المرور الجديدة'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
