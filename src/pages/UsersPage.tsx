import React, { useEffect, useState } from 'react';
import { ShieldCheck, Plus, Edit2, UserCheck, UserX, RefreshCw, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { User, UserRole } from '../shared/types';

export const UsersPage: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { addToast } = useToastStore();

  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Add User Form State
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addConfirmPassword, setAddConfirmPassword] = useState('');
  const [addDisplayName, setAddDisplayName] = useState('');
  const [addRole, setAddRole] = useState<UserRole>('SELLER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit User Form State
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('SELLER');
  const [editUsername, setEditUsername] = useState('');

  const loadUsers = async () => {
    setIsLoading(true);
    if (window.electronAPI) {
      try {
        const fetched = await window.electronAPI.getUsers();
        if (fetched) setUsersList(fetched);
      } catch (err) {
        console.error('Error loading users:', err);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const u = addUsername.trim().toLowerCase();
    const name = addDisplayName.trim();

    if (!u || !addPassword || !name) {
      setErrorMsg('جميع البيانات الأساسية مطلوبة');
      return;
    }

    if (addPassword !== addConfirmPassword) {
      setErrorMsg('كلمتا المرور غير متطابقتين');
      return;
    }

    setIsSubmitting(true);
    if (window.electronAPI) {
      const res = await window.electronAPI.createUser({
        username: u,
        password: addPassword,
        displayName: name,
        role: addRole,
      });

      setIsSubmitting(false);

      if (res.success) {
        addToast(`تمت إضافة المستخدم [${name}] بنجاح`, 'success');
        setIsAddModalOpen(false);
        setAddUsername('');
        setAddPassword('');
        setAddConfirmPassword('');
        setAddDisplayName('');
        loadUsers();
      } else {
        setErrorMsg(res.error || 'فشلت إضافة المستخدم');
      }
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmitting(true);
    if (window.electronAPI) {
      const res = await window.electronAPI.updateUser(editingUser.id, {
        displayName: editDisplayName,
        role: editRole,
        username: editUsername,
      });

      setIsSubmitting(false);

      if (res.success) {
        addToast('تم تعديل بيانات المستخدم بنجاح', 'success');
        setEditingUser(null);
        loadUsers();
      } else {
        addToast(res.error || 'فشل تعديل المستخدم', 'error');
      }
    }
  };

  const handleToggleActive = async (user: User) => {
    if (currentUser && currentUser.id === user.id && user.isActive) {
      addToast('لا يمكنك تعطيل حسابك الحالي المسجل به الدخول!', 'error');
      return;
    }

    if (window.electronAPI) {
      const res = await window.electronAPI.setUserActive(user.id, !user.isActive);
      if (res.success) {
        addToast(
          !user.isActive
            ? `تم تفعيل حساب [${user.displayName}] بنجاح`
            : `تم تعطيل حساب [${user.displayName}]`,
          'info'
        );
        loadUsers();
      } else {
        addToast(res.error || 'فشلت العملية', 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-500" />
            <span>إدارة مستخدمي النظام والصلاحيات (Users & Roles)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            إضافة كادر البائعين، تحديد الصلاحيات (مدير / بائع)، وتعطيل وتفعيل الحسابات
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadUsers}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setErrorMsg(null);
              setIsAddModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مستخدم جديد</span>
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">الاسم الظاهر</th>
              <th className="px-4 py-3">اسم المستخدم (Username)</th>
              <th className="px-4 py-3">الصلاحية / الدور</th>
              <th className="px-4 py-3">حالة الحساب</th>
              <th className="px-4 py-3">آخر تسجيل دخول</th>
              <th className="px-4 py-3">تاريخ الإنشاء</th>
              <th className="px-4 py-3 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {usersList.map((u) => (
              <tr key={u.id} className="hover:bg-slate-800/40">
                <td className="px-4 py-3 font-bold text-slate-100 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <span>{u.displayName}</span>
                </td>
                <td className="px-4 py-3 font-mono text-slate-300 font-semibold">{u.username}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.role === 'ADMIN' ? 'danger' : 'info'}>
                    {u.role === 'ADMIN' ? 'مدير النظام' : 'بائع'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.isActive ? 'success' : 'outline'}>
                    {u.isActive ? 'مفعل' : 'معطل'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('ar-EG') : 'لم يدخل بعد'}
                </td>
                <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                  {new Date(u.createdAt).toLocaleDateString('ar-EG')}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingUser(u);
                        setEditDisplayName(u.displayName);
                        setEditRole(u.role);
                        setEditUsername(u.username);
                      }}
                      title="تعديل"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(u)}
                      disabled={currentUser?.id === u.id}
                      title={u.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                      className={u.isActive ? 'text-amber-400' : 'text-emerald-400'}
                    >
                      {u.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal 1: Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="إضافة مستخدم / بائع جديد"
        maxWidth="md"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 text-right">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 block">الاسم الظاهر (مثال: أحمد محمود)</label>
            <input
              type="text"
              required
              placeholder="أحمد محمود"
              value={addDisplayName}
              onChange={(e) => setAddDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 block">اسم المستخدم (Username - إنجليزي)</label>
            <input
              type="text"
              required
              placeholder="ahmed"
              value={addUsername}
              onChange={(e) => setAddUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">كلمة المرور</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">تأكيد كلمة المرور</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={addConfirmPassword}
                onChange={(e) => setAddConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 block">الصلاحية والدور (Role)</label>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="SELLER">بائع (Seller - صلاحية الكاشير فقط)</option>
              <option value="ADMIN">مدير النظام (Admin - وصول شامل كلي)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ المستخدم الجديد'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Edit User Modal */}
      <Modal
        isOpen={editingUser !== null}
        onClose={() => setEditingUser(null)}
        title="تعديل بيانات المستخدم"
        maxWidth="md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-right">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 block">الاسم الظاهر</label>
            <input
              type="text"
              required
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 block">اسم المستخدم (Username)</label>
            <input
              type="text"
              required
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 block">الصلاحية والدور</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="SELLER">بائع (Seller)</option>
              <option value="ADMIN">مدير النظام (Admin)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditingUser(null)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
