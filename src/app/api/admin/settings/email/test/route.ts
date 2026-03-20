import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { testEmailConnection, parseEmailConfig } from '@/lib/email/mailer';
import { sendEmail } from '@/lib/email/mailer';

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') || '';
  const userRole = req.headers.get('x-user-role') || '';

  if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: { emailConfig: true, portalName: true },
  });

  const config = parseEmailConfig(settings?.emailConfig ?? null);
  if (!config) {
    return NextResponse.json({ error: 'No email config saved yet.' }, { status: 400 });
  }

  // First verify the connection
  const verify = await testEmailConnection(config);
  if (!verify.success) {
    return NextResponse.json({ success: false, error: verify.error });
  }

  // Send a test email to the from address itself
  try {
    await sendEmail(config, {
      to: config.fromAddress,
      subject: `[${settings?.portalName ?? 'SmartFormPortal'}] SMTP Test`,
      html: `<p style="font-family:sans-serif;color:#333">SMTP connection is working correctly.</p>`,
      text: 'SMTP connection is working correctly.',
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
