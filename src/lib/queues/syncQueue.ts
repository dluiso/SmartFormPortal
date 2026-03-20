import { Queue } from 'bullmq';

let syncQueue: Queue | null = null;

export function getSyncQueue(): Queue {
  if (!syncQueue) {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const url = new URL(redisUrl);
    syncQueue = new Queue('sync-instances', {
      connection: {
        host: url.hostname,
        port: Number(url.port) || 6379,
        password: url.password || undefined,
      },
    });
  }
  return syncQueue;
}
