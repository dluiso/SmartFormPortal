'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2, FileText, Globe, Check, X, ChevronDown, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  description: string | null;
  publicUrl: string | null;
  isPublic: boolean;
  isActive: boolean;
  requiresRenewal: boolean;
  sortOrder: number;
  availableFrom: Date | null;
  availableUntil: Date | null;
  category: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  dbConnection: { id: string; name: string } | null;
}

interface Props {
  templates: Template[];
  categories: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  dbConnections: { id: string; name: string }[];
}

type FormState = {
  name: string;
  description: string;
  publicUrl: string;
  isPublic: boolean;
  isActive: boolean;
  requiresRenewal: boolean;
  sortOrder: number;
  availableFrom: string;
  availableUntil: string;
  categoryId: string;
  departmentId: string;
  dbConnectionId: string;
};

const blank: FormState = {
  name: '',
  description: '',
  publicUrl: '',
  isPublic: true,
  isActive: true,
  requiresRenewal: false,
  sortOrder: 0,
  availableFrom: '',
  availableUntil: '',
  categoryId: '',
  departmentId: '',
  dbConnectionId: '',
};

// ── Extracted to module level to prevent remount on every render ──────────────
interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; name: string }[];
  placeholder: string;
}

function SelectField({ label, value, onChange, options, placeholder }: SelectFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 pr-8 appearance-none focus:outline-none focus:border-blue-500"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
      </div>
    </div>
  );
}

interface EditFormProps {
  form: FormState;
  setForm: (f: FormState) => void;
  cancel: () => void;
  handleSave: () => void;
  saving: boolean;
  categories: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  dbConnections: { id: string; name: string }[];
  tProc: ReturnType<typeof useTranslations>;
}

function EditForm({ form, setForm, cancel, handleSave, saving, categories, departments, dbConnections, tProc }: EditFormProps) {
  const checkboxFields: { key: keyof FormState; label: string }[] = [
    { key: 'isPublic', label: tProc('is_public') },
    { key: 'isActive', label: 'Active' },
    { key: 'requiresRenewal', label: tProc('requires_renewal') },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{tProc('public_url')}</label>
          <input
            type="url"
            value={form.publicUrl}
            onChange={(e) => setForm({ ...form, publicUrl: e.target.value })}
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            placeholder="https://..."
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
        <SelectField label="Category" value={form.categoryId}
          onChange={(v) => setForm({ ...form, categoryId: v })}
          options={categories} placeholder="No category" />
        <SelectField label="Department" value={form.departmentId}
          onChange={(v) => setForm({ ...form, departmentId: v })}
          options={departments} placeholder="No department" />
        <SelectField label={tProc('db_connection')} value={form.dbConnectionId}
          onChange={(v) => setForm({ ...form, dbConnectionId: v })}
          options={dbConnections} placeholder="None (manual only)" />
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Sort Order</label>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{tProc('available_from')}</label>
          <input
            type="date"
            value={form.availableFrom}
            onChange={(e) => setForm({ ...form, availableFrom: e.target.value })}
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{tProc('available_until')}</label>
          <input
            type="date"
            value={form.availableUntil}
            onChange={(e) => setForm({ ...form, availableUntil: e.target.value })}
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        {checkboxFields.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form[key] as boolean}
              onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-slate-700">{label}</span>
          </label>
        ))}
      </div>
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

