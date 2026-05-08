import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { SystemRole, UserStatus, UserType } from '@prisma/client';

const createUserSchema = z.object({
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  systemRole: z.nativeEnum(SystemRole).default(SystemRole.CLIENT),
  departmentId: z.string().optional(),
  phone: z.string().default(''),
  organization: z.string().default(''),
  userType: z.nativeEnum(UserType).default(UserType.RESIDENT),
});

export async function POST(req: NextRequest) {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '';
  const adminUserId = headersList.get('x-user-id') || '';
  const adminRole = headersList.get('x-user-role') || '';

  // Only SUPER_ADMIN or ADMIN can create users
  if (adminRole !== SystemRole.SUPER_ADMIN && adminRole !== SystemRole.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Normalize email to lowercase (login route does the same lookup)
  const email = parsed.data.email.toLowerCase().trim();
  const { firstName, lastName, password, systemRole, departmentId, phone, organization, userType } = parsed.data;

  // Non-super-admins cannot create SUPER_ADMIN users
  if (systemRole === SystemRole.SUPER_ADMIN && adminRole !== SystemRole.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Insufficient permissions to create Super Admin' }, { status: 403 });
  }

  // Check email not already taken in this tenant
  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId, email } },
  });
  if (existing) {
    return NextResponse.json({ error: 'Email already registered in this tenant' }, { status: 409 });
  }

  // Find the Role record for this tenant + systemRole
  const role = await prisma.role.findUnique({
    where: { tenantId_systemRole: { tenantId, systemRole } },
  });
  if (!role) {
    return NextResponse.json({ error: `Role "${systemRole}" not found for tenant` }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      tenantId,
      email,
      firstName,
      lastName,
      passwordHash,
      phone,
      organization,
      userType,
      addressLine: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      roles: {
        create: { roleId: role.id, assignedBy: adminUserId },
      },
      ...(departmentId
        ? { departments: { create: { departmentId, assignedBy: adminUserId } } }
        : {}),
    },
    include: {
      roles: { include: { role: true } },
      departments: { include: { department: true } },
    },
  });

  await prisma.activityLog.create({
    data: {
      tenantId,
      userId: adminUserId,
      action: 'user_created_by_admin',
      entityType: 'User',
      entityId: user.id,
      details: { email, systemRole, departmentId: departmentId ?? null },
    },
  });

  // Return user without sensitive fields
  const { passwordHash: _, ...safeUser } = user as typeof user & { passwordHash: string };
  return NextResponse.json(safeUser, { status: 201 });
}
