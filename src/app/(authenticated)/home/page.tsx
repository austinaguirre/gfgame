import { redirect } from "next/navigation";
import { BoardPendingProvider } from "@/lib/board-pending-context";
import { getSession } from "@/lib/session";
import { BoardsHomeClient } from "./boards-home-client";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/");

  if (!session.user.is_active) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Pending approval
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Your account is not active yet. An admin must set you as active.
          </p>
        </div>
      </div>
    );
  }

  return (
    <BoardPendingProvider>
      <BoardsHomeClient />
    </BoardPendingProvider>
  );
}
