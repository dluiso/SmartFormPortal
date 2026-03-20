import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/db/prisma';

export default async function AdminStatisticsPage() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';
  const t = await getTranslations('admin.statistics');

  const [statusCounts, byProcess, recentInstances] = await Promise.all([
    prisma.processInstance.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    }),
    prisma.processInstance.groupBy({
      by: ['processTemplateId'],
      where: { tenantId },
      _count: { processTemplateId: true },
      orderBy: { _count: { processTemplateId: 'desc' } },
      take: 10,
    }),
    prisma.processInstance.findMany({
      where: { tenantId },
      select: { submissionDate: true },
      orderBy: { submissionDate: 'desc' },
      take: 200,
    }),
  ]);

  // Resolve process names
  const processIds = byProcess.map((g) => g.processTemplateId);
  const processNames = processIds.length > 0
    ? await prisma.processTemplate.findMany({
        where: { id: { in: processIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameMap = Object.fromEntries(processNames.map((p) => [p.id, p.name]));

  const total = statusCounts.reduce((s, g) => s + g._count.status, 0);

  // Monthly data last 6 months
  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const count = recentInstances.filter((inst) => {
      if (!inst.submissionDate) return false;
      const sub = new Date(inst.submissionDate);
      return sub.getFullYear() === d.getFullYear() && sub.getMonth() === d.getMonth();
    }).length;
    return { label, count };
  });

  const maxMonth = Math.max(...monthly.map((m) => m.count), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('title')}</h1>

      {/* Status breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statusCounts.map((g) => (
          <div key={g.status} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{g._count.status}</p>
            <p className="text-slate-400 text-sm mt-0.5 capitalize">{g.status.replace(/_/g, ' ').toLowerCase()}</p>
          </div>
        ))}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-2xl font-bold text-white">{total}</p>
          <p className="text-slate-400 text-sm mt-0.5">{t('total_requests')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly chart */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <p className="text-sm font-semibold text-white mb-5">Applications per Month</p>
          <div className="flex items-end gap-2 h-32">
            {monthly.map((m) => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs text-slate-400">{m.count || ''}</span>
                <div
                  className="w-full bg-blue-600/70 rounded-t"
                  style={{ height: `${(m.count / maxMonth) * 100}%`, minHeight: m.count > 0 ? '4px' : '2px' }}
                />
                <span className="text-[10px] text-slate-500">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By process */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <p className="text-sm font-semibold text-white mb-5">{t('by_process')}</p>
          <div className="space-y-3">
            {byProcess.length === 0 ? (
              <p className="text-slate-500 text-sm">No data.</p>
            ) : (
              byProcess.map((g) => {
                const pct = total > 0 ? Math.round((g._count.processTemplateId / total) * 100) : 0;
                return (
                  <div key={g.processTemplateId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-300 truncate">
                        {nameMap[g.processTemplateId] ?? 'Unknown'}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">{g._count.processTemplateId}</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
