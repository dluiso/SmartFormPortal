import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/db/prisma';
import { ProcessStatus } from '@prisma/client';
import DownloadsList from '@/components/downloads/DownloadsList';

export default async function DownloadsPage() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id') || '';
  const tenantId = headersList.get('x-tenant-id') || '';
  const t = await getTranslations('downloads');

  const completedProcesses = await prisma.processInstance.findMany({
    where: { userId, tenantId, status: ProcessStatus.APPROVED },
    include: { processTemplate: true },
    orderBy: { completionDate: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="text-slate-500 text-sm mt-1">{t('subtitle')}</p>
      </div>
      <DownloadsList instances={completedProcesses} />
    </div>
  );
}
