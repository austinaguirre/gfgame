import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ProfileAccentSettings } from "./profile-accent-settings";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <div className="px-6 py-10">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Profile
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Signed in as <strong>{session.user.username}</strong>.
      </p>
      <ProfileAccentSettings />
    </div>
  );
}
