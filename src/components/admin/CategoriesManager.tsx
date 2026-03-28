'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2, Tag, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  _count: { processTemplates: number };
}

interface Props {
  categories: Category[];
}

type FormState = { name: string; description: string; color: string };

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// ── Extracted to module level to prevent remount on every render ──────────────
interface InlineFormProps {
  form: FormState;
  setForm: (f: FormState) => void;
  cancel: () => void;
  handleSave: () => void;
  saving: boolean;
}

function InlineForm({ form, setForm, cancel, handleSave, saving }: InlineFormProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            placeholder="Category name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            placeholder="Optional"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setForm({ ...form, color: c })}
              className="w-7 h-7 rounded-full border-2 transition-all"
              style={{
                backgroundColor: c,
                borderColor: form.color === c ? 'white' : 'transparent',
              }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={cancel} className="text-slate-400">
          <X className="w-3.5 h-3.5 mr-1" /> Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          <Check className="w-3.5 h-3.5 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
}

export default function CategoriesManager({ categories: init }: Props) {
  const t = useTranslations('admin.categories');
  const [items, setItems] = useState(init);
  const [editId, setEditId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', description: '', color: COLORS[0] });
  const [saving, setSaving] = useState(false);

  const startCreate = () => { setEditId('new'); setForm({ name: '', description: '', color: COLORS[0] }); };
  const startEdit = (c: Category) => {
    setEditId(c.id);
    setForm({ name: c.name, description: c.description ?? '', color: c.color ?? COLORS[0] });
  };
  const cancel = () => setEditId(null);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required.'); return; }
    setSaving(true);
    try {
      if (editId === 'new') {
        const res = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        const { category } = await res.json();
        setItems((prev) => [...prev, { ...category, _count: { processTemplates: 0 } }]);
        toast.success('Category created.');
      } else {
        const res = await fetch(`/api/admin/categories/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        setItems((prev) => prev.map((c) => (c.id === editId ? { ...c, ...form } : c)));
        toast.success('Category updated.');
      }
      cancel();
    } catch {
      toast.error('Failed to save category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('delete_category') + '?')) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((c) => c.id !== id));
      toast.success('Category deleted.');
    } catch {
      toast.error('Failed to delete category.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={startCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-1.5" />
          {t('add_category')}
        </Button>
      </div>

      {editId === 'new' && (
        <div className="bg-slate-800/50 border border-blue-500/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">{t('add_category')}</h3>
          <InlineForm form={form} setForm={setForm} cancel={cancel} handleSave={handleSave} saving={saving} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500 bg-slate-800/30 rounded-xl">
            {t('no_categories')}
          </div>
        )}
        {items.map((cat) => (
          <div key={cat.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            {editId === cat.id ? (
              <InlineForm form={form} setForm={setForm} cancel={cancel} handleSave={handleSave} saving={saving} />
            ) : (
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${cat.color ?? COLORS[0]}22` }}
                >
                  <Tag className="w-5 h-5" style={{ color: cat.color ?? COLORS[0] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">{cat.name}</p>
                  {cat.description && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">{cat.description}</p>
                  )}
                  <p className="text-xs text-slate-600 mt-0.5">
                    {cat._count.processTemplates} process{cat._count.processTemplates !== 1 ? 'es' : ''}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(cat)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-white">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(cat.id)}
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
