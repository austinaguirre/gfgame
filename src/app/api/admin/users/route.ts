import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data, error } = await supabase
    .from("users")
    .select("id, username, admin, is_active, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
  return NextResponse.json({ users: data });
}
