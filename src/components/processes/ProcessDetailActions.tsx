'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ProcessStatus } from '@prisma/client';

interface Props {
  instanceId: string;
  status: ProcessStatus;
}

export default function ProcessDetailActions({ instanceId, status }: Props) {
  const [refreshing, setRefreshing] = useState(false);

  if (status === ProcessStatus.DRAFT) return null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/my-processes/${instanceId}/sync`, { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success('Status refreshed successfully.');
      window.location.reload();
    } catch {
      toast.error('Could not refresh status. Please try again later.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={refreshing}
      className="border-slate-300 text-slate-600 hover:bg-slate-50 h-8"
    >
      <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
      Sync Status
    </Button>
  );
}
