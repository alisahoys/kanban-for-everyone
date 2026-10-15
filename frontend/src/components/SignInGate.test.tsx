import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignInGate } from "@/components/SignInGate";
import { createMockBoardApi } from "@/test/mockBoardApi";

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(createMockBoardApi().fetchBoard));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const submitCredentials = async (username: string, password: string) => {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Username"), username);
  await user.type(await screen.findByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  return user;
};

describe("SignInGate", () => {
  it("shows the sign-in form without rendering the board", async () => {
    render(<SignInGate />);

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByTestId("column-col-backlog")).not.toBeInTheDocument();
  });

  it("rejects credentials that do not match the demo account", async () => {
    render(<SignInGate />);

    await submitCredentials("user", "wrong-password");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Incorrect username or password."
    );
    expect(screen.queryByTestId("column-col-backlog")).not.toBeInTheDocument();
    expect(sessionStorage.getItem("pm-demo-authenticated")).toBeNull();
  });

  it("opens the board with the demo credentials and restores the tab session", async () => {
    const { unmount } = render(<SignInGate />);

    await submitCredentials("user", "password");
    expect(await screen.findByTestId("column-col-backlog")).toBeInTheDocument();
    expect(sessionStorage.getItem("pm-demo-authenticated")).toBe("true");

    unmount();
    render(<SignInGate />);

    expect(await screen.findByTestId("column-col-backlog")).toBeInTheDocument();
  });

  it("logs out and clears the tab session", async () => {
    render(<SignInGate />);
    const user = await submitCredentials("user", "password");

    expect(await screen.findByTestId("column-col-backlog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByTestId("column-col-backlog")).not.toBeInTheDocument();
    expect(sessionStorage.getItem("pm-demo-authenticated")).toBeNull();
  });

  it("preserves board changes after logout and signing back in", async () => {
    render(<SignInGate />);
    const user = await submitCredentials("user", "password");

    const column = screen.getByTestId("column-col-backlog");
    await user.click(within(column).getByRole("button", { name: /add a card/i }));
    await user.type(within(column).getByPlaceholderText("Card title"), "Saved card");
    await user.click(within(column).getByRole("button", { name: /add card/i }));
    expect(await screen.findByText("Saved card")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await submitCredentials("user", "password");

    expect(await screen.findByText("Saved card")).toBeInTheDocument();
  });
});
