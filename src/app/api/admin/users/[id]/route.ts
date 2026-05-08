import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { UserStatus, SystemRole } from '@prisma/client';
import { hash } from '@/lib/auth/encryption';

const patchSchema = z.object({
  status:       z.nativeEnum(UserStatus).optional(),
  firstName:    z.string().min(1).optional(),
  lastName:     z.string().min(1).optional(),
  email:        z.string().email().optional(),
  phone:        z.string().optional(),
  organization: z.string().optional(),
  systemRole:   z.nativeEnum(SystemRole).optional(),
  departmentId: z.string().nullable().optional(), // null = remove from department
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id') || '';
    const actorId  = headersList.get('x-user-id') || '';
    const actorRole = headersList.get('x-user-role') || '';

    const body = await request.json();
    const data = patchSchema.parse(body);

    const user = await prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { roles: { include: { role: true } }, departments: true },
    });
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Prevent non-super-admins from editing super-admin accounts
    const targetRole = user.roles[0]?.role.systemRole;
    if (targetRole === SystemRole.SUPER_ADMIN && actorRole !== SystemRole.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Extract non-scalar fields before updating user record
    const { systemRole, departmentId, ...scalarData } = data;

    // Normalize email
    if (scalarData.email) {
      scalarData.email = scalarData.email.toLowerCase().trim();
      // Check uniqueness
      const conflict = await prisma.user.findFirst({
        where: { tenantId, email: scalarData.email, id: { not: id } },
      });
      if (conflict) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    // Update scalar fields
    const updated = await prisma.user.update({
      where: { id },
      data: scalarData,
      include: {
        roles: { include: { role: true } },
        departments: { include: { department: true } },
      },
    });

    // Update role if changed
    if (systemRole && systemRole !== targetRole) {
      const newRole = await prisma.role.findUnique({
        where: { tenantId_systemRole: { tenantId, systemRole } },
      });
      if (newRole) {
        // Remove all existing roles and assign new one
        await prisma.userRole.deleteMany({ where: { userId: id } });
        await prisma.userRole.create({ data: { userId: id, roleId: newRole.id, assignedBy: actorId } });
      }
    }

    // Update department if provided
    if (departmentId !== undefined) {
      await prisma.userDepartment.deleteMany({ where: { userId: id } });
      if (departmentId) {
        await prisma.userDepartment.create({
          data: { userId: id, departmentId, assignedBy: actorId },
        });
      }
    }

    // Re-fetch with updated relations
    const fresh = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
        departments: { include: { department: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        tenantId, userId: actorId,
        action: 'user_updated',
        entityType: 'User',
        entityId: id,
        details: { ...scalarData, systemRole, departmentId },
      },
    });

    return NextResponse.json(fresh);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    console.error('[PATCH /api/admin/users/[id]]', error);
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
    const actorId  = headersList.get('x-user-id') || '';

    const user = await prisma.user.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Soft-delete: anonymize email, mark inactive, set deletedAt
    await prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.INACTIVE,
        email: `deleted_${hash(user.email)}`,
        deletedAt: new Date(),
      },
    });

    await prisma.userSession.deleteMany({ where: { userId: id } });

    await prisma.activityLog.create({
      data: {
        tenantId, userId: actorId,
        action: 'user_deleted',
        entityType: 'User',
        entityId: id,
        details: {},
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
