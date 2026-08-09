import { describe, expect, it } from "vitest";
import type { CommerceDecision, ObjectiveRecord } from "../src/domain.js";
import { evaluatePolicy } from "../src/services/policy.js";

const objective: ObjectiveRecord = {
  id: "objective-1",
  createdAt: new Date().toISOString(),
  status: "CREATED",
  goal: "Buy access to the research API",
  policy: {
    maxBudgetUsd: 0.01,
    autoApproveLimitUsd: 0.005,
    minConfidence: 0.6,
    allowedMerchants: ["merchant-1"],
    allowedNetworks: ["polygon"],
    allowedAssets: ["USDC"],
    negotiation: {
      enabled: false,
      triggerAtBudgetRatio: 0.8,
      maxDiscountPct: 0.15,
      minCounterOfferUsd: 0,
      payIfDeclined: false
    },
    recovery: {
      enabled: true,
      maxAttempts: 3,
      baseDelayMs: 0,
      allowNetworkFailover: true,
      allowAssetFailover: false
    }
  },
  offers: [{
    merchantId: "merchant-1",
    offerId: "offer-1",
    title: "Research API",
    description: "One complex query",
    url: "https://gateway.aifinpay.io/example/research",
    priceUsd: 0.002,
    network: "polygon",
    asset: "USDC",
    actionTier: "COMPLEX",
    paymentRail: "AIFP1",
    recoveryOptions: []
  }]
};

const decision: CommerceDecision = {
  decision: "PAY",
  merchantId: "merchant-1",
  offerId: "offer-1",
  actionTier: "COMPLEX",
  amountUsd: 0.002,
  network: "polygon",
  asset: "USDC",
  reason: "The offer directly satisfies the objective.",
  expectedUtility: 0.9,
  confidence: 0.95,
  toolCall: "execute_payment"
};

describe("evaluatePolicy", () => {
  it("approves an exact, allowlisted, in-budget offer", () => {
    expect(evaluatePolicy(objective, decision).code).toBe("APPROVED");
  });

  it("blocks a price changed by the model", () => {
    expect(evaluatePolicy(objective, { ...decision, amountUsd: 0.001 }).code).toBe("OFFER_MISMATCH");
  });

  it("blocks a merchant outside the allowlist", () => {
    const modified = structuredClone(objective);
    modified.policy.allowedMerchants = ["other"];
    expect(evaluatePolicy(modified, decision).code).toBe("MERCHANT_NOT_ALLOWED");
  });

  it("requires user approval above the auto-approve limit", () => {
    const modified = structuredClone(objective);
    modified.policy.autoApproveLimitUsd = 0.001;
    const result = evaluatePolicy(modified, decision);
    expect(result.code).toBe("AUTO_APPROVE_EXCEEDED");
    expect(result.requiresUserApproval).toBe(true);
  });

  it("blocks low-confidence autonomous spending", () => {
    expect(evaluatePolicy(objective, { ...decision, confidence: 0.4 }).code).toBe("LOW_CONFIDENCE");
  });

  it("approves a bounded counter-offer only near the budget ceiling", () => {
    const modified = structuredClone(objective);
    modified.policy.negotiation.enabled = true;
    modified.policy.maxBudgetUsd = 0.0022;
    modified.policy.autoApproveLimitUsd = 0.0022;
    modified.offers[0]!.negotiationUrl = "https://gateway.aifinpay.io/example/negotiate";
    const result = evaluatePolicy(modified, {
      ...decision,
      decision: "NEGOTIATE",
      counterOfferUsd: 0.0018,
      toolCall: "negotiate_offer"
    });
    expect(result.code).toBe("NEGOTIATION_APPROVED");
  });

  it("blocks an excessive negotiation discount", () => {
    const modified = structuredClone(objective);
    modified.policy.negotiation.enabled = true;
    modified.policy.maxBudgetUsd = 0.0022;
    modified.policy.autoApproveLimitUsd = 0.0022;
    modified.offers[0]!.negotiationUrl = "https://gateway.aifinpay.io/example/negotiate";
    const result = evaluatePolicy(modified, {
      ...decision,
      decision: "NEGOTIATE",
      counterOfferUsd: 0.001,
      toolCall: "negotiate_offer"
    });
    expect(result.code).toBe("NEGOTIATION_INVALID");
  });
});
