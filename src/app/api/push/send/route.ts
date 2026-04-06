import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  const { recipientId, description, deadline } = await req.json();

  if (!recipientId || !description) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Fetch recipient's push subscription
  const { data, error } = await supabase
    .from("users")
    .select("push_subscription")
    .eq("users", recipientId)
    .maybeSingle();

  if (error) {
    console.error("[Push] Failed to fetch subscription:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Member hasn't granted permission yet — not an error
  if (!data?.push_subscription) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const body = deadline
    ? `${description} · Due ${new Date(deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : description;

  const payload = JSON.stringify({
    title: "New Task Assigned",
    body,
    icon: "/icon-192.png",
    tag: "task-assigned",
    data: { recipientId },
  });

  try {
    await webpush.sendNotification(data.push_subscription as any, payload);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // 410 Gone = subscription expired/revoked, clear it from DB
    if (err.statusCode === 410) {
      await supabase
        .from("users")
        .update({ push_subscription: null })
        .eq("users", recipientId);
      return NextResponse.json({ ok: true, skipped: true });
    }
    console.error("[Push] sendNotification failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
