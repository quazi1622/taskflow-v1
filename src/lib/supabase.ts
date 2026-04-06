import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[TaskFlow] Supabase env vars not set. Add NEXT_PUBLIC_SUPABASE_URL and " +
    "NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
  );
}

export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder"
);

export const isSupabaseConfigured =
  !!supabaseUrl && !!supabaseAnonKey;
