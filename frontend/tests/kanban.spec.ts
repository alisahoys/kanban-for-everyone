import { expect, test, type Page } from "@playwright/test";
import { initialData } from "../src/lib/kanban";

test.beforeEach(async ({ request }) => {
  const response = await request.put("/api/users/demo-user/board", {
    data: initialData,
  });
  expect(response.ok()).toBeTruthy();
});

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Product Planning" })).toBeVisible();
}

async function openAssistant(page: Page) {
  const openChat = page.getByRole("button", { name: /open chat/i });
  if (await openChat.isVisible()) {
    await openChat.click();
  }
}

async function expectBoardStored(
  page: Page,
  matches: (board: typeof initialData) => boolean
) {
  await expect
    .poll(async () => {
      const response = await page.request.get("/api/users/demo-user/board");
      return response.ok() && matches(await response.json());
    })
    .toBe(true);
}

test("requires valid credentials and keeps sign-in for the tab session", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(0);

  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("incorrect");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator('p[role="alert"]')).toHaveText(
    "Incorrect username or password."
  );
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(0);

  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
  await page.reload();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);

  const backlog = page.getByTestId("column-col-backlog");
  await backlog.getByRole("button", { name: /add a card/i }).click();
  await backlog.getByPlaceholder("Card title").fill("Saved across sign out");
  await backlog.getByRole("button", { name: /add card/i }).click();
  await expect(backlog.getByText("Saved across sign out")).toBeVisible();

  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Saved across sign out")).toBeVisible();
});

test("loads the kanban board", async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().toLowerCase().includes("hydrated")) {
      hydrationErrors.push(message.text());
    }
  });

  await signIn(page);
  await expect(page.getByRole("heading", { name: "Product Planning" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
  expect(hydrationErrors).toEqual([]);
});

test("edits and persists project details", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Edit project details" }).click();
  await page.getByLabel("Project name").fill("Customer insights");
  await page
    .getByLabel("Project description")
    .fill("Turn customer feedback into product improvements.");
  await page.getByRole("button", { name: "Save project details" }).click();

  await expect(page.getByRole("heading", { name: "Customer insights" })).toBeVisible();
  await expectBoardStored(page, (board) =>
    board.project.name === "Customer insights" &&
      board.project.description === "Turn customer feedback into product improvements."
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: "Customer insights" })).toBeVisible();
  await expect(
    page.getByText("Turn customer feedback into product improvements.")
  ).toBeVisible();
});

test("shows an AI reply without changing the board", async ({ page }) => {
  let chatRequest: { question: string; history: unknown[] } | undefined;
  await page.route("**/api/users/demo-user/chat", async (route) => {
    chatRequest = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "There are five columns." }),
    });
  });

  await signIn(page);
  await openAssistant(page);
  await page.getByLabel("Ask the assistant").fill("How many columns are there?");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("There are five columns.")).toBeVisible();
  expect(chatRequest).toEqual({
    question: "How many columns are there?",
    history: [],
  });
  await expectBoardStored(page, (board) =>
    board.columns[0]?.title === initialData.columns[0]?.title &&
      board.cards["card-1"]?.title === initialData.cards["card-1"]?.title &&
      Object.keys(board.cards).length === Object.keys(initialData.cards).length
  );
});

test("applies and persists a board update returned by AI chat", async ({ page }) => {
  const updatedBoard = structuredClone(initialData);
  updatedBoard.cards["card-1"].title = "Updated by the assistant";
  await page.route("**/api/users/demo-user/chat", async (route) => {
    // Like the real chat API, save the update before replying.
    await page.request.put("/api/users/demo-user/board", { data: updatedBoard });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "I renamed the task.",
        board: updatedBoard,
      }),
    });
  });

  await signIn(page);
  await openAssistant(page);
  await page.getByLabel("Ask the assistant").fill("Rename the first task.");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("I renamed the task.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Updated by the assistant" })
  ).toBeVisible();
  await expectBoardStored(page, (board) =>
    board.cards["card-1"]?.title === "Updated by the assistant"
  );
});

test("keeps the narrow chat panel in page flow so the board stays usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await openAssistant(page);
  await expect(page.getByRole("complementary", { name: "AI assistant" })).toBeVisible();

  const backlog = page.getByTestId("column-col-backlog");
  await backlog.getByRole("button", { name: /add a card/i }).click();
  await backlog.getByPlaceholder("Card title").fill("Board stays usable");
  await backlog.getByRole("button", { name: /add card/i }).click();
  await expect(backlog.getByText("Board stays usable")).toBeVisible();
});

test("keeps the board full-width and places chat below it on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await signIn(page);

  const openChat = page.getByRole("button", { name: /open chat/i });
  await expect(openChat).toBeVisible();
  await openChat.click();
  const sidebar = page.getByRole("complementary", { name: "AI assistant" });
  await expect(sidebar).toBeVisible();
  await expect(page.getByLabel("Ask the assistant")).toBeVisible();

  const reviewBox = await page.getByTestId("column-col-review").boundingBox();
  const sidebarBox = await sidebar.boundingBox();
  if (!reviewBox || !sidebarBox) {
    throw new Error("Unable to resolve the desktop board and sidebar positions.");
  }
  expect(sidebarBox.y).toBeGreaterThan(reviewBox.y + reviewBox.height);
  expect(reviewBox.width).toBeGreaterThanOrEqual(220);
});

