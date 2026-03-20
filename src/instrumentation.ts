/**
 * Next.js instrumentation hook — runs once on the server at startup.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // ── BullMQ workers & scheduler ──────────────────────────────────────────
  try {
    const { startSyncWorker } = await import('@/lib/queues/syncWorker');
    const { startSyncScheduler } = await import('@/lib/queues/syncScheduler');

    startSyncWorker();
    await startSyncScheduler();
  } catch (err) {
    // Redis may not be available in all environments (e.g. build time)
    console.warn('[Instrumentation] BullMQ startup skipped:', (err as Error).message);
  }

  // ── License validation ───────────────────────────────────────────────────
  try {
    const { validateTenantLicense, getDefaultTenantId } = await import('@/lib/license/validator');

    const tenantId = await getDefaultTenantId();
    if (tenantId) {
      const status = await validateTenantLicense(tenantId);
      if (!status.valid) {
        console.error(`[License] ⚠ License invalid: ${status.reason}`);
      }

      // Schedule re-validation every 24h
      const INTERVAL_MS = 24 * 60 * 60 * 1000;
      setInterval(async () => {
        try {
          await validateTenantLicense(tenantId);
        } catch (e) {
          console.warn('[License] Periodic re-validation error:', (e as Error).message);
        }
      }, INTERVAL_MS);
    }
  } catch (err) {
    console.warn('[Instrumentation] License validation skipped:', (err as Error).message);
  }
}
