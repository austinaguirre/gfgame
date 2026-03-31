import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AdminUsersList } from "./admin-users-list";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (!session.user.admin) redirect("/home");

  return (
    <div className="px-6 py-10">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Admin – All users
      </h1>
      <AdminUsersList />
    </div>
  );
}
