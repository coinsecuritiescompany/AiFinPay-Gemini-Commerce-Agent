import type { CommerceDecision, ObjectiveRecord, Offer, PolicyVerdict } from "../domain.js";

const EPSILON = 0.0000001;

function denied(code: PolicyVerdict["code"], reason: string, requiresUserApproval = false): PolicyVerdict {
  return { approved: false, requiresUserApproval, code, reason };
}

export function findSelectedOffer(objective: ObjectiveRecord, decision: CommerceDecision): Offer | undefined {
  return objective.offers.find(
    (offer) => offer.offerId === decision.offerId && offer.merchantId === decision.merchantId
  );
}

export function evaluatePolicy(objective: ObjectiveRecord, decision: CommerceDecision): PolicyVerdict {
  if (decision.decision === "REJECT") {
    return denied("GEMINI_REJECTED", decision.reason);
  }
  if (decision.decision === "ASK_USER") {
    return denied("USER_APPROVAL_REQUIRED", decision.reason, true);
  }

  const offer = findSelectedOffer(objective, decision);
  if (!offer) {
    return denied("OFFER_NOT_FOUND", "The selected offer is not present in the supplied offer set.");
  }

  const mismatched =
    Math.abs(offer.priceUsd - decision.amountUsd) > EPSILON ||
    offer.network !== decision.network ||
    offer.asset !== decision.asset ||
    offer.actionTier !== decision.actionTier;
  if (mismatched) {
    return denied("OFFER_MISMATCH", "Gemini's proposed payment does not exactly match the signed offer data.");
  }
  if (!objective.policy.allowedMerchants.includes(offer.merchantId)) {
    return denied("MERCHANT_NOT_ALLOWED", "The merchant is not in the spending-policy allowlist.");
  }
  if (!objective.policy.allowedNetworks.includes(offer.network)) {
    return denied("NETWORK_NOT_ALLOWED", "The selected network is not permitted by policy.");
  }
  if (!objective.policy.allowedAssets.includes(offer.asset)) {
    return denied("ASSET_NOT_ALLOWED", "The selected asset is not permitted by policy.");
  }
  if (decision.amountUsd > objective.policy.maxBudgetUsd + EPSILON) {
    return denied("BUDGET_EXCEEDED", "The payment exceeds the objective's maximum budget.");
  }
  if (decision.amountUsd > objective.policy.autoApproveLimitUsd + EPSILON) {
    return denied(
      "AUTO_APPROVE_EXCEEDED",
      "The payment requires explicit user approval because it exceeds the auto-approve limit.",
      true
    );
  }
  if (decision.confidence < objective.policy.minConfidence) {
    return denied("LOW_CONFIDENCE", "Gemini confidence is below the deterministic policy threshold.", true);
  }

  return {
    approved: true,
    requiresUserApproval: false,
    code: "APPROVED",
    reason: "All deterministic spending-policy checks passed."
  };
}
