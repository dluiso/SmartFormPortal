import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import { decrypt } from '@/lib/auth/encryption';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id') || '';

    const conn = await prisma.dbConnection.findFirst({ where: { id, tenantId } });
    if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const password = decrypt(conn.passwordEncrypted);

    let success = false;
    let errorMsg = '';

    try {
      const mssql = await import('mssql');
      const pool = await mssql.default.connect({
        server: conn.serverAddress,
        port: conn.port ?? 1433,
        database: conn.databaseName,
        user: conn.username,
        password,
        options: {
          encrypt: false,
          trustServerCertificate: true,
          connectTimeout: 8000,
        },
      });
      // Simple query to verify connectivity
      await pool.request().query('SELECT 1 AS test');
      await pool.close();
      success = true;
    } catch (err: unknown) {
      errorMsg = err instanceof Error ? err.message : String(err);
    }

    await prisma.dbConnection.update({
      where: { id },
      data: { lastTestedAt: new Date(), lastTestSuccess: success },
    });

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: errorMsg });
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Test failed' }, { status: 500 });
  }
}
