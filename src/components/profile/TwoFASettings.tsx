'use client';

import { useState } from 'react';
import { Shield, ShieldCheck, QrCode, Eye, EyeOff, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface Props {
  enabled: boolean;
  onStatusChange?: (enabled: boolean) => void;
}

export default function TwoFASettings({ enabled: initialEnabled, onStatusChange }: Props) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [phase, setPhase] = useState<'idle' | 'setup' | 'verify' | 'disable'>('idle');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [otpauthUri, setOtpauthUri] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSetup() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/2fa/setup');
      const data = await res.json() as { qrDataUrl?: string; otpauthUri?: string; error?: string };
      if (!res.ok) { setError(data.error ?? 'Failed to start setup'); return; }
      setQrDataUrl(data.qrDataUrl ?? '');
      setOtpauthUri(data.otpauthUri ?? '');
      setPhase('setup');
    } finally { setLoading(false); }
  }

  async function handleEnable() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? 'Invalid code'); return; }
      setPhase('idle');
      setCode('');
      setIsEnabled(true);
      onStatusChange?.(true);
    } finally { setLoading(false); }
  }

  async function handleDisable() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? 'Failed to disable 2FA'); return; }
      setPhase('idle');
      setPassword('');
      setIsEnabled(false);
      onStatusChange?.(false);
    } finally { setLoading(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3 mb-4">
        {isEnabled
          ? <ShieldCheck size={18} className="text-emerald-500" />
          : <Shield size={18} className="text-slate-400" />
        }
        <div>
          <p className="text-sm font-semibold text-slate-900">Two-Factor Authentication</p>
          <p className="text-xs text-slate-500">
            {isEnabled ? 'Enabled — your account is protected.' : 'Disabled — add an extra layer of security.'}
          </p>
        </div>
        <span className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-full ${
          isEnabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-500'
        }`}>
          {isEnabled ? 'ON' : 'OFF'}
        </span>
      </div>

      {phase === 'idle' && (
        <button
          onClick={isEnabled ? () => setPhase('disable') : handleSetup}
          disabled={loading}
          className={`text-sm px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
            enabled
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading && <Loader2 size={12} className="inline animate-spin mr-1" />}
          {isEnabled ? 'Disable 2FA' : 'Enable 2FA'}
        </button>
      )}

      {phase === 'setup' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.).
          </p>
          {qrDataUrl && (
            <div className="flex justify-center">
              <Image src={qrDataUrl} alt="2FA QR Code" width={200} height={200} className="rounded-lg" />
            </div>
          )}
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer hover:text-slate-700 flex items-center gap-1">
              <QrCode size={12} /> Can&apos;t scan? Enter manually
            </summary>
            <code className="block mt-2 p-2 bg-slate-50 rounded text-xs break-all text-slate-700">{otpauthUri}</code>
          </details>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter 6-digit code"
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleEnable}
              disabled={loading || code.length !== 6}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm py-2 rounded-lg transition-colors"
            >
              {loading ? 'Verifying…' : 'Confirm & Enable'}
            </button>
            <button
              onClick={() => { setPhase('idle'); setCode(''); setError(''); }}
              className="px-3 py-2 text-slate-500 hover:text-slate-900 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {phase === 'disable' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">Enter your password to disable 2FA.</p>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Current password"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 pr-9 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleDisable}
              disabled={loading || !password}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm py-2 rounded-lg transition-colors"
            >
              {loading ? 'Disabling…' : 'Disable 2FA'}
            </button>
            <button
              onClick={() => { setPhase('idle'); setPassword(''); setError(''); }}
              className="px-3 py-2 text-slate-500 hover:text-slate-900 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
