'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import {
  ExternalLink,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  RefreshCw,
  Building2,
  User,
  MapPin,
  PauseCircle,
  ChevronRight,
} from 'lucide-react';
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

// Status display config
const statusConfig: Record<
  ProcessStatus,
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  DRAFT:     { label: 'Form Not Submitted', icon: AlertCircle, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
  PENDING:   { label: 'Pending',    icon: Clock,        color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200' },
  IN_REVIEW: { label: 'In Review',  icon: Clock,        color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200'  },
  APPROVED:  { label: 'Approved',   icon: CheckCircle2, color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200' },
  REJECTED:  { label: 'Rejected',   icon: XCircle,      color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200'   },
  CANCELLED: { label: 'Cancelled',  icon: XCircle,      color: 'text-slate-500',  bg: 'bg-slate-100',  border: 'border-slate-200' },
  EXPIRED:   { label: 'Expired',    icon: AlertCircle,  color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200'},
};

// Detect "on hold" from the status label string
function isOnHold(statusLabel: string | null): boolean {
  if (!statusLabel) return false;
  const s = statusLabel.toLowerCase();
  return s.includes('hold') || s.includes('pause') || s.includes('paused') || s.includes('espera');
}

// Determine whether the process is still active (non-terminal, not draft)
function isActive(status: ProcessStatus): boolean {
  return status === ProcessStatus.PENDING || status === ProcessStatus.IN_REVIEW;
}

export default function MyProcessesList({ instances: initialInstances }: Props) {
  const t = useTranslations('my_processes');
  const [instances, setInstances] = useState(initialInstances);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const filtered = instances.filter((i) =>
    i.processTemplate.name.toLowerCase().includes(search.toLowerCase())
  );

  const drafts    = filtered.filter(i => i.status === ProcessStatus.DRAFT);
  const submitted = filtered.filter(i => i.status !== ProcessStatus.DRAFT);

  const handleRefresh = async (instanceId: string) => {
    setRefreshing(instanceId);
    try {
      const res = await fetch(`/api/my-processes/${instanceId}/sync`, { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success('Status refreshed successfully.');
      window.location.reload();
    } catch {
      toast.error('Could not refresh status. Please try again later.');
    } finally {
      setRefreshing(null);
    }
  };

  const handleCancelDraft = async (instanceId: string) => {
    if (!confirm('Cancel this application? The form was not submitted and the record will be removed.')) return;
    setCancelling(instanceId);
    try {
      const res = await fetch(`/api/my-processes/${instanceId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setInstances(prev => prev.filter(i => i.id !== instanceId));
      toast.success('Draft application removed.');
    } catch {
      toast.error('Could not remove draft. Please try again.');
    } finally {
      setCancelling(null);
    }
  };

  // Only show empty state when there are truly no instances at all
  if (instances.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-slate-500 mb-4">{t('no_processes')}</p>
        <a
          href="/processes"
          className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-transparent px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          {t('start_process')}
        </a>
      </div>
    );
  }

  const renderCard = (instance: ProcessInstance) => {
    const config = statusConfig[instance.status];
    const StatusIcon = config.icon;
    const onHold = isOnHold(instance.statusLabel);
    const active = isActive(instance.status);
    const isNearRenewal =
      instance.renewalDate &&
      new Date(instance.renewalDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const displayBg     = onHold ? 'bg-amber-50'    : config.bg;
    const displayColor  = onHold ? 'text-amber-700'  : config.color;
    const displayBorder = onHold ? 'border-amber-200': config.border;
    const DisplayIcon   = onHold ? PauseCircle : StatusIcon;

    const card = (
      <div
        key={instance.id}
        className={`bg-white border rounded-xl overflow-hidden hover:shadow-sm transition-all ${displayBorder} ${instance.status !== ProcessStatus.DRAFT ? 'cursor-pointer hover:border-slate-300' : ''}`}
      >
        {/* Active process: colored top bar showing current department */}
        {active && instance.assignedDepartment && (
          <div className="flex items-center gap-2 px-5 py-2 bg-blue-50 border-b border-blue-100">
            <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <span className="text-xs text-blue-700 font-medium">
              {t('current_at')}:&nbsp;
              <span className="font-semibold">{instance.assignedDepartment}</span>
            </span>
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Title + badges */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h3 className="font-semibold text-slate-900">{instance.processTemplate.name}</h3>
                {instance.processTemplate.category && (
                  <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-500 border-0">
                    {instance.processTemplate.category.name}
                  </Badge>
                )}
                {isNearRenewal && (
                  <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                    Renewal soon
                  </Badge>
                )}
              </div>

              {/* Status badge */}
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${displayBg} mb-3`}>
                <DisplayIcon className={`w-3.5 h-3.5 ${displayColor}`} />
                <span className={displayColor}>
                  {instance.status === ProcessStatus.DRAFT
                    ? config.label
                    : (instance.statusLabel || config.label)}
                </span>
              </div>

              {/* DRAFT: informational message */}
              {instance.status === ProcessStatus.DRAFT && (
                <p className="text-xs text-slate-400 mb-2">
                  The Laserfiche form was opened but not yet submitted. Submit the form to track this process, or cancel to remove it.
                </p>
              )}

              {/* Details grid — only for non-DRAFT */}
              {instance.status !== ProcessStatus.DRAFT && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 mt-1">
                  {instance.submissionDate && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">{t('submitted_date')}</p>
                      <p className="text-xs text-slate-700 font-medium">
                        {new Date(instance.submissionDate).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                      </p>
                    </div>
                  )}
                  {instance.completionDate && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">{t('completion_date')}</p>
                      <p className="text-xs text-green-700 font-medium">
                        {new Date(instance.completionDate).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                      </p>
                    </div>
                  )}
                  {instance.renewalDate && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">{t('renewal_date')}</p>
                      <p className={`text-xs font-medium ${isNearRenewal ? 'text-purple-700' : 'text-slate-700'}`}>
                        {new Date(instance.renewalDate).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                      </p>
                    </div>
                  )}
                  {!active && instance.assignedDepartment && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />{t('department')}
                      </p>
                      <p className="text-xs text-slate-700 font-medium">{instance.assignedDepartment}</p>
                    </div>
                  )}
                  {instance.assignedStaffName && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
                        <User className="w-3 h-3" />{t('assigned_staff')}
                      </p>
                      <p className="text-xs text-slate-700 font-medium">{instance.assignedStaffName}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Last synced — only for non-DRAFT */}
              {instance.status !== ProcessStatus.DRAFT && instance.lastSyncedAt && (
                <p className="text-xs text-slate-400 mt-3">
                  {t('last_synced', {
                    time: formatDistanceToNow(new Date(instance.lastSyncedAt), { addSuffix: true }),
                  })}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              {instance.status === ProcessStatus.DRAFT ? (
                /* DRAFT: only show Cancel button */
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancelDraft(instance.id)}
                  disabled={cancelling === instance.id}
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                  title="Cancel — remove this draft"
                >
                  <XCircle className={`w-3.5 h-3.5 ${cancelling === instance.id ? 'animate-spin' : ''}`} />
                </Button>
              ) : (
                /* Submitted: show sync button */
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRefresh(instance.id)}
                  disabled={refreshing === instance.id}
                  className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 h-8 w-8 p-0"
                  title={t('sync_now')}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing === instance.id ? 'animate-spin' : ''}`} />
                </Button>
              )}
              {instance.renewalUrl && instance.status === ProcessStatus.APPROVED && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                  onClick={() => window.open(instance.renewalUrl!, '_blank', 'noopener,noreferrer')}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Renew
                </Button>
              )}
              {instance.status !== ProcessStatus.DRAFT && (
                <ChevronRight className="w-4 h-4 text-slate-300 mt-1" />
              )}
            </div>
          </div>
        </div>
      </div>
    );

    if (instance.status !== ProcessStatus.DRAFT) {
      return (
        <Link key={instance.id} href={`/my-processes/${instance.id}`} className="block">
          {card}
        </Link>
      );
    }
    return card;
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your processes..."
          className="pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
        />
      </div>

      {/* Submitted processes */}
      {submitted.length > 0 && (
        <div className="space-y-3">
          {submitted.map(renderCard)}
        </div>
      )}

      {/* Drafts section — forms opened but not yet submitted */}
      {drafts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            Forms Not Yet Submitted ({drafts.length})
          </p>
          <div className="space-y-3 opacity-70">
            {drafts.map(renderCard)}
          </div>
        </div>
      )}

      {/* Empty filtered state */}
      {filtered.length === 0 && instances.length > 0 && (
        <p className="text-center text-slate-400 py-10 text-sm">No processes match your search.</p>
      )}
    </div>
  );
}
