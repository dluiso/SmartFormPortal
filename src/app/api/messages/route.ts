import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { sendNotificationEmail } from '@/lib/email/notificationMailer';

const schema = z.object({
  departmentId: z.string().min(1),
  processInstanceId: z.string().optional(),
  subject: z.string().min(1).max(255),
  body: z.string().min(1).max(4000),
});

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id') || '';
    const tenantId = headersList.get('x-tenant-id') || '';

    const body = await request.json();
    const data = schema.parse(body);

    // Verify department belongs to tenant
    const department = await prisma.department.findFirst({
      where: { id: data.departmentId, tenantId },
      include: {
        staff: {
          where: { user: { status: 'ACTIVE' } },
          select: { userId: true },
        },
      },
    });

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    // Create message + recipients (all staff in the department)
    const staffIds = department.staff.map((ud) => ud.userId);

    const message = await prisma.message.create({
      data: {
        tenantId,
        senderId: userId,
        subject: data.subject,
        body: data.body,
        processInstanceId: data.processInstanceId || null,
        recipients: {
          create: staffIds.map((staffId) => ({
            userId: staffId,
          })),
        },
      },
    });

    // Create notification for each staff member + fire-and-forget email
    if (staffIds.length > 0) {
      const sender = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true },
      });
      const senderName = sender
        ? `${sender.firstName ?? ''} ${sender.lastName ?? ''}`.trim() || sender.email
        : 'A user';

      await prisma.notification.createMany({
        data: staffIds.map((staffId) => ({
          tenantId,
          userId: staffId,
          type: 'NEW_MESSAGE' as const,
          title: 'New Message',
          body: `New message: ${data.subject}`,
          actionUrl: '/messages',
          metadata: {
            messageId: message.id,
            senderName,
            messageSubject: data.subject,
            preview: data.body.slice(0, 200),
          },
        })),
      });

      // Send email notifications (fire-and-forget)
      for (const staffId of staffIds) {
        sendNotificationEmail({
          tenantId,
          userId: staffId,
          type: 'NEW_MESSAGE',
          title: 'New Message',
          body: `New message: ${data.subject}`,
          actionUrl: '/messages',
          metadata: {
            messageId: message.id,
            senderName,
            messageSubject: data.subject,
            preview: data.body.slice(0, 200),
          },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, messageId: message.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', issues: error.issues }, { status: 400 });
    }
    console.error('[MESSAGES]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
