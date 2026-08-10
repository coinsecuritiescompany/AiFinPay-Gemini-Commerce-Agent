import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { chmod, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { AiFinPayAgent } from "@aifinpay/agent";

export type CliMode = "handled" | "server";

export interface LocalPolicy {
  dailyBudgetUsd: number;
  perCallBudgetUsd: number;
}

export interface LocalKeystore {
  version: 1;
  createdAt: string;
  cipher: "aes-256-gcm";
  kdf: "scrypt";
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
  policy: LocalPolicy;
}

const DEFAULT_POLICY: LocalPolicy = { dailyBudgetUsd: 1, perCallBudgetUsd: 0.05 };
const ENV_PASSPHRASE = "AIFINPAY_KEYSTORE_PASSPHRASE";

export function defaultKeystorePath(): string {
  const base = process.env.AIFINPAY_HOME?.trim() || join(homedir(), ".aifinpay");
  return join(base, "gemini-commerce-agent.json");
}

function assertPassphrase(passphrase: string): void {
  if (passphrase.length < 12) throw new Error("Keystore passphrase must be at least 12 characters");
}

function assertSeedHex(seedHex: string): void {
  if (!/^[0-9a-f]{64}$/i.test(seedHex)) throw new Error("Invalid 32-byte seed");
}

export function encryptSeed(seedHex: string, passphrase: string, policy: LocalPolicy = DEFAULT_POLICY): LocalKeystore {
  assertSeedHex(seedHex);
  assertPassphrase(passphrase);
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(passphrase, salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(seedHex, "utf8")), cipher.final()]);
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    cipher: "aes-256-gcm",
    kdf: "scrypt",
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    policy
  };
}

export function decryptSeed(keystore: LocalKeystore, passphrase: string): string {
  assertPassphrase(passphrase);
  if (keystore.version !== 1 || keystore.cipher !== "aes-256-gcm" || keystore.kdf !== "scrypt") {
    throw new Error("Unsupported keystore format");
  }
  const salt = Buffer.from(keystore.salt, "base64");
  const iv = Buffer.from(keystore.iv, "base64");
  const tag = Buffer.from(keystore.tag, "base64");
  const key = scryptSync(passphrase, salt, 32);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const seedHex = Buffer.concat([
    decipher.update(Buffer.from(keystore.ciphertext, "base64")),
    decipher.final()
  ]).toString("utf8");
  assertSeedHex(seedHex);
  return seedHex;
}

async function ensurePrivateDir(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await chmod(dirname(path), 0o700).catch(() => undefined);
}

export async function saveKeystore(path: string, keystore: LocalKeystore): Promise<void> {
  await ensurePrivateDir(path);
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, `${JSON.stringify(keystore, null, 2)}\n`, { mode: 0o600 });
  await chmod(tmp, 0o600).catch(() => undefined);
  await rename(tmp, path);
  await chmod(path, 0o600).catch(() => undefined);
}

export async function loadKeystore(path = defaultKeystorePath()): Promise<LocalKeystore> {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as LocalKeystore;
  if (!parsed.policy) parsed.policy = { ...DEFAULT_POLICY };
  return parsed;
}

async function readHidden(prompt: string): Promise<string> {
  const env = process.env[ENV_PASSPHRASE];
  if (env) return env;
  const input = process.stdin;
  if (!input.isTTY || typeof input.setRawMode !== "function") {
    throw new Error(`${ENV_PASSPHRASE} must be set when stdin is not an interactive terminal`);
  }
  process.stderr.write(prompt);
  input.setRawMode(true);
  input.resume();
  input.setEncoding("utf8");
  return await new Promise<string>((resolve, reject) => {
    let value = "";
    const cleanup = () => {
      input.removeListener("data", onData);
      input.setRawMode(false);
      input.pause();
      process.stderr.write("\n");
    };
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\u0003") {
          cleanup();
          reject(new Error("Cancelled"));
          return;
        }
        if (ch === "\r" || ch === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else if (ch >= " ") value += ch;
      }
    };
    input.on("data", onData);
  });
}

