import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import ZipCodesManager from '@/components/admin/settings/ZipCodesManager';
import IpRulesManager from '@/components/admin/settings/IpRulesManager';
import BlockedCountriesManager from '@/components/admin/settings/BlockedCountriesManager';

export default async function SecuritySettingsPage() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';
  const userRole = headersList.get('x-user-role') || '';

  if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
    redirect('/dashboard');
  }

  const [zipCodes, settings, ipRules, blockedCountries] = await Promise.all([
    prisma.allowedZipCode.findMany({ where: { tenantId }, orderBy: { zipCode: 'asc' } }),
    prisma.tenantSettings.findUnique({ where: { tenantId }, select: { enforceZipRestriction: true } }),
    prisma.ipRule.findMany({ where: { tenantId }, orderBy: [{ isWhitelist: 'desc' }, { createdAt: 'asc' }] }),
    prisma.blockedCountry.findMany({ where: { tenantId }, orderBy: { countryName: 'asc' } }),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Security Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage access restrictions: ZIP codes, IP rules, and country blocking.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">ZIP Code Restrictions</h2>
        <ZipCodesManager initial={zipCodes} initialEnforce={settings?.enforceZipRestriction ?? false} />
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">IP Rules</h2>
        <IpRulesManager initial={ipRules} />
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">Geo-Restriction</h2>
        <BlockedCountriesManager initial={blockedCountries} />
      </section>
    </div>
  );
}
