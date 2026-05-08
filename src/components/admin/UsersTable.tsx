'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, UserCheck, UserX, Trash2, Shield, Plus, X, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SystemRole } from '@prisma/client';

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  userType: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  roles: { role: { name: string; systemRole: string } }[];
  departments: { department: { name: string } }[];
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface Props {
  users: UserRow[];
  tenantId: string;
  currentUserRole?: string;
  departments?: DepartmentOption[];
}

const blankUserForm = {
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  systemRole: SystemRole.CLIENT as string,
  departmentId: '',
  phone: '',
  organization: '',
};

const ROLE_OPTIONS = [
  { value: SystemRole.CLIENT,      label: 'Client (Resident/Applicant)' },
  { value: SystemRole.STAFF,       label: 'Staff' },
  { value: SystemRole.ADMIN,       label: 'Admin' },
  { value: SystemRole.SUPER_ADMIN, label: 'Super Admin' },
];

export default function UsersTable({ users: initialUsers, tenantId, currentUserRole, departments = [] }: Props) {
  const t = useTranslations('admin.users');
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(blankUserForm);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  const isSuperAdmin = currentUserRole === SystemRole.SUPER_ADMIN;
  const isAdmin = isSuperAdmin || currentUserRole === SystemRole.ADMIN;

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
    );
  });

  const handleToggleActive = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );
      toast.success(`User ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully.`);
    } catch {
      toast.error('Failed to update user.');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm(t('confirm_delete'))) return;
    setLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success('User deleted.');
    } catch {
      toast.error('Failed to delete user.');
    } finally {
      setLoading(null);
    }
  };

  const handleCreateUser = async () => {
    if (!form.email || !form.firstName || !form.lastName || !form.password) {
      toast.error('Email, name, and password are required.');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          password: form.password,
          systemRole: form.systemRole,
          departmentId: form.departmentId || undefined,
          phone: form.phone,
          organization: form.organization,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      setUsers(prev => [data, ...prev]);
      setForm(blankUserForm);
      setShowCreateModal(false);
      toast.success(`User ${form.email} created successfully.`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  const roleLabel = (user: UserRow) => {
    const role = user.roles[0]?.role;
    if (!role) return '—';
    return role.name;
  };

  const roleBadgeClass = (systemRole: string) => {
    switch (systemRole) {
      case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-700';
      case 'ADMIN':       return 'bg-blue-100 text-blue-700';
      case 'STAFF':       return 'bg-teal-100 text-teal-700';
      default:            return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search + Create button */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500 placeholder:text-slate-400"
          />
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowCreateModal(true)} className="gap-2 h-10 px-4">
            <Plus className="w-4 h-4" /> Create User
          </Button>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Create New User</h2>
              <button
                onClick={() => { setShowCreateModal(false); setForm(blankUserForm); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">First Name *</label>
                  <input
                    type="text" value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Last Name *</label>
                  <input
                    type="text" value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
                <input
                  type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:border-blue-500"
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Role *</label>
                <select
                  value={form.systemRole}
                  onChange={e => setForm(f => ({ ...f, systemRole: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-blue-500"
                >
                  {ROLE_OPTIONS
                    .filter(r => isSuperAdmin || r.value !== SystemRole.SUPER_ADMIN)
                    .map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {departments.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Department (optional)</label>
                  <select
                    value={form.departmentId}
                    onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">No department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                  <input
                    type="text" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Organization</label>
                  <input
                    type="text" value={form.organization}
                    onChange={e => setForm(f => ({ ...f, organization: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <p className="text-xs text-slate-400">
                The user will be created as <strong>Active</strong> — no email verification required. Share the credentials manually.
              </p>
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-200">
              <Button onClick={handleCreateUser} disabled={creating} className="flex-1">
                {creating ? 'Creating…' : 'Create User'}
              </Button>
              <Button variant="outline" onClick={() => { setShowCreateModal(false); setForm(blankUserForm); }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    {t('no_users')}
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-blue-700">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || '—'}
                          </p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeClass(user.roles[0]?.role.systemRole ?? '')}`}>
                          {roleLabel(user)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {user.departments[0]?.department.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          user.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700 border-0'
                            : user.status === 'PENDING_VERIFICATION'
                            ? 'bg-amber-100 text-amber-700 border-0'
                            : 'bg-slate-100 text-slate-600 border-0'
                        }
                      >
                        {user.status === 'ACTIVE' ? 'Active' : user.status === 'PENDING_VERIFICATION' ? 'Pending' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm" variant="ghost"
                          disabled={loading === user.id}
                          onClick={() => handleToggleActive(user.id, user.status)}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                          title={user.status === 'ACTIVE' ? t('deactivate_user') : t('activate_user')}
                        >
                          {user.status === 'ACTIVE' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          disabled={loading === user.id}
                          onClick={() => handleDelete(user.id)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          title={t('delete_user')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-200">
            <p className="text-xs text-slate-600">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>
    </div>
  );
}
