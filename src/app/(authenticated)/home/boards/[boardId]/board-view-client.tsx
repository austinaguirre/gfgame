"use client";

import type { BoardCardDTO, BoardColumnDTO, BoardDetailDTO } from "@/lib/board-types";
import {
  optimisticAddCard,
  optimisticAddColumn,
  optimisticDeleteCard,
  optimisticDeleteColumn,
  optimisticMoveCard,
  optimisticRenameBoard,
  optimisticRenameCard,
  optimisticRenameColumn,
  optimisticReorderColumns,
} from "@/lib/board-optimistic";
import { BoardPendingProvider, useBoardPending } from "@/lib/board-pending-context";
import { CardNotesModal } from "./card-notes-modal";
import { Dialog } from "@/components/dialog";
import { IconMessage, IconPlus, IconTrash } from "@/components/icons";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  pointerWithin,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DroppableContainer,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

function cardDragId(id: string) {
  return `card-${id}`;
}
function columnDragId(id: string) {
  return `column-${id}`;
}

function sortableCardsInColumn(containers: DroppableContainer[], columnId: string, activeId: string) {
  return containers.filter((c) => {
    if (String(c.id) === activeId) return false;
    if (!String(c.id).startsWith("card-")) return false;
    const sortable = c.data.current?.sortable as { containerId?: string } | undefined;
    return sortable?.containerId === columnId;
  });
}

/**
 * Pointer-first; gaps inside a column resolve to the nearest card in that column (not "append only").
 * Falls back to nearest card globally, then any target.
 */
const boardCollisionDetection: CollisionDetection = (args) => {
  const activeId = String(args.active.id);
  const pointerCollisions = pointerWithin(args);
  const cardHits = pointerCollisions.filter((c) => String(c.id).startsWith("card-") && String(c.id) !== activeId);
  if (cardHits.length > 0) return cardHits;

  const colHits = pointerCollisions.filter((c) => String(c.id).startsWith("column-"));
  if (colHits.length > 0) {
    for (const col of colHits) {
      const columnId = String(col.id).replace(/^column-/, "");
      const inColumn = sortableCardsInColumn(args.droppableContainers, columnId, activeId);
      if (inColumn.length > 0) {
        const nearest = closestCenter({ ...args, droppableContainers: inColumn });
        if (nearest.length > 0) return nearest;
      }
    }
    return colHits;
  }

  const allCards = args.droppableContainers.filter((c) => String(c.id).startsWith("card-") && String(c.id) !== activeId);
  if (allCards.length > 0) {
    return closestCenter({ ...args, droppableContainers: allCards });
  }
  return closestCenter(args);
};

/** Insert before `overIndex` when pointer is in top half of `over` rect; after when in bottom half. */
function insertionSlotFromPointer(
  overIndex: number,
  overRect: { top: number; height: number },
  pointerY: number,
): number {
  const top = overRect.top;
  const bottom = overRect.top + overRect.height;
  if (pointerY <= top) return overIndex;
  if (pointerY >= bottom) return overIndex + 1;
  const mid = top + overRect.height / 2;
  return pointerY > mid ? overIndex + 1 : overIndex;
}

/** When `over` is the column droppable (not a card), map pointer Y to an insert slot 0..n (n = append). */
function insertionSlotFromColumnRect(
  columnRect: { top: number; height: number },
  pointerY: number,
  cardCount: number,
): number {
  if (cardCount <= 0) return 0;
  const rel = (pointerY - columnRect.top) / Math.max(columnRect.height, 1);
  const clampedRel = Math.max(0, Math.min(1, rel));
  return Math.min(cardCount, Math.floor(clampedRel * (cardCount + 1)));
}

/** Shown while dragging from another column — sortable disables transforms for foreign actives. */
function CrossColumnDropPlaceholder() {
  return (
    <div
      className="flex h-14 shrink-0 items-center justify-center rounded-xl border-2 border-dashed accent-border bg-zinc-100/60 dark:bg-zinc-800/50"
      aria-hidden
    />
  );
}

type CrossColumnPreview = { targetColumnId: string; insertIndex: number };

