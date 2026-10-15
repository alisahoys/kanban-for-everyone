"use client";

import { useEffect, useState, type FormEvent } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";

const sessionKey = "pm-demo-authenticated";

type AuthStatus = "checking" | "signed-out" | "signed-in";

export const SignInGate = () => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAuthStatus(
        sessionStorage.getItem(sessionKey) === "true" ? "signed-in" : "signed-out"
      );
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (username !== "user" || password !== "password") {
      setError("Incorrect username or password.");
      return;
    }

    sessionStorage.setItem(sessionKey, "true");
    setError("");
    setAuthStatus("signed-in");
  };

  const handleSignOut = () => {
    sessionStorage.removeItem(sessionKey);
    setUsername("");
    setPassword("");
    setError("");
    setAuthStatus("signed-out");
  };

  if (authStatus === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-12">
        <p role="status" className="text-sm text-[var(--muted)]">
          Checking your session...
        </p>
      </main>
    );
  }

  if (authStatus === "signed-in") {
    return <KanbanBoard onSignOut={handleSignOut} />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section
        aria-labelledby="sign-in-title"
        className="w-full max-w-md rounded-[32px] border border-[var(--border)] bg-white/90 p-8 shadow-[var(--shadow)] backdrop-blur sm:p-10"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
          Kanban Studio
        </p>
        <h1
          id="sign-in-title"
          className="mt-4 font-display text-3xl font-semibold text-[var(--ink)]"
        >
          Sign in
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Sign in to open your project board.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-sm font-medium text-[var(--ink)]"
            >
              Username
            </label>
            <input
              autoComplete="username"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--mauve)]"
              id="username"
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              required
              value={username}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-[var(--ink)]"
            >
              Password
            </label>
            <input
              autoComplete="current-password"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--mauve)]"
              id="password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm font-medium text-[var(--berry)]">
              {error}
            </p>
          ) : null}

          <button
            className="w-full rounded-xl bg-[var(--mauve)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            type="submit"
          >
            Sign in
          </button>
        </form>

        <p className="mt-6 text-xs text-[var(--muted)]">
          Demo credentials: user / password
        </p>
      </section>
    </main>
  );
};
