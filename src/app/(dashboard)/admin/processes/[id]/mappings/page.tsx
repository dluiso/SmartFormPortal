import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import FieldMappingsManager from '@/components/admin/FieldMappingsManager';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FieldMappingsPage({ params }: Props) {
  const { id: templateId } = await params;

  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';
  const userRole = headersList.get('x-user-role') || '';

  if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
    redirect('/dashboard');
  }

  const template = await prisma.processTemplate.findFirst({
    where: { id: templateId, tenantId },
    select: {
      id: true,
      name: true,
      dbConnectionId: true,
      dbConnection: {
        select: { id: true, name: true, tableName: true },
      },
      fieldMappings: {
        select: {
          id: true,
          portalField: true,
          externalColumn: true,
          label: true,
          dbConnectionId: true,
        },
        orderBy: { portalField: 'asc' },
      },
    },
  });

  if (!template) notFound();

  const dbConnections = await prisma.dbConnection.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, tableName: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <a
          href="/admin/processes"
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          ← Back to Processes
        </a>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">
          Field Mappings
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {template.name} — Map Laserfiche MSSQL columns to portal fields
        </p>
      </div>

      <FieldMappingsManager
        templateId={template.id}
        templateName={template.name}
        currentDbConnectionId={template.dbConnectionId}
        dbConnections={dbConnections}
        fieldMappings={template.fieldMappings}
      />
    </div>
  );
}
