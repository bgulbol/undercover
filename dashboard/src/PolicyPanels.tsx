import { useCallback } from "react";
import { getCustomer, getPolicy } from "./api";
import { addOn, date, money, sentence } from "./format";
import { useLoad } from "./usePolling";

export function PolicyPanel({ policyId }: Readonly<{ policyId: string }>) {
  const loadPolicy = useCallback(() => getPolicy(policyId), [policyId]);
  const { data: policy } = useLoad(loadPolicy);

  return (
    <section className="panel" aria-label="Policy">
      <h2>Policy</h2>
      {policy ? (
        <dl className="facts">
          <dt>Policy</dt>
          <dd className="mono">{policy.policy_id}</dd>
          <dt>Plan</dt>
          <dd>{sentence(policy.plan)}</dd>
          <dt>Add-ons</dt>
          <dd>
            {policy.add_ons.length > 0
              ? policy.add_ons.map(addOn).join(", ")
              : "None"}
          </dd>
          <dt>Trip</dt>
          <dd>
            {policy.trip.destination}, {date(policy.trip.departs_on)} to{" "}
            {date(policy.trip.returns_on)}
          </dd>
          <dt>Trip cost</dt>
          <dd className="mono">{money(policy.trip.trip_cost)}</dd>
          <dt>Travelers</dt>
          <dd>{policy.travelers.join(", ")}</dd>
          <dt>Bought</dt>
          <dd>
            {date(policy.purchased_on)}, through {policy.sold_through}
          </dd>
        </dl>
      ) : (
        <p className="muted">Loading the policy</p>
      )}
    </section>
  );
}

export function HistoryPanel({ customerId }: Readonly<{ customerId: string }>) {
  const loadCustomer = useCallback(() => getCustomer(customerId), [customerId]);
  const { data: customer } = useLoad(loadCustomer);

  if (!customer) {
    return (
      <section className="panel" aria-label="Claim history">
        <h2>Claim history</h2>
        <p className="muted">Loading the claim history</p>
      </section>
    );
  }

  return (
    <section className="panel" aria-label="Claim history">
      <h2>Claim history</h2>
      <p className="muted">
        {customer.name}, a customer since {date(customer.customer_since)}
      </p>
      {customer.previous_claims.length === 0 ? (
        <p>No earlier claims.</p>
      ) : (
        <ul className="history">
          {customer.previous_claims.map((earlier) => (
            <li key={earlier.claim_id}>
              <div className="step-head">
                <span className="mono">{earlier.claim_id}</span>
                <span className="mono muted">{date(earlier.filed_on)}</span>
              </div>
              <div>
                {sentence(earlier.claim_type)}: {earlier.summary}
              </div>
              <div className="muted">
                {sentence(earlier.outcome)}, paid{" "}
                <span className="mono">{money(earlier.amount_paid)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
