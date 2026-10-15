import { render, screen } from "@testing-library/react";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";

describe("KanbanCardPreview", () => {
  it("renders the card title and details", () => {
    render(
      <KanbanCardPreview
        card={{
          id: "preview-1",
          title: "Preview title",
          details: "Preview details",
          priority: null,
          dueDate: null,
        }}
      />
    );

    expect(screen.getByRole("heading", { name: "Preview title" })).toBeInTheDocument();
    expect(screen.getByText("Preview details")).toBeInTheDocument();
  });
});
