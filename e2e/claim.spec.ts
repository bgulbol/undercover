import { expect, test, type APIRequestContext } from "@playwright/test";

// A stand-in for the agent: it drives the API the way the agent's tools do,
// posting each step, so these tests never call a model.
async function standInAgent(
  request: APIRequestContext,
  claimId: string,
  payout: number,
) {
  const thread_id = `e2e-${claimId}`;
  const step = (kind: string, name: string, content: string) =>
    request.post(`/api/claims/${claimId}/steps`, {
      data: { thread_id, kind, name, content },
    });

  await request.post(`/api/claims/${claimId}/start`, { data: { thread_id } });
  await step("tool_call", "get_claim", JSON.stringify({ claim_id: claimId }));
  await step("tool_result", "get_claim", "{}");
  await request.post(`/api/claims/${claimId}/decision`, {
    data: {
      decision: "approve",
      payout,
      reason: "The loss is covered. The receipts support the amount.",
      policy_section: "Section 5, Baggage and Personal Effects",
    },
  });
  await step("tool_call", "pay_claim", JSON.stringify({ amount: payout }));
  const payment = await request.post(`/api/claims/${claimId}/payment`, {
    data: { amount: payout },
  });
  const body = (await payment.json()) as { detail?: string };
  await step(
    "tool_result",
    "pay_claim",
    payment.ok()
      ? JSON.stringify(body)
      : `Refused (${String(payment.status())}): ${body.detail ?? ""}`,
  );
  return payment.status();
}

test("an approval over $1,000 waits for sign-off and is not paid", async ({
  page,
  request,
}) => {
  expect(await standInAgent(request, "CLM-1002", 1150)).toBe(403);
  await page.goto("/claims/CLM-1002");

  await expect(page.getByText("Waiting for sign-off")).toBeVisible();
  const decision = page.getByRole("region", { name: "Decision" });
  await expect(decision).toContainText("Approved");
  await expect(decision).toContainText("$1,150.00");
  await expect(decision).toContainText(
    "The loss is covered. The receipts support the amount.",
  );
  await expect(decision).toContainText(
    "Section 5, Baggage and Personal Effects",
  );
  await expect(decision).toContainText("Held until a handler signs off");

  const steps = page.getByRole("region", { name: "The agent's steps" });
  await expect(steps).toContainText("Read the claim");
  await expect(steps).toContainText("Payment refused");
  await steps.getByText("Details").last().click();
  await expect(steps).toContainText("needs a handler's sign-off");
});

test("an approval within the limit is decided and paid", async ({
  page,
  request,
}) => {
  expect(await standInAgent(request, "CLM-1004", 186)).toBe(200);
  await page.goto("/claims/CLM-1004");

  await expect(page.getByText("Decided", { exact: true })).toBeVisible();
  const decision = page.getByRole("region", { name: "Decision" });
  await expect(decision).toContainText("Approved");
  await expect(decision).toContainText(/Paid \$186\.00 on/);
  await expect(
    page.getByRole("region", { name: "The agent's steps" }),
  ).toContainText("Paid the claim");
});

test("a claim shows its policy and claim history", async ({ page }) => {
  await page.goto("/claims/CLM-1001");
  await expect(page.getByRole("region", { name: "Policy" })).toContainText(
    "Rome, Italy, Jun 10, 2026 to Jun 18, 2026",
  );
  await expect(
    page.getByRole("region", { name: "Claim history" }),
  ).toContainText("CLM-0412");
  await expect(page.getByRole("region", { name: "Documents" })).toContainText(
    "Meridian Air cancellation notice",
  );
});

test("the instructions are shown read only", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Instructions" }).click();
  await expect(
    page.getByRole("heading", { name: "The agent's instructions" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Instructions" }),
  ).toContainText("You are the UnderCover Agent.");
  await expect(page.getByRole("textbox")).toHaveCount(0);
});
