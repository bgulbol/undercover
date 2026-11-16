import type { Decision, Status } from "./api";
import {
  DECISION_LABELS,
  DECISION_TONES,
  STATUS_LABELS,
  STATUS_TONES,
  type Tone,
} from "./format";

export function Badge({
  tone,
  label,
}: Readonly<{ tone: Tone; label: string }>) {
  return <span className={`badge ${tone}`}>{label}</span>;
}

export function StatusBadge({ status }: Readonly<{ status: Status }>) {
  return <Badge tone={STATUS_TONES[status]} label={STATUS_LABELS[status]} />;
}

export function DecisionBadge({ decision }: Readonly<{ decision: Decision }>) {
  return (
    <Badge tone={DECISION_TONES[decision]} label={DECISION_LABELS[decision]} />
  );
}
