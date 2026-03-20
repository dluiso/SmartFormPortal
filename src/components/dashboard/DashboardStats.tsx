'use client';

import { useTranslations } from 'next-intl';
import { FileText, Clock, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';

interface Stats {
  total: number;
  inProgress: number;
  completed: number;
  nearRenewal: number;
  pending: number;
}

interface Props {
  stats: Stats;
}

export default function DashboardStats({ stats }: Props) {
  const t = useTranslations('dashboard.stats');

  const cards = [
    {
      label: t('total_processes'),
      value: stats.total,
      icon: FileText,
      color: 'text-blue-400',
      bg: 'bg-blue-600/10',
      border: 'border-blue-600/20',
    },
    {
      label: t('in_progress'),
      value: stats.inProgress,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-600/10',
      border: 'border-amber-600/20',
    },
    {
      label: t('completed'),
      value: stats.completed,
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-600/10',
      border: 'border-green-600/20',
    },
    {
      label: t('pending'),
      value: stats.pending,
      icon: AlertCircle,
      color: 'text-orange-400',
      bg: 'bg-orange-600/10',
      border: 'border-orange-600/20',
    },
    ...(stats.nearRenewal > 0
      ? [
          {
            label: t('near_renewal'),
            value: stats.nearRenewal,
            icon: RotateCcw,
            color: 'text-purple-400',
            bg: 'bg-purple-600/10',
            border: 'border-purple-600/20',
          },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border ${card.border} ${card.bg} p-4`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">{card.label}</p>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.bg}`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
          </div>
          <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
