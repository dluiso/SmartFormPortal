'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, FileText, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ProcessInstance {
  id: string;
  submissionDate: Date | null;
  completionDate: Date | null;
  applicantName: string | null;
  businessName: string | null;
  lfDocumentEntryId: string;
  processTemplate: { name: string; lfApiConnectionId: string };
}

interface Props {
  instances: ProcessInstance[];
}

export default function DownloadsList({ instances }: Props) {
  const t = useTranslations('downloads');
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [activeTokens, setActiveTokens] = useState<Record<string, { token: string; expiresAt: Date }>>({});

  const handleRequestDocument = async (instanceId: string) => {
    setRequesting(instanceId);
    try {
      const res = await fetch(`/api/my-processes/${instanceId}/request-document`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Could not generate download link.');
        return;
      }
      const { token, expiresAt } = await res.json();
      const expiresDate = new Date(expiresAt);
      setActiveTokens((prev) => ({ ...prev, [instanceId]: { token, expiresAt: expiresDate } }));
      toast.success('Download link ready — valid for 15 minutes.');
      // Auto-remove expired token from UI after 15 min
      setTimeout(() => {
        setActiveTokens((prev) => {
          const next = { ...prev };
          delete next[instanceId];
          return next;
        });
      }, 15 * 60 * 1000);
    } catch {
      toast.error('Could not generate download link. Please try again.');
    } finally {
      setRequesting(null);
    }
  };

  const handleDownloadDocument = async (instanceId: string, token: string, processName: string) => {
    setDownloadingDoc(instanceId);
    try {
      const res = await fetch(`/api/downloads/document/${token}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Could not download document. Please request a new link.');
        // Remove failed token so the user can request a fresh one
        setActiveTokens((prev) => { const next = { ...prev }; delete next[instanceId]; return next; });
        return;
      }
      const blob = await res.blob();
      const contentDisp = res.headers.get('Content-Disposition') || '';
      const filenameMatch = contentDisp.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      const filename =
        filenameMatch?.[1]?.replace(/['"]/g, '') ||
        `${processName.replace(/\s+/g, '_')}_document`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      // Remove used (one-time) token from state
      setActiveTokens((prev) => { const next = { ...prev }; delete next[instanceId]; return next; });
    } catch {
      toast.error('Could not download document. Please try again.');
    } finally {
      setDownloadingDoc(null);
    }
  };

  if (instances.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-slate-500">{t('no_downloads')}</p>
      </div>
    );
  }

  // Count how many times each process name appears — used to show index numbers
  const nameCounts: Record<string, number> = {};
  const nameIndex: Record<string, number> = {};
  for (const inst of instances) {
    nameCounts[inst.processTemplate.name] = (nameCounts[inst.processTemplate.name] ?? 0) + 1;
  }

  return (
    <div className="space-y-3">
      {instances.map((inst) => {
        const hasDuplicates = nameCounts[inst.processTemplate.name] > 1;
        nameIndex[inst.processTemplate.name] = (nameIndex[inst.processTemplate.name] ?? 0) + 1;
        const index = nameIndex[inst.processTemplate.name];

        return (
        <div
          key={inst.id}
          className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all"
        >
          {/* Process info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-green-700" />
            </div>
            <div>
              {/* Title + index when there are duplicates */}
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-900 text-sm">{inst.processTemplate.name}</p>
                {hasDuplicates && (
                  <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    #{index}
                  </span>
                )}
              </div>

              {/* Identifying details row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <Badge className="text-xs bg-green-100 text-green-700 border-0">Approved</Badge>

                {inst.applicantName && (
                  <span className="text-xs text-slate-600 font-medium">{inst.applicantName}</span>
                )}
                {inst.businessName && inst.businessName !== inst.applicantName && (
                  <span className="text-xs text-slate-500">{inst.businessName}</span>
                )}

                {inst.submissionDate && (
                  <span className="text-xs text-slate-400">
                    Submitted: {new Date(inst.submissionDate).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                  </span>
                )}
                {inst.completionDate && (
                  <span className="text-xs text-slate-400">
                    Approved: {new Date(inst.completionDate).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                  </span>
                )}

                {/* Fallback: short ID when no other identifying info */}
                {!inst.applicantName && !inst.businessName && !inst.submissionDate && !inst.completionDate && (
                  <span className="text-xs font-mono text-slate-400">{inst.id.slice(0, 8).toUpperCase()}</span>
                )}
              </div>
            </div>
          </div>

          {/* Action: Request link → then Download */}
          <div className="flex-shrink-0">
            {activeTokens[inst.id] ? (
              <Button
                size="sm"
                onClick={() =>
                  handleDownloadDocument(inst.id, activeTokens[inst.id].token, inst.processTemplate.name)
                }
                disabled={downloadingDoc === inst.id}
                className="h-8 px-3 text-xs bg-green-600 text-white hover:bg-green-700"
              >
                {downloadingDoc === inst.id ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 mr-1.5" />
                )}
                {t('download_lf_document')}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRequestDocument(inst.id)}
                disabled={requesting === inst.id}
                className="border-blue-300 text-blue-600 hover:bg-blue-50 h-8"
              >
                {requesting === inst.id ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 mr-1.5" />
                )}
                {t('request_lf_document')}
              </Button>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
}
