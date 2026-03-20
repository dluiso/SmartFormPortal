import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id') || '';

    const body = await request.json();
    const data = patchSchema.parse(body);

    const dept = await prisma.department.findFirst({ where: { id, tenantId } });
    if (!dept) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await prisma.department.update({ where: { id }, data });
    return NextResponse.json({ department: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id') || '';

    const dept = await prisma.department.findFirst({ where: { id, tenantId } });
    if (!dept) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.department.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
