import pytest


def start(client, claim_id="CLM-1001", thread_id="thread-1"):
    return client.post(f"/api/claims/{claim_id}/start", json={"thread_id": thread_id})


def decide(client, decision="approve", payout=420.0, claim_id="CLM-1001"):
    return client.post(
        f"/api/claims/{claim_id}/decision",
        json={
            "decision": decision,
            "payout": payout,
            "reason": "The delay was covered. The costs are within the limit.",
            "policy_section": "Section 3, Trip Delay",
        },
    )


def pay(client, amount, claim_id="CLM-1001"):
    return client.post(f"/api/claims/{claim_id}/payment", json={"amount": amount})


def add_step(client, thread_id, content, claim_id="CLM-1001"):
    return client.post(
        f"/api/claims/{claim_id}/steps",
        json={
            "thread_id": thread_id,
            "kind": "tool_call",
            "name": "get_claim",
            "content": content,
        },
    )


def test_start_claim(client):
    claim = start(client).json()
    assert claim["status"] == "in_progress"
    assert claim["thread_id"] == "thread-1"


def test_start_again_with_a_new_thread(client):
    start(client)
    claim = start(client, thread_id="thread-2").json()
    assert claim["status"] == "in_progress"
    assert claim["thread_id"] == "thread-2"


@pytest.mark.parametrize("payout", [420.0, 1150.0])
def test_a_decided_claim_cannot_be_started(client, payout):
    start(client)
    decide(client, payout=payout)
    response = start(client, thread_id="thread-2")
    assert response.status_code == 409


def test_a_decision_needs_the_claim_in_progress(client):
    response = decide(client)
    assert response.status_code == 409
    assert response.json()["detail"] == "Claim CLM-1001 is waiting"


def test_an_approval_needs_a_payout(client):
    start(client)
    assert decide(client, payout=0).status_code == 422


@pytest.mark.parametrize("decision", ["decline", "refer"])
def test_a_decline_or_referral_pays_nothing(client, decision):
    start(client)
    assert decide(client, decision=decision, payout=50).status_code == 422
    claim = decide(client, decision=decision, payout=0).json()
    assert claim["status"] == "decided"
    assert claim["decision"] == decision
    assert claim["payout"] == 0


@pytest.mark.parametrize(
    ("payout", "status"),
    [
        (420.0, "decided"),
        (1000.0, "decided"),
        (1000.01, "waiting_for_sign_off"),
    ],
)
def test_the_status_follows_the_approval_limit(client, payout, status):
    start(client)
    claim = decide(client, payout=payout).json()
    assert claim["status"] == status
    assert claim["decision"] == "approve"
    assert claim["payout"] == payout
    assert claim["reason"].startswith("The delay was covered")
    assert claim["policy_section"] == "Section 3, Trip Delay"
    assert claim["decided_at"]


def test_the_limit_applies_to_the_payout_in_cents(client):
    start(client)
    claim = decide(client, payout=1000.004).json()
    assert claim["payout"] == 1000.0
    assert claim["status"] == "decided"
    assert pay(client, 1000.0).json()["paid_amount"] == 1000.0


def test_pay_an_approval_within_the_limit(client):
    start(client)
    decide(client, payout=420.0)
    claim = pay(client, 420.0).json()
    assert claim["paid_amount"] == 420.0
    assert claim["paid_at"]
    assert claim["status"] == "decided"


def test_pay_exactly_the_limit(client):
    start(client)
    decide(client, payout=1000.0)
    assert pay(client, 1000.0).json()["paid_amount"] == 1000.0


def test_a_claim_is_paid_only_once(client):
    start(client)
    decide(client, payout=420.0)
    pay(client, 420.0)
    response = pay(client, 420.0)
    assert response.status_code == 409
    assert response.json()["detail"] == "Claim CLM-1001 is already paid"


def test_the_amount_must_be_the_approved_payout(client):
    start(client)
    decide(client, payout=420.0)
    response = pay(client, 400.0)
    assert response.status_code == 409
    assert response.json()["detail"] == (
        "The amount must be the approved payout of $420.00"
    )


@pytest.mark.parametrize("decision", ["decline", "refer"])
def test_only_an_approval_is_paid(client, decision):
    start(client)
    decide(client, decision=decision, payout=0)
    assert pay(client, 100.0).status_code == 409


def test_an_unstarted_claim_cannot_be_paid(client):
    assert pay(client, 100.0).status_code == 409


def test_a_payment_over_the_limit_waits_for_sign_off(client):
    start(client, claim_id="CLM-1002")
    decide(client, payout=1150.0, claim_id="CLM-1002")
    response = pay(client, 1150.0, claim_id="CLM-1002")
    assert response.status_code == 403
    assert "needs a handler's sign-off" in response.json()["detail"]
    claim = client.get("/api/claims/CLM-1002").json()
    assert claim["paid_amount"] is None
    assert claim["status"] == "waiting_for_sign_off"


@pytest.mark.parametrize("amount", [500.0, 1000.0])
def test_an_approval_over_the_limit_cannot_be_paid_in_part(client, amount):
    start(client, claim_id="CLM-1002")
    decide(client, payout=1150.0, claim_id="CLM-1002")
    assert pay(client, amount, claim_id="CLM-1002").status_code == 409
    assert client.get("/api/claims/CLM-1002").json()["paid_amount"] is None


def test_steps_come_back_in_order(client):
    start(client)
    for content in ("first", "second", "third"):
        step = add_step(client, "thread-1", content).json()
        assert step["claim_id"] == "CLM-1001"
        assert step["created_at"]
    steps = client.get("/api/claims/CLM-1001/steps").json()
    assert [step["content"] for step in steps] == ["first", "second", "third"]
    assert steps[0]["kind"] == "tool_call"
    assert steps[0]["name"] == "get_claim"


def test_steps_are_from_the_latest_run(client):
    start(client)
    add_step(client, "thread-1", "old run")
    start(client, thread_id="thread-2")
    add_step(client, "thread-2", "new run")
    steps = client.get("/api/claims/CLM-1001/steps").json()
    assert [step["content"] for step in steps] == ["new run"]


def test_a_waiting_claim_has_no_steps(client):
    assert client.get("/api/claims/CLM-1001/steps").json() == []


def test_steps_need_a_claim(client):
    assert add_step(client, "thread-1", "lost", claim_id="CLM-9999").status_code == 404
