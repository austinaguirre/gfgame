import type { BoardCardDTO, BoardColumnDTO, BoardDetailDTO, BoardNoteDTO } from "@/lib/board-types";

function nowIso() {
  return new Date().toISOString();
}

function replaceColumn(board: BoardDetailDTO, columnId: string, col: BoardColumnDTO): BoardDetailDTO {
  return {
    ...board,
    updated_at: nowIso(),
    columns: board.columns.map((c) => (c.id === columnId ? col : c)),
  };
}

/** Reorder items in array (same as @dnd-kit/sortable arrayMove). */
function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function optimisticRenameBoard(board: BoardDetailDTO, title: string): BoardDetailDTO {
  return { ...board, title: title.trim(), updated_at: nowIso() };
}

export function optimisticRenameColumn(board: BoardDetailDTO, columnId: string, title: string): BoardDetailDTO {
  const t = title.trim();
  return {
    ...board,
    updated_at: nowIso(),
    columns: board.columns.map((c) => (c.id === columnId ? { ...c, title: t } : c)),
  };
}

export function optimisticRenameCard(board: BoardDetailDTO, cardId: string, title: string): BoardDetailDTO {
  const t = title.trim();
  const ts = nowIso();
  return {
    ...board,
    updated_at: nowIso(),
    columns: board.columns.map((col) => ({
      ...col,
      cards: col.cards.map((card) =>
        card.id === cardId ? { ...card, title: t, updated_at: ts } : card,
      ),
    })),
  };
}

export function optimisticReorderColumns(board: BoardDetailDTO, orderedColumnIds: string[]): BoardDetailDTO {
  const byId = new Map(board.columns.map((c) => [c.id, c]));
  const next: BoardColumnDTO[] = [];
  for (let i = 0; i < orderedColumnIds.length; i++) {
    const c = byId.get(orderedColumnIds[i]);
    if (c) next.push({ ...c, position: i });
  }
  if (next.length !== board.columns.length) return board;
  return { ...board, updated_at: nowIso(), columns: next };
}

export function optimisticAddColumn(board: BoardDetailDTO, tempColumnId: string, title: string): BoardDetailDTO {
  const t = title.trim();
  const maxPos = board.columns.reduce((m, c) => Math.max(m, c.position), -1);
  const col: BoardColumnDTO = {
    id: tempColumnId,
    title: t,
    position: maxPos + 1,
    cards: [],
  };
  return { ...board, updated_at: nowIso(), columns: [...board.columns, col] };
}

export function optimisticDeleteColumn(board: BoardDetailDTO, columnId: string): BoardDetailDTO {
  const remaining = board.columns.filter((c) => c.id !== columnId);
  const reindexed = remaining.map((c, i) => ({ ...c, position: i }));
  return { ...board, updated_at: nowIso(), columns: reindexed };
}

export function optimisticDeleteCard(board: BoardDetailDTO, cardId: string): BoardDetailDTO {
  return {
    ...board,
    updated_at: nowIso(),
    columns: board.columns.map((col) => {
      const cards = col.cards.filter((c) => c.id !== cardId);
      const reindexed = cards.map((c, i) => ({ ...c, position: i }));
      return { ...col, cards: reindexed };
    }),
  };
}

export function optimisticAddCard(
  board: BoardDetailDTO,
  columnId: string,
  tempCardId: string,
  title: string,
  userId: string,
  username: string,
): BoardDetailDTO {
  const t = title.trim();
  const col = board.columns.find((c) => c.id === columnId);
  if (!col) return board;
  const ts = nowIso();
  const card: BoardCardDTO = {
    id: tempCardId,
    title: t,
    position: col.cards.length,
    created_by: userId,
    created_by_username: username,
    created_at: ts,
    updated_at: ts,
    notes: [],
  };
  const newCol: BoardColumnDTO = { ...col, cards: [...col.cards, card] };
  return replaceColumn(board, columnId, newCol);
}

/**
 * Mirrors server `moveCard` ordering: same-column uses indices 0..n-1; cross-column inserts at
 * `newPosition` clamped to `[0, targetLen]` (excluding the moving card from the target list first).
 */
export function optimisticMoveCard(
  board: BoardDetailDTO,
  cardId: string,
  targetColumnId: string,
  newPosition: number,
): BoardDetailDTO {
  const sourceCol = board.columns.find((c) => c.cards.some((x) => x.id === cardId));
  if (!sourceCol) return board;
  const card = sourceCol.cards.find((c) => c.id === cardId);
  if (!card) return board;

  if (sourceCol.id === targetColumnId) {
    const ids = sourceCol.cards.map((c) => c.id);
    const from = ids.indexOf(cardId);
    if (from === -1) return board;
    const to = Math.max(0, Math.min(newPosition, ids.length - 1));
    if (from === to) return board;
    const newOrderIds = arrayMove(ids, from, to);
    const byId = new Map(sourceCol.cards.map((c) => [c.id, c]));
    const newCards = newOrderIds.map((id, i) => ({ ...byId.get(id)!, position: i }));
    return replaceColumn(board, sourceCol.id, { ...sourceCol, cards: newCards });
  }

  const sourceCards = sourceCol.cards
    .filter((c) => c.id !== cardId)
    .map((c, i) => ({ ...c, position: i }));
  const targetCol = board.columns.find((c) => c.id === targetColumnId);
  if (!targetCol) return board;
  const filtered = targetCol.cards.filter((c) => c.id !== cardId);
  const to = Math.max(0, Math.min(newPosition, filtered.length));
  const inserted = [...filtered.slice(0, to), card, ...filtered.slice(to)];
  const newTargetCards = inserted.map((c, i) => ({ ...c, position: i }));

  return {
    ...board,
    updated_at: nowIso(),
    columns: board.columns.map((col) => {
      if (col.id === sourceCol.id) return { ...col, cards: sourceCards };
      if (col.id === targetColumnId) return { ...col, cards: newTargetCards };
      return col;
    }),
  };
}

export function optimisticAddNote(
  board: BoardDetailDTO,
  cardId: string,
  tempNoteId: string,
  body: string,
  userId: string,
  username: string,
): BoardDetailDTO {
  const ts = nowIso();
  const note: BoardNoteDTO = {
    id: tempNoteId,
    body: body.trim(),
    created_by: userId,
    created_by_username: username,
    created_at: ts,
  };
  return {
    ...board,
    updated_at: nowIso(),
    columns: board.columns.map((col) => ({
      ...col,
      cards: col.cards.map((card) =>
        card.id === cardId ? { ...card, notes: [...card.notes, note] } : card,
      ),
    })),
  };
}

export function optimisticPatchNote(
  board: BoardDetailDTO,
  cardId: string,
  noteId: string,
  body: string,
): BoardDetailDTO {
  const t = body.trim();
  return {
    ...board,
    updated_at: nowIso(),
    columns: board.columns.map((col) => ({
      ...col,
      cards: col.cards.map((card) =>
        card.id === cardId
          ? {
              ...card,
              notes: card.notes.map((n) => (n.id === noteId ? { ...n, body: t } : n)),
            }
          : card,
      ),
    })),
  };
}

export function optimisticDeleteNote(board: BoardDetailDTO, cardId: string, noteId: string): BoardDetailDTO {
  return {
    ...board,
    updated_at: nowIso(),
    columns: board.columns.map((col) => ({
      ...col,
      cards: col.cards.map((card) =>
        card.id === cardId
          ? { ...card, notes: card.notes.filter((n) => n.id !== noteId) }
          : card,
      ),
    })),
  };
}
