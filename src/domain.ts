import { z } from "zod";

export const ActionTierSchema = z.enum(["STANDARD", "COMPLEX", "PREMIUM"]);
export const DecisionKindSchema = z.enum(["PAY", "REJECT", "ASK_USER"]);

export const OfferSchema = z.object({
  merchantId: z.string().min(1).max(160),
  offerId: z.string().min(1).max(160),
  title: z.string().min(1).max(300),
  description: z.string().max(1000).default(""),
  url: z.string().url(),
  priceUsd: z.number().positive().max(100_000),
  network: z.string().min(1).max(80),
  asset: z.string().min(1).max(32).default("USDC"),
  actionTier: ActionTierSchema,
  paymentRail: z.enum(["AIFP1"]).default("AIFP1")
});

export const SpendingPolicySchema = z.object({
  maxBudgetUsd: z.number().positive().max(100_000),
  autoApproveLimitUsd: z.number().nonnegative().max(100_000),
  minConfidence: z.number().min(0).max(1).default(0.6),
  allowedMerchants: z.array(z.string().min(1)).min(1).max(100),
  allowedNetworks: z.array(z.string().min(1)).min(1).max(50),
  allowedAssets: z.array(z.string().min(1)).min(1).max(20).default(["USDC"])
}).superRefine((policy, context) => {
  if (policy.autoApproveLimitUsd > policy.maxBudgetUsd) {
    context.addIssue({
      code: "custom",
      path: ["autoApproveLimitUsd"],
      message: "autoApproveLimitUsd cannot exceed maxBudgetUsd"
    });
  }
});

export const CreateObjectiveSchema = z.object({
  goal: z.string().min(5).max(2000),
  requesterId: z.string().min(1).max(160).optional(),
  policy: SpendingPolicySchema,
  offers: z.array(OfferSchema).min(1).max(50)
});

export const CommerceDecisionSchema = z.object({
  decision: DecisionKindSchema,
  merchantId: z.string().min(1),
  offerId: z.string().min(1),
  actionTier: ActionTierSchema,
  amountUsd: z.number().nonnegative(),
  network: z.string().min(1),
  asset: z.string().min(1),
  reason: z.string().min(1).max(2000),
  expectedUtility: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  toolCall: z.enum(["quote_payment", "execute_payment", "none"])
});

export type Offer = z.infer<typeof OfferSchema>;
export type SpendingPolicy = z.infer<typeof SpendingPolicySchema>;
export type CreateObjective = z.infer<typeof CreateObjectiveSchema>;
export type CommerceDecision = z.infer<typeof CommerceDecisionSchema>;

export interface ObjectiveRecord extends CreateObjective {
  id: string;
  createdAt: string;
  status: "CREATED" | "RUNNING" | "REJECTED" | "AWAITING_USER" | "COMPLETED" | "FAILED";
}

export interface DecisionRecord {
  id: string;
  objectiveId: string;
  traceId: string;
  model: string;
  modelRequestId?: string;
  decision: CommerceDecision;
  policyVerdict: PolicyVerdict;
  createdAt: string;
}

export interface PolicyVerdict {
  approved: boolean;
  requiresUserApproval: boolean;
  code:
    | "APPROVED"
    | "GEMINI_REJECTED"
    | "USER_APPROVAL_REQUIRED"
    | "OFFER_NOT_FOUND"
    | "OFFER_MISMATCH"
    | "MERCHANT_NOT_ALLOWED"
    | "NETWORK_NOT_ALLOWED"
    | "ASSET_NOT_ALLOWED"
    | "BUDGET_EXCEEDED"
    | "AUTO_APPROVE_EXCEEDED"
    | "LOW_CONFIDENCE";
  reason: string;
}

export interface PaymentEvidence {
  provider: "AIFP1" | "CIRCLE";
  transactionId?: string;
  txHash?: string;
  explorerUrl?: string;
  receiptId?: string;
  grossAmountUsd: number;
  merchantProceedsUsd: number;
  protocolFeeUsd: number;
  httpStatus?: number;
  deliverySha256?: string;
  contentType?: string;
  settledAt: string;
}

export interface PaymentRecord extends PaymentEvidence {
  id: string;
  objectiveId: string;
  decisionId: string;
  traceId: string;
  merchantId: string;
  offerId: string;
  status: "SUCCEEDED" | "FAILED";
  errorCode?: string;
  createdAt: string;
}

export interface MetricsSnapshot {
  objectives: number;
  decisions: number;
  approvedDecisions: number;
  rejectedDecisions: number;
  successfulPayments: number;
  failedPayments: number;
  grossPaymentVolumeUsd: number;
  protocolRevenueUsd: number;
  merchantRevenueUsd: number;
  uniqueRequesters: number;
  payingRequesters: number;
  updatedAt: string;
}

export const CircleTransferSchema = z.object({
  destinationAddress: z.string().min(10).max(256),
  amountUsd: z.number().positive().max(100_000),
  tokenId: z.string().min(1).optional(),
  confirm: z.literal(true)
});
