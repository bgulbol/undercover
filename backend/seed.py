"""Reset the database to UnderCover's business data: uv run -m backend.seed"""

import json
from typing import Any

from backend.db import DATA, SCHEMA, connect

DROP = """
DROP TABLE IF EXISTS steps;
DROP TABLE IF EXISTS claims;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS policies;
"""


def load(name: str) -> list[dict[str, Any]]:
    """Read one of the JSON files in data/."""
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def submission(claim: dict[str, Any]) -> str:
    """Return what the customer submitted, without the queue's own status."""
    return json.dumps({key: value for key, value in claim.items() if key != "status"})


def seed() -> str:
    """Load the queue, the policies and the customers, replacing what was there."""
    claims = load("claims.json")
    policies = load("policies.json")
    customers = load("customers.json")
    with connect() as db:
        db.executescript(DROP + SCHEMA)
        db.executemany(
            "INSERT INTO policies VALUES (?, ?)",
            [(policy["policy_id"], json.dumps(policy)) for policy in policies],
        )
        db.executemany(
            "INSERT INTO customers VALUES (?, ?)",
            [(customer["customer_id"], json.dumps(customer)) for customer in customers],
        )
        db.executemany(
            "INSERT INTO claims (claim_id, record, status) VALUES (?, ?, 'waiting')",
            [(claim["claim_id"], submission(claim)) for claim in claims],
        )
    return (
        f"Loaded {len(claims)} claims, {len(policies)} policies "
        f"and {len(customers)} customers"
    )


if __name__ == "__main__":
    print(seed())
