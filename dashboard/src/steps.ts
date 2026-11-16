import type { Step } from "./api";
import { sentence, type Tone } from "./format";

interface ToolLabels {
  call: string;
  done: string;
  refused: string;
}

const TOOLS = new Map<string, ToolLabels>([
  [
    "get_claim",
    {
      call: "Reading the claim",
      done: "Read the claim",
      refused: "Could not read the claim",
    },
  ],
  [
    "get_policy",
    {
      call: "Reading the policy",
      done: "Read the policy",
      refused: "Could not read the policy",
    },
  ],
  [
    "get_customer",
    {
      call: "Reading the claim history",
      done: "Read the claim history",
      refused: "Could not read the claim history",
    },
  ],
  [
    "get_policy_wording",
    {
      call: "Reading the policy wording",
      done: "Read the policy wording",
      refused: "Could not read the policy wording",
    },
  ],
  [
    "record_decision",
    {
      call: "Recording the decision",
      done: "Recorded the decision",
      refused: "Decision refused",
    },
  ],
  [
    "pay_claim",
    {
      call: "Paying the claim",
      done: "Paid the claim",
      refused: "Payment refused",
    },
  ],
]);

export function isRefused(step: Step): boolean {
  return step.kind === "tool_result" && step.content.startsWith("Refused");
}

/** A plain label for a step, such as "Read the policy" or "Payment refused". */
export function stepLabel(step: Step): string {
  if (step.kind === "message") return "The agent";
  const labels = TOOLS.get(step.name);
  if (!labels) return sentence(step.name);
  if (step.kind === "tool_call") return labels.call;
  return isRefused(step) ? labels.refused : labels.done;
}

export function stepTone(step: Step): Tone {
  if (isRefused(step)) return "raspberry";
  if (step.kind === "message") return "cerulean";
  return step.kind === "tool_call" ? "marigold" : "sea-green";
}
