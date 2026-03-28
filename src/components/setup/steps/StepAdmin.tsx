'use client';

import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SetupData } from '../SetupWizard';
import { validatePasswordStrength } from '@/lib/auth/password';

interface Props {
  data: SetupData;
  onChange: (d: Partial<SetupData>) => void;
  onFinish: () => void;
  onBack: () => void;
  loading: boolean;
}

export default function StepAdmin({ data, onChange, onFinish, onBack, loading }: Props) {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!data.adminFirstName.trim()) e.adminFirstName = 'First name is required.';
    if (!data.adminLastName.trim()) e.adminLastName = 'Last name is required.';
    if (!data.adminEmail.trim()) e.adminEmail = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.adminEmail))
      e.adminEmail = 'Enter a valid email address.';
    const pwErr = validatePasswordStrength(data.adminPassword);
    if (pwErr) e.adminPassword = pwErr;
    if (data.adminPassword !== data.adminConfirmPassword)
      e.adminConfirmPassword = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFinish = () => {
    if (validate()) onFinish();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Account</h2>
      <p className="text-slate-500 text-sm mb-6">
        Create the global super administrator account. This account has full access to all features.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <Label className="text-slate-700 mb-1.5 block">
            First Name <span className="text-red-400">*</span>
          </Label>
          <Input
            value={data.adminFirstName}
            onChange={(e) => onChange({ adminFirstName: e.target.value })}
            placeholder="John"
            className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
          />
          {errors.adminFirstName && (
            <p className="text-red-400 text-xs mt-1">{errors.adminFirstName}</p>
          )}
        </div>
        <div>
          <Label className="text-slate-700 mb-1.5 block">
            Last Name <span className="text-red-400">*</span>
          </Label>
          <Input
            value={data.adminLastName}
            onChange={(e) => onChange({ adminLastName: e.target.value })}
            placeholder="Doe"
            className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
          />
          {errors.adminLastName && (
            <p className="text-red-400 text-xs mt-1">{errors.adminLastName}</p>
          )}
        </div>
      </div>

      <div className="mb-4">
        <Label className="text-slate-300 mb-1.5 block">
          Email Address <span className="text-red-400">*</span>
        </Label>
        <Input
          type="email"
          value={data.adminEmail}
          onChange={(e) => onChange({ adminEmail: e.target.value })}
          placeholder="admin@yourdomain.com"
          className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
        />
        {errors.adminEmail && (
          <p className="text-red-400 text-xs mt-1">{errors.adminEmail}</p>
        )}
      </div>

      <div className="mb-4">
        <Label className="text-slate-300 mb-1.5 block">
          Password <span className="text-red-400">*</span>
        </Label>
        <div className="relative">
          <Input
            type={showPass ? 'text' : 'password'}
            value={data.adminPassword}
            onChange={(e) => onChange({ adminPassword: e.target.value })}
            placeholder="Min 8 chars, uppercase, lowercase, number"
            className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.adminPassword && (
          <p className="text-red-400 text-xs mt-1">{errors.adminPassword}</p>
        )}
      </div>

      <div className="mb-8">
        <Label className="text-slate-300 mb-1.5 block">
          Confirm Password <span className="text-red-400">*</span>
        </Label>
        <div className="relative">
          <Input
            type={showConfirm ? 'text' : 'password'}
            value={data.adminConfirmPassword}
            onChange={(e) => onChange({ adminConfirmPassword: e.target.value })}
            placeholder="Repeat your password"
            className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.adminConfirmPassword && (
          <p className="text-red-400 text-xs mt-1">{errors.adminConfirmPassword}</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={loading}
          className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-100"
        >
          Back
        </Button>
        <Button onClick={handleFinish} disabled={loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Installing...
            </>
          ) : (
            'Complete Setup'
          )}
        </Button>
      </div>
    </div>
  );
}
