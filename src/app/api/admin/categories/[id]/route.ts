import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().max(20).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id') || '';
    const cat = await prisma.category.findFirst({ where: { id, tenantId } });
    if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const data = patchSchema.parse(await req.json());
    const updated = await prisma.category.update({ where: { id }, data });
    return NextResponse.json({ category: updated });
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
    const cat = await prisma.category.findFirst({ where: { id, tenantId } });
    if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
