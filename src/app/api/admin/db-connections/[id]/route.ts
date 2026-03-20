import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { encrypt } from '@/lib/auth/encryption';

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  server: z.string().max(255).optional(),
  port: z.number().int().optional(),
  database: z.string().max(100).optional(),
  username: z.string().max(100).optional(),
  password: z.string().optional(),
  tableName: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
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
    const conn = await prisma.dbConnection.findFirst({ where: { id, tenantId } });
    if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const data = patchSchema.parse(await req.json());
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.server !== undefined) updateData.serverAddress = data.server;
    if (data.port !== undefined) updateData.port = data.port;
    if (data.database !== undefined) updateData.databaseName = data.database;
    if (data.username !== undefined) updateData.username = data.username;
    if (data.tableName !== undefined) updateData.tableName = data.tableName;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (data.password) {
      updateData.passwordEncrypted = encrypt(data.password);
    }

    const updated = await prisma.dbConnection.update({ where: { id }, data: updateData });
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
    const conn = await prisma.dbConnection.findFirst({ where: { id, tenantId } });
    if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.dbConnection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
