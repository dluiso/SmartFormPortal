import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/db/prisma';
import { ProcessStatus } from '@prisma/client';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  PauseCircle,
  Building2,
  User,
  Calendar,
  Hash,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ProcessDetailActions from '@/components/processes/ProcessDetailActions';

const statusConfig: Record<ProcessStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  DRAFT:     { label: 'Form Not Submitted', color: 'text-slate-500', bg: 'bg-slate-50',   border: 'border-slate-200',  icon: AlertCircle  },
  PENDING:   { label: 'Pending',            color: 'text-amber-700', bg: 'bg-amber-50',   border: 'border-amber-200',  icon: Clock        },
  IN_REVIEW: { label: 'In Review',          color: 'text-blue-700',  bg: 'bg-blue-50',    border: 'border-blue-200',   icon: Clock        },
  APPROVED:  { label: 'Approved',           color: 'text-green-700', bg: 'bg-green-50',   border: 'border-green-200',  icon: CheckCircle2 },
  REJECTED:  { label: 'Rejected',           color: 'text-red-700',   bg: 'bg-red-50',     border: 'border-red-200',    icon: XCircle      },
  CANCELLED: { label: 'Cancelled',          color: 'text-slate-500', bg: 'bg-slate-100',  border: 'border-slate-200',  icon: XCircle      },
  EXPIRED:   { label: 'Expired',            color: 'text-orange-700',bg: 'bg-orange-50',  border: 'border-orange-200', icon: AlertCircle  },
};

function isOnHold(statusLabel: string | null): boolean {
  if (!statusLabel) return false;
  const s = statusLabel.toLowerCase();
  return s.includes('hold') || s.includes('pause') || s.includes('paused') || s.includes('espera');
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProcessDetailPage({ params }: Props) {
  const { id } = await params;
  const headersList = await headers();
  const userId   = headersList.get('x-user-id') || '';
  const tenantId = headersList.get('x-tenant-id') || '';

  const instance = await prisma.processInstance.findFirst({
    where: { id, userId, tenantId },
    include: {
      processTemplate: { include: { category: true, department: true } },
    },
  });

  if (!instance) notFound();

  const config  = statusConfig[instance.status];
  const onHold  = isOnHold(instance.statusLabel);
  const StatusIcon = onHold ? PauseCircle : config.icon;
  const statusColor  = onHold ? 'text-amber-700'  : config.color;
  const statusBg     = onHold ? 'bg-amber-50'     : config.bg;
  const statusBorder = onHold ? 'border-amber-200': config.border;
  const statusLabel  = onHold ? instance.statusLabel! : (instance.statusLabel || config.label);

  const rawData = instance.rawData as Record<string, unknown> | null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back */}
      <Link
        href="/my-processes"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to My Processes
      </Link>

      {/* Header card */}
      <div className={`bg-white border rounded-xl p-6 ${statusBorder}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-xl font-bold text-slate-900">{instance.processTemplate.name}</h1>
              {instance.processTemplate.category && (
                <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-0">
                  {instance.processTemplate.category.name}
                </Badge>
              )}
            </div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusBg}`}>
              <StatusIcon className={`w-4 h-4 ${statusColor}`} />
              <span className={statusColor}>{statusLabel}</span>
            </div>
          </div>
          <ProcessDetailActions instanceId={instance.id} status={instance.status} />
        </div>
      </div>

      {/* Reference ID */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
          <Hash className="w-3.5 h-3.5" />
          Reference ID
        </div>
        <p className="font-mono text-sm text-slate-700 break-all select-all">{instance.id}</p>
      </div>

      {/* Details grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Process Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {instance.applicantName && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><User className="w-3 h-3" />Applicant</p>
              <p className="text-sm text-slate-800 font-medium">{instance.applicantName}</p>
            </div>
          )}
          {instance.businessName && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><Building2 className="w-3 h-3" />Business</p>
              <p className="text-sm text-slate-800 font-medium">{instance.businessName}</p>
            </div>
          )}
          {instance.submissionDate && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" />Submitted</p>
              <p className="text-sm text-slate-800 font-medium">
                {new Date(instance.submissionDate).toLocaleDateString(undefined, { timeZone: 'UTC' })}
              </p>
            </div>
          )}
          {instance.completionDate && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Completed</p>
              <p className="text-sm text-green-700 font-medium">
                {new Date(instance.completionDate).toLocaleDateString(undefined, { timeZone: 'UTC' })}
              </p>
            </div>
          )}
          {instance.renewalDate && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><RefreshCw className="w-3 h-3" />Renewal Date</p>
              <p className="text-sm text-slate-800 font-medium">
                {new Date(instance.renewalDate).toLocaleDateString(undefined, { timeZone: 'UTC' })}
              </p>
            </div>
          )}
          {instance.assignedDepartment && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><Building2 className="w-3 h-3" />Department</p>
              <p className="text-sm text-slate-800 font-medium">{instance.assignedDepartment}</p>
            </div>
          )}
          {instance.assignedStaffName && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><User className="w-3 h-3" />Assigned Staff</p>
              <p className="text-sm text-slate-800 font-medium">{instance.assignedStaffName}</p>
            </div>
          )}
          {instance.lfProcessId && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><Hash className="w-3 h-3" />LF Process ID</p>
              <p className="text-sm font-mono text-slate-600">{instance.lfProcessId}</p>
            </div>
          )}
          {instance.lfDocumentEntryId && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><FileText className="w-3 h-3" />LF Document Entry ID</p>
              <p className="text-sm font-mono text-slate-600">{instance.lfDocumentEntryId}</p>
            </div>
          )}
          {instance.lastSyncedAt && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Last Synced</p>
              <p className="text-sm text-slate-600">{new Date(instance.lastSyncedAt).toLocaleString()}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Started</p>
            <p className="text-sm text-slate-600">{new Date(instance.startedAt).toLocaleString()}</p>
          </div>
        </div>

        {instance.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-1">Notes</p>
            <p className="text-sm text-slate-700">{instance.notes}</p>
          </div>
        )}
      </div>

      {/* Raw data — collapsed by default */}
      {rawData && Object.keys(rawData).length > 0 && (
        <details className="bg-white border border-slate-200 rounded-xl p-4">
          <summary className="text-sm font-semibold text-slate-600 cursor-pointer select-none">
            Form Data (raw)
          </summary>
          <div className="mt-3 overflow-auto">
            <pre className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap break-all">
              {JSON.stringify(rawData, null, 2)}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
}
