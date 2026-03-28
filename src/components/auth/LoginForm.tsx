'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginForm() {
  const t = useTranslations('auth.login');
  const tErrors = useTranslations('auth.errors');
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email.';
    if (!password) e.password = 'Password is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const code = data.code as string;
        const messages: Record<string, string> = {
          INVALID_CREDENTIALS: tErrors('invalid_credentials'),
          ACCOUNT_LOCKED: tErrors('account_locked'),
          ACCOUNT_INACTIVE: tErrors('account_inactive'),
          EMAIL_NOT_VERIFIED: tErrors('email_not_verified') ?? 'Please verify your email before logging in.',
        };
        toast.error(messages[code] || data.error || 'Login failed');
        return;
      }

      if (data.requires2FA) {
        router.push('/2fa');
        return;
      }

      if (data.user?.preferredLanguage) {
        document.cookie = `locale=${data.user.preferredLanguage};path=/;max-age=31536000`;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
          <Building2 className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">SmartFormPortal</h1>
        <p className="text-sm text-slate-500 mt-1">Secure access portal</p>
      </div>

      {/* Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl shadow-slate-200/60">
        <h2 className="text-xl font-bold text-slate-900 mb-1">{t('title')}</h2>
        <p className="text-slate-500 text-sm mb-6">{t('subtitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <Label className="text-slate-700 text-sm font-medium mb-1.5 block">
              {t('email_label')}
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('email_placeholder')}
              autoComplete="email"
              className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-slate-700 text-sm font-medium">{t('password_label')}</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                {t('forgot_password')}
              </Link>
            </div>
            <div className="relative">
              <Input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('password_placeholder')}
                autoComplete="current-password"
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              t('submit')
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          {t('no_account')}{' '}
          <Link
            href="/register"
            className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
          >
            {t('register_link')}
          </Link>
        </p>
      </div>
    </div>
  );
}
