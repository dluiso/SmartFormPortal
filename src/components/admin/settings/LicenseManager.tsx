'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldCheck, ShieldX, Clock, RefreshCw, KeyRound } from 'lucide-react';

type LicenseInfo = {
  id: string;
  licenseKey: string;
  licenseType: string;
  planName?: string;
  isActive: boolean;
  activatedAt: string | null;
  expiresAt: string | null;
  domain: string | null;
  lastValidatedAt: string;
};

export default function LicenseManager({ initial }: { initial: LicenseInfo | null }) {
  const t = useTranslations('admin.settings.license');
  const [license, setLicense] = useState<LicenseInfo | null>(initial);
  const [validating, setValidating] = useState(false);
  const [validationMsg, setValidationMsg] = useState('');
  const [validationOk, setValidationOk] = useState<boolean | null>(null);

  // Activation form state
  const [showActivate, setShowActivate] = useState(!initial);
  const [key, setKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState('');

  async function handleValidate() {
    setValidating(true);
    setValidationMsg('');
    setValidationOk(null);
    try {
      const res = await fetch('/api/admin/settings/license/validate', { method: 'POST' });
      const data = await res.json() as { valid: boolean; reason?: string; plan?: string };
      setValidationOk(data.valid);
      if (data.valid) {
        setValidationMsg(t('validation_ok'));
        // Refresh license info
        const licRes = await fetch('/api/admin/settings/license');
        const licData = await licRes.json() as { license: LicenseInfo | null };
        setLicense(licData.license);
      } else {
        setValidationMsg(t('validation_failed', { error: data.reason ?? 'unknown' }));
      }
    } finally {
      setValidating(false);
    }
  }

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setActivateError('');
    setActivating(true);
    try {
      const res = await fetch('/api/admin/settings/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key }),
      });
      const data = await res.json() as { ok?: boolean; license?: LicenseInfo & { planName?: string }; error?: string };
      if (!res.ok) {
        setActivateError(data.error ?? 'Failed');
        return;
      }
      setLicense(data.license!);
      setShowActivate(false);
    } finally {
      setActivating(false);
    }
  }

  const isExpired = license?.expiresAt ? new Date(license.expiresAt) < new Date() : false;
  const expiresIn = license?.expiresAt
    ? Math.ceil((new Date(license.expiresAt).getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {license && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          license.isActive && !isExpired
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {license.isActive && !isExpired
            ? <ShieldCheck size={20} />
            : <ShieldX size={20} />
          }
          <span className="text-sm font-medium">
            {license.isActive && !isExpired ? t('active') : isExpired ? t('expired') : t('inactive')}
          </span>
          {expiresIn !== null && expiresIn > 0 && expiresIn <= 30 && (
            <span className="ml-auto text-xs flex items-center gap-1">
              <Clock size={12} />
              {t('expiring_soon', { date: new Date(license.expiresAt!).toLocaleDateString() })}
            </span>
          )}
        </div>
      )}

      {/* License details */}
      {license && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
          <Row label={t('license_key')} value={
            <span className="font-mono text-xs">{license.licenseKey}</span>
          } />
          {license.planName ? (
            <Row label={t('plan_name')} value={license.planName} />
          ) : (
            <Row label={t('plan_name')} value={license.licenseType} />
          )}
          <Row label={t('expires_at')} value={
            license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : '∞'
          } />
          <Row label={t('domain')} value={license.domain ?? '—'} />
          <Row label={t('last_validated')} value={
            new Date(license.lastValidatedAt).toLocaleString()
          } />
        </div>
      )}

      {/* Validation result */}
      {validationMsg && (
        <div className={`text-sm px-4 py-3 rounded-xl border ${
          validationOk
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {validationMsg}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {license && (
          <button
            onClick={handleValidate}
            disabled={validating}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw size={14} className={validating ? 'animate-spin' : ''} />
            {validating ? t('validating') : t('validate_now')}
          </button>
        )}
        <button
          onClick={() => setShowActivate((v) => !v)}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <KeyRound size={14} />
          {license ? t('renew') : t('activate')}
        </button>
      </div>

      {/* Activation form */}
      {showActivate && (
        <form onSubmit={handleActivate} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-sm text-slate-500">{t('not_configured')}</p>
          <div>
            <label className="block text-xs text-slate-600 mb-1">{t('enter_key')}</label>
            <input
              required
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {activateError && <p className="text-red-400 text-xs">{activateError}</p>}
          <button
            type="submit"
            disabled={activating}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg"
          >
            {activating ? '…' : t('activate_btn')}
          </button>
        </form>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm py-2 border-b border-slate-200 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 text-right">{value}</span>
    </div>
  );
}
