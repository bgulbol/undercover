import { expect, it } from "vitest";
import type { Step } from "./api";
import { stepLabel, stepTone } from "./steps";

function step(kind: Step["kind"], name: string, content = "{}"): Step {
  return {
    step_id: 1,
    claim_id: "CLM-1001",
    thread_id: "thread-1",
    kind,
    name,
    content,
    created_at: "2026-11-16T15:04:05+00:00",
  };
}

it("labels each tool's call and result in plain words", () => {
  const labels = [
    "get_claim",
    "get_policy",
    "get_customer",
    "get_policy_wording",
    "record_decision",
    "pay_claim",
  ].map((name) => [
    stepLabel(step("tool_call", name)),
    stepLabel(step("tool_result", name)),
  ]);
  expect(labels).toEqual([
    ["Reading the claim", "Read the claim"],
    ["Reading the policy", "Read the policy"],
    ["Reading the claim history", "Read the claim history"],
    ["Reading the policy wording", "Read the policy wording"],
    ["Recording the decision", "Recorded the decision"],
    ["Paying the claim", "Paid the claim"],
  ]);
});

it("labels a refusal", () => {
  const refused = (name: string) =>
    stepLabel(step("tool_result", name, "Refused (409): no"));
  expect(refused("pay_claim")).toBe("Payment refused");
  expect(refused("record_decision")).toBe("Decision refused");
  expect(refused("get_customer")).toBe("Could not read the claim history");
});

it("labels the agent's own words and an unknown tool", () => {
  expect(stepLabel(step("message", "", "Done."))).toBe("The agent");
  expect(stepLabel(step("tool_call", "check_weather"))).toBe("Check weather");
});

it("gives each kind of step its own color", () => {
  expect(stepTone(step("message", ""))).toBe("cerulean");
  expect(stepTone(step("tool_call", "get_claim"))).toBe("marigold");
  expect(stepTone(step("tool_result", "get_claim"))).toBe("sea-green");
  expect(stepTone(step("tool_result", "pay_claim", "Refused (403): no"))).toBe(
    "raspberry",
  );
});
