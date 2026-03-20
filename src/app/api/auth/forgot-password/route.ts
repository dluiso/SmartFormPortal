import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { generateToken, hash } from '@/lib/auth/encryption';
import { sendEmail, parseEmailConfig } from '@/lib/email/mailer';
import { passwordResetTemplate } from '@/lib/email/templates';
import { checkRateLimit, RateLimits } from '@/lib/security/rateLimiter';

const schema = z.object({
  email: z.string().email().toLowerCase().trim(),
  tenantSlug: z.string().min(1).max(100).default('default'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, tenantSlug } = schema.parse(body);

    const rl = await checkRateLimit(RateLimits.forgotPassword(email));
    if (!rl.allowed) {
      // Return 200 to avoid email enumeration — attacker shouldn't know if the limit was hit
      return NextResponse.json({ ok: true });
    }

    // Always return success to prevent email enumeration
    // Scope lookup to the specific tenant to prevent cross-tenant info leak
    const user = await prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
        tenant: { slug: tenantSlug },
      },
      include: { tenant: true },
    });

    if (user) {
      // Delete any existing reset tokens for this user
      await prisma.passwordReset.deleteMany({ where: { userId: user.id } });

      // Create a new reset token valid for 1 hour
      // Store only the SHA-256 hash — the raw token is never persisted
      const rawToken = generateToken(48);
      const tokenHash = hash(rawToken);
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          token: tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

      // Try to send email if configured
      const tenantSettings = await prisma.tenantSettings.findUnique({
        where: { tenantId: user.tenantId },
        select: { emailConfig: true, portalName: true },
      });
      const emailConfig = parseEmailConfig(tenantSettings?.emailConfig ?? null);
      if (emailConfig) {
        const tmpl = passwordResetTemplate({
          portalName: tenantSettings?.portalName ?? 'SmartFormPortal',
          resetUrl,
        });
        sendEmail(emailConfig, { to: email, ...tmpl }).catch(() => {});
      } else if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
      }

      await prisma.activityLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'auth.forgot_password',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          severity: 'INFO',
        },
      });
    }

    // Always success to prevent enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, a reset link has been sent.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
