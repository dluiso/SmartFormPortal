/**
 * BullMQ worker for processing sync-instances queue jobs.
 * Run this as a standalone process (e.g. via `node -r @swc-node/register src/lib/queues/syncWorker.ts`)
 * or import it from a custom server entry point.
 *
 * Each job payload: { instanceId: string; tenantId: string }
 */

import { Worker, type Job } from 'bullmq';
import { syncInstance } from '@/lib/laserfiche/syncEngine';

interface SyncJobData {
  instanceId: string;
  tenantId: string;
}

let worker: Worker | null = null;

export function startSyncWorker(): Worker {
  if (worker) return worker;

  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const url = new URL(redisUrl);

  worker = new Worker<SyncJobData>(
    'sync-instances',
    async (job: Job<SyncJobData>) => {
      const { instanceId, tenantId } = job.data;
      const result = await syncInstance(instanceId, tenantId);

      if (result.error) {
        // Non-fatal errors (no record yet, inactive conn) — don't throw
        // so BullMQ doesn't retry unnecessarily
        console.warn(`[SyncWorker] ${instanceId}: ${result.error}`);
        return result;
      }

      if (result.statusChanged) {
        console.log(
          `[SyncWorker] ${instanceId}: ${result.previousStatus} → ${result.newStatus}`
        );
      }

      return result;
    },
    {
      connection: {
        host: url.hostname,
        port: Number(url.port) || 6379,
        password: url.password || undefined,
      },
      concurrency: 5,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[SyncWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[SyncWorker] Started — listening on queue: sync-instances');
  return worker;
}

export async function stopSyncWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
}
