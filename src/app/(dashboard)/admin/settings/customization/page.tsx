import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import CustomizationForm from '@/components/admin/settings/CustomizationForm';

export default async function CustomizationSettingsPage() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';
  const userRole = headersList.get('x-user-role') || '';

  if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
    redirect('/dashboard');
  }

  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: {
      portalName: true, logoUrl: true, faviconUrl: true,
      loginBgColor: true, loginBgImageUrl: true,
      primaryColor: true, secondaryColor: true, accentColor: true,
      customCss: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Customization</h1>
        <p className="text-slate-400 text-sm mt-1">
          Configure portal branding, colors, and custom CSS.
        </p>
      </div>
      <CustomizationForm initial={settings ?? {}} />
    </div>
  );
}
