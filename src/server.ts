import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = buildApp();

try {
  const host = config.nodeEnv === "production" ? "0.0.0.0" : "127.0.0.1";
  await app.listen({ port: config.port, host });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
