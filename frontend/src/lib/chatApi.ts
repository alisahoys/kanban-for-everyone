import { userApiUrl } from "@/lib/boardApi";
import type { BoardData } from "@/lib/kanban";

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type BoardChatResult = {
  message: string;
  board?: BoardData;
};

export const sendBoardChat = async (
  question: string,
  history: ChatTurn[]
): Promise<BoardChatResult> => {
  const response = await fetch(userApiUrl("chat"), {
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
