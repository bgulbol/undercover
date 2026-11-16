export type Status =
  "waiting" | "in_progress" | "waiting_for_sign_off" | "decided";
export type Decision = "approve" | "decline" | "refer";
export type StepKind = "message" | "tool_call" | "tool_result";

export interface ClaimSummary {
  claim_id: string;
  customer_name: string;
  claim_type: string;
  summary: string;
  submitted_on: string;
  amount_claimed: number;
  status: Status;
  decision: Decision | null;
  payout: number | null;
}

export interface Item {
  description: string;
  category: string;
  amount: number;
}

export interface ClaimDocument {
  name: string;
  type: string;
  content: string;
}

export interface Claim {
  claim_id: string;
  policy_id: string;
  customer_id: string;
  claim_type: string;
  submitted_on: string;
  incident_date: string;
  incident_location: string;
  summary: string;
  story: string;
  items: Item[];
  amount_claimed: number;
  documents: ClaimDocument[];
  status: Status;
  thread_id: string | null;
  decision: Decision | null;
  payout: number | null;
  reason: string | null;
  policy_section: string | null;
  decided_at: string | null;
  paid_amount: number | null;
  paid_at: string | null;
}

export interface Policy {
  policy_id: string;
  customer_id: string;
  plan: string;
  add_ons: string[];
  purchased_on: string;
  sold_through: string;
  trip: {
    destination: string;
    departs_on: string;
    returns_on: string;
    trip_cost: number;
  };
  travelers: string[];
  status: string;
}

export interface PreviousClaim {
  claim_id: string;
  filed_on: string;
  incident_date: string;
  claim_type: string;
  summary: string;
  outcome: string;
  amount_paid: number;
}

export interface Customer {
  customer_id: string;
  name: string;
  customer_since: string;
  previous_claims: PreviousClaim[];
}

export interface Step {
  step_id: number;
  claim_id: string;
  thread_id: string;
  kind: StepKind;
  name: string;
  content: string;
  created_at: string;
}

export interface Instructions {
  text: string;
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`/api${path}`);
  if (!response.ok) {
    throw new Error(`${path} returned ${String(response.status)}`);
  }
  return (await response.json()) as T;
}

export function listClaims() {
  return get<ClaimSummary[]>("/claims");
}

export function getClaim(claimId: string) {
  return get<Claim>(`/claims/${claimId}`);
}

export function getPolicy(policyId: string) {
  return get<Policy>(`/policies/${policyId}`);
}

export function getCustomer(customerId: string) {
  return get<Customer>(`/customers/${customerId}`);
}

export function listSteps(claimId: string) {
  return get<Step[]>(`/claims/${claimId}/steps`);
}

export function getInstructions() {
  return get<Instructions>("/instructions");
}
