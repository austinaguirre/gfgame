import { getSupabaseServer } from "./supabase-server";
import type {
  BoardCardDTO,
  BoardColumnDTO,
  BoardDetailDTO,
  BoardNoteDTO,
  BoardSummary,
} from "./board-types";

const supabase = getSupabaseServer();

async function touchBoard(boardId: string) {
  await supabase
    .from("boards")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", boardId);
}

async function touchBoardFromColumnId(columnId: string) {
  const { data: col } = await supabase
    .from("board_columns")
    .select("board_id")
    .eq("id", columnId)
    .maybeSingle();
  if (col?.board_id) await touchBoard(col.board_id as string);
}

async function touchBoardFromCardId(cardId: string, boardId?: string) {
  if (boardId) {
    await touchBoard(boardId);
    return;
  }
  const { data: card } = await supabase
    .from("board_cards")
    .select("column_id")
    .eq("id", cardId)
    .maybeSingle();
  if (card?.column_id) await touchBoardFromColumnId(card.column_id as string);
}

/** One RPC round-trip; falls back to sequential updates if RPC is missing. */
async function applyCardPositionsBatch(
  rows: { id: string; position: number; column_id?: string }[],
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.rpc("board_cards_apply_positions", { p_rows: rows });
  if (error) {
    for (const r of rows) {
      const patch =
        r.column_id !== undefined
          ? { position: r.position, column_id: r.column_id }
          : { position: r.position };
      const { error: e2 } = await supabase.from("board_cards").update(patch).eq("id", r.id);
      if (e2) throw new Error(e2.message);
    }
  }
}

async function usernamesForIds(ids: string[]): Promise<Map<string, string>> {
  const uniq = [...new Set(ids)].filter(Boolean);
  const map = new Map<string, string>();
  if (uniq.length === 0) return map;
  const { data: rows } = await supabase.from("users").select("id, username").in("id", uniq);
  for (const r of rows ?? []) {
    map.set(r.id as string, r.username as string);
  }
  return map;
}

export async function listBoards(): Promise<BoardSummary[]> {
  const { data, error } = await supabase
    .from("boards")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    updated_at: r.updated_at as string,
  }));
}

export async function createBoard(title: string, userId: string): Promise<BoardSummary> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title is required");

  const { data: board, error: bErr } = await supabase
    .from("boards")
    .insert({
      title: trimmed,
      created_by: userId,
    })
    .select("id, title, updated_at")
    .single();
  if (bErr || !board) throw new Error(bErr?.message ?? "Failed to create board");

  const { error: cErr } = await supabase.from("board_columns").insert({
    board_id: board.id,
    title: "To do",
    position: 0,
  });
  if (cErr) throw new Error(cErr.message);

  return {
    id: board.id as string,
    title: board.title as string,
    updated_at: board.updated_at as string,
  };
}

export async function updateBoardTitle(boardId: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title is required");
  const { error } = await supabase
    .from("boards")
    .update({ title: trimmed, updated_at: new Date().toISOString() })
    .eq("id", boardId);
  if (error) throw new Error(error.message);
}

export async function deleteBoard(boardId: string) {
  const { error } = await supabase.from("boards").delete().eq("id", boardId);
  if (error) throw new Error(error.message);
}

