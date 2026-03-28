import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/db/prisma';
import MyProcessesList from '@/components/processes/MyProcessesList';

export default async function MyProcessesPage() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id') || '';
  const tenantId = headersList.get('x-tenant-id') || '';
  const t = await getTranslations('my_processes');

  const processInstances = await prisma.processInstance.findMany({
    where: { userId, tenantId },
    include: { processTemplate: { include: { category: true, department: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
      </div>
      <MyProcessesList instances={processInstances} />
    </div>
  );
}
