import type {
  CommerceDecision,
  CreateObjective,
  DecisionRecord,
  MetricsSnapshot,
  ObjectiveRecord,
  Offer,
  PaymentEvidence,
  PaymentRecord
} from "../domain.js";

export interface DecisionResult {
  decision: CommerceDecision;
  model: string;
  modelRequestId?: string;
}

export interface DecisionEngine {
  configured(): boolean;
  decide(objective: ObjectiveRecord): Promise<DecisionResult>;
}

export interface PaymentExecutor {
  configured(): boolean;
  execute(offer: Offer, objective: ObjectiveRecord): Promise<PaymentEvidence>;
}

export interface CommerceStore {
  kind: "memory" | "firestore";
  createObjective(input: CreateObjective): Promise<ObjectiveRecord>;
  getObjective(id: string): Promise<ObjectiveRecord | undefined>;
  claimObjective(id: string): Promise<ObjectiveRecord>;
  updateObjective(id: string, patch: Partial<ObjectiveRecord>): Promise<ObjectiveRecord>;
  saveDecision(record: DecisionRecord): Promise<void>;
  savePayment(record: PaymentRecord): Promise<void>;
  metrics(): Promise<MetricsSnapshot>;
}
