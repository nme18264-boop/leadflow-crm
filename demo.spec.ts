import { test, expect } from "@playwright/test";
test("isolated demo supports create, search, edit, filter, delete, reset and exit", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good things start here." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore the demo" }).click();
  await expect(page.getByText("Demo mode", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Add lead", exact: true }).click();
  await page.getByLabel("Full name").fill("Test Client");
  await page.getByLabel("Email", { exact: true }).fill("test@example.com");
  await page.getByLabel("Company", { exact: true }).fill("Test Studio");
  await page.getByLabel("Notes", { exact: true }).fill("A useful note");
  await page.getByRole("button", { name: "Create lead", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("searchbox").fill("Test Client");
  await expect(
    page.getByRole("button", { name: "Test Client", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit Test Client", exact: true })
    .click();
  await page.getByLabel("Status", { exact: true }).selectOption("Won");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "New", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No matching leads" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete Test Client", exact: true })
    .click();
  await page.getByRole("button", { name: "Keep lead", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Test Client", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete Test Client", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete lead", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Test Client", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Reset sample data", exact: true })
    .click();
  await page.getByRole("searchbox").fill("no-such-company");
  await expect(
    page.getByRole("heading", { name: "No matching leads" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open profile menu", exact: true })
    .click();
  await page
    .locator("#profile-panel")
    .getByRole("button", { name: "Exit demo", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Explore the demo" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore the demo" }).click();
  await expect(
    page.getByRole("button", { name: "Amara Okafor", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("dialogs, navigation and reload isolation", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the demo" }).click();
  await page.getByRole("button", { name: "Add lead", exact: true }).click();
  await page.getByLabel("Full name").fill("Unsaved");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  if (info.project.name === "android-size") {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .getByRole("button", { name: "All leads", exact: false })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Every lead. One place." }),
    ).toBeVisible();
  }
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Explore the demo" }),
  ).toBeVisible();
});
