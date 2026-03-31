"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export type SidebarItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

/** Shared with `MobileBottomNav` — same order and icons as the desktop sidebar. */
export const appNavItems: SidebarItem[] = [
  {
    label: "Boards",
    href: "/home",
    icon: (
      <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: "Profile",
    href: "/profile",
    icon: (
      <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    label: "Game",
    href: "/game",
    icon: (
      <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const signOutIcon = (
  <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const adminIcon = (
  <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const expandIcon = (
  <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
  </svg>
);

const collapseIcon = (
  <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
  </svg>
);

type SidebarProps = Readonly<{
  items?: SidebarItem[];
  className?: string;
}>;

function navLinkClass(isActive: boolean) {
  return `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive
      ? "nav-accent-active"
      : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    }`;
}

function bottomNavBtnClass(isActive: boolean) {
  return `flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center rounded-md px-0.5 py-1 text-sm font-medium transition-colors ${
    isActive
      ? "nav-accent-active"
      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
  }`;
}

/** Icon-only bottom row for small screens; mirrors sidebar links + sign-out (no expand/collapse). */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.admin === true;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around gap-0 border-t border-zinc-200 bg-white px-0.5 pb-[env(safe-area-inset-bottom)] pt-0.5 dark:border-zinc-800 dark:bg-zinc-900 md:hidden [&_svg]:size-[1.125rem]"
      aria-label="Main navigation"
    >
      {appNavItems.map((item) => {
        const isActive =
          pathname === item.href || (item.href === "/home" && pathname.startsWith("/home"));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            title={item.label}
            className={bottomNavBtnClass(isActive)}
          >
            {item.icon}
          </Link>
        );
      })}
      {isAdmin ? (
        <Link
          href="/admin"
          aria-current={pathname === "/admin" ? "page" : undefined}
          title="All users"
          className={bottomNavBtnClass(pathname === "/admin")}
        >
          {adminIcon}
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        title="Sign out"
        className={bottomNavBtnClass(false)}
      >
        {signOutIcon}
      </button>
    </nav>
  );
}

export function Sidebar({ items = appNavItems, className = "" }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.admin === true;
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-zinc-200 bg-white py-6 dark:border-zinc-800 dark:bg-zinc-900 min-h-full transition-[width] duration-200 ease-out overflow-hidden ${expanded ? "w-52" : "w-[4.25rem]"
        } ${className}`}
      aria-label="Sidebar"
    >
      <nav className="flex flex-1 flex-col px-3">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/home" && pathname.startsWith("/home"));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              title={!expanded ? item.label : undefined}
              className={navLinkClass(isActive)}
            >
              {item.icon}
              {expanded && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
        {isAdmin && (
          <>
            <div className="my-2 border-t border-zinc-200 dark:border-zinc-800" />
            {expanded && (
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Admin
              </p>
            )}
            <Link
              href="/admin"
              aria-current={pathname === "/admin" ? "page" : undefined}
              title={!expanded ? "All users" : undefined}
              className={navLinkClass(pathname === "/admin")}
            >
              {adminIcon}
              {expanded && <span className="truncate">All users</span>}
            </Link>
          </>
        )}
      </nav>
      <div className="mt-auto border-t border-zinc-200 px-3 pt-4 dark:border-zinc-800 space-y-1">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          title={!expanded ? "Sign out" : undefined}
          className={`w-full ${navLinkClass(false)} ${expanded ? "" : "justify-center px-0"}`}
        >
          {signOutIcon}
          {expanded && <span className="truncate">Sign out</span>}
        </button>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className={`w-full ${navLinkClass(false)} ${expanded ? "" : "justify-center px-0"}`}
        >
          {expanded ? collapseIcon : expandIcon}
          {expanded && <span className="truncate">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
