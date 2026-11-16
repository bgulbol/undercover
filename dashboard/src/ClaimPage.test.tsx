import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import type { Claim } from "./api";
import { ClaimPage } from "./ClaimPage";
import { CLAIM, claimApi, CUSTOMER, stubApi, STEPS } from "./testing";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderClaim() {
  render(
    <MemoryRouter initialEntries={["/claims/CLM-1001"]}>
      <Routes>
        <Route path="/claims/:claimId" element={<ClaimPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function panel(name: string) {
  return within(await screen.findByRole("region", { name }));
}

const DECIDED: Claim = {
  ...CLAIM,
  status: "decided",
  thread_id: "thread-1",
  decision: "approve",
  payout: 245,
  reason: "The delay was covered. The hotel is within the limit.",
  policy_section: "Section 3, Trip Delay",
  decided_at: "2026-11-16T15:04:05+00:00",
  paid_amount: 245,
  paid_at: "2026-11-16T15:04:09+00:00",
};

it("shows a waiting claim in full", async () => {
  claimApi(CLAIM);
  renderClaim();
  expect(
    await screen.findByRole("heading", { name: "Claim CLM-1001" }),
  ).toBeDefined();
  expect(screen.getAllByText("Waiting")).toHaveLength(1);
  expect(screen.getByText("Flight home canceled by the airline")).toBeDefined();

  const story = await panel("The claim");
  expect(
    story.getByText("My flight home from Rome was canceled."),
  ).toBeDefined();
  expect(story.getByText("Trip delay")).toBeDefined();
  expect(story.getByText("Jun 18, 2026, Rome, Italy")).toBeDefined();

  const items = await panel("Items claimed");
  expect(items.getByText("Airport hotel, one night")).toBeDefined();
  expect(items.getByText("Accommodation")).toBeDefined();
  expect(items.getAllByText("$245.00")).toHaveLength(2);

  const documents = await panel("Documents");
  expect(
    documents.getByRole("heading", { name: "Hotel receipt" }),
  ).toBeDefined();
  expect(
    documents.getByText("Hotel Aurelia. Total paid: $245.00."),
  ).toBeDefined();

  const decision = await panel("Decision");
  expect(
    decision.getByText("The agent has not started on this claim."),
  ).toBeDefined();
  expect(
    (await panel("The agent's steps")).getByText("No steps yet."),
  ).toBeDefined();
});

it("shows the policy and the claim history", async () => {
  claimApi(CLAIM);
  renderClaim();
  const policy = await panel("Policy");
  expect(await policy.findByText("Premium")).toBeDefined();
  expect(policy.getByText("Electronics Plus")).toBeDefined();
  expect(
    policy.getByText("Rome, Italy, Jun 10, 2026 to Jun 18, 2026"),
  ).toBeDefined();
  expect(policy.getByText("$3,100.00")).toBeDefined();
  expect(
    policy.getByText("Apr 22, 2026, through Meridian Air checkout"),
  ).toBeDefined();

  const history = await panel("Claim history");
  expect(
    await history.findByText("Maya Patel, a customer since Apr 11, 2023"),
  ).toBeDefined();
  expect(history.getByText("CLM-0412")).toBeDefined();
  expect(
    history.getByText(
      "Baggage delay: Checked bag arrived 30 hours late in Lisbon",
    ),
  ).toBeDefined();
  expect(history.getByText("$140.00")).toBeDefined();
});

it("says when a customer has no earlier claims", async () => {
  stubApi({
    "/api/claims/CLM-1001": CLAIM,
    "/api/claims/CLM-1001/steps": [],
    "/api/customers/CUS-3001": { ...CUSTOMER, previous_claims: [] },
  });
  renderClaim();
  const history = await panel("Claim history");
  expect(await history.findByText("No earlier claims.")).toBeDefined();
  expect((await panel("Policy")).getByText("Loading the policy")).toBeDefined();
});

it("shows the agent's steps while it works", async () => {
  claimApi({ ...CLAIM, status: "in_progress", thread_id: "thread-1" }, STEPS);
  renderClaim();
  const steps = await panel("The agent's steps");
  expect(await steps.findByText("Reading the claim")).toBeDefined();
  expect(steps.getByText("Read the claim")).toBeDefined();
  expect(steps.getByText("Paying the claim")).toBeDefined();
  expect(steps.getByText("Payment refused")).toBeDefined();
  expect(steps.getByText("Refused (403): needs a sign-off")).toBeDefined();
  expect(
    steps.getByText("Approved for $1,150.00, waiting for sign-off."),
  ).toBeDefined();
  expect(steps.getByText("The agent is working on this claim.")).toBeDefined();
  expect(steps.getAllByRole("listitem")).toHaveLength(5);
  expect(
    (await panel("Decision")).getByText("The agent is deciding this claim."),
  ).toBeDefined();
});

it("shows an approval held for sign-off", async () => {
  claimApi(
    {
      ...DECIDED,
      status: "waiting_for_sign_off",
      payout: 1150,
      paid_amount: null,
      paid_at: null,
    },
    STEPS,
  );
  renderClaim();
  const decision = await panel("Decision");
  expect(await decision.findByText("Approved")).toBeDefined();
  expect(decision.getByText("$1,150.00")).toBeDefined();
  expect(
    decision.getByText("The delay was covered. The hotel is within the limit."),
  ).toBeDefined();
  expect(decision.getByText("Section 3, Trip Delay")).toBeDefined();
  expect(decision.getByText("Held until a handler signs off")).toBeDefined();
  expect(screen.getByText("Waiting for sign-off")).toBeDefined();
});

it("shows an approval that is paid", async () => {
  claimApi(DECIDED);
  renderClaim();
  const decision = await panel("Decision");
  expect(
    await decision.findByText("Paid $245.00 on Nov 16, 2026"),
  ).toBeDefined();
});

it("shows an approval that is not paid", async () => {
  claimApi({ ...DECIDED, paid_amount: null, paid_at: null });
  renderClaim();
  expect(await (await panel("Decision")).findByText("Not paid")).toBeDefined();
});

it("shows a declined claim", async () => {
  claimApi({
    ...DECIDED,
    decision: "decline",
    payout: 0,
    paid_amount: null,
    paid_at: null,
  });
  renderClaim();
  const decision = await panel("Decision");
  expect(await decision.findByText("Declined")).toBeDefined();
  expect(decision.getByText("$0.00")).toBeDefined();
  expect(decision.getByText("No payment")).toBeDefined();
});
