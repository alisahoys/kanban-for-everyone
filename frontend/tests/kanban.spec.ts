import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
  expect(hydrationErrors).toEqual([]);
});

test("adds a card to a column", async ({ page }) => {
  await signIn(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Playwright card");
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Playwright card")).toBeVisible();
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

  await expect(card.getByRole("heading", { name: "Updated roadmap themes" })).toBeVisible();
  await expect(card.getByText("Updated with Playwright.")).toBeVisible();
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
