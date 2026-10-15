import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("Home", () => {
  it("renders the Kanban board as the home page", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "Kanban Studio" })).toBeInTheDocument();
  });
});
