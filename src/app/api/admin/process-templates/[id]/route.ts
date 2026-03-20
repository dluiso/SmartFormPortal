import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  publicUrl: z.string().max(2048).optional().nullable(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
  requiresRenewal: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  availableFrom: z.string().optional().nullable(),
  availableUntil: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  dbConnectionId: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id') || '';
    const tmpl = await prisma.processTemplate.findFirst({ where: { id, tenantId } });
    if (!tmpl) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    if (body.availableFrom && !body.availableFrom.includes('T')) body.availableFrom = `${body.availableFrom}T00:00:00Z`;
    if (body.availableUntil && !body.availableUntil.includes('T')) body.availableUntil = `${body.availableUntil}T23:59:59Z`;
    const data = patchSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.publicUrl !== undefined) updateData.publicUrl = data.publicUrl;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.requiresRenewal !== undefined) updateData.requiresRenewal = data.requiresRenewal;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
    if (data.dbConnectionId !== undefined) updateData.dbConnectionId = data.dbConnectionId;
    if (data.availableFrom !== undefined) {
      updateData.availableFrom = data.availableFrom ? new Date(data.availableFrom) : null;
    }
    if (data.availableUntil !== undefined) {
      updateData.availableUntil = data.availableUntil ? new Date(data.availableUntil) : null;
    }

    const updated = await prisma.processTemplate.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json({ template: updated });
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
    const tmpl = await prisma.processTemplate.findFirst({ where: { id, tenantId } });
    if (!tmpl) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Soft delete
    await prisma.processTemplate.update({ where: { id }, data: { isActive: false, isPublic: false } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
