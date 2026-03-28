'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2, Database, Check, X, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Connection {
  id: string;
  name: string;
  serverAddress: string;
  port: number | null;
  databaseName: string;
  username: string;
  tableName: string;
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
  server: string;
  port: string;
  database: string;
  username: string;
  password: string;
  tableName: string;
  isActive: boolean;
};

const blank: FormState = {
  name: '',
  server: '',
  port: '1433',
  database: '',
  username: '',
  password: '',
  tableName: '',
  isActive: true,
};

// ── Extracted to module level to prevent remount on every render ──────────────
interface EditFormProps {
  form: FormState;
  setForm: (f: FormState) => void;
  cancel: () => void;
  handleSave: () => void;
  saving: boolean;
  editId: string | 'new' | null;
  tConn: ReturnType<typeof useTranslations>;
}

function EditForm({ form, setForm, cancel, handleSave, saving, editId, tConn }: EditFormProps) {
  const fields: { key: keyof FormState; label: string; placeholder: string }[] = [
    { key: 'name', label: 'Connection Name *', placeholder: 'e.g. City Hall DB' },
    { key: 'server', label: `${tConn('server_address')} *`, placeholder: '192.168.1.100' },
    { key: 'database', label: `${tConn('database_name')} *`, placeholder: 'LaserficheDB' },
    { key: 'tableName', label: `${tConn('table_name')} *`, placeholder: 'ProcessRequests' },
    { key: 'username', label: `${tConn('username')} *`, placeholder: 'sa' },
    { key: 'port', label: tConn('port'), placeholder: '1433' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
            <input
              type={key === 'port' ? 'number' : 'text'}
              value={form[key] as string}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              placeholder={placeholder}
              className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
        ))}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            {tConn('password')} {editId !== 'new' ? '(leave blank to keep current)' : '*'}
          </label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox" checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          className="w-4 h-4 accent-blue-600"
        />
        <span className="text-sm text-slate-700">Active</span>
      </label>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={cancel} className="text-slate-500">
          <X className="w-3.5 h-3.5 mr-1" /> Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          <Check className="w-3.5 h-3.5 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
}

export default function DbConnectionsManager({ connections: init }: Props) {
  const t = useTranslations('admin.db_connections');
  const [items, setItems] = useState(init);
  const [editId, setEditId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const startCreate = () => { setEditId('new'); setForm(blank); };
  const startEdit = (c: Connection) => {
    setEditId(c.id);
    setForm({
      name: c.name, server: c.serverAddress, port: String(c.port ?? 1433),
      database: c.databaseName, username: c.username, password: '',
      tableName: c.tableName, isActive: c.isActive,
    });
  };
  const cancel = () => setEditId(null);

  const handleSave = async () => {
    if (!form.name || !form.server || !form.database || !form.username || !form.tableName) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, port: form.port ? Number(form.port) : 1433 };
      if (editId === 'new') {
        const res = await fetch('/api/admin/db-connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        const { connection } = await res.json();
        setItems((prev) => [...prev, connection]);
        toast.success('Connection added.');
      } else {
        const res = await fetch(`/api/admin/db-connections/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        setItems((prev) =>
          prev.map((c) =>
            c.id === editId
              ? { ...c, name: form.name, server: form.server, port: Number(form.port) || 1433,
                  database: form.database, username: form.username, tableName: form.tableName, isActive: form.isActive }
              : c
          )
        );
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
    if (!confirm(t('delete_connection') + '?')) return;
    try {
      const res = await fetch(`/api/admin/db-connections/${id}`, { method: 'DELETE' });
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
      const res = await fetch(`/api/admin/db-connections/${id}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(t('test_success'));
        setItems((prev) =>
          prev.map((c) => (c.id === id ? { ...c, lastTestedAt: new Date(), lastTestSuccess: true } : c))
        );
      } else {
        toast.error(t('test_failed', { error: data.error ?? 'Unknown error' }));
        setItems((prev) =>
          prev.map((c) => (c.id === id ? { ...c, lastTestedAt: new Date(), lastTestSuccess: false } : c))
        );
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
          <Plus className="w-4 h-4 mr-1.5" />
          {t('add_connection')}
        </Button>
      </div>

      {editId === 'new' && (
        <div className="bg-white border border-blue-500/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">{t('add_connection')}</h3>
          <EditForm form={form} setForm={setForm} cancel={cancel} handleSave={handleSave} saving={saving} editId={editId} tConn={t} />
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 && (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl">
            {t('no_connections')}
          </div>
        )}
        {items.map((conn) => (
          <div key={conn.id} className="bg-white border border-slate-200 rounded-xl p-4">
            {editId === conn.id ? (
              <>
                <h3 className="text-sm font-semibold text-slate-900 mb-4">{t('edit_connection')}</h3>
                <EditForm form={form} setForm={setForm} cancel={cancel} handleSave={handleSave} saving={saving} editId={editId} tConn={t} />
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Database className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{conn.name}</p>
                    {conn.lastTestSuccess === true && (
                      <Wifi className="w-3.5 h-3.5 text-green-400" />
                    )}
                    {conn.lastTestSuccess === false && (
                      <WifiOff className="w-3.5 h-3.5 text-red-400" />
                    )}
                    {!conn.isActive && (
                      <Badge className="text-xs bg-slate-100 text-slate-500 border-0">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {conn.serverAddress}{conn.port ? `:${conn.port}` : ''} / {conn.databaseName} / {conn.tableName}
                  </p>
                  {conn.lastTestedAt && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      {t('last_tested', { time: new Date(conn.lastTestedAt).toLocaleString() })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm" variant="outline"
                    onClick={() => handleTest(conn.id)}
                    disabled={testing === conn.id}
                    className="h-7 text-xs border-slate-300 text-slate-600 hover:bg-slate-100"
                  >
                    {testing === conn.id ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Wifi className="w-3 h-3 mr-1" />
                    )}
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
