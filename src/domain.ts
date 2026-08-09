import { z } from "zod";

export const ActionTierSchema = z.enum(["STANDARD", "COMPLEX", "PREMIUM"]);
export const DecisionKindSchema = z.enum(["PAY", "NEGOTIATE", "REJECT", "ASK_USER"]);

export const RecoveryOptionSchema = z.object({
  url: z.string().url(),
  priceUsd: z.number().positive().max(100_000),
  network: z.string().min(1).max(80),
  asset: z.string().min(1).max(32)
});

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
  paymentRail: z.enum(["AIFP1"]).default("AIFP1"),
  negotiationUrl: z.string().url().optional(),
  negotiationToken: z.string().min(1).max(2048).optional(),
  recoveryOptions: z.array(RecoveryOptionSchema).max(8).default([])
});

const NegotiationPolicySchema = z.object({
  enabled: z.boolean().default(false),
  triggerAtBudgetRatio: z.number().min(0.5).max(1).default(0.8),
  maxDiscountPct: z.number().positive().max(0.5).default(0.15),
  minCounterOfferUsd: z.number().nonnegative().default(0),
  payIfDeclined: z.boolean().default(false)
}).default({
  enabled: false,
  triggerAtBudgetRatio: 0.8,
  maxDiscountPct: 0.15,
  minCounterOfferUsd: 0,
  payIfDeclined: false
});

const RecoveryPolicySchema = z.object({
  enabled: z.boolean().default(true),
  maxAttempts: z.number().int().min(1).max(6).default(3),
  baseDelayMs: z.number().int().min(0).max(30_000).default(500),
  allowNetworkFailover: z.boolean().default(true),
  allowAssetFailover: z.boolean().default(false)
}).default({
  enabled: true,
  maxAttempts: 3,
  baseDelayMs: 500,
  allowNetworkFailover: true,
  allowAssetFailover: false
});

export const SpendingPolicySchema = z.object({
  maxBudgetUsd: z.number().positive().max(100_000),
  autoApproveLimitUsd: z.number().nonnegative().max(100_000),
  minConfidence: z.number().min(0).max(1).default(0.6),
  allowedMerchants: z.array(z.string().min(1)).min(1).max(100),
  allowedNetworks: z.array(z.string().min(1)).min(1).max(50),
  allowedAssets: z.array(z.string().min(1)).min(1).max(20).default(["USDC"]),
  negotiation: NegotiationPolicySchema,
  recovery: RecoveryPolicySchema
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
  goal: z.string().min(5).max(4000),
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
  counterOfferUsd: z.number().positive().optional(),
  network: z.string().min(1),
  asset: z.string().min(1),
  reason: z.string().min(1).max(2000),
  expectedUtility: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  toolCall: z.enum(["quote_payment", "negotiate_offer", "execute_payment", "none"])
});

export const ImageInputSchema = z.object({
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"]),
  data: z.string().min(16).max(20_000_000)
});

export const VisualObjectiveSchema = z.object({
  goal: z.string().min(5).max(2000),
  requesterId: z.string().min(1).max(160).optional(),
  policy: SpendingPolicySchema,
  image: ImageInputSchema,
  offers: z.array(OfferSchema).max(50).default([]),
  discoverMerchantApis: z.boolean().default(true),
  execute: z.boolean().default(false)
});

export const VisualInspectionSchema = z.object({
  detectedObject: z.string().min(1).max(500),
  issue: z.string().min(1).max(1000),
  searchQuery: z.string().min(1).max(500),
  reason: z.string().min(1).max(1500),
  confidence: z.number().min(0).max(1)
});

export const NegotiationResponseSchema = z.object({
  accepted: z.boolean(),
  priceUsd: z.number().positive().max(100_000).optional(),
  paymentUrl: z.string().url().optional(),
  token: z.string().min(1).max(2048).optional(),
  reason: z.string().max(1000).optional()
});

export type Offer = z.infer<typeof OfferSchema>;
export type SpendingPolicy = z.infer<typeof SpendingPolicySchema>;
export type CreateObjective = z.infer<typeof CreateObjectiveSchema>;
export type CommerceDecision = z.infer<typeof CommerceDecisionSchema>;
export type VisualObjective = z.infer<typeof VisualObjectiveSchema>;
export type VisualInspection = z.infer<typeof VisualInspectionSchema>;

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
    | "NEGOTIATION_APPROVED"
    | "NEGOTIATION_NOT_ALLOWED"
    | "NEGOTIATION_INVALID"
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

export interface NegotiationRecord {
  attempted: boolean;
  accepted: boolean;
  listPriceUsd: number;
  counterOfferUsd?: number;
  agreedPriceUsd?: number;
  reason?: string;
}

export interface RecoveryRecord {
  attempts: number;
  recovered: boolean;
  path: string[];
  finalFailureClass?: "GAS_SPIKE" | "RPC_UNAVAILABLE" | "NETWORK_TRANSIENT" | "NON_RETRYABLE";
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
  recovery?: RecoveryRecord;
  negotiation?: NegotiationRecord;
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