export default function ProcessTemplatesManager({ templates: init, categories, departments, dbConnections }: Props) {
  const t = useTranslations('admin.processes');
  const [items, setItems] = useState(init);
  const [editId, setEditId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);

  const toForm = (tmpl: Template): FormState => ({
    name: tmpl.name,
    description: tmpl.description ?? '',
    publicUrl: tmpl.publicUrl ?? '',
    isPublic: tmpl.isPublic,
    isActive: tmpl.isActive,
    requiresRenewal: tmpl.requiresRenewal,
    sortOrder: tmpl.sortOrder,
    availableFrom: tmpl.availableFrom ? new Date(tmpl.availableFrom).toISOString().slice(0, 10) : '',
    availableUntil: tmpl.availableUntil ? new Date(tmpl.availableUntil).toISOString().slice(0, 10) : '',
    categoryId: tmpl.category?.id ?? '',
    departmentId: tmpl.department?.id ?? '',
    dbConnectionId: tmpl.dbConnection?.id ?? '',
  });

  const startCreate = () => { setEditId('new'); setForm(blank); };
  const startEdit = (tmpl: Template) => { setEditId(tmpl.id); setForm(toForm(tmpl)); };
  const cancel = () => setEditId(null);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        availableFrom: form.availableFrom || null,
        availableUntil: form.availableUntil || null,
        categoryId: form.categoryId || null,
        departmentId: form.departmentId || null,
        dbConnectionId: form.dbConnectionId || null,
      };
      if (editId === 'new') {
        const res = await fetch('/api/admin/process-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        const { template } = await res.json();
        setItems((prev) => [
          ...prev,
          {
            ...template,
            category: categories.find((c) => c.id === form.categoryId) ?? null,
            department: departments.find((d) => d.id === form.departmentId) ?? null,
            dbConnection: dbConnections.find((d) => d.id === form.dbConnectionId) ?? null,
          },
        ]);
        toast.success('Process template created.');
      } else {
        const res = await fetch(`/api/admin/process-templates/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        setItems((prev) =>
          prev.map((tmpl) =>
            tmpl.id === editId
              ? {
                  ...tmpl,
                  ...payload,
                  availableFrom: payload.availableFrom ? new Date(payload.availableFrom) : null,
                  availableUntil: payload.availableUntil ? new Date(payload.availableUntil) : null,
                  category: categories.find((c) => c.id === form.categoryId) ?? null,
                  department: departments.find((d) => d.id === form.departmentId) ?? null,
                  dbConnection: dbConnections.find((d) => d.id === form.dbConnectionId) ?? null,
                }
              : tmpl
          )
        );
        toast.success('Process template updated.');
      }
      cancel();
    } catch {
      toast.error('Failed to save process template.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('delete_process') + '?')) return;
    try {
      const res = await fetch(`/api/admin/process-templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((tmpl) => tmpl.id !== id));
      toast.success('Process template deleted.');
    } catch {
      toast.error('Failed to delete process template.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={startCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-1.5" />
          {t('add_process')}
        </Button>
      </div>

      {editId === 'new' && (
        <div className="bg-white border border-blue-500/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">{t('add_process')}</h3>
          <EditForm form={form} setForm={setForm} cancel={cancel} handleSave={handleSave} saving={saving}
            categories={categories} departments={departments} dbConnections={dbConnections} tProc={t} />
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 && (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl">
            {t('no_processes')}
          </div>
        )}
        {items.map((tmpl) => (
          <div key={tmpl.id} className="bg-white border border-slate-200 rounded-xl p-4">
            {editId === tmpl.id ? (
              <>
                <h3 className="text-sm font-semibold text-slate-900 mb-4">{t('edit_process')}</h3>
                <EditForm form={form} setForm={setForm} cancel={cancel} handleSave={handleSave} saving={saving}
                  categories={categories} departments={departments} dbConnections={dbConnections} tProc={t} />
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-900">{tmpl.name}</p>
                    {!tmpl.isActive && (
                      <Badge className="text-xs bg-slate-100 text-slate-500 border-0">Inactive</Badge>
                    )}
                    {!tmpl.isPublic && (
                      <Badge className="text-xs bg-orange-100 text-orange-700 border-0">Hidden</Badge>
                    )}
                    {tmpl.requiresRenewal && (
                      <Badge className="text-xs bg-purple-100 text-purple-700 border-0">Renewal</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {tmpl.category && (
                      <span className="text-xs text-slate-500">{tmpl.category.name}</span>
                    )}
                    {tmpl.department && (
                      <span className="text-xs text-slate-500">{tmpl.department.name}</span>
                    )}
                    {tmpl.publicUrl && (
                      <Globe className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <a
                    href={`/admin/processes/${tmpl.id}/mappings`}
                    title="Field Mappings"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                  </a>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(tmpl)}
                    className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(tmpl.id)}
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
