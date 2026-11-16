"""The UnderCover Agent."""

import json
import os
from typing import Any, Literal

import httpx
from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, ToolMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

load_dotenv(override=True)

BACKEND_URL = "http://localhost:8000"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = "openai/gpt-6-luna"


def backend() -> httpx.Client:
    """Return a client for the UnderCover backend."""
    return httpx.Client(base_url=BACKEND_URL, timeout=30)


def request(method: str, path: str, body: dict[str, Any] | None) -> httpx.Response:
    """Send one request to the backend."""
    with backend() as client:
        return client.request(method, path, json=body)


def api(method: str, path: str, body: dict[str, Any] | None = None) -> Any:
    """Call the backend for the harness, raising on any error."""
    response = request(method, path, body)
    response.raise_for_status()
    return response.json()


def call(method: str, path: str, body: dict[str, Any] | None = None) -> str:
    """Call the backend for a tool, giving a refusal back to the model as text."""
    response = request(method, path, body)
    if response.is_client_error:
        return f"Refused ({response.status_code}): {response.json()['detail']}"
    response.raise_for_status()
    return response.text


@tool
def get_claim(claim_id: str) -> str:
    """Get a claim in full: the story, items, documents and the decision."""
    return call("GET", f"/api/claims/{claim_id}")


@tool
def get_policy(policy_id: str) -> str:
    """Get a policy: the plan, add-ons, trip and travelers."""
    return call("GET", f"/api/policies/{policy_id}")


@tool
def get_customer(customer_id: str) -> str:
    """Get a customer's name and claim history."""
    return call("GET", f"/api/customers/{customer_id}")


@tool
def get_policy_wording() -> str:
    """Get the policy wording, the contract that every decision follows."""
    wording = api("GET", "/api/policy-wording")
    return f"Policy wording version {wording['version']}\n\n{wording['text']}"


@tool
def record_decision(
    claim_id: str,
    decision: Literal["approve", "decline", "refer"],
    payout: float,
    reason: str,
    policy_section: str,
) -> str:
    """Approve, decline or refer a claim in progress, with the payout and the reason."""
    return call(
        "POST",
        f"/api/claims/{claim_id}/decision",
        {
            "decision": decision,
            "payout": payout,
            "reason": reason,
            "policy_section": policy_section,
        },
    )


@tool
def pay_claim(claim_id: str, amount: float) -> str:
    """Pay an approved claim; over $1,000 is blocked until a handler signs off."""
    return call("POST", f"/api/claims/{claim_id}/payment", {"amount": amount})


TOOLS = [
    get_claim,
    get_policy,
    get_customer,
    get_policy_wording,
    record_decision,
    pay_claim,
]


def model() -> ChatOpenAI:
    """Return the model named in MODEL_NAME, or GPT-6 Luna by default."""
    name = os.getenv("MODEL_NAME")
    return ChatOpenAI(
        model=name or DEFAULT_MODEL,
        base_url=OPENROUTER_BASE_URL,
        api_key=SecretStr(os.environ["OPENROUTER_API_KEY"]),
        reasoning_effort=None if name else "low",
    )


def steps(message: BaseMessage) -> list[dict[str, str]]:
    """Turn one of the agent's messages into the steps the dashboard shows."""
    if isinstance(message, ToolMessage):
        return [
            {"kind": "tool_result", "name": message.name or "", "content": message.text}
        ]
    if isinstance(message, AIMessage):
        said = [{"kind": "message", "name": "", "content": message.text}]
        return (said if message.text else []) + [
            {
                "kind": "tool_call",
                "name": tool_call["name"],
                "content": json.dumps(tool_call["args"]),
            }
            for tool_call in message.tool_calls
        ]
    return []


def record(claim_id: str, thread_id: str, update: dict[str, Any]) -> str:
    """Post the steps in one update from the agent, and return what it last said."""
    said = ""
    for node in update.values():
        for message in node["messages"]:
            for step in steps(message):
                api(
                    "POST",
                    f"/api/claims/{claim_id}/steps",
                    {"thread_id": thread_id, **step},
                )
            if isinstance(message, AIMessage):
                said = message.text
    return said


def run(claim_id: str, thread_id: str, llm: BaseChatModel | None = None) -> str:
    """Work one claim, recording each step as it happens, and return the final reply."""
    api("POST", f"/api/claims/{claim_id}/start", {"thread_id": thread_id})
    instructions = api("GET", "/api/instructions")["text"]
    agent = create_agent(llm or model(), tools=TOOLS, system_prompt=instructions)
    reply = ""
    for update in agent.stream(
        {"messages": [{"role": "user", "content": f"Please decide claim {claim_id}."}]},
        config={"configurable": {"thread_id": thread_id}},
        stream_mode="updates",
    ):
        reply = record(claim_id, thread_id, update) or reply
    return reply
