import { NextRequest, NextResponse } from "next/server";
import { listUserNotifications, markUserNotificationRead } from "@/lib/notifications/repository";
import { AuthBridgeError, requireKaxiUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireKaxiUser(["STUDENT", "PARTNER_AGENT", "PLATFORM_ADMIN"]);
    const notifications = await listUserNotifications(user.id);
    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter((notification) => !notification.readAt).length,
    });
  } catch (error) {
    if (error instanceof AuthBridgeError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[GET /api/notifications]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireKaxiUser(["STUDENT", "PARTNER_AGENT", "PLATFORM_ADMIN"]);
    const body = (await req.json().catch(() => null)) as null | { notificationId?: string };
    if (!body?.notificationId) return NextResponse.json({ error: "notificationId is required" }, { status: 400 });
    const updated = await markUserNotificationRead(user.id, body.notificationId);
    return updated
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Notification not found or already read" }, { status: 409 });
  } catch (error) {
    if (error instanceof AuthBridgeError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[PATCH /api/notifications]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
