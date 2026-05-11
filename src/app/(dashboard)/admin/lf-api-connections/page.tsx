import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import LfApiConnectionsManager from '@/components/admin/LfApiConnectionsManager';

export default async function AdminLfApiConnectionsPage() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';

  const connections = await prisma.lfApiConnection.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, description: true, baseUrl: true,
      repositoryId: true, apiVersion: true, username: true,
      isActive: true, lastTestedAt: true, lastTestSuccess: true, createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">LF API Connections</h1>
        <p className="text-slate-500 text-sm mt-1">Configure Laserfiche Repository API connections for document downloads.</p>
      </div>
      <LfApiConnectionsManager connections={connections} />
    </div>
  );
}
