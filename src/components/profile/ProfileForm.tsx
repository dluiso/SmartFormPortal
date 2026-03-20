'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Eye, EyeOff, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organization: string;
  userType: string;
  addressLine: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  publicId: string;
  preferredLanguage: string;
  darkMode: boolean;
  primaryColor: string | null;
  createdAt: Date;
}

interface Props {
  user: UserProfile;
}

export default function ProfileForm({ user }: Props) {
  const t = useTranslations('profile');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [profile, setProfile] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    organization: user.organization,
  });

  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirm: '',
  });

  const [prefs, setPrefs] = useState({
    preferredLanguage: user.preferredLanguage,
    darkMode: user.darkMode,
  });

  const copyId = () => {
    navigator.clipboard.writeText(user.publicId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error();
      toast.success(t('profile_updated'));
    } catch {
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.newPass !== passwords.confirm) {
      toast.error('New passwords do not match.');
      return;
    }
    if (passwords.newPass.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.newPass,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to change password.');
        return;
      }
      toast.success(t('password_changed'));
      setPasswords({ current: '', newPass: '', confirm: '' });
    } catch {
      toast.error('Failed to change password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error();
      // Update locale cookie
      document.cookie = `locale=${prefs.preferredLanguage};path=/;max-age=31536000`;
      toast.success(t('profile_updated'));
    } catch {
      toast.error('Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* User ID */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-300">{t('user_id')}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t('user_id_help')}</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs text-blue-400 bg-blue-900/20 px-2 py-1 rounded font-mono">
              {user.publicId.slice(0, 12)}...
            </code>
            <Button
              variant="ghost"
              size="icon"
              onClick={copyId}
              className="w-7 h-7 text-slate-400 hover:text-white"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="profile" className="data-[state=active]:bg-slate-700">
            Profile
          </TabsTrigger>
          <TabsTrigger value="password" className="data-[state=active]:bg-slate-700">
            Password
          </TabsTrigger>
          <TabsTrigger value="preferences" className="data-[state=active]:bg-slate-700">
            Preferences
          </TabsTrigger>
        </TabsList>

        {/* Profile tab */}
        <TabsContent value="profile">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300 mb-1.5 block">First Name</Label>
                <Input
                  value={profile.firstName}
                  onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white focus:border-blue-500"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-1.5 block">Last Name</Label>
                <Input
                  value={profile.lastName}
                  onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-300 mb-1.5 block">Phone</Label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white focus:border-blue-500"
              />
            </div>
            <div>
              <Label className="text-slate-300 mb-1.5 block">Organization</Label>
              <Input
                value={profile.organization}
                onChange={(e) => setProfile((p) => ({ ...p, organization: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white focus:border-blue-500"
              />
            </div>
            <div>
              <Label className="text-slate-300 mb-1 block">Email</Label>
              <Input
                value={user.email}
                disabled
                className="bg-slate-700/50 border-slate-700 text-slate-500 cursor-not-allowed"
              />
              <p className="text-xs text-slate-600 mt-1">Email cannot be changed here.</p>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {t('save_changes')}
            </Button>
          </div>
        </TabsContent>

        {/* Password tab */}
        <TabsContent value="password">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-4">
            <div>
              <Label className="text-slate-300 mb-1.5 block">{t('current_password')}</Label>
              <div className="relative">
                <Input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={passwords.current}
                  onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white focus:border-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-slate-300 mb-1.5 block">{t('new_password')}</Label>
              <div className="relative">
                <Input
                  type={showNewPass ? 'text' : 'password'}
                  value={passwords.newPass}
                  onChange={(e) => setPasswords((p) => ({ ...p, newPass: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white focus:border-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-slate-300 mb-1.5 block">{t('confirm_password')}</Label>
              <Input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white focus:border-blue-500"
              />
            </div>
            <Button onClick={handleChangePassword} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {t('change_password')}
            </Button>
          </div>
        </TabsContent>

        {/* Preferences tab */}
        <TabsContent value="preferences">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">{t('dark_mode')}</p>
                <p className="text-xs text-slate-500">Toggle the application theme</p>
              </div>
              <Switch
                checked={prefs.darkMode}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, darkMode: v }))}
              />
            </div>
            <Separator className="bg-slate-700" />
            <div>
              <Label className="text-slate-300 mb-1.5 block">{t('language')}</Label>
              <select
                value={prefs.preferredLanguage}
                onChange={(e) => setPrefs((p) => ({ ...p, preferredLanguage: e.target.value }))}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
            <Button onClick={handleSavePreferences} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {t('save_changes')}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