function SortableCard({
  card,
  onSaveCardTitle,
  onOpenNotes,
  onRequestDeleteCard,
}: Readonly<{
  card: BoardCardDTO;
  onSaveCardTitle: (cardId: string, title: string) => Promise<void>;
  onOpenNotes: () => void;
  onRequestDeleteCard: () => void;
}>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cardDragId(card.id),
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(card.title);

  async function saveTitle() {
    const t = titleDraft.trim();
    if (!t || t === card.title) {
      setEditingTitle(false);
      setTitleDraft(card.title);
      return;
    }
    try {
      await onSaveCardTitle(card.id, t);
      setEditingTitle(false);
    } catch {
      setTitleDraft(card.title);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div
        className="flex cursor-grab touch-none gap-2 border-b border-zinc-100 p-3 active:cursor-grabbing dark:border-zinc-800"
        {...attributes}
        {...listeners}
      >
        <div className="mt-0.5 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden>
          <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 4h2v2H9V4zm4 0h2v2h-2V4zM9 9h2v2H9V9zm4 0h2v2h-2V9zm-4 5h2v2H9v-2zm4 0h2v2h-2v-2z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              className="accent-focus w-full rounded border bg-white px-2 py-1 text-sm font-medium text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              onBlur={() => void saveTitle()}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              autoFocus
            />
          ) : (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                setTitleDraft(card.title);
                setEditingTitle(true);
              }}
              title="Rename card"
              className="accent-editable-title w-full text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {card.title}
            </button>
          )}
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Added by {card.created_by_username} ·{" "}
            {new Date(card.created_at).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onOpenNotes}
            className="accent-text-muted relative rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label={`Notes (${card.notes.length})`}
            title="Notes"
          >
            <IconMessage className="size-5" />
            {card.notes.length > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full accent-bg px-1 text-[10px] font-bold text-white">
                {card.notes.length > 99 ? "99+" : card.notes.length}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={onRequestDeleteCard}
            className="rounded p-1 text-zinc-400/75 transition-colors hover:bg-red-500/10 hover:text-red-600/90 dark:text-zinc-500 dark:hover:bg-red-950/25 dark:hover:text-red-400/90"
            aria-label="Delete card"
          >
            <IconTrash />
          </button>
        </div>
      </div>
    </div>
  );
}

