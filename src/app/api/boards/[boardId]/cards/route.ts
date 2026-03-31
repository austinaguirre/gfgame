import { NextResponse } from "next/server";
import { columnBoardId, createCard, getBoardDetail } from "@/lib/boards-db";
import { requireActiveSession } from "@/lib/require-session";

type Params = Promise<{ boardId: string }>;

export async function POST(req: Request, ctx: { params: Params }) {
  const r = await requireActiveSession();
  if (!r.ok) return r.response;
  const { boardId } = await ctx.params;
  try {
    const body = (await req.json()) as { column_id?: string; title?: string };
    if (!body.column_id) return NextResponse.json({ error: "column_id required" }, { status: 400 });
    const bid = await columnBoardId(body.column_id);
    if (bid !== boardId) return NextResponse.json({ error: "Invalid column" }, { status: 400 });
    await createCard(body.column_id, body.title ?? "", r.session.user.id, boardId);
    const board = await getBoardDetail(boardId);
    if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(board);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
