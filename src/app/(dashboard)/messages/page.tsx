import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/db/prisma';
import MessagesView from '@/components/messages/MessagesView';

export default async function MessagesPage() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id') || '';
  const tenantId = headersList.get('x-tenant-id') || '';
  const t = await getTranslations('messages');

  const [inboxItems, sentItems, departments, instances] = await Promise.all([
    // Inbox: messages where user is a recipient
    prisma.messageRecipient.findMany({
      where: { userId, message: { tenantId } },
      include: {
        message: {
          include: { sender: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
      orderBy: { message: { createdAt: 'desc' } },
      take: 50,
    }),
    // Sent: messages user sent
    prisma.message.findMany({
      where: { senderId: userId, tenantId },
      include: {
        recipients: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    // Departments for "Contact Staff" — user can message any department
    prisma.department.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    }),
    // User's process instances for "Related Process" dropdown
    prisma.processInstance.findMany({
      where: { userId, tenantId },
      select: { id: true, lfProcessId: true, processTemplate: { select: { name: true } } },
      orderBy: { submissionDate: 'desc' },
      take: 30,
    }),
  ]);

  const inbox = inboxItems.map((r) => ({
    id: r.id,
    messageId: r.messageId,
    subject: r.message.subject,
    body: r.message.body,
    isRead: r.status !== 'UNREAD',
    createdAt: r.message.createdAt,
    sender: r.message.sender,
  }));

  const sent = sentItems.map((m) => ({
    id: m.id,
    subject: m.subject,
    body: m.body,
    createdAt: m.createdAt,
    recipients: m.recipients.map((r) => r.user),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
      <MessagesView
        userId={userId}
        tenantId={tenantId}
        inbox={inbox}
        sent={sent}
        departments={departments}
        instances={instances}
      />
    </div>
  );
}
