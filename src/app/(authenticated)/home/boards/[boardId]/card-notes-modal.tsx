"use client";

import type { BoardCardDTO, BoardDetailDTO } from "@/lib/board-types";
import {
  optimisticAddNote,
  optimisticDeleteNote,
  optimisticPatchNote,
} from "@/lib/board-optimistic";
import { useBoardPending } from "@/lib/board-pending-context";
import { Dialog } from "@/components/dialog";
import { IconPencil, IconSendUp, IconTrash } from "@/components/icons";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function CardNotesModal({
  open,
  boardId,
  card,
  currentUserId,
  currentUsername,
  onClose,
  onBoardUpdated,
  onOptimisticBoard,
  onRefreshBoard,
}: Readonly<{
  open: boolean;
  boardId: string;
  card: BoardCardDTO | null;
  currentUserId: string;
  currentUsername: string;
  onClose: () => void;
  onBoardUpdated: (b: BoardDetailDTO) => void;
  onOptimisticBoard: (fn: (b: BoardDetailDTO) => BoardDetailDTO) => void;
  onRefreshBoard: () => Promise<void>;
}>) {
  const { track } = useBoardPending();
  const [noteDraft, setNoteDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const notesScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setNoteDraft("");
      setEditingId(null);
      setEditDraft("");
      setDeleteNoteId(null);
    }
  }, [open, card?.id]);

  /** Open scrolled to bottom (newest); same after sending a note. */
  useLayoutEffect(() => {
    if (!open || !card) return;
    const el = notesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: scroll on card id / note count, not full card object
  }, [open, card?.id, card?.notes.length]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!card) return;
    const t = noteDraft.trim();
    if (!t) return;
    const tempNoteId = `temp-note-${crypto.randomUUID()}`;
    onOptimisticBoard((b) => optimisticAddNote(b, card.id, tempNoteId, t, currentUserId, currentUsername));
    setBusy(true);
    try {
      const res = await track(
        fetch(`/api/boards/${boardId}/cards/${card.id}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: t }),
        }),
      );
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed");
      onBoardUpdated((await res.json()) as BoardDetailDTO);
      setNoteDraft("");
    } catch {
      await onRefreshBoard();
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(noteId: string) {
    if (!card) return;
    const t = editDraft.trim();
    if (!t) return;
    onOptimisticBoard((b) => optimisticPatchNote(b, card.id, noteId, t));
    setBusy(true);
    try {
      const res = await track(
        fetch(`/api/boards/${boardId}/cards/${card.id}/notes/${noteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: t }),
        }),
      );
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed");
      onBoardUpdated((await res.json()) as BoardDetailDTO);
      setEditingId(null);
    } catch {
      await onRefreshBoard();
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeleteNote() {
    if (!card || !deleteNoteId) return;
    const nid = deleteNoteId;
    onOptimisticBoard((b) => optimisticDeleteNote(b, card.id, nid));
    setBusy(true);
    try {
      const res = await track(
        fetch(`/api/boards/${boardId}/cards/${card.id}/notes/${nid}`, {
          method: "DELETE",
        }),
      );
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed");
      onBoardUpdated((await res.json()) as BoardDetailDTO);
      setDeleteNoteId(null);
    } catch {
      await onRefreshBoard();
    } finally {
      setBusy(false);
    }
  }

  if (!card) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={card.title}
        maxWidthClassName="max-w-4xl"
        footer={
          <form onSubmit={(e) => void addNote(e)} className="flex gap-2">
            <input
              type="text"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Write a note…"
              className="accent-focus flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              maxLength={4000}
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !noteDraft.trim()}
              className="accent-bg flex shrink-0 items-center justify-center rounded-xl p-2.5 text-white disabled:opacity-40"
              aria-label="Send note"
            >
              <IconSendUp className="size-6" />
            </button>
          </form>
        }
      >
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Oldest at top · Added by {card.created_by_username} · {formatWhen(card.created_at)}
        </p>
        <div
          ref={notesScrollRef}
          className="flex max-h-[min(58vh,520px)] flex-col gap-3 overflow-y-auto pr-1"
        >
          {card.notes.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">No notes yet. Add one below.</p>
          ) : (
            card.notes.map((n) => {
              const mine = n.created_by === currentUserId;
              return (
                <div
                  key={n.id}
                  className={`rounded-2xl px-4 py-3 text-sm ${mine ? "accent-bubble-me ml-6" : "mr-6 bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wide opacity-80">
                    <span>{n.created_by_username}</span>
                    <span>{formatWhen(n.created_at)}</span>
                  </div>
                  {editingId === n.id && mine ? (
                    <div className="space-y-2">
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        className="accent-focus w-full rounded-lg border border-zinc-300 bg-white/80 px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                        rows={4}
                        disabled={busy}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-lg px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          onClick={() => {
                            setEditingId(null);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={busy || !editDraft.trim()}
                          className="accent-bg rounded-lg px-3 py-1 text-xs text-white"
                          onClick={() => void saveEdit(n.id)}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap">{n.body}</p>
                      {mine && (
                        <div className="mt-2 flex justify-end gap-0.5">
                          <button
                            type="button"
                            className="rounded p-1 text-zinc-400/80 hover:bg-black/5 dark:text-zinc-500 dark:hover:bg-white/10"
                            aria-label="Edit note"
                            onClick={() => {
                              setEditingId(n.id);
                              setEditDraft(n.body);
                            }}
                          >
                            <IconPencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 text-zinc-400/70 transition-colors hover:bg-red-500/10 hover:text-red-600/85 dark:text-zinc-500 dark:hover:text-red-400/85"
                            aria-label="Delete note"
                            disabled={busy}
                            onClick={() => setDeleteNoteId(n.id)}
                          >
                            <IconTrash className="size-3" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Dialog>

      <Dialog
        open={deleteNoteId !== null}
        onClose={() => setDeleteNoteId(null)}
        title="Delete note?"
        maxWidthClassName="max-w-md"
        zIndexClass="z-[110]"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => setDeleteNoteId(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500"
              disabled={busy}
              onClick={() => void confirmDeleteNote()}
            >
              Delete
            </button>
          </div>
        }
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">This note will be removed for everyone.</p>
      </Dialog>
    </>
  );
}
