import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { encrypt } from '@/lib/auth/encryption';
import { z } from 'zod';

const EmailConfigSchema = z.object({
  provider: z.enum(['smtp', 'sendgrid', 'mailgun']),
  host: z.string().max(255).optional().default(''),
  port: z.number().int().min(1).max(65535).optional().default(587),
  secure: z.boolean().optional().default(false),
  user: z.string().max(255),
  password: z.string().optional(), // plaintext — we encrypt before storing
  fromAddress: z.string().email(),
  fromName: z.string().max(100),
});

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';

  if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: { emailConfig: true },
  });

  if (!settings?.emailConfig) {
    return NextResponse.json({ config: null });
  }

  try {
    const config = JSON.parse(settings.emailConfig);
    // Never return the encrypted password
    const { passwordEncrypted: _, ...safeConfig } = config;
    return NextResponse.json({ config: { ...safeConfig, hasPassword: !!_ } });
  } catch {
    return NextResponse.json({ config: null });
  }
}

export async function PATCH(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';

  if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = EmailConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Load existing config to preserve password if not changed
  const existing = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: { emailConfig: true },
  });

  let passwordEncrypted: string;
  if (data.password) {
    passwordEncrypted = encrypt(data.password);
  } else if (existing?.emailConfig) {
    try {
      const prev = JSON.parse(existing.emailConfig);
      passwordEncrypted = prev.passwordEncrypted ?? '';
    } catch {
      passwordEncrypted = '';
    }
  } else {
    passwordEncrypted = '';
  }

  const configToStore = {
    provider: data.provider,
    host: data.host,
    port: data.port,
    secure: data.secure,
    user: data.user,
    passwordEncrypted,
    fromAddress: data.fromAddress,
    fromName: data.fromName,
  };

  await prisma.tenantSettings.upsert({
    where: { tenantId },
    create: { tenantId, emailConfig: JSON.stringify(configToStore) },
    update: { emailConfig: JSON.stringify(configToStore) },
  });

  return NextResponse.json({ ok: true });
}
