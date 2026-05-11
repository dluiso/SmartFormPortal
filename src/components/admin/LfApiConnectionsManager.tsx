'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2, Check, X, Wifi, WifiOff, Loader2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Connection {
  id: string;
  name: string;
  description: string | null;
  baseUrl: string;
  repositoryId: string;
  apiVersion: string;
  username: string;
  isActive: boolean;
  lastTestedAt: Date | null;
  lastTestSuccess: boolean | null;
  createdAt: Date;
}

interface Props {
  connections: Connection[];
}

type FormState = {
  name: string;
  description: string;
  baseUrl: string;
  repositoryId: string;
  apiVersion: string;
  username: string;
  password: string;
  isActive: boolean;
};

const blank: FormState = {
  name: '', description: '', baseUrl: '', repositoryId: '',
  apiVersion: 'v1', username: '', password: '', isActive: true,
};

interface EditFormProps {
  form: FormState;
  setForm: (f: FormState) => void;
  cancel: () => void;
  handleSave: () => void;
  saving: boolean;
  editId: string | 'new' | null;
  t: ReturnType<typeof useTranslations>;
}

function EditForm({ form, setForm, cancel, handleSave, saving, editId, t }: EditFormProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Connection Name *</label>
          <input type="text" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. City Hall LF API"
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t('api_version')} *</label>
          <select value={form.apiVersion} onChange={(e) => setForm({ ...form, apiVersion: e.target.value })}
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
            <option value="v1">v1 (Self-Hosted)</option>
            <option value="v2">v2 (Self-Hosted / Cloud)</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">{t('base_url')} *</label>
          <input type="url" value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
            placeholder="https://laserfiche.yourdomain.com/LFRepositoryAPI"
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
          <p className="text-xs text-slate-400 mt-1">Base URL of the LF API Server — same host as your Swagger UI but without /swagger.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t('repository_id')} *</label>
          <input type="text" value={form.repositoryId}
            onChange={(e) => setForm({ ...form, repositoryId: e.target.value })}
            placeholder="e.g. LSFCustomerPortal"
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
          <p className="text-xs text-slate-400 mt-1">Repository name as shown in the LF Web Client URL.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t('username')} *</label>
          <input type="text" value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="service-account"
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            {t('password')} {editId !== 'new' ? '(leave blank to keep current)' : '*'}
          </label>
          <input type="password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Description (optional)</label>
          <input type="text" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="e.g. Production LF instance"
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
        </div>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          className="w-4 h-4 accent-blue-600" />
        <span className="text-sm text-slate-700">Active</span>
      </label>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={cancel} className="text-slate-500">
          <X className="w-3.5 h-3.5 mr-1" /> Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          <Check className="w-3.5 h-3.5 mr-1" /> {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

export default function LfApiConnectionsManager({ connections: init }: Props) {
  const t = useTranslations('admin.lf_api_connections');
  const [items, setItems] = useState(init);
  const [editId, setEditId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const startCreate = () => { setEditId('new'); setForm(blank); };
  const startEdit = (c: Connection) => {
    setEditId(c.id);
    setForm({ name: c.name, description: c.description ?? '', baseUrl: c.baseUrl,
              repositoryId: c.repositoryId, apiVersion: c.apiVersion,
              username: c.username, password: '', isActive: c.isActive });
  };
  const cancel = () => setEditId(null);

  const handleSave = async () => {
    if (!form.name || !form.baseUrl || !form.repositoryId || !form.username) {
      toast.error('Please fill in all required fields.'); return;
    }
    if (editId === 'new' && !form.password) {
      toast.error('Password is required for new connections.'); return;
    }
    setSaving(true);
    try {
      if (editId === 'new') {
        const res = await fetch('/api/admin/lf-api-connections', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        const { connection } = await res.json();
        setItems((prev) => [...prev, connection]);
        toast.success('Connection added.');
      } else {
        const res = await fetch(`/api/admin/lf-api-connections/${editId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        setItems((prev) => prev.map((c) => c.id === editId ? { ...c, ...form } : c));
        toast.success('Connection updated.');
      }
      cancel();
    } catch {
      toast.error('Failed to save connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this LF API connection?')) return;
    try {
      const res = await fetch(`/api/admin/lf-api-connections/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((c) => c.id !== id));
      toast.success('Connection deleted.');
    } catch {
      toast.error('Failed to delete connection.');
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      const res = await fetch(`/api/admin/lf-api-connections/${id}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(t('test_success'));
        setItems((prev) => prev.map((c) => c.id === id ? { ...c, lastTestedAt: new Date(), lastTestSuccess: true } : c));
      } else {
        toast.error(t('test_failed', { error: data.error ?? 'Unknown error' }));
        setItems((prev) => prev.map((c) => c.id === id ? { ...c, lastTestedAt: new Date(), lastTestSuccess: false } : c));
      }
    } catch {
      toast.error('Test request failed.');
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={startCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-1.5" /> {t('add_connection')}
        </Button>
      </div>

      {editId === 'new' && (
        <div className="bg-white border border-blue-500/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">{t('add_connection')}</h3>
          <EditForm form={form} setForm={setForm} cancel={cancel} handleSave={handleSave} saving={saving} editId={editId} t={t} />
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 && (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl">{t('no_connections')}</div>
        )}
        {items.map((conn) => (
          <div key={conn.id} className="bg-white border border-slate-200 rounded-xl p-4">
            {editId === conn.id ? (
              <>
                <h3 className="text-sm font-semibold text-slate-900 mb-4">{t('edit_connection')}</h3>
                <EditForm form={form} setForm={setForm} cancel={cancel} handleSave={handleSave} saving={saving} editId={editId} t={t} />
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Link2 className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{conn.name}</p>
                    <Badge className="text-xs bg-slate-100 text-slate-500 border-0">{conn.apiVersion.toUpperCase()}</Badge>
                    {conn.lastTestSuccess === true && <Wifi className="w-3.5 h-3.5 text-green-400" />}
                    {conn.lastTestSuccess === false && <WifiOff className="w-3.5 h-3.5 text-red-400" />}
                    {!conn.isActive && <Badge className="text-xs bg-slate-100 text-slate-500 border-0">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{conn.baseUrl} / {conn.repositoryId}</p>
                  {conn.lastTestedAt && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t('last_tested', { time: new Date(conn.lastTestedAt).toLocaleString() })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => handleTest(conn.id)} disabled={testing === conn.id}
                    className="h-7 text-xs border-slate-300 text-slate-600 hover:bg-slate-100">
                    {testing === conn.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Wifi className="w-3 h-3 mr-1" />}
                    Test
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(conn)}
                    className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(conn.id)}
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