test("adds a card to a column", async ({ page }) => {
  await signIn(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Playwright card");
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  await firstColumn.getByLabel("Priority").selectOption("high");
  await firstColumn.getByLabel("Due date").fill("2027-03-12");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Playwright card")).toBeVisible();
  await expectBoardStored(page, (board) =>
    Object.values(board.cards).some(
      (card) =>
        card.title === "Playwright card" &&
        card.priority === "high" &&
        card.dueDate === "2027-03-12"
    )
  );
});

test("persists column renames and card deletion", async ({ page }) => {
  await signIn(page);
  const backlog = page.getByTestId("column-col-backlog");
  await backlog.getByLabel("Column title").fill("Ready to start");
  await expectBoardStored(page, (board) =>
    board.columns[0]?.title === "Ready to start"
  );

  await backlog
    .getByTestId("card-card-1")
    .getByRole("button", { name: "Delete Align roadmap themes" })
    .click();
  await expectBoardStored(page, (board) =>
    !Object.hasOwn(board.cards, "card-1") &&
      board.columns.every((column) => !column.cardIds.includes("card-1"))
  );
});

test("edits card text and restores the arrow cursor on press", async ({ page }) => {
  await signIn(page);
  const card = page.getByTestId("card-card-1");
  const title = card.getByRole("button", {
    name: "Edit title: Align roadmap themes",
  });
  const titleBox = await title.boundingBox();
  if (!titleBox) {
    throw new Error("Unable to resolve card title coordinates.");
  }

  await expect(title).toHaveCSS("cursor", "text");
  await page.mouse.move(titleBox.x + titleBox.width / 2, titleBox.y + titleBox.height / 2);
  await page.mouse.down();
  await expect(title).toHaveCSS("cursor", "default");
  await page.mouse.up();

  const titleInput = page.getByLabel("Card title");
  await titleInput.fill("Updated roadmap themes");
  await titleInput.press("Enter");

  await card.getByRole("button", { name: "Edit details: Updated roadmap themes" }).click();
  const detailsInput = page.getByLabel("Card details");
  await detailsInput.fill("Updated with Playwright.");
  await detailsInput.press("Enter");

  await card.getByRole("button", { name: "Edit title: Updated roadmap themes" }).click();
  await card.getByLabel("Card priority").selectOption("medium");
  await card.getByLabel("Due date").fill("2027-03-12");
  await card.getByRole("button", { name: "Save" }).click();

  await expect(card.getByRole("heading", { name: "Updated roadmap themes" })).toBeVisible();
  await expect(card.getByText("Updated with Playwright.")).toBeVisible();
  await expect(card.getByText("medium priority")).toBeVisible();
  await expect(card.getByText("Due Mar 12, 2027")).toBeVisible();
  await expectBoardStored(page, (board) =>
    board.cards["card-1"]?.title === "Updated roadmap themes" &&
      board.cards["card-1"]?.details === "Updated with Playwright." &&
      board.cards["card-1"]?.priority === "medium" &&
      board.cards["card-1"]?.dueDate === "2027-03-12"
  );
});

test("moves a card between columns", async ({ page }) => {
  await signIn(page);
  const card = page.getByTestId("card-card-1");
  const sourceColumn = page.getByTestId("column-col-backlog");
  const targetColumn = page.getByTestId("column-col-review");
  const cardBox = await card.boundingBox();
  const columnBox = await targetColumn.boundingBox();
  if (!cardBox || !columnBox) {
    throw new Error("Unable to resolve drag coordinates.");
  }

  await page.mouse.move(
    cardBox.x + cardBox.width / 2,
    cardBox.y + cardBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    columnBox.x + columnBox.width / 2,
    columnBox.y + 120,
    { steps: 12 }
  );
  await expect(targetColumn.getByTestId("card-card-1")).toBeVisible();
  await expect(sourceColumn.getByTestId("card-card-1")).toHaveCount(0);
  await expect(targetColumn.getByTestId("card-card-1")).toHaveCSS("scale", "0.98");
  await expect(
    targetColumn
      .getByTestId("card-card-1")
      .getByRole("button", { name: "Edit title: Align roadmap themes" })
  ).toHaveCSS("cursor", "default");
  const dragOverlay = page.getByTestId("drag-overlay-card-1");
  await expect(dragOverlay).toBeVisible();
  await page.mouse.up();
  await expect(targetColumn.getByTestId("card-card-1")).toBeVisible();
  await expect(dragOverlay).toBeVisible();
  await expect
    .poll(() =>
      dragOverlay.evaluate((element) => element.parentElement?.getAnimations().length ?? 0)
    )
    .toBeGreaterThan(0);
  await expect(targetColumn.getByTestId("card-card-1")).toHaveCSS(
    "transition-duration",
    "0.3s"
  );
  await expect
    .poll(() =>
      targetColumn
        .getByTestId("card-card-1")
        .evaluate((element) => element.getAnimations().length)
    )
    .toBeGreaterThan(0);
  await expect(dragOverlay).toBeHidden();
  await expect(targetColumn.getByTestId("card-card-1")).toHaveCSS("opacity", "1");
  await expect(targetColumn.getByTestId("card-card-1")).toHaveCSS("scale", "none");
  await expectBoardStored(page, (board) =>
    board.columns.find((column) => column.id === "col-review")?.cardIds.includes("card-1") === true
  );
});

test("uses a subtle pattern on the oat beige columns", async ({ page }) => {
  await signIn(page);
  const column = page.locator('[data-testid^="column-"]').first();
  const backgroundImage = await column.evaluate(
    (element) => getComputedStyle(element).backgroundImage
  );

  expect(backgroundImage).toContain("radial-gradient");
  await expect(column).toHaveCSS("background-size", "32px 32px");
});
