import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';

const schema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  publicUrl: z.string().max(2048).optional().nullable(),
  isPublic: z.boolean().default(true),
  isActive: z.boolean().default(true),
  requiresRenewal: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  availableFrom: z.string().datetime({ offset: true }).optional().nullable(),
  availableUntil: z.string().datetime({ offset: true }).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  dbConnectionId: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id') || '';
    const body = await request.json();
    // Convert date strings to proper ISO (date-only → end of day UTC)
    if (body.availableFrom && !body.availableFrom.includes('T')) {
      body.availableFrom = `${body.availableFrom}T00:00:00Z`;
    }
    if (body.availableUntil && !body.availableUntil.includes('T')) {
      body.availableUntil = `${body.availableUntil}T23:59:59Z`;
    }
    const data = schema.parse(body);
    const template = await prisma.processTemplate.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        publicUrl: data.publicUrl ?? '',
        isPublic: data.isPublic,
        isActive: data.isActive,
        requiresRenewal: data.requiresRenewal,
        sortOrder: data.sortOrder,
        availableFrom: data.availableFrom ? new Date(data.availableFrom) : null,
        availableUntil: data.availableUntil ? new Date(data.availableUntil) : null,
        categoryId: data.categoryId ?? null,
        departmentId: data.departmentId ?? null,
        dbConnectionId: data.dbConnectionId ?? null,
      },
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Validation failed', issues: error.issues }, { status: 400 });
    console.error('[PROCESS-TEMPLATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
