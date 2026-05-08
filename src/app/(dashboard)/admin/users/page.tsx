import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/db/prisma';
import UsersTable from '@/components/admin/UsersTable';

export default async function AdminUsersPage() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';
  const currentUserRole = headersList.get('x-user-role') || '';
  const t = await getTranslations('admin.users');

  const [users, departments] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId },
      include: {
        roles: { include: { role: true } },
        departments: { include: { department: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.department.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
      <UsersTable
        users={users}
        tenantId={tenantId}
        currentUserRole={currentUserRole}
        departments={departments}
      />
    </div>
  );
}
