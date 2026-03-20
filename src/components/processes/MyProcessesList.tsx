'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, RotateCcw, Clock, CheckCircle2, XCircle, AlertCircle, Search, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProcessStatus } from '@prisma/client';
import { toast } from 'sonner';

interface ProcessInstance {
  id: string;
  status: ProcessStatus;
  statusLabel: string | null;
  submissionDate: Date | null;
  completionDate: Date | null;
  renewalDate: Date | null;
  renewalUrl: string | null;
  assignedDepartment: string | null;
  assignedStaffName: string | null;
  lastSyncedAt: Date | null;
  updatedAt: Date;
  processTemplate: {
    id: string;
    name: string;
    requiresRenewal: boolean;
    category: { name: string; color: string | null } | null;
    department: { name: string } | null;
  };
}

interface Props {
  instances: ProcessInstance[];
}

const statusConfig: Record<ProcessStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  DRAFT: { label: 'Draft', icon: AlertCircle, color: 'text-slate-400', bg: 'bg-slate-700' },
  PENDING: { label: 'Pending', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-900/30' },
  IN_REVIEW: { label: 'In Review', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-900/30' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-900/30' },
  REJECTED: { label: 'Rejected', icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/30' },
  CANCELLED: { label: 'Cancelled', icon: XCircle, color: 'text-slate-500', bg: 'bg-slate-800' },
  EXPIRED: { label: 'Expired', icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-900/30' },
};

export default function MyProcessesList({ instances }: Props) {
  const t = useTranslations('my_processes');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const filtered = instances.filter((i) =>
    i.processTemplate.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleRefresh = async (instanceId: string) => {
    setRefreshing(instanceId);
    try {
      const res = await fetch(`/api/my-processes/${instanceId}/sync`, { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success('Status refreshed successfully.');
      // Reload page data
      window.location.reload();
    } catch {
      toast.error('Could not refresh status. Please try again later.');
    } finally {
      setRefreshing(null);
    }
  };

  if (instances.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-slate-600" />
        </div>
        <p className="text-slate-400 mb-4">{t('no_processes')}</p>
        <a href="/processes" className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">
          {t('start_process')}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your processes..."
          className="pl-9 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500"
        />
      </div>

      {/* Process cards */}
      <div className="space-y-3">
        {filtered.map((instance) => {
          const config = statusConfig[instance.status];
          const StatusIcon = config.icon;
          const isNearRenewal =
            instance.renewalDate &&
            new Date(instance.renewalDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          return (
            <div
              key={instance.id}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Title + badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-medium text-white">{instance.processTemplate.name}</h3>
                    {instance.processTemplate.category && (
                      <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-400 border-0">
                        {instance.processTemplate.category.name}
                      </Badge>
                    )}
                    {isNearRenewal && (
                      <Badge className="text-xs bg-purple-900/40 text-purple-400 border-purple-700/50">
                        Renewal soon
                      </Badge>
                    )}
                  </div>

                  {/* Status */}
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg}`}>
                    <StatusIcon className={`w-3 h-3 ${config.color}`} />
                    <span className={config.color}>{instance.statusLabel || config.label}</span>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    {instance.submissionDate && (
                      <div>
                        <p className="text-xs text-slate-600">{t('submitted_date')}</p>
                        <p className="text-xs text-slate-400 font-medium">
                          {new Date(instance.submissionDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {instance.completionDate && (
                      <div>
                        <p className="text-xs text-slate-600">{t('completion_date')}</p>
                        <p className="text-xs text-green-400 font-medium">
                          {new Date(instance.completionDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {instance.renewalDate && (
                      <div>
                        <p className="text-xs text-slate-600">{t('renewal_date')}</p>
                        <p className={`text-xs font-medium ${isNearRenewal ? 'text-purple-400' : 'text-slate-400'}`}>
                          {new Date(instance.renewalDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {instance.assignedDepartment && (
                      <div>
                        <p className="text-xs text-slate-600">{t('assigned_to')}</p>
                        <p className="text-xs text-slate-400 font-medium">
                          {instance.assignedStaffName || instance.assignedDepartment}
                        </p>
                      </div>
                    )}
                  </div>

                  {instance.lastSyncedAt && (
                    <p className="text-xs text-slate-600 mt-2">
                      {t('last_synced', {
                        time: formatDistanceToNow(new Date(instance.lastSyncedAt), { addSuffix: true }),
                      })}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRefresh(instance.id)}
                    disabled={refreshing === instance.id}
                    className="text-slate-400 hover:text-white hover:bg-slate-700 h-8 px-2"
                    title={t('sync_now')}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing === instance.id ? 'animate-spin' : ''}`} />
                  </Button>
                  {instance.renewalUrl && instance.status === ProcessStatus.APPROVED && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs border-purple-700/50 text-purple-400 hover:bg-purple-900/30"
                      onClick={() => window.open(instance.renewalUrl!, '_blank', 'noopener,noreferrer')}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Renew
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
