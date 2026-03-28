'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Save, TestTube, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EmailFormData {
  provider: 'smtp' | 'sendgrid' | 'mailgun';
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromAddress: string;
  fromName: string;
}

interface Props {
  initial: Partial<EmailFormData> & { hasPassword?: boolean };
}

const PROVIDER_LABELS = {
  smtp: 'SMTP (generic)',
  sendgrid: 'SendGrid',
  mailgun: 'Mailgun',
};

export default function EmailSettingsForm({ initial }: Props) {
  const [form, setForm] = useState<EmailFormData>({
    provider: initial.provider ?? 'smtp',
    host: initial.host ?? '',
    port: initial.port ?? 587,
    secure: initial.secure ?? false,
    user: initial.user ?? '',
    password: '',
    fromAddress: initial.fromAddress ?? '',
    fromName: initial.fromName ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const set = (key: keyof EmailFormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed');
      toast.success('Email settings saved.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/admin/settings/email/test', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Test email sent successfully!');
      } else {
        toast.error(`Test failed: ${data.error ?? 'Unknown error'}`);
      }
    } catch {
      toast.error('Could not connect to the email server.');
    } finally {
      setTesting(false);
    }
  };

  const showSmtpFields = form.provider === 'smtp' || form.provider === 'mailgun';

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Provider */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <h2 className="text-sm font-semibold text-slate-900">Email Provider</h2>

        <div className="grid grid-cols-3 gap-3">
          {(['smtp', 'sendgrid', 'mailgun'] as const).map((p) => (
            <button
              key={p}
              onClick={() => set('provider', p)}
              className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                form.provider === p
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {PROVIDER_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Connection settings */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Connection</h2>

        {showSmtpFields && (
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">SMTP Host</label>
              <Input
                value={form.host}
                onChange={(e) => set('host', e.target.value)}
                placeholder="smtp.example.com"
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Port</label>
              <Input
                type="number"
                value={form.port}
                onChange={(e) => set('port', parseInt(e.target.value) || 587)}
                className="bg-white border-slate-300 text-slate-900 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {showSmtpFields && (
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.secure}
              onChange={(e) => set('secure', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 bg-white accent-blue-500"
            />
            <span className="text-sm text-slate-700">Use SSL/TLS (port 465)</span>
          </label>
        )}

        <div>
          <label className="block text-xs text-slate-500 mb-1">
            {form.provider === 'sendgrid' ? 'API Key' : 'Username'}
          </label>
          <Input
            value={form.user}
            onChange={(e) => set('user', e.target.value)}
            placeholder={form.provider === 'sendgrid' ? 'SG.xxxxxxx' : 'user@example.com'}
            className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">
            Password {initial.hasPassword ? '(leave blank to keep current)' : ''}
          </label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder={initial.hasPassword ? '••••••••' : 'Enter password'}
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Sender identity */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Sender Identity</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">From Name</label>
            <Input
              value={form.fromName}
              onChange={(e) => set('fromName', e.target.value)}
              placeholder="City Portal"
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">From Address</label>
            <Input
              type="email"
              value={form.fromAddress}
              onChange={(e) => set('fromAddress', e.target.value)}
              placeholder="noreply@cityportal.gov"
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        <Button
          onClick={handleTest}
          disabled={testing}
          variant="outline"
          size="sm"
          className="border-slate-300 text-slate-600 hover:bg-slate-100"
        >
          <TestTube className="w-3.5 h-3.5 mr-1.5" />
          {testing ? 'Testing...' : 'Send Test Email'}
        </Button>
      </div>
    </div>
  );
}
