import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { Lang } from "@/lib/i18n/translations";

type NotificationDb = Prisma.TransactionClient | typeof db;

export type NotificationCopy = Record<Lang, { title: string; message: string }>;

function normalizedLocale(value: string | null | undefined): Lang {
  return value === "vi" || value === "mn" || value === "en" ? value : "ko";
}

function jsonValue(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  return value ? JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue : undefined;
}

export async function notifyUser(input: {
  userId: string;
  locale?: string | null;
  eventKey: string;
  copy: NotificationCopy;
  href?: string | null;
  metadata?: Record<string, unknown>;
  tx?: NotificationDb;
}) {
  const client = input.tx || db;
  const copy = input.copy[normalizedLocale(input.locale)];
  const eventKey = input.eventKey.slice(0, 240);
  return client.userNotification.upsert({
    where: { userId_eventKey: { userId: input.userId, eventKey } },
    update: {
      title: copy.title.slice(0, 160),
      message: copy.message.slice(0, 1000),
      href: input.href?.slice(0, 500) || null,
      metadata: jsonValue(input.metadata),
      readAt: null,
    },
    create: {
      userId: input.userId,
      eventKey,
      title: copy.title.slice(0, 160),
      message: copy.message.slice(0, 1000),
      href: input.href?.slice(0, 500) || null,
      metadata: jsonValue(input.metadata),
    },
  });
}

export async function notifyUsers(input: {
  users: Array<{ id: string; locale?: string | null }>;
  eventKey: string;
  copy: NotificationCopy;
  href?: string | null;
  metadata?: Record<string, unknown>;
  tx?: NotificationDb;
}) {
  return Promise.all(input.users.map((user) => notifyUser({ ...input, userId: user.id, locale: user.locale })));
}

export async function listUserNotifications(userId: string, limit = 20) {
  return db.userNotification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
  });
}

export async function markUserNotificationRead(userId: string, notificationId: string) {
  const result = await db.userNotification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count === 1;
}
