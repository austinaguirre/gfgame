import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { BoardViewClient } from "./board-view-client";

type PageProps = Readonly<{ params: Promise<{ boardId: string }> }>;

export default async function BoardPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/");
  if (!session.user.is_active) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Pending approval</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Your account is not active yet. An admin must set you as active.
          </p>
        </div>
      </div>
    );
  }

  const { boardId } = await params;
  return (
    <BoardViewClient
      boardId={boardId}
      currentUserId={session.user.id}
      currentUsername={session.user.username}
    />
  );
}
