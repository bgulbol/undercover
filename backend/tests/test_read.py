from backend.db import DATA


def test_list_claims(client):
    claims = client.get("/api/claims").json()
    assert len(claims) == 25
    assert claims[0]["claim_id"] == "CLM-1001"
    assert claims[-1]["claim_id"] == "CLM-1025"
    assert {claim["status"] for claim in claims} == {"waiting"}
    assert claims[0] == {
        "claim_id": "CLM-1001",
        "customer_name": "Maya Patel",
        "claim_type": "trip_delay",
        "summary": "Flight home canceled by the airline, rebooked the next morning",
        "submitted_on": "2026-06-24",
        "amount_claimed": 420.0,
        "status": "waiting",
        "decision": None,
        "payout": None,
    }


def test_get_claim(client):
    claim = client.get("/api/claims/CLM-1001").json()
    assert claim["policy_id"] == "POL-2001"
    assert claim["story"].startswith("My flight home from Rome")
    assert len(claim["items"]) == 3
    assert len(claim["documents"]) == 4
    assert claim["amount_claimed"] == 420.0
    assert claim["status"] == "waiting"
    assert claim["decision"] is None
    assert claim["paid_amount"] is None


def test_get_policy(client):
    policy = client.get("/api/policies/POL-2001").json()
    assert policy["plan"] == "premium"
    assert policy["trip"] == {
        "destination": "Rome, Italy",
        "departs_on": "2026-06-10",
        "returns_on": "2026-06-18",
        "trip_cost": 3100.0,
    }
    assert policy["travelers"] == ["Maya Patel"]


def test_get_customer_leaves_out_contact_details(client):
    customer = client.get("/api/customers/CUS-3001").json()
    assert customer["name"] == "Maya Patel"
    assert [claim["claim_id"] for claim in customer["previous_claims"]] == ["CLM-0412"]
    for field in ("email", "phone", "date_of_birth", "address"):
        assert field not in customer


def test_get_policy_wording(client):
    wording = client.get("/api/policy-wording").json()
    assert wording["version"] == "2026.1"
    assert wording["text"] == (DATA / "policy_wording.md").read_text(encoding="utf-8")


def test_unknown_ids_are_not_found(client):
    for path in (
        "/api/claims/CLM-9999",
        "/api/policies/POL-9999",
        "/api/customers/CUS-9999",
    ):
        response = client.get(path)
        assert response.status_code == 404
        assert "9999" in response.json()["detail"]
