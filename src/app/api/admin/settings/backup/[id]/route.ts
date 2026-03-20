import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { encrypt } from '@/lib/auth/encryption';
import { z } from 'zod';

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  cronExpression: z.string().max(100).nullable().optional(),
  retentionDays: z.number().int().min(1).max(365).optional(),
  isActive: z.boolean().optional(),
  config: z.record(z.string(), z.string()).optional(),
});

function isAdmin(r: string) { return r === 'SUPER_ADMIN' || r === 'ADMIN'; }

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';
  if (!isAdmin(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { config, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (config !== undefined) updateData.configEncrypted = encrypt(JSON.stringify(config));

  const updated = await prisma.backupConfig.updateMany({
    where: { id, tenantId },
    data: updateData,
  });
  if (updated.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';
  if (!isAdmin(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.backupConfig.deleteMany({ where: { id, tenantId } });
  return NextResponse.json({ ok: true });
}
