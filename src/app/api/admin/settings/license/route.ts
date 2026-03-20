import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth/jwt';
import prisma from '@/lib/db/prisma';
import { z } from 'zod';

function maskLicenseKey(key: string): string {
  if (key.length <= 12) return '****';
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

async function requireAdmin(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  try {
    const payload = verifyAccessToken(token);
    if (payload.systemRole !== 'SUPER_ADMIN') return null;
    return payload;
  } catch {
    return null;
  }
}

const ActivateSchema = z.object({
  licenseKey: z.string().min(10),
  domain: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const license = await prisma.tenantLicense.findFirst({
    where: { tenantId: admin.tenantId },
  });

  if (!license) return NextResponse.json({ license: null });

  return NextResponse.json({
    license: {
      id: license.id,
      licenseKey: maskLicenseKey(license.licenseKey),
      licenseType: license.licenseType,
      isActive: license.isActive,
      activatedAt: license.activatedAt?.toISOString() ?? null,
      expiresAt: license.expiresAt?.toISOString() ?? null,
      domain: license.domain,
      lastValidatedAt: license.updatedAt.toISOString(),
    },
  });
}

// POST /api/admin/settings/license — activate a new license key
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = ActivateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const serverUrl = process.env.SMFP_LICENSE_SERVER_URL;
  const apiKey = process.env.SMFP_LICENSE_API_KEY;

  if (!serverUrl || !apiKey) {
    return NextResponse.json({ error: 'License server not configured' }, { status: 503 });
  }

  const portalDomain = parsed.data.domain
    ?? process.env.SMFP_PORTAL_DOMAIN
    ?? process.env.NEXTAUTH_URL
    ?? 'localhost';

  try {
    const res = await fetch(`${serverUrl}/api/licenses/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        licenseKey: parsed.data.licenseKey,
        portalUrl: portalDomain,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ error: (data as { error?: string }).error ?? `HTTP ${res.status}` }, { status: 400 });
    }

    const data = await res.json() as {
      payload: { plan: string; maxUsers: number; maxProcesses: number; expiresAt: string | null };
    };

    const updated = await prisma.tenantLicense.upsert({
      where: { tenantId: admin.tenantId },
      create: {
        tenantId: admin.tenantId,
        licenseKey: parsed.data.licenseKey,
        licenseType: 'GOVERNMENTAL',
        isActive: true,
        activatedAt: new Date(),
        expiresAt: data.payload.expiresAt ? new Date(data.payload.expiresAt) : null,
        domain: portalDomain,
        rawLicense: JSON.stringify(data),
      },
      update: {
        licenseKey: parsed.data.licenseKey,
        isActive: true,
        activatedAt: new Date(),
        expiresAt: data.payload.expiresAt ? new Date(data.payload.expiresAt) : null,
        domain: portalDomain,
        rawLicense: JSON.stringify(data),
      },
    });

    return NextResponse.json({
      ok: true,
      license: {
        id: updated.id,
        licenseKey: maskLicenseKey(updated.licenseKey),
        licenseType: updated.licenseType,
        isActive: updated.isActive,
        activatedAt: updated.activatedAt?.toISOString() ?? null,
        expiresAt: updated.expiresAt?.toISOString() ?? null,
        domain: updated.domain,
        lastValidatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ error: 'License server unreachable. Please try again.' }, { status: 503 });
  }
}
