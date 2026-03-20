/**
 * License validation against SMFP-LicenseServer.
 *
 * Called once at server startup and scheduled every 24h via BullMQ.
 * 72-hour grace period if the License Server is unreachable.
 */

import prisma from '@/lib/db/prisma';

const GRACE_PERIOD_MS = 72 * 60 * 60 * 1000; // 72 hours

export interface LicenseStatus {
  valid: boolean;
  reason?: string;
  expiresAt?: Date | null;
  plan?: string;
  maxUsers?: number;
  maxProcesses?: number;
}

/**
 * Validates the tenant license against the License Server.
 * Returns the status — caller decides what to do (log, block, alert).
 */
export async function validateTenantLicense(tenantId: string): Promise<LicenseStatus> {
  const license = await prisma.tenantLicense.findUnique({ where: { tenantId } });

  if (!license) {
    return { valid: false, reason: 'No license record found' };
  }

  const serverUrl = process.env.SMFP_LICENSE_SERVER_URL;
  const apiKey = process.env.SMFP_LICENSE_API_KEY;

  if (!serverUrl || !apiKey) {
    // No license server configured — fall back to local record
    console.warn('[License] SMFP_LICENSE_SERVER_URL or SMFP_LICENSE_API_KEY not set — using local record');
    return localFallback(license);
  }

  const portalDomain = process.env.SMFP_PORTAL_DOMAIN ?? process.env.NEXTAUTH_URL ?? 'localhost';

  try {
    const res = await fetch(`${serverUrl}/api/licenses/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        licenseKey: license.licenseKey,
        portalUrl: portalDomain,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const reason = (data as { error?: string }).error ?? `HTTP ${res.status}`;
      console.warn(`[License] Validation failed: ${reason}`);

      // Use grace period
      return gracePeriodCheck(license, reason);
    }

    const data = await res.json() as {
      payload: { plan: string; maxUsers: number; maxProcesses: number; expiresAt: string | null };
    };

    // Update local record with latest info
    await prisma.tenantLicense.update({
      where: { tenantId },
      data: {
        isActive: true,
        expiresAt: data.payload.expiresAt ? new Date(data.payload.expiresAt) : null,
        rawLicense: JSON.stringify(data),
        updatedAt: new Date(),
      },
    });

    console.log(`[License] Validated ✓ — plan: ${data.payload.plan}`);

    return {
      valid: true,
      expiresAt: data.payload.expiresAt ? new Date(data.payload.expiresAt) : null,
      plan: data.payload.plan,
      maxUsers: data.payload.maxUsers,
      maxProcesses: data.payload.maxProcesses,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[License] License Server unreachable: ${msg}`);
    return gracePeriodCheck(license, msg);
  }
}

function gracePeriodCheck(
  license: { isActive: boolean; updatedAt: Date; expiresAt: Date | null },
  reason: string
): LicenseStatus {
  const sinceLastCheck = Date.now() - license.updatedAt.getTime();

  if (license.isActive && sinceLastCheck < GRACE_PERIOD_MS) {
    const hoursLeft = Math.round((GRACE_PERIOD_MS - sinceLastCheck) / 3_600_000);
    console.warn(`[License] Using grace period (${hoursLeft}h remaining)`);
    return { valid: true, reason: `Grace period (${hoursLeft}h left)`, expiresAt: license.expiresAt };
  }

  return { valid: false, reason };
}

function localFallback(license: { isActive: boolean; expiresAt: Date | null }): LicenseStatus {
  if (!license.isActive) return { valid: false, reason: 'License inactive' };
  if (license.expiresAt && license.expiresAt < new Date()) {
    return { valid: false, reason: 'License expired' };
  }
  return { valid: true, expiresAt: license.expiresAt };
}

/**
 * Returns the first (and only) tenant ID — single-tenant mode.
 */
export async function getDefaultTenantId(): Promise<string | null> {
  const tenant = await prisma.tenant.findFirst({ select: { id: true } });
  return tenant?.id ?? null;
}
