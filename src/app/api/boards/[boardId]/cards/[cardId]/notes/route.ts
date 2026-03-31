import { NextResponse } from "next/server";
import { addNote, getBoardDetail, getCardRowIfOnBoard } from "@/lib/boards-db";
import { requireActiveSession } from "@/lib/require-session";

type Params = Promise<{ boardId: string; cardId: string }>;

export async function POST(req: Request, ctx: { params: Params }) {
  const r = await requireActiveSession();
  if (!r.ok) return r.response;
  const { boardId, cardId } = await ctx.params;
  const cardRow = await getCardRowIfOnBoard(cardId, boardId);
  if (!cardRow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const body = (await req.json()) as { body?: string };
    await addNote(cardId, body.body ?? "", r.session.user.id, boardId);
    const board = await getBoardDetail(boardId);
    if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(board);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
