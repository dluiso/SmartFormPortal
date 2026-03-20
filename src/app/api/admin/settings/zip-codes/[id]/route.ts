import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';

  if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.allowedZipCode.deleteMany({ where: { id, tenantId } });
  return NextResponse.json({ ok: true });
}
