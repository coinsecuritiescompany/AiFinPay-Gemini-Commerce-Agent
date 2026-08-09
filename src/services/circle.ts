import { randomUUID } from "node:crypto";
import {
  initiateDeveloperControlledWalletsClient,
  type CircleDeveloperControlledWalletsClient
} from "@circle-fin/developer-controlled-wallets";
import type { AppConfig } from "../config.js";

export interface CircleTransferResult {
  transactionId: string;
  state?: string;
  txHash?: string;
  explorerUrl?: string;
}

export class CircleWalletService {
  private readonly config: AppConfig["circle"];
  private readonly client?: CircleDeveloperControlledWalletsClient;

  constructor(config: AppConfig["circle"]) {
    this.config = config;
    if (config.apiKey && config.entitySecret) {
      this.client = initiateDeveloperControlledWalletsClient({
        apiKey: config.apiKey,
        entitySecret: config.entitySecret
      });
    }
  }

  configured(): boolean {
    return Boolean(this.client && this.config.walletId && this.config.usdcTokenId);
  }

  publicStatus() {
    return {
      configured: this.configured(),
      blockchain: this.config.blockchain,
      walletAddress: this.config.walletAddress ?? null,
      explorerBaseUrl: this.config.explorerBaseUrl ?? null
    };
  }

  async transferUsdc(destinationAddress: string, amountUsd: number, tokenId?: string): Promise<CircleTransferResult> {
    if (!this.client || !this.config.walletId) throw new Error("CIRCLE_NOT_CONFIGURED");
    if (amountUsd > this.config.maxTransferUsd) throw new Error("CIRCLE_TRANSFER_LIMIT_EXCEEDED");
    const selectedTokenId = tokenId ?? this.config.usdcTokenId;
    if (!selectedTokenId) throw new Error("CIRCLE_USDC_TOKEN_ID_REQUIRED");

    const created = await this.client.createTransaction({
      walletId: this.config.walletId,
      tokenId: selectedTokenId,
      destinationAddress,
      amount: [amountUsd.toFixed(6)],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      idempotencyKey: randomUUID(),
      refId: "aifinpay-gemini-commerce-agent"
    });
    const id = created.data?.id;
    if (!id) throw new Error("CIRCLE_TRANSACTION_ID_MISSING");

    const fetched = await this.client.getTransaction({ id, waitForTxHash: true });
    const transaction = fetched.data?.transaction;
    const txHash = transaction?.txHash;
    return {
      transactionId: id,
      ...(transaction?.state ? { state: transaction.state } : {}),
      ...(txHash ? { txHash } : {}),
      ...(txHash && this.config.explorerBaseUrl
        ? { explorerUrl: `${this.config.explorerBaseUrl.replace(/\/$/, "")}/${txHash}` }
        : {})
    };
  }
}
