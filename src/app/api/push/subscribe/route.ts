import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase with Service Role to bypass RLS for this background task
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, subscription } = body;

    // 1. Basic Validation
    if (!userId || !subscription) {
      return NextResponse.json({ error: "Missing userId or subscription object" }, { status: 400 });
    }

    // 2. The "Initials" Plumbing
    // Since your DB uses "AAN" (all caps), we sanitize the input to ensure a match.
    const sanitizedUserId = userId.trim().toUpperCase();

    // 3. Perform the Update
    // We add .select() so we can verify if a row was actually found and changed.
    const { data, error } = await supabase
      .from("users")
      .update({ 
        push_subscription: subscription,
        // Optional: updated_at: new Date().toISOString() 
      })
      .eq("users", sanitizedUserId)
      .select();

    if (error) {
      console.error("[Push API] Database Error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 4. Check for Silent Failures (The most common issue)
    // If data is empty, it means 'sanitizedUserId' didn't exist in the 'users' column.
    if (!data || data.length === 0) {
      console.warn(`[Push API] No user found matching initials: "${sanitizedUserId}"`);
      return NextResponse.json({ 
        error: "User not found. Ensure your initials match the database exactly." 
      }, { status: 404 });
    }

    console.log(`[Push API] Subscription saved successfully for ${sanitizedUserId}`);
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("[Push API] Request Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}