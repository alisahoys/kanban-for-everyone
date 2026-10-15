import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewCardForm } from "@/components/NewCardForm";

describe("NewCardForm", () => {
  it("trims card fields, submits, and resets the form", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<NewCardForm onAdd={onAdd} />);

    await user.click(screen.getByRole("button", { name: "Add a card" }));
    await user.type(screen.getByPlaceholderText("Card title"), "  Plan launch  ");
    await user.type(screen.getByPlaceholderText("Details"), "  Prepare release notes  ");
    await user.selectOptions(screen.getByLabelText("Priority"), "high");
    fireEvent.change(screen.getByLabelText("Due date"), {
      target: { value: "2027-03-12" },
    });
    await user.click(screen.getByRole("button", { name: "Add card" }));

    expect(onAdd).toHaveBeenCalledWith(
      "Plan launch",
      "Prepare release notes",
      "high",
      "2027-03-12"
    );
    expect(screen.getByRole("button", { name: "Add a card" })).toBeInTheDocument();
  });

  it("does not submit a blank title", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<NewCardForm onAdd={onAdd} />);

    await user.click(screen.getByRole("button", { name: "Add a card" }));
    const title = screen.getByPlaceholderText("Card title");
    await user.type(title, "   ");
    fireEvent.submit(title.closest("form")!);

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText("Card title")).toBeInTheDocument();
  });

  it("closes and clears the form when canceled", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<NewCardForm onAdd={onAdd} />);

    await user.click(screen.getByRole("button", { name: "Add a card" }));
    await user.type(screen.getByPlaceholderText("Card title"), "Discard this");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Add a card" }));

    expect(screen.getByPlaceholderText("Card title")).toHaveValue("");
    expect(onAdd).not.toHaveBeenCalled();
  });
});
