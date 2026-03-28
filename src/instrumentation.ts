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
  const { validateTenantLicense, getDefaultTenantId } = await import(
    '@/lib/license/validator'
  );

  async function runValidation() {
    try {
      const tenantId = await getDefaultTenantId();
      if (!tenantId) {
        console.log('[License] No tenant found — skipping license validation');
        return;
      }
      const status = await validateTenantLicense(tenantId);
      const label = status.valid ? '✓ valid' : '✗ invalid';
      const detail = status.planName ?? status.plan ?? status.reason ?? '';
      console.log(`[License] Startup check: ${label}${detail ? ` — ${detail}` : ''}`);
    } catch (err) {
      console.error('[License] Startup validation error:', err);
    }
  }

  // Run immediately on startup
  runValidation();

  // Re-validate every 24 hours
  const INTERVAL_MS = 24 * 60 * 60 * 1000;
  setInterval(runValidation, INTERVAL_MS);
}
