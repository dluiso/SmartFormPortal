import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import SyncJobsManager from '@/components/admin/SyncJobsManager';

export default async function AdminSyncJobsPage() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';

  const [syncJobs, dbConnections] = await Promise.all([
    prisma.syncJob.findMany({
      where: { tenantId },
      include: {
        dbConnection: { select: { id: true, name: true, serverAddress: true, databaseName: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.dbConnection.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, serverAddress: true, databaseName: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sync Jobs</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage automatic Laserfiche sync schedules for this tenant.
        </p>
      </div>
      <SyncJobsManager initialJobs={syncJobs} dbConnections={dbConnections} />
    </div>
  );
}
