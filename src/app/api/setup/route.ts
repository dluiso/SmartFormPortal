import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { SystemRole, TenancyMode } from '@prisma/client';

const setupSchema = z.object({
  tenancyMode: z.enum(['SINGLE', 'MULTI']),
  portalName: z.string().min(2).max(100),
  domain: z.string().optional(),
  adminFirstName: z.string().min(1).max(100),
  adminLastName: z.string().min(1).max(100),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

export async function GET() {
  const config = await prisma.systemConfig.findFirst();
  return NextResponse.json({ isInstalled: config?.isInstalled ?? false });
}

export async function POST(request: NextRequest) {
  try {
    // Check if already installed
    const existingConfig = await prisma.systemConfig.findFirst();
    if (existingConfig?.isInstalled) {
      return NextResponse.json(
        { error: 'Already installed', code: 'ALREADY_INSTALLED' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = setupSchema.parse(body);

    // Run everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create system config
      const systemConfig = await tx.systemConfig.upsert({
        where: { id: existingConfig?.id ?? 'singleton' },
        create: {
          id: 'singleton',
          tenancyMode: data.tenancyMode as TenancyMode,
          isInstalled: true,
          installedAt: new Date(),
        },
        update: {
          tenancyMode: data.tenancyMode as TenancyMode,
          isInstalled: true,
          installedAt: new Date(),
        },
      });

      // 2. Create the first tenant
      const tenant = await tx.tenant.create({
        data: {
          name: data.portalName,
          slug: 'default',
          domain: data.domain || null,
          isActive: true,
        },
      });

      // 3. Create tenant settings
      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          portalName: data.portalName,
          defaultLanguage: 'en',
        },
      });

      // 4. Create system roles
      const adminRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'Super Admin',
          systemRole: SystemRole.SUPER_ADMIN,
          description: 'Full system access',
          isSystem: true,
        },
      });

      await tx.role.createMany({
        data: [
          {
            tenantId: tenant.id,
            name: 'Administrator',
            systemRole: SystemRole.ADMIN,
            description: 'Administrative access',
            isSystem: true,
          },
          {
            tenantId: tenant.id,
            name: 'Staff',
            systemRole: SystemRole.STAFF,
            description: 'Staff access',
            isSystem: true,
          },
          {
            tenantId: tenant.id,
            name: 'Client',
            systemRole: SystemRole.CLIENT,
            description: 'Client access',
            isSystem: true,
          },
        ],
      });

      // 5. Create the super admin user
      const passwordHash = await hashPassword(data.adminPassword);
      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          firstName: data.adminFirstName,
          lastName: data.adminLastName,
          email: data.adminEmail,
          phone: '',
          organization: data.portalName,
          userType: 'RESIDENT',
          addressLine: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'US',
          passwordHash,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          preferredLanguage: 'en',
        },
      });

      // 6. Assign SUPER_ADMIN role to admin user
      await tx.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      });

      return { tenant, adminUser, systemConfig };
    });

    const response = NextResponse.json({
      success: true,
      message: 'Installation complete',
      tenantId: result.tenant.id,
    });

    // Set the installed cookie so middleware knows setup is done
    response.cookies.set('sfp_installed', 'true', {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
