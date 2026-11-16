from agent import __main__ as cli


def fake_run(client, worked):
    """Stand in for the agent: approve each claim for $100.00 and note its id."""

    def run(claim_id, thread_id):
        worked.append(claim_id)
        client.post(f"/api/claims/{claim_id}/start", json={"thread_id": thread_id})
        client.post(
            f"/api/claims/{claim_id}/decision",
            json={
                "decision": "approve",
                "payout": 100.0,
                "reason": "Covered.",
                "policy_section": "Section 3, Trip Delay",
            },
        )
        return "Approved."

    return run


def test_works_every_waiting_claim(client, monkeypatch, capsys):
    client.post("/api/claims/CLM-1001/start", json={"thread_id": "earlier"})
    worked = []
    monkeypatch.setattr(cli, "run", fake_run(client, worked))
    cli.main([])
    assert len(worked) == 24
    assert "CLM-1001" not in worked
    assert capsys.readouterr().out.splitlines()[0] == (
        "CLM-1002: approve, $100.00, decided"
    )


def test_works_only_the_claims_given(client, monkeypatch, capsys):
    worked = []
    monkeypatch.setattr(cli, "run", fake_run(client, worked))
    cli.main(["CLM-1003", "CLM-1005"])
    assert worked == ["CLM-1003", "CLM-1005"]
    assert capsys.readouterr().out.splitlines() == [
        "CLM-1003: approve, $100.00, decided",
        "CLM-1005: approve, $100.00, decided",
    ]


def test_reports_a_claim_with_no_decision(client, monkeypatch, capsys):
    monkeypatch.setattr(cli, "run", lambda claim_id, thread_id: "")
    cli.main(["CLM-1004"])
    assert capsys.readouterr().out == "CLM-1004: no decision, $0.00, waiting\n"
