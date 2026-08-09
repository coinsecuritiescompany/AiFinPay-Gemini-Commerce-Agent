import type { CommerceDecision, ObjectiveRecord, Offer, RecoveryRecord } from "../domain.js";
import type { PaymentExecutor } from "./interfaces.js";
import { evaluatePolicy } from "./policy.js";

export type FailureClass = "GAS_SPIKE" | "RPC_UNAVAILABLE" | "NETWORK_TRANSIENT" | "NON_RETRYABLE";

export function classifyPaymentFailure(error: unknown): FailureClass {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (/gas|fee too low|base fee|underpriced|insufficient funds for gas/.test(message)) return "GAS_SPIKE";
  if (/rpc|429|rate limit|timeout|timed out|econnreset|enotfound|socket/.test(message)) return "RPC_UNAVAILABLE";
  if (/network|503|502|504|gateway|temporar|unavailable/.test(message)) return "NETWORK_TRANSIENT";
  return "NON_RETRYABLE";
}

function sleep(ms: number) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function candidateDecision(base: CommerceDecision, offer: Offer): CommerceDecision {
  const { counterOfferUsd: _counterOfferUsd, ...rest } = base;
  return {
    ...rest,
    decision: "PAY",
    amountUsd: offer.priceUsd,
    network: offer.network,
    asset: offer.asset,
    toolCall: "execute_payment"
  };
}

function objectiveWithOffer(objective: ObjectiveRecord, primary: Offer, candidate: Offer): ObjectiveRecord {
  return {
    ...objective,
    offers: objective.offers.map((offer) =>
      offer.offerId === primary.offerId && offer.merchantId === primary.merchantId ? candidate : offer
    )
  };
}

function recoveryCandidates(primary: Offer, objective: ObjectiveRecord, baseDecision: CommerceDecision): Offer[] {
  const options = primary.recoveryOptions.map((option) => ({
    ...primary,
    url: option.url,
    priceUsd: option.priceUsd,
    network: option.network,
    asset: option.asset,
    recoveryOptions: []
  }));

  return [primary, ...options].filter((offer, index) => {
    if (index === 0) return true;
    if (!objective.policy.recovery.allowNetworkFailover && offer.network !== primary.network) return false;
    if (!objective.policy.recovery.allowAssetFailover && offer.asset !== primary.asset) return false;
    const candidateObjective = objectiveWithOffer(objective, primary, offer);
    return evaluatePolicy(candidateObjective, candidateDecision(baseDecision, offer)).approved;
  });
}

export async function executeWithRecovery(
  executor: PaymentExecutor,
  primary: Offer,
  objective: ObjectiveRecord,
  baseDecision: CommerceDecision
): Promise<{ evidence: Awaited<ReturnType<PaymentExecutor["execute"]>>; recovery: RecoveryRecord; offer: Offer }> {
  const policy = objective.policy.recovery;
  const candidates = recoveryCandidates(primary, objective, baseDecision);
  const path: string[] = [];
  let attempts = 0;
  let lastError: unknown;
  let finalFailureClass: FailureClass = "NON_RETRYABLE";

  for (const candidate of candidates) {
    const samePathRetries = policy.enabled ? Math.min(2, policy.maxAttempts - attempts) : 1;
    for (let retry = 0; retry < samePathRetries && attempts < policy.maxAttempts; retry += 1) {
      attempts += 1;
      path.push(`${candidate.network}:${candidate.asset}:attempt-${attempts}`);
      try {
        const candidateObjective = objectiveWithOffer(objective, primary, candidate);
        const evidence = await executor.execute(candidate, candidateObjective);
        return {
          evidence,
          offer: candidate,
          recovery: { attempts, recovered: attempts > 1 || candidate !== primary, path }
        };
      } catch (error) {
        lastError = error;
        finalFailureClass = classifyPaymentFailure(error);
        if (!policy.enabled || finalFailureClass === "NON_RETRYABLE") break;
        if (attempts < policy.maxAttempts) await sleep(policy.baseDelayMs * attempts);
      }
    }
    if (!policy.enabled || attempts >= policy.maxAttempts || finalFailureClass === "NON_RETRYABLE") break;
  }

  const wrapped = new Error(lastError instanceof Error ? lastError.message : "PAYMENT_RECOVERY_EXHAUSTED");
  Object.assign(wrapped, {
    recovery: { attempts, recovered: false, path, finalFailureClass } satisfies RecoveryRecord
  });
  throw wrapped;
}
