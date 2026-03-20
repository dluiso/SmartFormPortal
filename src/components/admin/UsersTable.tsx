'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, UserCheck, UserX, Trash2, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

interface Props {
  users: UserRow[];
  tenantId: string;
}

export default function UsersTable({ users: initialUsers, tenantId }: Props) {
  const t = useTranslations('admin.users');
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

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

  const roleLabel = (user: UserRow) => {
    const role = user.roles[0]?.role;
    if (!role) return '—';
    return role.name;
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
        />
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Registered
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    {t('no_users')}
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-blue-400">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || '—'}
                          </p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-300">{roleLabel(user)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {user.departments[0]?.department.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          user.status === 'ACTIVE'
                            ? 'bg-green-900/30 text-green-400 border-0'
                            : 'bg-slate-700 text-slate-400 border-0'
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
                          size="sm"
                          variant="ghost"
                          disabled={loading === user.id}
                          onClick={() => handleToggleActive(user.id, user.status)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                          title={user.status === 'ACTIVE' ? t('deactivate_user') : t('activate_user')}
                        >
                          {user.status === 'ACTIVE' ? (
                            <UserX className="w-3.5 h-3.5" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
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
          <div className="px-4 py-2 border-t border-slate-700/30">
            <p className="text-xs text-slate-600">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>
    </div>
  );
}
