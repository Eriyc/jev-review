import { JevApiError } from "../jev/client.js";
import type { JevProviderConfig } from "../jev/provider.js";

export function getJevProviderConfig(environment: NodeJS.ProcessEnv = process.env): JevProviderConfig {
  const provider = environment.JEV_PROVIDER?.trim() || "typesafe";
  if (provider !== "typesafe" && provider !== "openrouter") {
    throw new JevApiError("JEV_PROVIDER must be 'typesafe' or 'openrouter'.");
  }

  const keyName = provider === "openrouter" ? "OPENROUTER_API_KEY" : "JEV_API_KEY";
  const apiKey = environment[keyName]?.trim();
  if (!apiKey) throw new JevApiError(`${keyName} is not set. Export it before starting your coding agent.`);

  return { provider, apiKey, ...(environment.JEV_MODEL?.trim() ? { model: environment.JEV_MODEL.trim() } : {}) };
}
