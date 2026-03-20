'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, HardDrive, CheckCircle2, XCircle, Clock, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

type DestType = 'LOCAL' | 'SFTP' | 'GOOGLE_DRIVE' | 'ONEDRIVE' | 'S3_COMPATIBLE';

interface BackupRun {
  status: string;
  startedAt: string;
  completedAt: string | null;
  fileSize: number | null;
  errorMessage: string | null;
}

interface BackupConfig {
  id: string;
  name: string;
  destinationType: DestType;
  isActive: boolean;
  cronExpression: string | null;
  retentionDays: number;
  backupRuns: BackupRun[];
}

interface Props { initial: BackupConfig[]; }

const DEST_LABELS: Record<DestType, string> = {
  LOCAL: 'Local Storage',
  SFTP: 'SFTP',
  GOOGLE_DRIVE: 'Google Drive',
  ONEDRIVE: 'OneDrive',
  S3_COMPATIBLE: 'S3 / Compatible',
};

const STATUS_CONFIG = {
  PENDING:   { icon: Clock,        color: 'text-slate-400' },
  RUNNING:   { icon: RefreshCw,    color: 'text-blue-400'  },
  COMPLETED: { icon: CheckCircle2, color: 'text-green-400' },
  FAILED:    { icon: XCircle,      color: 'text-red-400'   },
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function BackupManager({ initial }: Props) {
  const [configs, setConfigs] = useState<BackupConfig[]>(initial);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '', destinationType: 'LOCAL' as DestType,
    cronExpression: '0 2 * * *', retentionDays: 30,
  });

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, isActive: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      const { config } = await res.json();
      setConfigs((prev) => [...prev, { ...config, backupRuns: [] }]);
      setShowForm(false);
      setForm({ name: '', destinationType: 'LOCAL', cronExpression: '0 2 * * *', retentionDays: 30 });
      toast.success('Backup configuration created.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not create backup config.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await fetch(`/api/admin/settings/backup/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setConfigs((prev) => prev.map((c) => c.id === id ? { ...c, isActive: !isActive } : c));
    toast.success(!isActive ? 'Backup enabled.' : 'Backup disabled.');
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/settings/backup/${id}`, { method: 'DELETE' });
    setConfigs((prev) => prev.filter((c) => c.id !== id));
    toast.success('Backup config deleted.');
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Existing configs */}
      {configs.length === 0 && !showForm ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-10 text-center text-slate-500 text-sm">
          No backup configurations yet.
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((cfg) => {
            const lastRun = cfg.backupRuns[0];
            const statusCfg = lastRun ? STATUS_CONFIG[lastRun.status as keyof typeof STATUS_CONFIG] : null;
            const StatusIcon = statusCfg?.icon;

            return (
              <div key={cfg.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <HardDrive className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-white">{cfg.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge className="text-xs bg-slate-700 text-slate-400 border-0">{DEST_LABELS[cfg.destinationType]}</Badge>
                        {cfg.cronExpression && <span className="text-xs text-slate-600 font-mono">{cfg.cronExpression}</span>}
                        <span className="text-xs text-slate-600">Retain {cfg.retentionDays}d</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {lastRun && StatusIcon && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <StatusIcon className={`w-3.5 h-3.5 ${statusCfg?.color} ${lastRun.status === 'RUNNING' ? 'animate-spin' : ''}`} />
                        <span className={statusCfg?.color}>{lastRun.status.toLowerCase()}</span>
                        {lastRun.fileSize && <span className="text-slate-600">{formatBytes(Number(lastRun.fileSize))}</span>}
                      </div>
                    )}
                    <button onClick={() => setExpanded(expanded === cfg.id ? null : cfg.id)}
                      className="text-slate-500 hover:text-slate-300 p-1">
                      {expanded === cfg.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => handleToggle(cfg.id, cfg.isActive)}
                      className={`w-8 h-4 rounded-full transition-colors relative ${cfg.isActive ? 'bg-green-600' : 'bg-slate-700'}`}>
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${cfg.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <button onClick={() => handleDelete(cfg.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {expanded === cfg.id && (
                  <div className="border-t border-slate-700/50 px-4 py-3">
                    {lastRun ? (
                      <div className="space-y-1 text-xs text-slate-400">
                        <p>Last run: {formatDistanceToNow(new Date(lastRun.startedAt), { addSuffix: true })}</p>
                        {lastRun.completedAt && <p>Duration: {Math.round((new Date(lastRun.completedAt).getTime() - new Date(lastRun.startedAt).getTime()) / 1000)}s</p>}
                        {lastRun.errorMessage && <p className="text-red-400">Error: {lastRun.errorMessage}</p>}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600">No runs yet.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">New Backup Configuration</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Name</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Daily DB Backup"
                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Destination</label>
              <select value={form.destinationType} onChange={(e) => setForm((f) => ({ ...f, destinationType: e.target.value as DestType }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                {Object.entries(DEST_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Cron Schedule</label>
              <Input value={form.cronExpression} onChange={(e) => setForm((f) => ({ ...f, cronExpression: e.target.value }))}
                placeholder="0 2 * * *"
                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500 font-mono" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Retention (days)</label>
              <Input type="number" value={form.retentionDays} onChange={(e) => setForm((f) => ({ ...f, retentionDays: parseInt(e.target.value) || 30 }))}
                className="bg-slate-900 border-slate-700 text-white focus:border-blue-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={creating} size="sm">
              {creating ? 'Creating...' : 'Create'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-white">Cancel</Button>
          </div>
        </div>
      )}

      {!showForm && (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}
          className="border-slate-700 text-slate-300 hover:bg-slate-800">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Backup Config
        </Button>
      )}
    </div>
  );
}
