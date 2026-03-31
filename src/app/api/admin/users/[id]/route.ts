import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await _request.json().catch(() => ({}));
  const is_active = typeof body.is_active === "boolean" ? body.is_active : undefined;
  if (is_active === undefined) {
    return NextResponse.json({ error: "is_active required" }, { status: 400 });
  }
  const { error } = await supabase
    .from("users")
    .update({ is_active })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
