"""The UnderCover backend."""

import json
import sqlite3
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI, HTTPException

from backend.db import DATA, connect, db_path
from backend.models import (
    Claim,
    ClaimSummary,
    Customer,
    DecisionRequest,
    PaymentRequest,
    Policy,
    PolicyWording,
    StartRequest,
    Step,
    StepRequest,
)
from backend.seed import seed

COMPANY = json.loads((DATA / "company.json").read_text(encoding="utf-8"))
APPROVAL_LIMIT: float = COMPANY["payout_approval_limit"]


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Seed the database the first time the backend starts."""
    if not db_path().exists():
        seed()
    yield


app = FastAPI(title="UnderCover", lifespan=lifespan)


def to_claim(row: sqlite3.Row) -> Claim:
    """Combine a claim's submission with where it stands."""
    workflow = dict(row)
    record = json.loads(workflow.pop("record"))
    return Claim.model_validate(record | workflow)


def fetch_claim(db: sqlite3.Connection, claim_id: str) -> Claim:
    """Return one claim, or a 404 if there is no such claim."""
    row = db.execute("SELECT * FROM claims WHERE claim_id = ?", (claim_id,)).fetchone()
    if row is None:
        raise HTTPException(404, f"There is no claim {claim_id}")
    return to_claim(row)


def now() -> str:
    """Return the time now, in UTC."""
    return datetime.now(UTC).isoformat(timespec="seconds")


def money(amount: float | None) -> str:
    """Format an amount in US dollars, such as $1,250.00."""
    return f"${amount or 0:,.2f}"


def check_payment(claim: Claim, amount: float) -> None:
    """Refuse a payment the claim's decision doesn't allow."""
    if claim.decision != "approve":
        raise HTTPException(409, f"Claim {claim.claim_id} is not approved")
    if claim.paid_amount is not None:
        raise HTTPException(409, f"Claim {claim.claim_id} is already paid")
    if amount > APPROVAL_LIMIT:
        raise HTTPException(
            403,
            f"A payout over {money(APPROVAL_LIMIT)} needs a handler's sign-off, "
            "so this payment is blocked until a handler signs off",
        )
    if amount != claim.payout:
        raise HTTPException(
            409, f"The amount must be the approved payout of {money(claim.payout)}"
        )


def fetch_record(query: str, record_id: str) -> str:
    """Return the JSON record that the query finds, or a 404."""
    with connect() as db:
        row = db.execute(query, (record_id,)).fetchone()
    if row is None:
        raise HTTPException(404, f"There is no record {record_id}")
    return row["record"]


@app.get("/api/health", operation_id="health")
def health() -> dict[str, str]:
    """Check that the backend is running."""
    return {"status": "ok"}


@app.get("/api/claims", operation_id="list_claims")
def list_claims() -> list[ClaimSummary]:
    """List every claim in the queue with where it stands."""
    with connect() as db:
        names = {
            row["customer_id"]: json.loads(row["record"])["name"]
            for row in db.execute("SELECT * FROM customers")
        }
        rows = db.execute("SELECT * FROM claims ORDER BY claim_id").fetchall()
    claims = [to_claim(row) for row in rows]
    return [
        ClaimSummary(**claim.model_dump(), customer_name=names[claim.customer_id])
        for claim in claims
    ]


@app.get("/api/claims/{claim_id}", operation_id="get_claim")
def get_claim(claim_id: str) -> Claim:
    """Get a claim in full: the story, items, documents and the decision."""
    with connect() as db:
        return fetch_claim(db, claim_id)


@app.get("/api/policies/{policy_id}", operation_id="get_policy")
def get_policy(policy_id: str) -> Policy:
    """Get a policy: the plan, add-ons, trip and travelers."""
    record = fetch_record("SELECT record FROM policies WHERE policy_id = ?", policy_id)
    return Policy.model_validate_json(record)


