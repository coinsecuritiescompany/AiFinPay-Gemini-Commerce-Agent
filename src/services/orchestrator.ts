import { randomUUID } from "node:crypto";
import type {
  CommerceDecision,
  CreateObjective,
  DecisionRecord,
  NegotiationRecord,
  ObjectiveRecord,
  PaymentRecord,
  RecoveryRecord
} from "../domain.js";
import type { CommerceStore, DecisionEngine, PaymentExecutor } from "./interfaces.js";
import { NegotiationService } from "./negotiation.js";
import { evaluatePolicy, findSelectedOffer } from "./policy.js";
import { executeWithRecovery } from "./recovery.js";

export interface RunResult {
  objective: ObjectiveRecord;
  decision: DecisionRecord;
  negotiation?: NegotiationRecord;
  payment?: PaymentRecord;
}

function paymentDecision(base: CommerceDecision, amountUsd: number): CommerceDecision {
  return {
    ...base,
    decision: "PAY",
    amountUsd,
    counterOfferUsd: undefined,
    toolCall: "execute_payment"
  };
}

export class CommerceOrchestrator {
  constructor(
    private readonly store: CommerceStore,
    private readonly decisionEngine: DecisionEngine,
    private readonly paymentExecutor: PaymentExecutor,
    private readonly negotiationService = new NegotiationService()
  ) {}

  createObjective(input: CreateObjective): Promise<ObjectiveRecord> {
    return this.store.createObjective(input);
  }

  getObjective(id: string): Promise<ObjectiveRecord | undefined> {
    return this.store.getObjective(id);
  }

  async run(objectiveId: string): Promise<RunResult> {
    const objective = await this.store.claimObjective(objectiveId);
    const traceId = randomUUID();

    try {
      const modelResult = await this.decisionEngine.decide(objective);
      const policyVerdict = evaluatePolicy(objective, modelResult.decision);
      const decisionRecord: DecisionRecord = {
        id: randomUUID(),
        objectiveId: objective.id,
        traceId,
        model: modelResult.model,
        ...(modelResult.modelRequestId ? { modelRequestId: modelResult.modelRequestId } : {}),
        decision: modelResult.decision,
        policyVerdict,
        createdAt: new Date().toISOString()
      };
      await this.store.saveDecision(decisionRecord);

      if (!policyVerdict.approved) {
        const status = policyVerdict.requiresUserApproval ? "AWAITING_USER" : "REJECTED";
        const updated = await this.store.updateObjective(objective.id, { status });
        return { objective: updated, decision: decisionRecord };
      }

      const selected = findSelectedOffer(objective, modelResult.decision);
      if (!selected) throw new Error("OFFER_NOT_FOUND_AFTER_POLICY_APPROVAL");

      let effectiveOffer = selected;
      let effectiveObjective = objective;
      let effectiveDecision = modelResult.decision;
      let negotiation: NegotiationRecord | undefined;

      if (modelResult.decision.decision === "NEGOTIATE") {
        const counterOfferUsd = modelResult.decision.counterOfferUsd!;
        const result = await this.negotiationService.negotiate(selected, counterOfferUsd, objective);
        negotiation = {
          attempted: true,
          accepted: result.accepted,
          listPriceUsd: selected.priceUsd,
          counterOfferUsd,
          ...(result.offer ? { agreedPriceUsd: result.offer.priceUsd } : {}),
          ...(result.reason ? { reason: result.reason } : {})
        };

        if (!result.accepted || !result.offer) {
          if (!objective.policy.negotiation.payIfDeclined) {
            const updated = await this.store.updateObjective(objective.id, { status: "REJECTED" });
            return { objective: updated, decision: decisionRecord, negotiation };
          }
          effectiveDecision = paymentDecision(modelResult.decision, selected.priceUsd);
          const fallbackVerdict = evaluatePolicy(objective, effectiveDecision);
          if (!fallbackVerdict.approved) {
            const status = fallbackVerdict.requiresUserApproval ? "AWAITING_USER" : "REJECTED";
            const updated = await this.store.updateObjective(objective.id, { status });
            return { objective: updated, decision: decisionRecord, negotiation };
          }
        } else {
          effectiveOffer = result.offer;
          effectiveObjective = {
            ...objective,
            offers: objective.offers.map((offer) =>
              offer.offerId === selected.offerId && offer.merchantId === selected.merchantId ? effectiveOffer : offer
            )
          };
          effectiveDecision = {
            ...paymentDecision(modelResult.decision, effectiveOffer.priceUsd),
            network: effectiveOffer.network,
            asset: effectiveOffer.asset
          };
          const negotiatedVerdict = evaluatePolicy(effectiveObjective, effectiveDecision);
          if (!negotiatedVerdict.approved) {
            const status = negotiatedVerdict.requiresUserApproval ? "AWAITING_USER" : "REJECTED";
            const updated = await this.store.updateObjective(objective.id, { status });
            return { objective: updated, decision: decisionRecord, negotiation };
          }
        }
      }

      const paymentId = randomUUID();
      try {
        const execution = await executeWithRecovery(
          this.paymentExecutor,
          effectiveOffer,
          effectiveObjective,
          effectiveDecision
        );
        const payment: PaymentRecord = {
          ...execution.evidence,
          id: paymentId,
          objectiveId: objective.id,
          decisionId: decisionRecord.id,
          traceId,
          merchantId: execution.offer.merchantId,
          offerId: execution.offer.offerId,
          status: "SUCCEEDED",
          recovery: execution.recovery,
          ...(negotiation ? { negotiation } : {}),
          createdAt: new Date().toISOString()
        };
        await this.store.savePayment(payment);
        const updated = await this.store.updateObjective(objective.id, { status: "COMPLETED" });
        return { objective: updated, decision: decisionRecord, ...(negotiation ? { negotiation } : {}), payment };
      } catch (error) {
        const message = error instanceof Error ? error.message : "UNKNOWN_PAYMENT_ERROR";
        const recovery = (error as Error & { recovery?: RecoveryRecord }).recovery;
        const payment: PaymentRecord = {
          id: paymentId,
          objectiveId: objective.id,
          decisionId: decisionRecord.id,
          traceId,
          merchantId: effectiveOffer.merchantId,
          offerId: effectiveOffer.offerId,
          provider: "AIFP1",
          status: "FAILED",
          errorCode: message.slice(0, 160),
          grossAmountUsd: 0,
          merchantProceedsUsd: 0,
          protocolFeeUsd: 0,
          ...(recovery ? { recovery } : {}),
          ...(negotiation ? { negotiation } : {}),
          settledAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        await this.store.savePayment(payment);
        await this.store.updateObjective(objective.id, { status: "FAILED" });
        throw error;
      }
    } catch (error) {
      const current = await this.store.getObjective(objective.id);
      if (current?.status === "RUNNING") await this.store.updateObjective(objective.id, { status: "FAILED" });
      throw error;
    }
  }
}
