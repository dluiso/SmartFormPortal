/**
 * Transactional email HTML templates.
 * All return { subject, html, text } ready to pass to sendEmail().
 */

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0f172a; color: #e2e8f0; margin: 0; padding: 0;
`;
const CARD_STYLE = `
  max-width: 520px; margin: 40px auto; background: #1e293b;
  border-radius: 12px; padding: 32px; border: 1px solid #334155;
`;
const BUTTON_STYLE = `
  display: inline-block; padding: 12px 24px; background: #3b82f6;
  color: #fff !important; text-decoration: none; border-radius: 8px;
  font-weight: 600; font-size: 14px; margin-top: 24px;
`;
const FOOTER_STYLE = `
  text-align: center; margin-top: 32px; font-size: 12px; color: #475569;
`;

function wrap(portalName: string, body: string): string {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <h1 style="font-size:18px;font-weight:700;color:#f8fafc;margin:0 0 24px">
      ${portalName}
    </h1>
    ${body}
    <div style="${FOOTER_STYLE}">
      You received this email because you have an account on ${portalName}.<br>
      Please do not reply to this email.
    </div>
  </div>
</body></html>`;
}

export function processStatusChangedTemplate(opts: {
  portalName: string;
  processName: string;
  previousStatus: string;
  newStatus: string;
  actionUrl: string;
}): EmailTemplate {
  const subject = `[${opts.portalName}] Your application status has changed`;
  const formatted = opts.newStatus.toLowerCase().replace(/_/g, ' ');
  const html = wrap(
    opts.portalName,
    `<p style="font-size:16px;font-weight:600;color:#f8fafc;margin:0 0 12px">
      Application Status Update
    </p>
    <p style="color:#94a3b8;margin:0 0 8px">
      Your <strong style="color:#e2e8f0">${opts.processName}</strong> application
      status has changed to:
    </p>
    <p style="font-size:20px;font-weight:700;color:#60a5fa;margin:16px 0">
      ${formatted.charAt(0).toUpperCase() + formatted.slice(1)}
    </p>
    <a href="${opts.actionUrl}" style="${BUTTON_STYLE}">View My Applications</a>`
  );
  const text = `Your "${opts.processName}" application status changed to ${formatted}.\n\nView: ${opts.actionUrl}`;
  return { subject, html, text };
}

export function newMessageTemplate(opts: {
  portalName: string;
  senderName: string;
  subject: string;
  preview: string;
  actionUrl: string;
}): EmailTemplate {
  const emailSubject = `[${opts.portalName}] New message from ${opts.senderName}`;
  const html = wrap(
    opts.portalName,
    `<p style="font-size:16px;font-weight:600;color:#f8fafc;margin:0 0 12px">
      New Message
    </p>
    <p style="color:#94a3b8;margin:0 0 4px">
      <strong style="color:#e2e8f0">${opts.senderName}</strong> sent you a message:
    </p>
    <p style="color:#94a3b8;font-size:13px;margin:0 0 4px">
      Subject: <strong style="color:#e2e8f0">${opts.subject}</strong>
    </p>
    <div style="background:#0f172a;border-radius:8px;padding:16px;margin:16px 0;color:#94a3b8;font-size:14px;line-height:1.6">
      ${opts.preview}
    </div>
    <a href="${opts.actionUrl}" style="${BUTTON_STYLE}">Open Messages</a>`
  );
  const text = `New message from ${opts.senderName}.\nSubject: ${opts.subject}\n\n${opts.preview}\n\nOpen: ${opts.actionUrl}`;
  return { subject: emailSubject, html, text };
}

export function passwordResetTemplate(opts: {
  portalName: string;
  resetUrl: string;
}): EmailTemplate {
  const subject = `[${opts.portalName}] Reset your password`;
  const html = wrap(
    opts.portalName,
    `<p style="font-size:16px;font-weight:600;color:#f8fafc;margin:0 0 12px">
      Password Reset Request
    </p>
    <p style="color:#94a3b8;margin:0 0 8px">
      We received a request to reset your password. Click the button below to create
      a new password. This link expires in <strong style="color:#e2e8f0">1 hour</strong>.
    </p>
    <a href="${opts.resetUrl}" style="${BUTTON_STYLE}">Reset Password</a>
    <p style="color:#475569;font-size:12px;margin-top:16px">
      If you did not request a password reset, you can safely ignore this email.
    </p>`
  );
  const text = `Reset your password: ${opts.resetUrl}\n\nThis link expires in 1 hour.`;
  return { subject, html, text };
}

export function welcomeTemplate(opts: {
  portalName: string;
  userName: string;
  loginUrl: string;
}): EmailTemplate {
  const subject = `Welcome to ${opts.portalName}`;
  const html = wrap(
    opts.portalName,
    `<p style="font-size:16px;font-weight:600;color:#f8fafc;margin:0 0 12px">
      Welcome, ${opts.userName}!
    </p>
    <p style="color:#94a3b8;margin:0 0 8px">
      Your account has been created. You can now log in and start tracking your
      applications.
    </p>
    <a href="${opts.loginUrl}" style="${BUTTON_STYLE}">Go to Portal</a>`
  );
  const text = `Welcome to ${opts.portalName}!\n\nLog in: ${opts.loginUrl}`;
  return { subject, html, text };
}

export function renewalReminderTemplate(opts: {
  portalName: string;
  processName: string;
  renewalDate: string;
  renewalUrl: string;
  actionUrl: string;
}): EmailTemplate {
  const subject = `[${opts.portalName}] Renewal reminder: ${opts.processName}`;
  const html = wrap(
    opts.portalName,
    `<p style="font-size:16px;font-weight:600;color:#f8fafc;margin:0 0 12px">
      Renewal Reminder
    </p>
    <p style="color:#94a3b8;margin:0 0 8px">
      Your <strong style="color:#e2e8f0">${opts.processName}</strong> is due for
      renewal on <strong style="color:#c084fc">${opts.renewalDate}</strong>.
    </p>
    <a href="${opts.renewalUrl}" style="${BUTTON_STYLE}">Renew Now</a>
    <p style="margin-top:12px">
      <a href="${opts.actionUrl}" style="color:#475569;font-size:13px">
        View my applications
      </a>
    </p>`
  );
  const text = `Your "${opts.processName}" renewal is due on ${opts.renewalDate}.\n\nRenew: ${opts.renewalUrl}`;
  return { subject, html, text };
}

export function emailVerificationTemplate(opts: {
  portalName: string;
  userName: string;
  verifyUrl: string;
}): EmailTemplate {
  const subject = `[${opts.portalName}] Verify your email address`;
  const html = wrap(
    opts.portalName,
    `<p style="font-size:16px;font-weight:600;color:#f8fafc;margin:0 0 12px">
      Hi ${opts.userName}, please verify your email
    </p>
    <p style="color:#94a3b8;margin:0 0 8px">
      Click the button below to verify your email address and activate your account.
      This link expires in <strong style="color:#e2e8f0">24 hours</strong>.
    </p>
    <a href="${opts.verifyUrl}" style="${BUTTON_STYLE}">Verify Email Address</a>
    <p style="color:#475569;font-size:12px;margin-top:16px">
      If you did not create an account, you can safely ignore this email.
    </p>`
  );
  const text = `Hi ${opts.userName},\n\nVerify your email: ${opts.verifyUrl}\n\nThis link expires in 24 hours.`;
  return { subject, html, text };
}
