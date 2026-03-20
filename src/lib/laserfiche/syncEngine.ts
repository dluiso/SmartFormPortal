/**
 * Sync engine — core logic for syncing a single ProcessInstance
 * from the Laserfiche MSSQL database.
 * Used by both the BullMQ worker and the manual sync API route.
 */

import prisma from '@/lib/db/prisma';
import { queryByPortalUserId } from './mssql';
import { applyFieldMappings } from './fieldMapper';
import { ProcessStatus, Prisma } from '@prisma/client';
import { sendNotificationEmail } from '@/lib/email/notificationMailer';

export interface SyncResult {
  instanceId: string;
  synced: boolean;
  statusChanged: boolean;
  previousStatus?: ProcessStatus;
  newStatus?: ProcessStatus;
  error?: string;
}

/**
 * Sync a single ProcessInstance.
 * Fetches the latest data from LF MSSQL and updates the portal DB.
 */
export async function syncInstance(instanceId: string, tenantId: string): Promise<SyncResult> {
  const instance = await prisma.processInstance.findFirst({
    where: { id: instanceId, tenantId },
    include: {
      user: { select: { publicId: true } },
      processTemplate: {
        include: {
          dbConnection: true,
          fieldMappings: true,
        },
      },
    },
  });

  if (!instance) {
    return { instanceId, synced: false, statusChanged: false, error: 'Instance not found' };
  }

  const { dbConnection, fieldMappings } = instance.processTemplate;

  if (!dbConnection) {
    return {
      instanceId,
      synced: false,
      statusChanged: false,
      error: 'No DB connection configured for this process template',
    };
  }

  if (!dbConnection.isActive) {
    return { instanceId, synced: false, statusChanged: false, error: 'DB connection is inactive' };
  }

  let record;
  try {
    record = await queryByPortalUserId(dbConnection, instance.user.publicId);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await prisma.processInstance.update({
      where: { id: instanceId },
      data: { lastSyncedAt: new Date() },
    });
    return { instanceId, synced: false, statusChanged: false, error: `MSSQL query failed: ${errorMsg}` };
  }

  if (!record) {
    // No record yet — process might not be submitted to LF yet, that's OK
    await prisma.processInstance.update({
      where: { id: instanceId },
      data: { lastSyncedAt: new Date() },
    });
    return { instanceId, synced: true, statusChanged: false };
  }

  // Apply field mappings
  const mappedData = applyFieldMappings(record, fieldMappings);

  const previousStatus = instance.status;
  const newStatus = mappedData.status ?? previousStatus;
  const statusChanged = newStatus !== previousStatus;

  // Update the ProcessInstance
  const { rawData, ...scalarData } = mappedData;
  await prisma.processInstance.update({
    where: { id: instanceId },
    data: {
      ...scalarData,
      ...(rawData !== undefined ? { rawData: rawData as Prisma.InputJsonValue } : {}),
      lastSyncedAt: new Date(),
    },
  });

  // If status changed, create a notification for the user
  if (statusChanged) {
    const notifPayload = {
      tenantId,
      userId: instance.userId,
      type: 'PROCESS_STATUS_CHANGED' as const,
      title: 'Process Status Updated',
      body: `Your "${instance.processTemplate.name}" application status changed to ${newStatus.toLowerCase().replace('_', ' ')}.`,
      actionUrl: '/my-processes',
      metadata: { instanceId, previousStatus, newStatus, processName: instance.processTemplate.name },
    };
    await prisma.notification.create({ data: notifPayload });
    // Fire-and-forget email
    sendNotificationEmail(notifPayload).catch(() => {});
  }

  // Log activity
  await prisma.activityLog.create({
    data: {
      tenantId,
      userId: instance.userId,
      action: 'process_synced',
      entityType: 'ProcessInstance',
      entityId: instanceId,
      details: { previousStatus, newStatus, statusChanged },
    },
  });

  return { instanceId, synced: true, statusChanged, previousStatus, newStatus };
}

/**
 * Sync all active (non-terminal) instances for a given tenant.
 * Used by the scheduled cron job.
 */
export async function syncTenantInstances(
  tenantId: string,
  options: { limit?: number } = {}
): Promise<{ total: number; synced: number; errors: number }> {
  const terminalStatuses: ProcessStatus[] = [
    ProcessStatus.APPROVED,
    ProcessStatus.REJECTED,
    ProcessStatus.CANCELLED,
    ProcessStatus.EXPIRED,
  ];

  const instances = await prisma.processInstance.findMany({
    where: {
      tenantId,
      status: { notIn: terminalStatuses },
      processTemplate: {
        dbConnectionId: { not: null },
        isActive: true,
      },
    },
    select: { id: true },
    take: options.limit ?? 200,
    orderBy: { lastSyncedAt: 'asc' },
  });

  let synced = 0;
  let errors = 0;

  for (const inst of instances) {
    try {
      const result = await syncInstance(inst.id, tenantId);
      if (result.synced) synced++;
      else if (result.error) errors++;
    } catch {
      errors++;
    }
  }

  return { total: instances.length, synced, errors };
}
