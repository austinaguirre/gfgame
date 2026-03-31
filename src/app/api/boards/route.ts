import { NextResponse } from "next/server";
import { createBoard, listBoards } from "@/lib/boards-db";
import { requireActiveSession } from "@/lib/require-session";

export async function GET() {
  const r = await requireActiveSession();
  if (!r.ok) return r.response;
  try {
    const boards = await listBoards();
    return NextResponse.json(boards);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const r = await requireActiveSession();
  if (!r.ok) return r.response;
  try {
    const body = (await req.json()) as { title?: string };
    const board = await createBoard(body.title ?? "", r.session.user.id);
    return NextResponse.json(board);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
