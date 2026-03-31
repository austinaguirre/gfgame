"use client";

import { AccentProvider } from "@/components/accent-provider";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AccentProvider>{children}</AccentProvider>
    </SessionProvider>
  );
}
