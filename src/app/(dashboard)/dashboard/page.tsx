import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/db/prisma';
import { ProcessStatus, SystemRole } from '@prisma/client';
import DashboardStats from '@/components/dashboard/DashboardStats';
import AvailableProcesses from '@/components/dashboard/AvailableProcesses';

async function getDashboardData(userId: string, tenantId: string) {
  const [processStats, availableProcesses, favoriteIds] = await Promise.all([
    // Process statistics for this user
    prisma.processInstance.groupBy({
      by: ['status'],
      where: { userId, tenantId },
      _count: { id: true },
    }),
    // Available processes (public, active, within date range)
    prisma.processTemplate.findMany({
      where: {
        tenantId,
        isPublic: true,
        isActive: true,
        OR: [
          { availableFrom: null },
          { availableFrom: { lte: new Date() } },
        ],
        AND: [
          {
            OR: [
              { availableUntil: null },
              { availableUntil: { gte: new Date() } },
            ],
          },
        ],
      },
      include: {
        category: true,
        department: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: 20,
    }),
    // User's favorites
    prisma.processFavorite.findMany({
      where: { userId, tenantId },
      select: { processTemplateId: true },
    }),
  ]);

  // Calculate stats
  const stats = {
    total: 0,
    inProgress: 0,
    completed: 0,
    nearRenewal: 0,
    pending: 0,
  };

  for (const group of processStats) {
    const count = group._count.id;
    stats.total += count;
    if (
      group.status === ProcessStatus.PENDING ||
      group.status === ProcessStatus.IN_REVIEW
    ) {
      stats.inProgress += count;
      stats.pending += group.status === ProcessStatus.PENDING ? count : 0;
    }
    if (group.status === ProcessStatus.APPROVED) {
      stats.completed += count;
    }
  }

  // Near renewal: approved processes with renewalDate within 30 days
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  stats.nearRenewal = await prisma.processInstance.count({
    where: {
      userId,
      tenantId,
      status: ProcessStatus.APPROVED,
      renewalDate: { lte: thirtyDaysFromNow, gte: new Date() },
    },
  });

  return {
    stats,
    availableProcesses,
    favoriteIds: favoriteIds.map((f) => f.processTemplateId),
  };
}

export default async function DashboardPage() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id') || '';
  const tenantId = headersList.get('x-tenant-id') || '';
  const t = await getTranslations('dashboard');

  const { stats, availableProcesses, favoriteIds } = await getDashboardData(
    userId,
    tenantId
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
      </div>

      {/* Stats */}
      <DashboardStats stats={stats} />

      {/* Available processes */}
      <AvailableProcesses
        processes={availableProcesses}
        favoriteIds={favoriteIds}
        userId={userId}
        tenantId={tenantId}
      />
    </div>
  );
}
