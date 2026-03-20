import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

function isAdmin(role: string) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';
  if (!isAdmin(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const languages = await prisma.languageFile.findMany({
    where: { tenantId },
    select: {
      id: true,
      code: true,
      name: true,
      isDefault: true,
      isBuiltIn: true,
      isComplete: true,
      missingKeys: true,
      updatedAt: true,
    },
    orderBy: { code: 'asc' },
  });

  return NextResponse.json({ languages });
}
