import { NextResponse } from "next/server";
import { createColumn, getBoardDetail } from "@/lib/boards-db";
import { requireActiveSession } from "@/lib/require-session";

type Params = Promise<{ boardId: string }>;

export async function POST(req: Request, ctx: { params: Params }) {
  const r = await requireActiveSession();
  if (!r.ok) return r.response;
  const { boardId } = await ctx.params;
  try {
    const body = (await req.json()) as { title?: string };
    await createColumn(boardId, body.title ?? "");
    const board = await getBoardDetail(boardId);
    if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(board);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
