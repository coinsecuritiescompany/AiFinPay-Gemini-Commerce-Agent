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
});
