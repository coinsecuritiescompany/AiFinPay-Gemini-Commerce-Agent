import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("production configuration", () => {
  it("refuses to start production without an admin token", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow(/ADMIN_TOKEN/);
  });

  it("refuses financial credentials without an admin token", () => {
    expect(() => loadConfig({
      NODE_ENV: "development",
      AIFINPAY_AGENT_SEED_HEX: "a".repeat(64)
    })).toThrow(/ADMIN_TOKEN/);
  });

  it("accepts the standard GEMINI_API_KEY environment variable", () => {
    const config = loadConfig({
      NODE_ENV: "development",
      GEMINI_API_KEY: "test-gemini-key"
    });
    expect(config.gemini.apiKey).toBe("test-gemini-key");
  });

  it("keeps GOOGLE_API_KEY as a backwards-compatible alias", () => {
    const config = loadConfig({
      NODE_ENV: "development",
      GOOGLE_API_KEY: "legacy-google-key"
    });
    expect(config.gemini.apiKey).toBe("legacy-google-key");
  });
});
