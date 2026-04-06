import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

// Server-side only Supabase client using service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { userId, password } = await req.json();

  if (!userId || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("users")
    .select("password_hash")
    .eq("id", userId)
    .single();

  if (error || !data?.password_hash) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const match = await bcrypt.compare(password, data.password_hash);

  if (!match) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
