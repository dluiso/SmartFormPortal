import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/db/prisma';
import GeneralSettingsForm from '@/components/admin/settings/GeneralSettingsForm';

export default async function GeneralSettingsPage() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';
  const t = await getTranslations('admin.settings.general');

  const settings = await prisma.tenantSettings.findFirst({ where: { tenantId } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
      <GeneralSettingsForm settings={settings} />
    </div>
  );
}
