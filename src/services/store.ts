import { randomUUID } from "node:crypto";
import { Firestore } from "@google-cloud/firestore";
import type { AppConfig } from "../config.js";
import type {
  CreateObjective,
  DecisionRecord,
  MetricsSnapshot,
  ObjectiveRecord,
  PaymentRecord
} from "../domain.js";
import type { CommerceStore } from "./interfaces.js";

function now(): string {
  return new Date().toISOString();
}

function withoutUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class MemoryCommerceStore implements CommerceStore {
  readonly kind = "memory" as const;
  private readonly objectives = new Map<string, ObjectiveRecord>();
  private readonly decisions = new Map<string, DecisionRecord>();
  private readonly payments = new Map<string, PaymentRecord>();

  async createObjective(input: CreateObjective): Promise<ObjectiveRecord> {
    const record: ObjectiveRecord = {
      ...input,
      id: randomUUID(),
      createdAt: now(),
      status: "CREATED"
    };
    this.objectives.set(record.id, record);
    return structuredClone(record);
  }

  async getObjective(id: string): Promise<ObjectiveRecord | undefined> {
    const record = this.objectives.get(id);
    return record ? structuredClone(record) : undefined;
  }

  async claimObjective(id: string): Promise<ObjectiveRecord> {
    const existing = this.objectives.get(id);
    if (!existing) throw new Error("OBJECTIVE_NOT_FOUND");
    if (existing.status !== "CREATED") throw new Error(`OBJECTIVE_NOT_RUNNABLE_${existing.status}`);
    const updated: ObjectiveRecord = { ...existing, status: "RUNNING" };
    this.objectives.set(id, updated);
    return structuredClone(updated);
  }

  async updateObjective(id: string, patch: Partial<ObjectiveRecord>): Promise<ObjectiveRecord> {
    const existing = this.objectives.get(id);
    if (!existing) throw new Error("OBJECTIVE_NOT_FOUND");
    const updated = { ...existing, ...patch, id: existing.id };
    this.objectives.set(id, updated);
    return structuredClone(updated);
  }

  async saveDecision(record: DecisionRecord): Promise<void> {
    this.decisions.set(record.id, structuredClone(record));
  }

  async savePayment(record: PaymentRecord): Promise<void> {
    this.payments.set(record.id, structuredClone(record));
  }

  async metrics(): Promise<MetricsSnapshot> {
    return calculateMetrics(
      [...this.objectives.values()],
      [...this.decisions.values()],
      [...this.payments.values()]
    );
  }
}

export class FirestoreCommerceStore implements CommerceStore {
  readonly kind = "firestore" as const;
  private readonly db: Firestore;

  constructor(config: AppConfig["firestore"]) {
    if (!config.project) throw new Error("GOOGLE_CLOUD_PROJECT is required when Firestore is enabled");
    this.db = new Firestore({ projectId: config.project, databaseId: config.databaseId });
  }

  async createObjective(input: CreateObjective): Promise<ObjectiveRecord> {
    const record: ObjectiveRecord = {
      ...input,
      id: randomUUID(),
      createdAt: now(),
      status: "CREATED"
    };
    await this.db.collection("objectives").doc(record.id).create(withoutUndefined(record));
    return record;
  }

  async getObjective(id: string): Promise<ObjectiveRecord | undefined> {
    const snapshot = await this.db.collection("objectives").doc(id).get();
    return snapshot.exists ? snapshot.data() as ObjectiveRecord : undefined;
  }

  async claimObjective(id: string): Promise<ObjectiveRecord> {
    const ref = this.db.collection("objectives").doc(id);
    return this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error("OBJECTIVE_NOT_FOUND");
      const existing = snapshot.data() as ObjectiveRecord;
      if (existing.status !== "CREATED") throw new Error(`OBJECTIVE_NOT_RUNNABLE_${existing.status}`);
      const updated: ObjectiveRecord = { ...existing, status: "RUNNING" };
      transaction.set(ref, withoutUndefined(updated));
      return updated;
    });
  }

  async updateObjective(id: string, patch: Partial<ObjectiveRecord>): Promise<ObjectiveRecord> {
    const ref = this.db.collection("objectives").doc(id);
    await ref.set(withoutUndefined(patch), { merge: true });
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new Error("OBJECTIVE_NOT_FOUND");
    return snapshot.data() as ObjectiveRecord;
  }

  async saveDecision(record: DecisionRecord): Promise<void> {
    await this.db.collection("decisions").doc(record.id).set(withoutUndefined(record));
  }

  async savePayment(record: PaymentRecord): Promise<void> {
    await this.db.collection("payments").doc(record.id).set(withoutUndefined(record));
  }

  async metrics(): Promise<MetricsSnapshot> {
    const [objectives, decisions, payments] = await Promise.all([
      this.db.collection("objectives").get(),
      this.db.collection("decisions").get(),
      this.db.collection("payments").get()
    ]);
    return calculateMetrics(
      objectives.docs.map((doc) => doc.data() as ObjectiveRecord),
      decisions.docs.map((doc) => doc.data() as DecisionRecord),
      payments.docs.map((doc) => doc.data() as PaymentRecord)
    );
  }
}

function calculateMetrics(
  objectives: ObjectiveRecord[],
  decisions: DecisionRecord[],
  payments: PaymentRecord[]
): MetricsSnapshot {
  const succeeded = payments.filter((payment) => payment.status === "SUCCEEDED");
  const requesterByObjective = new Map(objectives.map((item) => [item.id, item.requesterId]));
  const requesterIds = new Set(objectives.map((item) => item.requesterId).filter(Boolean));
  const payingRequesterIds = new Set(
    succeeded.map((payment) => requesterByObjective.get(payment.objectiveId)).filter(Boolean)
  );
  return {
    objectives: objectives.length,
    decisions: decisions.length,
    approvedDecisions: decisions.filter((item) => item.policyVerdict.approved).length,
    rejectedDecisions: decisions.filter((item) => !item.policyVerdict.approved).length,
    successfulPayments: succeeded.length,
    failedPayments: payments.filter((payment) => payment.status === "FAILED").length,
    grossPaymentVolumeUsd: sum(succeeded.map((item) => item.grossAmountUsd)),
    protocolRevenueUsd: sum(succeeded.map((item) => item.protocolFeeUsd)),
    merchantRevenueUsd: sum(succeeded.map((item) => item.merchantProceedsUsd)),
    uniqueRequesters: requesterIds.size,
    payingRequesters: payingRequesterIds.size,
    updatedAt: now()
  };
}

function sum(values: number[]): number {
  return Number(values.reduce((total, value) => total + value, 0).toFixed(8));
}

export function createStore(config: AppConfig["firestore"]): CommerceStore {
  return config.enabled ? new FirestoreCommerceStore(config) : new MemoryCommerceStore();
}
