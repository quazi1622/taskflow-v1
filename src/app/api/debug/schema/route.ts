import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("information_schema.columns")
    .select("table_name, column_name, data_type, is_nullable, column_default")
    .in("table_name", ["users", "tasks"])
    .order("table_name")
    .order("ordinal_position");

  if (error) {
    // Fallback: sample one row from each table so column names are visible
    const [usersResult, tasksResult] = await Promise.all([
      supabase.from("users").select("*").limit(1),
      supabase.from("tasks").select("*").limit(1),
    ]);

    return NextResponse.json({
      method: "sample_row",
      users: {
        columns: usersResult.data?.[0] ? Object.keys(usersResult.data[0]) : [],
        sample: usersResult.data?.[0] ?? null,
        error: usersResult.error?.message,
      },
      tasks: {
        columns: tasksResult.data?.[0] ? Object.keys(tasksResult.data[0]) : [],
        sample: tasksResult.data?.[0] ?? null,
        error: tasksResult.error?.message,
      },
    });
  }

  const grouped = (data ?? []).reduce(
    (acc, row) => {
      if (!acc[row.table_name]) acc[row.table_name] = [];
      acc[row.table_name].push({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable,
        default: row.column_default,
      });
      return acc;
    },
    {} as Record<string, object[]>
  );

  return NextResponse.json({ method: "information_schema", schema: grouped });
}
