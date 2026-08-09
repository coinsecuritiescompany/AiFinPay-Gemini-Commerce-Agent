import type { AppConfig } from "../src/config.js";
import type { CommerceDecision, ObjectiveRecord, Offer, PaymentEvidence } from "../src/domain.js";
import type { DecisionEngine, DecisionResult, PaymentExecutor } from "../src/services/interfaces.js";

export class FixedDecisionEngine implements DecisionEngine {
  constructor(private readonly value: CommerceDecision) {}
  configured() { return true; }
  async decide(): Promise<DecisionResult> {
    return { decision: this.value, model: "gemini-test", modelRequestId: "test-request" };
  }
}

export class FixedPaymentExecutor implements PaymentExecutor {
  calls = 0;
  configured() { return true; }
  async execute(_offer: Offer, _objective: ObjectiveRecord): Promise<PaymentEvidence> {
    this.calls += 1;
    return {
      provider: "AIFP1",
      txHash: "0xabc",
      explorerUrl: "https://example.test/tx/0xabc",
      receiptId: "receipt-1",
      grossAmountUsd: 0.002,
      merchantProceedsUsd: 0.00198,
      protocolFeeUsd: 0.00002,
      httpStatus: 200,
      deliverySha256: "f".repeat(64),
      settledAt: new Date().toISOString()
    };
  }
}

export const testConfig: AppConfig = {
  nodeEnv: "test",
  port: 8080,
  logLevel: "silent",
  adminToken: "123456789012345678901234",
  gemini: { project: undefined, location: "global", apiKey: undefined, model: "gemini-test" },
  firestore: { enabled: false, project: undefined, databaseId: "(default)" },
  aifinpay: {
    seedHex: undefined,
    apiBaseUrl: "https://api.aifinpay.io",
    gatewayOrigins: ["https://gateway.aifinpay.io"],
    dailyBudgetUsd: 1,
    perCallBudgetUsd: 0.05
  },
  circle: {
    apiKey: undefined,
    entitySecret: undefined,
    walletId: undefined,
    walletAddress: undefined,
    blockchain: "ARC-TESTNET",
    usdcTokenId: undefined,
    explorerBaseUrl: undefined,
    maxTransferUsd: 1
  }
};
