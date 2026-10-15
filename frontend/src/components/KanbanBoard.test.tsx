import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, vi } from "vitest";
import { KanbanBoard } from "@/components/KanbanBoard";
import { createMockBoardApi } from "@/test/mockBoardApi";
import { initialData, type BoardData } from "@/lib/kanban";

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];
const renderBoard = () => render(<KanbanBoard onSignOut={() => {}} />);

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(createMockBoardApi().fetchBoard));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("KanbanBoard", () => {
  it("renders five columns", async () => {
    renderBoard();
    expect(await screen.findAllByTestId(/column-/i)).toHaveLength(5);
  });

  it("saves project details through the board API", async () => {
    renderBoard();
    await screen.findByRole("heading", { name: "Product Planning" });
    await userEvent.click(screen.getByRole("button", { name: "Edit project details" }));
    await userEvent.clear(screen.getByLabelText("Project name"));
    await userEvent.type(screen.getByLabelText("Project name"), "Customer insights");
    await userEvent.clear(screen.getByLabelText("Project description"));
    await userEvent.type(
      screen.getByLabelText("Project description"),
      "Turn customer feedback into product improvements."
    );
    await userEvent.click(screen.getByRole("button", { name: "Save project details" }));

    expect(await screen.findByRole("heading", { name: "Customer insights" })).toBeInTheDocument();
  });

  it("renames a column", async () => {
    renderBoard();
    await screen.findByTestId("column-col-backlog");
    const column = getFirstColumn();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
  });

  it("never saves an empty column title and restores it on blur", async () => {
    const api = createMockBoardApi();
    const fetchMock = vi.fn(api.fetchBoard);
    vi.stubGlobal("fetch", fetchMock);
    renderBoard();
    const input = within(await screen.findByTestId("column-col-backlog")).getByLabelText(
      "Column title"
    );

    await userEvent.clear(input);
    expect(input).toHaveValue("");
    await userEvent.tab();

    expect(input).toHaveValue("Backlog");
    await new Promise((resolve) => setTimeout(resolve, 300));
    const savedTitles = fetchMock.mock.calls
      .filter(([, init]) => init?.method === "PUT")
      .map(([, init]) => (JSON.parse(String(init?.body)) as BoardData).columns[0].title);
    expect(savedTitles).not.toContain("");
    expect(api.getSavedBoard().columns[0].title).toBe("Backlog");
  });

  it("locks the board while chat is pending and can undo an AI change", async () => {
    const api = createMockBoardApi();
    const aiBoard = structuredClone(initialData);
    aiBoard.cards["card-1"].title = "Changed by AI";
    let resolveChat: (response: Response) => void = () => {};
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
      String(input).endsWith("/chat")
        ? new Promise<Response>((resolve) => {
            resolveChat = resolve;
          })
        : api.fetchBoard(input, init)
    );
    vi.stubGlobal("fetch", fetchMock);
    renderBoard();
    await screen.findByTestId("column-col-backlog");

    await userEvent.type(screen.getByLabelText("Ask the assistant"), "Rename card one.");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Board is locked while the assistant works.")).toBeInTheDocument();
    expect(screen.getByTestId("board-columns")).toHaveAttribute("inert");

    const putsBeforeReply = fetchMock.mock.calls.filter(([, i]) => i?.method === "PUT").length;
    await act(async () => {
      resolveChat({
        ok: true,
        status: 200,
        json: async () => ({ message: "Renamed.", board: aiBoard }),
      } as Response);
    });

    expect(await screen.findByText("Changed by AI")).toBeInTheDocument();
    expect(screen.getByTestId("board-columns")).not.toHaveAttribute("inert");
    await new Promise((resolve) => setTimeout(resolve, 300));
    // The server already saved the AI board, so the client must not save it again.
    expect(fetchMock.mock.calls.filter(([, i]) => i?.method === "PUT")).toHaveLength(
      putsBeforeReply
    );

    await userEvent.click(screen.getByRole("button", { name: "Undo AI change" }));
    expect(await screen.findByText("Align roadmap themes")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Undo AI change" })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(api.getSavedBoard().cards["card-1"].title).toBe("Align roadmap themes")
    );
  });

  it("adds and removes a card", async () => {
    renderBoard();
    await screen.findByTestId("column-col-backlog");
    const column = getFirstColumn();
    const addButton = within(column).getByRole("button", {
      name: /add a card/i,
    });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/card title/i);
    await userEvent.type(titleInput, "New card");
    const detailsInput = within(column).getByPlaceholderText(/details/i);
    await userEvent.type(detailsInput, "Notes");

    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("New card")).toBeInTheDocument();

    const deleteButton = within(column).getByRole("button", {
      name: /delete new card/i,
    });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
  });

  it("edits card priority and due date and marks past dates overdue", async () => {
    const board = structuredClone(initialData);
    board.cards["card-1"].priority = "high";
    board.cards["card-1"].dueDate = "2000-01-01";
    vi.stubGlobal("fetch", vi.fn(createMockBoardApi(board).fetchBoard));
    renderBoard();

    const card = await screen.findByTestId("card-card-1");
    expect(await within(card).findByText("Overdue: Jan 1, 2000")).toBeInTheDocument();
    await userEvent.click(
      within(card).getByRole("button", { name: "Edit title: Align roadmap themes" })
    );
    await userEvent.selectOptions(within(card).getByLabelText("Card priority"), "medium");
    fireEvent.change(within(card).getByLabelText("Due date"), {
      target: { value: "2099-03-12" },
    });
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));

    expect(await within(card).findByText("medium priority")).toBeInTheDocument();
    expect(within(card).getByText("Due Mar 12, 2099")).toBeInTheDocument();
  });
});
