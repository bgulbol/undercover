import { Link } from "react-router";
import { listClaims, type ClaimSummary } from "./api";
import { DecisionBadge, StatusBadge } from "./Badge";
import { date, money, sentence, STATUSES } from "./format";
import { usePolling } from "./usePolling";

function ClaimRow({ claim }: Readonly<{ claim: ClaimSummary }>) {
  return (
    <tr>
      <td>
        <Link className="mono" to={`/claims/${claim.claim_id}`}>
          {claim.claim_id}
        </Link>
      </td>
      <td className="nowrap">{claim.customer_name}</td>
      <td>
        {sentence(claim.claim_type)}
        <div className="muted">{claim.summary}</div>
      </td>
      <td className="number">{date(claim.submitted_on)}</td>
      <td className="number">{money(claim.amount_claimed)}</td>
      <td>
        <StatusBadge status={claim.status} />
      </td>
      <td>{claim.decision && <DecisionBadge decision={claim.decision} />}</td>
      <td className="number">
        {claim.payout === null ? "" : money(claim.payout)}
      </td>
    </tr>
  );
}

export function QueuePage() {
  const { data: claims, failed } = usePolling(listClaims);

  if (!claims) {
    return (
      <p className="notice">
        {failed ? "The backend is not responding." : "Loading the queue"}
      </p>
    );
  }

  return (
    <>
      <h1>Claims queue</h1>
      <section className="counts" aria-label="Claims by status">
        {STATUSES.map((status) => (
          <div className="panel count" key={status}>
            <span className="count-number">
              {claims.filter((claim) => claim.status === status).length}
            </span>
            <StatusBadge status={status} />
          </div>
        ))}
      </section>
      <section className="panel table-scroll">
        <table>
          <thead>
            <tr>
              <th>Claim</th>
              <th>Customer</th>
              <th>Type</th>
              <th className="number">Submitted</th>
              <th className="number">Claimed</th>
              <th>Status</th>
              <th>Decision</th>
              <th className="number">Payout</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <ClaimRow key={claim.claim_id} claim={claim} />
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
