import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { encrypt } from '@/lib/auth/encryption';

const patchSchema = z.object({
  name:         z.string().min(1).max(100).optional(),
  description:  z.string().max(500).optional().nullable(),
  baseUrl:      z.string().min(1).max(500).optional(),
  repositoryId: z.string().min(1).max(200).optional(),
  apiVersion:   z.enum(['v1', 'v2']).optional(),
  username:     z.string().min(1).max(100).optional(),
  password:     z.string().optional(),
  isActive:     z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id') || '';
    const userRole = headersList.get('x-user-role') || '';
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const conn = await prisma.lfApiConnection.findFirst({ where: { id, tenantId } });
    if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const data = patchSchema.parse(await req.json());
    const update: Record<string, unknown> = {};
    if (data.name !== undefined)         update.name         = data.name;
    if (data.description !== undefined)  update.description  = data.description;
    if (data.baseUrl !== undefined)      update.baseUrl      = data.baseUrl;
    if (data.repositoryId !== undefined) update.repositoryId = data.repositoryId;
    if (data.apiVersion !== undefined)   update.apiVersion   = data.apiVersion;
    if (data.username !== undefined)     update.username     = data.username;
    if (data.isActive !== undefined)     update.isActive     = data.isActive;
    if (data.password)                   update.passwordEncrypted = encrypt(data.password);

    const updated = await prisma.lfApiConnection.update({ where: { id }, data: update });
    const { passwordEncrypted: _, ...safe } = updated;
    return NextResponse.json({ connection: safe });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id') || '';
    const userRole = headersList.get('x-user-role') || '';
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const conn = await prisma.lfApiConnection.findFirst({ where: { id, tenantId } });
    if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.lfApiConnection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