export async function getBoardDetail(boardId: string): Promise<BoardDetailDTO | null> {
  const [{ data: board, error: bErr }, { data: columns, error: cErr }] = await Promise.all([
    supabase.from("boards").select("id, title, updated_at").eq("id", boardId).maybeSingle(),
    supabase
      .from("board_columns")
      .select("id, title, position")
      .eq("board_id", boardId)
      .order("position", { ascending: true }),
  ]);
  if (bErr) throw new Error(bErr.message);
  if (!board) return null;
  if (cErr) throw new Error(cErr.message);

  const columnIds = (columns ?? []).map((c) => c.id as string);
  if (columnIds.length === 0) {
    return {
      id: board.id as string,
      title: board.title as string,
      updated_at: board.updated_at as string,
      columns: [],
    };
  }

  const { data: cards, error: cardErr } = await supabase
    .from("board_cards")
    .select("id, column_id, title, position, created_by, created_at, updated_at")
    .in("column_id", columnIds)
    .order("position", { ascending: true });
  if (cardErr) throw new Error(cardErr.message);

  const cardIds = (cards ?? []).map((c) => c.id as string);
  let notesRows: { id: string; card_id: string; body: string; created_by: string; created_at: string }[] =
    [];
  if (cardIds.length > 0) {
    const { data: notes, error: nErr } = await supabase
      .from("board_card_notes")
      .select("id, card_id, body, created_by, created_at")
      .in("card_id", cardIds)
      .order("created_at", { ascending: true });
    if (nErr) throw new Error(nErr.message);
    notesRows = (notes ?? []) as typeof notesRows;
  }

  const userIds: string[] = [];
  for (const c of cards ?? []) userIds.push(c.created_by as string);
  for (const n of notesRows) userIds.push(n.created_by);
  const uname = await usernamesForIds(userIds);

  const notesByCard = new Map<string, BoardNoteDTO[]>();
  for (const n of notesRows) {
    const dto: BoardNoteDTO = {
      id: n.id,
      body: n.body,
      created_by: n.created_by,
      created_by_username: uname.get(n.created_by) ?? "?",
      created_at: n.created_at,
    };
    const list = notesByCard.get(n.card_id) ?? [];
    list.push(dto);
    notesByCard.set(n.card_id, list);
  }

  const cardsByColumn = new Map<string, BoardCardDTO[]>();
  for (const col of columns ?? []) {
    cardsByColumn.set(col.id as string, []);
  }
  for (const c of cards ?? []) {
    const dto: BoardCardDTO = {
      id: c.id as string,
      title: c.title as string,
      position: c.position as number,
      created_by: c.created_by as string,
      created_by_username: uname.get(c.created_by as string) ?? "?",
      created_at: c.created_at as string,
      updated_at: c.updated_at as string,
      notes: notesByCard.get(c.id as string) ?? [],
    };
    const colId = c.column_id as string;
    const arr = cardsByColumn.get(colId) ?? [];
    arr.push(dto);
    cardsByColumn.set(colId, arr);
  }

  const cols: BoardColumnDTO[] = (columns ?? []).map((col) => ({
    id: col.id as string,
    title: col.title as string,
    position: col.position as number,
    cards: cardsByColumn.get(col.id as string) ?? [],
  }));

  return {
    id: board.id as string,
    title: board.title as string,
    updated_at: board.updated_at as string,
    columns: cols,
  };
}

