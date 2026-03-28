'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

interface TenantSettings {
  id: string;
  allowRegistration: boolean;
  defaultLanguage: string;
  maintenanceMode: boolean;
}

interface Props {
  settings: TenantSettings | null;
}

export default function GeneralSettingsForm({ settings }: Props) {
  const t = useTranslations('admin.settings.general');
  const [form, setForm] = useState({
    allowRegistration: settings?.allowRegistration ?? true,
    maintenanceMode: settings?.maintenanceMode ?? false,
    defaultLanguage: settings?.defaultLanguage ?? 'en',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/general', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(t('saved'));
    } catch {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">{t('default_language')}</label>
          <select
            value={form.defaultLanguage}
            onChange={(e) => setForm({ ...form, defaultLanguage: e.target.value })}
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>

        <div className="space-y-3">
          {(
            [
              { key: 'allowRegistration', label: t('allow_registration') },
              { key: 'maintenanceMode', label: 'Maintenance Mode' },
            ] as { key: keyof typeof form; label: string }[]
          ).map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between">
              <span className="text-sm text-slate-700">{label}</span>
              <div
                onClick={() => setForm({ ...form, [key]: !form[key] })}
                className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${form[key] ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </div>
            </label>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
        <Save className="w-4 h-4 mr-1.5" />
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
}
