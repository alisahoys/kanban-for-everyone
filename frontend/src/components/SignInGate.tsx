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
        <p role="status" className="text-sm text-[var(--ink-soft)]">
          Checking your session...
        </p>
      </main>
    );
  }

  if (authStatus === "signed-in") {
    return <KanbanBoard onSignOut={handleSignOut} />;
  }

  return (
    <main className="project-floral-surface flex min-h-screen items-center justify-center px-6 py-12">
      <section
        aria-labelledby="sign-in-title"
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-8 shadow-[var(--shadow)] sm:p-10"
      >
        <p className="flex items-center gap-2 font-display text-sm font-semibold text-[var(--berry)]">
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
            <rect x="1" y="2" width="4" height="12" rx="1.5" />
            <rect x="6" y="2" width="4" height="8" rx="1.5" opacity="0.7" />
            <rect x="11" y="2" width="4" height="5" rx="1.5" opacity="0.45" />
          </svg>
          Kanban Studio
        </p>
        <h1
          id="sign-in-title"
          className="mt-6 font-display text-3xl font-semibold text-[var(--ink)]"
        >
          Sign in
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
          Sign in to open your project board.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-sm font-semibold text-[var(--ink)]"
            >
              Username
            </label>
            <input
              autoComplete="username"
              className="field py-3"
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
              className="mb-1.5 block text-sm font-semibold text-[var(--ink)]"
            >
              Password
            </label>
            <input
              autoComplete="current-password"
              className="field py-3"
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

          <button className="btn btn-primary w-full py-3" type="submit">
            Sign in
          </button>
        </form>

        <p className="mt-6 text-xs text-[var(--ink-soft)]">
          Demo credentials: user / password
        </p>
      </section>
    </main>
  );
};
