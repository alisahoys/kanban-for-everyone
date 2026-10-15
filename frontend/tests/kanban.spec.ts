import { expect, test } from "@playwright/test";

test("loads the kanban board", async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().toLowerCase().includes("hydrated")) {
      hydrationErrors.push(message.text());
    }
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
  expect(hydrationErrors).toEqual([]);
});

test("adds a card to a column", async ({ page }) => {
  await page.goto("/");
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Playwright card");
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Playwright card")).toBeVisible();
});

test("moves a card between columns", async ({ page }) => {
  await page.goto("/");
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
  await page.mouse.up();
  await expect(targetColumn.getByTestId("card-card-1")).toBeVisible();
  const dragOverlay = page.getByTestId("drag-overlay-card-1");
  await expect(dragOverlay).toBeVisible();
  await expect
    .poll(() =>
      dragOverlay.evaluate((element) => element.parentElement?.getAnimations().length ?? 0)
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      targetColumn
        .getByTestId("card-card-1")
        .evaluate((element) => getComputedStyle(element).opacity)
    )
    .toBe("0");
  await expect(dragOverlay).toBeHidden();
  await expect(targetColumn.getByTestId("card-card-1")).toHaveCSS("opacity", "1");
});
