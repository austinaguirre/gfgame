import { NextResponse } from "next/server";
import { deleteNote, getBoardDetail, getCardRowIfOnBoard, updateNote } from "@/lib/boards-db";
import { requireActiveSession } from "@/lib/require-session";

type Params = Promise<{ boardId: string; cardId: string; noteId: string }>;

export async function PATCH(req: Request, ctx: { params: Params }) {
  const r = await requireActiveSession();
  if (!r.ok) return r.response;
  const { boardId, cardId, noteId } = await ctx.params;
  const cardRow = await getCardRowIfOnBoard(cardId, boardId);
  if (!cardRow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const body = (await req.json()) as { body?: string };
    await updateNote(noteId, body.body ?? "", r.session.user.id, boardId);
    const board = await getBoardDetail(boardId);
    if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(board);
  } catch (e: unknown) {
    const msg = (e as Error).message;
    const status = msg.includes("only edit") ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_req: Request, ctx: { params: Params }) {
  const r = await requireActiveSession();
  if (!r.ok) return r.response;
  const { boardId, cardId, noteId } = await ctx.params;
  const cardRow = await getCardRowIfOnBoard(cardId, boardId);
  if (!cardRow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    await deleteNote(noteId, boardId);
    const board = await getBoardDetail(boardId);
    if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(board);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
