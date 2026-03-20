import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import BackupManager from '@/components/admin/settings/BackupManager';

export default async function BackupSettingsPage() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';
  const userRole = headersList.get('x-user-role') || '';

  if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
    redirect('/dashboard');
  }

  const configs = await prisma.backupConfig.findMany({
    where: { tenantId },
    include: {
      backupRuns: {
        orderBy: { startedAt: 'desc' },
        take: 1,
        select: { status: true, startedAt: true, completedAt: true, fileSize: true, errorMessage: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const serialized = configs.map(({ configEncrypted: _, ...c }) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    backupRuns: c.backupRuns.map((r) => ({
      ...r,
      startedAt: r.startedAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
      fileSize: r.fileSize !== null ? Number(r.fileSize) : null,
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Backup Configuration</h1>
        <p className="text-slate-400 text-sm mt-1">
          Configure automated database backups with scheduled runs and destination options.
        </p>
      </div>
      <BackupManager initial={serialized} />
    </div>
  );
}
