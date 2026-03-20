import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { encrypt } from '@/lib/auth/encryption';
import { z } from 'zod';

const ConfigSchema = z.object({
  name: z.string().min(1).max(100),
  destinationType: z.enum(['LOCAL', 'SFTP', 'GOOGLE_DRIVE', 'ONEDRIVE', 'S3_COMPATIBLE']),
  cronExpression: z.string().max(100).optional(),
  retentionDays: z.number().int().min(1).max(365).default(30),
  isActive: z.boolean().default(true),
  // Destination-specific config (plaintext — we encrypt before storing)
  config: z.record(z.string(), z.string()).optional(),
});

function isAdmin(r: string) { return r === 'SUPER_ADMIN' || r === 'ADMIN'; }

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';
  if (!isAdmin(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const configs = await prisma.backupConfig.findMany({
    where: { tenantId },
    include: {
      backupRuns: {
        orderBy: { startedAt: 'desc' },
        take: 1,
        select: { status: true, startedAt: true, completedAt: true, fileSize: true, errorMessage: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Strip encrypted config before returning
  return NextResponse.json({
    configs: configs.map(({ configEncrypted: _, ...c }) => c),
  });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';
  if (!isAdmin(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = ConfigSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { config, ...data } = parsed.data;
  const configEncrypted = config ? encrypt(JSON.stringify(config)) : encrypt('{}');

  const created = await prisma.backupConfig.create({
    data: { tenantId, ...data, configEncrypted },
  });

  const { configEncrypted: _, ...safe } = created;
  return NextResponse.json({ config: safe });
}
