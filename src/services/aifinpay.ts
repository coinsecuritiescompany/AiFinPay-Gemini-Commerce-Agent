import { createHash } from "node:crypto";
import { AiFinPayAgent } from "@aifinpay/agent";
import type { AppConfig } from "../config.js";
import type { ObjectiveRecord, Offer, PaymentEvidence } from "../domain.js";
import type { PaymentExecutor } from "./interfaces.js";

const EXPLORERS: Record<string, string> = {
  polygon: "https://polygonscan.com/tx/",
  base: "https://basescan.org/tx/",
  optimism: "https://optimistic.etherscan.io/tx/",
  unichain: "https://uniscan.xyz/tx/"
};

export class AiFinPayExecutor implements PaymentExecutor {
  private readonly config: AppConfig["aifinpay"];
  private agentPromise?: Promise<AiFinPayAgent>;

  constructor(config: AppConfig["aifinpay"]) {
    this.config = config;
  }

  configured(): boolean {
    return Boolean(this.config.seedHex);
  }

  private agent(): Promise<AiFinPayAgent> {
    if (!this.config.seedHex) throw new Error("AIFINPAY_NOT_CONFIGURED");
    this.agentPromise ??= AiFinPayAgent.fromSeed(this.config.seedHex, {
      budgetCaps: {
        daily_usd: this.config.dailyBudgetUsd,
        per_call_usd: this.config.perCallBudgetUsd,
        on_limit_exceeded: "throw"
      },
      telemetry: true
    });
    return this.agentPromise;
  }

  async execute(offer: Offer, _objective: ObjectiveRecord): Promise<PaymentEvidence> {
    const agent = await this.agent();
    const response = await agent.fetchPaid(
      offer.url,
      { method: "GET", headers: { accept: "application/json, text/plain;q=0.9, */*;q=0.8" } },
      {
        scope: "exact",
        units: 1,
        apiBaseUrl: this.config.apiBaseUrl,
        gatewayOrigins: this.config.gatewayOrigins
      }
    );
    if (!response) throw new Error("AIFINPAY_PAYMENT_SKIPPED");

    const body = Buffer.from(await response.arrayBuffer());
    const matchingReceipts = agent.aifp1Receipts.list().filter(
      (receipt) => receipt.merchantId === offer.merchantId
    );
    const receipt = matchingReceipts.at(-1);
    const txHash =
      response.headers.get("aifp-tx-ref") ??
      response.headers.get("x-aifp-tx-ref") ??
      undefined;
    const amount = receipt?.amountUsd ?? offer.priceUsd;
    const protocolFee = Number((amount * 0.01).toFixed(8));
    const merchantProceeds = Number((amount - protocolFee).toFixed(8));
    const explorerBase = EXPLORERS[offer.network.toLowerCase()];

    return {
      provider: "AIFP1",
      ...(txHash ? { txHash } : {}),
      ...(txHash && explorerBase ? { explorerUrl: `${explorerBase}${txHash}` } : {}),
      ...(receipt?.receiptId ? { receiptId: receipt.receiptId } : {}),
      grossAmountUsd: amount,
      merchantProceedsUsd: merchantProceeds,
      protocolFeeUsd: protocolFee,
      httpStatus: response.status,
      deliverySha256: createHash("sha256").update(body).digest("hex"),
      ...(response.headers.get("content-type") ? { contentType: response.headers.get("content-type")! } : {}),
      settledAt: new Date().toISOString()
    };
  }
}
