import { JevApiError } from "../jev/client.js";
import type { JevProviderConfig } from "../jev/provider.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type StoredCredentials = { provider: "typesafe" | "openrouter"; apiKey: string; model?: string };

function readStoredCredentials(dataDirectory: string | undefined): StoredCredentials | undefined {
  if (!dataDirectory) return undefined;
  let raw: string;
  try {
    raw = readFileSync(join(dataDirectory, "credentials.json"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw new JevApiError("Could not read Jev credentials from PLUGIN_DATA.");
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) throw new Error("invalid");
    const config = value as Partial<StoredCredentials>;
    if ((config.provider !== "typesafe" && config.provider !== "openrouter") || !config.apiKey?.trim()) throw new Error("invalid");
    return { provider: config.provider, apiKey: config.apiKey.trim(), ...(config.model?.trim() ? { model: config.model.trim() } : {}) };
  } catch {
    throw new JevApiError("Jev credentials in PLUGIN_DATA are invalid. Run the setup command again.");
  }
}

export function getJevProviderConfig(environment: NodeJS.ProcessEnv = process.env): JevProviderConfig {
  const providerValue = environment.JEV_PROVIDER?.trim();
  if (providerValue && providerValue !== "typesafe" && providerValue !== "openrouter") {
    throw new JevApiError("JEV_PROVIDER must be 'typesafe' or 'openrouter'.");
  }
  const requestedProvider = providerValue === "typesafe" || providerValue === "openrouter" ? providerValue : undefined;

  const directProvider = requestedProvider || "typesafe";
  const directKeyName = directProvider === "openrouter" ? "OPENROUTER_API_KEY" : "JEV_API_KEY";
  const directKey = environment[directKeyName]?.trim();
  if (directKey) {
    return { provider: directProvider, apiKey: directKey, ...(environment.JEV_MODEL?.trim() ? { model: environment.JEV_MODEL.trim() } : {}) };
  }

  const stored = readStoredCredentials(environment.PLUGIN_DATA);
  const provider = requestedProvider || stored?.provider || "typesafe";

  const keyName = provider === "openrouter" ? "OPENROUTER_API_KEY" : "JEV_API_KEY";
  const apiKey = environment[keyName]?.trim() || (stored?.provider === provider ? stored.apiKey : undefined);
  if (!apiKey) {
    const setup = environment.PLUGIN_DATA ? ` Run bun "${environment.PLUGIN_ROOT ?? "<plugin-root>"}/scripts/configure.ts" --data-dir "${environment.PLUGIN_DATA}" --provider ${provider} from a shell with ${keyName} set.` : " Export it before starting your coding agent.";
    throw new JevApiError(`${keyName} is not set.${setup}`);
  }

  const model = environment.JEV_MODEL?.trim() || (stored?.provider === provider ? stored.model : undefined);
  return { provider, apiKey, ...(model ? { model } : {}) };
}
