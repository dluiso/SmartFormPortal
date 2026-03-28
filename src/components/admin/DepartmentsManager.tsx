'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2, Building2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Department {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count: { staff: number };
}

interface Props {
  departments: Department[];
  tenantId: string;
}

interface FormState {
  name: string;
  description: string;
  isActive: boolean;
}

const blank: FormState = { name: '', description: '', isActive: true };

export default function DepartmentsManager({ departments: init }: Props) {
  const t = useTranslations('admin.departments');
  const [items, setItems] = useState(init);
  const [editId, setEditId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);

  const startCreate = () => {
    setEditId('new');
    setForm(blank);
  };

  const startEdit = (d: Department) => {
    setEditId(d.id);
    setForm({ name: d.name, description: d.description ?? '', isActive: d.isActive });
  };

  const cancel = () => { setEditId(null); setForm(blank); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required.'); return; }
    setSaving(true);
    try {
      if (editId === 'new') {
        const res = await fetch('/api/admin/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        const { department } = await res.json();
        setItems((prev) => [...prev, { ...department, _count: { staff: 0 } }]);
        toast.success('Department created.');
      } else {
        const res = await fetch(`/api/admin/departments/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        setItems((prev) =>
          prev.map((d) => (d.id === editId ? { ...d, ...form } : d))
        );
        toast.success('Department updated.');
      }
      cancel();
    } catch {
      toast.error('Failed to save department.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('delete_department') + '?')) return;
    try {
      const res = await fetch(`/api/admin/departments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((d) => d.id !== id));
      toast.success('Department deleted.');
    } catch {
      toast.error('Failed to delete department.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={startCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-1.5" />
          {t('add_department')}
        </Button>
      </div>

      {/* Inline create form */}
      {editId === 'new' && (
        <div className="bg-white border border-blue-500/50 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">{t('add_department')}</h3>
          <FormFields form={form} onChange={setForm} />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={cancel} className="text-slate-500">
              <X className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              <Check className="w-3.5 h-3.5 mr-1" /> Save
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 && (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl">
            {t('no_departments')}
          </div>
        )}
        {items.map((dept) => (
          <div
            key={dept.id}
            className="bg-white border border-slate-200 rounded-xl p-4"
          >
            {editId === dept.id ? (
              <div className="space-y-3">
                <FormFields form={form} onChange={setForm} />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={cancel} className="text-slate-500">
                    <X className="w-3.5 h-3.5 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                    <Check className="w-3.5 h-3.5 mr-1" /> Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{dept.name}</p>
                    {!dept.isActive && (
                      <Badge className="text-xs bg-slate-100 text-slate-500 border-0">Inactive</Badge>
                    )}
                  </div>
                  {dept.description && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">{dept.description}</p>
                  )}
                  <p className="text-xs text-slate-600 mt-0.5">
                    {t('staff_count', { count: dept._count.staff })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => startEdit(dept)}
                    className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => handleDelete(dept.id)}
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                  >
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

function FormFields({
  form,
  onChange,
}: {
  form: { name: string; description: string; isActive: boolean };
  onChange: (f: { name: string; description: string; isActive: boolean }) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          placeholder="Department name"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          placeholder="Optional description"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="dept-active"
          checked={form.isActive}
          onChange={(e) => onChange({ ...form, isActive: e.target.checked })}
          className="w-4 h-4 accent-blue-600"
        />
        <label htmlFor="dept-active" className="text-sm text-slate-700">Active</label>
      </div>
    </div>
  );
}
