import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { z } from 'zod';

const AddSchema = z.object({
  zipCode: z.string().min(1).max(20),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
});

function isAdmin(role: string) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';
  if (!isAdmin(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [zipCodes, settings] = await Promise.all([
    prisma.allowedZipCode.findMany({
      where: { tenantId },
      orderBy: { zipCode: 'asc' },
    }),
    prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { enforceZipRestriction: true },
    }),
  ]);

  return NextResponse.json({
    zipCodes,
    enforceZipRestriction: settings?.enforceZipRestriction ?? false,
  });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';
  if (!isAdmin(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { zipCode, city, state } = parsed.data;

  try {
    const created = await prisma.allowedZipCode.create({
      data: { tenantId, zipCode: zipCode.trim().toUpperCase(), city, state },
    });
    return NextResponse.json({ zipCode: created });
  } catch {
    return NextResponse.json({ error: 'ZIP code already exists.' }, { status: 409 });
  }
}

export async function PATCH(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';
  if (!isAdmin(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { enforceZipRestriction } = await req.json();

  await prisma.tenantSettings.upsert({
    where: { tenantId },
    create: { tenantId, enforceZipRestriction: !!enforceZipRestriction },
    update: { enforceZipRestriction: !!enforceZipRestriction },
  });

  return NextResponse.json({ ok: true });
}
