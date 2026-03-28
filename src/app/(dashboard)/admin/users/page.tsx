import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/db/prisma';
import UsersTable from '@/components/admin/UsersTable';

export default async function AdminUsersPage() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';
  const t = await getTranslations('admin.users');

  const users = await prisma.user.findMany({
    where: { tenantId },
    include: {
      roles: { include: { role: true } },
      departments: { include: { department: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
      <UsersTable users={users} tenantId={tenantId} />
    </div>
  );
}
