import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// 1. Initialize Supabase with Service Role to bypass RLS for background fetching
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 2. Configure VAPID details for browser push servers (Google/Apple)
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@taskflow.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { recipientId, description, deadline } = await req.json();

    // 3. Validation & Sanitization
    if (!recipientId || !description) {
      return NextResponse.json({ error: "Missing recipientId or description" }, { status: 400 });
    }

    // Ensure we are looking for uppercase initials (e.g., "AAN")
    const cleanRecipientId = recipientId.trim().toUpperCase();

    // 4. Fetch the recipient's push subscription object
    const { data, error } = await supabase
      .from("users")
      .select("push_subscription")
      .eq("users", cleanRecipientId)
      .maybeSingle();

    if (error) {
      console.error("[Push API] Database fetch failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 5. Silent exit if user hasn't enabled notifications (No JSON in the cell)
    if (!data?.push_subscription) {
      console.log(`[Push API] Skipping: No subscription object for ${cleanRecipientId}`);
      return NextResponse.json({ ok: true, skipped: true });
    }

    // 6. Construct the Body (with Date safety)
    let bodyText = description;
    if (deadline && !isNaN(Date.parse(deadline))) {
      const dateStr = new Date(deadline).toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric" 
      });
      bodyText = `${description} · Due ${dateStr}`;
    }

    // 7. Define the Notification Payload
    const payload = JSON.stringify({
      title: "New Task Assigned",
      body: bodyText,
      icon: "/icon-192x192.png", // Matches your sw.js and public folder
      badge: "/icon-192x192.png",
      tag: "task-update",        // Prevents notification stacking
      renotify: true,            // Alerts even if a previous one is visible
      data: { recipientId: cleanRecipientId },
    });

    // 8. Execute the Push
    await webpush.sendNotification(data.push_subscription as any, payload);
    
    console.log(`[Push API] Success: Notification sent to ${cleanRecipientId}`);
    return NextResponse.json({ ok: true });

  } catch (err: any) {
    // 9. Handle Expired Subscriptions (410 Gone)
    // If the browser tells us the token is dead, we clean up the DB
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.warn(`[Push API] Subscription expired for ${req.json().then(d => d.recipientId)}. Cleaning DB.`);
      const body = await req.json();
      await supabase
        .from("users")
        .update({ push_subscription: null })
        .eq("users", body.recipientId.toUpperCase());
        
      return NextResponse.json({ ok: true, cleared: true });
    }

    console.error("[Push API] sendNotification failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}