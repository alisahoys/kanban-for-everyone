"use client";

import { useState, type FormEvent } from "react";
import { sendBoardChat, type ChatTurn } from "@/lib/chatApi";
import type { BoardData } from "@/lib/kanban";

type ChatSidebarProps = {
  beforeSend: () => Promise<void>;
  onBoardUpdate: (board: BoardData) => void;
  onSendingChange?: (sending: boolean) => void;
};

export const ChatSidebar = ({
  beforeSend,
  onBoardUpdate,
  onSendingChange,
}: ChatSidebarProps) => {
  const [expanded, setExpanded] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question || sending) {
      return;
    }

    setSending(true);
    onSendingChange?.(true);
    setError("");
    setPendingQuestion(question);

    try {
      await beforeSend();
      const result = await sendBoardChat(question, turns.slice(-20));
      setTurns((current) => [
        ...current,
        { role: "user", content: question },
        { role: "assistant", content: result.message },
      ]);
      if (result.board) {
        onBoardUpdate(result.board);
      }
      setDraft("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The assistant could not respond. Please try again."
      );
    } finally {
      setPendingQuestion("");
      setSending(false);
      onSendingChange?.(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl min-w-0">
      <button
        aria-controls="board-chat-panel"
        aria-expanded={expanded}
        className="mb-4 flex w-full items-center justify-between rounded-2xl border border-[var(--border)] bg-white/90 px-5 py-4 text-left text-sm font-semibold text-[var(--ink)] shadow-[var(--shadow)]"
        onClick={() => setExpanded((open) => !open)}
        type="button"
      >
        <span>AI assistant</span>
        <span className="text-[var(--berry)]">
          {expanded ? "Close" : "Open chat"}
        </span>
      </button>

      <aside
        aria-label="AI assistant"
        className={`${expanded ? "flex" : "hidden"} h-[min(640px,75dvh)] min-h-[400px] flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-white/95 shadow-[var(--shadow)]`}
        id="board-chat-panel"
      >
        <header className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--muted)]">
            Project assistant
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold text-[var(--ink)]">
            Board chat
          </h2>
        </header>

        <div
          aria-label="Conversation"
          aria-live="polite"
          className="chat-floral-surface min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
          role="log"
        >
          {turns.length === 0 && !pendingQuestion ? (
            <p className="rounded-2xl bg-[var(--background)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              Ask about your project or request a change to the board.
            </p>
          ) : null}
          {turns.map((turn, index) => (
            <p
              className={
                turn.role === "user"
                  ? "ml-6 rounded-2xl rounded-br-md bg-[var(--blush)] px-4 py-3 text-sm leading-6 text-[var(--ink)]"
                  : "mr-4 rounded-2xl rounded-bl-md bg-[var(--background)] px-4 py-3 text-sm leading-6 text-[var(--ink)]"
              }
              key={`${turn.role}-${index}`}
            >
              {turn.content}
            </p>
          ))}
          {pendingQuestion ? (
            <>
              <p className="ml-6 rounded-2xl rounded-br-md bg-[var(--blush)] px-4 py-3 text-sm leading-6 text-[var(--ink)]">
                {pendingQuestion}
              </p>
              <p className="text-sm text-[var(--muted)]" role="status">
                Assistant is thinking...
              </p>
            </>
          ) : null}
        </div>

        {error ? (
          <p className="mx-4 mb-2 rounded-xl bg-[var(--blush)] px-3 py-2 text-sm text-[var(--berry)]" role="alert">
            {error}
          </p>
        ) : null}

        <form
          className="border-t border-[var(--border)] bg-white p-4"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <label className="sr-only" htmlFor="board-chat-question">
            Ask the assistant
          </label>
          <textarea
            className="min-h-20 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm leading-6 text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--mauve)]"
            id="board-chat-question"
            maxLength={2000}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about your board..."
            value={draft}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--muted)]">
              {sending ? "Sending..." : "AI can update your board"}
            </span>
            <button
              className="rounded-full bg-[var(--mauve)] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={sending || !draft.trim()}
              type="submit"
            >
              Send
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
};
