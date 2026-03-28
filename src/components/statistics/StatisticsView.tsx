'use client';

import { useTranslations } from 'next-intl';
import { TrendingUp, CheckCircle2, Clock, XCircle, Ban, BarChart3 } from 'lucide-react';

interface Props {
  counts: Record<string, number>;
  avgDays: number | null;
  monthlyData: { month: string; count: number }[];
  categoryData: { name: string; count: number }[];
}

export default function StatisticsView({ counts, avgDays, monthlyData, categoryData }: Props) {
  const t = useTranslations('statistics');

  const stats = [
    {
      label: t('total_applications'),
      value: counts.total,
      icon: TrendingUp,
      color: 'text-blue-400',
      bg: 'bg-blue-600/20',
    },
    {
      label: t('completed'),
      value: counts.APPROVED ?? 0,
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-600/20',
    },
    {
      label: t('pending'),
      value: (counts.PENDING ?? 0) + (counts.IN_REVIEW ?? 0),
      icon: Clock,
      color: 'text-yellow-400',
      bg: 'bg-yellow-600/20',
    },
    {
      label: t('rejected'),
      value: counts.REJECTED ?? 0,
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-600/20',
    },
    {
      label: t('cancelled'),
      value: counts.CANCELLED ?? 0,
      icon: Ban,
      color: 'text-slate-500',
      bg: 'bg-slate-100',
    },
  ];

  const maxMonth = Math.max(...monthlyData.map((m) => m.count), 1);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white border border-slate-200 rounded-xl p-4"
          >
            <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Avg processing time */}
      {avgDays !== null && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm font-medium text-slate-600 mb-1">{t('avg_processing_time')}</p>
          <p className="text-3xl font-bold text-slate-900">
            {t('days', { count: avgDays })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Average from submission to approval</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly bar chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <p className="text-sm font-semibold text-slate-900">Applications per Month</p>
          </div>
          {monthlyData.every((m) => m.count === 0) ? (
            <p className="text-slate-500 text-sm">{t('no_data')}</p>
          ) : (
            <div className="flex items-end gap-2 h-32">
              {monthlyData.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-xs text-slate-500">{m.count || ''}</span>
                  <div
                    className="w-full bg-blue-600/70 rounded-t transition-all"
                    style={{ height: `${(m.count / maxMonth) * 100}%`, minHeight: m.count > 0 ? '4px' : '2px' }}
                  />
                  <span className="text-[10px] text-slate-500">{m.month}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By category */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-slate-900 mb-5">By Category</p>
          {categoryData.length === 0 ? (
            <p className="text-slate-500 text-sm">{t('no_data')}</p>
          ) : (
            <div className="space-y-3">
              {categoryData.map((c) => {
                const pct = Math.round((c.count / counts.total) * 100);
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-600 truncate">{c.name}</span>
                      <span className="text-xs text-slate-500 ml-2">{c.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
