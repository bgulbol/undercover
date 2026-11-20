import pytest
from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage, BaseMessage, SystemMessage
from pydantic import Field, SecretStr

from agent import main
from backend.main import INSTRUCTIONS, app


class StubModel(GenericFakeChatModel):
    """A chat model that gives scripted replies in place of a real model."""

    seen: list[list[BaseMessage]] = Field(default_factory=list)

    def bind_tools(self, tools, **kwargs):
        return self

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        self.seen.append(messages)
        return super()._generate(messages, stop, run_manager, **kwargs)


def calls(*tool_calls, say=""):
    """A scripted reply from the model that calls these tools."""
    return AIMessage(
        content=say,
        tool_calls=[
            {"name": name, "args": args, "id": f"call-{index}"}
            for index, (name, args) in enumerate(tool_calls)
        ],
    )


def stub(*replies):
    return StubModel(messages=iter(replies))


READ_CLAIM_1001 = calls(
    ("get_claim", {"claim_id": "CLM-1001"}),
    ("get_policy", {"policy_id": "POL-2001"}),
    ("get_customer", {"customer_id": "CUS-3001"}),
    ("get_policy_wording", {}),
    say="I'll read the claim first.",
)


def decision(claim_id, payout):
    return calls(
        (
            "record_decision",
            {
                "claim_id": claim_id,
                "decision": "approve",
                "payout": payout,
                "reason": "The loss is covered. The amount is within the limits.",
                "policy_section": "Section 3, Trip Delay",
            },
        )
    )


def test_tools_match_the_api():
    operations = {
        operation["operationId"]: operation["description"]
        for path in app.openapi()["paths"].values()
        for operation in path.values()
    }
    for agent_tool in main.TOOLS:
        assert agent_tool.description == operations[agent_tool.name]


def test_run_approves_and_pays_a_claim_within_the_limit(client):
    reply = main.run(
        "CLM-1001",
        "thread-1",
        stub(
            READ_CLAIM_1001,
            decision("CLM-1001", 420.0),
            calls(("pay_claim", {"claim_id": "CLM-1001", "amount": 420.0})),
            AIMessage(content="Approved CLM-1001 for $420.00."),
        ),
    )
    assert reply == "Approved CLM-1001 for $420.00."
    claim = client.get("/api/claims/CLM-1001").json()
    assert claim["status"] == "decided"
    assert claim["decision"] == "approve"
    assert claim["paid_amount"] == 420.0
    assert claim["thread_id"] == "thread-1"
    steps = client.get("/api/claims/CLM-1001/steps").json()
    named = [(step["kind"], step["name"]) for step in steps]
    reads = ["get_claim", "get_policy", "get_customer", "get_policy_wording"]
    assert named[:5] == [("message", "")] + [("tool_call", name) for name in reads]
    # The four reads run in parallel, so their results come back in any order.
    assert sorted(named[5:9]) == sorted(("tool_result", name) for name in reads)
    assert named[9:] == [
        ("tool_call", "record_decision"),
        ("tool_result", "record_decision"),
        ("tool_call", "pay_claim"),
        ("tool_result", "pay_claim"),
        ("message", ""),
    ]
    results = {step["name"]: step["content"] for step in steps[5:9]}
    assert results["get_policy_wording"].startswith("Policy wording version 2026.1")
    assert steps[1]["content"] == '{"claim_id": "CLM-1001"}'
    assert steps[-1]["content"] == "Approved CLM-1001 for $420.00."


def test_run_cannot_pay_over_the_limit(client):
    main.run(
        "CLM-1002",
        "thread-1",
        stub(
            decision("CLM-1002", 1150.0),
            calls(("pay_claim", {"claim_id": "CLM-1002", "amount": 1150.0})),
            AIMessage(content="Approved for $1,150.00, waiting for sign-off."),
        ),
    )
    claim = client.get("/api/claims/CLM-1002").json()
    assert claim["status"] == "waiting_for_sign_off"
    assert claim["paid_amount"] is None
    payment = client.get("/api/claims/CLM-1002/steps").json()[3]
    assert payment["kind"] == "tool_result"
    assert payment["name"] == "pay_claim"
    assert payment["content"].startswith("Refused (403): ")
    assert "needs a handler's sign-off" in payment["content"]


def test_run_uses_the_instructions_from_the_backend(client):
    instructions = INSTRUCTIONS.read_text(encoding="utf-8")
    assert client.get("/api/instructions").json() == {"text": instructions}
    model = stub(AIMessage(content="Done."))
    main.run("CLM-1001", "thread-1", model)
    system, user = model.seen[0]
    assert isinstance(system, SystemMessage)
    assert system.text == instructions
    assert user.text == "Please decide claim CLM-1001."


def test_run_will_not_start_a_decided_claim(client):
    main.run("CLM-1001", "thread-1", stub(decision("CLM-1001", 420.0), AIMessage("")))
    with pytest.raises(Exception, match="409 Conflict"):
        main.run("CLM-1001", "thread-2", stub(AIMessage(content="Again.")))


def test_model_name(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.delenv("MODEL_BASE_URL", raising=False)
    monkeypatch.delenv("MODEL_NAME", raising=False)
    assert main.model().model_name == "openai/gpt-6-luna"
    monkeypatch.setenv("MODEL_NAME", "openrouter/free")
    assert main.model().model_name == "openrouter/free"


def api_key(llm):
    """The key a chat model will send, as text."""
    key = llm.openai_api_key
    assert isinstance(key, SecretStr)
    return key.get_secret_value()


def test_model_on_another_server(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("MODEL_API_KEY", raising=False)
    monkeypatch.setenv("MODEL_BASE_URL", "http://localhost:11434/v1")
    monkeypatch.setenv("MODEL_NAME", "qwen3.5:4b")
    llm = main.model()
    assert llm.model_name == "qwen3.5:4b"
    assert llm.openai_api_base == "http://localhost:11434/v1"
    assert api_key(llm) == "none"
    monkeypatch.setenv("MODEL_API_KEY", "pod-key")
    assert api_key(main.model()) == "pod-key"


def test_model_on_another_server_needs_a_name(monkeypatch):
    monkeypatch.setenv("MODEL_BASE_URL", "http://localhost:11434/v1")
    monkeypatch.delenv("MODEL_NAME", raising=False)
    with pytest.raises(RuntimeError, match="MODEL_NAME"):
        main.model()