export async function createColumn(boardId: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title is required");
  const { data: maxRow } = await supabase
    .from("board_columns")
    .select("position")
    .eq("board_id", boardId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = maxRow ? (maxRow.position as number) + 1 : 0;
  const { error } = await supabase.from("board_columns").insert({
    board_id: boardId,
    title: trimmed,
    position: nextPos,
  });
  if (error) throw new Error(error.message);
  await touchBoard(boardId);
}

export async function updateColumnTitle(columnId: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title is required");
  const { error } = await supabase.from("board_columns").update({ title: trimmed }).eq("id", columnId);
  if (error) throw new Error(error.message);
  await touchBoardFromColumnId(columnId);
}

export async function reorderColumns(boardId: string, orderedColumnIds: string[]) {
  if (orderedColumnIds.length === 0) return;
  const { data: existing } = await supabase
    .from("board_columns")
    .select("id")
    .eq("board_id", boardId);
  const set = new Set((existing ?? []).map((r) => r.id as string));
  for (const id of orderedColumnIds) {
    if (!set.has(id)) throw new Error("Invalid column id for this board");
  }
  if (orderedColumnIds.length !== set.size) throw new Error("Column list mismatch");
  await Promise.all(
    orderedColumnIds.map((id, i) =>
      supabase.from("board_columns").update({ position: i }).eq("id", id).then(({ error }) => {
        if (error) throw new Error(error.message);
      }),
    ),
  );
  await touchBoard(boardId);
}

export async function deleteColumn(columnId: string) {
  const { data: col } = await supabase
    .from("board_columns")
    .select("board_id")
    .eq("id", columnId)
    .maybeSingle();
  const { error } = await supabase.from("board_columns").delete().eq("id", columnId);
  if (error) throw new Error(error.message);
  if (col?.board_id) await touchBoard(col.board_id as string);
}

export async function createCard(columnId: string, title: string, userId: string, boardId?: string) {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title is required");
  const { data: maxRow } = await supabase
    .from("board_cards")
    .select("position")
    .eq("column_id", columnId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = maxRow ? (maxRow.position as number) + 1 : 0;
  const { error } = await supabase.from("board_cards").insert({
    column_id: columnId,
    title: trimmed,
    position: nextPos,
    created_by: userId,
  });
  if (error) throw new Error(error.message);
  if (boardId) await touchBoard(boardId);
  else await touchBoardFromColumnId(columnId);
}

export async function updateCardTitle(cardId: string, title: string, boardId?: string) {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title is required");
  const { error } = await supabase
    .from("board_cards")
    .update({ title: trimmed, updated_at: new Date().toISOString() })
    .eq("id", cardId);
  if (error) throw new Error(error.message);
  await touchBoardFromCardId(cardId, boardId);
}

/** @returns false if no reorder was needed (same slot). */
async function moveCardWithinColumn(
  cardId: string,
  oldColumnId: string,
  newPosition: number,
): Promise<boolean> {
  const { data: cards } = await supabase
    .from("board_cards")
    .select("*")
    .eq("column_id", oldColumnId)
    .order("position", { ascending: true });
  const sorted = [...(cards ?? [])].sort((a, b) => (a.position as number) - (b.position as number));
  const ids = sorted.map((c) => c.id as string);
  const from = ids.indexOf(cardId);
  if (from === -1) throw new Error("Card not in column");
  const to = Math.max(0, Math.min(newPosition, ids.length - 1));
  if (from === to) return false;
  ids.splice(from, 1);
  ids.splice(to, 0, cardId);
  const rows = ids.map((id, i) => ({ id, position: i }));
  await applyCardPositionsBatch(rows);
  return true;
}

async function moveCardBetweenColumns(
  cardId: string,
  oldColumnId: string,
  newColumnId: string,
  newPosition: number,
): Promise<void> {
  const { data: oldCards } = await supabase
    .from("board_cards")
    .select("*")
    .eq("column_id", oldColumnId)
    .order("position", { ascending: true });
  const oldIds = [...(oldCards ?? [])]
    .filter((c) => c.id !== cardId)
    .sort((a, b) => (a.position as number) - (b.position as number))
    .map((c) => c.id as string);
  await applyCardPositionsBatch(oldIds.map((id, i) => ({ id, position: i })));

  const { data: newCards } = await supabase
    .from("board_cards")
    .select("*")
    .eq("column_id", newColumnId)
    .order("position", { ascending: true });
  const newIds = [...(newCards ?? [])]
    .filter((c) => c.id !== cardId)
    .sort((a, b) => (a.position as number) - (b.position as number))
    .map((c) => c.id as string);
  const to = Math.max(0, Math.min(newPosition, newIds.length));
  newIds.splice(to, 0, cardId);
  await applyCardPositionsBatch(
    newIds.map((id, i) => ({ id, position: i, column_id: newColumnId })),
  );
}

/** Card row when scoped to a board (avoids an extra fetch in moveCard). */
export type BoardCardScopeRow = {
  id: string;
  column_id: string;
  title: string;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type MoveCardOpts = {
  boardId?: string;
  /** If set, skips loading the card by id (must already belong to `boardId` when that is set). */
  card?: BoardCardScopeRow;
};

export async function moveCard(
  cardId: string,
  newColumnId: string,
  newPosition: number,
  opts?: MoveCardOpts,
) {
  let card: BoardCardScopeRow;
  if (opts?.card) {
    card = opts.card;
  } else {
    const { data: cardRow, error: cErr } = await supabase
      .from("board_cards")
      .select("*")
      .eq("id", cardId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cardRow) throw new Error("Card not found");
    card = cardRow as BoardCardScopeRow;
  }

  const oldColumnId = card.column_id;

  if (oldColumnId === newColumnId) {
    const reordered = await moveCardWithinColumn(cardId, oldColumnId, newPosition);
    if (!reordered) return;
  } else {
    await moveCardBetweenColumns(cardId, oldColumnId, newColumnId, newPosition);
  }
  await touchBoardFromCardId(cardId, opts?.boardId);
}

export async function deleteCard(cardId: string, boardId?: string) {
  const { data: card } = await supabase
    .from("board_cards")
    .select("column_id")
    .eq("id", cardId)
    .maybeSingle();
  const { error } = await supabase.from("board_cards").delete().eq("id", cardId);
  if (error) throw new Error(error.message);
  if (boardId) await touchBoard(boardId);
  else if (card?.column_id) await touchBoardFromColumnId(card.column_id as string);
}

export async function addNote(cardId: string, body: string, userId: string, boardId?: string) {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Note cannot be empty");
  const { error } = await supabase.from("board_card_notes").insert({
    card_id: cardId,
    body: trimmed,
    created_by: userId,
  });
  if (error) throw new Error(error.message);
  await touchBoardFromCardId(cardId, boardId);
}

export async function updateNote(noteId: string, body: string, userId: string, boardId?: string) {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Note cannot be empty");
  const { data: note } = await supabase
    .from("board_card_notes")
    .select("id, card_id, created_by")
    .eq("id", noteId)
    .maybeSingle();
  if (!note) throw new Error("Note not found");
  if (note.created_by !== userId) throw new Error("You can only edit your own notes");
  const { error } = await supabase.from("board_card_notes").update({ body: trimmed }).eq("id", noteId);
  if (error) throw new Error(error.message);
  await touchBoardFromCardId(note.card_id as string, boardId);
}

export async function deleteNote(noteId: string, boardId?: string) {
  const { data: note } = await supabase
    .from("board_card_notes")
    .select("card_id")
    .eq("id", noteId)
    .maybeSingle();
  const { error } = await supabase.from("board_card_notes").delete().eq("id", noteId);
  if (error) throw new Error(error.message);
  if (note?.card_id) await touchBoardFromCardId(note.card_id as string, boardId);
}

/** Returns board_id if column belongs to board, else null */
export async function columnBoardId(columnId: string): Promise<string | null> {
  const { data } = await supabase
    .from("board_columns")
    .select("board_id")
    .eq("id", columnId)
    .maybeSingle();
  return (data?.board_id as string) ?? null;
}

/** Returns board_id for a card (via column), else null — single join query. */
export async function cardBoardId(cardId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("board_cards")
    .select("board_columns!inner(board_id)")
    .eq("id", cardId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const raw = data?.board_columns as { board_id: string } | { board_id: string }[] | undefined;
  const nested = Array.isArray(raw) ? raw[0] : raw;
  return nested?.board_id ?? null;
}

/** One query: card row if it exists on this board, else null. */
export async function getCardRowIfOnBoard(
  cardId: string,
  boardId: string,
): Promise<BoardCardScopeRow | null> {
  const { data, error } = await supabase
    .from("board_cards")
    .select(
      "id, column_id, title, position, created_by, created_at, updated_at, board_columns!inner(board_id)",
    )
    .eq("id", cardId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as {
    id: string;
    column_id: string;
    title: string;
    position: number;
    created_by: string;
    created_at: string;
    updated_at: string;
    board_columns: { board_id: string } | { board_id: string }[];
  };
  const bc = Array.isArray(row.board_columns) ? row.board_columns[0] : row.board_columns;
  if (bc?.board_id !== boardId) return null;
  return {
    id: row.id,
    column_id: row.column_id,
    title: row.title,
    position: row.position,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
