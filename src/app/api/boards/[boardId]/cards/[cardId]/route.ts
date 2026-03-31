import { NextResponse } from "next/server";
import { deleteCard, getBoardDetail, getCardRowIfOnBoard, moveCard, updateCardTitle } from "@/lib/boards-db";
import { requireActiveSession } from "@/lib/require-session";

type Params = Promise<{ boardId: string; cardId: string }>;

export async function PATCH(req: Request, ctx: { params: Params }) {
  const r = await requireActiveSession();
  if (!r.ok) return r.response;
  const { boardId, cardId } = await ctx.params;
  const cardRow = await getCardRowIfOnBoard(cardId, boardId);
  if (!cardRow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const body = (await req.json()) as {
      title?: string;
      column_id?: string;
      position?: number;
    };
    if (body.title !== undefined) {
      await updateCardTitle(cardId, body.title, boardId);
    }
    if (body.column_id !== undefined && body.position !== undefined) {
      await moveCard(cardId, body.column_id, body.position, { boardId, card: cardRow });
    }
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
  const { boardId, cardId } = await ctx.params;
  if (!(await getCardRowIfOnBoard(cardId, boardId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    await deleteCard(cardId, boardId);
    const board = await getBoardDetail(boardId);
    if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(board);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
