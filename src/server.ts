#!/usr/bin/env node
import { buildApp, dependenciesFromEnv } from "./app.js";
import { loadConfig } from "./config.js";
import type { ObjectiveRecord } from "./domain.js";

const config = loadConfig();
const dependencies = dependenciesFromEnv();
const app = buildApp(dependencies);

async function runGeminiStartupSmokeTest() {
  if (!config.gemini.startupSmokeTest) return;

  const now = new Date().toISOString();
  const objective: ObjectiveRecord = {
    id: `startup-smoke-${Date.now()}`,
    createdAt: now,
    status: "CREATED",
    requesterId: "render-startup-smoke",
    goal: "Validate Gemini connectivity by selecting the only harmless test offer. Do not execute any payment.",
    policy: {
      maxBudgetUsd: 0.001,
      autoApproveLimitUsd: 0.001,
      minConfidence: 0,
      allowedMerchants: ["smoke-merchant"],
      allowedNetworks: ["base"],
      allowedAssets: ["USDC"],
      negotiation: {
        enabled: false,
        triggerAtBudgetRatio: 0.8,
        maxDiscountPct: 0.15,
        minCounterOfferUsd: 0,
        payIfDeclined: false
      },
      recovery: {
        enabled: false,
        maxAttempts: 1,
        baseDelayMs: 0,
        allowNetworkFailover: false,
        allowAssetFailover: false
      }
    },
    offers: [{
      merchantId: "smoke-merchant",
      offerId: "smoke-offer",
      title: "Connectivity smoke test",
      description: "A harmless synthetic offer used only to verify Gemini structured function calling.",
      url: "https://example.com/smoke-test",
      priceUsd: 0.0005,
      network: "base",
      asset: "USDC",
      actionTier: "STANDARD",
      paymentRail: "AIFP1",
      recoveryOptions: []
    }]
  };

  try {
    const result = await dependencies.decisionEngine.decide(objective);
    app.log.info({
      event: "gemini.startup_smoke.success",
      model: result.model,
      modelRequestId: result.modelRequestId,
      decision: result.decision.decision,
      confidence: result.decision.confidence
    });
  } catch (error) {
    app.log.error({
      event: "gemini.startup_smoke.failed",
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR"
    });
  }
}

try {
  const host = config.nodeEnv === "production" ? "0.0.0.0" : "127.0.0.1";
  await app.listen({ port: config.port, host });
  await runGeminiStartupSmokeTest();
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
