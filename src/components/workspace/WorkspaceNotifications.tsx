"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Lang } from "@/lib/i18n/translations";
import { workspaceCopy, workspaceDateLocale } from "@/lib/i18n/workspace";

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export function WorkspaceNotifications({ locale }: { locale: Lang }) {
  const copy = workspaceCopy[locale];
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [readingId, setReadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (response.ok) setNotifications(data.notifications || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (notificationId: string) => {
    setReadingId(notificationId);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (response.ok) {
        setNotifications((current) => current.map((item) => item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item));
      }
    } finally {
      setReadingId(null);
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <section className="border-y bg-background py-4" aria-labelledby="workspace-notifications-title">
      <div className="mb-3 flex items-center gap-2">
        <Bell className="h-4 w-4" />
        <h2 id="workspace-notifications-title" className="text-sm font-semibold">{copy.notifications}</h2>
        {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
      </div>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.noNotifications}</p>
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {notifications.slice(0, 8).map((notification) => (
            <div key={notification.id} className={`flex items-start gap-3 border-l-2 px-3 py-2 ${notification.readAt ? "border-muted text-muted-foreground" : "border-primary-strong bg-primary-strong/5"}`}>
              <div className="min-w-0 flex-1">
                {notification.href ? <Link href={notification.href} className="text-sm font-medium hover:underline">{notification.title}</Link> : <p className="text-sm font-medium">{notification.title}</p>}
                <p className="mt-0.5 text-xs leading-relaxed">{notification.message}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{new Intl.DateTimeFormat(workspaceDateLocale[locale], { dateStyle: "short", timeStyle: "short" }).format(new Date(notification.createdAt))}</p>
              </div>
              {!notification.readAt && (
                <Button variant="ghost" size="icon" onClick={() => void markRead(notification.id)} disabled={readingId === notification.id} aria-label={copy.markRead}>
                  {readingId === notification.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