@app.get("/api/customers/{customer_id}", operation_id="get_customer")
def get_customer(customer_id: str) -> Customer:
    """Get a customer's name and claim history."""
    record = fetch_record(
        "SELECT record FROM customers WHERE customer_id = ?", customer_id
    )
    return Customer.model_validate_json(record)


@app.get("/api/policy-wording", operation_id="get_policy_wording")
def get_policy_wording() -> PolicyWording:
    """Get the policy wording, the contract that every decision follows."""
    return PolicyWording(
        version=COMPANY["policy_wording_version"],
        text=(DATA / "policy_wording.md").read_text(encoding="utf-8"),
    )


@app.post("/api/claims/{claim_id}/start", operation_id="start_claim")
def start_claim(claim_id: str, request: StartRequest) -> Claim:
    """Start work on a waiting claim, or start again on one in progress."""
    with connect() as db:
        claim = fetch_claim(db, claim_id)
        if claim.status not in ("waiting", "in_progress"):
            raise HTTPException(
                409, f"Claim {claim_id} is {claim.status.replace('_', ' ')}"
            )
        db.execute(
            "UPDATE claims SET status = 'in_progress', thread_id = ?"
            " WHERE claim_id = ?",
            (request.thread_id, claim_id),
        )
        return fetch_claim(db, claim_id)


@app.post("/api/claims/{claim_id}/steps", operation_id="add_step")
def add_step(claim_id: str, request: StepRequest) -> Step:
    """Record one step the agent took on a claim."""
    with connect() as db:
        fetch_claim(db, claim_id)
        row = db.execute(
            "INSERT INTO steps (claim_id, thread_id, kind, name, content, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?) RETURNING *",
            (
                claim_id,
                request.thread_id,
                request.kind,
                request.name,
                request.content,
                now(),
            ),
        ).fetchone()
    return Step(**dict(row))


@app.get("/api/claims/{claim_id}/steps", operation_id="list_steps")
def list_steps(claim_id: str) -> list[Step]:
    """List the agent's steps on a claim, from its latest run."""
    with connect() as db:
        claim = fetch_claim(db, claim_id)
        rows = db.execute(
            "SELECT * FROM steps WHERE claim_id = ? AND thread_id = ? ORDER BY step_id",
            (claim_id, claim.thread_id),
        ).fetchall()
    return [Step(**dict(row)) for row in rows]


@app.post("/api/claims/{claim_id}/decision", operation_id="record_decision")
def record_decision(claim_id: str, request: DecisionRequest) -> Claim:
    """Approve, decline or refer a claim in progress, with the payout and the reason."""
    with connect() as db:
        claim = fetch_claim(db, claim_id)
        if claim.status != "in_progress":
            raise HTTPException(
                409, f"Claim {claim_id} is {claim.status.replace('_', ' ')}"
            )
        over_limit = request.decision == "approve" and request.payout > APPROVAL_LIMIT
        db.execute(
            "UPDATE claims SET status = ?, decision = ?, payout = ?, reason = ?,"
            " policy_section = ?, decided_at = ? WHERE claim_id = ?",
            (
                "waiting_for_sign_off" if over_limit else "decided",
                request.decision,
                round(request.payout, 2),
                request.reason,
                request.policy_section,
                now(),
                claim_id,
            ),
        )
        return fetch_claim(db, claim_id)


@app.post("/api/claims/{claim_id}/payment", operation_id="pay_claim")
def pay_claim(claim_id: str, request: PaymentRequest) -> Claim:
    """Pay an approved claim; over $1,000 is blocked until a handler signs off."""
    amount = round(request.amount, 2)
    with connect() as db:
        check_payment(fetch_claim(db, claim_id), amount)
        db.execute(
            "UPDATE claims SET paid_amount = ?, paid_at = ? WHERE claim_id = ?",
            (amount, now(), claim_id),
        )
        return fetch_claim(db, claim_id)
