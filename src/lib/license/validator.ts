/**
 * License validation against SMFP-LicenseServer.
 * Called at server startup (instrumentation.ts) and on-demand by the admin UI.
 * 72-hour grace period if the License Server is unreachable.
 */

import prisma from '@/lib/db/prisma';
import { verifyLicenseSignature, getLicensePublicKey } from './verifier';

const GRACE_PERIOD_MS = 72 * 60 * 60 * 1000; // 72 hours

export interface LicenseStatus {
  valid: boolean;
  reason?: string;
  expiresAt?: Date | null;
  plan?: string;
  planName?: string;
  maxUsers?: number;
  maxProcesses?: number;
}

export async function validateTenantLicense(tenantId: string): Promise<LicenseStatus> {
  const license = await prisma.tenantLicense.findUnique({ where: { tenantId } });

  if (!license) {
    return { valid: false, reason: 'No license record found' };
  }

  const serverUrl = process.env.LICENSE_SERVER_URL;
  const apiKey = process.env.LICENSE_SERVER_API_KEY;

  if (!serverUrl || !apiKey) {
    console.warn('[License] LICENSE_SERVER_URL or LICENSE_SERVER_API_KEY not set — using local record');
    return localFallback(license);
  }

  const portalDomain =
    process.env.SMFP_PORTAL_DOMAIN ??
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost';

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
      return gracePeriodCheck(license, reason);
    }

    const data = await res.json() as {
      valid: boolean;
      license: {
        licenseKey: string;
        customerId: string;
        customerEmail: string;
        planType: string;
        maxUsers: number;
        maxProcesses: number;
        allowedDomains: string[];
        issuedAt: string;
        expiresAt: string | null;
        signature: string;
        publicKey: string;
        planName: string;
        customerName: string;
      };
    };

    // Verify RSA signature if public key is configured
    const publicKeyPem = getLicensePublicKey() ?? data.license.publicKey;
    const { signature, publicKey: _pk, planName: _pn, customerName: _cn, ...licensePayload } = data.license;
    if (!verifyLicenseSignature(licensePayload, signature, publicKeyPem)) {
      console.error('[License] RSA signature verification FAILED — response may be tampered');
      return gracePeriodCheck(license, 'Signature verification failed');
    }

    // Update local record with verified info
    await prisma.tenantLicense.update({
      where: { tenantId },
      data: {
        isActive: true,
        expiresAt: data.license.expiresAt ? new Date(data.license.expiresAt) : null,
        rawLicense: JSON.stringify(data),
        updatedAt: new Date(),
      },
    });

    console.log(`[License] Validated ✓ — plan: ${data.license.planName ?? data.license.planType}`);

    return {
      valid: true,
      expiresAt: data.license.expiresAt ? new Date(data.license.expiresAt) : null,
      plan: data.license.planType,
      planName: data.license.planName,
      maxUsers: data.license.maxUsers,
      maxProcesses: data.license.maxProcesses,
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

  // Grace period exhausted — mark inactive in DB
  prisma.tenantLicense
    .updateMany({ where: { isActive: true, updatedAt: { lt: new Date(Date.now() - GRACE_PERIOD_MS) } }, data: { isActive: false } })
    .catch(() => {});

  return { valid: false, reason };
}

function localFallback(license: { isActive: boolean; expiresAt: Date | null }): LicenseStatus {
  if (!license.isActive) return { valid: false, reason: 'License inactive' };
  if (license.expiresAt && license.expiresAt < new Date()) {
    return { valid: false, reason: 'License expired' };
  }
  return { valid: true, expiresAt: license.expiresAt };
}

/** Returns the first (and only) tenant ID — single-tenant mode. */
export async function getDefaultTenantId(): Promise<string | null> {
  const tenant = await prisma.tenant.findFirst({ select: { id: true } });
  return tenant?.id ?? null;
}
