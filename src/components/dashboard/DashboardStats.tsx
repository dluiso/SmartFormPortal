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
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
    {
      label: t('in_progress'),
      value: stats.inProgress,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    },
    {
      label: t('completed'),
      value: stats.completed,
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
    },
    {
      label: t('pending'),
      value: stats.pending,
      icon: AlertCircle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
    },
    ...(stats.nearRenewal > 0
      ? [
          {
            label: t('near_renewal'),
            value: stats.nearRenewal,
            icon: RotateCcw,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            border: 'border-purple-200',
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
            <p className="text-sm text-slate-500">{card.label}</p>
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