function ColumnContainer({
  column,
  board,
  onSaveColumnTitle,
  onAddCard,
  onSaveCardTitle,
  onMoveColumn,
  onOpenNotes,
  onRequestDeleteCard,
  onRequestDeleteColumn,
  crossColumnPreview,
  draggingSourceColumnId,
}: Readonly<{
  column: BoardColumnDTO;
  board: BoardDetailDTO;
  onSaveColumnTitle: (columnId: string, title: string) => Promise<void>;
  onAddCard: (columnId: string, title: string) => Promise<void>;
  onSaveCardTitle: (cardId: string, title: string) => Promise<void>;
  onMoveColumn: (columnId: string, dir: -1 | 1) => void;
  onOpenNotes: (cardId: string) => void;
  onRequestDeleteCard: (cardId: string) => void;
  onRequestDeleteColumn: (columnId: string) => void;
  crossColumnPreview: CrossColumnPreview | null;
  draggingSourceColumnId: string | null;
}>) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDragId(column.id) });
  const ids = column.cards.map((c) => cardDragId(c.id));
  const idx = board.columns.findIndex((c) => c.id === column.id);
  const crossColumnInsertAt =
    crossColumnPreview &&
      crossColumnPreview.targetColumnId === column.id &&
      draggingSourceColumnId !== null &&
      draggingSourceColumnId !== column.id
      ? crossColumnPreview.insertIndex
      : null;

  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(column.title);

  async function saveTitle() {
    const t = titleDraft.trim();
    if (!t || t === column.title) {
      setEditing(false);
      setTitleDraft(column.title);
      return;
    }
    try {
      await onSaveColumnTitle(column.id, t);
      setEditing(false);
    } catch {
      setTitleDraft(column.title);
    }
  }

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.elements.namedItem("title") as HTMLInputElement;
    const t = input.value.trim();
    if (!t) return;
    try {
      await onAddCard(column.id, t);
      input.value = "";
    } catch {
      // parent refetches on failure
    }
  }

  return (
    <div
      className={`flex w-[min(18rem,calc(100vw-2rem))] max-md:min-w-[calc(100vw-2rem)] shrink-0 snap-center flex-col rounded-xl border bg-zinc-50 dark:bg-zinc-900 md:snap-none md:min-w-0 md:w-72 ${isOver ? "accent-border accent-ring-dnd rounded-xl" : "border-zinc-200 dark:border-zinc-800"
        }`}
    >
      <div className="flex items-start gap-1 border-b border-zinc-200 p-3 dark:border-zinc-800">
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              className="accent-focus w-full rounded border bg-white px-2 py-1 text-sm font-semibold dark:bg-zinc-950"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => void saveTitle()}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setTitleDraft(column.title);
                setEditing(true);
              }}
              title="Rename column"
              className="accent-editable-title w-full text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {column.title}
            </button>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-0.5">
          <button
            type="button"
            disabled={idx <= 0}
            onClick={() => onMoveColumn(column.id, -1)}
            className="rounded px-1 text-xs text-zinc-500 hover:bg-zinc-200 disabled:opacity-30 dark:hover:bg-zinc-800"
            aria-label="Move column left"
          >
            ←
          </button>
          <button
            type="button"
            disabled={idx >= board.columns.length - 1}
            onClick={() => onMoveColumn(column.id, 1)}
            className="rounded px-1 text-xs text-zinc-500 hover:bg-zinc-200 disabled:opacity-30 dark:hover:bg-zinc-800"
            aria-label="Move column right"
          >
            →
          </button>
        </div>
        <button
          type="button"
          onClick={() => onRequestDeleteColumn(column.id)}
          className="rounded p-1 text-zinc-400/75 transition-colors hover:bg-red-500/10 hover:text-red-600/90 dark:text-zinc-500 dark:hover:bg-red-950/25 dark:hover:text-red-400/90"
          aria-label="Delete column"
        >
          <IconTrash />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className="flex min-h-[12rem] min-w-0 w-full flex-1 flex-col gap-2 p-2"
      >
        <SortableContext id={column.id} items={ids} strategy={verticalListSortingStrategy}>
          {column.cards.flatMap((card, i) => {
            const nodes: ReactNode[] = [];
            if (crossColumnInsertAt === i) {
              nodes.push(<CrossColumnDropPlaceholder key={`drop-hint-${column.id}-${i}`} />);
            }
            nodes.push(
              <SortableCard
                key={card.id}
                card={card}
                onSaveCardTitle={onSaveCardTitle}
                onOpenNotes={() => onOpenNotes(card.id)}
                onRequestDeleteCard={() => onRequestDeleteCard(card.id)}
              />,
            );
            return nodes;
          })}
          {crossColumnInsertAt === column.cards.length ? (
            <CrossColumnDropPlaceholder key={`drop-hint-${column.id}-end`} />
          ) : null}
        </SortableContext>

        <form
          onSubmit={(e) => void addCard(e)}
          className="flex gap-1 border-t border-zinc-200 pt-2 dark:border-zinc-800"
        >
          <input
            name="title"
            type="text"
            placeholder="Add card…"
            className="accent-focus min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            maxLength={200}
          />
          <button
            type="submit"
            className="accent-bg flex shrink-0 items-center justify-center rounded-lg p-2 text-white disabled:opacity-50"
            aria-label="Add card"
          >
            <IconPlus className="size-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

export function BoardViewClient({
  boardId,
  currentUserId,
  currentUsername,
}: {
  boardId: string;
  currentUserId: string;
  currentUsername: string;
}) {
  return (
    <BoardPendingProvider>
      <BoardViewInner boardId={boardId} currentUserId={currentUserId} currentUsername={currentUsername} />
    </BoardPendingProvider>
  );
}

