import { z } from "zod";

const booleanFromString = z.preprocess(
  (value) => typeof value === "string" ? value.toLowerCase() === "true" : value,
  z.boolean()
);

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z.string().default("info"),
  ADMIN_TOKEN: z.string().min(24).optional(),
  GOOGLE_CLOUD_PROJECT: z.string().min(1).optional(),
  GOOGLE_CLOUD_LOCATION: z.string().default("global"),
  GOOGLE_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  FIRESTORE_ENABLED: booleanFromString.default(false),
  FIRESTORE_DATABASE_ID: z.string().default("(default)"),
  AIFINPAY_AGENT_SEED_HEX: z.string().regex(/^[0-9a-fA-F]{64}$/).optional(),
  AIFINPAY_API_BASE_URL: z.string().url().default("https://api.aifinpay.io"),
  AIFINPAY_GATEWAY_ORIGINS: z.string().default("https://gateway.aifinpay.io"),
  AIFINPAY_DAILY_BUDGET_USD: z.coerce.number().positive().default(1),
  AIFINPAY_PER_CALL_BUDGET_USD: z.coerce.number().positive().default(0.05),
  CIRCLE_API_KEY: z.string().min(1).optional(),
  CIRCLE_ENTITY_SECRET: z.string().min(1).optional(),
  CIRCLE_WALLET_ID: z.string().min(1).optional(),
  CIRCLE_WALLET_ADDRESS: z.string().min(1).optional(),
  CIRCLE_BLOCKCHAIN: z.string().default("ARC-TESTNET"),
  CIRCLE_USDC_TOKEN_ID: z.string().min(1).optional(),
  CIRCLE_EXPLORER_BASE_URL: z.string().url().optional(),
  CIRCLE_MAX_TRANSFER_USD: z.coerce.number().positive().default(1)
}).superRefine((values, context) => {
  const financialCredentialsPresent = Boolean(values.AIFINPAY_AGENT_SEED_HEX || values.CIRCLE_API_KEY);
  if ((values.NODE_ENV === "production" || financialCredentialsPresent) && !values.ADMIN_TOKEN) {
    context.addIssue({
      code: "custom",
      path: ["ADMIN_TOKEN"],
      message: "ADMIN_TOKEN is required in production and whenever financial credentials are configured"
    });
  }
});

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const values = EnvSchema.parse(env);
  return {
    nodeEnv: values.NODE_ENV,
    port: values.PORT,
    logLevel: values.LOG_LEVEL,
    adminToken: values.ADMIN_TOKEN,
    gemini: {
      project: values.GOOGLE_CLOUD_PROJECT,
      location: values.GOOGLE_CLOUD_LOCATION,
      apiKey: values.GOOGLE_API_KEY,
      model: values.GEMINI_MODEL
    },
    firestore: {
      enabled: values.FIRESTORE_ENABLED,
      project: values.GOOGLE_CLOUD_PROJECT,
      databaseId: values.FIRESTORE_DATABASE_ID
    },
    aifinpay: {
      seedHex: values.AIFINPAY_AGENT_SEED_HEX,
      apiBaseUrl: values.AIFINPAY_API_BASE_URL,
      gatewayOrigins: values.AIFINPAY_GATEWAY_ORIGINS.split(",").map((item) => item.trim()).filter(Boolean),
      dailyBudgetUsd: values.AIFINPAY_DAILY_BUDGET_USD,
      perCallBudgetUsd: values.AIFINPAY_PER_CALL_BUDGET_USD
    },
    circle: {
      apiKey: values.CIRCLE_API_KEY,
      entitySecret: values.CIRCLE_ENTITY_SECRET,
      walletId: values.CIRCLE_WALLET_ID,
      walletAddress: values.CIRCLE_WALLET_ADDRESS,
      blockchain: values.CIRCLE_BLOCKCHAIN,
      usdcTokenId: values.CIRCLE_USDC_TOKEN_ID,
      explorerBaseUrl: values.CIRCLE_EXPLORER_BASE_URL,
      maxTransferUsd: values.CIRCLE_MAX_TRANSFER_USD
    }
  };
}
