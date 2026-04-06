import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { userId, subscription } = await req.json();

  if (!userId || !subscription) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error } = await supabase
    .from("users")
    .update({ push_subscription: subscription })
    .eq("users", userId);

  if (error) {
    console.error("[Push] Failed to save subscription:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
