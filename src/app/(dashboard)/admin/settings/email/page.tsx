import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import EmailSettingsForm from '@/components/admin/settings/EmailSettingsForm';

export default async function EmailSettingsPage() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';
  const userRole = headersList.get('x-user-role') || '';

  if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
    redirect('/dashboard');
  }

  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: { emailConfig: true },
  });

  let initialConfig: Record<string, unknown> & { hasPassword?: boolean } = {};
  if (settings?.emailConfig) {
    try {
      const parsed = JSON.parse(settings.emailConfig);
      const { passwordEncrypted, ...rest } = parsed;
      initialConfig = { ...rest, hasPassword: !!passwordEncrypted };
    } catch {
      initialConfig = {};
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Email Settings</h1>
        <p className="text-slate-400 text-sm mt-1">
          Configure the SMTP relay used for transactional emails (status updates, messages, password resets).
        </p>
      </div>
      <EmailSettingsForm initial={initialConfig} />
    </div>
  );
}
