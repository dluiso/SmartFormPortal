import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { PORTAL_FIELDS } from '@/lib/laserfiche/fieldMapper';
import { z } from 'zod';

const MappingSchema = z.object({
  portalField: z.enum(PORTAL_FIELDS),
  externalColumn: z.string().min(1).max(255),
  label: z.string().max(100).optional(),
  dbConnectionId: z.string().uuid(),
});

const BulkSaveSchema = z.object({
  mappings: z.array(MappingSchema),
});

// GET — list field mappings for a process template
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: templateId } = await params;
  const tenantId = req.headers.get('x-tenant-id') || '';

  const template = await prisma.processTemplate.findFirst({
    where: { id: templateId, tenantId },
    select: { id: true },
  });

  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const mappings = await prisma.fieldMapping.findMany({
    where: { processTemplateId: templateId },
    orderBy: { portalField: 'asc' },
  });

  return NextResponse.json({ mappings });
}

// PUT — bulk save (replace all mappings for this template)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: templateId } = await params;
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';

  if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const template = await prisma.processTemplate.findFirst({
    where: { id: templateId, tenantId },
    select: { id: true },
  });

  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = BulkSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { mappings } = parsed.data;

  // Replace all mappings in a transaction
  await prisma.$transaction([
    prisma.fieldMapping.deleteMany({ where: { processTemplateId: templateId } }),
    ...mappings.map((m) =>
      prisma.fieldMapping.create({
        data: {
          tenantId,
          processTemplateId: templateId,
          dbConnectionId: m.dbConnectionId,
          portalField: m.portalField,
          externalColumn: m.externalColumn,
          label: m.label ?? null,
        },
      })
    ),
  ]);

  const saved = await prisma.fieldMapping.findMany({
    where: { processTemplateId: templateId },
    orderBy: { portalField: 'asc' },
  });

  return NextResponse.json({ mappings: saved });
}

// DELETE — remove a single field mapping by portalField
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: templateId } = await params;
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';

  if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { portalField } = await req.json();

  await prisma.fieldMapping.deleteMany({
    where: { processTemplateId: templateId, portalField },
  });

  return NextResponse.json({ ok: true });
}
