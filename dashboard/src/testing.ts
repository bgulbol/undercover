import { vi } from "vitest";
import type { Claim, ClaimSummary } from "./api";

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
