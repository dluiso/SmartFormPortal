'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Loader2, FileText, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ProcessInstance {
  id: string;
  completionDate: Date | null;
  applicantName: string | null;
  businessName: string | null;
  lfDocumentEntryId: string | null;
  processTemplate: { name: string; lfApiConnectionId: string | null };
}

interface Props {
  instances: ProcessInstance[];
}

export default function DownloadsList({ instances }: Props) {
  const t = useTranslations('downloads');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [activeTokens, setActiveTokens] = useState<Record<string, { token: string; expiresAt: Date; countdown: string }>>({});

  const handleRequestDocument = async (instanceId: string) => {
    setRequesting(instanceId);
    try {
      const res = await fetch(`/api/my-processes/${instanceId}/request-document`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Could not generate download link.');
        return;
      }
      const { token, expiresAt } = await res.json();
      const expiresDate = new Date(expiresAt);
      setActiveTokens((prev) => ({ ...prev, [instanceId]: { token, expiresAt: expiresDate, countdown: '' } }));
      toast.success('Download link ready — valid for 15 minutes.');
      // Auto-remove expired token from UI
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
        // Remove the stale/failed token so the user can request a new one
        setActiveTokens(prev => { const next = { ...prev }; delete next[instanceId]; return next; });
        return;
      }
      const blob = await res.blob();
      const contentDisp = res.headers.get('Content-Disposition') || '';
      const filenameMatch = contentDisp.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      const filename = filenameMatch?.[1]?.replace(/['"]/g, '') || `${processName.replace(/\s+/g, '_')}_document`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      // Remove used token from state
      setActiveTokens(prev => { const next = { ...prev }; delete next[instanceId]; return next; });
    } catch {
      toast.error('Could not download document. Please try again.');
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handleDownload = async (instanceId: string, processName: string) => {
    setDownloading(instanceId);
    try {
      const res = await fetch(`/api/downloads/${instanceId}/pdf`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('[PDF download]', data.detail || data.error);
        toast.error(data.error || 'Could not generate PDF. Please try again.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${processName.replace(/\s+/g, '_')}_${instanceId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[PDF download] unexpected error:', err);
      toast.error('Could not generate PDF. Please try again.');
    } finally {
      setDownloading(null);
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

  return (
    <div className="space-y-3">
      {instances.map((inst) => (
        <div
          key={inst.id}
          className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="font-medium text-slate-900 text-sm">{inst.processTemplate.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className="text-xs bg-green-100 text-green-700 border-0">Approved</Badge>
                {inst.completionDate && (
                  <span className="text-xs text-slate-500">
                    {new Date(inst.completionDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDownload(inst.id, inst.processTemplate.name)}
              disabled={downloading === inst.id}
              className="border-slate-300 text-slate-600 hover:bg-slate-100 h-8"
            >
              {downloading === inst.id ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-1.5" />
              )}
              {t('download_pdf')}
            </Button>
            {inst.lfDocumentEntryId && inst.lfDocumentEntryId !== '0' && inst.processTemplate.lfApiConnectionId && (
              activeTokens[inst.id] ? (
                <Button
                  size="sm"
                  onClick={() => handleDownloadDocument(inst.id, activeTokens[inst.id].token, inst.processTemplate.name)}
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
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
