/**
 * Nodemailer transport factory.
 * Reads email config from TenantSettings.emailConfig (JSON, password encrypted with AES-256-CBC).
 */

import nodemailer, { type Transporter } from 'nodemailer';
import { decrypt } from '@/lib/auth/encryption';

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'mailgun';
  host: string;
  port: number;
  secure: boolean;
  user: string;
  passwordEncrypted: string;
  fromAddress: string;
  fromName: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function buildTransport(config: EmailConfig): Transporter {
  const password = decrypt(config.passwordEncrypted);

  if (config.provider === 'sendgrid') {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: { user: 'apikey', pass: password },
    });
  }

  if (config.provider === 'mailgun') {
    return nodemailer.createTransport({
      host: config.host || 'smtp.mailgun.org',
      port: config.port || 587,
      secure: false,
      auth: { user: config.user, pass: password },
    });
  }

  // Default: generic SMTP
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: password },
  });
}

export async function sendEmail(
  config: EmailConfig,
  options: SendEmailOptions
): Promise<void> {
  const transport = buildTransport(config);
  await transport.sendMail({
    from: `"${config.fromName}" <${config.fromAddress}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

export async function testEmailConnection(
  config: EmailConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = buildTransport(config);
    await transport.verify();
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function parseEmailConfig(raw: string | null): EmailConfig | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EmailConfig;
  } catch {
    return null;
  }
}
