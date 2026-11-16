import { useCallback } from "react";
import { listSteps, type Status, type Step } from "./api";
import { time } from "./format";
import { stepLabel, stepTone } from "./steps";
import { usePolling } from "./usePolling";

function StepItem({ step }: Readonly<{ step: Step }>) {
  return (
    <li className="step">
      <span className={`dot ${stepTone(step)}`} aria-hidden="true" />
      <div className="step-body">
        <div className="step-head">
          <strong>{stepLabel(step)}</strong>
          <span className="mono muted">{time(step.created_at)}</span>
        </div>
        {step.kind === "message" ? (
          <p className="step-message">{step.content}</p>
        ) : (
          <details>
            <summary>Details</summary>
            <pre className="step-detail">{step.content}</pre>
          </details>
        )}
      </div>
    </li>
  );
}

export function AgentSteps({
  claimId,
  status,
}: Readonly<{ claimId: string; status: Status }>) {
  const loadSteps = useCallback(() => listSteps(claimId), [claimId]);
  const { data: steps } = usePolling(loadSteps);

  return (
    <section className="panel" aria-label="The agent's steps">
      <h2>The agent's steps</h2>
      {status === "in_progress" && (
        <p className="muted">The agent is working on this claim.</p>
      )}
      {steps && steps.length > 0 ? (
        <ol className="steps">
          {steps.map((step) => (
            <StepItem key={step.step_id} step={step} />
          ))}
        </ol>
      ) : (
        <p className="muted">No steps yet.</p>
      )}
    </section>
  );
}
