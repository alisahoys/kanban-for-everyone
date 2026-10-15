import type { BoardData } from "@/lib/kanban";

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type BoardChatResult = {
  message: string;
  board?: BoardData;
};

const chatUrl = () => {
  const apiBase =
    window.location.port === "3000"
      ? `${window.location.protocol}//${window.location.hostname}:8000/api`
      : "/api";
  return `${apiBase}/users/demo-user/chat`;
};

export const sendBoardChat = async (
  question: string,
  history: ChatTurn[]
): Promise<BoardChatResult> => {
  const response = await fetch(chatUrl(), {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history }),
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as
      | { detail?: unknown }
      | null;
    const message =
      typeof result?.detail === "string"
        ? result.detail
        : `Chat request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return (await response.json()) as BoardChatResult;
};
