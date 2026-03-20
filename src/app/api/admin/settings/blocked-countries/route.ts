import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { z } from 'zod';

const AddSchema = z.object({
  countryCode: z.string().length(2).toUpperCase(),
  countryName: z.string().min(1).max(100),
});

function isAdmin(r: string) { return r === 'SUPER_ADMIN' || r === 'ADMIN'; }

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';
  if (!isAdmin(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const countries = await prisma.blockedCountry.findMany({
    where: { tenantId },
    orderBy: { countryName: 'asc' },
  });
  return NextResponse.json({ countries });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';
  if (!isAdmin(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const country = await prisma.blockedCountry.create({
      data: { tenantId, ...parsed.data },
    });
    return NextResponse.json({ country });
  } catch {
    return NextResponse.json({ error: 'Country already blocked.' }, { status: 409 });
  }
}
