import { useCallback } from "react";
import { Link, useParams } from "react-router";
import { AgentSteps } from "./AgentSteps";
import { getClaim, type Claim } from "./api";
import { DecisionBadge, StatusBadge } from "./Badge";
import { date, money, sentence } from "./format";
import { HistoryPanel, PolicyPanel } from "./PolicyPanels";
import { usePolling } from "./usePolling";

function payment(claim: Claim): string {
  if (claim.paid_amount !== null && claim.paid_at !== null) {
    return `Paid ${money(claim.paid_amount)} on ${date(claim.paid_at)}`;
  }
  if (claim.status === "waiting_for_sign_off") {
    return "Held until a handler signs off";
  }
  return claim.decision === "approve" ? "Not paid" : "No payment";
}

function DecisionPanel({ claim }: Readonly<{ claim: Claim }>) {
  if (claim.decision === null) {
    return (
      <section className="panel" aria-label="Decision">
        <h2>Decision</h2>
        <p className="muted">
          {claim.status === "in_progress"
            ? "The agent is deciding this claim."
            : "The agent has not started on this claim."}
        </p>
      </section>
    );
  }

  return (
    <section className="panel" aria-label="Decision">
      <h2>Decision</h2>
      <div className="decision-head">
        <DecisionBadge decision={claim.decision} />
        <span className="payout">{money(claim.payout ?? 0)}</span>
      </div>
      <p>{claim.reason}</p>
      <dl className="facts">
        <dt>Policy wording</dt>
        <dd>{claim.policy_section}</dd>
        <dt>Payment</dt>
        <dd>{payment(claim)}</dd>
      </dl>
    </section>
  );
}

function StoryPanel({ claim }: Readonly<{ claim: Claim }>) {
  return (
    <section className="panel" aria-label="The claim">
      <h2>The customer's story</h2>
      <p>{claim.story}</p>
      <dl className="facts">
        <dt>Type</dt>
        <dd>{sentence(claim.claim_type)}</dd>
        <dt>Incident</dt>
        <dd>
          {date(claim.incident_date)}, {claim.incident_location}
        </dd>
        <dt>Submitted</dt>
        <dd>{date(claim.submitted_on)}</dd>
      </dl>
    </section>
  );
}

function ItemsPanel({ claim }: Readonly<{ claim: Claim }>) {
  return (
    <section className="panel table-scroll" aria-label="Items claimed">
      <h2>Items claimed</h2>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Category</th>
            <th className="number">Amount</th>
          </tr>
        </thead>
        <tbody>
          {claim.items.map((item) => (
            <tr key={item.description}>
              <td>{item.description}</td>
              <td>{sentence(item.category)}</td>
              <td className="number">{money(item.amount)}</td>
            </tr>
          ))}
          <tr className="total">
            <td colSpan={2}>Total claimed</td>
            <td className="number">{money(claim.amount_claimed)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function DocumentsPanel({ claim }: Readonly<{ claim: Claim }>) {
  return (
    <section className="panel" aria-label="Documents">
      <h2>Documents</h2>
      <div className="documents">
        {claim.documents.map((document) => (
          <article className="document" key={document.name}>
            <h3>{document.name}</h3>
            <div className="muted">{sentence(document.type)}</div>
            <p>{document.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ClaimPage() {
  const { claimId = "" } = useParams();
  const loadClaim = useCallback(() => getClaim(claimId), [claimId]);
  const { data: claim, failed } = usePolling(loadClaim);

  if (!claim) {
    return (
      <p className="notice">
        {failed ? `There is no claim ${claimId}.` : "Loading the claim"}
      </p>
    );
  }

  return (
    <>
      <Link className="back" to="/">
        Back to the queue
      </Link>
      <div className="title">
        <h1>
          Claim <span className="mono">{claim.claim_id}</span>
        </h1>
        <StatusBadge status={claim.status} />
      </div>
      <p className="lead">{claim.summary}</p>
      <div className="columns">
        <div className="column">
          <DecisionPanel claim={claim} />
          <StoryPanel claim={claim} />
          <ItemsPanel claim={claim} />
          <DocumentsPanel claim={claim} />
        </div>
        <div className="column">
          <AgentSteps claimId={claim.claim_id} status={claim.status} />
          <PolicyPanel policyId={claim.policy_id} />
          <HistoryPanel customerId={claim.customer_id} />
        </div>
      </div>
    </>
  );
}
