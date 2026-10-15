import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, vi } from "vitest";
import { KanbanBoard } from "@/components/KanbanBoard";
import { createMockBoardApi } from "@/test/mockBoardApi";

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
});
