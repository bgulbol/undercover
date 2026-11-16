"""Work the claims queue: uv run -m agent, or uv run -m agent CLM-1001 CLM-1002"""

import sys
from uuid import uuid4

from agent.main import api, run


def waiting_claims() -> list[str]:
    """Return the ids of the claims waiting in the queue."""
    claims = api("GET", "/api/claims")
    return [claim["claim_id"] for claim in claims if claim["status"] == "waiting"]


def main(claim_ids: list[str]) -> None:
    """Work the claims given, or every waiting claim, printing each decision."""
    for claim_id in claim_ids or waiting_claims():
        run(claim_id, f"{claim_id}-{uuid4().hex[:8]}")
        claim = api("GET", f"/api/claims/{claim_id}")
        print(
            f"{claim_id}: {claim['decision'] or 'no decision'}, "
            f"${claim['payout'] or 0:,.2f}, {claim['status'].replace('_', ' ')}"
        )


if __name__ == "__main__":
    main(sys.argv[1:])
