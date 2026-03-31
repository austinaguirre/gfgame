"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  username: string;
  admin: boolean;
  is_active: boolean;
  created_at: string;
};

export function AdminUsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchUsers() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/users");
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setUsers(data.users ?? []);
    } else {
      setError(data.error ?? "Failed to load users");
      setUsers([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function setActive(id: string, is_active: boolean) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active }),
    });
    if (res.ok) fetchUsers();
  }

  if (loading) return <p className="mt-4 text-zinc-500">Loading…</p>;
  if (error) return <p className="mt-4 text-red-600 dark:text-red-400">{error}</p>;
  if (users.length === 0) return <p className="mt-4 text-zinc-500">No users.</p>;

  return (
    <ul className="mt-6 space-y-3">
      {users.map((u) => (
        <li
          key={u.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {u.username}
          </span>
          <div className="flex items-center gap-3">
            {u.admin && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">admin</span>
            )}
            <label className="flex items-center gap-2 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Active</span>
              <input
                type="checkbox"
                checked={u.is_active}
                onChange={(e) => setActive(u.id, e.target.checked)}
                className="rounded border-zinc-300"
              />
            </label>
          </div>
        </li>
      ))}
    </ul>
  );
}
