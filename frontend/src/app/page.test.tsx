import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("Home", () => {
  it("requires sign in before opening the Kanban board", async () => {
    render(<Home />);

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Kanban Studio" })
    ).not.toBeInTheDocument();
  });
});
