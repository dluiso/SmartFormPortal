import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { UserStatus } from '@prisma/client';
import { hash } from '@/lib/auth/encryption';

const patchSchema = z.object({
  status: z.nativeEnum(UserStatus).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id') || '';
    const actorId = headersList.get('x-user-id') || '';

    const body = await request.json();
    const data = patchSchema.parse(body);

    const user = await prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        publicId: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        emailVerifiedAt: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        tenantId,
        userId: actorId,
        action: 'user_updated',
        entityType: 'User',
        entityId: id,
        details: data,
      },
    });

    return NextResponse.json({ user: updated });
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
    const actorId = headersList.get('x-user-id') || '';

    const user = await prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Soft-delete: mark inactive and anonymize email to preserve history
    await prisma.user.update({
      where: { id },
      data: { status: UserStatus.INACTIVE, email: `deleted_${hash(user.email)}` },
    });

    await prisma.userSession.deleteMany({ where: { userId: id } });

    await prisma.activityLog.create({
      data: {
        tenantId,
        userId: actorId,
        action: 'user_deleted',
        entityType: 'User',
        entityId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
