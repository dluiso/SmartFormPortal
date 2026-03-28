import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth/jwt';
import prisma from '@/lib/db/prisma';
import LicenseManager from '@/components/admin/settings/LicenseManager';

export default async function LicenseSettingsPage() {
  const t = await getTranslations('admin.settings.license');

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  let payload;
  try { payload = verifyAccessToken(token); } catch { payload = null; }

  let licenseData = null;
  if (payload?.tenantId) {
    const license = await prisma.tenantLicense.findUnique({
      where: { tenantId: payload.tenantId },
    });
    if (license) {
      licenseData = {
        id: license.id,
        licenseKey: license.licenseKey,
        licenseType: license.licenseType,
        isActive: license.isActive,
        activatedAt: license.activatedAt?.toISOString() ?? null,
        expiresAt: license.expiresAt?.toISOString() ?? null,
        domain: license.domain,
        lastValidatedAt: license.updatedAt.toISOString(),
      };
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
      <LicenseManager initial={licenseData} />
    </div>
  );
}
