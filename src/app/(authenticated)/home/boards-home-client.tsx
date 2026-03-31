"use client";

import type { BoardSummary } from "@/lib/board-types";
import { useBoardPending } from "@/lib/board-pending-context";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function BoardsHomeClient() {
  const { track } = useBoardPending();
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    await track(
      (async () => {
        const res = await fetch("/api/boards");
        if (!res.ok) {
          setError((await res.json().catch(() => ({})))?.error ?? "Failed to load boards");
          return;
        }
        setBoards(await res.json());
      })(),
    );
  }, [track]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createBoard(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setSaving(true);
    setError(null);
    try {
      const res = await track(
        fetch("/api/boards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: t }),
        }),
      );
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed to create");
      setTitle("");
      await load();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (boards === null && !error) {
    return (
      <div className="px-6 py-10 text-sm text-zinc-500 dark:text-zinc-400" role="status">
        Loading boards…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Our boards!</h1>

      <form onSubmit={createBoard} className="mt-8 flex flex-wrap gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New board title"
          className="accent-focus min-w-[12rem] flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          maxLength={200}
          aria-label="New board title"
        />
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="accent-bg rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create board"}
        </button>
      </form>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <ul className="mt-10 space-y-2">
        {(boards ?? []).map((b) => (
          <li key={b.id}>
            <Link
              href={`/home/boards/${b.id}`}
              className="accent-hover-row flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{b.title}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {new Date(b.updated_at).toLocaleString()}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {boards && boards.length === 0 && !error && (
        <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">No boards yet — create one above.</p>
      )}
    </div>
  );
}
