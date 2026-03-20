import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { generateToken, hash } from '@/lib/auth/encryption';
import { sendEmail, parseEmailConfig } from '@/lib/email/mailer';
import { emailVerificationTemplate } from '@/lib/email/templates';
import { checkRateLimit, RateLimits } from '@/lib/security/rateLimiter';

const schema = z.object({
  email: z.string().email().toLowerCase().trim(),
  tenantSlug: z.string().min(1).max(100).default('default'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, tenantSlug } = schema.parse(body);

    // Rate limit per email to prevent abuse
    const rl = await checkRateLimit(RateLimits.forgotPassword(email));
    if (!rl.allowed) {
      return NextResponse.json({ ok: true }); // anti-enumeration: always succeed
    }

    const user = await prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
        emailVerifiedAt: null,
        status: 'PENDING_VERIFICATION',
        tenant: { slug: tenantSlug },
      },
      include: { tenant: { include: { settings: true } } },
    });

    if (user) {
      // Invalidate any existing unverified tokens
      await prisma.emailVerification.deleteMany({
        where: { userId: user.id, usedAt: null },
      });

      const rawToken = generateToken(32);
      const tokenHash = hash(rawToken);
      await prisma.emailVerification.create({
        data: {
          userId: user.id,
          token: tokenHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const settings = user.tenant.settings;
      const emailConfig = parseEmailConfig(settings?.emailConfig ?? null);
      if (emailConfig) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
        const verifyUrl = `${appUrl}/verify-email?token=${rawToken}`;
        const tmpl = emailVerificationTemplate({
          portalName: user.tenant.name,
          userName: `${user.firstName} ${user.lastName}`,
          verifyUrl,
        });
        sendEmail(emailConfig, { to: email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text })
          .catch(() => {});
      }
    }

    // Always return success
    return NextResponse.json({ ok: true, message: 'If your account is awaiting verification, a new link has been sent.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
