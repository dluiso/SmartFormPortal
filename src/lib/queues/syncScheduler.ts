/**
 * Sync scheduler — reads active SyncJob records from the DB and registers
 * BullMQ repeatable jobs for each one.
 *
 * Call `startSyncScheduler()` once at server startup (e.g. from a custom
 * Next.js server or a standalone scheduler process).
 *
 * Each repeatable job adds individual per-instance sync jobs to the
 * 'sync-instances' queue, which the sync worker picks up.
 */

import { Queue, type RepeatableJob } from 'bullmq';
import prisma from '@/lib/db/prisma';
import { syncTenantInstances } from '@/lib/laserfiche/syncEngine';

let schedulerQueue: Queue | null = null;

function getSchedulerQueue(): Queue {
  if (!schedulerQueue) {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const url = new URL(redisUrl);
    schedulerQueue = new Queue('sync-scheduler', {
      connection: {
        host: url.hostname,
        port: Number(url.port) || 6379,
        password: url.password || undefined,
      },
    });
  }
  return schedulerQueue;
}

/**
 * Register (or refresh) all active sync jobs from the DB as BullMQ
 * repeatable jobs. Safe to call multiple times — deduplicates by jobId.
 */
export async function startSyncScheduler(): Promise<void> {
  const queue = getSchedulerQueue();

  // Remove any existing repeatable jobs (full refresh)
  const existing: RepeatableJob[] = await queue.getRepeatableJobs();
  for (const job of existing) {
    await queue.removeRepeatableByKey(job.key);
  }

  const syncJobs = await prisma.syncJob.findMany({
    where: { isActive: true, circuitOpen: false },
    select: { id: true, tenantId: true, cronExpression: true },
  });

  for (const job of syncJobs) {
    await queue.add(
      'run-tenant-sync',
      { syncJobId: job.id, tenantId: job.tenantId },
      {
        jobId: `tenant-sync-${job.tenantId}`,
        repeat: { pattern: job.cronExpression },
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    );
  }

  console.log(`[SyncScheduler] Scheduled ${syncJobs.length} tenant sync job(s).`);
}

/**
 * Run a single scheduled sync for a tenant — called by the scheduler worker.
 */
export async function runTenantSync(
  syncJobId: string,
  tenantId: string
): Promise<void> {
  const startedAt = new Date();

  try {
    const result = await syncTenantInstances(tenantId, { limit: 200 });

    await prisma.syncJob.update({
      where: { id: syncJobId },
      data: {
        lastRunAt: startedAt,
        lastRunSuccess: true,
        lastRunError: null,
        recordsProcessed: result.total,
        failureCount: 0,
      },
    });

    console.log(
      `[SyncScheduler] Tenant ${tenantId}: synced ${result.synced}/${result.total}, errors: ${result.errors}`
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // Increment failure count; open circuit after 5 consecutive failures
    const updated = await prisma.syncJob.update({
      where: { id: syncJobId },
      data: {
        lastRunAt: startedAt,
        lastRunSuccess: false,
        lastRunError: errorMsg,
        failureCount: { increment: 1 },
      },
      select: { failureCount: true },
    });

    if (updated.failureCount >= 5) {
      await prisma.syncJob.update({
        where: { id: syncJobId },
        data: { circuitOpen: true },
      });
      console.error(
        `[SyncScheduler] Circuit opened for tenant ${tenantId} after ${updated.failureCount} failures.`
      );
    }

    throw err; // let BullMQ mark job as failed
  }
}
