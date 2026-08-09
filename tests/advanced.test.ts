import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type { CommerceDecision, ObjectiveRecord, Offer, PaymentEvidence } from "../src/domain.js";
import { CircleWalletService } from "../src/services/circle.js";
import type { PaymentExecutor } from "../src/services/interfaces.js";
import { executeWithRecovery, classifyPaymentFailure } from "../src/services/recovery.js";
import { MemoryCommerceStore } from "../src/services/store.js";
import type { VisionEngine } from "../src/services/vision.js";
import { FixedDecisionEngine, FixedPaymentExecutor, testConfig } from "./helpers.js";

const apps: ReturnType<typeof buildApp>[] = [];
afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

const policy = {
  maxBudgetUsd: 0.01,
  autoApproveLimitUsd: 0.01,
  minConfidence: 0.6,
  allowedMerchants: ["merchant-1"],
  allowedNetworks: ["polygon", "base"],
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
} as const;

const offer: Offer = {
  merchantId: "merchant-1",
  offerId: "part-1",
  title: "Replacement server fan",
  description: "Compatible replacement fan",
  url: "https://gateway.aifinpay.io/polygon/part-1",
  priceUsd: 0.004,
  network: "polygon",
  asset: "USDC",
  actionTier: "COMPLEX",
  paymentRail: "AIFP1",
  recoveryOptions: [{
    url: "https://gateway.aifinpay.io/base/part-1",
    priceUsd: 0.004,
    network: "base",
    asset: "USDC"
  }]
};

const objective: ObjectiveRecord = {
  id: "objective-advanced",
  createdAt: new Date().toISOString(),
  status: "RUNNING",
  goal: "Replace the failed server fan",
  policy: structuredClone(policy),
  offers: [structuredClone(offer)]
};

const decision: CommerceDecision = {
  decision: "PAY",
  merchantId: "merchant-1",
  offerId: "part-1",
  actionTier: "COMPLEX",
  amountUsd: 0.004,
  network: "polygon",
  asset: "USDC",
  reason: "Best compatible offer.",
  expectedUtility: 0.95,
  confidence: 0.95,
  toolCall: "execute_payment"
};

class FailoverExecutor implements PaymentExecutor {
  networks: string[] = [];
  configured() { return true; }
  async execute(candidate: Offer): Promise<PaymentEvidence> {
    this.networks.push(candidate.network);
    if (candidate.network === "polygon") throw new Error("RPC timeout while broadcasting transaction");
    return {
      provider: "AIFP1",
      grossAmountUsd: candidate.priceUsd,
      merchantProceedsUsd: candidate.priceUsd * 0.99,
      protocolFeeUsd: candidate.priceUsd * 0.01,
      txHash: "0xfailover",
      settledAt: new Date().toISOString()
    };
  }
}

class FixedVisionEngine implements VisionEngine {
  configured() { return true; }
  async inspect() {
    return {
      detectedObject: "server cooling fan",
      issue: "fan appears physically damaged",
      searchQuery: "compatible server cooling fan replacement",
      reason: "Visible fan housing damage suggests replacement procurement.",
      confidence: 0.91
    };
  }
}

describe("advanced autonomous commerce capabilities", () => {
  it("classifies gas and RPC failures for bounded self-healing", () => {
    expect(classifyPaymentFailure(new Error("replacement transaction underpriced due to base fee"))).toBe("GAS_SPIKE");
    expect(classifyPaymentFailure(new Error("RPC timeout"))).toBe("RPC_UNAVAILABLE");
  });

  it("fails over to another allowlisted network after transient RPC failures", async () => {
    const executor = new FailoverExecutor();
    const result = await executeWithRecovery(executor, offer, objective, decision);
    expect(result.offer.network).toBe("base");
    expect(result.recovery.recovered).toBe(true);
    expect(result.recovery.attempts).toBe(3);
    expect(executor.networks).toEqual(["polygon", "polygon", "base"]);
  });

  it("turns an image into a procurement objective without persisting image bytes", async () => {
    const app = buildApp({
      config: testConfig,
      store: new MemoryCommerceStore(),
      decisionEngine: new FixedDecisionEngine(decision),
      paymentExecutor: new FixedPaymentExecutor(),
      circle: new CircleWalletService(testConfig.circle),
      visionEngine: new FixedVisionEngine()
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/visual-objectives",
      headers: { "x-admin-token": testConfig.adminToken! },
      payload: {
        goal: "Buy a safe replacement for this broken server component",
        policy: {
          maxBudgetUsd: 0.01,
          autoApproveLimitUsd: 0.01,
          minConfidence: 0.6,
          allowedMerchants: ["merchant-1"],
          allowedNetworks: ["polygon", "base"],
          allowedAssets: ["USDC"]
        },
        image: {
          mimeType: "image/jpeg",
          data: "ZmFrZS1pbWFnZS1ieXRlcy1mb3ItdGVzdA=="
        },
        offers: [offer],
        discoverMerchantApis: false,
        execute: false
      }
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.analysis.detectedObject).toBe("server cooling fan");
    expect(body.objective.goal).toContain("Visual identification: server cooling fan");
    expect(JSON.stringify(body.objective)).not.toContain("ZmFrZS1pbWFnZS1ieXRlcy1mb3ItdGVzdA==");
  });
});
