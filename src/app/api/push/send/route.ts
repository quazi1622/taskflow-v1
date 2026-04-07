import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// 1. Initialize Supabase with Service Role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 2. Configure VAPID details
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@taskflow.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  // We parse the body ONCE at the start so we can use it in the catch block
  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { recipientId, description, deadline } = body;

  try {
    // 3. Validation
    if (!recipientId || !description) {
      return NextResponse.json({ error: "Missing recipientId or description" }, { status: 400 });
    }

    const cleanRecipientId = recipientId.trim().toUpperCase();

    // 4. Fetch the recipient's subscription
    const { data, error } = await supabase
      .from("users")
      .select("push_subscription")
      .eq("users", cleanRecipientId) // Matches your column name 'users'
      .maybeSingle();

    if (error) throw error;

    // 5. Silent exit if user hasn't enabled notifications
    if (!data?.push_subscription) {
      console.log(`[Push API] Skipping: No subscription for ${cleanRecipientId}`);
      return NextResponse.json({ ok: true, skipped: true });
    }

    // 6. Format the Body
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
      icon: "/icon-192.png", 
      badge: "/icon-192.png",
      tag: "task-update",
      renotify: true,
      data: { recipientId: cleanRecipientId },
    });

    // 8. Execute the Push
    await webpush.sendNotification(data.push_subscription as any, payload);
    
    console.log(`[Push API] Success: Notification sent to ${cleanRecipientId}`);
    return NextResponse.json({ ok: true });

  } catch (err: any) {
    // 9. Handle Expired Subscriptions (410 Gone)
    // We use the 'body' variable we parsed at the top
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.warn(`[Push API] Subscription expired for ${recipientId}. Cleaning DB.`);
      
      await supabase
        .from("users")
        .update({ push_subscription: null })
        .eq("users", recipientId.toUpperCase());
        
      return NextResponse.json({ ok: true, cleared: true });
    }

    console.error("[Push API] sendNotification failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}