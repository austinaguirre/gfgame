import { Suspense } from "react";
import { SignInUpForm } from "./sign-in-up-form";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col gap-10 px-6 py-16">
        <h1 className="text-center text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Sign in or sign up
        </h1>
        <Suspense fallback={<div className="text-zinc-500">Loading…</div>}>
          <SignInUpForm />
        </Suspense>
      </main>
    </div>
  );
}
