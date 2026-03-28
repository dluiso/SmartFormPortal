import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/db/prisma';
import DbConnectionsManager from '@/components/admin/DbConnectionsManager';

export default async function AdminDbConnectionsPage() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';
  const t = await getTranslations('admin.db_connections');

  const connections = await prisma.dbConnection.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      serverAddress: true,
      port: true,
      databaseName: true,
      username: true,
      tableName: true,
      isActive: true,
      lastTestedAt: true,
      lastTestSuccess: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
      <DbConnectionsManager connections={connections} />
    </div>
  );
}
