import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase with the SERVICE_ROLE_KEY for admin overrides
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(req: NextRequest) {
  try {
    const { userId, subscription } = await req.json();

    // userId should be initials like "AAN", "NZZ", etc.
    const cleanId = userId?.trim().toUpperCase();

    console.log(`[Push API] Attempting update for user: ${cleanId}`);

    // Update the push_subscription column in the users table
    const { data, error } = await supabase
      .from("users")
      .update({ push_subscription: subscription }) 
      .eq("users", cleanId) 
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      console.error(`[Push API] User "${cleanId}" not found in database.`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log(`[Push API] Success! JSON saved for ${cleanId}`);
    return NextResponse.json({ ok: true });

  } catch (err: any) {
    console.error("[Push API] Internal Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}