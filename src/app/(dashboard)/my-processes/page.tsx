import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/db/prisma';
import { ProcessStatus } from '@prisma/client';
import { syncInstance } from '@/lib/laserfiche/syncEngine';
import MyProcessesList from '@/components/processes/MyProcessesList';

export default async function MyProcessesPage() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id') || '';
  const tenantId = headersList.get('x-tenant-id') || '';
  const t = await getTranslations('my_processes');

  // Fetch all instances first
  const processInstances = await prisma.processInstance.findMany({
    where: { userId, tenantId },
    include: { processTemplate: { include: { category: true, department: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  // Auto-sync any DRAFT instances that have a DB connection configured.
  // This detects whether the user submitted the LF form after clicking Apply.
  // Run syncs in parallel but don't let any failure block the page render.
  const drafts = processInstances.filter(i => i.status === ProcessStatus.DRAFT);
  let freshInstances = processInstances;
  if (drafts.length > 0) {
    await Promise.allSettled(
      drafts.map(draft => syncInstance(draft.id, tenantId))
    );
    // Re-fetch so any DRAFT→PENDING upgrades are reflected in the rendered page
    freshInstances = await prisma.processInstance.findMany({
      where: { userId, tenantId },
      include: { processTemplate: { include: { category: true, department: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
      </div>
      <MyProcessesList instances={freshInstances} />
    </div>
  );
}
