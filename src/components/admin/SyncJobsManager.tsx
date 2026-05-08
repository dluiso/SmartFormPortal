'use client';

import { useState } from 'react';
import { RefreshCw, Plus, Trash2, Play, AlertTriangle, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface DbConnectionOption {
  id: string;
  name: string;
  serverAddress: string;
  databaseName: string;
}

interface SyncJobRow {
  id: string;
  cronExpression: string;
  isActive: boolean;
  lastRunAt: Date | null;
  lastRunSuccess: boolean | null;
  lastRunError: string | null;
  recordsProcessed: number | null;
  failureCount: number;
  circuitOpen: boolean;
  createdAt: Date;
  dbConnection: { id: string; name: string; serverAddress: string; databaseName: string };
}

interface Props {
  initialJobs: SyncJobRow[];
  dbConnections: DbConnectionOption[];
}

const CRON_PRESETS = [
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour',       value: '0 * * * *' },
  { label: 'Every 2 hours',    value: '0 */2 * * *' },
  { label: 'Every 6 hours',    value: '0 */6 * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Custom…',          value: '__custom__' },
];

const blankForm = { dbConnectionId: '', cronExpression: '*/30 * * * *', isActive: true, customCron: false };

export default function SyncJobsManager({ initialJobs, dbConnections }: Props) {
  const [jobs, setJobs] = useState<SyncJobRow[]>(initialJobs);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const selectedPreset = CRON_PRESETS.find(p => p.value === form.cronExpression && p.value !== '__custom__')?.value
    ?? '__custom__';

  const handlePresetChange = (value: string) => {
    if (value === '__custom__') {
      setForm(f => ({ ...f, cronExpression: '', customCron: true }));
    } else {
      setForm(f => ({ ...f, cronExpression: value, customCron: false }));
    }
  };

  const handleCreate = async () => {
    if (!form.dbConnectionId) { toast.error('Select a DB connection'); return; }
    if (!form.cronExpression) { toast.error('Enter a cron expression'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/sync-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbConnectionId: form.dbConnectionId, cronExpression: form.cronExpression, isActive: form.isActive }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create');
      }
      const created: SyncJobRow = await res.json();
      setJobs(prev => [created, ...prev]);
      setForm(blankForm);
      setShowForm(false);
      toast.success('Sync job created successfully.');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to create sync job.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (job: SyncJobRow) => {
    try {
      const res = await fetch(`/api/admin/sync-jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !job.isActive }),
      });
      if (!res.ok) throw new Error();
      const updated: SyncJobRow = await res.json();
      setJobs(prev => prev.map(j => j.id === job.id ? updated : j));
      toast.success(`Sync job ${updated.isActive ? 'activated' : 'paused'}.`);
    } catch {
      toast.error('Failed to update sync job.');
    }
  };

  const handleResetCircuit = async (job: SyncJobRow) => {
    try {
      const res = await fetch(`/api/admin/sync-jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ circuitOpen: false, failureCount: 0 }),
      });
      if (!res.ok) throw new Error();
      const updated: SyncJobRow = await res.json();
      setJobs(prev => prev.map(j => j.id === job.id ? updated : j));
      toast.success('Circuit breaker reset. Sync will resume.');
    } catch {
      toast.error('Failed to reset circuit breaker.');
    }
  };

  const handleTrigger = async (jobId: string) => {
    setTriggering(jobId);
    try {
      const res = await fetch(`/api/admin/sync-jobs/${jobId}/trigger`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Trigger failed');
      toast.success(`Sync complete — ${data.synced} synced, ${data.errors} errors.`);
      // Refresh job status
      const listRes = await fetch('/api/admin/sync-jobs');
      if (listRes.ok) setJobs(await listRes.json());
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Sync trigger failed.');
    } finally {
      setTriggering(null);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('Delete this sync job? Automatic syncing will stop.')) return;
    setDeleting(jobId);
    try {
      const res = await fetch(`/api/admin/sync-jobs/${jobId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setJobs(prev => prev.filter(j => j.id !== jobId));
      toast.success('Sync job deleted.');
    } catch {
      toast.error('Failed to delete sync job.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Configure automatic sync schedules between Laserfiche MSSQL and the portal.
        </p>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Sync Job
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-slate-800 text-sm">New Sync Job</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">DB Connection *</label>
              <select
                value={form.dbConnectionId}
                onChange={e => setForm(f => ({ ...f, dbConnectionId: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select a connection…</option>
                {dbConnections.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.serverAddress}/{c.databaseName})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Schedule *</label>
              <select
                value={selectedPreset}
                onChange={e => handlePresetChange(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-blue-500"
              >
                {CRON_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            {(form.customCron || !CRON_PRESETS.find(p => p.value === form.cronExpression && p.value !== '__custom__')) && (
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Custom Cron Expression</label>
                <input
                  type="text"
                  value={form.cronExpression}
                  onChange={e => setForm(f => ({ ...f, cronExpression: e.target.value }))}
                  placeholder="*/30 * * * *"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">Standard cron format: min hour day month weekday</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="rounded border-slate-300"
              />
              <label htmlFor="isActive" className="text-sm text-slate-700">Active immediately</label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setForm(blankForm); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Jobs list */}
      {jobs.length === 0 && !showForm ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No sync jobs configured</p>
          <p className="text-xs mt-1">Create a sync job to automatically pull Laserfiche status updates.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Top row: name + status badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-800 text-sm">{job.dbConnection.name}</span>
                    <span className="text-xs text-slate-400">{job.dbConnection.serverAddress}/{job.dbConnection.databaseName}</span>
                    {job.isActive ? (
                      <Badge className="bg-green-100 text-green-700 border-0 text-xs">Active</Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-500 border-0 text-xs">Paused</Badge>
                    )}
                    {job.circuitOpen && (
                      <Badge className="bg-red-100 text-red-700 border-0 text-xs flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Circuit Open
                      </Badge>
                    )}
                  </div>

                  {/* Schedule */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{job.cronExpression}</span>
                    <span>— {CRON_PRESETS.find(p => p.value === job.cronExpression)?.label ?? 'Custom schedule'}</span>
                  </div>

                  {/* Last run status */}
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {job.lastRunAt ? (
                      <>
                        {job.lastRunSuccess === true && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                        {job.lastRunSuccess === false && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                        <span>Last run: {new Date(job.lastRunAt).toLocaleString()}</span>
                        {job.recordsProcessed !== null && (
                          <span className="text-slate-400">· {job.recordsProcessed} record{job.recordsProcessed !== 1 ? 's' : ''} synced</span>
                        )}
                        {job.failureCount > 0 && (
                          <span className="text-amber-600">{job.failureCount} consecutive failure{job.failureCount !== 1 ? 's' : ''}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400 italic">Never run</span>
                    )}
                  </div>

                  {job.lastRunError && (
                    <p className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded font-mono truncate">
                      {job.lastRunError}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {job.circuitOpen && (
                    <Button
                      size="sm" variant="outline"
                      onClick={() => handleResetCircuit(job)}
                      className="h-7 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 gap-1"
                    >
                      <Zap className="w-3 h-3" /> Reset Circuit
                    </Button>
                  )}
                  <Button
                    size="sm" variant="outline"
                    disabled={triggering === job.id}
                    onClick={() => handleTrigger(job.id)}
                    className="h-7 text-xs gap-1"
                    title="Run sync now"
                  >
                    {triggering === job.id
                      ? <RefreshCw className="w-3 h-3 animate-spin" />
                      : <Play className="w-3 h-3" />}
                    {triggering === job.id ? 'Running…' : 'Run Now'}
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => handleToggleActive(job)}
                    className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                    title={job.isActive ? 'Pause sync' : 'Resume sync'}
                  >
                    {job.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    disabled={deleting === job.id}
                    onClick={() => handleDelete(job.id)}
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    title="Delete sync job"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
