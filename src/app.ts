import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { timingSafeEqual } from "node:crypto";
import { ZodError } from "zod";
import { loadConfig, type AppConfig } from "./config.js";
import { CircleTransferSchema, CreateObjectiveSchema } from "./domain.js";
import { DASHBOARD_HTML } from "./dashboard.js";
import { AiFinPayExecutor } from "./services/aifinpay.js";
import { CircleWalletService } from "./services/circle.js";
import { GeminiDecisionEngine } from "./services/gemini.js";
import type { CommerceStore, DecisionEngine, PaymentExecutor } from "./services/interfaces.js";
import { CommerceOrchestrator } from "./services/orchestrator.js";
import { createStore } from "./services/store.js";

export interface AppDependencies {
  config: AppConfig;
  store: CommerceStore;
  decisionEngine: DecisionEngine;
  paymentExecutor: PaymentExecutor;
  circle: CircleWalletService;
}

export function dependenciesFromEnv(env: NodeJS.ProcessEnv = process.env): AppDependencies {
  const config = loadConfig(env);
  return {
    config,
    store: createStore(config.firestore),
    decisionEngine: new GeminiDecisionEngine(config.gemini),
    paymentExecutor: new AiFinPayExecutor(config.aifinpay),
    circle: new CircleWalletService(config.circle)
  };
}

export function buildApp(dependencies: AppDependencies = dependenciesFromEnv()): FastifyInstance {
  const { config, store, decisionEngine, paymentExecutor, circle } = dependencies;
  const orchestrator = new CommerceOrchestrator(store, decisionEngine, paymentExecutor);
  const app = Fastify({
    logger: {
      level: config.logLevel,
      redact: [
        "req.headers.authorization",
        "req.headers.x-admin-token",
        "*.receipt",
        "*.seedHex",
        "*.apiKey",
        "*.entitySecret"
      ]
    },
    genReqId: () => crypto.randomUUID()
  });

  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    const supplied = request.headers["x-admin-token"];
    const expected = config.adminToken;
    const authorized = typeof supplied === "string" && expected
      ? Buffer.byteLength(supplied) === Buffer.byteLength(expected) &&
        timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
      : false;
    if (!authorized) {
      return reply.code(403).send({ error: "ADMIN_AUTH_REQUIRED" });
    }
  };

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("referrer-policy", "no-referrer");
    reply.header("content-security-policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'");
    return payload;
  });

  app.get("/", async (_request, reply) => reply.type("text/html; charset=utf-8").send(DASHBOARD_HTML));

  app.get("/health", async () => ({
    status: "ok",
    version: "0.1.0",
    storage: store.kind,
    services: {
      gemini: decisionEngine.configured(),
      aifinpay: paymentExecutor.configured(),
      circle: circle.configured(),
      firestore: store.kind === "firestore"
    },
    timestamp: new Date().toISOString()
  }));

  app.get("/v1/aifinpay/status", async () => {
    if (paymentExecutor instanceof AiFinPayExecutor) {
      return paymentExecutor.publicStatus();
    }
    return { configured: paymentExecutor.configured() };
  });

  app.post("/v1/objectives", { preHandler: requireAdmin }, async (request, reply) => {
    const input = CreateObjectiveSchema.parse(request.body);
    const objective = await orchestrator.createObjective(input);
    request.log.info({ event: "objective.created", objectiveId: objective.id, requesterId: objective.requesterId });
    return reply.code(201).send(objective);
  });

  app.get<{ Params: { id: string } }>("/v1/objectives/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const objective = await orchestrator.getObjective(request.params.id);
    if (!objective) return reply.code(404).send({ error: "OBJECTIVE_NOT_FOUND" });
    return objective;
  });

  app.post<{ Params: { id: string } }>("/v1/objectives/:id/run", { preHandler: requireAdmin }, async (request) => {
    const result = await orchestrator.run(request.params.id);
    request.log.info({
      event: "objective.run.completed",
      traceId: result.decision.traceId,
      objectiveId: result.objective.id,
      decision: result.decision.decision.decision,
      policyCode: result.decision.policyVerdict.code,
      paymentStatus: result.payment?.status
    });
    return result;
  });

  app.get("/v1/metrics", async () => store.metrics());

  app.get("/v1/circle/status", async () => circle.publicStatus());

  app.post("/v1/circle/transfers", { preHandler: requireAdmin }, async (request, reply) => {
    const input = CircleTransferSchema.parse(request.body);
    const result = await circle.transferUsdc(input.destinationAddress, input.amountUsd, input.tokenId);
    request.log.info({
      event: "circle.transfer.created",
      transactionId: result.transactionId,
      txHash: result.txHash,
      amountUsd: input.amountUsd
    });
    return reply.code(202).send(result);
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", issues: error.issues });
    }
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const status = code.includes("NOT_FOUND")
      ? 404
      : code.includes("NOT_RUNNABLE")
        ? 409
        : code.includes("NOT_CONFIGURED")
          ? 503
          : 500;
    request.log.error({ event: "request.failed", code, err: error });
    return reply.code(status).send({ error: code.slice(0, 160) });
  });

  return app;
}
