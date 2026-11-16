"""The UnderCover backend."""

import json
import sqlite3
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from backend.db import DATA, connect, db_path
from backend.models import Claim, ClaimSummary, Customer, Policy, PolicyWording
from backend.seed import seed

COMPANY = json.loads((DATA / "company.json").read_text(encoding="utf-8"))


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
