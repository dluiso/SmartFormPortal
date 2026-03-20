import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/db/prisma';
import AvailableProcesses from '@/components/dashboard/AvailableProcesses';

export default async function ProcessesPage() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id') || '';
  const tenantId = headersList.get('x-tenant-id') || '';
  const t = await getTranslations('processes');

  const [processes, favorites] = await Promise.all([
    prisma.processTemplate.findMany({
      where: {
        tenantId,
        isPublic: true,
        isActive: true,
        OR: [{ availableFrom: null }, { availableFrom: { lte: new Date() } }],
        AND: [{ OR: [{ availableUntil: null }, { availableUntil: { gte: new Date() } }] }],
      },
      include: { category: true, department: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.processFavorite.findMany({
      where: { userId, tenantId },
      select: { processTemplateId: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
      <AvailableProcesses
        processes={processes}
        favoriteIds={favorites.map((f) => f.processTemplateId)}
        userId={userId}
        tenantId={tenantId}
      />
    </div>
  );
}