function numericFlag(args: string[], name: string, fallback: number): number {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  const value = Number(args[index + 1]);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number`);
  return value;
}

function stringFlag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

async function loadLocalAgent(maxUsd?: number): Promise<{ agent: AiFinPayAgent; keystore: LocalKeystore }> {
  const keystore = await loadKeystore();
  const passphrase = await readHidden("Keystore passphrase: ");
  const seedHex = decryptSeed(keystore, passphrase);
  const perCall = Math.min(maxUsd ?? keystore.policy.perCallBudgetUsd, keystore.policy.perCallBudgetUsd);
  const agent = await AiFinPayAgent.fromSeed(seedHex, {
    budgetCaps: {
      daily_usd: keystore.policy.dailyBudgetUsd,
      per_call_usd: perCall,
      on_limit_exceeded: "throw"
    },
    telemetry: true
  });
  return { agent, keystore };
}

async function cmdInit(args: string[]): Promise<void> {
  const path = defaultKeystorePath();
  const force = args.includes("--force");
  if (!force) {
    try {
      await stat(path);
      throw new Error(`A wallet already exists at ${path}. Use --force only if you intend to replace it.`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("A wallet already exists")) throw error;
    }
  }
  const dailyBudgetUsd = numericFlag(args, "--daily-budget", DEFAULT_POLICY.dailyBudgetUsd);
  const perCallBudgetUsd = numericFlag(args, "--per-call", DEFAULT_POLICY.perCallBudgetUsd);
  if (perCallBudgetUsd > dailyBudgetUsd) throw new Error("--per-call cannot exceed --daily-budget");
  const passphrase = await readHidden("Create keystore passphrase: ");
  assertPassphrase(passphrase);
  if (!process.env[ENV_PASSPHRASE]) {
    const confirm = await readHidden("Confirm keystore passphrase: ");
    if (passphrase !== confirm) throw new Error("Passphrases do not match");
  }
  const seedHex = randomBytes(32).toString("hex");
  const policy = { dailyBudgetUsd, perCallBudgetUsd };
  await saveKeystore(path, encryptSeed(seedHex, passphrase, policy));
  const agent = await AiFinPayAgent.fromSeed(seedHex, { budgetCaps: { daily_usd: dailyBudgetUsd, per_call_usd: perCallBudgetUsd, on_limit_exceeded: "throw" } });
  process.stdout.write(`${JSON.stringify({
    created: true,
    nonCustodial: true,
    keystore: path,
    evmAddress: agent.evmAddress,
    solanaAddress: agent.solanaAddress,
    casperAddress: agent.casperAddress,
    policy
  }, null, 2)}\n`);
  process.stderr.write("Wallet seed is encrypted locally and is never sent to the AiFinPay Render service. Back up the encrypted keystore and your passphrase.\n");
}

async function cmdAddress(): Promise<void> {
  const { agent, keystore } = await loadLocalAgent();
  process.stdout.write(`${JSON.stringify({
    evmAddress: agent.evmAddress,
    solanaAddress: agent.solanaAddress,
    casperAddress: agent.casperAddress,
    policy: keystore.policy
  }, null, 2)}\n`);
}

async function cmdFetch(args: string[]): Promise<void> {
  const url = args.find((arg) => !arg.startsWith("--") && /^https?:\/\//i.test(arg));
  if (!url) throw new Error("Usage: aifinpay-gemini-commerce-agent fetch <https://url> [--max-usd 0.05] [--method GET] [--data JSON]");
  const requestedMax = numericFlag(args, "--max-usd", Number.POSITIVE_INFINITY);
  const { agent, keystore } = await loadLocalAgent(requestedMax);
  const maxAmountUsd = Math.min(requestedMax, keystore.policy.perCallBudgetUsd);
  const method = (stringFlag(args, "--method") ?? "GET").toUpperCase();
  const data = stringFlag(args, "--data");
  const headers: Record<string, string> = { accept: "application/json, text/plain;q=0.9, */*;q=0.8" };
  if (data !== undefined) headers["content-type"] = "application/json";
  const init: RequestInit = { method, headers, ...(data !== undefined ? { body: data } : {}) };

  // AIFP-1 gets first refusal because it has receipt batching/reuse. If the 402
  // is another protocol, fetchPaid returns it untouched and costs nothing.
  let response = await agent.fetchPaid(url, init, { scope: "exact", units: 1 });
  if (!response) throw new Error("Payment skipped by local budget policy");

  // Generic x402 fallback. The SDK auto-detects a supported facilitator and
  // refuses any quote above maxAmountUsd before building payment authorization.
  if (response.status === 402) {
    response = await agent.inner.pay(url, {
      ...init,
      options: { maxAmountUsd }
    });
  }

  const body = Buffer.from(await response.arrayBuffer());
  process.stderr.write(`${JSON.stringify({ status: response.status, ok: response.ok, url, maxAmountUsd })}\n`);
  process.stdout.write(body);
  if (body.length && body.at(-1) !== 10) process.stdout.write("\n");
  if (!response.ok) process.exitCode = 1;
}

async function prepareLocalServer(): Promise<void> {
  if (process.env.AIFINPAY_AGENT_SEED_HEX) return;
  const keystore = await loadKeystore();
  const passphrase = await readHidden("Keystore passphrase: ");
  process.env.AIFINPAY_AGENT_SEED_HEX = decryptSeed(keystore, passphrase);
  process.env.AIFINPAY_DAILY_BUDGET_USD ??= String(keystore.policy.dailyBudgetUsd);
  process.env.AIFINPAY_PER_CALL_BUDGET_USD ??= String(keystore.policy.perCallBudgetUsd);
}

export function cliHelp(): string {
  return `AiFinPay Gemini Commerce Agent\n\n` +
    `Create a unique local non-custodial agent wallet:\n` +
    `  npx aifinpay-gemini-commerce-agent init\n\n` +
    `Show public wallet addresses:\n` +
    `  npx aifinpay-gemini-commerce-agent address\n\n` +
    `Pay a supported AIFP-1 / x402 URL within your local cap:\n` +
    `  npx aifinpay-gemini-commerce-agent fetch https://example.com/paid --max-usd 0.05\n\n` +
    `Run the local Gemini commerce service with your encrypted wallet:\n` +
    `  npx aifinpay-gemini-commerce-agent start\n`;
}

export async function handleCli(args: string[]): Promise<CliMode> {
  const command = args[0];
  if (!command) return "server";
  if (command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(cliHelp());
    return "handled";
  }
  if (command === "init") {
    await cmdInit(args.slice(1));
    return "handled";
  }
  if (command === "address") {
    await cmdAddress();
    return "handled";
  }
  if (command === "fetch") {
    await cmdFetch(args.slice(1));
    return "handled";
  }
  if (command === "start") {
    await prepareLocalServer();
    return "server";
  }
  throw new Error(`Unknown command: ${command}\n\n${cliHelp()}`);
}
