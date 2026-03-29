'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ProcessInstance {
  id: string;
  completionDate: Date | null;
  applicantName: string | null;
  businessName: string | null;
  processTemplate: { name: string };
}

interface Props {
  instances: ProcessInstance[];
}

export default function DownloadsList({ instances }: Props) {
  const t = useTranslations('downloads');
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (instanceId: string, processName: string) => {
    setDownloading(instanceId);
    try {
      const res = await fetch(`/api/downloads/${instanceId}/pdf`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${processName.replace(/\s+/g, '_')}_${instanceId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
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
        </div>
      ))}
    </div>
  );
}
