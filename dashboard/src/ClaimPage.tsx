import { useCallback } from "react";
import { useParams } from "react-router";
import { getClaim } from "./api";
import { StatusBadge } from "./Badge";
import { usePolling } from "./usePolling";

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
      <h1>
        Claim <span className="mono">{claim.claim_id}</span>
      </h1>
      <p>
        <StatusBadge status={claim.status} /> {claim.summary}
      </p>
    </>
  );
}