function BoardViewInner({
  boardId,
  currentUserId,
  currentUsername,
}: {
  boardId: string;
  currentUserId: string;
  currentUsername: string;
}) {
  const { track } = useBoardPending();
  const [board, setBoard] = useState<BoardDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [titleEdit, setTitleEdit] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [notesModalCardId, setNotesModalCardId] = useState<string | null>(null);
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [addColumnTitle, setAddColumnTitle] = useState("");
  const [deleteBoardOpen, setDeleteBoardOpen] = useState(false);
  const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [crossColumnPreview, setCrossColumnPreview] = useState<CrossColumnPreview | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const load = useCallback(async () => {
    setError(null);
    await track(
      (async () => {
        const res = await fetch(`/api/boards/${boardId}`);
        if (!res.ok) {
          setError((await res.json().catch(() => ({})))?.error ?? "Failed to load board");
          setBoard(null);
          return;
        }
        const b = (await res.json()) as BoardDetailDTO;
        setBoard(b);
        setTitleDraft(b.title);
      })(),
    );
  }, [boardId, track]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!activeId) {
      lastPointerRef.current = null;
      return;
    }
    const handler = (e: PointerEvent) => {
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };
    globalThis.addEventListener("pointermove", handler, { capture: true });
    return () => globalThis.removeEventListener("pointermove", handler, { capture: true });
  }, [activeId]);

  const onBoardUpdated = useCallback((b: BoardDetailDTO) => {
    setBoard(b);
    setTitleDraft(b.title);
  }, []);

  const saveCardTitle = useCallback(
    async (cardId: string, title: string) => {
      const t = title.trim();
      setBoard((b) => (b ? optimisticRenameCard(b, cardId, t) : b));
      try {
        const res = await track(
          fetch(`/api/boards/${boardId}/cards/${cardId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: t }),
          }),
        );
        if (!res.ok) throw new Error();
        onBoardUpdated((await res.json()) as BoardDetailDTO);
      } catch {
        await load();
      }
    },
    [boardId, track, onBoardUpdated, load],
  );

  const saveColumnTitle = useCallback(
    async (columnId: string, title: string) => {
      const t = title.trim();
      setBoard((b) => (b ? optimisticRenameColumn(b, columnId, t) : b));
      try {
        const res = await track(
          fetch(`/api/boards/${boardId}/columns/${columnId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: t }),
          }),
        );
        if (!res.ok) throw new Error();
        onBoardUpdated((await res.json()) as BoardDetailDTO);
      } catch {
        await load();
      }
    },
    [boardId, track, onBoardUpdated, load],
  );

  const addCardToColumn = useCallback(
    async (columnId: string, title: string) => {
      const t = title.trim();
      const tempId = `temp-card-${crypto.randomUUID()}`;
      setBoard((b) =>
        b ? optimisticAddCard(b, columnId, tempId, t, currentUserId, currentUsername) : b,
      );
      try {
        const res = await track(
          fetch(`/api/boards/${boardId}/cards`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ column_id: columnId, title: t }),
          }),
        );
        if (!res.ok) throw new Error();
        onBoardUpdated((await res.json()) as BoardDetailDTO);
      } catch {
        await load();
      }
    },
    [boardId, currentUserId, currentUsername, track, onBoardUpdated, load],
  );

  async function saveBoardTitle() {
    if (!board) return;
    const t = titleDraft.trim();
    if (!t || t === board.title) {
      setTitleEdit(false);
      return;
    }
    setBoard((b) => (b ? optimisticRenameBoard(b, t) : b));
    try {
      const res = await track(
        fetch(`/api/boards/${boardId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: t }),
        }),
      );
      if (!res.ok) throw new Error();
      onBoardUpdated((await res.json()) as BoardDetailDTO);
      setTitleEdit(false);
    } catch {
      await load();
    }
  }

  async function confirmDeleteBoard() {
    const res = await track(fetch(`/api/boards/${boardId}`, { method: "DELETE" }));
    setDeleteBoardOpen(false);
    if (res.ok) window.location.href = "/home";
  }

  async function submitAddColumn() {
    const t = addColumnTitle.trim();
    if (!t || !board) return;
    const tempId = `temp-col-${crypto.randomUUID()}`;
    setBoard((b) => (b ? optimisticAddColumn(b, tempId, t) : b));
    try {
      const res = await track(
        fetch(`/api/boards/${boardId}/columns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: t }),
        }),
      );
      if (!res.ok) throw new Error();
      onBoardUpdated((await res.json()) as BoardDetailDTO);
      setAddColumnTitle("");
      setAddColumnOpen(false);
    } catch {
      await load();
    }
  }

  async function confirmDeleteColumn() {
    if (!deleteColumnId || !board) return;
    const id = deleteColumnId;
    setBoard((b) => (b ? optimisticDeleteColumn(b, id) : b));
    setDeleteColumnId(null);
    try {
      const res = await track(fetch(`/api/boards/${boardId}/columns/${id}`, { method: "DELETE" }));
      if (!res.ok) throw new Error();
      onBoardUpdated((await res.json()) as BoardDetailDTO);
    } catch {
      await load();
    }
  }

  async function confirmDeleteCard() {
    if (!deleteCardId || !board) return;
    const id = deleteCardId;
    setBoard((b) => (b ? optimisticDeleteCard(b, id) : b));
    setDeleteCardId(null);
    if (notesModalCardId === id) setNotesModalCardId(null);
    try {
      const res = await track(fetch(`/api/boards/${boardId}/cards/${id}`, { method: "DELETE" }));
      if (!res.ok) throw new Error();
      onBoardUpdated((await res.json()) as BoardDetailDTO);
    } catch {
      await load();
    }
  }

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || !board || !active) {
        setCrossColumnPreview(null);
        return;
      }
      const activeCardId = String(active.id).replace(/^card-/, "");
      const sourceColumn = board.columns.find((c) => c.cards.some((card) => card.id === activeCardId));
      if (!sourceColumn) {
        setCrossColumnPreview(null);
        return;
      }
      const pointerY = lastPointerRef.current?.y ?? over.rect.top + over.rect.height / 2;
      const overRaw = String(over.id);

      if (overRaw.startsWith("column-")) {
        const targetColumnId = overRaw.replace(/^column-/, "");
        if (targetColumnId === sourceColumn.id) {
          setCrossColumnPreview(null);
          return;
        }
        const col = board.columns.find((c) => c.id === targetColumnId);
        if (!col) {
          setCrossColumnPreview(null);
          return;
        }
        const ids = col.cards.map((c) => c.id).filter((id) => id !== activeCardId);
        const insertIndex =
          ids.length === 0 ? 0 : insertionSlotFromColumnRect(over.rect, pointerY, ids.length);
        setCrossColumnPreview((prev) => {
          const next: CrossColumnPreview = { targetColumnId, insertIndex };
          if (prev?.targetColumnId === next.targetColumnId && prev.insertIndex === next.insertIndex) return prev;
          return next;
        });
        return;
      }

      const overSortable = over.data.current?.sortable as
        | { index: number; containerId: string | number }
        | undefined;
      if (!overSortable) {
        setCrossColumnPreview(null);
        return;
      }
      const targetColumnId = String(overSortable.containerId);
      if (targetColumnId === sourceColumn.id) {
        setCrossColumnPreview(null);
        return;
      }
      const col = board.columns.find((c) => c.id === targetColumnId);
      if (!col) {
        setCrossColumnPreview(null);
        return;
      }
      const ids = col.cards.map((c) => c.id).filter((id) => id !== activeCardId);
      let slot = insertionSlotFromPointer(overSortable.index, over.rect, pointerY);
      slot = Math.max(0, Math.min(slot, ids.length));
      setCrossColumnPreview((prev) => {
        const next: CrossColumnPreview = { targetColumnId, insertIndex: slot };
        if (prev?.targetColumnId === next.targetColumnId && prev.insertIndex === next.insertIndex) return prev;
        return next;
      });
    },
    [board],
  );

  async function onMoveColumn(columnId: string, dir: -1 | 1) {
    if (!board) return;
    const ids = board.columns.map((c) => c.id);
    const i = ids.indexOf(columnId);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setBoard((b) => (b ? optimisticReorderColumns(b, ids) : b));
    try {
      const res = await track(
        fetch(`/api/boards/${boardId}/columns/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedColumnIds: ids }),
        }),
      );
      if (!res.ok) throw new Error();
      onBoardUpdated((await res.json()) as BoardDetailDTO);
    } catch {
      await load();
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setCrossColumnPreview(null);
    setActiveId(null);
    if (!over || !board) return;
    const activeCardId = String(active.id).replace(/^card-/, "");
    const overRaw = String(over.id);
    if (overRaw === String(active.id)) return;

    const pointerY = lastPointerRef.current?.y ?? over.rect.top + over.rect.height / 2;

    async function patchMove(columnId: string, position: number) {
      setBoard((b) => (b ? optimisticMoveCard(b, activeCardId, columnId, position) : b));
      try {
        const res = await track(
          fetch(`/api/boards/${boardId}/cards/${activeCardId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ column_id: columnId, position }),
          }),
        );
        if (!res.ok) throw new Error();
        onBoardUpdated((await res.json()) as BoardDetailDTO);
      } catch {
        await load();
      }
    }

    if (overRaw.startsWith("column-")) {
      const targetColumnId = overRaw.replace(/^column-/, "");
      const col = board.columns.find((c) => c.id === targetColumnId);
      if (!col) return;
      const ids = col.cards.map((c) => c.id).filter((id) => id !== activeCardId);
      const newIndex =
        ids.length === 0 ? 0 : insertionSlotFromColumnRect(over.rect, pointerY, ids.length);
      await patchMove(targetColumnId, newIndex);
      return;
    }

    const activeSortable = active.data.current?.sortable as
      | { index: number; containerId: string | number }
      | undefined;
    const overSortable = over.data.current?.sortable as
      | { index: number; containerId: string | number }
      | undefined;
    if (!activeSortable || !overSortable) return;

    const targetColumnId = String(overSortable.containerId);
    const sourceColumnId = String(activeSortable.containerId);
    const slot = insertionSlotFromPointer(overSortable.index, over.rect, pointerY);

    if (sourceColumnId === targetColumnId) {
      const col = board.columns.find((c) => c.id === targetColumnId);
      if (!col) return;
      const ids = col.cards.map((c) => c.id);
      const oldIndex = ids.indexOf(activeCardId);
      if (oldIndex === -1) return;
      const toSlot = Math.max(0, Math.min(slot, ids.length - 1));
      const newIndex = arrayMove(ids, oldIndex, toSlot).indexOf(activeCardId);
      if (oldIndex === newIndex) return;
      await patchMove(targetColumnId, newIndex);
      return;
    }

    const targetCol = board.columns.find((c) => c.id === targetColumnId);
    if (!targetCol) return;
    const ids = targetCol.cards.map((c) => c.id).filter((id) => id !== activeCardId);
    const toSlot = Math.max(0, Math.min(slot, ids.length));
    ids.splice(toSlot, 0, activeCardId);
    const newIndex = ids.indexOf(activeCardId);
    await patchMove(targetColumnId, newIndex);
  }

  const notesModalCard =
    board && notesModalCardId
      ? board.columns.flatMap((c) => c.cards).find((c) => c.id === notesModalCardId)
      : null;

  if (board === null && !error) {
    return <div className="p-10 text-sm text-zinc-500">Loading…</div>;
  }
  if (!board) {
    return (
      <div className="p-10">
        <p className="text-red-600">{error}</p>
        <Link href="/home" className="accent-text mt-4 inline-block hover:underline">
          ← Back to boards
        </Link>
      </div>
    );
  }

  const activeCard = activeId
    ? board.columns.flatMap((c) => c.cards).find((c) => cardDragId(c.id) === activeId)
    : undefined;

  const draggingSourceColumnId =
    activeId !== null
      ? (board.columns.find((c) => c.cards.some((card) => cardDragId(card.id) === activeId))?.id ?? null)
      : null;

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/95 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur dark:border-zinc-800 dark:bg-black/95 md:px-6 md:py-4">
        <div className="mx-auto flex max-w-[100vw] items-start gap-2 md:flex-wrap md:items-center md:gap-4">
          <Link
            href="/home"
            title="All boards"
            className="accent-text-muted mt-0.5 shrink-0 text-sm font-medium hover:underline md:mt-0 md:inline-flex md:items-center"
          >
            <span className="md:hidden">←</span>
            <span className="hidden md:inline">← All boards</span>
          </Link>
          {titleEdit ? (
            <input
              className="accent-focus min-w-0 flex-1 rounded border bg-white px-2 py-1 text-sm font-semibold md:min-w-[8rem] md:px-3 md:py-1.5 md:text-lg dark:bg-zinc-900"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => void saveBoardTitle()}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setTitleDraft(board.title);
                setTitleEdit(true);
              }}
              title="Rename board"
              className="accent-editable-title min-w-0 flex-1 truncate py-0.5 text-left text-sm font-semibold text-zinc-900 md:text-lg dark:text-zinc-50"
            >
              {board.title}
            </button>
          )}
          <div className="ml-auto flex shrink-0 flex-row items-center gap-1 md:gap-2">
            <button
              type="button"
              onClick={() => setAddColumnOpen(true)}
              className="accent-text-muted flex size-7 items-center justify-center rounded-md border border-zinc-300 bg-white p-0 hover:bg-zinc-50 md:size-auto md:min-h-0 md:min-w-0 md:rounded-lg md:p-2.5 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              aria-label="Add column"
              title="Add column"
            >
              <IconPlus className="size-3.5 md:size-5" />
            </button>
            <button
              type="button"
              onClick={() => setDeleteBoardOpen(true)}
              className="flex size-7 items-center justify-center rounded-md border border-zinc-300 bg-white p-0 text-zinc-500 transition-colors hover:border-red-300/60 hover:bg-red-500/5 hover:text-red-600/85 md:size-auto md:min-h-0 md:min-w-0 md:rounded-lg md:p-1.5 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:border-red-900/50 dark:hover:bg-red-950/20 dark:hover:text-red-400/85"
              aria-label="Delete board"
              title="Delete board"
            >
              <IconTrash className="size-3.5 md:size-5" />
            </button>
          </div>
        </div>
      </header>

      <CardNotesModal
        open={notesModalCardId !== null && notesModalCard !== undefined}
        boardId={boardId}
        card={notesModalCard ?? null}
        currentUserId={currentUserId}
        currentUsername={currentUsername}
        onClose={() => setNotesModalCardId(null)}
        onBoardUpdated={onBoardUpdated}
        onOptimisticBoard={(fn) => setBoard((b) => (b ? fn(b) : b))}
        onRefreshBoard={load}
      />

      <Dialog
        open={addColumnOpen}
        onClose={() => setAddColumnOpen(false)}
        title="Add column"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => setAddColumnOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="accent-bg rounded-lg px-4 py-2 text-sm text-white disabled:opacity-40"
              disabled={!addColumnTitle.trim()}
              onClick={() => void submitAddColumn()}
            >
              Add
            </button>
          </div>
        }
      >
        <label htmlFor="add-column-title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Column name
        </label>
        <input
          id="add-column-title"
          type="text"
          value={addColumnTitle}
          onChange={(e) => setAddColumnTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submitAddColumn();
          }}
          className="accent-focus mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-950"
          placeholder="e.g. Watching"
          autoFocus
        />
      </Dialog>

      <Dialog
        open={deleteBoardOpen}
        onClose={() => setDeleteBoardOpen(false)}
        title="Delete board?"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => setDeleteBoardOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500"
              onClick={() => void confirmDeleteBoard()}
            >
              Delete
            </button>
          </div>
        }
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This permanently deletes this board and all columns, cards, and notes.
        </p>
      </Dialog>

      <Dialog
        open={deleteColumnId !== null}
        onClose={() => setDeleteColumnId(null)}
        title="Delete column?"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => setDeleteColumnId(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500"
              onClick={() => void confirmDeleteColumn()}
            >
              Delete
            </button>
          </div>
        }
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          All cards and notes in this column will be removed.
        </p>
      </Dialog>

      <Dialog
        open={deleteCardId !== null}
        onClose={() => setDeleteCardId(null)}
        title="Delete card?"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => setDeleteCardId(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500"
              onClick={() => void confirmDeleteCard()}
            >
              Delete
            </button>
          </div>
        }
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">This card and all of its notes will be removed.</p>
      </Dialog>

      <DndContext
        sensors={sensors}
        collisionDetection={boardCollisionDetection}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={({ active }) => {
          setCrossColumnPreview(null);
          setActiveId(String(active.id));
        }}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setCrossColumnPreview(null);
          setActiveId(null);
        }}
      >
        <div
          className="board-columns-scroll flex min-h-0 flex-1 gap-3 overflow-x-auto overscroll-x-contain scroll-smooth scroll-px-4 bg-zinc-50 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] snap-x snap-mandatory md:gap-4 md:scroll-p-0 md:px-6 md:py-6 md:snap-none dark:bg-black"
        >
          {board.columns.map((col) => (
            <ColumnContainer
              key={col.id}
              column={col}
              board={board}
              onSaveColumnTitle={saveColumnTitle}
              onAddCard={addCardToColumn}
              onSaveCardTitle={saveCardTitle}
              onMoveColumn={onMoveColumn}
              onOpenNotes={(cardId) => setNotesModalCardId(cardId)}
              onRequestDeleteCard={(cardId) => setDeleteCardId(cardId)}
              onRequestDeleteColumn={(columnId) => setDeleteColumnId(columnId)}
              crossColumnPreview={crossColumnPreview}
              draggingSourceColumnId={draggingSourceColumnId}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div className="accent-border w-[min(18rem,calc(100vw-2rem))] max-md:min-w-[calc(100vw-2rem)] md:min-w-0 md:w-72 rounded-xl border bg-white p-3 opacity-90 shadow-xl dark:bg-zinc-900">
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">{activeCard.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
