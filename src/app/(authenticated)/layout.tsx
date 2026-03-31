import { MobileBottomNav, Sidebar } from "@/components/sidebar";

export default function AuthenticatedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <div className="flex min-h-dvh bg-zinc-50 font-sans dark:bg-black md:flex-row">
        <Sidebar />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-zinc-50 pb-[calc(2.5rem+env(safe-area-inset-bottom))] dark:bg-black md:pb-0">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </>
  );
}
