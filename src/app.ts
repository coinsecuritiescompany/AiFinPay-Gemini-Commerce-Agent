import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { timingSafeEqual } from "node:crypto";
import { ZodError } from "zod";
import { loadConfig, type AppConfig } from "./config.js";
import { CircleTransferSchema, CreateObjectiveSchema, VisualObjectiveSchema, type Offer } from "./domain.js";
import { DASHBOARD_HTML } from "./dashboard.js";
import { AiFinPayExecutor } from "./services/aifinpay.js";
import { CircleWalletService } from "./services/circle.js";
import { GeminiDecisionEngine } from "./services/gemini.js";
import type { CommerceStore, DecisionEngine, PaymentExecutor } from "./services/interfaces.js";
import { MerchantDiscoveryService } from "./services/merchant-discovery.js";
import { CommerceOrchestrator } from "./services/orchestrator.js";
import { createStore } from "./services/store.js";
import { GeminiVisionEngine, type VisionEngine } from "./services/vision.js";

export interface AppDependencies {
  config: AppConfig;
  store: CommerceStore;
  decisionEngine: DecisionEngine;
  paymentExecutor: PaymentExecutor;
  circle: CircleWalletService;
  visionEngine?: VisionEngine;
  merchantDiscovery?: MerchantDiscoveryService;
}

export function dependenciesFromEnv(env: NodeJS.ProcessEnv = process.env): AppDependencies {
  const config = loadConfig(env);
  return {
    config,
    store: createStore(config.firestore),
    decisionEngine: new GeminiDecisionEngine(config.gemini),
    paymentExecutor: new AiFinPayExecutor(config.aifinpay),
    circle: new CircleWalletService(config.circle),
    visionEngine: new GeminiVisionEngine(config.gemini),
    merchantDiscovery: new MerchantDiscoveryService(config.merchantApi)
  };
}

function mergeOffers(base: Offer[], discovered: Offer[]): Offer[] {
  const unique = new Map<string, Offer>();
  for (const offer of [...base, ...discovered]) unique.set(`${offer.merchantId}:${offer.offerId}`, offer);
  return [...unique.values()].slice(0, 50);
}

export function buildApp(dependencies: AppDependencies = dependenciesFromEnv()): FastifyInstance {
  const { config, store, decisionEngine, paymentExecutor, circle } = dependencies;
  const visionEngine = dependencies.visionEngine ?? new GeminiVisionEngine(config.gemini);
  const merchantDiscovery = dependencies.merchantDiscovery ?? new MerchantDiscoveryService(config.merchantApi);
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
        "*.entitySecret",
        "*.image.data"
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
    if (!authorized) return reply.code(403).send({ error: "ADMIN_AUTH_REQUIRED" });
  };

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("referrer-policy", "no-referrer");
    reply.header("content-security-policy", "default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'");
    return payload;
  });

  app.get("/", async (_request, reply) => reply.type("text/html; charset=utf-8").send(DASHBOARD_HTML));

  app.get("/health", async () => ({
    status: "ok",
    version: "0.3.0",
    storage: store.kind,
    services: {
      gemini: decisionEngine.configured(),
      multimodalVision: visionEngine.configured(),
      merchantDiscovery: merchantDiscovery.configured(),
      aifinpay: paymentExecutor.configured(),
      circle: circle.configured(),
      firestore: store.kind === "firestore"
    },
    capabilities: ["multimodal-procurement", "dynamic-negotiation", "self-healing-payments", "local-encrypted-wallet", "universal-x402"],
    timestamp: new Date().toISOString()
  }));

  app.get("/v1/aifinpay/status", async () => {
    if (paymentExecutor instanceof AiFinPayExecutor) return paymentExecutor.publicStatus();
    return { configured: paymentExecutor.configured() };
  });

  app.post("/v1/objectives", { preHandler: requireAdmin }, async (request, reply) => {
    const input = CreateObjectiveSchema.parse(request.body);
    const objective = await orchestrator.createObjective(input);
    request.log.info({ event: "objective.created", objectiveId: objective.id, requesterId: objective.requesterId });
    return reply.code(201).send(objective);
  });

  app.post("/v1/visual-objectives", { preHandler: requireAdmin }, async (request, reply) => {
    const input = VisualObjectiveSchema.parse(request.body);
    const analysis = await visionEngine.inspect({ goal: input.goal, image: input.image });
    const discovered = input.discoverMerchantApis && merchantDiscovery.configured()
      ? await merchantDiscovery.search(analysis.searchQuery)
      : [];
    const offers = mergeOffers(input.offers, discovered);
    if (offers.length === 0) throw new Error("NO_MERCHANT_OFFERS_FOUND");

    const objective = await orchestrator.createObjective({
      goal: [
        input.goal,
        `Visual identification: ${analysis.detectedObject}.`,
        `Observed issue/context: ${analysis.issue}.`,
        `Visual confidence: ${analysis.confidence}.`,
        `Merchant search query: ${analysis.searchQuery}.`
      ].join(" "),
      ...(input.requesterId ? { requesterId: input.requesterId } : {}),
      policy: input.policy,
      offers
    });

    request.log.info({
      event: "visual_objective.created",
      objectiveId: objective.id,
      detectedObject: analysis.detectedObject,
      visualConfidence: analysis.confidence,
      suppliedOffers: input.offers.length,
      discoveredOffers: discovered.length
    });

    if (input.execute) {
      const result = await orchestrator.run(objective.id);
      return reply.code(201).send({ analysis, discoveredOffers: discovered.length, objective, result });
    }
    return reply.code(201).send({ analysis, discoveredOffers: discovered.length, objective });
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
      negotiationAccepted: result.negotiation?.accepted,
      recoveryAttempts: result.payment?.recovery?.attempts,
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
    if (error instanceof ZodError) return reply.code(400).send({ error: "VALIDATION_ERROR", issues: error.issues });
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const status = code.includes("NOT_FOUND") || code.includes("NO_MERCHANT_OFFERS")
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
