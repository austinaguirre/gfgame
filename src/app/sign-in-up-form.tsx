"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function SignInUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [signInUsername, setSignInUsername] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpUsername, setSignUpUsername] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signUpError, setSignUpError] = useState("");
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSignInError("");
    const res = await signIn("credentials", {
      username: signInUsername.trim(),
      password: signInPassword,
      redirect: false,
    });
    if (res?.error) {
      setSignInError("Invalid username or password");
      return;
    }
    router.push(searchParams.get("callbackUrl") ?? "/home");
    router.refresh();
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSignUpError("");
    setSignUpSuccess(false);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: signUpUsername.trim(),
        password: signUpPassword,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSignUpError(data.error ?? "Sign up failed");
      return;
    }
    setSignUpSuccess(true);
    setSignUpUsername("");
    setSignUpPassword("");
  }

  return (
    <>
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Sign in
        </h2>
        <form onSubmit={handleSignIn} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Username"
            value={signInUsername}
            onChange={(e) => setSignInUsername(e.target.value)}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            required
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Password"
            value={signInPassword}
            onChange={(e) => setSignInPassword(e.target.value)}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            required
            autoComplete="current-password"
          />
          {signInError && (
            <p className="text-sm text-red-600 dark:text-red-400">{signInError}</p>
          )}
          <button
            type="submit"
            className="rounded bg-zinc-900 py-2 font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Sign in
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Sign up
        </h2>
        <form onSubmit={handleSignUp} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Username"
            value={signUpUsername}
            onChange={(e) => setSignUpUsername(e.target.value)}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            required
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Password"
            value={signUpPassword}
            onChange={(e) => setSignUpPassword(e.target.value)}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            required
            autoComplete="new-password"
          />
          {signUpError && (
            <p className="text-sm text-red-600 dark:text-red-400">{signUpError}</p>
          )}
          {signUpSuccess && (
            <p className="accent-text text-sm">
              Account created. You can sign in above.
            </p>
          )}
          <button
            type="submit"
            className="rounded border border-zinc-300 py-2 font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Sign up
          </button>
        </form>
      </section>
    </>
  );
}
