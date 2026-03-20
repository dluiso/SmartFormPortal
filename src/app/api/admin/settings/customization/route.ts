import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { z } from 'zod';

const Schema = z.object({
  portalName:       z.string().min(1).max(100).optional(),
  logoUrl:          z.string().max(500).nullable().optional(),
  faviconUrl:       z.string().max(500).nullable().optional(),
  loginBgColor:     z.string().max(20).nullable().optional(),
  loginBgImageUrl:  z.string().max(500).nullable().optional(),
  primaryColor:     z.string().max(20).optional(),
  secondaryColor:   z.string().max(20).optional(),
  accentColor:      z.string().max(20).optional(),
  customCss:        z.string().max(20000).nullable().optional(),
});

function isAdmin(r: string) { return r === 'SUPER_ADMIN' || r === 'ADMIN'; }

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';
  if (!isAdmin(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: {
      portalName: true, logoUrl: true, faviconUrl: true,
      loginBgColor: true, loginBgImageUrl: true,
      primaryColor: true, secondaryColor: true, accentColor: true,
      customCss: true,
    },
  });

  return NextResponse.json({ settings: settings ?? {} });
}

export async function PATCH(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';
  if (!isAdmin(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await prisma.tenantSettings.upsert({
    where: { tenantId },
    create: { tenantId, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ ok: true });
}
