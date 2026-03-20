import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { z } from 'zod';

const AddSchema = z.object({
  ipOrCidr: z.string().min(1).max(50),
  isWhitelist: z.boolean(),
  description: z.string().max(255).optional(),
});

function isAdmin(r: string) { return r === 'SUPER_ADMIN' || r === 'ADMIN'; }

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';
  if (!isAdmin(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rules = await prisma.ipRule.findMany({
    where: { tenantId },
    orderBy: [{ isWhitelist: 'desc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';
  if (!isAdmin(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const rule = await prisma.ipRule.create({
    data: { tenantId, ...parsed.data },
  });
  return NextResponse.json({ rule });
}
