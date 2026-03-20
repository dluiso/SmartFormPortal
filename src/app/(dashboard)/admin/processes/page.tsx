import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/db/prisma';
import ProcessTemplatesManager from '@/components/admin/ProcessTemplatesManager';

export default async function AdminProcessesPage() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';
  const t = await getTranslations('admin.processes');

  const [templates, categories, departments, dbConnections] = await Promise.all([
    prisma.processTemplate.findMany({
      where: { tenantId },
      include: { category: true, department: true, dbConnection: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.category.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
    prisma.department.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } }),
    prisma.dbConnection.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
      <ProcessTemplatesManager
        templates={templates}
        categories={categories}
        departments={departments}
        dbConnections={dbConnections}
      />
    </div>
  );
}
