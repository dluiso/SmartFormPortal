import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import LanguageManager from '@/components/admin/settings/LanguageManager';

export default async function LanguageSettingsPage() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';
  const userRole = headersList.get('x-user-role') || '';

  if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
    redirect('/dashboard');
  }

  const languages = await prisma.languageFile.findMany({
    where: { tenantId },
    select: {
      id: true,
      code: true,
      name: true,
      isDefault: true,
      isBuiltIn: true,
      isComplete: true,
      missingKeys: true,
      updatedAt: true,
    },
    orderBy: { code: 'asc' },
  });

  const serialized = languages.map((l) => ({
    ...l,
    updatedAt: l.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Language Files</h1>
        <p className="text-slate-500 text-sm mt-1">
          Export built-in translations, customize them, and import custom language files.
        </p>
      </div>
      <LanguageManager languages={serialized} />
    </div>
  );
}
