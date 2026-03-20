import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { UserType } from '@prisma/client';
import { checkRateLimit, RateLimits } from '@/lib/security/rateLimiter';
import { generateToken, hash } from '@/lib/auth/encryption';
import { sendEmail, parseEmailConfig } from '@/lib/email/mailer';
import { emailVerificationTemplate } from '@/lib/email/templates';

const registerSchema = z.object({
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  phone: z.string().min(7).max(20).trim(),
  organization: z.string().min(1).max(200).trim(),
  userType: z.enum(['RESIDENT', 'BUSINESS_OWNER']),
  addressLine: z.string().min(1).max(500).trim(),
  city: z.string().min(1).max(100).trim(),
  state: z.string().min(1).max(100).trim(),
  zipCode: z.string().min(1).max(20).trim(),
  country: z.string().min(2).max(10).trim().default('US'),
  password: z.string().min(8),
  tenantSlug: z.string().optional().default('default'),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? request.headers.get('x-real-ip')
      ?? '0.0.0.0';
    const rl = await checkRateLimit(RateLimits.register(ip));
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(rl.resetAt - Math.floor(Date.now() / 1000)) } }
      );
    }

    const body = await request.json();
    const data = registerSchema.parse(body);

    // Validate password strength
    const passwordError = validatePasswordStrength(data.password);
    if (passwordError) {
      return NextResponse.json(
        { error: passwordError, code: 'WEAK_PASSWORD' },
        { status: 400 }
      );
    }

    // Find tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: data.tenantSlug },
      include: { settings: true },
    });

    if (!tenant || !tenant.isActive) {
      return NextResponse.json(
        { error: 'Invalid tenant', code: 'INVALID_TENANT' },
        { status: 400 }
      );
    }

    const settings = tenant.settings;

    // Check if registration is allowed
    if (settings && !settings.allowRegistration) {
      return NextResponse.json(
        { error: 'Registration is currently closed', code: 'REGISTRATION_CLOSED' },
        { status: 403 }
      );
    }

    // Check ZIP code restriction
    if (settings?.enforceZipRestriction) {
      const allowed = await prisma.allowedZipCode.findUnique({
        where: {
          tenantId_zipCode: { tenantId: tenant.id, zipCode: data.zipCode },
        },
      });
      if (!allowed) {
        return NextResponse.json(
          { error: 'Registration not available for your ZIP code', code: 'ZIP_NOT_ALLOWED' },
          { status: 403 }
        );
      }
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: {
        tenantId_email: { tenantId: tenant.id, email: data.email },
      },
    });

    if (existing) {
      // Vague message to prevent email enumeration
      return NextResponse.json(
        { error: 'An account with this email already exists', code: 'EMAIL_EXISTS' },
        { status: 409 }
      );
    }

    // Find the CLIENT role for this tenant
    const clientRole = await prisma.role.findUnique({
      where: {
        tenantId_systemRole: { tenantId: tenant.id, systemRole: 'CLIENT' },
      },
    });

    if (!clientRole) {
      return NextResponse.json(
        { error: 'System configuration error', code: 'ROLE_NOT_FOUND' },
        { status: 500 }
      );
    }

    const passwordHash = await hashPassword(data.password);

    // Create user in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          organization: data.organization,
          userType: data.userType as UserType,
          addressLine: data.addressLine,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          country: data.country,
          passwordHash,
          status: 'PENDING_VERIFICATION',
          preferredLanguage: settings?.defaultLanguage || 'en',
        },
      });

      // Assign CLIENT role
      await tx.userRole.create({
        data: {
          userId: newUser.id,
          roleId: clientRole.id,
        },
      });

      // Log registration
      await tx.activityLog.create({
        data: {
          tenantId: tenant.id,
          userId: newUser.id,
          action: 'auth.register',
          entityType: 'User',
          entityId: newUser.id,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          severity: 'INFO',
          details: { userType: data.userType },
        },
      });

      return newUser;
    });

    // Create email verification token and send email (fire-and-forget)
    // Store only the SHA-256 hash — the raw token is never persisted
    const rawVerifyToken = generateToken(32);
    const verifyTokenHash = hash(rawVerifyToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.emailVerification.create({
      data: { userId: user.id, token: verifyTokenHash, expiresAt },
    });

    const emailConfig = parseEmailConfig(settings?.emailConfig ?? null);
    if (emailConfig) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
      const verifyUrl = `${appUrl}/verify-email?token=${rawVerifyToken}`;
      const tmpl = emailVerificationTemplate({
        portalName: tenant.name,
        userName: `${data.firstName} ${data.lastName}`,
        verifyUrl,
      });
      sendEmail(emailConfig, { to: data.email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text })
        .catch(() => {});
    } else if (process.env.NODE_ENV === 'development') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      console.log(`[DEV] Email verify link for ${data.email}: ${appUrl}/verify-email?token=${rawVerifyToken}`);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Account created. Please check your email to verify your address.',
        userId: user.publicId,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
