import { describe, expect, it } from "vitest";
import { decryptSeed, encryptSeed, cliHelp } from "../src/cli.js";

const SEED = "11".repeat(32);

 describe("local non-custodial CLI keystore", () => {
  it("encrypts a 32-byte seed without storing it in plaintext", () => {
    const keystore = encryptSeed(SEED, "correct horse battery staple", {
      dailyBudgetUsd: 1,
      perCallBudgetUsd: 0.05
    });
    const serialized = JSON.stringify(keystore);
    expect(serialized).not.toContain(SEED);
    expect(keystore.cipher).toBe("aes-256-gcm");
    expect(keystore.kdf).toBe("scrypt");
  });

  it("decrypts to the same deterministic seed", () => {
    const keystore = encryptSeed(SEED, "correct horse battery staple");
    expect(decryptSeed(keystore, "correct horse battery staple")).toBe(SEED);
  });

  it("fails closed with a wrong passphrase", () => {
    const keystore = encryptSeed(SEED, "correct horse battery staple");
    expect(() => decryptSeed(keystore, "wrong passphrase value")).toThrow();
  });

  it("documents init, address, fetch and start commands", () => {
    const help = cliHelp();
    expect(help).toContain(" init");
    expect(help).toContain(" address");
    expect(help).toContain(" fetch https://");
    expect(help).toContain(" start");
  });
});
