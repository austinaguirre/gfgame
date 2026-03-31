import { NextResponse } from "next/server";
import { getSession } from "./session";

type SessionResult =
  | { ok: true; session: NonNullable<Awaited<ReturnType<typeof getSession>>> }
  | { ok: false; response: NextResponse };

/** Active users only (same gate as game + home content). */
export async function requireActiveSession(): Promise<SessionResult> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!session.user.is_active) {
    return { ok: false, response: NextResponse.json({ error: "Inactive" }, { status: 403 }) };
  }
  return { ok: true, session };
}
