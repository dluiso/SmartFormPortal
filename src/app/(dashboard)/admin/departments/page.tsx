import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/db/prisma';
import DepartmentsManager from '@/components/admin/DepartmentsManager';

export default async function AdminDepartmentsPage() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';
  const t = await getTranslations('admin.departments');

  const departments = await prisma.department.findMany({
    where: { tenantId },
    include: {
      _count: { select: { staff: true } },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
      <DepartmentsManager departments={departments} tenantId={tenantId} />
    </div>
  );
}
