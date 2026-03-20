'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Save, Palette, Type, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FormData {
  portalName: string;
  logoUrl: string;
  faviconUrl: string;
  loginBgColor: string;
  loginBgImageUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  customCss: string;
}

interface Props {
  initial: Partial<Record<keyof FormData, string | null>>;
}

const COLOR_PRESETS = {
  blue:   { primaryColor: '#3b82f6', secondaryColor: '#64748b', accentColor: '#f59e0b' },
  green:  { primaryColor: '#22c55e', secondaryColor: '#64748b', accentColor: '#f59e0b' },
  purple: { primaryColor: '#a855f7', secondaryColor: '#64748b', accentColor: '#06b6d4' },
  red:    { primaryColor: '#ef4444', secondaryColor: '#64748b', accentColor: '#f59e0b' },
};

export default function CustomizationForm({ initial }: Props) {
  const [form, setForm] = useState<FormData>({
    portalName:      initial.portalName      ?? 'SmartFormPortal',
    logoUrl:         initial.logoUrl         ?? '',
    faviconUrl:      initial.faviconUrl      ?? '',
    loginBgColor:    initial.loginBgColor    ?? '',
    loginBgImageUrl: initial.loginBgImageUrl ?? '',
    primaryColor:    initial.primaryColor    ?? '#3b82f6',
    secondaryColor:  initial.secondaryColor  ?? '#64748b',
    accentColor:     initial.accentColor     ?? '#f59e0b',
    customCss:       initial.customCss       ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const applyPreset = (preset: keyof typeof COLOR_PRESETS) => {
    setForm((f) => ({ ...f, ...COLOR_PRESETS[preset] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/customization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          logoUrl:         form.logoUrl         || null,
          faviconUrl:      form.faviconUrl       || null,
          loginBgColor:    form.loginBgColor     || null,
          loginBgImageUrl: form.loginBgImageUrl  || null,
          customCss:       form.customCss        || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed');
      toast.success('Customization saved.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Identity */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Type className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white">Portal Identity</h2>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Portal Name</label>
          <Input value={form.portalName} onChange={(e) => set('portalName', e.target.value)}
            className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Logo URL</label>
            <Input value={form.logoUrl} onChange={(e) => set('logoUrl', e.target.value)}
              placeholder="https://..."
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Favicon URL</label>
            <Input value={form.faviconUrl} onChange={(e) => set('faviconUrl', e.target.value)}
              placeholder="https://..."
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500" />
          </div>
        </div>
        {form.logoUrl && (
          <div className="mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.logoUrl} alt="Logo preview" className="h-10 object-contain opacity-80" />
          </div>
        )}
      </div>

      {/* Login background */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Image className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white">Login Page Background</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Background Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.loginBgColor || '#0f172a'}
                onChange={(e) => set('loginBgColor', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
              <Input value={form.loginBgColor} onChange={(e) => set('loginBgColor', e.target.value)}
                placeholder="#0f172a"
                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500 font-mono" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Background Image URL</label>
            <Input value={form.loginBgImageUrl} onChange={(e) => set('loginBgImageUrl', e.target.value)}
              placeholder="https://..."
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500" />
          </div>
        </div>
      </div>

      {/* Colors */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white">Color Scheme</h2>
        </div>

        {/* Presets */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Presets:</span>
          {Object.keys(COLOR_PRESETS).map((k) => (
            <button key={k} onClick={() => applyPreset(k as keyof typeof COLOR_PRESETS)}
              className="w-6 h-6 rounded-full border-2 border-slate-600 hover:border-slate-400 transition-all"
              style={{ backgroundColor: COLOR_PRESETS[k as keyof typeof COLOR_PRESETS].primaryColor }}
              title={k} />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {([
            ['primaryColor',   'Primary'],
            ['secondaryColor', 'Secondary'],
            ['accentColor',    'Accent'],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs text-slate-500 mb-1">{label}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                <Input value={form[key]} onChange={(e) => set(key, e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white focus:border-blue-500 font-mono text-sm" />
              </div>
            </div>
          ))}
        </div>

        {/* Live preview */}
        <div className="mt-2 flex items-center gap-3">
          <div className="h-8 px-4 rounded-lg flex items-center text-white text-xs font-medium"
            style={{ backgroundColor: form.primaryColor }}>Primary</div>
          <div className="h-8 px-4 rounded-lg flex items-center text-white text-xs font-medium"
            style={{ backgroundColor: form.secondaryColor }}>Secondary</div>
          <div className="h-8 px-4 rounded-lg flex items-center text-white text-xs font-medium"
            style={{ backgroundColor: form.accentColor }}>Accent</div>
        </div>
      </div>

      {/* Custom CSS */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">Custom CSS</h2>
        <p className="text-xs text-slate-500">Injected into every portal page. Use with caution.</p>
        <textarea
          value={form.customCss}
          onChange={(e) => set('customCss', e.target.value)}
          rows={8}
          placeholder=":root { --primary: #3b82f6; }"
          className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono resize-y"
        />
      </div>

      <Button onClick={handleSave} disabled={saving} size="sm">
        <Save className="w-3.5 h-3.5 mr-1.5" />
        {saving ? 'Saving...' : 'Save Customization'}
      </Button>
    </div>
  );
}
