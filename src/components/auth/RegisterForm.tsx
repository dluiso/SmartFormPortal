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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organization: string;
  userType: 'RESIDENT' | 'BUSINESS_OWNER';
  addressLine: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  password: string;
  confirmPassword: string;
};

const initial: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  organization: '',
  userType: 'RESIDENT',
  addressLine: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'US',
  password: '',
  confirmPassword: '',
};

export default function RegisterForm() {
  const t = useTranslations('auth.register');
  const tErrors = useTranslations('errors');
  const router = useRouter();

  const [form, setForm] = useState<FormData>(initial);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: '' }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = tErrors('required_field');
    if (!form.lastName.trim()) e.lastName = tErrors('required_field');
    if (!form.email.trim()) e.email = tErrors('required_field');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = tErrors('invalid_email');
    if (!form.phone.trim()) e.phone = tErrors('required_field');
    if (!form.organization.trim()) e.organization = tErrors('required_field');
    if (!form.addressLine.trim()) e.addressLine = tErrors('required_field');
    if (!form.city.trim()) e.city = tErrors('required_field');
    if (!form.state.trim()) e.state = tErrors('required_field');
    if (!form.zipCode.trim()) e.zipCode = tErrors('required_field');
    if (!form.password) e.password = tErrors('required_field');
    else if (form.password.length < 8) e.password = tErrors('password_too_short');
    if (form.password !== form.confirmPassword) e.confirmPassword = tErrors('password_mismatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          organization: form.organization,
          userType: form.userType,
          addressLine: form.addressLine,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          country: form.country,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'ZIP_NOT_ALLOWED') {
          toast.error(t('zip_not_allowed'));
        } else if (data.code === 'REGISTRATION_CLOSED') {
          toast.error(t('registration_closed'));
        } else {
          toast.error(data.error || 'Registration failed');
        }
        return;
      }

      toast.success('Account created! You can now sign in.');
      router.push('/login');
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const field = (
    id: keyof FormData,
    label: string,
    type = 'text',
    placeholder = '',
    colSpan = 'col-span-2'
  ) => (
    <div className={colSpan}>
      <Label className="text-slate-700 mb-1.5 block">
        {label} <span className="text-red-400">*</span>
      </Label>
      <Input
        type={type}
        value={form[id] as string}
        onChange={(e) => update(id, e.target.value)}
        placeholder={placeholder}
        className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
      />
      {errors[id] && <p className="text-red-400 text-xs mt-1">{errors[id]}</p>}
    </div>
  );

  return (
    <div className="w-full max-w-2xl">
      {/* Logo */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-3">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">SmartFormPortal</h1>
      </div>

      <div className="bg-white backdrop-blur border border-slate-200 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900 mb-1">{t('title')}</h2>
        <p className="text-slate-500 text-sm mb-6">{t('subtitle')}</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {field('firstName', t('first_name'), 'text', 'John', 'col-span-1')}
            {field('lastName', t('last_name'), 'text', 'Doe', 'col-span-1')}
            {field('email', t('email'), 'email', 'john@example.com')}
            {field('phone', t('phone'), 'tel', '+1 (555) 000-0000')}
            {field('organization', t('organization'), 'text', 'City of Example')}

            {/* User Type */}
            <div className="col-span-2">
              <Label className="text-slate-700 mb-2 block">
                {t('user_type')} <span className="text-red-400">*</span>
              </Label>
              <RadioGroup
                value={form.userType}
                onValueChange={(v) => update('userType', v)}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="RESIDENT" id="resident" />
                  <Label htmlFor="resident" className="text-slate-700 cursor-pointer">
                    {t('resident')}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="BUSINESS_OWNER" id="business" />
                  <Label htmlFor="business" className="text-slate-700 cursor-pointer">
                    {t('business_owner')}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Address */}
            {field('addressLine', t('address_line'), 'text', '123 Main St')}
            {field('city', t('city'), 'text', 'Springfield', 'col-span-1')}
            {field('state', t('state'), 'text', 'IL', 'col-span-1')}
            {field('zipCode', t('zip_code'), 'text', '62701', 'col-span-1')}
            {field('country', t('country'), 'text', 'US', 'col-span-1')}

            {/* Password */}
            <div className="col-span-1">
              <Label className="text-slate-700 mb-1.5 block">
                {t('password')} <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  autoComplete="new-password"
                  className="bg-white border-slate-300 text-slate-900 focus:border-blue-500 pr-10"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            <div className="col-span-1">
              <Label className="text-slate-700 mb-1.5 block">
                {t('confirm_password')} <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => update('confirmPassword', e.target.value)}
                  autoComplete="new-password"
                  className="bg-white border-slate-300 text-slate-900 focus:border-blue-500 pr-10"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating account...
              </>
            ) : (
              t('submit')
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          {t('already_account')}{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
            {t('login_link')}
          </Link>
        </p>
      </div>
    </div>
  );
}
