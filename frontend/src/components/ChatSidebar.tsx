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
        className="mb-3 flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-white px-5 py-3.5 text-left text-sm font-semibold text-[var(--ink)] shadow-[var(--shadow)] transition hover:border-[var(--mauve)]"
        onClick={() => setExpanded((open) => !open)}
        type="button"
      >
        <span className="font-display">AI assistant</span>
        <span className="flex items-center gap-2 text-[var(--berry)]">
          {expanded ? "Close" : "Open chat"}
          <svg
            aria-hidden="true"
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 10l4-4 4 4" />
          </svg>
        </span>
      </button>

      <aside
        aria-label="AI assistant"
        className={`${expanded ? "flex" : "hidden"} h-[min(640px,75dvh)] min-h-[400px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow)]`}
        id="board-chat-panel"
      >
        <header className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
            Board chat
          </h2>
          <p className="mt-0.5 text-sm text-[var(--ink-soft)]">
            Ask a question, or have the assistant add, edit or move cards.
          </p>
        </header>

        <div
          aria-label="Conversation"
          aria-live="polite"
          className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[var(--background)] px-4 py-4"
          role="log"
        >
          {turns.length === 0 && !pendingQuestion ? (
            <p className="rounded-xl border border-dashed border-[var(--mauve)]/40 px-4 py-3 text-sm leading-6 text-[var(--ink-soft)]">
              Ask about your project or request a change to the board.
            </p>
          ) : null}
          {turns.map((turn, index) => (
            <p
              className={
                turn.role === "user"
                  ? "ml-10 rounded-2xl rounded-br-md bg-[var(--berry)] px-4 py-2.5 text-sm leading-6 text-white"
                  : "mr-10 rounded-2xl rounded-bl-md border border-[var(--border)] bg-white px-4 py-2.5 text-sm leading-6 text-[var(--ink)]"
              }
              key={`${turn.role}-${index}`}
            >
              {turn.content}
            </p>
          ))}
          {pendingQuestion ? (
            <>
              <p className="ml-10 rounded-2xl rounded-br-md bg-[var(--berry)] px-4 py-2.5 text-sm leading-6 text-white">
                {pendingQuestion}
              </p>
              <p className="flex items-center gap-2 text-sm text-[var(--ink-soft)]" role="status">
                <span aria-hidden="true" className="flex gap-1">
                  <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-[var(--mauve)]" />
                  <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-[var(--mauve)] [animation-delay:0.2s]" />
                  <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-[var(--mauve)] [animation-delay:0.4s]" />
                </span>
                Assistant is thinking...
              </p>
            </>
          ) : null}
        </div>

        {error ? (
          <p className="mx-4 mt-3 rounded-xl bg-[var(--blush)] px-3 py-2 text-sm text-[var(--berry)]" role="alert">
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
            className="field min-h-20 resize-y leading-6"
            id="board-chat-question"
            maxLength={2000}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about your board..."
            value={draft}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--ink-soft)]">
              {sending ? "Sending..." : "AI can update your board"}
            </span>
            <button
              className="btn btn-primary"
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
