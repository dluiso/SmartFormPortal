import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/db/prisma';
import { ProcessStatus } from '@prisma/client';
import StatisticsView from '@/components/statistics/StatisticsView';

export default async function StatisticsPage() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id') || '';
  const tenantId = headersList.get('x-tenant-id') || '';
  const t = await getTranslations('statistics');

  const [statusCounts, recentInstances] = await Promise.all([
    prisma.processInstance.groupBy({
      by: ['status'],
      where: { userId, tenantId },
      _count: { status: true },
    }),
    prisma.processInstance.findMany({
      where: { userId, tenantId },
      include: { processTemplate: { include: { category: true } } },
      orderBy: { submissionDate: 'desc' },
      take: 100,
    }),
  ]);

  const counts = {
    total: 0,
    APPROVED: 0,
    PENDING: 0,
    REJECTED: 0,
    CANCELLED: 0,
    IN_REVIEW: 0,
    
    EXPIRED: 0,
  } as Record<string, number>;

  for (const g of statusCounts) {
    counts[g.status] = g._count.status;
    counts.total += g._count.status;
  }

  // Avg processing time for completed instances (submissionDate → completionDate)
  const completedWithDates = recentInstances.filter(
    (i) => i.status === ProcessStatus.APPROVED && i.submissionDate && i.completionDate
  );
  const avgDays =
    completedWithDates.length > 0
      ? Math.round(
          completedWithDates.reduce((sum, i) => {
            const diff =
              new Date(i.completionDate!).getTime() - new Date(i.submissionDate!).getTime();
            return sum + diff / (1000 * 60 * 60 * 24);
          }, 0) / completedWithDates.length
        )
      : null;

  // Group by month (last 6 months)
  const now = new Date();
  const monthlyData: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const count = recentInstances.filter((inst) => {
      if (!inst.submissionDate) return false;
      const sub = new Date(inst.submissionDate);
      return sub.getFullYear() === d.getFullYear() && sub.getMonth() === d.getMonth();
    }).length;
    monthlyData.push({ month: label, count });
  }

  // By category
  const byCategory: Record<string, number> = {};
  for (const inst of recentInstances) {
    const cat = inst.processTemplate.category?.name ?? 'Uncategorized';
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
  }
  const categoryData = Object.entries(byCategory)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="text-slate-500 text-sm mt-1">{t('my_statistics')}</p>
      </div>
      <StatisticsView
        counts={counts}
        avgDays={avgDays}
        monthlyData={monthlyData}
        categoryData={categoryData}
      />
    </div>
  );
}
