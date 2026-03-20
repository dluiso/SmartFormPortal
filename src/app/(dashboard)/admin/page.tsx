import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/db/prisma';
import { UserStatus } from '@prisma/client';
import { Users, FileText, Clock, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';

export default async function AdminOverviewPage() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';
  const t = await getTranslations('admin.overview');

  const [userCount, activeUserCount, processTemplateCount, instanceCounts, recentActivity] =
    await Promise.all([
      prisma.user.count({ where: { tenantId } }),
      prisma.user.count({ where: { tenantId, status: UserStatus.ACTIVE } }),
      prisma.processTemplate.count({ where: { tenantId, isActive: true } }),
      prisma.processInstance.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true },
      }),
      prisma.activityLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      }),
    ]);

  const pending = instanceCounts
    .filter((g) => ['PENDING', 'IN_REVIEW'].includes(g.status))
    .reduce((s, g) => s + g._count.status, 0);
  const approved = instanceCounts.find((g) => g.status === 'APPROVED')?._count.status ?? 0;
  const totalInstances = instanceCounts.reduce((s, g) => s + g._count.status, 0);

  const cards = [
    { label: t('total_users'), value: userCount, icon: Users, color: 'text-blue-400', bg: 'bg-blue-600/20' },
    { label: t('active_users'), value: activeUserCount, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-600/20' },
    { label: t('total_processes'), value: processTemplateCount, icon: FileText, color: 'text-purple-400', bg: 'bg-purple-600/20' },
    { label: t('pending_processes'), value: pending, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-600/20' },
    { label: 'Total Applications', value: totalInstances, icon: AlertCircle, color: 'text-slate-400', bg: 'bg-slate-600/20' },
    { label: 'Approved', value: approved, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-600/20' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('title')}</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <div className={`w-10 h-10 ${c.bg} rounded-lg flex items-center justify-center mb-3`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{c.value}</p>
            <p className="text-slate-400 text-sm mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
        <div className="px-5 py-4 border-b border-slate-700/50">
          <h2 className="font-semibold text-white">{t('recent_activity')}</h2>
        </div>
        <div className="divide-y divide-slate-700/50">
          {recentActivity.length === 0 ? (
            <p className="px-5 py-8 text-center text-slate-500 text-sm">No recent activity.</p>
          ) : (
            recentActivity.map((log) => (
              <div key={log.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-slate-400">
                    {log.user?.email?.charAt(0).toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300">
                    <span className="font-medium text-white">
                      {log.user ? `${log.user.firstName ?? ''} ${log.user.lastName ?? ''}`.trim() || log.user.email : 'System'}
                    </span>{' '}
                    {log.action.toLowerCase().replace(/_/g, ' ')}
                  </p>
                  {log.details && (
                    <p className="text-xs text-slate-500 truncate">{JSON.stringify(log.details)}</p>
                  )}
                </div>
                <span className="text-xs text-slate-600 flex-shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
