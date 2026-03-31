import { NextResponse } from "next/server";
import { deleteBoard, getBoardDetail, updateBoardTitle } from "@/lib/boards-db";
import { requireActiveSession } from "@/lib/require-session";

type Params = Promise<{ boardId: string }>;

export async function GET(_req: Request, ctx: { params: Params }) {
  const r = await requireActiveSession();
  if (!r.ok) return r.response;
  const { boardId } = await ctx.params;
  try {
    const board = await getBoardDetail(boardId);
    if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(board);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Params }) {
  const r = await requireActiveSession();
  if (!r.ok) return r.response;
  const { boardId } = await ctx.params;
  try {
    const body = (await req.json()) as { title?: string };
    if (!body.title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
    await updateBoardTitle(boardId, body.title);
    const board = await getBoardDetail(boardId);
    return NextResponse.json(board);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Params }) {
  const r = await requireActiveSession();
  if (!r.ok) return r.response;
  const { boardId } = await ctx.params;
  try {
    await deleteBoard(boardId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
