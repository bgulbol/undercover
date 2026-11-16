"""The shapes of the records the API reads and writes."""

from typing import Literal, Self

from pydantic import BaseModel, model_validator

Status = Literal["waiting", "in_progress", "waiting_for_sign_off", "decided"]
Decision = Literal["approve", "decline", "refer"]
StepKind = Literal["message", "tool_call", "tool_result"]


class Item(BaseModel):
    description: str
    category: str
    amount: float


class Document(BaseModel):
    name: str
    type: str
    content: str


class Claim(BaseModel):
    claim_id: str
    policy_id: str
    customer_id: str
    claim_type: str
    submitted_on: str
    incident_date: str
    incident_location: str
    summary: str
    story: str
    items: list[Item]
    amount_claimed: float
    documents: list[Document]
    status: Status
    thread_id: str | None
    decision: Decision | None
    payout: float | None
    reason: str | None
    policy_section: str | None
    decided_at: str | None
    paid_amount: float | None
    paid_at: str | None


class ClaimSummary(BaseModel):
    claim_id: str
    customer_name: str
    claim_type: str
    summary: str
    submitted_on: str
    amount_claimed: float
    status: Status
    decision: Decision | None
    payout: float | None


class Trip(BaseModel):
    destination: str
    departs_on: str
    returns_on: str
    trip_cost: float


class Policy(BaseModel):
    policy_id: str
    customer_id: str
    plan: str
    add_ons: list[str]
    purchased_on: str
    sold_through: str
    trip: Trip
    travelers: list[str]
    status: str


class PreviousClaim(BaseModel):
    claim_id: str
    filed_on: str
    incident_date: str
    claim_type: str
    summary: str
    outcome: str
    amount_paid: float


class Customer(BaseModel):
    customer_id: str
    name: str
    customer_since: str
    previous_claims: list[PreviousClaim]


class PolicyWording(BaseModel):
    version: str
    text: str


class Instructions(BaseModel):
    text: str


class StartRequest(BaseModel):
    thread_id: str


class StepRequest(BaseModel):
    thread_id: str
    kind: StepKind
    name: str
    content: str


class Step(StepRequest):
    step_id: int
    claim_id: str
    created_at: str


class DecisionRequest(BaseModel):
    decision: Decision
    payout: float
    reason: str
    policy_section: str

    @model_validator(mode="after")
    def payout_fits_decision(self) -> Self:
        """Only an approval pays, and it pays something."""
        if self.decision == "approve" and self.payout <= 0:
            raise ValueError("An approval needs a payout above zero")
        if self.decision != "approve" and self.payout != 0:
            raise ValueError("A decline or a referral has a payout of zero")
        return self


class PaymentRequest(BaseModel):
    amount: float
