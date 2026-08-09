import { randomUUID } from "node:crypto";
import type {
  CreateObjective,
  DecisionRecord,
  ObjectiveRecord,
  PaymentRecord
} from "../domain.js";
import type { CommerceStore, DecisionEngine, PaymentExecutor } from "./interfaces.js";
import { evaluatePolicy, findSelectedOffer } from "./policy.js";

export interface RunResult {
  objective: ObjectiveRecord;
  decision: DecisionRecord;
  payment?: PaymentRecord;
}

export class CommerceOrchestrator {
  constructor(
    private readonly store: CommerceStore,
    private readonly decisionEngine: DecisionEngine,
    private readonly paymentExecutor: PaymentExecutor
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

      const offer = findSelectedOffer(objective, modelResult.decision);
      if (!offer) throw new Error("OFFER_NOT_FOUND_AFTER_POLICY_APPROVAL");
      const paymentId = randomUUID();

      try {
        const evidence = await this.paymentExecutor.execute(offer, objective);
        const payment: PaymentRecord = {
          ...evidence,
          id: paymentId,
          objectiveId: objective.id,
          decisionId: decisionRecord.id,
          traceId,
          merchantId: offer.merchantId,
          offerId: offer.offerId,
          status: "SUCCEEDED",
          createdAt: new Date().toISOString()
        };
        await this.store.savePayment(payment);
        const updated = await this.store.updateObjective(objective.id, { status: "COMPLETED" });
        return { objective: updated, decision: decisionRecord, payment };
      } catch (error) {
        const message = error instanceof Error ? error.message : "UNKNOWN_PAYMENT_ERROR";
        const payment: PaymentRecord = {
          id: paymentId,
          objectiveId: objective.id,
          decisionId: decisionRecord.id,
          traceId,
          merchantId: offer.merchantId,
          offerId: offer.offerId,
          provider: "AIFP1",
          status: "FAILED",
          errorCode: message.slice(0, 160),
          grossAmountUsd: 0,
          merchantProceedsUsd: 0,
          protocolFeeUsd: 0,
          settledAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        await this.store.savePayment(payment);
        await this.store.updateObjective(objective.id, { status: "FAILED" });
        throw error;
      }
    } catch (error) {
      const current = await this.store.getObjective(objective.id);
      if (current?.status === "RUNNING") {
        await this.store.updateObjective(objective.id, { status: "FAILED" });
      }
      throw error;
    }
  }
}
