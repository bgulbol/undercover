import { vi } from "vitest";
import type { Claim, ClaimSummary, Customer, Policy, Step } from "./api";

/** Answer each `fetch` from these responses, keyed by path, or with a 404. */
export function stubApi(responses: Record<string, unknown>) {
  const fetch = vi.fn((path: string) => {
    if (!(path in responses)) {
      return Promise.resolve(new Response("{}", { status: 404 }));
    }
    return Promise.resolve(new Response(JSON.stringify(responses[path])));
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

export const SUMMARIES: ClaimSummary[] = [
  {
    claim_id: "CLM-1001",
    customer_name: "Maya Patel",
    claim_type: "trip_delay",
    summary: "Flight home canceled by the airline",
    submitted_on: "2026-06-24",
    amount_claimed: 420,
    status: "decided",
    decision: "approve",
    payout: 420,
  },
  {
    claim_id: "CLM-1002",
    customer_name: "Tom Becker",
    claim_type: "baggage",
    summary: "Suitcase lost on a connecting flight",
    submitted_on: "2026-07-02",
    amount_claimed: 1150,
    status: "waiting_for_sign_off",
    decision: "approve",
    payout: 1150,
  },
  {
    claim_id: "CLM-1003",
    customer_name: "Ana Ruiz",
    claim_type: "emergency_medical",
    summary: "Hospital visit abroad after a fall",
    submitted_on: "2026-07-10",
    amount_claimed: 3800,
    status: "waiting",
    decision: null,
    payout: null,
  },
];

export const CLAIM: Claim = {
  claim_id: "CLM-1001",
  policy_id: "POL-2001",
  customer_id: "CUS-3001",
  claim_type: "trip_delay",
  submitted_on: "2026-06-24",
  incident_date: "2026-06-18",
  incident_location: "Rome, Italy",
  summary: "Flight home canceled by the airline",
  story: "My flight home from Rome was canceled.",
  items: [
    {
      description: "Airport hotel, one night",
      category: "accommodation",
      amount: 245,
    },
  ],
  amount_claimed: 245,
  documents: [
    {
      name: "Hotel receipt",
      type: "receipt",
      content: "Hotel Aurelia. Total paid: $245.00.",
    },
  ],
  status: "waiting",
  thread_id: null,
  decision: null,
  payout: null,
  reason: null,
  policy_section: null,
  decided_at: null,
  paid_amount: null,
  paid_at: null,
};

export const POLICY: Policy = {
  policy_id: "POL-2001",
  customer_id: "CUS-3001",
  plan: "premium",
  add_ons: ["electronics_plus"],
  purchased_on: "2026-04-22",
  sold_through: "Meridian Air checkout",
  trip: {
    destination: "Rome, Italy",
    departs_on: "2026-06-10",
    returns_on: "2026-06-18",
    trip_cost: 3100,
  },
  travelers: ["Maya Patel"],
  status: "active",
};

export const CUSTOMER: Customer = {
  customer_id: "CUS-3001",
  name: "Maya Patel",
  customer_since: "2023-04-11",
  previous_claims: [
    {
      claim_id: "CLM-0412",
      filed_on: "2024-08-19",
      incident_date: "2024-08-09",
      claim_type: "baggage_delay",
      summary: "Checked bag arrived 30 hours late in Lisbon",
      outcome: "approved",
      amount_paid: 140,
    },
  ],
};

function step(
  step_id: number,
  kind: Step["kind"],
  name: string,
  content: string,
): Step {
  return {
    step_id,
    claim_id: "CLM-1001",
    thread_id: "thread-1",
    kind,
    name,
    content,
    created_at: "2026-11-16T15:04:05+00:00",
  };
}

export const STEPS: Step[] = [
  step(1, "tool_call", "get_claim", '{"claim_id": "CLM-1001"}'),
  step(2, "tool_result", "get_claim", '{"claim_id": "CLM-1001"}'),
  step(3, "tool_call", "pay_claim", '{"amount": 1150}'),
  step(4, "tool_result", "pay_claim", "Refused (403): needs a sign-off"),
  step(5, "message", "", "Approved for $1,150.00, waiting for sign-off."),
];

/** The API for CLM-1001, as `claim` and `steps` leave it. */
export function claimApi(claim: Claim, steps: Step[] = []) {
  return stubApi({
    "/api/claims/CLM-1001": claim,
    "/api/claims/CLM-1001/steps": steps,
    "/api/policies/POL-2001": POLICY,
    "/api/customers/CUS-3001": CUSTOMER,
  });
}
