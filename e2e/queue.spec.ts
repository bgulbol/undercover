import { expect, test } from "@playwright/test";

test("the queue lists every claim with its status", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Claims queue" }),
  ).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(26);
  await expect(page.getByRole("row", { name: /CLM-1001/ })).toContainText(
    "$420.00",
  );
});

test("a claim opens its own page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "CLM-1001" }).click();
  await expect(page).toHaveURL(/\/claims\/CLM-1001$/);
  await expect(
    page.getByRole("heading", { name: "Claim CLM-1001" }),
  ).toBeVisible();
});

test("the queue updates without a reload", async ({ page, request }) => {
  await page.goto("/");
  const row = page.getByRole("row", { name: /CLM-1025/ });
  await expect(row).toContainText("Waiting");
  await request.post("/api/claims/CLM-1025/start", {
    data: { thread_id: "e2e-queue" },
  });
  await expect(row).toContainText("In progress");
});
