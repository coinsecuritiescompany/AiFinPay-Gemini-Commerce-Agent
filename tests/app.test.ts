import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { CircleWalletService } from "../src/services/circle.js";
import { MemoryCommerceStore } from "../src/services/store.js";
import { FixedDecisionEngine, FixedPaymentExecutor, testConfig } from "./helpers.js";

const decision = {
  decision: "PAY" as const,
  merchantId: "merchant-1",
  offerId: "offer-1",
  actionTier: "COMPLEX" as const,
  amountUsd: 0.002,
  network: "polygon",
  asset: "USDC",
  reason: "Useful and within policy.",
  expectedUtility: 0.9,
  confidence: 0.95,
  toolCall: "execute_payment" as const
};

const apps: ReturnType<typeof buildApp>[] = [];
const adminHeaders = { "x-admin-token": testConfig.adminToken! };
afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

function appWith(decisionOverride = decision) {
  const payment = new FixedPaymentExecutor();
  const app = buildApp({
    config: testConfig,
    store: new MemoryCommerceStore(),
    decisionEngine: new FixedDecisionEngine(decisionOverride),
    paymentExecutor: payment,
    circle: new CircleWalletService(testConfig.circle)
  });
  apps.push(app);
  return { app, payment };
}

function objectiveBody() {
  return {
    goal: "Buy access to one research API query",
    requesterId: "external-user-1",
    policy: {
      maxBudgetUsd: 0.01,
      autoApproveLimitUsd: 0.005,
      minConfidence: 0.6,
      allowedMerchants: ["merchant-1"],
      allowedNetworks: ["polygon"],
      allowedAssets: ["USDC"]
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
      paymentRail: "AIFP1"
    }]
  };
}

describe("commerce API", () => {
  it("creates, decides and executes one payment", async () => {
    const { app, payment } = appWith();
    const created = await app.inject({ method: "POST", url: "/v1/objectives", headers: adminHeaders, payload: objectiveBody() });
    expect(created.statusCode).toBe(201);
    const id = created.json().id as string;
    const run = await app.inject({ method: "POST", url: `/v1/objectives/${id}/run`, headers: adminHeaders });
    expect(run.statusCode).toBe(200);
    expect(run.json().objective.status).toBe("COMPLETED");
    expect(run.json().payment.protocolFeeUsd).toBe(0.00002);
    expect(payment.calls).toBe(1);

    const metrics = await app.inject({ method: "GET", url: "/v1/metrics" });
    expect(metrics.json()).toMatchObject({
      decisions: 1,
      successfulPayments: 1,
      protocolRevenueUsd: 0.00002,
      payingRequesters: 1
    });
  });

  it("does not pay when deterministic policy rejects the model decision", async () => {
    const { app, payment } = appWith({ ...decision, amountUsd: 0.003 });
    const created = await app.inject({ method: "POST", url: "/v1/objectives", headers: adminHeaders, payload: objectiveBody() });
    const run = await app.inject({ method: "POST", url: `/v1/objectives/${created.json().id}/run`, headers: adminHeaders });
    expect(run.json().objective.status).toBe("REJECTED");
    expect(run.json().decision.policyVerdict.code).toBe("OFFER_MISMATCH");
    expect(payment.calls).toBe(0);
  });

  it("prevents a completed objective from executing twice", async () => {
    const { app, payment } = appWith();
    const created = await app.inject({ method: "POST", url: "/v1/objectives", headers: adminHeaders, payload: objectiveBody() });
    const url = `/v1/objectives/${created.json().id}/run`;
    expect((await app.inject({ method: "POST", url, headers: adminHeaders })).statusCode).toBe(200);
    const repeated = await app.inject({ method: "POST", url, headers: adminHeaders });
    expect(repeated.statusCode).toBe(409);
    expect(repeated.json().error).toBe("OBJECTIVE_NOT_RUNNABLE_COMPLETED");
    expect(payment.calls).toBe(1);
  });

  it("requires an admin token to create an objective", async () => {
    const { app } = appWith();
    const response = await app.inject({ method: "POST", url: "/v1/objectives", payload: objectiveBody() });
    expect(response.statusCode).toBe(403);
  });

  it("requires an admin token for Circle transfers", async () => {
    const { app } = appWith();
    const response = await app.inject({
      method: "POST",
      url: "/v1/circle/transfers",
      payload: { destinationAddress: "0x1111111111111111111111111111111111111111", amountUsd: 0.01, confirm: true }
    });
    expect(response.statusCode).toBe(403);
  });

  it("rejects malformed objectives", async () => {
    const { app } = appWith();
    const response = await app.inject({ method: "POST", url: "/v1/objectives", headers: adminHeaders, payload: { goal: "x" } });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("VALIDATION_ERROR");
  });
});
