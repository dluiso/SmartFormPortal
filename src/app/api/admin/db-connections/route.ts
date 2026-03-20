import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { encrypt } from '@/lib/auth/encryption';

const schema = z.object({
  name: z.string().min(1).max(100),
  server: z.string().min(1).max(255),
  port: z.number().int().optional(),
  database: z.string().min(1).max(100),
  username: z.string().min(1).max(100),
  password: z.string().min(1),
  tableName: z.string().min(1).max(100),
  isActive: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id') || '';
    const userRole = headersList.get('x-user-role') || '';
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const data = schema.parse(await request.json());

    const passwordEncrypted = encrypt(data.password);

    const connection = await prisma.dbConnection.create({
      data: {
        tenantId,
        name: data.name,
        serverAddress: data.server,
        port: data.port ?? 1433,
        databaseName: data.database,
        username: data.username,
        passwordEncrypted,
        tableName: data.tableName,
        isActive: data.isActive,
      },
    });

    // Don't return encrypted password
    const { passwordEncrypted: _, ...safe } = connection;
    return NextResponse.json({ connection: safe }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    console.error('[DB-CONN]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
