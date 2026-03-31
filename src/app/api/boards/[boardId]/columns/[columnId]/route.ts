import { NextResponse } from "next/server";
import { columnBoardId, deleteColumn, getBoardDetail, updateColumnTitle } from "@/lib/boards-db";
import { requireActiveSession } from "@/lib/require-session";

type Params = Promise<{ boardId: string; columnId: string }>;

export async function PATCH(req: Request, ctx: { params: Params }) {
  const r = await requireActiveSession();
  if (!r.ok) return r.response;
  const { boardId, columnId } = await ctx.params;
  const bid = await columnBoardId(columnId);
  if (bid !== boardId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const body = (await req.json()) as { title?: string };
    if (!body.title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
    await updateColumnTitle(columnId, body.title);
    const board = await getBoardDetail(boardId);
    if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(board);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Params }) {
  const r = await requireActiveSession();
  if (!r.ok) return r.response;
  const { boardId, columnId } = await ctx.params;
  const bid = await columnBoardId(columnId);
  if (bid !== boardId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    await deleteColumn(columnId);
    const board = await getBoardDetail(boardId);
    if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(board);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
