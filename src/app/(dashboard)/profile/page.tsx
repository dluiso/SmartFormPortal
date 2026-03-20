import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import ProfileForm from '@/components/profile/ProfileForm';
import TwoFASettings from '@/components/profile/TwoFASettings';

export default async function ProfilePage() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id') || '';
  const t = await getTranslations('profile');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      organization: true,
      userType: true,
      addressLine: true,
      city: true,
      state: true,
      zipCode: true,
      country: true,
      publicId: true,
      preferredLanguage: true,
      darkMode: true,
      primaryColor: true,
      createdAt: true,
      twoFactorEnabled: true,
    },
  });

  if (!user) redirect('/login');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
      </div>
      <ProfileForm user={user} />
      <TwoFASettings enabled={user.twoFactorEnabled ?? false} />
    </div>
  );
}
