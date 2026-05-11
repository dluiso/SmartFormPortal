import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { encrypt } from '@/lib/auth/encryption';

const schema = z.object({
  name:         z.string().min(1).max(100),
  description:  z.string().max(500).optional(),
  baseUrl:      z.string().min(1).max(500),
  repositoryId: z.string().min(1).max(200),
  apiVersion:   z.enum(['v1', 'v2']).default('v1'),
  username:     z.string().min(1).max(100),
  password:     z.string().min(1),
  isActive:     z.boolean().default(true),
});

export async function GET(_req: NextRequest) {
  const headersList = await headers();
  const tenantId  = headersList.get('x-tenant-id') || '';
  const userRole  = headersList.get('x-user-role') || '';
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const connections = await prisma.lfApiConnection.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, description: true, baseUrl: true,
      repositoryId: true, apiVersion: true, username: true,
      isActive: true, lastTestedAt: true, lastTestSuccess: true, createdAt: true,
    },
  });
  return NextResponse.json({ connections });
}

export async function POST(req: NextRequest) {
  try {
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id') || '';
    const userRole = headersList.get('x-user-role') || '';
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const data = schema.parse(await req.json());
    const passwordEncrypted = encrypt(data.password);
    const conn = await prisma.lfApiConnection.create({
      data: { tenantId, name: data.name, description: data.description, baseUrl: data.baseUrl,
              repositoryId: data.repositoryId, apiVersion: data.apiVersion,
              username: data.username, passwordEncrypted, isActive: data.isActive },
    });
    const { passwordEncrypted: _, ...safe } = conn;
    return NextResponse.json({ connection: safe }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    console.error('[LF-API-CONN]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
