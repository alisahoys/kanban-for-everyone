import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatSidebar } from "@/components/ChatSidebar";
import { initialData } from "@/lib/kanban";

const { sendBoardChatMock } = vi.hoisted(() => ({
  sendBoardChatMock: vi.fn(),
}));

vi.mock("@/lib/chatApi", () => ({ sendBoardChat: sendBoardChatMock }));

const renderChat = (onBoardUpdate = vi.fn()) => {
  const beforeSend = vi.fn().mockResolvedValue(undefined);
  render(<ChatSidebar beforeSend={beforeSend} onBoardUpdate={onBoardUpdate} />);
  return { beforeSend, onBoardUpdate };
};

beforeEach(() => {
  sendBoardChatMock.mockReset();
});

describe("ChatSidebar", () => {
  it("submits questions with conversation history and renders replies", async () => {
    sendBoardChatMock
      .mockResolvedValueOnce({ message: "There are five columns." })
      .mockResolvedValueOnce({ message: "The backlog has two cards." });
    const user = userEvent.setup();
    const { beforeSend } = renderChat();

    await user.type(screen.getByLabelText("Ask the assistant"), "How many columns?");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("There are five columns.")).toBeInTheDocument();
    expect(beforeSend).toHaveBeenCalledTimes(1);
    expect(sendBoardChatMock).toHaveBeenLastCalledWith("How many columns?", []);

    await user.type(screen.getByLabelText("Ask the assistant"), "How many in backlog?");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("The backlog has two cards.")).toBeInTheDocument();
    expect(sendBoardChatMock).toHaveBeenLastCalledWith(
      "How many in backlog?",
      [
        { role: "user", content: "How many columns?" },
        { role: "assistant", content: "There are five columns." },
      ]
    );
  });

  it("applies a returned board update", async () => {
    const updatedBoard = structuredClone(initialData);
    updatedBoard.cards["card-1"].title = "Updated by assistant";
    sendBoardChatMock.mockResolvedValue({
      message: "I updated the task.",
      board: updatedBoard,
    });
    const user = userEvent.setup();
    const { onBoardUpdate } = renderChat();

    await user.type(screen.getByLabelText("Ask the assistant"), "Rename the first task.");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("I updated the task.")).toBeInTheDocument();
    expect(onBoardUpdate).toHaveBeenCalledWith(updatedBoard);
  });

  it("shows loading and a readable error while preserving the question for retry", async () => {
    let rejectRequest: (error: Error) => void = () => {};
    sendBoardChatMock.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectRequest = reject;
      })
    );
    const user = userEvent.setup();
    renderChat();

    const input = screen.getByLabelText("Ask the assistant");
    await user.type(input, "Move the first task.");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByRole("status")).toHaveTextContent("Assistant is thinking...");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

    await act(async () => {
      rejectRequest(new Error("AI provider returned an invalid response"));
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "AI provider returned an invalid response"
    );
    expect(input).toHaveValue("Move the first task.");
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });
});
