/**
 * Sends an email for a portal notification if the tenant has email configured.
 * Called after creating Notification records in the DB.
 */

import prisma from '@/lib/db/prisma';
import { sendEmail, parseEmailConfig } from './mailer';
import {
  processStatusChangedTemplate,
  newMessageTemplate,
  renewalReminderTemplate,
} from './templates';
import { NotificationType } from '@prisma/client';

interface NotificationPayload {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Attempt to send an email for this notification.
 * Silently no-ops if email is not configured or the user has no email.
 */
export async function sendNotificationEmail(
  notification: NotificationPayload
): Promise<void> {
  try {
    // Load tenant email config + user email in one query
    const [settings, user] = await Promise.all([
      prisma.tenantSettings.findUnique({
        where: { tenantId: notification.tenantId },
        select: { emailConfig: true, portalName: true },
      }),
      prisma.user.findUnique({
        where: { id: notification.userId },
        select: { email: true, firstName: true, lastName: true },
      }),
    ]);

    if (!settings?.emailConfig || !user?.email) return;

    const config = parseEmailConfig(settings.emailConfig);
    if (!config) return;

    const portalName = settings.portalName || 'SmartFormPortal';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const actionUrl = notification.actionUrl
      ? `${baseUrl}${notification.actionUrl}`
      : `${baseUrl}/my-processes`;

    let template: { subject: string; html: string; text: string } | null = null;
    const meta = notification.metadata ?? {};

    switch (notification.type) {
      case NotificationType.PROCESS_STATUS_CHANGED:
        template = processStatusChangedTemplate({
          portalName,
          processName: String(meta.processName ?? 'your application'),
          previousStatus: String(meta.previousStatus ?? ''),
          newStatus: String(meta.newStatus ?? ''),
          actionUrl,
        });
        break;

      case NotificationType.NEW_MESSAGE:
        template = newMessageTemplate({
          portalName,
          senderName: String(meta.senderName ?? 'Staff'),
          subject: String(meta.messageSubject ?? 'New message'),
          preview: String(meta.preview ?? notification.body),
          actionUrl,
        });
        break;

      case NotificationType.PROCESS_NEAR_RENEWAL:
        template = renewalReminderTemplate({
          portalName,
          processName: String(meta.processName ?? 'your application'),
          renewalDate: String(meta.renewalDate ?? ''),
          renewalUrl: String(meta.renewalUrl ?? actionUrl),
          actionUrl,
        });
        break;

      default:
        // SYSTEM_ANNOUNCEMENT, LICENSE_EXPIRING — skip email for now
        return;
    }

    if (!template) return;

    await sendEmail(config, {
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (err) {
    // Never throw — email failure must not break the main flow
    console.error('[NotificationMailer] Failed to send email:', err);
  }
}
