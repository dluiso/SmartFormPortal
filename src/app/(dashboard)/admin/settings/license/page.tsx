import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth/jwt';
import prisma from '@/lib/db/prisma';
import LicenseManager from '@/components/admin/settings/LicenseManager';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/session';

function maskLicenseKey(key: string): string {
  if (key.length <= 12) return '****';
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

export default async function LicenseSettingsPage() {
  const t = await getTranslations('admin.settings.license');

  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? '';
  let payload;
  try { payload = verifyAccessToken(token); } catch { payload = null; }

  let licenseData = null;
  if (payload?.tenantId) {
    const license = await prisma.tenantLicense.findUnique({
      where: { tenantId: payload.tenantId },
    });
    if (license) {
      // Extract planName from stored rawLicense
      let planName: string | undefined;
      try {
        const raw = JSON.parse(license.rawLicense ?? '{}') as { license?: { planName?: string; planType?: string } };
        planName = raw.license?.planName ?? raw.license?.planType;
      } catch { /* ignore */ }

      licenseData = {
        id: license.id,
        licenseKey: maskLicenseKey(license.licenseKey),
        licenseType: license.licenseType,
        planName,
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
