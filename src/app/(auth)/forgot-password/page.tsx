'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgot_password');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
          <Building2 className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white">SmartFormPortal</h1>
      </div>

      <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl">
        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">{t('sent_title')}</h2>
            <p className="text-slate-400 text-sm">{t('sent_message')}</p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 mt-6 text-sm text-blue-400 hover:text-blue-300"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('back_to_login')}
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white mb-2">{t('title')}</h2>
            <p className="text-slate-400 text-sm mb-6">{t('subtitle')}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-1.5 block">{t('email_label')}</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {t('submit')}
              </Button>
            </form>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 mt-4 text-sm text-slate-400 hover:text-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('back_to_login')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
