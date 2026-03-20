'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(t('verify_email_missing_token'));
      return;
    }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data: { ok?: boolean; message?: string; error?: string }) => {
        if (data.ok) {
          setStatus('success');
          setMessage(data.message ?? t('verify_email_success'));
          setTimeout(() => router.replace('/login'), 3000);
        } else {
          setStatus('error');
          setMessage(data.error ?? t('verify_email_error'));
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage(t('verify_email_error'));
      });
  }, [token, t, router]);

  async function handleResend() {
    setResendState('sending');
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '' }), // email not available here; handled server-side
      });
    } catch { /* ignore */ }
    setResendState('sent');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 size={40} className="animate-spin text-blue-400 mx-auto mb-4" />
            <p className="text-slate-300 text-sm">{t('verify_email_verifying')}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={40} className="text-emerald-400 mx-auto mb-4" />
            <h1 className="text-white font-bold text-xl mb-2">{t('verify_email_success_title')}</h1>
            <p className="text-slate-400 text-sm mb-6">{message}</p>
            <p className="text-slate-500 text-xs">{t('verify_email_redirecting')}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={40} className="text-red-400 mx-auto mb-4" />
            <h1 className="text-white font-bold text-xl mb-2">{t('verify_email_error_title')}</h1>
            <p className="text-slate-400 text-sm mb-6">{message}</p>
            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                {t('back_to_login')}
              </Link>
              {resendState !== 'sent' ? (
                <button
                  onClick={handleResend}
                  disabled={resendState === 'sending'}
                  className="inline-flex items-center justify-center gap-2 text-slate-400 hover:text-slate-200 text-xs transition-colors disabled:opacity-50"
                >
                  <Mail size={14} />
                  {resendState === 'sending' ? t('verify_email_resending') : t('verify_email_resend')}
                </button>
              ) : (
                <p className="text-emerald-400 text-xs">{t('verify_email_resent')}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
